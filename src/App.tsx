import { BrowserRouter, Navigate, NavLink, Route, Routes } from 'react-router-dom'
import {
  Boxes,
  CircleUserRound,
  Factory,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  PackagePlus,
  Settings,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import { useState } from 'react'
import './App.css'
import { useAuth } from './auth/AuthContext'
import { DashboardPage } from './pages/DashboardPage'
import { InventoryPage } from './pages/InventoryPage'
import { ProductsPage } from './pages/ProductsPage'
import { ProductionPage } from './pages/ProductionPage'

function LoginPage() {
  const auth = useAuth()
  if (auth.initializing) return <FullPageLoading />
  if (auth.authenticated) return <Navigate to="/app" replace />

  return (
    <main className="auth-page">
      <section className="auth-story">
        <div className="brand brand-light">
          <span className="brand-mark">H</span>
          <span>Haru</span>
        </div>
        <div className="auth-copy">
          <span className="eyebrow eyebrow-light">
            <Sparkles size={15} /> Produção mais simples
          </span>
          <h1>Da matéria-prima ao produto final, tudo sob controle.</h1>
          <p>Acompanhe composições, lotes, estoque e ordens de produção em um só lugar.</p>
        </div>
        <div className="auth-metric">
          <ShieldCheck size={20} />
          <div>
            <strong>Acesso protegido</strong>
            <span>Autenticação segura pelo Keycloak</span>
          </div>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <div className="mobile-brand brand">
            <span className="brand-mark">H</span>
            <span>Haru</span>
          </div>
          <div className="auth-heading">
            <span className="eyebrow">Bem-vindo</span>
            <h2>Acesse sua conta</h2>
            <p>Você será direcionado ao ambiente seguro de autenticação.</p>
          </div>
          {auth.error && <div className="alert alert-error">{auth.error}</div>}
          <div className="form-stack">
            <button className="button button-primary button-full" onClick={() => void auth.login()}>
              Entrar com Keycloak
            </button>
            <button
              className="button button-secondary button-full"
              onClick={() => void auth.register()}
            >
              Criar uma conta
            </button>
          </div>
          <p className="auth-note">
            As credenciais são processadas pelo Keycloak e nunca ficam armazenadas nesta aplicação.
          </p>
        </div>
      </section>
    </main>
  )
}

function ProtectedApp() {
  const auth = useAuth()
  if (auth.initializing) return <FullPageLoading />
  if (!auth.authenticated) return <Navigate to="/login" replace />
  return <AppShell />
}

function FullPageLoading() {
  return (
    <div className="full-page-loading">
      <LoaderCircle className="spin" size={30} />
      <span>Conectando ao ambiente Haru…</span>
    </div>
  )
}

function AppShell() {
  const auth = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const initials = auth.displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
  const items = [
    { to: '/app', label: 'Visão geral', icon: LayoutDashboard, end: true },
    { to: '/app/products', label: 'Produtos', icon: Boxes },
    { to: '/app/inventory', label: 'Estoque', icon: PackagePlus },
    { to: '/app/production', label: 'Produção', icon: Factory },
  ]
  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-top">
          <div className="brand">
            <span className="brand-mark">H</span>
            <span>Haru</span>
          </div>
          <button className="icon-button mobile-only" onClick={() => setMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <nav className="nav-list">
          <span className="nav-label">Operação</span>
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setMenuOpen(false)}>
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
          <span className="nav-label nav-label-spaced">Sistema</span>
          <a href="#configuracoes">
            <Settings size={19} />
            Configurações
          </a>
        </nav>
        <div className="sidebar-profile">
          <CircleUserRound size={35} />
          <div>
            <strong>{auth.displayName}</strong>
            <span>{auth.isAdmin ? 'Administrador' : 'Consulta'}</span>
          </div>
          <button className="logout-button" onClick={() => void auth.logout()} aria-label="Sair">
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      {menuOpen && <button className="menu-backdrop" onClick={() => setMenuOpen(false)} />}
      <div className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-only" onClick={() => setMenuOpen(true)}>
            <Menu size={21} />
          </button>
          <div className="topbar-spacer" />
          <span className={`connection-status ${auth.roles.length ? 'online' : ''}`}>
            <i />
            {auth.roles.length ? 'Conectado' : 'Sem perfil de acesso'}
          </span>
          <button className="avatar" title={auth.username}>
            {initials || 'U'}
          </button>
        </header>
        <div className="page-container">
          <Routes>
            <Route index element={<DashboardPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="production" element={<ProductionPage />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/app/*" element={<ProtectedApp />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
