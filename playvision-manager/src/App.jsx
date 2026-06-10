import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { incrementClientPlayTime } from './app/slices/clientSlice'
import { tick, persistMachineTime, incrementMachineSessionMinutes, updatePlaySession, finalizeSession, resetMachine } from './app/slices/machineSlice'
import AppRoutes from './routes'

export default function App() {
  const dispatch = useDispatch()
  const machines = useSelector(state => state.machines.list)
  const machinesRef = useRef(machines)

  useEffect(() => {
    machinesRef.current = machines
  }, [machines])

  useEffect(() => {
    const persistRunningMachines = () => {
      machinesRef.current.forEach(machine => {
        if (machine.running && machine.sessionId) {
          const nextPlayedMinutes = Number(machine.sessionPlayedMinutes || 0)

          dispatch(updatePlaySession({
            id: machine.sessionId,
            played_minutes: nextPlayedMinutes,
            paid_minutes: Number(machine.sessionPaidMinutes || 0),
            paid_amount: Number(machine.sessionPaidAmount || 0),
            status: 'em_andamento'
          }))

          dispatch(persistMachineTime({
            ...machine,
            sessionPlayedMinutes: nextPlayedMinutes
          }))
        }
      })
    }

    window.addEventListener('beforeunload', persistRunningMachines)

    return () => {
      window.removeEventListener('beforeunload', persistRunningMachines)
    }
  }, [dispatch])

  useEffect(() => {
    machines.forEach(machine => {
      if (machine.sessionId && machine.sessionClosed && !machine.sessionFinalized) {
        const finalPlayedMinutes = Number(machine.sessionPlayedMinutes || 0)

        dispatch(updatePlaySession({
          id: machine.sessionId,
          ended_at: new Date().toISOString(),
          played_minutes: finalPlayedMinutes,
          paid_minutes: Number(machine.sessionPaidMinutes || 0),
          paid_amount: Number(machine.sessionPaidAmount || 0),
          status: 'encerrada'
        }))

        dispatch(resetMachine(machine.id))
        dispatch(persistMachineTime({
          ...machine,
          seconds: 0,
          status: 'livre',
          available: true,
          clientId: null,
          clientName: null,
          sessionId: null,
          sessionPlayedMinutes: 0,
          sessionPaidMinutes: 0,
          sessionPaidAmount: 0
        }))

        dispatch(finalizeSession({ id: machine.id }))
      }
    })
  }, [dispatch, machines])

  // TICK A CADA 1s
  useEffect(() => {
    const tickInterval = setInterval(() => {
      dispatch(tick())
    }, 1000)

    return () => clearInterval(tickInterval)
  }, [dispatch])

  // PERSISTÊNCIA E ACÚMULO A CADA 1 MINUTO
  useEffect(() => {
    const persistInterval = setInterval(() => {
      machinesRef.current.forEach(machine => {
        if (machine.running) {
          const nextPlayedMinutes = Number(machine.sessionPlayedMinutes || 0) + 1

          dispatch(incrementMachineSessionMinutes({ id: machine.id, incrementMinutes: 1 }))
          dispatch(updatePlaySession({
            id: machine.sessionId,
            played_minutes: nextPlayedMinutes,
            paid_minutes: Number(machine.sessionPaidMinutes || 0),
            paid_amount: Number(machine.sessionPaidAmount || 0),
            status: 'em_andamento'
          }))
          dispatch(persistMachineTime({
            ...machine,
            sessionPlayedMinutes: nextPlayedMinutes
          }))

          if (machine.clientId) {
            dispatch(incrementClientPlayTime({
              clientId: machine.clientId,
              incrementMinutes: 1,
              machineId: machine.id,
              sessionId: machine.sessionId
            }))
          }
        }
      })
    }, 60000)

    return () => clearInterval(persistInterval)
  }, [dispatch])

  return <AppRoutes />
}