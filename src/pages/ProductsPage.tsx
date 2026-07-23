import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { CompositionNode, MeasurementUnit, Product, ProductComponent, ProductCompositionTree, ProductType } from '../api/types'
import { apiRequest, jsonBody } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { ConfirmModal, Detail, EmptyState, ErrorState, Field, LoadingState, Modal, PageHeader, SearchCard, SelectField, StatusBadge, SuccessAlert } from '../components/ui'
import { formatDateTime, formatQuantity, numberValue, productTypeLabels, productTypeOptions, stringValue, unitLabels, unitOptions } from '../domain'

type ProductDialog = 'create' | 'edit' | null
type ComponentDialog = { mode: 'create' } | { mode: 'edit'; component: ProductComponent } | null

export function ProductsPage() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [productId, setProductId] = useState<number | null>(null)
  const [productDialog, setProductDialog] = useState<ProductDialog>(null)
  const [componentDialog, setComponentDialog] = useState<ComponentDialog>(null)
  const [deletingProduct, setDeletingProduct] = useState(false)
  const [deletingComponent, setDeletingComponent] = useState<ProductComponent | null>(null)
  const [notice, setNotice] = useState('')

  const productQuery = useQuery({ queryKey: ['product', productId], queryFn: () => apiRequest<Product>(`/api/products/${productId}`, auth.getAccessToken), enabled: productId !== null })
  const compositionQuery = useQuery({ queryKey: ['composition', productId], queryFn: () => apiRequest<ProductCompositionTree>(`/api/products/${productId}/composition`, auth.getAccessToken), enabled: productId !== null })

  const saveProduct = useMutation({
    mutationFn: async ({ data, id }: { data: FormData; id?: number }) => {
      const body = { name: stringValue(data, 'name'), description: stringValue(data, 'description') || null, sku: stringValue(data, 'sku'), type: stringValue(data, 'type') as ProductType, defaultMeasurementUnit: stringValue(data, 'defaultMeasurementUnit') as MeasurementUnit, active: data.get('active') === 'on' }
      return apiRequest<Product>(id ? `/api/products/${id}` : '/api/products', auth.getAccessToken, { method: id ? 'PUT' : 'POST', body: jsonBody(body) })
    },
    onSuccess: async (product) => { setProductDialog(null); setProductId(product.id); setSearch(String(product.id)); setNotice('Produto salvo com sucesso.'); await queryClient.invalidateQueries({ queryKey: ['product', product.id] }) },
  })

  const deleteProduct = useMutation({
    mutationFn: () => apiRequest<void>(`/api/products/${productId}`, auth.getAccessToken, { method: 'DELETE' }),
    onSuccess: () => { setDeletingProduct(false); setProductId(null); setSearch(''); setNotice('Produto excluído com sucesso.'); queryClient.removeQueries({ queryKey: ['product', productId] }) },
  })

  const saveComponent = useMutation({
    mutationFn: ({ data, component }: { data: FormData; component?: ProductComponent }) => {
      const body = { ...(component ? {} : { componentProductId: numberValue(data, 'componentProductId') }), quantity: numberValue(data, 'quantity'), measurementUnit: stringValue(data, 'measurementUnit') as MeasurementUnit }
      const path = component ? `/api/products/${productId}/components/${component.componentProductId}` : `/api/products/${productId}/components`
      return apiRequest(path, auth.getAccessToken, { method: component ? 'PUT' : 'POST', body: jsonBody(body) })
    },
    onSuccess: async () => { setComponentDialog(null); setNotice('Composição atualizada com sucesso.'); await Promise.all([queryClient.invalidateQueries({ queryKey: ['product', productId] }), queryClient.invalidateQueries({ queryKey: ['composition', productId] })]) },
  })

  const deleteComponent = useMutation({
    mutationFn: (component: ProductComponent) => apiRequest<void>(`/api/products/${productId}/components/${component.componentProductId}`, auth.getAccessToken, { method: 'DELETE' }),
    onSuccess: async () => { setDeletingComponent(null); setNotice('Componente removido com sucesso.'); await Promise.all([queryClient.invalidateQueries({ queryKey: ['product', productId] }), queryClient.invalidateQueries({ queryKey: ['composition', productId] })]) },
  })

  const product = productQuery.data
  function searchProduct() { const id = Number(search); if (id > 0) { setNotice(''); setProductId(id) } }

  return <>
    <PageHeader eyebrow="Catálogo e composições" title="Produtos" description="Consulte produtos e gerencie suas fichas técnicas." action={auth.isAdmin ? <button className="button button-primary" onClick={() => { saveProduct.reset(); setProductDialog('create') }}><Plus size={18} /> Novo produto</button> : undefined} />
    {notice && <SuccessAlert>{notice}</SuccessAlert>}
    <SearchCard label="Localizar produto" placeholder="Digite o ID do produto" value={search} onChange={setSearch} onSearch={searchProduct} loading={productQuery.isFetching} note="A API atual permite consulta direta por ID." />
    {productQuery.isPending && productId ? <LoadingState /> : productQuery.error ? <ErrorState error={productQuery.error} /> : product ? <div className="detail-layout">
      <section className="card"><div className="card-header"><div><span className="eyebrow">Produto #{product.id}</span><h3>{product.name}</h3></div><StatusBadge label={product.active ? 'Ativo' : 'Inativo'} tone={product.active ? 'success' : 'neutral'} /></div><dl className="detail-list"><Detail label="SKU" value={product.sku} /><Detail label="Tipo" value={productTypeLabels[product.type]} /><Detail label="Unidade padrão" value={unitLabels[product.defaultMeasurementUnit]} /><Detail label="Descrição" value={product.description || '—'} /><Detail label="Atualizado em" value={formatDateTime(product.updatedAt)} /><Detail label="Versão" value={product.version} /></dl>{auth.isAdmin && <div className="card-actions"><button className="button button-secondary" onClick={() => { saveProduct.reset(); setProductDialog('edit') }}><Pencil size={15} /> Editar</button><button className="button button-danger" onClick={() => { deleteProduct.reset(); setDeletingProduct(true) }}><Trash2 size={15} /> Excluir</button></div>}</section>
      <section className="card"><div className="card-header"><div><span className="eyebrow">Ficha técnica</span><h3>Composição</h3></div>{auth.isAdmin && <button className="button button-secondary button-small" onClick={() => { saveComponent.reset(); setComponentDialog({ mode: 'create' }) }}><Plus size={16} /> Componente</button>}</div>{compositionQuery.isPending ? <LoadingState text="Carregando composição…" /> : compositionQuery.error ? <ErrorState error={compositionQuery.error} compact /> : compositionQuery.data?.components.length ? <div className="tree-list">{compositionQuery.data.components.map((node) => <CompositionRow key={node.compositionId} node={node} />)}</div> : <p className="helper-text">Este produto ainda não possui componentes.</p>}{auth.isAdmin && product.components.length > 0 && <div className="component-actions"><span>Editar componentes diretos</span>{product.components.map((component) => <div key={component.id}><span>{component.componentProductName}</span><button onClick={() => { saveComponent.reset(); setComponentDialog({ mode: 'edit', component }) }}><Pencil size={14} /></button><button onClick={() => { deleteComponent.reset(); setDeletingComponent(component) }}><Trash2 size={14} /></button></div>)}</div>}</section>
    </div> : <EmptyState icon={<Search />} title="Consulte um produto" text="Informe o ID para visualizar dados reais e a composição completa." />}

    {productDialog && <Modal title={productDialog === 'create' ? 'Novo produto' : 'Editar produto'} subtitle="Informe os dados do produto." onClose={() => setProductDialog(null)} onSubmit={(data) => saveProduct.mutate({ data, id: productDialog === 'edit' ? product?.id : undefined })} pending={saveProduct.isPending} error={saveProduct.error}>
      <div className="form-grid"><Field name="name" label="Nome" defaultValue={productDialog === 'edit' ? product?.name : ''} maxLength={150} required /><Field name="sku" label="SKU" defaultValue={productDialog === 'edit' ? product?.sku : ''} maxLength={60} required /><SelectField name="type" label="Tipo" options={productTypeOptions} defaultValue={productDialog === 'edit' ? product?.type : ''} required /><SelectField name="defaultMeasurementUnit" label="Unidade padrão" options={unitOptions} defaultValue={productDialog === 'edit' ? product?.defaultMeasurementUnit : ''} required /><div className="field-full"><Field name="description" label="Descrição" defaultValue={productDialog === 'edit' ? product?.description ?? '' : ''} maxLength={1000} /></div><label className="check field-full"><input name="active" type="checkbox" defaultChecked={productDialog === 'create' || product?.active} /> Produto ativo</label></div>
    </Modal>}
    {componentDialog && <Modal title={componentDialog.mode === 'create' ? 'Adicionar componente' : 'Editar componente'} subtitle="Informe a quantidade necessária para uma unidade do produto." onClose={() => setComponentDialog(null)} onSubmit={(data) => saveComponent.mutate({ data, component: componentDialog.mode === 'edit' ? componentDialog.component : undefined })} pending={saveComponent.isPending} error={saveComponent.error}>
      <div className="form-grid">{componentDialog.mode === 'create' && <Field name="componentProductId" label="ID do produto componente" type="number" min="1" required />}<Field name="quantity" label="Quantidade" type="number" min="0.000001" step="0.000001" defaultValue={componentDialog.mode === 'edit' ? componentDialog.component.quantity : ''} required /><SelectField name="measurementUnit" label="Unidade de medida" options={unitOptions} defaultValue={componentDialog.mode === 'edit' ? componentDialog.component.measurementUnit : ''} required /></div>
    </Modal>}
    {deletingProduct && <ConfirmModal title="Excluir produto" description={`O produto ${product?.name ?? ''} será removido permanentemente.`} confirmLabel="Excluir produto" onClose={() => setDeletingProduct(false)} onConfirm={() => deleteProduct.mutate()} pending={deleteProduct.isPending} error={deleteProduct.error} />}
    {deletingComponent && <ConfirmModal title="Remover componente" description={`${deletingComponent.componentProductName} será retirado da ficha técnica.`} confirmLabel="Remover componente" onClose={() => setDeletingComponent(null)} onConfirm={() => deleteComponent.mutate(deletingComponent)} pending={deleteComponent.isPending} error={deleteComponent.error} />}
  </>
}

function CompositionRow({ node, depth = 0 }: { node: CompositionNode; depth?: number }) {
  return <><div className="tree-row" style={{ paddingLeft: depth * 19 }}><ChevronRight size={14} className={node.components.length ? '' : 'tree-leaf'} /><span><strong>{node.name}</strong><small>{node.sku}</small></span><b>{formatQuantity(node.quantity, node.measurementUnit)}</b></div>{node.components.map((child) => <CompositionRow key={child.compositionId} node={child} depth={depth + 1} />)}</>
}
