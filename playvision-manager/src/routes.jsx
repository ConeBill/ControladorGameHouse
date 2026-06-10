import { HashRouter, Routes, Route } from 'react-router-dom'
import MainLayout from './layout/MainLayout'
import Dashboard from './pages/Dashboard'
import MachineRegister from './pages/MachineRegister'
import ClientRegister from './pages/ClientRegister'
import PlayMachine from './pages/PlayMachine'
import SettingsPage from './pages/SettingsPage'
import ControlPanelPage from './pages/ControlPanelPage'
import StockPage from './pages/StockPage'
import FoodPage from './pages/FoodPage'
import Reports from './pages/Reports'
import ProtectedRoute from './components/ProtectedRoute'

export default function AppRoutes() {
  return (
    <HashRouter>
      <Routes>

        {/* ROTAS COM LAYOUT */}
        <Route element={<MainLayout />}>
          <Route path="/clients" element={<ClientRegister />} />
          <Route path="/play" element={<PlayMachine />} />
          <Route path="/machines" element={<MachineRegister />} />
          <Route path="/food" element={<FoodPage />} />
          <Route path="/reports" element={
            <ProtectedRoute title="Relatórios">
              <Reports />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute title="Configurações">
              <SettingsPage />
            </ProtectedRoute>
          } />
          <Route path="/stock" element={
            <ProtectedRoute title="Estoque">
              <StockPage />
            </ProtectedRoute>
          } />
          <Route path="/control-panel" element={<ControlPanelPage />} />
          <Route path="/" element={<Dashboard />} />
        </Route>

      </Routes>
    </HashRouter>
  )
}