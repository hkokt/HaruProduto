import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  OffsetPage,
  ProductCompositionTree,
  ProductSearchResult,
  ProductionOrder,
  ProductionResult,
} from '../api/types'
import { AuthContext, type AuthContextValue } from '../auth/AuthContext'
import { ProductionPage } from './ProductionPage'

const apiRequestMock = vi.hoisted(() => vi.fn())

vi.mock('../api/client', () => ({
  apiRequest: apiRequestMock,
  jsonBody: (value: unknown) => JSON.stringify(value),
}))

const getAccessToken = vi.fn(async () => 'access-token')

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
  getAccessToken,
}

const customerAuth: AuthContextValue = {
  ...adminAuth,
  username: 'carla.customer',
  displayName: 'Carla Lima',
  roles: ['customer'],
  isAdmin: false,
}

const productionResult: ProductionResult = {
  order: {
    id: 88,
    productId: 42,
    productName: 'Café em cápsulas',
    productSku: 'CAFE-CAPS-001',
    quantityToProduce: 10,
    measurementUnit: 'BOX',
    status: 'CREATED',
    createdAt: '2026-07-23T12:00:00Z',
    startedAt: null,
    completedAt: null,
    version: 0,
  },
  producedLot: null,
  consumptions: [],
}

const orderSearchPage: OffsetPage<ProductionOrder> = {
  content: [productionResult.order],
  offset: 0,
  limit: 20,
  totalElements: 1,
  hasPrevious: false,
  hasNext: false,
}

const productSearchResult: ProductSearchResult = {
  id: 42,
  name: 'Café em cápsulas',
  sku: 'CAFE-CAPS-001',
  type: 'FINISHED_PRODUCT',
  defaultMeasurementUnit: 'BOX',
  active: true,
  score: 1,
}

const productSearchPage: OffsetPage<ProductSearchResult> = {
  content: [productSearchResult],
  offset: 0,
  limit: 20,
  totalElements: 1,
  hasPrevious: false,
  hasNext: false,
}

const composition: ProductCompositionTree = {
  productId: 42,
  name: 'Café em cápsulas',
  sku: 'CAFE-CAPS-001',
  type: 'FINISHED_PRODUCT',
  defaultMeasurementUnit: 'BOX',
  components: [
    {
      compositionId: 7,
      productId: 11,
      name: 'Café torrado',
      sku: 'CAFE-GRAO-001',
      quantity: 2,
      measurementUnit: 'KILOGRAM',
      components: [],
    },
  ],
}

interface ProductionHarnessProps {
  children: ReactNode
  auth?: AuthContextValue
}

function ProductionHarness({ children, auth = adminAuth }: ProductionHarnessProps) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
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

function renderProduction(auth: AuthContextValue) {
  return render(<ProductionPage />, {
    wrapper: ({ children }) => <ProductionHarness auth={auth}>{children}</ProductionHarness>,
  })
}

