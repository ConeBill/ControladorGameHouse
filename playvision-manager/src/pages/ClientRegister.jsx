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

  const [form, setForm] = useState({
    id: '',
    name: '',
    birthdate: '',
    phone: '',
    email: '',
    playTime: 0
  })
  const [clientFilter, setClientFilter] = useState('')

  /* =========================
     LOAD CLIENTS
  ========================= */
  useEffect(() => {
    dispatch(fetchClients())
  }, [dispatch])

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

  const selectedClientForPlay = form.id ? clients.find(client => client.id === form.id) : null

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