import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type {
  CompositionNode,
  CreateProductRequest,
  MeasurementUnit,
  OffsetPage,
  Product,
  ProductComponent,
  ProductCompositionTree,
  ProductSearchResult,
  ProductType,
  UpdateProductRequest,
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
} from '../components/ui'
import {
  formatDateTime,
  formatQuantity,
  numberValue,
  productTypeLabels,
  productTypeOptions,
  stringValue,
  unitLabels,
  unitOptions,
} from '../domain'

type ProductDialog = 'create' | 'edit' | null

interface CreateComponentDialog {
  mode: 'create'
}

interface EditComponentDialog {
  mode: 'edit'
  component: ProductComponent
}

interface SaveProductVariables {
  data: FormData
  id?: number
}

interface SaveComponentVariables {
  data: FormData
  component?: ProductComponent
  product?: ProductSelection
}

interface ProductSearchResultsProps {
  query: string
  page?: OffsetPage<ProductSearchResult>
  error: unknown
  loading: boolean
  selectedProductId: number | null
  onSelect: (product: ProductSearchResult) => void
  onOffsetChange: (offset: number) => void
  onLimitChange: (limit: number) => void
}

interface CompositionRowProps {
  node: CompositionNode
  depth?: number
}

type ComponentDialog = CreateComponentDialog | EditComponentDialog | null

