import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
    fetchMachines,
    createMachine,
    updateMachine
} from '../app/slices/machineSlice'
import '../styles/machine-register.css'

const emptyForm = {
    id: '',
    description: '',
    available: true,
    price30: '',
    price60: ''
}

export default function MachineRegister() {
    const dispatch = useDispatch()
    const machines = useSelector(state => state.machines.list)

    const [isEditing, setIsEditing] = useState(false)
    const [selectedMachineId, setSelectedMachineId] = useState(null)
    const [isSaving, setIsSaving] = useState(false)
    const [form, setForm] = useState(emptyForm)

    useEffect(() => {
        dispatch(fetchMachines())
    }, [dispatch])

    function handleSelectMachine(machine) {
        setForm({
            id: machine.id,
            description: machine.description ?? '',
            available: Boolean(machine.available),
            price30: machine.price30 ?? '',
            price60: machine.price60 ?? ''
        })

        setIsEditing(true)
        setSelectedMachineId(machine.id)
    }

    function handleNew() {
        const nextId =
            machines.length > 0
                ? Math.max(...machines.map(m => m.id)) + 1
                : 1

        setForm({
            id: nextId,
            description: '',
            available: true,
            price30: '',
            price60: ''
        })

        setIsEditing(false)
        setSelectedMachineId(null)
    }

    function handleCancel() {
        setForm(emptyForm)
        setIsEditing(false)
        setSelectedMachineId(null)
    }

    function handleNumericChange(field, value) {
        if (value === '') {
            setForm(prev => ({ ...prev, [field]: '' }))
            return
        }

        const numericValue = Number(value)

        if (Number.isNaN(numericValue)) return

        setForm(prev => ({ ...prev, [field]: numericValue }))
    }

    async function handleSave() {
        if (!form.description.trim()) {
            alert('A descrição da máquina é obrigatória')
            return
        }

        setIsSaving(true)

        const payload = {
            ...form,
            available: Boolean(form.available),
            price30: Number(form.price30) || 0,
            price60: Number(form.price60) || 0
        }

        try {
            if (isEditing) {
                await dispatch(updateMachine(payload)).unwrap()
            } else {
                await dispatch(createMachine(payload)).unwrap()
            }

            await dispatch(fetchMachines()).unwrap()
        } catch (error) {
            console.error('Erro ao salvar máquina:', error)
            alert('Erro ao salvar a máquina. Tente novamente.')
            return
        } finally {
            setIsSaving(false)
        }

        setForm(emptyForm)
        setIsEditing(false)
        setSelectedMachineId(null)
    }

    return (
        <div className="neon-panel machine-register">
            <h2>Cadastro de Máquinas</h2>

            <div className="machine-layout">
                <section className="machine-list-panel">
                    <div>
                        <h3>Máquinas cadastradas</h3>
                        <p>
                            Dê dois cliques em uma máquina para carregar seus dados e editar.
                        </p>
                    </div>

                    {machines.length === 0 ? (
                        <div className="machine-empty">
                            Nenhuma máquina cadastrada.
                        </div>
                    ) : (
                        <div className="machine-grid">
                            {machines.map(machine => (
                                <article
                                    key={machine.id}
                                    className={`machine-card-item ${selectedMachineId === machine.id ? 'is-selected' : ''}`}
                                    onClick={() => setSelectedMachineId(machine.id)}
                                    onDoubleClick={() => handleSelectMachine(machine)}
                                >
                                    <div className="machine-card__row machine-card__row--top">
                                        <span className="machine-card__id">#{machine.id}</span>
                                        <span className="machine-card__name">{machine.description || 'Máquina sem descrição'}</span>
                                    </div>
                                    <div className="machine-card__row machine-card__row--middle">
                                        <div className="machine-card__badges">
                                            <span className="machine-badge machine-badge--status">
                                                {machine.status || 'livre'}
                                            </span>
                                            <span className={`machine-badge ${machine.available ? 'machine-badge--available' : 'machine-badge--unavailable'}`}>
                                                {machine.available ? 'Disponível' : 'Indisponível'}
                                            </span>
                                        </div>
                                        <div className="machine-card__details">
                                            <div><strong>30 min:</strong> R$ {Number(machine.price30 || 0).toFixed(2)}</div>
                                            <div><strong>60 min:</strong> R$ {Number(machine.price60 || 0).toFixed(2)}</div>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>

                <section className={`machine-form-panel${isEditing ? ' editing' : ''}`}>
                    <div>
                        <h3>Dados da máquina</h3>
                        <p>
                            Campos destacados para facilitar a leitura e edição do cadastro.
                        </p>
                    </div>

                    <div className="machine-form-grid">
                        <div className="machine-form-group">
                            <label>ID da máquina</label>
                            <input
                                type="number"
                                value={form.id}
                                disabled
                                placeholder="Número gerado automaticamente"
                            />
                        </div>

                        <div className="machine-form-group">
                            <label>Status</label>
                            <select
                                value={form.available ? 'sim' : 'nao'}
                                onChange={e =>
                                    setForm({
                                        ...form,
                                        available: e.target.value === 'sim'
                                    })
                                }
                            >
                                <option value="sim">Disponível</option>
                                <option value="nao">Indisponível</option>
                            </select>
                        </div>

                        <div className="machine-form-group full-width">
                            <label>Descrição da máquina</label>
                            <input
                                placeholder="Ex: Máquina de VR 1"
                                value={form.description}
                                onChange={e =>
                                    setForm({ ...form, description: e.target.value })
                                }
                            />
                        </div>

                        <div className="machine-form-group">
                            <label>Valor 30 min</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0,00"
                                value={form.price30}
                                onChange={e => handleNumericChange('price30', e.target.value)}
                            />
                        </div>

                        <div className="machine-form-group">
                            <label>Valor 60 min</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0,00"
                                value={form.price60}
                                onChange={e => handleNumericChange('price60', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="machine-form-actions">
                        <button className="action-button--secondary" onClick={handleNew}>Nova</button>
                        <button
                            className={`action-button--success ${isSaving ? 'action-button--saving' : ''}`}
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button className="action-button--danger" onClick={handleCancel}>Cancelar</button>
                        <button className="action-button--ghost" disabled>Relatório</button>
                    </div>
                </section>
            </div>
        </div>
    )
}