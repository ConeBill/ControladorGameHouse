import '../styles/machine-card.css'

export default function MachineCardPlaceholder({ name }) {
  return (
    <div className="machine-card placeholder">
      <h3>{name}</h3>
      <div className="timer">00:00</div>
      <div className="fake-status" />
    </div>
  )
}