export function ProductsPage() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const searchTimeoutRef = useRef<number | undefined>(undefined)
  const [search, setSearch] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchOffset, setSearchOffset] = useState(0)
  const [searchLimit, setSearchLimit] = useState(20)
  const [productId, setProductId] = useState<number | null>(null)
  const [productDialog, setProductDialog] = useState<ProductDialog>(null)
  const [componentDialog, setComponentDialog] = useState<ComponentDialog>(null)
  const [componentProduct, setComponentProduct] = useState<ProductSelection | null>(null)
  const [deletingProduct, setDeletingProduct] = useState(false)
  const [deletingComponent, setDeletingComponent] = useState<ProductComponent | null>(null)
  const [notice, setNotice] = useState('')

  const productQuery = useQuery({
    queryKey: ['product', productId],
    queryFn: () => apiRequest<Product>(`/api/products/${productId}`, auth.getAccessToken),
    enabled: productId !== null,
  })
  const compositionQuery = useQuery({
    queryKey: ['composition', productId],
    queryFn: () =>
      apiRequest<ProductCompositionTree>(
        `/api/products/${productId}/composition`,
        auth.getAccessToken,
      ),
    enabled: productId !== null,
  })
  const searchQuery = useQuery({
    queryKey: ['product-search', { query: searchTerm, offset: searchOffset, limit: searchLimit }],
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({
        q: searchTerm,
        offset: String(searchOffset),
        limit: String(searchLimit),
      })
      return apiRequest<OffsetPage<ProductSearchResult>>(
        `/api/products/search?${params}`,
        auth.getAccessToken,
        { signal },
      )
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

  const saveProduct = useMutation({
    mutationFn: async ({ data, id }: SaveProductVariables) => {
      const productData = {
        name: stringValue(data, 'name'),
        description: stringValue(data, 'description') || null,
        type: stringValue(data, 'type') as ProductType,
        defaultMeasurementUnit: stringValue(data, 'defaultMeasurementUnit') as MeasurementUnit,
        active: data.get('active') === 'on',
      }

      if (id) {
        const body: UpdateProductRequest = productData
        return apiRequest<Product>(`/api/products/${id}`, auth.getAccessToken, {
          method: 'PUT',
          body: jsonBody(body),
        })
      }

      const body: CreateProductRequest = productData
      return apiRequest<Product>('/api/products', auth.getAccessToken, {
        method: 'POST',
        body: jsonBody(body),
      })
    },
    onSuccess: async (product) => {
      setProductDialog(null)
      setProductId(product.id)
      setSearch(String(product.id))
      setSearchTerm(String(product.id))
      setSearchOffset(0)
      setNotice('Produto salvo com sucesso.')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['product', product.id] }),
        queryClient.invalidateQueries({ queryKey: ['product-search'] }),
      ])
    },
  })

  const deleteProduct = useMutation({
    mutationFn: () =>
      apiRequest<void>(`/api/products/${productId}`, auth.getAccessToken, { method: 'DELETE' }),
    onSuccess: async () => {
      setDeletingProduct(false)
      setProductId(null)
      setSearch('')
      setSearchTerm('')
      setSearchOffset(0)
      setNotice('Produto excluído com sucesso.')
      queryClient.removeQueries({ queryKey: ['product', productId] })
      await queryClient.invalidateQueries({ queryKey: ['product-search'] })
    },
  })

  const saveComponent = useMutation({
    mutationFn: ({ data, component, product: selectedComponent }: SaveComponentVariables) => {
      const componentData = {
        quantity: numberValue(data, 'quantity'),
        measurementUnit: stringValue(data, 'measurementUnit') as MeasurementUnit,
      }

      if (component) {
        return apiRequest(
          `/api/products/${productId}/components/${component.componentProductId}`,
          auth.getAccessToken,
          { method: 'PUT', body: jsonBody(componentData) },
        )
      }

      if (!selectedComponent) throw new Error('A component product must be selected')
      return apiRequest(`/api/products/${productId}/components`, auth.getAccessToken, {
        method: 'POST',
        body: jsonBody({ componentProductId: selectedComponent.id, ...componentData }),
      })
    },
    onSuccess: async () => {
      setComponentDialog(null)
      setComponentProduct(null)
      setNotice('Composição atualizada com sucesso.')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['product', productId] }),
        queryClient.invalidateQueries({ queryKey: ['composition', productId] }),
      ])
    },
  })

  const deleteComponent = useMutation({
    mutationFn: (component: ProductComponent) =>
      apiRequest<void>(
        `/api/products/${productId}/components/${component.componentProductId}`,
        auth.getAccessToken,
        { method: 'DELETE' },
      ),
    onSuccess: async () => {
      setDeletingComponent(null)
      setNotice('Componente removido com sucesso.')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['product', productId] }),
        queryClient.invalidateQueries({ queryKey: ['composition', productId] }),
      ])
    },
  })

  const product = productQuery.data

  function searchProduct() {
    const normalizedSearch = search.trim()

    window.clearTimeout(searchTimeoutRef.current)
    setNotice('')
    if (normalizedSearch !== searchTerm) setProductId(null)
    setSearchOffset(0)
    setSearchTerm(normalizedSearch)
    if (normalizedSearch === searchTerm && searchOffset === 0) void searchQuery.refetch()
  }

  function selectProduct(result: ProductSearchResult) {
    setNotice('')
    setProductId(result.id)
  }

  function closeComponentDialog() {
    setComponentDialog(null)
    setComponentProduct(null)
  }

  function submitComponent(data: FormData) {
    if (!componentDialog) return
    if (componentDialog.mode === 'edit') {
      saveComponent.mutate({ data, component: componentDialog.component })
      return
    }
    if (componentProduct) saveComponent.mutate({ data, product: componentProduct })
  }

  function changeSearch(value: string) {
    setSearch(value)
    if (value.trim() !== searchTerm) setProductId(null)
  }

  return (
    <>
      <PageHeader
        eyebrow="Catálogo e composições"
        title="Produtos"
        description="Consulte produtos e gerencie suas fichas técnicas."
        action={
          auth.isAdmin ? (
            <button
              className="button button-primary"
              onClick={() => {
                saveProduct.reset()
                setProductDialog('create')
              }}
            >
              <Plus size={18} /> Novo produto
            </button>
          ) : undefined
        }
      />
      {notice && <SuccessAlert>{notice}</SuccessAlert>}
      <SearchCard
        label="Localizar produto"
        placeholder="Digite nome, ID ou SKU"
        value={search}
        onChange={changeSearch}
        onSearch={searchProduct}
        loading={searchQuery.isFetching && search.trim() === searchTerm}
        inputMode="search"
        inputType="search"
        maxLength={150}
        note="Busque por nome, ID ou SKU. Deixe o campo vazio para listar todo o catálogo."
      />
      {search.trim() === searchTerm && (
        <ProductSearchResults
          query={searchTerm}
          page={searchQuery.data}
          error={searchQuery.error}
          loading={searchQuery.isPending}
          selectedProductId={productId}
          onSelect={selectProduct}
          onOffsetChange={setSearchOffset}
          onLimitChange={(limit) => {
            setSearchLimit(limit)
            setSearchOffset(0)
          }}
        />
      )}
      {productQuery.isPending && productId ? (
        <LoadingState />
      ) : productQuery.error ? (
        <ErrorState error={productQuery.error} />
      ) : product ? (
        <div className="detail-layout">
          <section className="card">
            <div className="card-header">
              <div>
                <span className="eyebrow">Produto #{product.id}</span>
                <h3>{product.name}</h3>
              </div>
              <StatusBadge
                label={product.active ? 'Ativo' : 'Inativo'}
                tone={product.active ? 'success' : 'neutral'}
              />
            </div>
            <dl className="detail-list">
              <Detail label="SKU" value={product.sku} />
              <Detail label="Tipo" value={productTypeLabels[product.type]} />
              <Detail label="Unidade padrão" value={unitLabels[product.defaultMeasurementUnit]} />
              <Detail label="Descrição" value={product.description || '—'} />
              <Detail label="Atualizado em" value={formatDateTime(product.updatedAt)} />
              <Detail label="Versão" value={product.version} />
            </dl>
            {auth.isAdmin && (
              <div className="card-actions">
                <button
                  className="button button-secondary"
                  onClick={() => {
                    saveProduct.reset()
                    setProductDialog('edit')
                  }}
                >
                  <Pencil size={15} /> Editar
                </button>
                <button
                  className="button button-danger"
                  onClick={() => {
                    deleteProduct.reset()
                    setDeletingProduct(true)
                  }}
                >
                  <Trash2 size={15} /> Excluir
                </button>
              </div>
            )}
          </section>
          <section className="card">
            <div className="card-header">
              <div>
                <span className="eyebrow">Ficha técnica</span>
                <h3>Composição</h3>
              </div>
              {auth.isAdmin && (
                <button
                  className="button button-secondary button-small"
                  onClick={() => {
                    saveComponent.reset()
                    setComponentProduct(null)
                    setComponentDialog({ mode: 'create' })
                  }}
                >
                  <Plus size={16} /> Componente
                </button>
              )}
            </div>
            {compositionQuery.isPending ? (
              <LoadingState text="Carregando composição…" />
            ) : compositionQuery.error ? (
              <ErrorState error={compositionQuery.error} compact />
            ) : compositionQuery.data?.components.length ? (
              <div className="tree-list">
                {compositionQuery.data.components.map((node) => (
                  <CompositionRow key={node.compositionId} node={node} />
                ))}
              </div>
            ) : (
              <p className="helper-text">Este produto ainda não possui componentes.</p>
            )}
            {auth.isAdmin && product.components.length > 0 && (
              <div className="component-actions">
                <span>Editar componentes diretos</span>
                {product.components.map((component) => (
                  <div key={component.id}>
                    <span>{component.componentProductName}</span>
                    <button
                      onClick={() => {
                        saveComponent.reset()
                        setComponentProduct(null)
                        setComponentDialog({ mode: 'edit', component })
                      }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => {
                        deleteComponent.reset()
                        setDeletingComponent(component)
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : (
        <EmptyState
          icon={<Search />}
          title="Consulte um produto"
          text="Pesquise por nome, ID ou SKU e selecione um resultado para visualizar os dados e a composição completa."
        />
      )}

      {productDialog && (
        <Modal
          title={productDialog === 'create' ? 'Novo produto' : 'Editar produto'}
          subtitle={
            productDialog === 'create'
              ? 'Informe os dados do produto. O SKU será gerado automaticamente ao salvar.'
              : 'Altere os dados do produto. O SKU é gerado pelo sistema e não pode ser modificado.'
          }
          onClose={() => setProductDialog(null)}
          onSubmit={(data) =>
            saveProduct.mutate({ data, id: productDialog === 'edit' ? product?.id : undefined })
          }
          pending={saveProduct.isPending}
          error={saveProduct.error}
        >
          <div className="form-grid">
            <Field
              name="name"
              label="Nome"
              defaultValue={productDialog === 'edit' ? product?.name : ''}
              maxLength={150}
              required
            />
            {productDialog === 'edit' && (
              <Field name="sku" label="SKU" value={product?.sku ?? ''} readOnly />
            )}
            <SelectField
              name="type"
              label="Tipo"
              options={productTypeOptions}
              defaultValue={productDialog === 'edit' ? product?.type : ''}
              required
            />
            <SelectField
              name="defaultMeasurementUnit"
              label="Unidade padrão"
              options={unitOptions}
              defaultValue={productDialog === 'edit' ? product?.defaultMeasurementUnit : ''}
              required
            />
            <div className="field-full">
              <Field
                name="description"
                label="Descrição"
                defaultValue={productDialog === 'edit' ? (product?.description ?? '') : ''}
                maxLength={1000}
              />
            </div>
            <label className="check field-full">
              <input
                name="active"
                type="checkbox"
                defaultChecked={productDialog === 'create' || product?.active}
              />{' '}
              Produto ativo
            </label>
          </div>
        </Modal>
      )}
      {componentDialog && (
        <Modal
          title={componentDialog.mode === 'create' ? 'Adicionar componente' : 'Editar componente'}
          subtitle={
            componentDialog.mode === 'create'
              ? 'Busque o produto componente e informe a quantidade necessária.'
              : 'Informe a quantidade necessária para uma unidade do produto.'
          }
          onClose={closeComponentDialog}
          onSubmit={submitComponent}
          pending={saveComponent.isPending}
          submitDisabled={componentDialog.mode === 'create' && componentProduct === null}
          error={saveComponent.error}
        >
          <div className="form-grid">
            {componentDialog.mode === 'create' && (
              <div className="field-full">
                <ProductPicker
                  label="Produto componente"
                  value={componentProduct}
                  onChange={setComponentProduct}
                  disabledProductId={productId ?? undefined}
                  disabledProductLabel="Produto atual"
                  autoFocus
                />
              </div>
            )}
            <Field
              name="quantity"
              label="Quantidade"
              type="number"
              min="0.000001"
              step="0.000001"
              defaultValue={
                componentDialog.mode === 'edit' ? componentDialog.component.quantity : ''
              }
              required
            />
            <SelectField
              name="measurementUnit"
              label="Unidade de medida"
              options={unitOptions}
              defaultValue={
                componentDialog.mode === 'edit' ? componentDialog.component.measurementUnit : ''
              }
              required
            />
          </div>
        </Modal>
      )}
      {deletingProduct && (
        <ConfirmModal
          title="Excluir produto"
          description={`O produto ${product?.name ?? ''} será removido permanentemente.`}
          confirmLabel="Excluir produto"
          onClose={() => setDeletingProduct(false)}
          onConfirm={() => deleteProduct.mutate()}
          pending={deleteProduct.isPending}
          error={deleteProduct.error}
        />
      )}
      {deletingComponent && (
        <ConfirmModal
          title="Remover componente"
          description={`${deletingComponent.componentProductName} será retirado da ficha técnica.`}
          confirmLabel="Remover componente"
          onClose={() => setDeletingComponent(null)}
          onConfirm={() => deleteComponent.mutate(deletingComponent)}
          pending={deleteComponent.isPending}
          error={deleteComponent.error}
        />
      )}
    </>
  )
}

function ProductSearchResults({
  query,
  page,
  error,
  loading,
  selectedProductId,
  onSelect,
  onOffsetChange,
  onLimitChange,
}: ProductSearchResultsProps) {
  if (loading)
    return (
      <section className="product-search-results">
        <LoadingState text="Buscando produtos…" />
      </section>
    )
  if (error) return <ErrorState error={error} compact />
  if (!page) return null

  return (
    <section className="product-search-results" aria-live="polite">
      <header>
        <div>
          <span className="eyebrow">Resultados da busca</span>
          <h2>
            {page.totalElements === 1
              ? '1 produto encontrado'
              : `${page.totalElements} produtos encontrados`}
          </h2>
        </div>
        <small>{query ? `Busca por “${query}”` : 'Catálogo completo'}</small>
      </header>
      {page.content.length ? (
        <div className="product-search-list">
          {page.content.map((result) => (
            <button
              key={result.id}
              type="button"
              className={
                selectedProductId === result.id
                  ? 'product-search-result selected'
                  : 'product-search-result'
              }
              onClick={() => onSelect(result)}
              aria-pressed={selectedProductId === result.id}
            >
              <span className="product-search-main">
                <strong>{result.name}</strong>
                <small>
                  SKU {result.sku} · ID {result.id}
                </small>
              </span>
              <span className="product-search-meta">
                <span>{productTypeLabels[result.type]}</span>
                <small>{unitLabels[result.defaultMeasurementUnit]}</small>
              </span>
              <StatusBadge
                label={result.active ? 'Ativo' : 'Inativo'}
                tone={result.active ? 'success' : 'neutral'}
              />
              <ChevronRight size={17} />
            </button>
          ))}
        </div>
      ) : (
        <div className="product-search-empty">
          <Search size={20} />
          <span>
            {query
              ? 'Nenhum produto encontrado. Revise o nome, ID ou SKU informado.'
              : 'Nenhum produto cadastrado no catálogo.'}
          </span>
        </div>
      )}
      <OffsetPagination
        offset={page.offset}
        limit={page.limit}
        totalElements={page.totalElements}
        hasPrevious={page.hasPrevious}
        hasNext={page.hasNext}
        resultWindowLimit={10_000}
        ariaLabel="Paginação de produtos"
        onOffsetChange={onOffsetChange}
        onLimitChange={onLimitChange}
      />
    </section>
  )
}

function CompositionRow({ node, depth = 0 }: CompositionRowProps) {
  return (
    <>
      <div className="tree-row" style={{ paddingLeft: depth * 19 }}>
        <ChevronRight size={14} className={node.components.length ? '' : 'tree-leaf'} />
        <span>
          <strong>{node.name}</strong>
          <small>{node.sku}</small>
        </span>
        <b>{formatQuantity(node.quantity, node.measurementUnit)}</b>
      </div>
      {node.components.map((child) => (
        <CompositionRow key={child.compositionId} node={child} depth={depth + 1} />
      ))}
    </>
  )
}
