import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronRight,
  PackagePlus,
  Plus,
  Search,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type {
  InventoryAvailability,
  InventoryConsumption,
  InventoryLot,
  InventoryMovement,
  InventoryProductSummary,
  OffsetPage,
} from '../api/types'
import { apiRequest, jsonBody } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { ProductPicker, type ProductSelection } from '../components/ProductPicker'
import { OffsetPagination } from '../components/OffsetPagination'
import {
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  Modal,
  PageHeader,
  SearchCard,
  StatusBadge,
  SuccessAlert,
  Table,
} from '../components/ui'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatQuantity,
  lotStatusLabels,
  movementTypeLabels,
  nullableString,
  numberValue,
  stringValue,
  unitLabels,
} from '../domain'

interface StockAdjustment {
  lot: InventoryLot
  direction: 'in' | 'out'
}

interface AdjustLotVariables {
  data: FormData
  current: StockAdjustment
}

interface CreateLotVariables {
  data: FormData
  product: ProductSelection
}

interface EmptyTableProps {
  text: string
}

interface InventorySearchResultsProps {
  query: string
  page?: OffsetPage<InventoryProductSummary>
  error: unknown
  loading: boolean
  selectedProductId: number | null
  onSelect: (summary: InventoryProductSummary) => void
  onOffsetChange: (offset: number) => void
  onLimitChange: (limit: number) => void
}

type Adjustment = StockAdjustment | null

const lotTone = (status: InventoryLot['status']) =>
  status === 'AVAILABLE'
    ? 'success'
    : status === 'DEPLETED'
      ? 'neutral'
      : status === 'EXPIRED'
        ? 'danger'
        : 'warning'
const isIncoming = (type: InventoryMovement['type']) =>
  ['ENTRY', 'ADJUSTMENT_IN', 'PRODUCTION_ENTRY'].includes(type)

