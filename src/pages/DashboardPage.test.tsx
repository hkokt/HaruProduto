import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../auth/AuthContext'
import { DashboardPage } from './DashboardPage'

const adminAuth: AuthContextValue = {
  authenticated: true,
  initializing: false,
  error: null,
  username: 'ana.admin',
  displayName: 'Ana Souza',
  roles: ['admin'],
  isAdmin: true,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  getAccessToken: vi.fn(async () => 'access-token'),
}

interface DashboardHarnessProps {
  children: ReactNode
  auth?: AuthContextValue
}

function DashboardHarness({ children, auth = adminAuth }: DashboardHarnessProps) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>
        <MemoryRouter>{children}</MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('DashboardPage', () => {
  it('shows the authenticated profile, available modules, and backend health', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('healthy', {
        status: 200,
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    render(<DashboardPage />, { wrapper: DashboardHarness })

    expect(screen.getByRole('heading', { name: 'Olá, Ana' })).toBeInTheDocument()
    expect(screen.getByText('Administrador')).toBeInTheDocument()
    expect(screen.getByText('ana.admin')).toBeInTheDocument()
    expect(await screen.findByText('Disponível')).toBeInTheDocument()

    expect(screen.getByRole('link', { name: /Produtos/ })).toHaveAttribute('href', '/app/products')
    expect(screen.getByRole('link', { name: /Estoque/ })).toHaveAttribute('href', '/app/inventory')
    expect(screen.getByRole('link', { name: /Produção/ })).toHaveAttribute(
      'href',
      '/app/production',
    )
    expect(fetchMock).toHaveBeenCalledWith('/nginx-health')
  })

  it('reports an unavailable backend when the health endpoint fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(null, {
          status: 503,
        }),
      ),
    )

    render(<DashboardPage />, { wrapper: DashboardHarness })

    expect(screen.getByText('Verificando')).toBeInTheDocument()
    expect(await screen.findByText('Indisponível')).toBeInTheDocument()
  })
})
