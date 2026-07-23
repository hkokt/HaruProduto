import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PackageCheck, Play, Plus, Search, ShieldCheck, XCircle } from 'lucide-react'
import { useState } from 'react'
import type { ProductCompositionTree, ProductionOrder, ProductionResult } from '../api/types'
import { apiRequest, jsonBody } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { ConfirmModal, Detail, EmptyState, ErrorState, Field, LoadingState, Modal, PageHeader, SearchCard, StatusBadge, SuccessAlert, Table } from '../components/ui'
import { formatDate, formatDateTime, formatQuantity, nullableString, numberValue, orderStatusLabels, stringValue } from '../domain'

const orderTone = (status: ProductionOrder['status']) => status === 'COMPLETED' ? 'success' : status === 'CANCELLED' ? 'danger' : status === 'IN_PROGRESS' ? 'info' : 'neutral'

export function ProductionPage() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [orderId, setOrderId] = useState<number | null>(null)
  const [createDialog, setCreateDialog] = useState(false)
  const [completeDialog, setCompleteDialog] = useState(false)
  const [cancelDialog, setCancelDialog] = useState(false)
  const [notice, setNotice] = useState('')

  const orderQuery = useQuery({ queryKey: ['production-order', orderId], queryFn: () => apiRequest<ProductionResult>(`/api/production-orders/${orderId}`, auth.getAccessToken), enabled: orderId !== null })
  const compositionQuery = useQuery({ queryKey: ['production-composition', orderQuery.data?.order.productId], queryFn: () => apiRequest<ProductCompositionTree>(`/api/products/${orderQuery.data?.order.productId}/composition`, auth.getAccessToken), enabled: Boolean(orderQuery.data?.order.productId) })

  const createOrder = useMutation({
    mutationFn: (data: FormData) => apiRequest<ProductionOrder>('/api/production-orders', auth.getAccessToken, { method: 'POST', body: jsonBody({ productId: numberValue(data, 'productId'), quantityToProduce: numberValue(data, 'quantityToProduce') }) }),
    onSuccess: async (order) => { setCreateDialog(false); setOrderId(order.id); setSearch(String(order.id)); setNotice(`Ordem #${order.id} criada com sucesso.`); await queryClient.invalidateQueries({ queryKey: ['production-order', order.id] }) },
  })

  const startOrder = useMutation({
    mutationFn: () => apiRequest<ProductionOrder>(`/api/production-orders/${orderId}/start`, auth.getAccessToken, { method: 'POST' }),
    onSuccess: async () => { setNotice('Produção iniciada com sucesso.'); await queryClient.invalidateQueries({ queryKey: ['production-order', orderId] }) },
  })

  const cancelOrder = useMutation({
    mutationFn: () => apiRequest<ProductionOrder>(`/api/production-orders/${orderId}/cancel`, auth.getAccessToken, { method: 'POST' }),
    onSuccess: async () => { setCancelDialog(false); setNotice('Ordem cancelada.'); await queryClient.invalidateQueries({ queryKey: ['production-order', orderId] }) },
  })

  const completeOrder = useMutation({
    mutationFn: (data: FormData) => apiRequest<ProductionResult>(`/api/production-orders/${orderId}/complete`, auth.getAccessToken, { method: 'POST', body: jsonBody({ producedLotNumber: stringValue(data, 'producedLotNumber'), manufactureDate: nullableString(data, 'manufactureDate'), expirationDate: nullableString(data, 'expirationDate'), producedUnitCost: numberValue(data, 'producedUnitCost') }) }),
    onSuccess: (result) => { setCompleteDialog(false); setNotice('Produção concluída e lote final criado.'); queryClient.setQueryData(['production-order', orderId], result) },
  })

  function searchOrder() { const id = Number(search); if (id > 0) { setOrderId(id); setNotice('') } }
  const result = orderQuery.data
  const order = result?.order

  return <>
    <PageHeader eyebrow="Ordens e rastreabilidade" title="Produção" description="Crie, acompanhe e conclua ordens de produção." action={auth.isAdmin ? <button className="button button-primary" onClick={() => { createOrder.reset(); setCreateDialog(true) }}><Plus size={18} /> Nova ordem</button> : undefined} />
    {notice && <SuccessAlert>{notice}</SuccessAlert>}
    <SearchCard label="Localizar ordem" placeholder="Digite o ID da ordem" value={search} onChange={setSearch} onSearch={searchOrder} loading={orderQuery.isFetching} note="A API atual permite consulta direta por ID." />
    {orderQuery.isPending && orderId ? <LoadingState /> : orderQuery.error ? <ErrorState error={orderQuery.error} /> : result && order ? <>
      <div className="detail-layout production-detail">
        <section className="card card-wide"><div className="card-header"><div><span className="eyebrow">Ordem #{order.id}</span><h3>{order.productName}</h3><p>{order.productSku} · {formatQuantity(order.quantityToProduce, order.measurementUnit)}</p></div><StatusBadge label={orderStatusLabels[order.status]} tone={orderTone(order.status)} /></div><div className="timeline"><TimelineStep label="Ordem criada" date={formatDateTime(order.createdAt)} done /><TimelineStep label="Produção iniciada" date={formatDateTime(order.startedAt)} done={order.status !== 'CREATED' && order.status !== 'CANCELLED' || Boolean(order.startedAt)} /><TimelineStep label="Produção concluída" date={formatDateTime(order.completedAt)} done={order.status === 'COMPLETED'} /></div>{auth.isAdmin && order.status === 'CREATED' && <div className="card-actions"><button className="button button-primary" disabled={startOrder.isPending} onClick={() => startOrder.mutate()}><Play size={15} /> {startOrder.isPending ? 'Iniciando…' : 'Iniciar produção'}</button><button className="button button-danger" onClick={() => { cancelOrder.reset(); setCancelDialog(true) }}><XCircle size={15} /> Cancelar ordem</button></div>}{auth.isAdmin && order.status === 'IN_PROGRESS' && <div className="card-actions"><button className="button button-primary" onClick={() => { completeOrder.reset(); setCompleteDialog(true) }}><PackageCheck size={15} /> Concluir produção</button><button className="button button-danger" onClick={() => { cancelOrder.reset(); setCancelDialog(true) }}><XCircle size={15} /> Cancelar ordem</button></div>}{startOrder.error && <ErrorState error={startOrder.error} compact />}</section>
        <section className="card"><span className="eyebrow">Ficha técnica</span><h3>Componentes planejados</h3>{compositionQuery.isPending ? <LoadingState text="Carregando…" /> : compositionQuery.error ? <ErrorState error={compositionQuery.error} compact /> : compositionQuery.data?.components.length ? <div className="tree-list">{compositionQuery.data.components.map((component) => <div className="tree-row" key={component.compositionId}><span className="tree-dot" /><span><strong>{component.name}</strong><small>{component.sku}</small></span><b>{formatQuantity(component.quantity * order.quantityToProduce, component.measurementUnit)}</b></div>)}</div> : <p className="helper-text">Nenhum componente encontrado.</p>}</section>
      </div>
      {result.producedLot && <section className="card produced-lot-card"><div><span className="eyebrow">Lote produzido</span><h3>{result.producedLot.lotNumber}</h3></div><dl className="detail-list"><Detail label="Quantidade" value={formatQuantity(result.producedLot.producedQuantity, result.producedLot.measurementUnit)} /><Detail label="Fabricação" value={formatDate(result.producedLot.manufactureDate)} /><Detail label="Validade" value={formatDate(result.producedLot.expirationDate)} /><Detail label="ID do lote em estoque" value={result.producedLot.inventoryLotId} /></dl></section>}
      {result.consumptions.length > 0 && <section className="card table-card trace-card"><div className="table-title"><span className="eyebrow">Rastreabilidade real</span><h3>Lotes consumidos</h3></div><Table headers={['Componente', 'SKU', 'Lote consumido', 'Quantidade', 'Data']} rows={result.consumptions.map((item) => [item.componentProductName, item.componentProductSku, item.consumedLotNumber, formatQuantity(item.consumedQuantity, item.measurementUnit), formatDateTime(item.createdAt)])} /></section>}
    </> : <EmptyState icon={<Search />} title="Consulte uma ordem" text="Informe o ID para acompanhar o estado, os consumos e o lote produzido." />}

    {createDialog && <Modal title="Nova ordem de produção" subtitle="O produto precisa possuir uma ficha técnica cadastrada." onClose={() => setCreateDialog(false)} onSubmit={(data) => createOrder.mutate(data)} pending={createOrder.isPending} error={createOrder.error} submitLabel="Criar ordem"><div className="form-grid"><Field name="productId" label="ID do produto" type="number" min="1" required /><Field name="quantityToProduce" label="Quantidade a produzir" type="number" min="0.000001" step="0.000001" required /></div></Modal>}
    {completeDialog && <Modal title="Concluir produção" subtitle="Esta ação consumirá os componentes por FEFO e criará o lote final." onClose={() => setCompleteDialog(false)} onSubmit={(data) => completeOrder.mutate(data)} pending={completeOrder.isPending} error={completeOrder.error} submitLabel="Concluir e gerar lote"><div className="form-grid"><Field name="producedLotNumber" label="Número do lote produzido" maxLength={80} required /><Field name="producedUnitCost" label="Custo unitário produzido (R$)" type="number" min="0" step="0.0001" required /><Field name="manufactureDate" label="Data de fabricação" type="date" /><Field name="expirationDate" label="Data de validade" type="date" /></div><div className="inline-warning"><ShieldCheck size={18} /><span>O estoque dos componentes será baixado e a operação não poderá ser desfeita pela interface.</span></div></Modal>}
    {cancelDialog && <ConfirmModal title="Cancelar ordem" description={`A ordem #${order?.id ?? ''} será encerrada sem produzir o lote final.`} confirmLabel="Cancelar ordem" onClose={() => setCancelDialog(false)} onConfirm={() => cancelOrder.mutate()} pending={cancelOrder.isPending} error={cancelOrder.error} />}
  </>
}

function TimelineStep({ label, date, done }: { label: string; date: string; done: boolean }) { return <div className={`timeline-step ${done ? 'done' : ''}`}><span /><div><strong>{label}</strong><small>{date}</small></div></div> }
