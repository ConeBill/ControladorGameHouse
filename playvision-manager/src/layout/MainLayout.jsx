import { useEffect, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import MachineDashboard from '../components/MachineDashboard'
import { Outlet } from 'react-router-dom'
import { fetchMachines } from '../app/slices/machineSlice'
import logo from '../assets/logo-play-ret.png'
import '../styles/main-layout.css'

const PANEL_MAX_HEIGHT = 320
const PANEL_MIN_HEIGHT = 72

export default function MainLayout() {
  const dispatch = useDispatch()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [panelHeight, setPanelHeight] = useState(PANEL_MIN_HEIGHT)
  const [sessionMessage, setSessionMessage] = useState(null)
  const [panelEffect, setPanelEffect] = useState(false)
  const dragRef = useRef({ startY: 0, startHeight: PANEL_MIN_HEIGHT, dragging: false })

  useEffect(() => {
    dispatch(fetchMachines())
  }, [dispatch])

  const isExpanded = panelHeight > PANEL_MIN_HEIGHT
  const isControlPanelRoute = location.pathname === '/control-panel'

  const handleTogglePanel = () => {
    setPanelHeight((prev) => (prev > PANEL_MIN_HEIGHT ? PANEL_MIN_HEIGHT : PANEL_MAX_HEIGHT))
  }

  const handleOpenControlPanel = () => {
    setPanelHeight(PANEL_MIN_HEIGHT)
    navigate('/control-panel')
  }

  useEffect(() => {
    const onOpen = (e) => {
      const expand = e?.detail?.expand ?? true
      if (expand) setPanelHeight(PANEL_MAX_HEIGHT)
    }

    const onSessionStarted = (e) => {
      const { clientName, machineId } = e?.detail || {}
      setSessionMessage(`Sessão iniciada: ${clientName || 'Jogador'} • Máquina ${machineId ?? ''}`)
      // play sound and visual effect
      try {
        playSessionSound()
      } catch (err) {}
      setPanelEffect(true)
      setTimeout(() => setPanelEffect(false), 1800)
      // auto-hide message
      setTimeout(() => setSessionMessage(null), 5000)
      // also expand panel
      setPanelHeight(PANEL_MAX_HEIGHT)
    }

    window.addEventListener('openControlPanel', onOpen)
    window.addEventListener('sessionStarted', onSessionStarted)

    return () => {
      window.removeEventListener('openControlPanel', onOpen)
      window.removeEventListener('sessionStarted', onSessionStarted)
    }
  }, [])

  function playSessionSound() {
    try {
      const enabled = window.localStorage.getItem('settings.sessionSoundEnabled')
      if (enabled === 'false') return

      const volumeStr = window.localStorage.getItem('settings.sessionSoundVolume')
      const baseVolume = volumeStr ? Number(volumeStr) : 0.12

      const AudioCtx = window.AudioContext || window.webkitAudioContext
      const ctx = new AudioCtx()
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = 880
      o.connect(g)
      g.connect(ctx.destination)
      const now = ctx.currentTime
      g.gain.setValueAtTime(0.0001, now)
      g.gain.linearRampToValueAtTime(baseVolume, now + 0.02)
      o.start(now)
      o.frequency.exponentialRampToValueAtTime(660, now + 0.08)
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.36)
      o.stop(now + 0.38)
    } catch (err) {
      // ignore audio errors
    }
  }

  const handlePointerDown = (event) => {
    dragRef.current = {
      startY: event.clientY,
      startHeight: panelHeight,
      dragging: true,
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  const handlePointerMove = (event) => {
    if (!dragRef.current.dragging) return

    const deltaY = event.clientY - dragRef.current.startY
    const nextHeight = Math.min(
      PANEL_MAX_HEIGHT,
      Math.max(PANEL_MIN_HEIGHT, dragRef.current.startHeight - deltaY)
    )
    setPanelHeight(nextHeight)
  }

  const handlePointerUp = () => {
    if (!dragRef.current.dragging) return

    const shouldExpand = panelHeight > (PANEL_MAX_HEIGHT + PANEL_MIN_HEIGHT) / 2
    setPanelHeight(shouldExpand ? PANEL_MAX_HEIGHT : PANEL_MIN_HEIGHT)
    dragRef.current.dragging = false
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
  }

  return (
    <div className="app-shell">
      <Header />

      <div className="app-body">
        <Sidebar open={menuOpen} />

        <main className="main-area">
          <Outlet />
        </main>
      </div>

      <footer
        className={`control-panel ${isExpanded ? 'expanded' : 'collapsed'} ${isControlPanelRoute ? 'control-panel--active' : ''} ${panelEffect ? 'control-panel--effect' : ''}`}
        style={{ height: `${panelHeight}px` }}
      >
        <div className="control-panel__handle">
          <button
            type="button"
            className={`control-panel__brand ${isControlPanelRoute ? 'control-panel__brand--active' : ''}`}
            onClick={handleOpenControlPanel}
            aria-label="Abrir painel de controle"
          >
            <img src={logo} alt="PlayVision" className="control-panel__logo" />
            <span className="control-panel__brand-text">Painel de Controle</span>
          </button>

          <div
            className="control-panel__grabber"
            onPointerDown={handlePointerDown}
            onClick={handleTogglePanel}
            role="button"
            tabIndex={0}
            aria-label={isExpanded ? 'Minimizar painel de controle' : 'Expandir painel de controle'}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                handleTogglePanel()
              }
            }}
          >
            <FontAwesomeIcon
              icon={isExpanded ? faChevronDown : faChevronUp}
              aria-hidden="true"
            />
          </div>
        </div>
        <div className="control-panel__content">
          {sessionMessage && (
            <div className="control-panel__session-message">{sessionMessage}</div>
          )}
          <MachineDashboard />
        </div>
      </footer>
    </div>
  )
}