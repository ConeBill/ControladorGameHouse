import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  fetchClients,
  createClient,
  updateClient
} from '../app/slices/clientSlice'
import '../styles/client.css'

export default function ClientRegister() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const clients = useSelector(state => state.clients.list)

  const [isEditing, setIsEditing] = useState(false)
  const [reservedId, setReservedId] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [clientSessions, setClientSessions] = useState([])
  const [loadingSessions, setLoadingSessions] = useState(false)

  const [form, setForm] = useState({
    id: '',
    name: '',
    birthdate: '',
    phone: '',
    email: '',
    playTime: 0
  })
  const [clientFilter, setClientFilter] = useState('')

  const selectedClientForPlay = form.id ? clients.find(client => client.id === form.id) : null

  /* =========================
     LOAD CLIENTS
  ========================= */
  useEffect(() => {
    dispatch(fetchClients())
  }, [dispatch])

  useEffect(() => {
    if (!selectedClientForPlay) {
      setClientSessions([])
      return
    }

    let cancelled = false
    setLoadingSessions(true)

    window.api.getPlaySessions()
      .then(all => {
        if (!cancelled) setClientSessions((all || []).filter(s => s.client_id === selectedClientForPlay.id))
      })
      .catch(() => {
        if (!cancelled) setClientSessions([])
      })
      .finally(() => {
        if (!cancelled) setLoadingSessions(false)
      })

    return () => { cancelled = true }
  }, [selectedClientForPlay])

  const filteredClients = clients.filter(client => {
    const normalizedFilter = clientFilter.trim().toLowerCase()

    if (!normalizedFilter) return true

    return client.name.toLowerCase().includes(normalizedFilter)
  })

  /* =========================
     RESERVAR ID (IPC)
  ========================= */
  async function reserveClientId() {
    const id = await window.api.reserveClientId()
    setReservedId(id)

    setForm({
      id,
      name: '',
      birthdate: '',
      phone: '',
      email: '',
      playTime: 0
    })

    setIsEditing(false)
  }

  /* =========================
     CANCELAR / LIMPAR
  ========================= */
  async function cancelNew() {
    if (reservedId) {
      await window.api.releaseClientId(reservedId)
    }

    setReservedId(null)
    setIsEditing(false)

    setForm({
      id: '',
      name: '',
      birthdate: '',
      phone: '',
      email: '',
      playTime: 0
    })
  }

  async function handleStartPlay() {
    if (!selectedClientForPlay) {
      alert('Selecione um cliente antes de iniciar o jogo.')
      return
    }

    navigate('/play', { state: { selectedClient: selectedClientForPlay } })
  }

  /* =========================
     SAVE
  ========================= */
  async function handleSave() {
    if (!form.name.trim()) {
      alert('O nome do cliente é obrigatório')
      return
    }

    setIsSaving(true)

    const payload = {
      id: form.id,
      name: form.name,
      birthdate: form.birthdate,
      phone: form.phone,
      email: form.email,
      playTime: Number(form.playTime || 0)
    }

    try {
      if (isEditing) {
        await dispatch(updateClient(payload)).unwrap()
      } else {
        await dispatch(createClient(payload)).unwrap()
      }

      await dispatch(fetchClients()).unwrap()
    } catch (error) {
      console.error('Erro ao salvar cliente:', error)
      alert('Erro ao salvar o cliente. Tente novamente.')
      return
    } finally {
      setIsSaving(false)
    }

    setReservedId(null)
    alert('Cliente salvo com sucesso')
  }

  /* =========================
     LOAD CLIENT
  ========================= */
  function handleLoadClient(client) {
    setForm({
      id: client.id,
      name: client.name,
      birthdate: client.birthdate || '',
      phone: client.phone || '',
      email: client.email || '',
      playTime: Number(client.playTime || 0)
    })

    setIsEditing(true)
    setReservedId(null)
  }

  /* =========================
     CLEANUP ON CLOSE
  ========================= */
  useEffect(() => {
    return () => {
      if (reservedId) {
        window.api.releaseClientId(reservedId)
      }
    }
  }, [reservedId])

  function formatBirthdate(value) {
    if (!value) return null
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString('pt-BR')
  }

  function formatMinutes(totalMinutes) {
    const safe = Math.max(Number(totalMinutes || 0), 0)
    const h = Math.floor(safe / 60)
    const m = safe % 60
    return `${h}h ${m.toString().padStart(2, '0')}min`
  }

  /* =========================
     UI
  ========================= */
  return (
    <div className="neon-panel client-register">
      <h2>Cadastro de Clientes</h2>

      {/* LINHA 1 */}
      <div className="form-row">
        <div className="form-group small">
          <label>ID</label>
          <input value={form.id} disabled />
        </div>

        <div className="form-group large">
          <label>Nome *</label>
          <input
            value={form.name}
            onChange={e =>
              setForm({ ...form, name: e.target.value })
            }
          />
        </div>

        <div className="form-group">
          <label>Data de Nascimento</label>
          <input
            type="date"
            value={form.birthdate}
            onChange={e =>
              setForm({ ...form, birthdate: e.target.value })
            }
          />
        </div>
      </div>

      {/* LINHA 2 */}
      <div className="form-row">
        <div className="form-group">
          <label>Telefone</label>
          <input
            value={form.phone}
            onChange={e =>
              setForm({ ...form, phone: e.target.value })
            }
          />
        </div>

        <div className="form-group large">
          <label>Email</label>
          <input
            value={form.email}
            onChange={e =>
              setForm({ ...form, email: e.target.value })
            }
          />
        </div>

        <div className="form-group">
          <label>Tempo de Jogo</label>
          <input
            type="text"
            value={`${Number(form.playTime || 0)} min`}
            readOnly
          />
        </div>
      </div>

      {/* BOTÕES */}
      <div className="form-actions">
        <button className="action-button action-button--secondary" onClick={reserveClientId}>Novo</button>
        <button className="action-button action-button--danger" onClick={cancelNew}>Cancelar</button>
        <button
          className={`action-button action-button--success ${isSaving ? 'action-button--saving' : ''}`}
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? 'Salvando...' : 'Salvar'}
        </button>
        <button
          className="action-button action-button--primary"
          type="button"
          onClick={handleStartPlay}
          disabled={!selectedClientForPlay}
        >
          Jogar
        </button>
        <button className="action-button action-button--ghost" disabled>Relatório</button>
      </div>

      {selectedClientForPlay && (
        <section className="client-history">
          <div className="client-history__header">
            <h3>Histórico de sessões</h3>
            <button
              type="button"
              className="neon-button"
              onClick={() => navigate('/reports', { state: { clientId: selectedClientForPlay.id } })}
            >
              Ver relatório filtrado
            </button>
          </div>

          {loadingSessions ? (
            <p className="empty">Carregando sessões...</p>
          ) : clientSessions.length === 0 ? (
            <p className="empty">Nenhuma sessão registrada para este cliente.</p>
          ) : (
            <>
              <div className="client-history__summary">
                <div>
                  <span>Tempo total jogado</span>
                  <strong>{formatMinutes(clientSessions.reduce((sum, s) => sum + Number(s.played_minutes || 0), 0))}</strong>
                </div>
                <div>
                  <span>Valor total gasto</span>
                  <strong>R$ {clientSessions.reduce((sum, s) => sum + Number(s.paid_amount || 0), 0).toFixed(2)}</strong>
                </div>
              </div>

              <div className="client-history__list">
                {clientSessions.slice(0, 7).map(session => (
                  <div key={session.id} className="client-history__item">
                    <div>
                      <strong>{session.machine_description || `Máquina ${session.machine_id}`}</strong>
                      <span>{new Date(session.started_at).toLocaleString('pt-BR')}</span>
                    </div>
                    <div>
                      <span>{formatMinutes(Number(session.played_minutes || 0))} jogados</span>
                      <strong>R$ {Number(session.paid_amount || 0).toFixed(2)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* LISTA */}
      <div className="client-preview">
        <div className="client-preview__header">
          <h4>Clientes Cadastrados</h4>
          <input
            className="client-preview__search"
            type="text"
            placeholder="Filtrar por nome"
            value={clientFilter}
            onChange={e => setClientFilter(e.target.value)}
          />
        </div>

        {filteredClients.length === 0 && (
          <p className="empty">Nenhum cliente encontrado</p>
        )}

        <div className="client-grid">
          {filteredClients.map(client => (
            <div
              key={client.id}
              className="client-card"
              onDoubleClick={() => handleLoadClient(client)}
            >
              <div className="client-card__header">
                <span className="client-card__id">#{client.id}</span>
                <span className="client-card__name">{client.name}</span>
              </div>
              <div className="client-card__body">
                <div>
                  <strong>Tempo de jogo:</strong>{' '}
                  {client.playTime ? `${client.playTime} min` : 'Ainda não jogou'}
                </div>
                {client.birthdate && (
                  <div>
                    <strong>Data de nascimento:</strong>{' '}
                    {formatBirthdate(client.birthdate)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}