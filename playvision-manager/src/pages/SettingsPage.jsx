import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { fetchMachines } from '../app/slices/machineSlice'
import '../styles/settings.css'

export default function SettingsPage() {
  const dispatch = useDispatch()

  const [dbInfo, setDbInfo] = useState({ sizeBytes: 0, sizeMB: '0.00', path: '' })
  const [statusMessage, setStatusMessage] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [busyAction, setBusyAction] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isLoadingDbInfo, setIsLoadingDbInfo] = useState(true)
  const [categories, setCategories] = useState([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [categoryMessage, setCategoryMessage] = useState('')

  async function loadDatabaseInfo() {
    setIsLoadingDbInfo(true)

    try {
      const info = await window.api.getDatabaseInfo()
      setDbInfo(info)
    } catch (error) {
      console.error('Erro ao carregar informações do banco:', error)
      setStatusMessage('Erro ao carregar informações do banco.')
    } finally {
      setIsLoadingDbInfo(false)
    }
  }

  useEffect(() => {
    loadDatabaseInfo()
    loadCategories()
  }, [])

  async function loadCategories() {
    try {
      const loadedCategories = await window.api.getCategories()
      setCategories(loadedCategories ?? [])
    } catch (error) {
      console.error('Erro ao carregar categorias:', error)
    }
  }

  async function handleAddCategory() {
    const name = newCategoryName.trim()
    if (!name) {
      setCategoryMessage('Digite o nome da categoria antes de adicionar.')
      return
    }

    setIsBusy(true)
    setBusyAction('category')
    setCategoryMessage('')

    try {
      await window.api.createCategory({ name })
      setNewCategoryName('')
      setCategoryMessage(`Categoria "${name}" adicionada.`)
      await loadCategories()
    } catch (error) {
      console.error('Erro ao criar categoria:', error)
      setCategoryMessage('Erro ao adicionar categoria. Verifique se já existe.')
    } finally {
      setIsBusy(false)
    }
  }

  async function handleBackup() {
    setIsBusy(true)
    setBusyAction('backup')
    setStatusMessage('')

    try {
      const result = await window.api.backupDatabase()

      if (result?.canceled) {
        setStatusMessage('Backup cancelado.')
        return
      }

      setStatusMessage(`Backup salvo em ${result.path}`)
      await loadDatabaseInfo()
    } catch (error) {
      console.error('Erro ao fazer backup:', error)
      setStatusMessage('Erro ao salvar backup do banco.')
    } finally {
      setIsBusy(false)
      setBusyAction('')
    }
  }

  async function handleRestore() {
    setIsBusy(true)
    setBusyAction('restore')
    setStatusMessage('')

    try {
      const result = await window.api.restoreDatabase()

      if (result?.canceled) {
        setStatusMessage('Restauração cancelada.')
        return
      }

      await dispatch(fetchMachines())
      await loadDatabaseInfo()
      setStatusMessage(`Banco restaurado de ${result.path}`)
    } catch (error) {
      console.error('Erro ao restaurar backup:', error)
      setStatusMessage('Erro ao restaurar o backup do banco.')
    } finally {
      setIsBusy(false)
      setBusyAction('')
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      setStatusMessage('Confirme a exclusão para apagar todos os dados do banco.')
      return
    }

    setIsBusy(true)
    setBusyAction('delete')
    setStatusMessage('')

    try {
      await window.api.clearDatabase()
      await dispatch(fetchMachines())
      await loadDatabaseInfo()
      setConfirmDelete(false)
      setStatusMessage('Todos os dados do banco foram apagados.')
    } catch (error) {
      console.error('Erro ao apagar banco:', error)
      setStatusMessage('Erro ao apagar os dados do banco.')
    } finally {
      setIsBusy(false)
      setBusyAction('')
    }
  }

  function cancelDelete() {
    setConfirmDelete(false)
    setBusyAction('')
    setStatusMessage('')
  }

  // Sound settings
  const [sessionSoundEnabled, setSessionSoundEnabled] = useState(true)
  const [sessionSoundVolume, setSessionSoundVolume] = useState(0.12)
  const [alarmEnabled, setAlarmEnabled] = useState(true)
  const [alarmCountdownEnabled, setAlarmCountdownEnabled] = useState(true)
  const [alarmVolume, setAlarmVolume] = useState(0.4)

  useEffect(() => {
    const enabled = window.localStorage.getItem('settings.sessionSoundEnabled')
    const volume = window.localStorage.getItem('settings.sessionSoundVolume')
    setSessionSoundEnabled(enabled === null ? true : enabled === 'true')
    setSessionSoundVolume(volume === null ? 0.12 : Number(volume))

    const alarmEnabledStorage = window.localStorage.getItem('settings.alarmEnabled')
    const alarmCountdownStorage = window.localStorage.getItem('settings.alarmCountdownEnabled')
    const alarmVolumeStorage = window.localStorage.getItem('settings.alarmVolume')
    setAlarmEnabled(alarmEnabledStorage === null ? true : alarmEnabledStorage === 'true')
    setAlarmCountdownEnabled(alarmCountdownStorage === null ? true : alarmCountdownStorage === 'true')
    setAlarmVolume(alarmVolumeStorage === null ? 0.4 : Number(alarmVolumeStorage))
  }, [])

  function handleToggleSessionSound(e) {
    const val = e.target.checked
    setSessionSoundEnabled(val)
    window.localStorage.setItem('settings.sessionSoundEnabled', String(val))
  }

  function handleSessionVolumeChange(e) {
    const v = Number(e.target.value)
    setSessionSoundVolume(v)
    window.localStorage.setItem('settings.sessionSoundVolume', String(v))
  }

  function handleToggleAlarm(e) {
    const val = e.target.checked
    setAlarmEnabled(val)
    window.localStorage.setItem('settings.alarmEnabled', String(val))
  }

  function handleToggleAlarmCountdown(e) {
    const val = e.target.checked
    setAlarmCountdownEnabled(val)
    window.localStorage.setItem('settings.alarmCountdownEnabled', String(val))
  }

  function handleAlarmVolumeChange(e) {
    const v = Number(e.target.value)
    setAlarmVolume(v)
    window.localStorage.setItem('settings.alarmVolume', String(v))
  }

  return (
    <div className="neon-panel settings-page">
      <div className="settings-header">
        <h2>Configurações do Banco</h2>
        <p>Gerencie o banco local, faça backups e restaure dados.</p>
      </div>

      <section className="settings-card">
        <div className="settings-card__header">
          <div>
            <h3>Tamanho atual do banco</h3>
            <p>Arquivo SQLite em uso pela aplicação.</p>
          </div>
        </div>

        <div className="settings-stat-grid">
          <div className="settings-stat">
            <span className="settings-stat__label">Tamanho em MB</span>
            <strong className="settings-stat__value">{dbInfo.sizeMB}</strong>
          </div>

          <div className="settings-stat">
            <span className="settings-stat__label">Tamanho em bytes</span>
            <strong className="settings-stat__value">{dbInfo.sizeBytes}</strong>
          </div>
        </div>

        <div className="settings-path">
          <span className="settings-path__label">Local do arquivo</span>
          <code className="settings-path__value">{dbInfo.path || 'Carregando...'}</code>
        </div>

        {isLoadingDbInfo && (
          <div className="settings-status" role="status" aria-live="polite">
            Carregando informações do banco...
          </div>
        )}
      </section>

      <section className="settings-card">
        <div className="settings-card__header">
          <div>
            <h3>Backup e restauração</h3>
            <p>Salve todo o sistema em um arquivo .db ou restaure um backup do sistema.</p>
          </div>
        </div>

        <div className="settings-actions">
          <button
            className="action-button--secondary"
            onClick={handleBackup}
            disabled={isBusy}
          >
            {isBusy && busyAction === 'backup' ? 'Salvando backup do sistema...' : 'Salvar backup do sistema (.db)'}
          </button>

          <button
            className="action-button--secondary"
            onClick={handleRestore}
            disabled={isBusy}
          >
            {isBusy && busyAction === 'restore' ? 'Restaurando backup do sistema...' : 'Restaurar backup do sistema'}
          </button>
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-card__header">
          <div>
            <h3>Categorias do estoque</h3>
            <p>Cadastre categorias para usar como filtro e atribuição nos itens de estoque.</p>
          </div>
        </div>

        <div className="settings-card__field">
          <label>Nova categoria</label>
          <input
            type="text"
            value={newCategoryName}
            onChange={(event) => setNewCategoryName(event.target.value)}
            placeholder="Ex: Bebidas, Snacks, Acessórios"
          />
        </div>

        <div className="settings-actions">
          <button
            className="action-button--secondary"
            onClick={handleAddCategory}
            disabled={isBusy}
          >
            {isBusy && busyAction === 'category' ? 'Adicionando...' : 'Adicionar categoria'}
          </button>
        </div>

        {categoryMessage && (
          <div className="settings-status" role="status" aria-live="polite">
            {categoryMessage}
          </div>
        )}

        <div className="settings-category-list">
          {categories.length === 0 ? (
            <p>Nenhuma categoria cadastrada ainda.</p>
          ) : (
            categories.map(category => (
              <div key={category.id} className="settings-category-item">
                <span>{category.name}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="settings-card settings-card--sound">
        <div className="settings-card__header">
          <div>
            <h3>Sons e alertas</h3>
            <p>Ajuste os sons do sistema e dos avisos do painel de controle.</p>
          </div>
        </div>

        <div className="settings-actions">
          <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" checked={sessionSoundEnabled} onChange={handleToggleSessionSound} />
            Som de início de sessão
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" checked={alarmCountdownEnabled} onChange={handleToggleAlarmCountdown} />
            Alerta de contagem regressiva
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" checked={alarmEnabled} onChange={handleToggleAlarm} />
            Alarme contínuo quando o tempo acabar
          </label>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <input type="range" min="0" max="1" step="0.01" value={sessionSoundVolume} onChange={handleSessionVolumeChange} />
          <span>Volume do som de sessão: {Math.round(sessionSoundVolume * 100)}%</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <input type="range" min="0" max="1" step="0.01" value={alarmVolume} onChange={handleAlarmVolumeChange} />
          <span>Volume do alarme: {Math.round(alarmVolume * 100)}%</span>
        </div>
      </section>

      <section className="settings-card settings-card--danger">
        <div className="settings-card__header">
          <div>
            <h3>Apagar todos os dados do sistema</h3>
            <p>Remove todas as informações do banco local e limpa todos os dados do sistema.</p>
          </div>
        </div>

        {!confirmDelete ? (
          <div className="settings-actions">
            <button
              className="action-button--danger"
              onClick={handleDelete}
              disabled={isBusy}
            >
              {isBusy && busyAction === 'delete' ? 'Apagando dados...' : 'Deletar todos os dados'}
            </button>
          </div>
        ) : (
          <div className="settings-delete-confirmation">
            <p className="settings-warning">
              Esta ação irá apagar todos os registros do banco. Deseja continuar?
            </p>

            <div className="settings-actions">
              <button
                className="action-button--danger"
                onClick={handleDelete}
                disabled={isBusy}
              >
                {isBusy && busyAction === 'delete' ? 'Apagando dados do sistema...' : 'Deletar todos os dados do sistema'}
              </button>

              <button
                className="action-button--secondary"
                onClick={cancelDelete}
                disabled={isBusy}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </section>

      {statusMessage && (
        <div className="settings-status" role="status" aria-live="polite">
          {statusMessage}
        </div>
      )}
    </div>
  )
}