export function InventoryPage() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const searchTimeoutRef = useRef<number | undefined>(undefined)
  const [search, setSearch] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchOffset, setSearchOffset] = useState(0)
  const [searchLimit, setSearchLimit] = useState(20)
  const [selectedProduct, setSelectedProduct] = useState<ProductSelection | null>(null)
  const [lotProduct, setLotProduct] = useState<ProductSelection | null>(null)
  const [tab, setTab] = useState<'lots' | 'movements'>('lots')
  const [lotOffset, setLotOffset] = useState(0)
  const [lotLimit, setLotLimit] = useState(20)
  const [movementOffset, setMovementOffset] = useState(0)
  const [movementLimit, setMovementLimit] = useState(20)
  const [lotDialog, setLotDialog] = useState(false)
  const [adjustment, setAdjustment] = useState<Adjustment>(null)
  const [consumeDialog, setConsumeDialog] = useState(false)
  const [consumption, setConsumption] = useState<InventoryConsumption | null>(null)
  const [notice, setNotice] = useState('')
  const productId = selectedProduct?.id ?? null

  const inventorySearchQuery = useQuery({
    queryKey: [
      'inventory-product-search',
      { query: searchTerm, offset: searchOffset, limit: searchLimit },
    ],
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({
        q: searchTerm,
        offset: String(searchOffset),
        limit: String(searchLimit),
      })
      return apiRequest<OffsetPage<InventoryProductSummary>>(
        `/api/inventory/products/search?${params}`,
        auth.getAccessToken,
        { signal },
      )
    },
  })

  const availabilityQuery = useQuery({
    queryKey: ['availability', productId],
    queryFn: () =>
      apiRequest<InventoryAvailability>(
        `/api/inventory/products/${productId}/availability`,
        auth.getAccessToken,
      ),
    enabled: productId !== null,
  })
  const lotsQuery = useQuery({
    queryKey: ['inventory-lots', productId, { offset: lotOffset, limit: lotLimit }],
    queryFn: () =>
      apiRequest<OffsetPage<InventoryLot>>(
        `/api/inventory/products/${productId}/lots?offset=${lotOffset}&limit=${lotLimit}`,
        auth.getAccessToken,
      ),
    enabled: productId !== null && tab === 'lots',
  })
  const movementsQuery = useQuery({
    queryKey: ['inventory-movements', productId, { offset: movementOffset, limit: movementLimit }],
    queryFn: () =>
      apiRequest<OffsetPage<InventoryMovement>>(
        `/api/inventory/products/${productId}/movements?offset=${movementOffset}&limit=${movementLimit}`,
        auth.getAccessToken,
      ),
    enabled: productId !== null && tab === 'movements',
  })

  useEffect(() => {
    const normalizedSearch = search.trim()
    if (!normalizedSearch) {
      setSearchTerm('')
      setSearchOffset(0)
      return
    }

    searchTimeoutRef.current = window.setTimeout(() => {
      setSearchOffset(0)
      setSearchTerm(normalizedSearch)
    }, 400)
    return () => window.clearTimeout(searchTimeoutRef.current)
  }, [search])

  async function refreshInventory(id: number | null = productId) {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['inventory-product-search'] }),
      queryClient.invalidateQueries({ queryKey: ['availability', id] }),
      queryClient.invalidateQueries({ queryKey: ['inventory-lots', id] }),
      queryClient.invalidateQueries({ queryKey: ['inventory-movements', id] }),
    ])
  }

  const createLot = useMutation({
    mutationFn: ({ data, product }: CreateLotVariables) =>
      apiRequest<InventoryLot>('/api/inventory/lots', auth.getAccessToken, {
        method: 'POST',
        body: jsonBody({
          productId: product.id,
          lotNumber: stringValue(data, 'lotNumber'),
          manufactureDate: nullableString(data, 'manufactureDate'),
          expirationDate: nullableString(data, 'expirationDate'),
          initialQuantity: numberValue(data, 'initialQuantity'),
          unitCost: numberValue(data, 'unitCost'),
        }),
      }),
    onSuccess: async (lot, { product }) => {
      setLotDialog(false)
      setLotProduct(product)
      setSelectedProduct(product)
      setTab('lots')
      setLotOffset(0)
      setMovementOffset(0)
      setNotice(`Lote ${lot.lotNumber} registrado com sucesso.`)
      await refreshInventory(lot.productId)
    },
  })

  const adjustLot = useMutation({
    mutationFn: ({ data, current }: AdjustLotVariables) =>
      apiRequest<InventoryLot>(
        `/api/inventory/lots/${current.lot.id}/adjustments/${current.direction}`,
        auth.getAccessToken,
        {
          method: 'POST',
          body: jsonBody({
            quantity: numberValue(data, 'quantity'),
            justification: stringValue(data, 'justification'),
          }),
        },
      ),
    onSuccess: async () => {
      setAdjustment(null)
      setNotice('Ajuste registrado com sucesso.')
      await refreshInventory()
    },
  })

  const consumeStock = useMutation({
    mutationFn: (data: FormData) =>
      apiRequest<InventoryConsumption>(
        `/api/inventory/products/${productId}/consumption`,
        auth.getAccessToken,
        {
          method: 'POST',
          body: jsonBody({
            quantity: numberValue(data, 'quantity'),
            referenceType: nullableString(data, 'referenceType'),
            referenceId: stringValue(data, 'referenceId') ? numberValue(data, 'referenceId') : null,
            description: nullableString(data, 'description'),
          }),
        },
      ),
    onSuccess: async (result) => {
      setConsumeDialog(false)
      setConsumption(result)
      setNotice('Consumo realizado com sucesso.')
      await refreshInventory()
    },
  })

  function selectInventoryProduct(summary: InventoryProductSummary) {
    setSelectedProduct({
      id: summary.productId,
      name: summary.productName,
      sku: summary.productSku,
      defaultMeasurementUnit: summary.defaultMeasurementUnit,
      active: summary.active,
    })
    setLotOffset(0)
    setMovementOffset(0)
    setConsumption(null)
    setNotice('')
  }

  function searchInventory() {
    const normalizedSearch = search.trim()
    window.clearTimeout(searchTimeoutRef.current)
    if (normalizedSearch !== searchTerm) setSelectedProduct(null)
    setNotice('')
    setSearchOffset(0)
    setSearchTerm(normalizedSearch)
    if (normalizedSearch === searchTerm && searchOffset === 0) {
      void inventorySearchQuery.refetch()
    }
  }

  function changeInventorySearch(value: string) {
    setSearch(value)
    if (value.trim() !== searchTerm) setSelectedProduct(null)
  }
  const availability = availabilityQuery.data
  const activePage = tab === 'lots' ? lotsQuery.data : movementsQuery.data
  const activeHistoryQuery = tab === 'lots' ? lotsQuery : movementsQuery
  const mainError = availabilityQuery.error || activeHistoryQuery.error
  const adjustmentSubtitle = adjustment
    ? `Lote ${adjustment.lot.lotNumber} · saldo atual ${formatQuantity(adjustment.lot.availableQuantity)}`
    : ''

  return (
    <>
      <PageHeader
        eyebrow="Saldos, lotes e rastreabilidade"
        title="Estoque"
        description="Acompanhe disponibilidade e movimentações por produto."
        action={
          auth.isAdmin ? (
            <button
              className="button button-primary"
              onClick={() => {
                createLot.reset()
                setLotProduct(selectedProduct)
                setLotDialog(true)
              }}
            >
              <Plus size={18} /> Entrada de lote
            </button>
          ) : undefined
        }
      />
      {notice && <SuccessAlert>{notice}</SuccessAlert>}
      <SearchCard
        label="Localizar produto no estoque"
        placeholder="Digite nome, ID ou SKU"
        value={search}
        onChange={changeInventorySearch}
        onSearch={searchInventory}
        loading={inventorySearchQuery.isFetching && search.trim() === searchTerm}
        inputMode="search"
        inputType="search"
        maxLength={150}
        note="Deixe o campo vazio para listar todos os produtos e seus saldos."
      />
      {search.trim() === searchTerm && (
        <InventorySearchResults
          query={searchTerm}
          page={inventorySearchQuery.data}
          error={inventorySearchQuery.error}
          loading={inventorySearchQuery.isPending}
          selectedProductId={productId}
          onSelect={selectInventoryProduct}
          onOffsetChange={setSearchOffset}
          onLimitChange={(limit) => {
            setSearchLimit(limit)
            setSearchOffset(0)
          }}
        />
      )}
      {productId === null ? (
        <EmptyState
          icon={<PackagePlus />}
          title="Selecione um produto"
          text="Escolha um resultado acima para consultar saldo, lotes e movimentações."
        />
      ) : availabilityQuery.isPending || activeHistoryQuery.isPending ? (
        <LoadingState />
      ) : mainError ? (
        <ErrorState error={mainError} />
      ) : availability ? (
        <>
          <section className="availability-banner">
            <div>
              <span>Disponibilidade atual</span>
              <strong>
                {formatQuantity(availability.availableQuantity)}{' '}
                <small>{unitLabels[availability.measurementUnit]}</small>
              </strong>
            </div>
            <div>
              <span>Produto</span>
              <strong className="availability-product">
                {availability.productName}
                <small>{availability.productSku}</small>
              </strong>
            </div>
            <div>
              <span>Data de referência</span>
              <strong className="availability-product">
                {formatDate(availability.referenceDate)}
              </strong>
            </div>
            {auth.isAdmin && (
              <button
                className="button button-light"
                onClick={() => {
                  consumeStock.reset()
                  setConsumeDialog(true)
                }}
              >
                Registrar consumo
              </button>
            )}
          </section>
          {consumption && (
            <section className="consumption-result">
              <strong>
                Consumo confirmado:{' '}
                {formatQuantity(consumption.consumedQuantity, consumption.measurementUnit)}
              </strong>
              <span>
                {consumption.lots.length}{' '}
                {consumption.lots.length === 1 ? 'lote utilizado' : 'lotes utilizados'} pelo
                critério FEFO.
              </span>
            </section>
          )}
          <div className="tabs">
            <button className={tab === 'lots' ? 'active' : ''} onClick={() => setTab('lots')}>
              Lotes{lotsQuery.data ? ` (${lotsQuery.data.totalElements})` : ''}
            </button>
            <button
              className={tab === 'movements' ? 'active' : ''}
              onClick={() => setTab('movements')}
            >
              Movimentações{movementsQuery.data ? ` (${movementsQuery.data.totalElements})` : ''}
            </button>
          </div>
          <section className="card table-card">
            {tab === 'lots' ? (
              lotsQuery.data?.content.length ? (
                <Table
                  headers={[
                    'Lote',
                    'Fabricação',
                    'Validade',
                    'Inicial',
                    'Disponível',
                    'Custo unitário',
                    'Status',
                    '',
                  ]}
                  rows={lotsQuery.data.content.map((lot) => [
                    lot.lotNumber,
                    formatDate(lot.manufactureDate),
                    formatDate(lot.expirationDate),
                    formatQuantity(lot.initialQuantity),
                    formatQuantity(lot.availableQuantity),
                    formatCurrency(lot.unitCost),
                    <StatusBadge
                      key={`status-${lot.id}`}
                      label={lotStatusLabels[lot.status]}
                      tone={lotTone(lot.status)}
                    />,
                    auth.isAdmin ? (
                      <button
                        key={`adjust-${lot.id}`}
                        className="table-action"
                        onClick={() => {
                          adjustLot.reset()
                          setAdjustment({ lot, direction: 'in' })
                        }}
                      >
                        Ajustar
                      </button>
                    ) : (
                      '—'
                    ),
                  ])}
                />
              ) : (
                <EmptyTable text="Nenhum lote encontrado para este produto." />
              )
            ) : movementsQuery.data?.content.length ? (
              <Table
                headers={[
                  'Data',
                  'Lote',
                  'Tipo',
                  'Quantidade',
                  'Saldo resultante',
                  'Referência',
                  'Responsável',
                ]}
                rows={movementsQuery.data.content.map((movement) => [
                  formatDateTime(movement.occurredAt),
                  movement.lotNumber,
                  <span
                    key={`type-${movement.id}`}
                    className={`movement ${isIncoming(movement.type) ? 'in' : 'out'}`}
                  >
                    {isIncoming(movement.type) ? (
                      <ArrowDownToLine size={15} />
                    ) : (
                      <ArrowUpFromLine size={15} />
                    )}
                    {movementTypeLabels[movement.type]}
                  </span>,
                  `${isIncoming(movement.type) ? '+' : '-'} ${formatQuantity(movement.quantity)}`,
                  formatQuantity(movement.resultingQuantity),
                  movement.referenceType
                    ? `${movement.referenceType}${movement.referenceId ? ` #${movement.referenceId}` : ''}`
                    : '—',
                  movement.createdBy,
                ])}
              />
            ) : (
              <EmptyTable text="Nenhuma movimentação encontrada para este produto." />
            )}
          </section>
          {activePage && (
            <OffsetPagination
              offset={activePage.offset}
              limit={activePage.limit}
              totalElements={activePage.totalElements}
              hasPrevious={activePage.hasPrevious}
              hasNext={activePage.hasNext}
              ariaLabel={tab === 'lots' ? 'Paginação de lotes' : 'Paginação de movimentações'}
              onOffsetChange={tab === 'lots' ? setLotOffset : setMovementOffset}
              onLimitChange={(limit) => {
                if (tab === 'lots') {
                  setLotLimit(limit)
                  setLotOffset(0)
                } else {
                  setMovementLimit(limit)
                  setMovementOffset(0)
                }
              }}
            />
          )}
        </>
      ) : null}

      {lotDialog && (
        <Modal
          title="Entrada de novo lote"
          subtitle="Selecione o produto. O saldo inicial gerará uma movimentação de entrada."
          onClose={() => setLotDialog(false)}
          onSubmit={(data) => {
            if (lotProduct) createLot.mutate({ data, product: lotProduct })
          }}
          pending={createLot.isPending}
          submitDisabled={lotProduct === null}
          error={createLot.error}
          submitLabel="Registrar lote"
        >
          <div className="form-grid">
            <div className="field-full">
              <ProductPicker
                label="Produto"
                value={lotProduct}
                onChange={setLotProduct}
                autoFocus={lotProduct === null}
              />
            </div>
            <Field name="lotNumber" label="Número do lote" maxLength={80} required />
            <Field name="manufactureDate" label="Data de fabricação" type="date" />
            <Field name="expirationDate" label="Data de validade" type="date" />
            <Field
              name="initialQuantity"
              label="Quantidade inicial"
              type="number"
              min="0.000001"
              step="0.000001"
              required
            />
            <Field
              name="unitCost"
              label="Custo unitário (R$)"
              type="number"
              min="0"
              step="0.0001"
              required
            />
          </div>
        </Modal>
      )}
      {adjustment && (
        <Modal
          title="Ajustar estoque"
          subtitle={adjustmentSubtitle}
          onClose={() => setAdjustment(null)}
          onSubmit={(data) => adjustLot.mutate({ data, current: adjustment })}
          pending={adjustLot.isPending}
          error={adjustLot.error}
          submitLabel="Registrar ajuste"
        >
          <div className="adjustment-toggle">
            <button
              type="button"
              className={adjustment.direction === 'in' ? 'active' : ''}
              onClick={() => setAdjustment({ ...adjustment, direction: 'in' })}
            >
              <ArrowDownToLine size={16} /> Entrada
            </button>
            <button
              type="button"
              className={adjustment.direction === 'out' ? 'active' : ''}
              onClick={() => setAdjustment({ ...adjustment, direction: 'out' })}
            >
              <ArrowUpFromLine size={16} /> Saída
            </button>
          </div>
          <div className="form-stack">
            <Field
              name="quantity"
              label="Quantidade"
              type="number"
              min="0.000001"
              step="0.000001"
              required
            />
            <Field name="justification" label="Justificativa" maxLength={500} required />
          </div>
        </Modal>
      )}
      {consumeDialog && (
        <Modal
          title="Registrar consumo FEFO"
          subtitle="Os lotes com vencimento mais próximo serão consumidos primeiro."
          onClose={() => setConsumeDialog(false)}
          onSubmit={(data) => consumeStock.mutate(data)}
          pending={consumeStock.isPending}
          error={consumeStock.error}
          submitLabel="Confirmar consumo"
        >
          <div className="form-grid">
            <Field
              name="quantity"
              label="Quantidade"
              type="number"
              min="0.000001"
              step="0.000001"
              required
            />
            <Field
              name="referenceType"
              label="Tipo de referência"
              maxLength={60}
              placeholder="Ex.: PEDIDO"
            />
            <Field name="referenceId" label="ID da referência" type="number" min="1" />
            <Field name="description" label="Descrição" maxLength={500} />
          </div>
        </Modal>
      )}
    </>
  )
}

