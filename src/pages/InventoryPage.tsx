import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDownToLine, ArrowUpFromLine, ChevronLeft, ChevronRight, PackagePlus, Plus } from 'lucide-react'
import { useState } from 'react'
import type { InventoryAvailability, InventoryConsumption, InventoryLot, InventoryMovement, Page } from '../api/types'
import { apiRequest, jsonBody } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { EmptyState, ErrorState, Field, LoadingState, Modal, PageHeader, SearchCard, StatusBadge, SuccessAlert, Table } from '../components/ui'
import { formatCurrency, formatDate, formatDateTime, formatQuantity, lotStatusLabels, movementTypeLabels, nullableString, numberValue, stringValue, unitLabels } from '../domain'

type Adjustment = { lot: InventoryLot; direction: 'in' | 'out' } | null

const lotTone = (status: InventoryLot['status']) => status === 'AVAILABLE' ? 'success' : status === 'DEPLETED' ? 'neutral' : status === 'EXPIRED' ? 'danger' : 'warning'
const isIncoming = (type: InventoryMovement['type']) => ['ENTRY', 'ADJUSTMENT_IN', 'PRODUCTION_ENTRY'].includes(type)

export function InventoryPage() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [productId, setProductId] = useState<number | null>(null)
  const [tab, setTab] = useState<'lots' | 'movements'>('lots')
  const [page, setPage] = useState(0)
  const [lotDialog, setLotDialog] = useState(false)
  const [adjustment, setAdjustment] = useState<Adjustment>(null)
  const [consumeDialog, setConsumeDialog] = useState(false)
  const [consumption, setConsumption] = useState<InventoryConsumption | null>(null)
  const [notice, setNotice] = useState('')

  const availabilityQuery = useQuery({ queryKey: ['availability', productId], queryFn: () => apiRequest<InventoryAvailability>(`/api/inventory/products/${productId}/availability`, auth.getAccessToken), enabled: productId !== null })
  const lotsQuery = useQuery({ queryKey: ['inventory-lots', productId, page], queryFn: () => apiRequest<Page<InventoryLot>>(`/api/inventory/products/${productId}/lots?page=${page}&size=50`, auth.getAccessToken), enabled: productId !== null })
  const movementsQuery = useQuery({ queryKey: ['inventory-movements', productId, page], queryFn: () => apiRequest<Page<InventoryMovement>>(`/api/inventory/products/${productId}/movements?page=${page}&size=50`, auth.getAccessToken), enabled: productId !== null })

  async function refreshInventory(id: number | null = productId) {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['availability', id] }),
      queryClient.invalidateQueries({ queryKey: ['inventory-lots', id] }),
      queryClient.invalidateQueries({ queryKey: ['inventory-movements', id] }),
    ])
  }

  const createLot = useMutation({
    mutationFn: (data: FormData) => apiRequest<InventoryLot>('/api/inventory/lots', auth.getAccessToken, { method: 'POST', body: jsonBody({ productId: numberValue(data, 'productId'), lotNumber: stringValue(data, 'lotNumber'), manufactureDate: nullableString(data, 'manufactureDate'), expirationDate: nullableString(data, 'expirationDate'), initialQuantity: numberValue(data, 'initialQuantity'), unitCost: numberValue(data, 'unitCost') }) }),
    onSuccess: async (lot) => { setLotDialog(false); setProductId(lot.productId); setSearch(String(lot.productId)); setPage(0); setNotice(`Lote ${lot.lotNumber} registrado com sucesso.`); await refreshInventory(lot.productId) },
  })

  const adjustLot = useMutation({
    mutationFn: ({ data, current }: { data: FormData; current: NonNullable<Adjustment> }) => apiRequest<InventoryLot>(`/api/inventory/lots/${current.lot.id}/adjustments/${current.direction}`, auth.getAccessToken, { method: 'POST', body: jsonBody({ quantity: numberValue(data, 'quantity'), justification: stringValue(data, 'justification') }) }),
    onSuccess: async () => { setAdjustment(null); setNotice('Ajuste registrado com sucesso.'); await refreshInventory() },
  })

  const consumeStock = useMutation({
    mutationFn: (data: FormData) => apiRequest<InventoryConsumption>(`/api/inventory/products/${productId}/consumption`, auth.getAccessToken, { method: 'POST', body: jsonBody({ quantity: numberValue(data, 'quantity'), referenceType: nullableString(data, 'referenceType'), referenceId: stringValue(data, 'referenceId') ? numberValue(data, 'referenceId') : null, description: nullableString(data, 'description') }) }),
    onSuccess: async (result) => { setConsumeDialog(false); setConsumption(result); setNotice('Consumo realizado com sucesso.'); await refreshInventory() },
  })

  function searchInventory() { const id = Number(search); if (id > 0) { setProductId(id); setPage(0); setConsumption(null); setNotice('') } }
  const availability = availabilityQuery.data
  const activePage = tab === 'lots' ? lotsQuery.data : movementsQuery.data
  const mainError = availabilityQuery.error || lotsQuery.error || movementsQuery.error

  return <>
    <PageHeader eyebrow="Saldos, lotes e rastreabilidade" title="Estoque" description="Acompanhe disponibilidade e movimentações por produto." action={auth.isAdmin ? <button className="button button-primary" onClick={() => { createLot.reset(); setLotDialog(true) }}><Plus size={18} /> Entrada de lote</button> : undefined} />
    {notice && <SuccessAlert>{notice}</SuccessAlert>}
    <SearchCard label="Consultar estoque por produto" placeholder="Digite o ID do produto" value={search} onChange={setSearch} onSearch={searchInventory} loading={availabilityQuery.isFetching} />
    {productId === null ? <EmptyState icon={<PackagePlus />} title="Escolha um produto" text="Informe o ID para consultar dados reais de saldo, lotes e movimentações." /> : availabilityQuery.isPending || lotsQuery.isPending || movementsQuery.isPending ? <LoadingState /> : mainError ? <ErrorState error={mainError} /> : availability ? <>
      <section className="availability-banner"><div><span>Disponibilidade atual</span><strong>{formatQuantity(availability.availableQuantity)} <small>{unitLabels[availability.measurementUnit]}</small></strong></div><div><span>Produto</span><strong className="availability-product">{availability.productName}<small>{availability.productSku}</small></strong></div><div><span>Data de referência</span><strong className="availability-product">{formatDate(availability.referenceDate)}</strong></div>{auth.isAdmin && <button className="button button-light" onClick={() => { consumeStock.reset(); setConsumeDialog(true) }}>Registrar consumo</button>}</section>
      {consumption && <section className="consumption-result"><strong>Consumo confirmado: {formatQuantity(consumption.consumedQuantity, consumption.measurementUnit)}</strong><span>{consumption.lots.length} {consumption.lots.length === 1 ? 'lote utilizado' : 'lotes utilizados'} pelo critério FEFO.</span></section>}
      <div className="tabs"><button className={tab === 'lots' ? 'active' : ''} onClick={() => { setTab('lots'); setPage(0) }}>Lotes ({lotsQuery.data?.totalElements ?? 0})</button><button className={tab === 'movements' ? 'active' : ''} onClick={() => { setTab('movements'); setPage(0) }}>Movimentações ({movementsQuery.data?.totalElements ?? 0})</button></div>
      <section className="card table-card">{tab === 'lots' ? lotsQuery.data?.content.length ? <Table headers={['Lote', 'Fabricação', 'Validade', 'Inicial', 'Disponível', 'Custo unitário', 'Status', '']} rows={lotsQuery.data.content.map((lot) => [lot.lotNumber, formatDate(lot.manufactureDate), formatDate(lot.expirationDate), formatQuantity(lot.initialQuantity), formatQuantity(lot.availableQuantity), formatCurrency(lot.unitCost), <StatusBadge key={`status-${lot.id}`} label={lotStatusLabels[lot.status]} tone={lotTone(lot.status)} />, auth.isAdmin ? <button key={`adjust-${lot.id}`} className="table-action" onClick={() => { adjustLot.reset(); setAdjustment({ lot, direction: 'in' }) }}>Ajustar</button> : '—'])} /> : <EmptyTable text="Nenhum lote encontrado para este produto." /> : movementsQuery.data?.content.length ? <Table headers={['Data', 'Lote', 'Tipo', 'Quantidade', 'Saldo resultante', 'Referência', 'Responsável']} rows={movementsQuery.data.content.map((movement) => [formatDateTime(movement.occurredAt), movement.lotNumber, <span key={`type-${movement.id}`} className={`movement ${isIncoming(movement.type) ? 'in' : 'out'}`}>{isIncoming(movement.type) ? <ArrowDownToLine size={15} /> : <ArrowUpFromLine size={15} />}{movementTypeLabels[movement.type]}</span>, `${isIncoming(movement.type) ? '+' : '-'} ${formatQuantity(movement.quantity)}`, formatQuantity(movement.resultingQuantity), movement.referenceType ? `${movement.referenceType}${movement.referenceId ? ` #${movement.referenceId}` : ''}` : '—', movement.createdBy])} /> : <EmptyTable text="Nenhuma movimentação encontrada para este produto." />}</section>
      {activePage && activePage.totalPages > 1 && <div className="pagination"><button disabled={activePage.first} onClick={() => setPage((current) => current - 1)}><ChevronLeft size={16} /> Anterior</button><span>Página {activePage.number + 1} de {activePage.totalPages}</span><button disabled={activePage.last} onClick={() => setPage((current) => current + 1)}>Próxima <ChevronRight size={16} /></button></div>}
    </> : null}

    {lotDialog && <Modal title="Entrada de novo lote" subtitle="O saldo inicial gerará uma movimentação de entrada." onClose={() => setLotDialog(false)} onSubmit={(data) => createLot.mutate(data)} pending={createLot.isPending} error={createLot.error} submitLabel="Registrar lote"><div className="form-grid"><Field name="productId" label="ID do produto" type="number" min="1" defaultValue={productId ?? ''} required /><Field name="lotNumber" label="Número do lote" maxLength={80} required /><Field name="manufactureDate" label="Data de fabricação" type="date" /><Field name="expirationDate" label="Data de validade" type="date" /><Field name="initialQuantity" label="Quantidade inicial" type="number" min="0.000001" step="0.000001" required /><Field name="unitCost" label="Custo unitário (R$)" type="number" min="0" step="0.0001" required /></div></Modal>}
    {adjustment && <Modal title="Ajustar estoque" subtitle={`Lote ${adjustment.lot.lotNumber} · saldo atual ${formatQuantity(adjustment.lot.availableQuantity)}`} onClose={() => setAdjustment(null)} onSubmit={(data) => adjustLot.mutate({ data, current: adjustment })} pending={adjustLot.isPending} error={adjustLot.error} submitLabel="Registrar ajuste"><div className="adjustment-toggle"><button type="button" className={adjustment.direction === 'in' ? 'active' : ''} onClick={() => setAdjustment({ ...adjustment, direction: 'in' })}><ArrowDownToLine size={16} /> Entrada</button><button type="button" className={adjustment.direction === 'out' ? 'active' : ''} onClick={() => setAdjustment({ ...adjustment, direction: 'out' })}><ArrowUpFromLine size={16} /> Saída</button></div><div className="form-stack"><Field name="quantity" label="Quantidade" type="number" min="0.000001" step="0.000001" required /><Field name="justification" label="Justificativa" maxLength={500} required /></div></Modal>}
    {consumeDialog && <Modal title="Registrar consumo FEFO" subtitle="Os lotes com vencimento mais próximo serão consumidos primeiro." onClose={() => setConsumeDialog(false)} onSubmit={(data) => consumeStock.mutate(data)} pending={consumeStock.isPending} error={consumeStock.error} submitLabel="Confirmar consumo"><div className="form-grid"><Field name="quantity" label="Quantidade" type="number" min="0.000001" step="0.000001" required /><Field name="referenceType" label="Tipo de referência" maxLength={60} placeholder="Ex.: PEDIDO" /><Field name="referenceId" label="ID da referência" type="number" min="1" /><Field name="description" label="Descrição" maxLength={500} /></div></Modal>}
  </>
}

function EmptyTable({ text }: { text: string }) { return <div className="empty-table">{text}</div> }
