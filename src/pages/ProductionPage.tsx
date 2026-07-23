import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, PackageCheck, Play, Plus, Search, ShieldCheck, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type {
  OffsetPage,
  ProductCompositionTree,
  ProductionOrder,
  ProductionOrderStatus,
  ProductionResult,
} from '../api/types'
import { apiRequest, jsonBody } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { OffsetPagination } from '../components/OffsetPagination'
import { ProductPicker, type ProductSelection } from '../components/ProductPicker'
import {
  ConfirmModal,
  Detail,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  Modal,
  PageHeader,
  SearchCard,
  SelectField,
  StatusBadge,
  SuccessAlert,
  Table,
} from '../components/ui'
import {
  formatDate,
  formatDateTime,
  formatQuantity,
  nullableString,
  numberValue,
  orderStatusLabels,
  orderStatusOptions,
  stringValue,
} from '../domain'

interface TimelineStepProps {
  label: string
  date: string
  done: boolean
}

interface CreateOrderVariables {
  data: FormData
  product: ProductSelection
}

interface ProductionSearchResultsProps {
  query: string
  status: ProductionOrderStatus | ''
  page?: OffsetPage<ProductionOrder>
  error: unknown
  loading: boolean
  selectedOrderId: number | null
  onSelect: (order: ProductionOrder) => void
  onOffsetChange: (offset: number) => void
  onLimitChange: (limit: number) => void
}

const orderTone = (status: ProductionOrder['status']) =>
  status === 'COMPLETED'
    ? 'success'
    : status === 'CANCELLED'
      ? 'danger'
      : status === 'IN_PROGRESS'
        ? 'info'
        : 'neutral'

