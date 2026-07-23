export type ProductType =
  | 'RAW_MATERIAL'
  | 'COMPONENT'
  | 'INTERMEDIATE_PRODUCT'
  | 'FINISHED_PRODUCT'
  | 'KIT'
  | 'SERVICE'

export type MeasurementUnit =
  | 'UNIT'
  | 'KILOGRAM'
  | 'GRAM'
  | 'LITER'
  | 'MILLILITER'
  | 'METER'
  | 'CENTIMETER'
  | 'SQUARE_METER'
  | 'CUBIC_METER'
  | 'BOX'
  | 'PACKAGE'

export type InventoryLotStatus = 'AVAILABLE' | 'DEPLETED' | 'EXPIRED' | 'BLOCKED'

export type InventoryMovementType =
  | 'ENTRY'
  | 'EXIT'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'PRODUCTION_CONSUMPTION'
  | 'PRODUCTION_ENTRY'

export type ProductionOrderStatus = 'CREATED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export interface ProductComponent {
  id: number
  componentProductId: number
  componentProductName: string
  componentProductSku: string
  quantity: number
  measurementUnit: MeasurementUnit
  createdAt: string
  updatedAt: string
}

export interface Product {
  id: number
  name: string
  description: string | null
  sku: string
  type: ProductType
  defaultMeasurementUnit: MeasurementUnit
  active: boolean
  createdAt: string
  updatedAt: string
  version: number
  components: ProductComponent[]
}

export interface CreateProductRequest {
  name: string
  description: string | null
  type: ProductType
  defaultMeasurementUnit: MeasurementUnit
  active: boolean
}

export interface UpdateProductRequest {
  name: string
  description: string | null
  type: ProductType
  defaultMeasurementUnit: MeasurementUnit
  active: boolean
}

export interface ProductSearchResult {
  id: number
  name: string
  sku: string
  type: ProductType
  defaultMeasurementUnit: MeasurementUnit
  active: boolean
  score: number
}

export interface OffsetPage<T> {
  content: T[]
  offset: number
  limit: number
  totalElements: number
  hasPrevious: boolean
  hasNext: boolean
}

export interface CompositionNode {
  compositionId: number
  productId: number
  name: string
  sku: string
  quantity: number
  measurementUnit: MeasurementUnit
  components: CompositionNode[]
}

export interface ProductCompositionTree {
  productId: number
  name: string
  sku: string
  type: ProductType
  defaultMeasurementUnit: MeasurementUnit
  components: CompositionNode[]
}

export interface InventoryAvailability {
  productId: number
  productName: string
  productSku: string
  measurementUnit: MeasurementUnit
  availableQuantity: number
  referenceDate: string
}

export interface InventoryProductSummary {
  productId: number
  productName: string
  productSku: string
  defaultMeasurementUnit: MeasurementUnit
  active: boolean
  availableQuantity: number
  lotCount: number
  referenceDate: string
}

export interface InventoryLot {
  id: number
  productId: number
  productName: string
  productSku: string
  lotNumber: string
  manufactureDate: string | null
  expirationDate: string | null
  initialQuantity: number
  availableQuantity: number
  unitCost: number
  status: InventoryLotStatus
  createdAt: string
  updatedAt: string
  version: number
}

export interface InventoryMovement {
  id: number
  inventoryLotId: number
  lotNumber: string
  productId: number
  type: InventoryMovementType
  quantity: number
  resultingQuantity: number
  referenceType: string | null
  referenceId: number | null
  description: string | null
  occurredAt: string
  createdBy: string
}

export interface InventoryConsumptionLot {
  lotId: number
  lotNumber: string
  expirationDate: string | null
  quantity: number
  resultingQuantity: number
  status: InventoryLotStatus
  movementId: number
}

export interface InventoryConsumption {
  productId: number
  productName: string
  productSku: string
  requestedQuantity: number
  consumedQuantity: number
  measurementUnit: MeasurementUnit
  referenceDate: string
  lots: InventoryConsumptionLot[]
}

export interface ProductionOrder {
  id: number
  productId: number
  productName: string
  productSku: string
  quantityToProduce: number
  measurementUnit: MeasurementUnit
  status: ProductionOrderStatus
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  version: number
}

export interface ProducedLot {
  id: number
  inventoryLotId: number
  lotNumber: string
  producedQuantity: number
  measurementUnit: MeasurementUnit
  status: InventoryLotStatus
  manufactureDate: string | null
  expirationDate: string | null
  createdAt: string
}

export interface ProductionConsumption {
  id: number
  componentProductId: number
  componentProductName: string
  componentProductSku: string
  consumedLotId: number
  consumedLotNumber: string
  consumedQuantity: number
  measurementUnit: MeasurementUnit
  createdAt: string
}

export interface ProductionResult {
  order: ProductionOrder
  producedLot: ProducedLot | null
  consumptions: ProductionConsumption[]
}

export interface ValidationError {
  field: string
  message: string
}

export interface ApiProblem {
  type?: string
  title?: string
  status?: number
  detail?: string
  instance?: string
  code?: string
  timestamp?: string
  errors?: ValidationError[]
}
