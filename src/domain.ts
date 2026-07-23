import type { InventoryLotStatus, InventoryMovementType, MeasurementUnit, ProductType, ProductionOrderStatus } from './api/types'

export const productTypeOptions: { value: ProductType; label: string }[] = [
  { value: 'RAW_MATERIAL', label: 'Matéria-prima' },
  { value: 'COMPONENT', label: 'Componente' },
  { value: 'INTERMEDIATE_PRODUCT', label: 'Produto intermediário' },
  { value: 'FINISHED_PRODUCT', label: 'Produto acabado' },
  { value: 'KIT', label: 'Kit' },
  { value: 'SERVICE', label: 'Serviço' },
]

export const unitOptions: { value: MeasurementUnit; label: string }[] = [
  { value: 'UNIT', label: 'Unidade' }, { value: 'KILOGRAM', label: 'Quilograma' },
  { value: 'GRAM', label: 'Grama' }, { value: 'LITER', label: 'Litro' },
  { value: 'MILLILITER', label: 'Mililitro' }, { value: 'METER', label: 'Metro' },
  { value: 'CENTIMETER', label: 'Centímetro' }, { value: 'SQUARE_METER', label: 'Metro quadrado' },
  { value: 'CUBIC_METER', label: 'Metro cúbico' }, { value: 'BOX', label: 'Caixa' },
  { value: 'PACKAGE', label: 'Pacote' },
]

export const productTypeLabels = Object.fromEntries(productTypeOptions.map(({ value, label }) => [value, label])) as Record<ProductType, string>
export const unitLabels = Object.fromEntries(unitOptions.map(({ value, label }) => [value, label])) as Record<MeasurementUnit, string>
export const lotStatusLabels: Record<InventoryLotStatus, string> = { AVAILABLE: 'Disponível', DEPLETED: 'Esgotado', EXPIRED: 'Vencido', BLOCKED: 'Bloqueado' }
export const movementTypeLabels: Record<InventoryMovementType, string> = { ENTRY: 'Entrada', EXIT: 'Saída', ADJUSTMENT_IN: 'Ajuste de entrada', ADJUSTMENT_OUT: 'Ajuste de saída', PRODUCTION_CONSUMPTION: 'Consumo de produção', PRODUCTION_ENTRY: 'Entrada de produção' }
export const orderStatusLabels: Record<ProductionOrderStatus, string> = { CREATED: 'Criada', IN_PROGRESS: 'Em andamento', COMPLETED: 'Concluída', CANCELLED: 'Cancelada' }

export const formatQuantity = (value: number, unit?: MeasurementUnit) => `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 6 }).format(value)}${unit ? ` ${unitLabels[unit]}` : ''}`
export const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(value)
export const formatDate = (value: string | null | undefined) => value ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${value.length === 10 ? `${value}T00:00:00Z` : value}`)) : '—'
export const formatDateTime = (value: string | null | undefined) => value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : 'Aguardando'
export const numberValue = (data: FormData, name: string) => Number(data.get(name))
export const stringValue = (data: FormData, name: string) => String(data.get(name) ?? '').trim()
export const nullableString = (data: FormData, name: string) => stringValue(data, name) || null