export function ProductionPage() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const searchTimeoutRef = useRef<number | undefined>(undefined)
  const [search, setSearch] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [status, setStatus] = useState<ProductionOrderStatus | ''>('')
  const [searchOffset, setSearchOffset] = useState(0)
  const [searchLimit, setSearchLimit] = useState(20)
  const [orderId, setOrderId] = useState<number | null>(null)
  const [orderProduct, setOrderProduct] = useState<ProductSelection | null>(null)
  const [createDialog, setCreateDialog] = useState(false)
  const [completeDialog, setCompleteDialog] = useState(false)
  const [cancelDialog, setCancelDialog] = useState(false)
  const [notice, setNotice] = useState('')

  const orderSearchQuery = useQuery({
    queryKey: [
      'production-order-search',
      { query: searchTerm, status, offset: searchOffset, limit: searchLimit },
    ],
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({
        q: searchTerm,
        offset: String(searchOffset),
        limit: String(searchLimit),
      })
      if (status) params.set('status', status)
      return apiRequest<OffsetPage<ProductionOrder>>(
        `/api/production-orders/search?${params}`,
        auth.getAccessToken,
        { signal },
      )
    },
  })

  const orderQuery = useQuery({
    queryKey: ['production-order', orderId],
    queryFn: () =>
      apiRequest<ProductionResult>(`/api/production-orders/${orderId}`, auth.getAccessToken),
    enabled: orderId !== null,
  })
  const compositionQuery = useQuery({
    queryKey: ['production-composition', orderQuery.data?.order.productId],
    queryFn: () =>
      apiRequest<ProductCompositionTree>(
        `/api/products/${orderQuery.data?.order.productId}/composition`,
        auth.getAccessToken,
      ),
    enabled: Boolean(orderQuery.data?.order.productId),
  })

  const createOrder = useMutation({
    mutationFn: ({ data, product }: CreateOrderVariables) =>
      apiRequest<ProductionOrder>('/api/production-orders', auth.getAccessToken, {
        method: 'POST',
        body: jsonBody({
          productId: product.id,
          quantityToProduce: numberValue(data, 'quantityToProduce'),
        }),
      }),
    onSuccess: async (order) => {
      setCreateDialog(false)
      setOrderId(order.id)
      setSearch(String(order.id))
      setSearchTerm(String(order.id))
      setStatus('')
      setSearchOffset(0)
      setNotice(`Ordem #${order.id} criada com sucesso.`)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['production-order', order.id] }),
        queryClient.invalidateQueries({ queryKey: ['production-order-search'] }),
      ])
    },
  })

  const startOrder = useMutation({
    mutationFn: () =>
      apiRequest<ProductionOrder>(`/api/production-orders/${orderId}/start`, auth.getAccessToken, {
        method: 'POST',
      }),
    onSuccess: async () => {
      setNotice('Produção iniciada com sucesso.')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['production-order', orderId] }),
        queryClient.invalidateQueries({ queryKey: ['production-order-search'] }),
      ])
    },
  })

  const cancelOrder = useMutation({
    mutationFn: () =>
      apiRequest<ProductionOrder>(`/api/production-orders/${orderId}/cancel`, auth.getAccessToken, {
        method: 'POST',
      }),
    onSuccess: async () => {
      setCancelDialog(false)
      setNotice('Ordem cancelada.')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['production-order', orderId] }),
        queryClient.invalidateQueries({ queryKey: ['production-order-search'] }),
      ])
    },
  })

  const completeOrder = useMutation({
    mutationFn: (data: FormData) =>
      apiRequest<ProductionResult>(
        `/api/production-orders/${orderId}/complete`,
        auth.getAccessToken,
        {
          method: 'POST',
          body: jsonBody({
            producedLotNumber: stringValue(data, 'producedLotNumber'),
            manufactureDate: nullableString(data, 'manufactureDate'),
            expirationDate: nullableString(data, 'expirationDate'),
            producedUnitCost: numberValue(data, 'producedUnitCost'),
          }),
        },
      ),
    onSuccess: async (result) => {
      setCompleteDialog(false)
      setNotice('Produção concluída e lote final criado.')
      queryClient.setQueryData(['production-order', orderId], result)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['production-order-search'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory-product-search'] }),
        queryClient.invalidateQueries({ queryKey: ['availability'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory-lots'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory-movements'] }),
      ])
    },
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

  function searchOrder() {
    const normalizedSearch = search.trim()
    window.clearTimeout(searchTimeoutRef.current)
    if (normalizedSearch !== searchTerm) setOrderId(null)
    setNotice('')
    setSearchOffset(0)
    setSearchTerm(normalizedSearch)
    if (normalizedSearch === searchTerm && searchOffset === 0) void orderSearchQuery.refetch()
  }

  function selectOrder(order: ProductionOrder) {
    setOrderId(order.id)
    setNotice('')
  }
  const result = orderQuery.data
  const order = result?.order

  return (
    <>
      <PageHeader
        eyebrow="Ordens e rastreabilidade"
        title="Produção"
        description="Crie, acompanhe e conclua ordens de produção."
        action={
          auth.isAdmin ? (
            <button
              className="button button-primary"
              onClick={() => {
                createOrder.reset()
                setOrderProduct(null)
                setCreateDialog(true)
              }}
            >
              <Plus size={18} /> Nova ordem
            </button>
          ) : undefined
        }
      />
      {notice && <SuccessAlert>{notice}</SuccessAlert>}
      <SearchCard
        label="Localizar ordem"
        placeholder="Digite ID, nome ou SKU"
        value={search}
        onChange={(value) => {
          setSearch(value)
          if (value.trim() !== searchTerm) setOrderId(null)
        }}
        onSearch={searchOrder}
        loading={orderSearchQuery.isFetching && search.trim() === searchTerm}
        inputMode="search"
        inputType="search"
        maxLength={150}
        note="Busque pelo ID da ordem, nome ou SKU do produto. Deixe vazio para listar todas."
      />
      <div className="search-filters">
        <SelectField
          name="productionStatus"
          label="Situação da ordem"
          options={orderStatusOptions}
          emptyLabel="Todas as situações"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as ProductionOrderStatus | '')
            setSearchOffset(0)
            setOrderId(null)
          }}
        />
      </div>
      {search.trim() === searchTerm && (
        <ProductionSearchResults
          query={searchTerm}
          status={status}
          page={orderSearchQuery.data}
          error={orderSearchQuery.error}
          loading={orderSearchQuery.isPending}
          selectedOrderId={orderId}
          onSelect={selectOrder}
          onOffsetChange={setSearchOffset}
          onLimitChange={(limit) => {
            setSearchLimit(limit)
            setSearchOffset(0)
          }}
        />
      )}
      {orderQuery.isPending && orderId ? (
        <LoadingState />
      ) : orderQuery.error ? (
        <ErrorState error={orderQuery.error} />
      ) : result && order ? (
        <>
          <div className="detail-layout production-detail">
            <section className="card card-wide">
              <div className="card-header">
                <div>
                  <span className="eyebrow">Ordem #{order.id}</span>
                  <h3>{order.productName}</h3>
                  <p>
                    {order.productSku} ·{' '}
                    {formatQuantity(order.quantityToProduce, order.measurementUnit)}
                  </p>
                </div>
                <StatusBadge
                  label={orderStatusLabels[order.status]}
                  tone={orderTone(order.status)}
                />
              </div>
              <div className="timeline">
                <TimelineStep label="Ordem criada" date={formatDateTime(order.createdAt)} done />
                <TimelineStep
                  label="Produção iniciada"
                  date={formatDateTime(order.startedAt)}
                  done={
                    (order.status !== 'CREATED' && order.status !== 'CANCELLED') ||
                    Boolean(order.startedAt)
                  }
                />
                <TimelineStep
                  label="Produção concluída"
                  date={formatDateTime(order.completedAt)}
                  done={order.status === 'COMPLETED'}
                />
              </div>
              {auth.isAdmin && order.status === 'CREATED' && (
                <div className="card-actions">
                  <button
                    className="button button-primary"
                    disabled={startOrder.isPending}
                    onClick={() => startOrder.mutate()}
                  >
                    <Play size={15} /> {startOrder.isPending ? 'Iniciando…' : 'Iniciar produção'}
                  </button>
                  <button
                    className="button button-danger"
                    onClick={() => {
                      cancelOrder.reset()
                      setCancelDialog(true)
                    }}
                  >
                    <XCircle size={15} /> Cancelar ordem
                  </button>
                </div>
              )}
              {auth.isAdmin && order.status === 'IN_PROGRESS' && (
                <div className="card-actions">
                  <button
                    className="button button-primary"
                    onClick={() => {
                      completeOrder.reset()
                      setCompleteDialog(true)
                    }}
                  >
                    <PackageCheck size={15} /> Concluir produção
                  </button>
                  <button
                    className="button button-danger"
                    onClick={() => {
                      cancelOrder.reset()
                      setCancelDialog(true)
                    }}
                  >
                    <XCircle size={15} /> Cancelar ordem
                  </button>
                </div>
              )}
              {startOrder.error && <ErrorState error={startOrder.error} compact />}
            </section>
            <section className="card">
              <span className="eyebrow">Ficha técnica</span>
              <h3>Componentes planejados</h3>
              {compositionQuery.isPending ? (
                <LoadingState text="Carregando…" />
              ) : compositionQuery.error ? (
                <ErrorState error={compositionQuery.error} compact />
              ) : compositionQuery.data?.components.length ? (
                <div className="tree-list">
                  {compositionQuery.data.components.map((component) => (
                    <div className="tree-row" key={component.compositionId}>
                      <span className="tree-dot" />
                      <span>
                        <strong>{component.name}</strong>
                        <small>{component.sku}</small>
                      </span>
                      <b>
                        {formatQuantity(
                          component.quantity * order.quantityToProduce,
                          component.measurementUnit,
                        )}
                      </b>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="helper-text">Nenhum componente encontrado.</p>
              )}
            </section>
          </div>
          {result.producedLot && (
            <section className="card produced-lot-card">
              <div>
                <span className="eyebrow">Lote produzido</span>
                <h3>{result.producedLot.lotNumber}</h3>
              </div>
              <dl className="detail-list">
                <Detail
                  label="Quantidade"
                  value={formatQuantity(
                    result.producedLot.producedQuantity,
                    result.producedLot.measurementUnit,
                  )}
                />
                <Detail label="Fabricação" value={formatDate(result.producedLot.manufactureDate)} />
                <Detail label="Validade" value={formatDate(result.producedLot.expirationDate)} />
                <Detail label="ID do lote em estoque" value={result.producedLot.inventoryLotId} />
              </dl>
            </section>
          )}
          {result.consumptions.length > 0 && (
            <section className="card table-card trace-card">
              <div className="table-title">
                <span className="eyebrow">Rastreabilidade real</span>
                <h3>Lotes consumidos</h3>
              </div>
              <Table
                headers={['Componente', 'SKU', 'Lote consumido', 'Quantidade', 'Data']}
                rows={result.consumptions.map((item) => [
                  item.componentProductName,
                  item.componentProductSku,
                  item.consumedLotNumber,
                  formatQuantity(item.consumedQuantity, item.measurementUnit),
                  formatDateTime(item.createdAt),
                ])}
              />
            </section>
          )}
        </>
      ) : (
        <EmptyState
          icon={<Search />}
          title="Selecione uma ordem"
          text="Escolha um resultado acima para acompanhar o estado, os consumos e o lote produzido."
        />
      )}

      {createDialog && (
        <Modal
          title="Nova ordem de produção"
          subtitle="O produto precisa possuir uma ficha técnica cadastrada."
          onClose={() => setCreateDialog(false)}
          onSubmit={(data) => {
            if (orderProduct) createOrder.mutate({ data, product: orderProduct })
          }}
          pending={createOrder.isPending}
          submitDisabled={orderProduct === null}
          error={createOrder.error}
          submitLabel="Criar ordem"
        >
          <div className="form-grid">
            <div className="field-full">
              <ProductPicker
                label="Produto"
                value={orderProduct}
                onChange={setOrderProduct}
                autoFocus
              />
            </div>
            <Field
              name="quantityToProduce"
              label="Quantidade a produzir"
              type="number"
              min="0.000001"
              step="0.000001"
              required
            />
          </div>
        </Modal>
      )}
      {completeDialog && (
        <Modal
          title="Concluir produção"
          subtitle="Esta ação consumirá os componentes por FEFO e criará o lote final."
          onClose={() => setCompleteDialog(false)}
          onSubmit={(data) => completeOrder.mutate(data)}
          pending={completeOrder.isPending}
          error={completeOrder.error}
          submitLabel="Concluir e gerar lote"
        >
          <div className="form-grid">
            <Field
              name="producedLotNumber"
              label="Número do lote produzido"
              maxLength={80}
              required
            />
            <Field
              name="producedUnitCost"
              label="Custo unitário produzido (R$)"
              type="number"
              min="0"
              step="0.0001"
              required
            />
            <Field name="manufactureDate" label="Data de fabricação" type="date" />
            <Field name="expirationDate" label="Data de validade" type="date" />
          </div>
          <div className="inline-warning">
            <ShieldCheck size={18} />
            <span>
              O estoque dos componentes será baixado e a operação não poderá ser desfeita pela
              interface.
            </span>
          </div>
        </Modal>
      )}
      {cancelDialog && (
        <ConfirmModal
          title="Cancelar ordem"
          description={`A ordem #${order?.id ?? ''} será encerrada sem produzir o lote final.`}
          confirmLabel="Cancelar ordem"
          onClose={() => setCancelDialog(false)}
          onConfirm={() => cancelOrder.mutate()}
          pending={cancelOrder.isPending}
          error={cancelOrder.error}
        />
      )}
    </>
  )
}

function ProductionSearchResults({
  query,
  status,
  page,
  error,
  loading,
  selectedOrderId,
  onSelect,
  onOffsetChange,
  onLimitChange,
}: ProductionSearchResultsProps) {
  if (loading) {
    return (
      <section className="product-search-results">
        <LoadingState text="Buscando ordens de produção…" />
      </section>
    )
  }
  if (error) return <ErrorState error={error} compact />
  if (!page) return null

  const context = [query ? `Busca por “${query}”` : '', status ? orderStatusLabels[status] : '']
    .filter(Boolean)
    .join(' · ')

  return (
    <section className="product-search-results">
      <header>
        <div>
          <span className="eyebrow">Ordens de produção</span>
          <h2>
            {page.totalElements === 1
              ? '1 ordem encontrada'
              : `${page.totalElements} ordens encontradas`}
          </h2>
        </div>
        <small>{context || 'Todas as ordens'}</small>
      </header>
      {page.content.length ? (
        <div className="product-search-list">
          {page.content.map((order) => (
            <button
              key={order.id}
              type="button"
              className={
                selectedOrderId === order.id
                  ? 'product-search-result production-search-result selected'
                  : 'product-search-result production-search-result'
              }
              onClick={() => onSelect(order)}
              aria-pressed={selectedOrderId === order.id}
            >
              <span className="product-search-main">
                <strong>Ordem #{order.id}</strong>
                <small>
                  {order.productName} · {order.productSku}
                </small>
              </span>
              <span className="product-search-meta">
                <small>Quantidade</small>
                <span>{formatQuantity(order.quantityToProduce, order.measurementUnit)}</span>
              </span>
              <span className="product-search-meta">
                <small>Criada em</small>
                <span>{formatDateTime(order.createdAt)}</span>
              </span>
              <StatusBadge label={orderStatusLabels[order.status]} tone={orderTone(order.status)} />
              <ChevronRight size={17} aria-hidden="true" />
            </button>
          ))}
        </div>
      ) : (
        <div className="product-search-empty">
          <Search size={20} aria-hidden="true" />
          <span>Nenhuma ordem de produção encontrada.</span>
        </div>
      )}
      <OffsetPagination
        offset={page.offset}
        limit={page.limit}
        totalElements={page.totalElements}
        hasPrevious={page.hasPrevious}
        hasNext={page.hasNext}
        ariaLabel="Paginação de ordens de produção"
        onOffsetChange={onOffsetChange}
        onLimitChange={onLimitChange}
      />
    </section>
  )
}

function TimelineStep({ label, date, done }: TimelineStepProps) {
  return (
    <div className={`timeline-step ${done ? 'done' : ''}`}>
      <span />
      <div>
        <strong>{label}</strong>
        <small>{date}</small>
      </div>
    </div>
  )
}
