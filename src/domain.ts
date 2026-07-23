import type {
  InventoryLotStatus,
  InventoryMovementType,
  MeasurementUnit,
  ProductType,
  ProductionOrderStatus,
} from './api/types'

interface SelectOption<T extends string> {
  value: T
  label: string
}

export const productTypeOptions: SelectOption<ProductType>[] = [
  { value: 'RAW_MATERIAL', label: 'Matéria-prima' },
  { value: 'COMPONENT', label: 'Componente' },
  { value: 'INTERMEDIATE_PRODUCT', label: 'Produto intermediário' },
  { value: 'FINISHED_PRODUCT', label: 'Produto acabado' },
  { value: 'KIT', label: 'Kit' },
  { value: 'SERVICE', label: 'Serviço' },
]

export const unitOptions: SelectOption<MeasurementUnit>[] = [
  { value: 'UNIT', label: 'Unidade' },
  { value: 'KILOGRAM', label: 'Quilograma' },
  { value: 'GRAM', label: 'Grama' },
  { value: 'LITER', label: 'Litro' },
  { value: 'MILLILITER', label: 'Mililitro' },
  { value: 'METER', label: 'Metro' },
  { value: 'CENTIMETER', label: 'Centímetro' },
  { value: 'SQUARE_METER', label: 'Metro quadrado' },
  { value: 'CUBIC_METER', label: 'Metro cúbico' },
  { value: 'BOX', label: 'Caixa' },
  { value: 'PACKAGE', label: 'Pacote' },
]

export const productTypeLabels = Object.fromEntries(
  productTypeOptions.map(({ value, label }) => [value, label]),
) as Record<ProductType, string>

export const unitLabels = Object.fromEntries(
  unitOptions.map(({ value, label }) => [value, label]),
) as Record<MeasurementUnit, string>

export const lotStatusLabels: Record<InventoryLotStatus, string> = {
  AVAILABLE: 'Disponível',
  DEPLETED: 'Esgotado',
  EXPIRED: 'Vencido',
  BLOCKED: 'Bloqueado',
}

export const movementTypeLabels: Record<InventoryMovementType, string> = {
  ENTRY: 'Entrada',
  EXIT: 'Saída',
  ADJUSTMENT_IN: 'Ajuste de entrada',
  ADJUSTMENT_OUT: 'Ajuste de saída',
  PRODUCTION_CONSUMPTION: 'Consumo de produção',
  PRODUCTION_ENTRY: 'Entrada de produção',
}

export const orderStatusOptions: SelectOption<ProductionOrderStatus>[] = [
  { value: 'CREATED', label: 'Criada' },
  { value: 'IN_PROGRESS', label: 'Em andamento' },
  { value: 'COMPLETED', label: 'Concluída' },
  { value: 'CANCELLED', label: 'Cancelada' },
]

export const orderStatusLabels = Object.fromEntries(
  orderStatusOptions.map(({ value, label }) => [value, label]),
) as Record<ProductionOrderStatus, string>

export function formatQuantity(value: number, unit?: MeasurementUnit) {
  const formattedValue = new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 6,
  }).format(value)
  return `${formattedValue}${unit ? ` ${unitLabels[unit]}` : ''}`
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value)
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '—'

  const normalizedValue = value.length === 10 ? `${value}T00:00:00Z` : value
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(normalizedValue))
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Aguardando'

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function numberValue(data: FormData, name: string) {
  return Number(data.get(name))
}

export function stringValue(data: FormData, name: string) {
  return String(data.get(name) ?? '').trim()
}

export function nullableString(data: FormData, name: string) {
  return stringValue(data, name) || null
}
