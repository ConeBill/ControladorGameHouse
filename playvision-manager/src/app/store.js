import { configureStore } from '@reduxjs/toolkit'
import machineReducer from './slices/machineSlice'
import sessionReducer from './slices/sessionSlice'
import clientReducer from './slices/clientSlice'

export const store = configureStore({
  reducer: {
    machines: machineReducer,
    sessions: sessionReducer,
    clients: clientReducer
  }
})