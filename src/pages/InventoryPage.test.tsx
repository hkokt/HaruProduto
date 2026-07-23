import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  InventoryAvailability,
  InventoryLot,
  InventoryMovement,
  InventoryProductSummary,
  OffsetPage,
  ProductSearchResult,
} from '../api/types'
import { AuthContext, type AuthContextValue } from '../auth/AuthContext'
import { InventoryPage } from './InventoryPage'

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

const availability: InventoryAvailability = {
  productId: 42,
  productName: 'Café premium',
  productSku: 'CAFE-001',
  measurementUnit: 'KILOGRAM',
  availableQuantity: 120.5,
  referenceDate: '2026-07-23',
}

const lot: InventoryLot = {
  id: 7,
  productId: 42,
  productName: 'Café premium',
  productSku: 'CAFE-001',
  lotNumber: 'LOTE-2026-001',
  manufactureDate: '2026-07-01',
  expirationDate: '2027-07-01',
  initialQuantity: 150,
  availableQuantity: 120.5,
  unitCost: 18.75,
  status: 'AVAILABLE',
  createdAt: '2026-07-01T12:00:00Z',
  updatedAt: '2026-07-23T12:00:00Z',
  version: 1,
}

const movement: InventoryMovement = {
  id: 19,
  inventoryLotId: lot.id,
  lotNumber: lot.lotNumber,
  productId: 42,
  type: 'PRODUCTION_CONSUMPTION',
  quantity: 29.5,
  resultingQuantity: 120.5,
  referenceType: 'OP',
  referenceId: 9001,
  description: 'Consumo da ordem de produção',
  occurredAt: '2026-07-23T12:00:00Z',
  createdBy: 'operator@haru.local',
}

