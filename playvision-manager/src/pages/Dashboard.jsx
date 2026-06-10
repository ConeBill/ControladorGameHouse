import { useSelector } from 'react-redux'
import Sidebar from '../components/Sidebar'
import MachineCard from '../components/MachineCard'
import EmptyMachines from '../components/EmptyMachines'

export default function Dashboard() {
    const machines = useSelector(state => state.machines.list)

    const hasMachines = machines.length > 0

    return (
        <div style={{ display: 'flex', height: '100vh' }}>

            <main style={{ flex: 1, padding: 20 }}>
                <h1>Painel de Controle</h1>

                {hasMachines ? (
                    <div>
                        <div>
                            {machines.map(machine => (
                                <MachineCard
                                    key={machine.id}
                                    machine={machine}
                                    name={machine.name}
                                    others={[machine.description,machine.price30,machine.price60]}
                                />
                            ))}
                        </div>
                    </div>
                ) : (
                    <EmptyMachines />
                )}
            </main>
        </div>
    )
}