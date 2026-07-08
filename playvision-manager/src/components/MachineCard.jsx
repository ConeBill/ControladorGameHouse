import { useMemo, useState } from 'react'
import { useDispatch } from 'react-redux'
import { addMachineTime, resetMachine, persistMachineTime, updatePlaySession } from '../app/slices/machineSlice'
import { calculateSessionEstimate } from '../utils/sessionPricing'

export default function MachineCard({ machine, isAlert }) {
    const dispatch = useDispatch()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [extraMinutes, setExtraMinutes] = useState(30)

    const isActiveSession = machine.status === 'em_uso' && machine.seconds > 0
    const isBlocked = Boolean(machine.sessionExpired)
    const playerName = machine.playerName || 'Jogador em uso'

    const formattedTime = useMemo(() => formatTime(machine.seconds), [machine.seconds])
    const estimatedCost = useMemo(() => calculateEstimatedCost(extraMinutes, machine.price30), [extraMinutes, machine.price30])

    function formatTime(seconds) {
        const totalSeconds = Math.max(seconds, 0)
        const hours = Math.floor(totalSeconds / 3600)
        const minutes = Math.floor((totalSeconds % 3600) / 60)
        const secs = totalSeconds % 60

        return [hours, minutes, secs]
            .map(value => value.toString().padStart(2, '0'))
            .join(':')
    }

    function calculateEstimatedCost(minutes, basePrice) {
        const extraBlocks = Math.max(Math.ceil(Number(minutes || 0) / 30), 0)
        return (extraBlocks * Number(basePrice || 0)).toFixed(2)
    }

    function openModal() {
        if (!isActiveSession) return

        setExtraMinutes(30)
        setIsModalOpen(true)
    }

    function closeModal() {
        setIsModalOpen(false)
    }

    function handleAddTime() {
        const addedMinutes = Number(extraMinutes)

        if (!addedMinutes || addedMinutes <= 0) return

        const addedSeconds = addedMinutes * 60
        const addedPaidAmount = calculateSessionEstimate(addedMinutes, machine)

        dispatch(addMachineTime({
            id: machine.id,
            secondsToAdd: addedSeconds,
            playedMinutes: addedMinutes,
            paidMinutes: addedMinutes,
            paidAmount: addedPaidAmount
        }))

        const nextPlayedMinutes = Number(machine.sessionPlayedMinutes || 0) + addedMinutes
        const nextPaidMinutes = Number(machine.sessionPaidMinutes || 0) + addedMinutes
        const nextPaidAmount = Number(machine.sessionPaidAmount || 0) + addedPaidAmount

        dispatch(persistMachineTime({
            ...machine,
            seconds: machine.seconds + addedSeconds,
            status: 'em_uso',
            available: false,
            playerName: machine.playerName,
            sessionPlayedMinutes: nextPlayedMinutes,
            sessionPaidMinutes: nextPaidMinutes,
            sessionPaidAmount: nextPaidAmount
        }))

        if (machine.sessionId) {
            dispatch(updatePlaySession({
                id: machine.sessionId,
                played_minutes: nextPlayedMinutes,
                paid_minutes: nextPaidMinutes,
                paid_amount: nextPaidAmount,
                status: 'em_andamento'
            }))
        }

        closeModal()
    }

    function handleEndSession() {
        const finalPlayedMinutes = Number(machine.sessionPlayedMinutes || 0)
        const finalPaidMinutes = Number(machine.sessionPaidMinutes || 0)
        const finalPaidAmount = Number(machine.sessionPaidAmount || 0)

        dispatch(resetMachine(machine.id))
        dispatch(persistMachineTime({
            ...machine,
            seconds: 0,
            status: 'livre',
            available: true,
            playerName: machine.playerName,
            sessionPlayedMinutes: 0,
            sessionPaidMinutes: 0,
            sessionPaidAmount: 0
        }))

        if (machine.sessionId) {
            dispatch(updatePlaySession({
                id: machine.sessionId,
                ended_at: new Date().toISOString(),
                played_minutes: finalPlayedMinutes,
                paid_minutes: finalPaidMinutes,
                paid_amount: finalPaidAmount,
                status: 'encerrada'
            }))
        }

        closeModal()
    }

    return (
        <article className={`control-machine-card ${isActiveSession ? 'control-machine-card--active' : ''} ${isAlert ? 'control-machine-card--alert' : ''} ${isBlocked ? 'control-machine-card--blocked' : ''}`}>
            <div className="control-machine-card__top">
                <div>
                    <p className="control-machine-card__id">#{machine.id}</p>
                    <h3 className="control-machine-card__name">{machine.description}</h3>
                </div>

                <span className={`control-machine-card__status ${machine.status === 'em_uso' ? 'status-active' : machine.status === 'bloqueada' || isBlocked ? 'status-blocked' : 'status-idle'}`}>
                    {machine.status === 'em_uso' ? 'Em uso' : machine.status === 'bloqueada' || isBlocked ? 'Bloqueada' : 'Livre'}
                </span>
            </div>

            {(isActiveSession || isBlocked) && (
                <div className="control-machine-card__time-block">
                    <p className="control-machine-card__label">{isBlocked ? 'Status' : 'Tempo restante'}</p>
                    <p className="control-machine-card__timer">{isBlocked ? 'Aguardando silenciar' : formattedTime}</p>
                </div>
            )}

            <div className="control-machine-card__footer">
                <div className="control-machine-card__price">
                    <span className="control-machine-card__price-label">Preço 30 min</span>
                    <strong>R$ {Number(machine.price30 || 0).toFixed(2)}</strong>
                </div>

                <button
                    type="button"
                    className="control-machine-card__action"
                    onClick={openModal}
                    disabled={!isActiveSession}
                >
                    {isActiveSession ? 'Gerenciar sessão' : 'Sem sessão ativa'}
                </button>
            </div>

            {isModalOpen && (
                <div className="control-modal-overlay" onClick={closeModal}>
                    <div
                        className="control-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="control-modal-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="control-modal__header">
                            <div>
                                <p className="control-modal__eyebrow">Sessão em andamento</p>
                                <h2 id="control-modal-title" className="control-modal__title">{machine.description}</h2>
                            </div>
                            <span className="control-modal__session-badge">#{machine.id}</span>
                        </div>

                        <div className="control-modal__info-grid">
                            <div className="control-modal__info-card">
                                <span className="control-modal__info-label">Jogador</span>
                                <strong className="control-modal__info-value">{playerName}</strong>
                            </div>

                            <div className="control-modal__info-card">
                                <span className="control-modal__info-label">Tempo restante</span>
                                <strong className="control-modal__info-value">{formattedTime}</strong>
                            </div>
                        </div>

                        <div className="control-modal__add-time">
                            <label htmlFor={`extra-time-${machine.id}`} className="control-modal__label">
                                Adicionar tempo (minutos)
                            </label>

                            <div className="control-modal__input-row">
                                <input
                                    id={`extra-time-${machine.id}`}
                                    type="number"
                                    min="5"
                                    step="5"
                                    value={extraMinutes}
                                    onChange={(event) => setExtraMinutes(event.target.value)}
                                />

                                <div className="control-modal__cost">
                                    <span className="control-modal__cost-label">Custo estimado</span>
                                    <strong className="control-modal__cost-value">R$ {estimatedCost}</strong>
                                </div>
                            </div>
                        </div>

                        <div className="control-modal__actions">
                            <button
                                type="button"
                                className="control-modal__button control-modal__button--primary"
                                onClick={handleAddTime}
                                disabled={Number(extraMinutes) <= 0}
                            >
                                Adicionar tempo
                            </button>

                            <button
                                type="button"
                                className="control-modal__button control-modal__button--danger"
                                onClick={handleEndSession}
                            >
                                Encerrar e zerar
                            </button>

                            <button
                                type="button"
                                className="control-modal__button control-modal__button--secondary"
                                onClick={closeModal}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </article>
    )
}
