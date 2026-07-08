import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import MachineCard from './MachineCard'
import '../styles/control-machine-card.css'

export default function MachineDashboard() {
  const machines = useSelector(state => state.machines.list)

  const summary = useMemo(() => {
    return machines.reduce(
      (acc, machine) => {
        if (machine.status === 'em_uso' && machine.seconds <= 300) {
          acc.alert += 1
        }
        if (machine.status === 'em_uso') {
          acc.inUse += 1
        } else {
          acc.free += 1
        }
        return acc
      },
      { free: 0, inUse: 0, alert: 0 }
    )
  }, [machines])

  return (
    <section className="control-dashboard-panel" aria-label="Painel de controle">
      <div className="control-dashboard__header">
        <div>
          <p className="control-dashboard__eyebrow">Monitoramento ao vivo</p>
          <h2 className="control-dashboard__title">Painel de Controle</h2>
        </div>
        <div className="control-dashboard__summary">
          <span className="control-dashboard__summary-pill">{machines.length} máquinas</span>
          <span className="control-dashboard__summary-pill control-dashboard__summary-pill--free">{summary.free} livres</span>
          <span className="control-dashboard__summary-pill control-dashboard__summary-pill--in-use">{summary.inUse} em uso</span>
          {summary.alert > 0 && (
            <span className="control-dashboard__summary-pill control-dashboard__summary-pill--alert">
              {summary.alert} em alerta
            </span>
          )}
        </div>
      </div>

      <div className="control-dashboard__grid">
        {machines.map(machine => (
          <MachineCard
            key={machine.id}
            machine={machine}
            isAlert={machine.status === 'em_uso' && machine.seconds <= 300}
          />
        ))}
      </div>
    </section>
  )
}
