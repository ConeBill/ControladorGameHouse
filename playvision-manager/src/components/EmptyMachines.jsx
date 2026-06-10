import MachineCardPlaceholder from './MachineCardPlaceholder'

export default function EmptyMachines() {
  return (
    <div style={{ position: 'relative', paddingTop: 40 }}>
      {/* Aviso */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          textAlign: 'center',
          zIndex: 2
        }}
      >
        <h2>⚠ Nenhuma máquina cadastrada</h2>
        <p>
          Cadastre máquinas para começar a gerenciar sessões de jogo.
        </p>
      </div>

      {/* Fundo com exemplos */}
      <div
        style={{
          display: 'flex',
          gap: 20,
          flexWrap: 'wrap',
          marginTop: 40
        }}
      >
        <MachineCardPlaceholder name="VR Play" />
        <MachineCardPlaceholder name="PS5" />
        <MachineCardPlaceholder name="Fliperama" />
        <MachineCardPlaceholder name="Simulador" />
      </div>
    </div>
  )
}