const productSearchResult: ProductSearchResult = {
  id: 42,
  name: 'Café premium',
  sku: 'CAFE-001',
  type: 'RAW_MATERIAL',
  defaultMeasurementUnit: 'KILOGRAM',
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

const inventorySummary: InventoryProductSummary = {
  productId: 42,
  productName: 'Café premium',
  productSku: 'CAFE-001',
  defaultMeasurementUnit: 'KILOGRAM',
  active: true,
  availableQuantity: 120.5,
  lotCount: 1,
  referenceDate: '2026-07-23',
}

function pageOf<T>(content: T[], overrides: Partial<OffsetPage<T>> = {}): OffsetPage<T> {
  return {
    content,
    offset: 0,
    limit: 20,
    totalElements: content.length,
    hasPrevious: false,
    hasNext: false,
    ...overrides,
  }
}

interface InventoryHarnessProps {
  children: ReactNode
  auth?: AuthContextValue
}

function InventoryHarness({ children, auth = adminAuth }: InventoryHarnessProps) {
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

function renderInventory(auth: AuthContextValue) {
  return render(<InventoryPage />, {
    wrapper: ({ children }) => <InventoryHarness auth={auth}>{children}</InventoryHarness>,
  })
}

async function searchForProduct(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByRole('searchbox', { name: 'Localizar produto no estoque' }), 'Café')
  await user.click(screen.getByRole('button', { name: 'Consultar' }))
  await user.click(await screen.findByRole('button', { name: /Café premium/ }))
  await screen.findByText('Disponibilidade atual')
}

beforeEach(() => {
  apiRequestMock.mockReset()
  getAccessToken.mockClear()
  apiRequestMock.mockImplementation((path: string) => {
    if (path.startsWith('/api/inventory/products/search?')) {
      return Promise.resolve(pageOf([inventorySummary]))
    }
    if (path === '/api/products/search?q=Caf%C3%A9&offset=0&limit=20') {
      return Promise.resolve(productSearchPage)
    }
    if (path === '/api/inventory/products/42/availability') {
      return Promise.resolve(availability)
    }
    if (path === '/api/inventory/products/42/lots?offset=0&limit=20') {
      return Promise.resolve(pageOf([lot]))
    }
    if (path === '/api/inventory/products/42/movements?offset=0&limit=20') {
      return Promise.resolve(pageOf([movement]))
    }
    return Promise.reject(new Error(`Unexpected API request: ${path}`))
  })
})

describe('InventoryPage', () => {
  it('loads availability, lots, and movements for a read-only customer', async () => {
    const user = userEvent.setup()
    renderInventory(customerAuth)

    await searchForProduct(user)

    expect(screen.getByText('CAFE-001')).toBeInTheDocument()
    expect(screen.getByText('LOTE-2026-001')).toBeInTheDocument()
    expect(screen.getByText('Disponível', { selector: '.status' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lotes (1)' })).toHaveClass('active')
    expect(screen.queryByRole('button', { name: /Entrada de lote/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar consumo' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ajustar' })).not.toBeInTheDocument()
    expect(apiRequestMock).not.toHaveBeenCalledWith(
      '/api/inventory/products/42/movements?offset=0&limit=20',
      getAccessToken,
    )

    await user.click(screen.getByRole('button', { name: /^Movimentações/ }))

    expect(screen.getByText('Consumo de produção')).toBeInTheDocument()
    expect(screen.getByText('OP #9001')).toBeInTheDocument()
    expect(screen.getByText('operator@haru.local')).toBeInTheDocument()

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith(
        '/api/inventory/products/42/availability',
        getAccessToken,
      )
      expect(apiRequestMock).toHaveBeenCalledWith(
        '/api/inventory/products/42/lots?offset=0&limit=20',
        getAccessToken,
      )
      expect(apiRequestMock).toHaveBeenCalledWith(
        '/api/inventory/products/42/movements?offset=0&limit=20',
        getAccessToken,
      )
    })
  })

  it('exposes inventory management actions to administrators', async () => {
    const user = userEvent.setup()
    renderInventory(adminAuth)

    expect(screen.getByRole('button', { name: /Entrada de lote/ })).toBeInTheDocument()

    await searchForProduct(user)

    expect(screen.getByRole('button', { name: 'Registrar consumo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ajustar' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Ajustar' }))

    expect(screen.getByRole('heading', { name: 'Ajustar estoque' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Registrar ajuste/ })).toBeInTheDocument()
  })

  it('requires a real product selection and creates a lot with its internal ID', async () => {
    const user = userEvent.setup()
    apiRequestMock.mockImplementation((path: string, _getToken: unknown, options?: RequestInit) => {
      if (path.startsWith('/api/inventory/products/search?')) {
        return Promise.resolve(pageOf([inventorySummary]))
      }
      if (path === '/api/products/search?q=Caf%C3%A9&offset=0&limit=20') {
        return Promise.resolve(productSearchPage)
      }
      if (path === '/api/inventory/lots' && options?.method === 'POST') {
        return Promise.resolve(lot)
      }
      if (path === '/api/inventory/products/42/availability') return Promise.resolve(availability)
      if (path === '/api/inventory/products/42/lots?offset=0&limit=20') {
        return Promise.resolve(pageOf([lot]))
      }
      if (path === '/api/inventory/products/42/movements?offset=0&limit=20') {
        return Promise.resolve(pageOf([movement]))
      }
      return Promise.reject(new Error(`Unexpected API request: ${path}`))
    })

    renderInventory(adminAuth)
    await user.click(screen.getByRole('button', { name: /Entrada de lote/ }))

    const submitButton = screen.getByRole('button', { name: 'Registrar lote' })
    const productInput = screen.getByRole('combobox', { name: 'Produto' })
    await user.type(productInput, 'Café')

    expect(submitButton).toBeDisabled()

    await user.click(await screen.findByRole('option', { name: /Café premium/ }))
    expect(submitButton).toBeEnabled()
    expect(screen.queryByRole('spinbutton', { name: 'ID do produto' })).not.toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: /Número do lote/ }), 'LOTE-2026-001')
    await user.type(screen.getByRole('spinbutton', { name: /Quantidade inicial/ }), '150')
    await user.type(screen.getByRole('spinbutton', { name: /Custo unitário/ }), '18.75')
    await user.click(submitButton)

    await screen.findByText('Lote LOTE-2026-001 registrado com sucesso.')
    expect(screen.getByRole('button', { name: /Café premium/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    expect(apiRequestMock).toHaveBeenCalledWith('/api/inventory/lots', getAccessToken, {
      method: 'POST',
      body: JSON.stringify({
        productId: 42,
        lotNumber: 'LOTE-2026-001',
        manufactureDate: null,
        expirationDate: null,
        initialQuantity: 150,
        unitCost: 18.75,
      }),
    })
  })

  it('preselects the current product in the lot entry and allows changing it', async () => {
    const user = userEvent.setup()
    renderInventory(adminAuth)

    await searchForProduct(user)
    await user.click(screen.getByRole('button', { name: /Entrada de lote/ }))

    expect(screen.getAllByLabelText('Produto selecionado: Café premium')).toHaveLength(1)
    expect(screen.queryByRole('combobox', { name: 'Produto' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Trocar produto' }))

    expect(screen.getByRole('combobox', { name: 'Produto' })).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Registrar lote' })).toBeDisabled()
  })

  it('keeps general, lot, and movement offsets independent', async () => {
    const user = userEvent.setup()
    apiRequestMock.mockImplementation((path: string) => {
      if (path.startsWith('/api/inventory/products/search?')) {
        return Promise.resolve(pageOf([inventorySummary], { totalElements: 45, hasNext: true }))
      }
      if (path === '/api/inventory/products/42/availability') return Promise.resolve(availability)
      if (path === '/api/inventory/products/42/lots?offset=0&limit=20') {
        return Promise.resolve(pageOf([lot], { totalElements: 30, hasNext: true }))
      }
      if (path === '/api/inventory/products/42/lots?offset=20&limit=20') {
        return Promise.resolve(pageOf([lot], { offset: 20, totalElements: 30, hasPrevious: true }))
      }
      if (path === '/api/inventory/products/42/movements?offset=0&limit=20') {
        return Promise.resolve(pageOf([movement]))
      }
      return Promise.reject(new Error(`Unexpected API request: ${path}`))
    })

    renderInventory(customerAuth)
    expect(await screen.findByText('45 produtos encontrados')).toBeInTheDocument()

    const globalNext = screen.getByRole('button', { name: 'Ir para a próxima página' })
    await user.click(globalNext)
    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith(
        '/api/inventory/products/search?q=&offset=20&limit=20',
        getAccessToken,
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      )
    })

    await user.click(screen.getByRole('button', { name: /Café premium/ }))
    await screen.findByText('Disponibilidade atual')

    const nextButtons = screen.getAllByRole('button', { name: 'Ir para a próxima página' })
    await user.click(nextButtons.at(-1)!)
    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith(
        '/api/inventory/products/42/lots?offset=20&limit=20',
        getAccessToken,
      )
    })

    await user.click(screen.getByRole('button', { name: /^Movimentações/ }))
    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith(
        '/api/inventory/products/42/movements?offset=0&limit=20',
        getAccessToken,
      )
    })
  })
})
