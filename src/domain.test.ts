import { describe, expect, it } from 'vitest'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatQuantity,
  nullableString,
  numberValue,
  productTypeLabels,
  stringValue,
  unitLabels,
} from './domain'

describe('domain formatters', () => {
  it('formats quantities with localized measurement units', () => {
    expect(formatQuantity(1234.5, 'KILOGRAM')).toBe('1.234,5 Quilograma')
    expect(formatQuantity(2)).toBe('2')
  })

  it('formats currency in Brazilian reais', () => {
    const formatted = formatCurrency(1234.5)

    expect(formatted).toContain('R$')
    expect(formatted).toContain('1.234,50')
  })

  it('formats dates and handles missing values', () => {
    expect(formatDate('2026-07-23')).toBe('23/07/2026')
    expect(formatDate(null)).toBe('—')
    expect(formatDateTime(undefined)).toBe('Aguardando')
    expect(formatDateTime('2026-07-23T10:30:00Z')).not.toBe('Aguardando')
  })

  it('maps API enum values to Portuguese labels', () => {
    expect(productTypeLabels.FINISHED_PRODUCT).toBe('Produto acabado')
    expect(unitLabels.LITER).toBe('Litro')
  })
})

describe('form value readers', () => {
  it('normalizes string and numeric fields', () => {
    const data = new FormData()
    data.set('name', '  Café especial  ')
    data.set('quantity', '12.5')

    expect(stringValue(data, 'name')).toBe('Café especial')
    expect(numberValue(data, 'quantity')).toBe(12.5)
  })

  it('returns null for an optional blank string', () => {
    const data = new FormData()
    data.set('expirationDate', '   ')

    expect(nullableString(data, 'expirationDate')).toBeNull()
  })
})
