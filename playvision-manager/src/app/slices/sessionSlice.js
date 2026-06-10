import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  sessions: []
}

const sessionSlice = createSlice({
  name: 'sessions',
  initialState,
  reducers: {
    addSession(state, action) {
      state.sessions.push(action.payload)
    }
  }
})

export const { addSession } = sessionSlice.actions
export default sessionSlice.reducer