import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/sidebar.css'

export default function ProtectedRoute({ children, title }) {
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [enteredPassword, setEnteredPassword] = useState('')
  const [accessGranted, setAccessGranted] = useState(false)

  const requiredPassword = useMemo(() => {
    const today = new Date()
    const day = today.getDate()
    const month = today.getMonth() + 1
    const year = today.getFullYear()
    return String(day + month + year)
  }, [])

  const routeMessage = useMemo(() => {
    if (title === 'Estoque') {
      return 'Acesso restrito ao gerenciamento de estoque.'
    }
    if (title === 'Relatórios') {
      return 'Acesso restrito aos relatórios de vendas e desempenho.'
    }
    if (title === 'Configurações') {
      return 'Acesso restrito às configurações e ao backup do sistema.'
    }
    return 'Acesso restrito. Digite a senha para continuar.'
  }, [title])

  useEffect(() => {
    setShowModal(true)
  }, [])

  function unlockAccess() {
    if (enteredPassword.trim() === requiredPassword) {
      setAccessGranted(true)
      setShowModal(false)
      return
    }

    window.alert('Senha incorreta. Use a soma do dia + mês + ano atual.')
  }

  function handleCancel() {
    setShowModal(false)
    navigate('/')
  }

  if (accessGranted) {
    return <>{children}</>
  }

  return (
    <div className="protected-password-overlay">
      <div className="protected-password-modal">
        <h3>Acesso Protegido</h3>
        <p>{routeMessage}</p>
        <p>Digite a senha de acesso para entrar em {title}. A senha é a soma do dia + mês + ano atual.</p>

        <input
          type="password"
          className="protected-password-input"
          placeholder="Senha de acesso"
          value={enteredPassword}
          onChange={(event) => setEnteredPassword(event.target.value)}
          autoFocus
        />

        <div className="protected-password-actions">
          <button type="button" className="neon-button" onClick={handleCancel}>
            Voltar
          </button>
          <button type="button" className="neon-button" onClick={unlockAccess}>
            Entrar
          </button>
        </div>
      </div>
    </div>
  )
}
