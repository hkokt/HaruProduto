import { ChevronLeft, ChevronRight } from 'lucide-react'

interface OffsetPaginationProps {
  offset: number
  limit: number
  totalElements: number
  hasPrevious: boolean
  hasNext: boolean
  resultWindowLimit?: number
  ariaLabel: string
  onOffsetChange: (offset: number) => void
  onLimitChange: (limit: number) => void
}

const limitOptions = [10, 20, 50]

export function OffsetPagination({
  offset,
  limit,
  totalElements,
  hasPrevious,
  hasNext,
  resultWindowLimit,
  ariaLabel,
  onOffsetChange,
  onLimitChange,
}: OffsetPaginationProps) {
  const accessibleTotal = resultWindowLimit
    ? Math.min(totalElements, resultWindowLimit)
    : totalElements
  const hasLimitedWindow = accessibleTotal < totalElements
  const firstElement = accessibleTotal === 0 ? 0 : offset + 1
  const lastElement = Math.min(offset + limit, accessibleTotal)
  const currentPage = accessibleTotal === 0 ? 0 : Math.floor(offset / limit) + 1
  const totalPages = accessibleTotal === 0 ? 0 : Math.ceil(accessibleTotal / limit)

  return (
    <nav className="pagination" aria-label={ariaLabel}>
      <label className="pagination-limit">
        <span>Itens por página</span>
        <select
          value={limit}
          onChange={(event) => onLimitChange(Number(event.target.value))}
          aria-label={`Itens por página — ${ariaLabel}`}
        >
          {limitOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <span className="pagination-summary" aria-live="polite">
        {firstElement}–{lastElement} de {accessibleTotal}
        {hasLimitedWindow && ` acessíveis (${totalElements} encontrados)`}
        {totalPages > 0 && ` · Página ${currentPage} de ${totalPages}`}
      </span>
      <div className="pagination-actions">
        <button
          type="button"
          disabled={!hasPrevious}
          onClick={() => onOffsetChange(Math.max(0, offset - limit))}
          aria-label="Ir para a página anterior"
        >
          <ChevronLeft size={16} aria-hidden="true" /> Anterior
        </button>
        <button
          type="button"
          disabled={!hasNext}
          onClick={() => onOffsetChange(offset + limit)}
          aria-label="Ir para a próxima página"
        >
          Próxima <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </nav>
  )
}
