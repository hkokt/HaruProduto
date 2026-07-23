import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { OffsetPage, Product, ProductCompositionTree, ProductSearchResult } from '../api/types'
import { AuthContext, type AuthContextValue } from '../auth/AuthContext'
import { ProductsPage } from './ProductsPage'

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

const product: Product = {
  id: 42,
  name: 'Café premium',
  description: 'Café torrado em grãos',
  sku: 'CAFE-001',
  type: 'FINISHED_PRODUCT',
  defaultMeasurementUnit: 'PACKAGE',
  active: true,
  createdAt: '2026-07-23T10:00:00Z',
  updatedAt: '2026-07-23T10:00:00Z',
  version: 3,
  components: [],
}

const searchPage: OffsetPage<ProductSearchResult> = {
  content: [
    {
      id: product.id,
      name: product.name,
      sku: product.sku,
      type: product.type,
      defaultMeasurementUnit: product.defaultMeasurementUnit,
      active: product.active,
      score: 1,
    },
  ],
  offset: 0,
  limit: 20,
  totalElements: 1,
  hasPrevious: false,
  hasNext: false,
}

const composition: ProductCompositionTree = {
  productId: product.id,
  name: product.name,
  sku: product.sku,
  type: product.type,
  defaultMeasurementUnit: product.defaultMeasurementUnit,
  components: [
    {
      compositionId: 7,
      productId: 11,
      name: 'Grãos de café',
      sku: 'GRAO-001',
      quantity: 0.5,
      measurementUnit: 'KILOGRAM',
      components: [],
    },
  ],
}

interface ProductsHarnessProps {
  children: ReactNode
  auth?: AuthContextValue
}

