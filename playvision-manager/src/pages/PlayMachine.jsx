import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation } from 'react-router-dom'
import { fetchClients } from '../app/slices/clientSlice'
import { createPlaySession, fetchMachines, persistMachineTime, startMachine } from '../app/slices/machineSlice'
import { calculateSessionEstimate } from '../utils/sessionPricing'
import '../styles/play-machine.css'

const DURATION_OPTIONS = [
  { value: '30', label: '30 minutos' },
  { value: '60', label: '1 hora' },
  { value: '120', label: '2 horas' }
]

export default function PlayMachine() {
  const dispatch = useDispatch()
  const location = useLocation()
  const machines = useSelector(state => state.machines.list)
  const clients = useSelector(state => state.clients.list)

  const [selectedClient, setSelectedClient] = useState(null)
  const [clientSearch, setClientSearch] = useState('')
  const [selectedMachine, setSelectedMachine] = useState(null)
  const [machineSearch, setMachineSearch] = useState('')
  const [durationPreset, setDurationPreset] = useState('30')
  const [customMinutes, setCustomMinutes] = useState('')
  const [discountMode, setDiscountMode] = useState(false)
  const [discountMinutes, setDiscountMinutes] = useState('')
  const [discountAmount, setDiscountAmount] = useState('')
  const [isStarting, setIsStarting] = useState(false)
  const [showClientModal, setShowClientModal] = useState(false)
  const [showMachineModal, setShowMachineModal] = useState(false)
  const [modalClientSearch, setModalClientSearch] = useState('')
  const [modalMachineSearch, setModalMachineSearch] = useState('')

  useEffect(() => {
    dispatch(fetchClients())
    dispatch(fetchMachines())
  }, [dispatch])

  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const normalized = clientSearch.trim().toLowerCase()

      if (!normalized) return true

      return client.name.toLowerCase().includes(normalized)
    })
  }, [clients, clientSearch])

  const filteredMachines = useMemo(() => {
    return machines.filter(machine => {
      const normalized = machineSearch.trim().toLowerCase()

      if (!normalized) return true

      return `${machine.id} ${machine.description}`.toLowerCase().includes(normalized)
    })
  }, [machineSearch, machines])

  const filteredModalClients = useMemo(() => {
    return clients.filter(client => {
      const normalized = modalClientSearch.trim().toLowerCase()

      if (!normalized) return true

      return client.name.toLowerCase().includes(normalized)
    })
  }, [clients, modalClientSearch])

  const filteredModalMachines = useMemo(() => {
    return machines.filter(machine => {
      const normalized = modalMachineSearch.trim().toLowerCase()

      if (!normalized) return true

      return `${machine.id} ${machine.description}`.toLowerCase().includes(normalized)
    })
  }, [machines, modalMachineSearch])

  const durationMinutes = discountMode
    ? Number(discountMinutes) || 0
    : durationPreset === 'custom'
      ? Number(customMinutes) || 0
      : Number(durationPreset)

  const valueEstimate = useMemo(() => {
    if (!selectedMachine || durationMinutes <= 0) return '0.00'

    if (discountMode) {
      return Number(discountAmount || 0).toFixed(2)
    }

    return calculateSessionEstimate(durationMinutes, selectedMachine).toFixed(2)
  }, [durationMinutes, selectedMachine, discountMode, discountAmount])

  function selectClient(client) {
    setSelectedClient(client)
    setClientSearch(client.name)
  }

  function selectMachine(machine) {
    setSelectedMachine(machine)
    setMachineSearch(`${machine.id} - ${machine.description}`)
  }

  useEffect(() => {
    if (location.state?.selectedClient) {
      const client = location.state.selectedClient
      setSelectedClient(client)
      setClientSearch(client.name)
    }
  }, [location.state])

  const discountFieldsValid = !discountMode || (durationMinutes > 0 && Number(discountAmount) >= 0)

  async function iniciarJogo() {
    if (!selectedClient || !selectedMachine || durationMinutes <= 0 || !selectedMachine.available || !discountFieldsValid) return

    try {
      setIsStarting(true)

      const paidAmount = discountMode
        ? Number(discountAmount) || 0
        : calculateSessionEstimate(durationMinutes, selectedMachine)

      const createdSession = await dispatch(createPlaySession({
        client_id: selectedClient.id,
        machine_id: selectedMachine.id,
        started_at: new Date().toISOString(),
        ended_at: null,
        played_minutes: 0,
        paid_minutes: durationMinutes,
        paid_amount: paidAmount,
        status: 'em_andamento'
      })).unwrap()

      dispatch(startMachine({
        id: selectedMachine.id,
        minutes: durationMinutes,
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        sessionId: createdSession.id,
        sessionPaidMinutes: durationMinutes,
        sessionPaidAmount: paidAmount
      }))

      await dispatch(persistMachineTime({
        ...selectedMachine,
        seconds: durationMinutes * 60,
        available: false,
        status: 'em_uso',
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        sessionId: createdSession.id,
        sessionPlayedMinutes: 0,
        sessionPaidMinutes: durationMinutes,
        sessionPaidAmount: paidAmount
      })).unwrap()

      // open control panel and show session started inform
      try {
        window.dispatchEvent(new CustomEvent('openControlPanel', { detail: { expand: true } }))
        window.dispatchEvent(new CustomEvent('sessionStarted', { detail: { clientName: selectedClient.name, machineId: selectedMachine.id } }))
      } catch (err) {
        // ignore if running outside browser
      }
    } catch (error) {
      console.error('Erro ao iniciar sessão:', error)
    } finally {
      setIsStarting(false)
    }
  }

  return (
    <div className="play-machine-page">
      <div className="play-machine-page__header">
        <h2>Iniciar Jogo</h2>
        <p>Selecione o cliente, a máquina e o tempo da sessão. O valor será calculado automaticamente com base no preço cadastrado da máquina.</p>
      </div>

      <section className="play-machine-panel">
        <div className="play-machine-panel__copy">
          <h3>Dados da sessão</h3>
          <p>Use a busca sugerida ou abra a lista completa para localizar o cliente e a máquina.</p>
        </div>

        <div className="play-machine-grid">
          <div className="play-machine-field">
            <div className="play-machine-field__label">
              <span>Cliente</span>
              <span className="play-machine-field__helper">Sugestão em tempo real</span>
            </div>

            <div className="play-machine-field__shell">
              <div className="play-machine-field__input-row">
                <input
                  className="play-machine-field__input"
                  type="text"
                  placeholder="Digite o nome do cliente"
                  value={clientSearch}
                  onChange={(event) => {
                    setClientSearch(event.target.value)
                    setSelectedClient(null)
                  }}
                />

                <button
                  type="button"
                  className="play-machine-field__open"
                  onClick={() => setShowClientModal(true)}
                >
                  Ver lista
                </button>
              </div>

              {clientSearch && filteredClients.length > 0 && !selectedClient && (
                <div className="play-machine-suggestions" role="listbox">
                  {filteredClients.slice(0, 6).map(client => (
                    <button
                      key={client.id}
                      type="button"
                      className="play-machine-suggestion"
                      onClick={() => selectClient(client)}
                    >
                      <strong>{client.name}</strong>
                      <span>#{client.id} • {client.phone || 'Sem telefone'} • {client.email || 'Sem email'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="play-machine-field">
            <div className="play-machine-field__label">
              <span>Máquina</span>
              <span className="play-machine-field__helper">Sugestão em tempo real</span>
            </div>

            <div className="play-machine-field__shell">
              <div className="play-machine-field__input-row">
                <input
                  className="play-machine-field__input"
                  type="text"
                  placeholder="Digite o nome ou ID da máquina"
                  value={machineSearch}
                  onChange={(event) => {
                    setMachineSearch(event.target.value)
                    setSelectedMachine(null)
                  }}
                />

                <button
                  type="button"
                  className="play-machine-field__open"
                  onClick={() => setShowMachineModal(true)}
                >
                  Ver lista
                </button>
              </div>

              {machineSearch && filteredMachines.length > 0 && !selectedMachine && (
                <div className="play-machine-suggestions" role="listbox">
                  {filteredMachines.slice(0, 6).map(machine => (
                    <button
                      key={machine.id}
                      type="button"
                      className="play-machine-suggestion"
                      onClick={() => selectMachine(machine)}
                    >
                      <strong>#{machine.id} — {machine.description}</strong>
                      <span>{machine.available ? 'Disponível' : 'Indisponível'} • R$ {Number(machine.price30 || 0).toFixed(2)} / 30 min</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="play-machine-summary">
          <div className="play-machine-summary__card">
            <span className="play-machine-summary__label">Cliente selecionado</span>
            <strong className="play-machine-summary__value">{selectedClient ? selectedClient.name : 'Nenhum cliente selecionado'}</strong>
            <span className="play-machine-summary__meta">
              {selectedClient ? `ID #${selectedClient.id} • ${selectedClient.phone || 'Sem telefone'} • ${selectedClient.email || 'Sem email'}` : 'Selecione um cliente para continuar'}
            </span>
          </div>

          <div className="play-machine-summary__card">
            <span className="play-machine-summary__label">Máquina selecionada</span>
            <strong className="play-machine-summary__value">{selectedMachine ? `#${selectedMachine.id} — ${selectedMachine.description}` : 'Nenhuma máquina selecionada'}</strong>
            <span className="play-machine-summary__meta">
              {selectedMachine ? `${selectedMachine.available ? 'Disponível' : 'Em uso'} • R$ ${Number(selectedMachine.price30 || 0).toFixed(2)} / 30 min • R$ ${Number(selectedMachine.price60 || 0).toFixed(2)} / 1 hora` : 'Selecione uma máquina para continuar'}
            </span>
          </div>
        </div>

        <div className="play-machine-field">
          <div className="play-machine-field__label">
            <div>
              <span>Tempo e valor</span>
              <span className="play-machine-field__helper">Escolha o tempo da sessão</span>
            </div>

            <button
              type="button"
              className={`play-machine-discount-toggle ${discountMode ? 'active' : ''}`}
              onClick={() => {
                const nextMode = !discountMode
                setDiscountMode(nextMode)

                if (nextMode) {
                  setDiscountMinutes(String(durationMinutes || 0))
                  setDiscountAmount(String(valueEstimate || '0.00'))
                }
              }}
            >
              {discountMode ? 'Desconto ativado' : 'Aplicar desconto'}
            </button>
          </div>

          {discountMode ? (
            <div className="play-machine-discount-row">
              <label className="play-machine-discount-field">
                Minutos
                <input
                  className="play-machine-discount-input"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Digite minutos"
                  value={discountMinutes}
                  onChange={(event) => setDiscountMinutes(event.target.value)}
                />
              </label>

              <label className="play-machine-discount-field">
                Valor pago
                <input
                  className="play-machine-discount-input"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="R$"
                  value={discountAmount}
                  onChange={(event) => setDiscountAmount(event.target.value)}
                />
              </label>
            </div>
          ) : (
            <div className="play-machine-time-row">
              <select
                className="play-machine-time-select"
                value={durationPreset}
                onChange={(event) => setDurationPreset(event.target.value)}
              >
                {DURATION_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
                <option value="custom">Personalizado</option>
              </select>

              {durationPreset === 'custom' && (
                <input
                  className="play-machine-custom-input"
                  type="number"
                  min="10"
                  step="10"
                  placeholder="Minutos"
                  value={customMinutes}
                  onChange={(event) => setCustomMinutes(event.target.value)}
                />
              )}
            </div>
          )}
        </div>

        <div className="play-machine-total">
          <div>
            <p className="play-machine-total__label">Valor estimado</p>
            <p className="play-machine-total__value">R$ {valueEstimate}</p>
          </div>

          <div className="play-machine-total__label">
            {durationMinutes > 0 ? `${durationMinutes} minutos selecionados` : 'Defina um tempo para iniciar'}
          </div>
        </div>

        {!selectedMachine?.available && selectedMachine && (
          <div className="play-machine-alert">
            Esta máquina está ocupada no momento. Escolha outra máquina disponível para iniciar uma nova sessão.
          </div>
        )}

        <div className="play-machine-actions">
          <button
            type="button"
            className="play-machine-start"
            onClick={iniciarJogo}
            disabled={!selectedClient || !selectedMachine || durationMinutes <= 0 || !selectedMachine.available || isStarting || !discountFieldsValid}
          >
            {isStarting ? 'Iniciando...' : 'Iniciar sessão'}
          </button>
        </div>
      </section>

      {showClientModal && (
        <div className="play-machine-modal-overlay" onClick={() => setShowClientModal(false)}>
          <div className="play-machine-modal" onClick={(event) => event.stopPropagation()}>
            <div className="play-machine-modal__header">
              <div>
                <h3>Clientes cadastrados</h3>
                <p>Selecione um cliente para carregar no formulário.</p>
              </div>

              <button
                type="button"
                className="play-machine-modal__close"
                onClick={() => setShowClientModal(false)}
              >
                Fechar
              </button>
            </div>

            <input
              className="play-machine-modal__search"
              type="text"
              placeholder="Buscar cliente"
              value={modalClientSearch}
              onChange={(event) => setModalClientSearch(event.target.value)}
            />

            <div className="play-machine-modal__table">
              {filteredModalClients.map(client => (
                <div key={client.id} className="play-machine-modal__row">
                  <div className="play-machine-modal__row-info">
                    <span className="play-machine-modal__row-label">{client.name}</span>
                    <span className="play-machine-modal__row-meta">#{client.id} • {client.phone || 'Sem telefone'} • {client.email || 'Sem email'}</span>
                  </div>

                  <button
                    type="button"
                    className="play-machine-modal__select"
                    onClick={() => {
                      selectClient(client)
                      setShowClientModal(false)
                    }}
                  >
                    Selecionar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showMachineModal && (
        <div className="play-machine-modal-overlay" onClick={() => setShowMachineModal(false)}>
          <div className="play-machine-modal" onClick={(event) => event.stopPropagation()}>
            <div className="play-machine-modal__header">
              <div>
                <h3>Máquinas cadastradas</h3>
                <p>Selecione uma máquina para iniciar a sessão.</p>
              </div>

              <button
                type="button"
                className="play-machine-modal__close"
                onClick={() => setShowMachineModal(false)}
              >
                Fechar
              </button>
            </div>

            <input
              className="play-machine-modal__search"
              type="text"
              placeholder="Buscar máquina"
              value={modalMachineSearch}
              onChange={(event) => setModalMachineSearch(event.target.value)}
            />

            <div className="play-machine-modal__table">
              {filteredModalMachines.map(machine => (
                <div key={machine.id} className="play-machine-modal__row">
                  <div className="play-machine-modal__row-info">
                    <span className="play-machine-modal__row-label">#{machine.id} — {machine.description}</span>
                    <span className="play-machine-modal__row-meta">{machine.available ? 'Disponível' : 'Em uso'} • R$ {Number(machine.price30 || 0).toFixed(2)} / 30 min • R$ {Number(machine.price60 || 0).toFixed(2)} / 1 hora</span>
                  </div>

                  <button
                    type="button"
                    className="play-machine-modal__select"
                    onClick={() => {
                      selectMachine(machine)
                      setShowMachineModal(false)
                    }}
                  >
                    Selecionar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}