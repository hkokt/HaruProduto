import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

import { ApiError, apiRequest } from './client'
import type { ApiProblem, OffsetPage, Product, ProductSearchResult } from './types'

const API_ORIGIN = 'http://localhost'

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
  version: 0,
  components: [],
}

const server = setupServer()

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  server.resetHandlers()
  vi.restoreAllMocks()
})

afterAll(() => {
  server.close()
})

describe('apiRequest', () => {
  it('returns JSON and sends the authentication and response headers', async () => {
    server.use(
      http.get(`${API_ORIGIN}/api/products/:productId`, ({ params, request }) => {
        expect(params.productId).toBe('42')
        expect(request.headers.get('authorization')).toBe('Bearer access-token')
        expect(request.headers.get('accept')).toBe('application/json, application/problem+json')
        expect(request.headers.has('content-type')).toBe(false)

        return HttpResponse.json(product)
      }),
    )

    const getToken = vi.fn().mockResolvedValue('access-token')

    const result = await apiRequest<Product>(`${API_ORIGIN}/api/products/42`, getToken)

    expect(result).toEqual(product)
    expect(getToken).toHaveBeenCalledOnce()
  })

  it('returns undefined for a successful response without content', async () => {
    server.use(
      http.delete(`${API_ORIGIN}/api/products/:productId`, () => {
        return new HttpResponse(null, { status: 204 })
      }),
    )

    const result = await apiRequest<void>(
      `${API_ORIGIN}/api/products/42`,
      async () => 'access-token',
      { method: 'DELETE' },
    )

    expect(result).toBeUndefined()
  })

  it('preserves encoded search query parameters', async () => {
    const response: OffsetPage<ProductSearchResult> = {
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
      offset: 40,
      limit: 20,
      totalElements: 1,
      hasPrevious: true,
      hasNext: false,
    }

    server.use(
      http.get(`${API_ORIGIN}/api/products/search`, ({ request }) => {
        const url = new URL(request.url)

        expect(url.searchParams.get('q')).toBe('Café premium')
        expect(url.searchParams.get('offset')).toBe('40')
        expect(url.searchParams.get('limit')).toBe('20')

        return HttpResponse.json(response)
      }),
    )

    const query = new URLSearchParams({
      q: 'Café premium',
      offset: '40',
      limit: '20',
    })

    const result = await apiRequest<OffsetPage<ProductSearchResult>>(
      `${API_ORIGIN}/api/products/search?${query}`,
      async () => 'access-token',
    )

    expect(result).toEqual(response)
  })

  it('throws ApiError with the Problem Details response', async () => {
    const problem: ApiProblem = {
      type: 'https://haru.local/problems/validation-failed',
      title: 'Validation failed',
      status: 422,
      detail: 'One or more fields are invalid.',
      instance: '/api/products',
      code: 'VALIDATION_FAILED',
      timestamp: '2026-07-23T10:00:00Z',
      errors: [{ field: 'name', message: 'Name is required.' }],
    }

    server.use(
      http.post(`${API_ORIGIN}/api/products`, async ({ request }) => {
        expect(request.headers.get('authorization')).toBe('Bearer access-token')
        expect(request.headers.get('content-type')).toBe('application/json')
        expect(await request.json()).toEqual({ name: '' })

        return HttpResponse.json(problem, {
          status: 422,
          headers: { 'Content-Type': 'application/problem+json' },
        })
      }),
    )

    let thrownError: unknown

    try {
      await apiRequest<Product>(`${API_ORIGIN}/api/products`, async () => 'access-token', {
        method: 'POST',
        body: JSON.stringify({ name: '' }),
      })
    } catch (error) {
      thrownError = error
    }

    expect(thrownError).toBeInstanceOf(ApiError)

    if (!(thrownError instanceof ApiError)) {
      throw new Error('Expected apiRequest to throw ApiError')
    }

    expect(thrownError.status).toBe(422)
    expect(thrownError.problem).toEqual(problem)
    expect(thrownError.message).toBe('Revise os campos informados e tente novamente.')
  })

  it('translates a network failure into a local backend connection error', async () => {
    server.use(
      http.get(`${API_ORIGIN}/api/unavailable`, () => {
        return HttpResponse.error()
      }),
    )

    await expect(
      apiRequest(`${API_ORIGIN}/api/unavailable`, async () => 'access-token'),
    ).rejects.toThrow(
      'Não foi possível conectar ao backend local. Confirme se o Docker está em execução.',
    )
  })

  it('preserves AbortError when the request is cancelled', async () => {
    const abortError = new DOMException('The operation was aborted.', 'AbortError')
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(abortError)

    const request = apiRequest(`${API_ORIGIN}/api/products/42`, async () => 'access-token')

    await expect(request).rejects.toBe(abortError)
  })
})
