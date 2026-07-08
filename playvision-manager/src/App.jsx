import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { incrementClientPlayTime } from './app/slices/clientSlice'
import { tick, persistMachineTime, incrementMachineSessionMinutes, updatePlaySession, finalizeSession, resetMachine, silenceMachine } from './app/slices/machineSlice'
import AppRoutes from './routes'

const FIVE_MINUTES = 5 * 60

const SOUND_BASE = '/sounds'

function playBeep(file, volume = 0.3) {
  try {
    const enabled = window.localStorage.getItem('settings.alarmEnabled')
    if (enabled !== null && enabled === 'false') return

    const countdownEnabled = window.localStorage.getItem('settings.alarmCountdownEnabled')
    if (countdownEnabled === 'false' && file !== 'alarm.wav') return

    const alarmVolumeStorage = window.localStorage.getItem('settings.alarmVolume')
    const finalVolume = alarmVolumeStorage !== null ? Number(alarmVolumeStorage) : volume

    const audio = new Audio(`${SOUND_BASE}/${file}`)
    audio.volume = Math.max(0.01, Math.min(1, finalVolume))
    audio.play().catch(() => {})
  } catch (error) {
    // silencioso
  }
}

function playBeepCountdown() {
  playBeep('beep-5min.wav', 0.35)
}

function playBeepAlarm() {
  playBeep('alarm.wav', 0.55)
}

export default function App() {
  const dispatch = useDispatch()
  const machines = useSelector(state => state.machines.list)
  const machinesRef = useRef(machines)

  const alarmsRef = useRef({
    warnedMachines: new Set(),
    activeAlarms: new Set(),
    intervals: new Map(),
  })

  const [, setAlarmTick] = useState(0)

  useEffect(() => {
    machinesRef.current = machines
  }, [machines])

  useEffect(() => {
    const { warnedMachines, activeAlarms, intervals } = alarmsRef.current

    machines.forEach(machine => {
      if (machine.status !== 'em_uso') {
        if (activeAlarms.has(machine.id)) {
          clearInterval(intervals.get(machine.id))
          intervals.delete(machine.id)
          activeAlarms.delete(machine.id)
          warnedMachines.delete(machine.id)
          window.dispatchEvent(new CustomEvent('machineAlarmSilenced'))
        }
        return
      }

      if (machine.seconds > 0 && machine.seconds <= FIVE_MINUTES) {
        if (!warnedMachines.has(machine.id)) {
          playBeepCountdown()
          warnedMachines.add(machine.id)
        }
      }

      if (machine.seconds === 0 && machine.running === false && machine.sessionClosed && !activeAlarms.has(machine.id)) {
        activeAlarms.add(machine.id)
        const interval = setInterval(() => playBeepAlarm(), 900)
        intervals.set(machine.id, interval)
        window.dispatchEvent(new CustomEvent('machineAlarmTriggered', { detail: { machineId: machine.id, machineDescription: machine.description } }))
      }
    })

    setAlarmTick(value => value + 1)
  }, [machines])

  useEffect(() => {
    return () => {
      const { intervals } = alarmsRef.current
      intervals.forEach((interval) => clearInterval(interval))
      intervals.clear()
    }
  }, [])

  window.silenceAllMachineAlarms = () => {
    const { activeAlarms, intervals } = alarmsRef.current
    activeAlarms.forEach((machineId) => {
      clearInterval(intervals.get(machineId))
      intervals.delete(machineId)
      dispatch(silenceMachine(machineId))
      dispatch(persistMachineTime({
        ...machinesRef.current.find(m => m.id === machineId),
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
    })
    activeAlarms.clear()

    window.dispatchEvent(new CustomEvent('machineAlarmSilenced'))
  }

  function handleSilenceClick() {
    window.silenceAllMachineAlarms?.()
  }
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
      if (machine.sessionId && machine.sessionClosed && !machine.sessionFinalized && !machine.sessionExpired) {
        const finalPlayedMinutes = Number(machine.sessionPlayedMinutes || 0)

        dispatch(updatePlaySession({
          id: machine.sessionId,
          ended_at: new Date().toISOString(),
          played_minutes: finalPlayedMinutes,
          paid_minutes: Number(machine.sessionPaidMinutes || 0),
          paid_amount: Number(machine.sessionPaidAmount || 0),
          status: 'encerrada'
        }))

        dispatch(persistMachineTime({
          ...machine,
          seconds: 0,
          status: 'bloqueada',
          available: false,
          clientId: null,
          clientName: null,
          sessionPlayedMinutes: finalPlayedMinutes,
          sessionPaidMinutes: Number(machine.sessionPaidMinutes || 0),
          sessionPaidAmount: Number(machine.sessionPaidAmount || 0)
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