function InventorySearchResults({
  query,
  page,
  error,
  loading,
  selectedProductId,
  onSelect,
  onOffsetChange,
  onLimitChange,
}: InventorySearchResultsProps) {
  if (loading) {
    return (
      <section className="product-search-results">
        <LoadingState text="Buscando produtos no estoque…" />
      </section>
    )
  }
  if (error) return <ErrorState error={error} compact />
  if (!page) return null

  return (
    <section className="product-search-results" aria-busy={false}>
      <header>
        <div>
          <span className="eyebrow">Visão geral do estoque</span>
          <h2>
            {page.totalElements === 1
              ? '1 produto encontrado'
              : `${page.totalElements} produtos encontrados`}
          </h2>
        </div>
        <small>{query ? `Busca por “${query}”` : 'Todos os produtos'}</small>
      </header>
      {page.content.length ? (
        <div className="product-search-list">
          {page.content.map((summary) => (
            <button
              key={summary.productId}
              type="button"
              className={
                selectedProductId === summary.productId
                  ? 'product-search-result inventory-search-result selected'
                  : 'product-search-result inventory-search-result'
              }
              onClick={() => onSelect(summary)}
              aria-pressed={selectedProductId === summary.productId}
            >
              <span className="product-search-main">
                <strong>{summary.productName}</strong>
                <small>
                  SKU {summary.productSku} · ID {summary.productId}
                </small>
              </span>
              <span className="product-search-meta">
                <small>Disponível</small>
                <span>
                  {formatQuantity(summary.availableQuantity)}{' '}
                  {unitLabels[summary.defaultMeasurementUnit]}
                </span>
              </span>
              <span className="inventory-search-lots">
                <strong>{summary.lotCount}</strong>
                <small>{summary.lotCount === 1 ? 'lote' : 'lotes'}</small>
              </span>
              <StatusBadge
                label={summary.active ? 'Ativo' : 'Inativo'}
                tone={summary.active ? 'success' : 'neutral'}
              />
              <ChevronRight size={17} aria-hidden="true" />
            </button>
          ))}
        </div>
      ) : (
        <div className="product-search-empty">
          <Search size={20} aria-hidden="true" />
          <span>Nenhum produto encontrado no estoque.</span>
        </div>
      )}
      <OffsetPagination
        offset={page.offset}
        limit={page.limit}
        totalElements={page.totalElements}
        hasPrevious={page.hasPrevious}
        hasNext={page.hasNext}
        resultWindowLimit={10_000}
        ariaLabel="Paginação da visão geral do estoque"
        onOffsetChange={onOffsetChange}
        onLimitChange={onLimitChange}
      />
    </section>
  )
}

function EmptyTable({ text }: EmptyTableProps) {
  return <div className="empty-table">{text}</div>
}
