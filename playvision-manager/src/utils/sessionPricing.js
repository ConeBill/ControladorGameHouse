export function calculateSessionEstimate(minutes, machine) {
  const totalMinutes = Number(minutes || 0)
  const price30 = Number(machine.price30 || 0)
  const price60 = Number(machine.price60 || 0)

  const fullHours = Math.floor(totalMinutes / 60)
  const remainder = totalMinutes % 60

  return fullHours * price60 + (remainder >= 30 ? price30 : 0)
}