async function searchForOrder(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByRole('searchbox', { name: 'Localizar ordem' }), '88')
  await user.click(screen.getByRole('button', { name: 'Consultar' }))
  await user.click(await screen.findByRole('button', { name: /Ordem #88/ }))
  await screen.findByRole('heading', { name: 'Café em cápsulas', level: 3 })
  await screen.findByText('Café torrado')
}

beforeEach(() => {
  apiRequestMock.mockReset()
  getAccessToken.mockClear()
  apiRequestMock.mockImplementation((path: string) => {
    if (path.startsWith('/api/production-orders/search?')) return Promise.resolve(orderSearchPage)
    if (path === '/api/production-orders/88') return Promise.resolve(productionResult)
    if (path === '/api/products/42/composition') return Promise.resolve(composition)
    return Promise.reject(new Error(`Unexpected API request: ${path}`))
  })
})

describe('ProductionPage', () => {
  it('loads an order and its planned composition for a read-only customer', async () => {
    const user = userEvent.setup()
    renderProduction(customerAuth)

    await searchForOrder(user)

    expect(screen.getByText('CAFE-CAPS-001 · 10 Caixa')).toBeInTheDocument()
    expect(screen.getAllByText('Criada', { selector: '.status' })).toHaveLength(2)
    expect(screen.getByText('CAFE-GRAO-001')).toBeInTheDocument()
    expect(screen.getByText('20 Quilograma')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Nova ordem/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Iniciar produção/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancelar ordem' })).not.toBeInTheDocument()

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith('/api/production-orders/88', getAccessToken)
      expect(apiRequestMock).toHaveBeenCalledWith('/api/products/42/composition', getAccessToken)
    })
  })

  it('lets an administrator review a safe cancellation confirmation', async () => {
    const user = userEvent.setup()
    renderProduction(adminAuth)

    expect(screen.getByRole('button', { name: /Nova ordem/ })).toBeInTheDocument()

    await searchForOrder(user)

    expect(screen.getByRole('button', { name: /Iniciar produção/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancelar ordem' }))

    expect(screen.getByRole('heading', { name: 'Cancelar ordem' })).toBeInTheDocument()
    expect(
      screen.getByText('A ordem #88 será encerrada sem produzir o lote final.'),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Cancelar ordem' })).toHaveLength(2)
    expect(apiRequestMock).toHaveBeenCalledTimes(4)
    expect(apiRequestMock.mock.calls.every(([, , options]) => options?.method === undefined)).toBe(
      true,
    )
  })

  it('uses backend offsets and applies the status filter before paging', async () => {
    const user = userEvent.setup()
    apiRequestMock.mockImplementation((path: string) => {
      if (path.startsWith('/api/production-orders/search?')) {
        return Promise.resolve({ ...orderSearchPage, totalElements: 45, hasNext: true })
      }
      return Promise.reject(new Error(`Unexpected API request: ${path}`))
    })

    renderProduction(customerAuth)

    expect(await screen.findByText('45 ordens encontradas')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ir para a próxima página' }))

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith(
        '/api/production-orders/search?q=&offset=20&limit=20',
        getAccessToken,
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      )
    })

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Situação da ordem' }),
      'IN_PROGRESS',
    )

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith(
        '/api/production-orders/search?q=&offset=0&limit=20&status=IN_PROGRESS',
        getAccessToken,
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      )
    })
  })

  it('creates an order with the internal ID of a selected product', async () => {
    const user = userEvent.setup()
    apiRequestMock.mockImplementation((path: string, _getToken: unknown, options?: RequestInit) => {
      if (path.startsWith('/api/production-orders/search?')) return Promise.resolve(orderSearchPage)
      if (path === '/api/products/search?q=Caf%C3%A9&offset=0&limit=20') {
        return Promise.resolve(productSearchPage)
      }
      if (path === '/api/production-orders' && options?.method === 'POST') {
        return Promise.resolve(productionResult.order)
      }
      if (path === '/api/production-orders/88') return Promise.resolve(productionResult)
      if (path === '/api/products/42/composition') return Promise.resolve(composition)
      return Promise.reject(new Error(`Unexpected API request: ${path}`))
    })

    renderProduction(adminAuth)
    await user.click(screen.getByRole('button', { name: /Nova ordem/ }))

    const submitButton = screen.getByRole('button', { name: 'Criar ordem' })
    expect(submitButton).toBeDisabled()

    await user.type(screen.getByRole('combobox', { name: 'Produto' }), 'Café')
    await user.click(await screen.findByRole('option', { name: /Café em cápsulas/ }))
    await user.type(screen.getByRole('spinbutton', { name: /Quantidade a produzir/ }), '10')
    await user.click(submitButton)

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith('/api/production-orders', getAccessToken, {
        method: 'POST',
        body: JSON.stringify({ productId: 42, quantityToProduce: 10 }),
      })
    })
    expect(screen.queryByRole('spinbutton', { name: 'ID do produto' })).not.toBeInTheDocument()
  })
})
