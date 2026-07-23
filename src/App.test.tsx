import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import { AuthContext } from './auth/AuthContext'
import type { AuthContextValue } from './auth/AuthContext'

vi.mock('./pages/DashboardPage', () => ({
  DashboardPage: () => <h1>Painel autenticado</h1>,
}))

vi.mock('./pages/ProductsPage', () => ({
  ProductsPage: () => <h1>Produtos</h1>,
}))

vi.mock('./pages/InventoryPage', () => ({
  InventoryPage: () => <h1>Estoque</h1>,
}))

vi.mock('./pages/ProductionPage', () => ({
  ProductionPage: () => <h1>Produção</h1>,
}))

function createAuth(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    authenticated: false,
    initializing: false,
    error: null,
    username: '',
    displayName: 'Usuário',
    roles: [],
    isAdmin: false,
    login: vi.fn().mockResolvedValue(undefined),
    register: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    getAccessToken: vi.fn().mockResolvedValue('access-token'),
    ...overrides,
  }
}

function renderApp(auth: AuthContextValue, initialPath: string) {
  window.history.pushState({}, '', initialPath)

  return render(
    <AuthContext.Provider value={auth}>
      <App />
    </AuthContext.Provider>,
  )
}

describe('App routing and authentication', () => {
  it('redirects an unauthenticated user from a protected route to login', async () => {
    renderApp(createAuth(), '/app/products')

    expect(await screen.findByRole('heading', { name: 'Acesse sua conta' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/login')
    expect(screen.queryByRole('heading', { name: 'Produtos' })).not.toBeInTheDocument()
  })

  it('delegates login and registration actions to the authentication context', async () => {
    const user = userEvent.setup()
    const auth = createAuth()
    renderApp(auth, '/login')

    await user.click(screen.getByRole('button', { name: 'Entrar com Keycloak' }))
    await user.click(screen.getByRole('button', { name: 'Criar uma conta' }))

    expect(auth.login).toHaveBeenCalledOnce()
    expect(auth.register).toHaveBeenCalledOnce()
  })

  it('redirects an authenticated user from login to the dashboard', async () => {
    const auth = createAuth({
      authenticated: true,
      username: 'ana.admin',
      displayName: 'Ana Souza',
      roles: ['admin'],
      isAdmin: true,
    })
    renderApp(auth, '/login')

    expect(await screen.findByRole('heading', { name: 'Painel autenticado' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/app')
    expect(screen.getByText('Ana Souza')).toBeInTheDocument()
    expect(screen.getByText('Administrador')).toBeInTheDocument()
    expect(screen.getByText('Conectado')).toBeInTheDocument()
  })
})
