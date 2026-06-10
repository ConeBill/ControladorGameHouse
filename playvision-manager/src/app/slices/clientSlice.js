import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

/* =========================
   ASYNC ACTIONS (IPC)
========================= */

export const fetchClients = createAsyncThunk(
  'clients/fetch',
  async () => {
    return await window.api.getClients() ?? []
  }
)

export const createClient = createAsyncThunk(
  'clients/create',
  async (client) => {
    return await window.api.createClient(client)
  }
)

export const updateClient = createAsyncThunk(
  'clients/update',
  async (client) => {
    return await window.api.updateClient(client)
  }
)

export const incrementClientPlayTime = createAsyncThunk(
  'clients/incrementPlayTime',
  async ({ clientId, incrementMinutes, machineId, sessionId }, { getState }) => {
    const state = getState()
    const client = state.clients.list.find(item => item.id === clientId)

    if (!client) return null

    const minutesToAdd = Math.floor(Number(incrementMinutes || 0))
    if (minutesToAdd <= 0) return null

    const currentPlayTime = Number(client.playTime)
    const safePlayTime = Number.isFinite(currentPlayTime) ? currentPlayTime : 0
    const nextPlayTime = safePlayTime + minutesToAdd
    const updatedClient = {
      ...client,
      playTime: nextPlayTime,
      last_playtime_sync: new Date().toISOString()
    }

    await window.api.updateClient(updatedClient)
    
    await window.api.logMachinePlaytime({
      machineId: machineId ?? null,
      clientId,
      sessionId: sessionId ?? null,
      playedMinutes: minutesToAdd
    })

    return updatedClient
  }
)

const clientSlice = createSlice({
  name: 'clients',
  initialState: {
    list: [],
    loading: false
  },
  reducers: {},
  extraReducers: builder => {
    builder

      /* FETCH */
      .addCase(fetchClients.pending, state => {
        state.loading = true
      })
      .addCase(fetchClients.fulfilled, (state, action) => {
        state.loading = false
        state.list = (action.payload ?? []).map(client => {
        const currentPlayTime = Number(client.playTime)
        return {
          ...client,
          playTime: Number.isFinite(currentPlayTime) ? currentPlayTime : 0
        }
      })
      })
      .addCase(fetchClients.rejected, state => {
        state.loading = false
      })

      /* CREATE */
      .addCase(createClient.fulfilled, (state, action) => {
        state.list.push({
          ...action.payload,
          playTime: Number(action.payload.playTime || 0)
        })
      })

      /* UPDATE */
      .addCase(updateClient.fulfilled, (state, action) => {
        const index = state.list.findIndex(
          c => c.id === action.payload.id
        )

        if (index !== -1) {
          state.list[index] = {
            ...action.payload,
            playTime: Number(action.payload.playTime || 0)
          }
        }
      })

      .addCase(incrementClientPlayTime.fulfilled, (state, action) => {
        if (!action.payload) return

        const index = state.list.findIndex(client => client.id === action.payload.id)

        if (index !== -1) {
          state.list[index] = {
            ...action.payload,
            playTime: Number(action.payload.playTime || 0)
          }
        }
      })
  }
})

export default clientSlice.reducer