function ProductsHarness({ children, auth = adminAuth }: ProductsHarnessProps) {
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

beforeEach(() => {
  apiRequestMock.mockReset()
  apiRequestMock.mockImplementation((path: string) => {
    if (path.startsWith('/api/products/search?')) return Promise.resolve(searchPage)
    if (path === '/api/products/42/composition') return Promise.resolve(composition)
    if (path === '/api/products/42') return Promise.resolve(product)
    return Promise.reject(new Error(`Unexpected API request: ${path}`))
  })
})

describe('ProductsPage', () => {
  it('searches by text and loads the selected product with its composition', async () => {
    render(<ProductsPage />, { wrapper: ProductsHarness })

    const searchInput = screen.getByRole('searchbox', { name: 'Localizar produto' })
    fireEvent.change(searchInput, { target: { value: 'Café' } })
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }))

    expect(await screen.findByText('1 produto encontrado')).toBeInTheDocument()

    const resultButton = screen.getByRole('button', { name: /Café premium/ })
    expect(resultButton).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(resultButton)

    expect(
      await screen.findByRole('heading', {
        name: 'Café premium',
        level: 3,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Café torrado em grãos')).toBeInTheDocument()
    expect(await screen.findByText('Grãos de café')).toBeInTheDocument()
    expect(resultButton).toHaveAttribute('aria-pressed', 'true')

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith(
        expect.stringMatching(/^\/api\/products\/search\?q=Caf%C3%A9&offset=0&limit=20$/),
        getAccessToken,
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      )
      expect(apiRequestMock).toHaveBeenCalledWith('/api/products/42', getAccessToken)
      expect(apiRequestMock).toHaveBeenCalledWith('/api/products/42/composition', getAccessToken)
    })
  })

  it('pages search results through backend offsets and resets the offset when limit changes', async () => {
    const pagedSearch = {
      ...searchPage,
      totalElements: 45,
      hasNext: true,
    }
    apiRequestMock.mockImplementation((path: string) => {
      if (path.startsWith('/api/products/search?')) {
        const searchParams = new URL(path, 'http://localhost').searchParams
        const offset = Number(searchParams.get('offset'))
        const limit = Number(searchParams.get('limit'))

        return Promise.resolve({
          ...pagedSearch,
          offset,
          limit,
          hasPrevious: offset > 0,
          hasNext: offset + limit < pagedSearch.totalElements,
        })
      }
      return Promise.reject(new Error(`Unexpected API request: ${path}`))
    })

    render(<ProductsPage />, { wrapper: ProductsHarness })

    expect(await screen.findByText('45 produtos encontrados')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ir para a próxima página' }))

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith(
        '/api/products/search?q=&offset=20&limit=20',
        getAccessToken,
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      )
    })

    expect(await screen.findByText('21–40 de 45 · Página 2 de 3')).toBeInTheDocument()
    fireEvent.change(
      screen.getByRole('combobox', { name: 'Itens por página — Paginação de produtos' }),
      { target: { value: '10' } },
    )

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith(
        '/api/products/search?q=&offset=0&limit=10',
        getAccessToken,
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      )
    })
  })

  it('keeps product management actions hidden from read-only users', () => {
    const customerAuth: AuthContextValue = {
      ...adminAuth,
      username: 'carla.customer',
      displayName: 'Carla Lima',
      roles: ['customer'],
      isAdmin: false,
    }

    render(<ProductsPage />, {
      wrapper: ({ children }) => <ProductsHarness auth={customerAuth}>{children}</ProductsHarness>,
    })

    expect(screen.queryByRole('button', { name: /Novo produto/ })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Produtos' })).toBeInTheDocument()
  })

  it('creates a product without asking for or sending a SKU', async () => {
    apiRequestMock.mockImplementation((path: string, _getToken: unknown, options?: RequestInit) => {
      if (path === '/api/products' && options?.method === 'POST') return Promise.resolve(product)
      if (path.startsWith('/api/products/search?')) return Promise.resolve(searchPage)
      if (path === '/api/products/42/composition') return Promise.resolve(composition)
      if (path === '/api/products/42') return Promise.resolve(product)
      return Promise.reject(new Error(`Unexpected API request: ${path}`))
    })

    render(<ProductsPage />, { wrapper: ProductsHarness })

    fireEvent.click(screen.getByRole('button', { name: /Novo produto/ }))

    expect(screen.getByText(/O SKU será gerado automaticamente ao salvar/)).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'SKU' })).not.toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox', { name: /Nome/ }), {
      target: { value: 'Café premium' },
    })
    fireEvent.change(screen.getByRole('combobox', { name: /Tipo/ }), {
      target: { value: 'FINISHED_PRODUCT' },
    })
    fireEvent.change(screen.getByRole('combobox', { name: /Unidade padrão/ }), {
      target: { value: 'PACKAGE' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith('/api/products', getAccessToken, {
        method: 'POST',
        body: JSON.stringify({
          name: 'Café premium',
          description: null,
          type: 'FINISHED_PRODUCT',
          defaultMeasurementUnit: 'PACKAGE',
          active: true,
        }),
      })
    })
  })

  it('shows the generated SKU as read-only and excludes it from updates', async () => {
    apiRequestMock.mockImplementation((path: string, _getToken: unknown, options?: RequestInit) => {
      if (path === '/api/products/42' && options?.method === 'PUT') {
        return Promise.resolve({ ...product, name: 'Café premium atualizado' })
      }
      if (path.startsWith('/api/products/search?')) return Promise.resolve(searchPage)
      if (path === '/api/products/42/composition') return Promise.resolve(composition)
      if (path === '/api/products/42') return Promise.resolve(product)
      return Promise.reject(new Error(`Unexpected API request: ${path}`))
    })

    render(<ProductsPage />, { wrapper: ProductsHarness })

    const searchInput = screen.getByRole('searchbox', { name: 'Localizar produto' })
    fireEvent.change(searchInput, { target: { value: 'Café' } })
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }))
    fireEvent.click(await screen.findByRole('button', { name: /Café premium/ }))
    fireEvent.click(await screen.findByRole('button', { name: /Editar/ }))

    const skuInput = screen.getByRole('textbox', { name: 'SKU' })
    expect(skuInput).toHaveValue('CAFE-001')
    expect(skuInput).toHaveAttribute('readonly')

    fireEvent.change(screen.getByRole('textbox', { name: /Nome/ }), {
      target: { value: 'Café premium atualizado' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith('/api/products/42', getAccessToken, {
        method: 'PUT',
        body: JSON.stringify({
          name: 'Café premium atualizado',
          description: 'Café torrado em grãos',
          type: 'FINISHED_PRODUCT',
          defaultMeasurementUnit: 'PACKAGE',
          active: true,
        }),
      })
    })
  })
})
