import { useQuery } from '@tanstack/react-query'
import { Check, LoaderCircle, Search } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { apiRequest } from '../api/client'
import type { OffsetPage, ProductSearchResult } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { unitLabels } from '../domain'
import { StatusBadge } from './ui'
import { OffsetPagination } from './OffsetPagination'

export type ProductSelection = Pick<
  ProductSearchResult,
  'id' | 'name' | 'sku' | 'defaultMeasurementUnit' | 'active'
>

interface ProductPickerProps {
  label: string
  value: ProductSelection | null
  onChange: (product: ProductSelection | null) => void
  autoFocus?: boolean
}

const searchDelay = 400

export function ProductPicker({ label, value, onChange, autoFocus }: ProductPickerProps) {
  const auth = useAuth()
  const inputId = useId()
  const listboxId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [offset, setOffset] = useState(0)
  const [limit, setLimit] = useState(20)

  const searchQuery = useQuery({
    queryKey: ['product-search', { query: searchTerm, offset, limit }],
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({
        q: searchTerm,
        offset: String(offset),
        limit: String(limit),
      })
      return apiRequest<OffsetPage<ProductSearchResult>>(
        `/api/products/search?${params}`,
        auth.getAccessToken,
        { signal },
      )
    },
    enabled: searchTerm.length > 0 && value === null,
  })

  useEffect(() => {
    const normalizedQuery = query.trim()
    if (!normalizedQuery || value) {
      setSearchTerm('')
      setOffset(0)
      return
    }

    const timeoutId = window.setTimeout(() => {
      setOffset(0)
      setSearchTerm(normalizedQuery)
    }, searchDelay)
    return () => window.clearTimeout(timeoutId)
  }, [query, value])

  useEffect(() => setActiveIndex(0), [searchQuery.data, searchTerm])

  const normalizedQuery = query.trim()
  const results = normalizedQuery === searchTerm && !value ? (searchQuery.data?.content ?? []) : []
  const showResults = !value && normalizedQuery.length > 0
  const waitingForDebounce = normalizedQuery !== searchTerm
  const loading = waitingForDebounce || searchQuery.isFetching

  function selectProduct(product: ProductSearchResult) {
    setQuery('')
    setSearchTerm('')
    setOffset(0)
    onChange(product)
  }

  function changeProduct() {
    onChange(null)
    window.setTimeout(() => inputRef.current?.focus())
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setQuery('')
      setSearchTerm('')
      setOffset(0)
      return
    }

    if (!results.length) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => (current + 1) % results.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => (current - 1 + results.length) % results.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      selectProduct(results[activeIndex])
    }
  }

  if (value) {
    return (
      <div className="product-picker">
        <span className="product-picker-label">{label}</span>
        <div className="product-picker-selected" aria-label={`Produto selecionado: ${value.name}`}>
          <span className="product-picker-check" aria-hidden="true">
            <Check size={18} />
          </span>
          <span className="product-picker-main">
            <strong>{value.name}</strong>
            <small>
              SKU {value.sku} · ID {value.id}
            </small>
          </span>
          <span className="product-picker-unit">
            <small>Unidade</small>
            {unitLabels[value.defaultMeasurementUnit]}
          </span>
          <StatusBadge
            label={value.active ? 'Ativo' : 'Inativo'}
            tone={value.active ? 'success' : 'neutral'}
          />
          <button
            type="button"
            className="button button-secondary button-small"
            onClick={changeProduct}
          >
            Trocar produto
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="product-picker">
      <label className="product-picker-label" htmlFor={inputId}>
        {label}
      </label>
      <div className="product-picker-input">
        <Search size={18} aria-hidden="true" />
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          role="combobox"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Busque por nome, SKU ou ID"
          maxLength={150}
          autoComplete="off"
          autoFocus={autoFocus}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={showResults}
          aria-activedescendant={
            results[activeIndex] ? `${listboxId}-${results[activeIndex].id}` : undefined
          }
        />
        {loading && <LoaderCircle className="spin" size={17} aria-label="Buscando produtos" />}
      </div>
      <small className="product-picker-help">
        Digite parte do nome, o SKU completo ou o ID do produto.
      </small>

      {showResults && (
        <div className="product-picker-results">
          <div
            id={listboxId}
            className="product-picker-options"
            role="listbox"
            aria-label="Produtos encontrados"
          >
            {loading ? (
              <div className="product-picker-message" role="status">
                Buscando produtos…
              </div>
            ) : searchQuery.error ? (
              <div className="product-picker-message product-picker-error" role="alert">
                {searchQuery.error instanceof Error
                  ? searchQuery.error.message
                  : 'Não foi possível buscar os produtos.'}
              </div>
            ) : results.length ? (
              results.map((product, index) => (
                <button
                  key={product.id}
                  id={`${listboxId}-${product.id}`}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  className={
                    index === activeIndex ? 'product-picker-option active' : 'product-picker-option'
                  }
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectProduct(product)}
                >
                  <span className="product-picker-main">
                    <strong>{product.name}</strong>
                    <small>
                      SKU {product.sku} · ID {product.id}
                    </small>
                  </span>
                  <span className="product-picker-unit">
                    <small>Unidade</small>
                    {unitLabels[product.defaultMeasurementUnit]}
                  </span>
                  <StatusBadge
                    label={product.active ? 'Ativo' : 'Inativo'}
                    tone={product.active ? 'success' : 'neutral'}
                  />
                </button>
              ))
            ) : (
              <div className="product-picker-message">
                Nenhum produto encontrado. Revise o nome, SKU ou ID informado.
              </div>
            )}
          </div>
          {!loading && results.length > 0 && searchQuery.data && (
            <OffsetPagination
              offset={searchQuery.data.offset}
              limit={searchQuery.data.limit}
              totalElements={searchQuery.data.totalElements}
              hasPrevious={searchQuery.data.hasPrevious}
              hasNext={searchQuery.data.hasNext}
              resultWindowLimit={10_000}
              ariaLabel="Paginação dos produtos encontrados"
              onOffsetChange={setOffset}
              onLimitChange={(nextLimit) => {
                setLimit(nextLimit)
                setOffset(0)
              }}
            />
          )}
        </div>
      )}
    </div>
  )
}
