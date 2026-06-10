import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import '../styles/sidebar.css'
import logo from '../assets/logo-play-ret.png'

export default function Sidebar() {
    const [open, setOpen] = useState(false)

    // ESC fecha
    useEffect(() => {
        function handleEsc(e) {
            if (e.key === 'Escape') {
                setOpen(false)
                document.activeElement?.blur()
            }
        }
        window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [])

    return (
        <>
            {/* BOTÃO FIXO */}
            <button
                type='button'
                className={`hamburger-fixed ${open ? 'open' : ''}`}
                onClick={(e) => {
                    e.currentTarget.blur()
                    setOpen(!open)
                }}
            >
                <span />
                <span />
                <span />
            </button>

            {/* SIDEBAR */}
            <aside className={`sidebar ${open ? 'open' : ''}`}>
                <nav className="sidebar-menu">
                    <NavLink to="/clients" className="neon-button" data-tooltip="Cadastro de Clientes" onClick={() => setOpen(false)}>
                        Clientes
                    </NavLink>

                    <NavLink to="/play" className="neon-button" data-tooltip="Iniciar Sessão" onClick={() => setOpen(false)}>
                        Jogar
                    </NavLink>

                    <NavLink to="/machines" className="neon-button" data-tooltip="Cadastrar Máquinas" onClick={() => setOpen(false)}>
                        Máquinas
                    </NavLink>

                    <NavLink to="/food" className="neon-button" data-tooltip="Venda de Consumíveis" onClick={() => setOpen(false)}>
                        Comidas & Bebidas
                    </NavLink>

                    <NavLink to="/stock" className="neon-button" data-tooltip="Gerenciamento de Consumíveis" onClick={() => setOpen(false)}>
                        Estoque
                    </NavLink>

                    <NavLink to="/reports" className="neon-button" data-tooltip="Análise  de Rendimento" onClick={() => setOpen(false)}>
                        Relatórios
                    </NavLink>

                    <NavLink to="/settings" className="neon-button" data-tooltip="Backup" onClick={() => setOpen(false)}>
                        Configurações
                    </NavLink>

                    <NavLink to="/exit" className="neon-button" data-tooltip="Fechar o APP" onClick={() => setOpen(false)}>
                        Fechar
                    </NavLink>
                </nav>
                {/* LOGO NO RODAPÉ */}
                <div className="sidebar-logo">
                    <img src={logo} alt="PlayVision Logo" />
                </div>
            </aside>

            {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}
        </>
    )
}