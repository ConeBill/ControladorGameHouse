import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"

export const fetchMachines = createAsyncThunk(
    'machines/fetch',
    async () => await window.api.getMachines()
)

export const createMachine = createAsyncThunk(
    'machines/create',
    async (machine) => await window.api.createMachine(machine)
)

export const removeMachine = createAsyncThunk(
    'machines/delete',
    async (id) => await window.api.deleteMachine(id)
)

export const updateMachine = createAsyncThunk(
    'machines/update',
    async (machine) => await window.api.updateMachine(machine)
)

export const persistMachineTime = createAsyncThunk(
  'machines/persistTime',
  async machine => {
    await window.api.updateMachine({
      id: machine.id,
      seconds: machine.seconds,
      status: machine.status,
      available: machine.available,
      description: machine.description,
      price30: machine.price30,
      price60: machine.price60,
      sessionId: machine.sessionId ?? null,
      sessionPlayedMinutes: machine.sessionPlayedMinutes ?? 0,
      sessionPaidMinutes: machine.sessionPaidMinutes ?? 0,
      sessionPaidAmount: machine.sessionPaidAmount ?? 0
    })
  }
)

export const createPlaySession = createAsyncThunk(
  'machines/createPlaySession',
  async session => {
    return await window.api.createPlaySession(session)
  }
)

export const updatePlaySession = createAsyncThunk(
  'machines/updatePlaySession',
  async session => {
    return await window.api.updatePlaySession(session)
  }
)

const machineSlice = createSlice({
    name: 'machines',
    initialState: {
        list: []
    },
    reducers: {
        startMachine(state, action) {
            const { id, minutes, clientId, clientName, sessionId, sessionPaidAmount, sessionPaidMinutes } = action.payload
            const machine = state.list.find(m => m.id === id)

            if (!machine || !machine.available) return

            machine.seconds = minutes * 60
            machine.running = true
            machine.available = false
            machine.status = 'em_uso'
            machine.clientId = clientId ?? null
            machine.clientName = clientName ?? null
            machine.sessionId = sessionId ?? null
            machine.sessionPlayedMinutes = 0
            machine.sessionPaidMinutes = Number(sessionPaidMinutes ?? minutes)
            machine.sessionPaidAmount = Number(sessionPaidAmount ?? 0)
            machine.sessionClosed = false
            machine.sessionFinalized = false
        },

        addMachineTime(state, action) {
            const { id, secondsToAdd, playedMinutes = 0, paidMinutes = 0, paidAmount = 0 } = action.payload
            const machine = state.list.find(m => m.id === id)

            if (!machine || !machine.running) return

            machine.seconds = Math.max(machine.seconds + secondsToAdd, 0)
            machine.status = 'em_uso'
            machine.running = true
            machine.sessionPlayedMinutes = Number(machine.sessionPlayedMinutes || 0) + Number(playedMinutes)
            machine.sessionPaidMinutes = Number(machine.sessionPaidMinutes || 0) + Number(paidMinutes)
            machine.sessionPaidAmount = Number(machine.sessionPaidAmount || 0) + Number(paidAmount)
            machine.sessionClosed = false
            machine.sessionFinalized = false
        },

        incrementMachineSessionMinutes(state, action) {
            const { id, incrementMinutes = 1 } = action.payload
            const machine = state.list.find(m => m.id === id)

            if (!machine || !machine.running) return

            machine.sessionPlayedMinutes = Number(machine.sessionPlayedMinutes || 0) + Number(incrementMinutes)
            machine.sessionClosed = false
        },

        pauseMachine(state, action) {
            const machine = state.list.find(m => m.id === action.payload)

            if (machine && machine.status === 'em_uso') {
                machine.status = 'pausada'
                machine.running = false
            }
        },

        resetMachine(state, action) {
            const machine = state.list.find(m => m.id === action.payload)

            if (machine) {
                machine.status = 'livre'
                machine.seconds = 0
                machine.available = true
                machine.running = false
                machine.clientId = null
                machine.clientName = null
                machine.sessionId = null
                machine.sessionPlayedMinutes = 0
                machine.sessionPaidMinutes = 0
                machine.sessionPaidAmount = 0
                machine.sessionClosed = false
                machine.sessionFinalized = false
            }
        },

        setMachineStatus(state, action) {
            const { id, status } = action.payload
            const machine = state.list.find(m => m.id === id)

            if (!machine) return

            machine.status = status

            if (status === 'descarregada') {
                machine.running = false
                machine.seconds = 0
            }
        },

        tick(state) {
            state.list.forEach(machine => {
                if (machine.running && machine.seconds > 0) {
                    machine.seconds--

                    if (machine.seconds === 0) {
                        machine.running = false
                        machine.available = true
                        machine.status = 'livre'
                        machine.clientId = null
                        machine.clientName = null
                        machine.sessionClosed = true
                    }
                }
            })
        },

        finalizeSession(state, action) {
            const { id } = action.payload
            const machine = state.list.find(m => m.id === id)

            if (machine) {
                machine.sessionFinalized = true
            }
        }
    },
    extraReducers: builder => {
        builder

            /* ===== FETCH ===== */
            .addCase(fetchMachines.fulfilled, (state, action) => {
                const rows = action.payload ?? []

                state.list = rows.map(row => {
                    const status = (row.status ?? 'livre').toLowerCase()
                    const available = status === 'em_uso' ? false : status === 'livre' ? true : Boolean(row.available)

                    return {
                        id: row.id,
                        description: row.description,
                        available,
                        price30: row.price30,
                        price60: row.price60,
                        status,
                        seconds: row.seconds ?? 0,
                        running: status === 'em_uso' && (row.seconds ?? 0) > 0,
                        playerName: row.playerName || 'Jogador em uso',
                        sessionId: row.session_id ?? null,
                        sessionPlayedMinutes: Number(row.session_played_minutes ?? 0),
                        sessionPaidMinutes: Number(row.session_paid_minutes ?? 0),
                        sessionPaidAmount: Number(row.session_paid_amount ?? 0),
                        sessionClosed: false,
                        sessionFinalized: false
                    }
                })
            })

            /* ===== CREATE ===== */
            .addCase(createMachine.fulfilled, (state, action) => {
                state.list.push({
                    ...action.payload,
                    status: 'livre',
                    seconds: 0,
                    running: false,
                    sessionId: null,
                    sessionPlayedMinutes: 0,
                    sessionPaidMinutes: 0,
                    sessionPaidAmount: 0,
                    sessionClosed: false,
                    sessionFinalized: false
                })
            })

            /* ===== UPDATE ===== */
            .addCase(updateMachine.fulfilled, (state, action) => {
                const index = state.list.findIndex(
                    m => m.id === action.payload.id
                )

                if (index !== -1) {
                    state.list[index] = {
                        ...state.list[index],
                        ...action.payload
                    }
                }
            })
    }
})

export const {
    startMachine,
    addMachineTime,
    incrementMachineSessionMinutes,
    pauseMachine,
    resetMachine,
    setMachineStatus,
    tick,
    finalizeSession
} = machineSlice.actions

export default machineSlice.reducer