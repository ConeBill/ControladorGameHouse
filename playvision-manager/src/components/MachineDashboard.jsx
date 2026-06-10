import { useSelector } from 'react-redux'
import MachineCard from './MachineCard'

export default function MachineDashboard() {
  const machines = useSelector(state => state.machines.list)

  return (
    <section className="control-dashboard-panel" aria-label="Painel de controle">
      <div className="control-dashboard__header">
        <div>
          <p className="control-dashboard__eyebrow">Monitoramento ao vivo</p>
          <h2 className="control-dashboard__title">Painel de Controle</h2>
        </div>
        <div className="control-dashboard__summary">
          <span className="control-dashboard__summary-pill">{machines.length} máquinas</span>
        </div>
      </div>

      <div className="control-dashboard__grid">
        {machines.map(machine => (
          <MachineCard key={machine.id} machine={machine} />
        ))}
      </div>
    </section>
  )
}