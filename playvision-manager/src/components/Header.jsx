import logo from '../assets/header-play.png'
import '../styles/header.css'

export default function Header({ onToggleMenu }) {
  return (
    <header className="header">
      <img src={logo} alt="PlayVision Logo" className="header-logo" />
    </header>
  )
}