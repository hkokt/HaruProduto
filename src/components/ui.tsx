import { AlertTriangle, LoaderCircle, Search, X } from 'lucide-react'
import {
  useId,
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react'

interface PageHeaderProps {
  eyebrow: string
  title: string
  description: string
  action?: ReactNode
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  name: string
}

interface SelectOption {
  value: string
  label: string
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  name: string
  options: SelectOption[]
  emptyLabel?: string
}

interface SearchCardProps {
  label: string
  placeholder: string
  note?: string
  value: string
  loading?: boolean
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode']
  inputType?: 'number' | 'search'
  maxLength?: number
  required?: boolean
  onChange: (value: string) => void
  onSearch: () => void
}

interface EmptyStateProps {
  icon: ReactNode
  title: string
  text: string
}

interface ErrorStateProps {
  error: unknown
  compact?: boolean
}

interface LoadingStateProps {
  text?: string
}

interface SuccessAlertProps {
  children: ReactNode
}

interface DetailProps {
  label: string
  value: ReactNode
}

type StatusTone = 'success' | 'info' | 'warning' | 'danger' | 'neutral'

interface StatusBadgeProps {
  label: string
  tone: StatusTone
}

interface ModalProps {
  title: string
  subtitle: string
  children: ReactNode
  onClose: () => void
  onSubmit: (data: FormData) => void
  pending?: boolean
  submitDisabled?: boolean
  error?: unknown
  submitLabel?: string
}

interface ConfirmModalProps {
  title: string
  description: string
  confirmLabel: string
  onClose: () => void
  onConfirm: () => void
  pending?: boolean
  error?: unknown
}

interface TableProps {
  headers: string[]
  rows: ReactNode[][]
}

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  )
}

export function Field({ label, name, ...props }: FieldProps) {
  return (
    <label className="field">
      <span>
        {label}
        {props.required && <b> *</b>}
      </span>
      <input name={name} {...props} />
    </label>
  )
}

export function SelectField({
  label,
  name,
  options,
  emptyLabel = 'Selecione',
  ...props
}: SelectFieldProps) {
  return (
    <label className="field">
      <span>
        {label}
        {props.required && <b> *</b>}
      </span>
      <select name={name} {...props}>
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function SearchCard({
  label,
  placeholder,
  note,
  value,
  loading,
  inputMode = 'numeric',
  inputType = 'number',
  maxLength,
  required = false,
  onChange,
  onSearch,
}: SearchCardProps) {
  const inputId = useId()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSearch()
  }

  return (
    <form className="search-card" onSubmit={handleSubmit}>
      <div>
        <label htmlFor={inputId}>{label}</label>
        <div className="search-input">
          <div className="search-control">
            <Search size={19} aria-hidden="true" />
            <input
              id={inputId}
              name="search"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder={placeholder}
              inputMode={inputMode}
              min={inputType === 'number' ? '1' : undefined}
              maxLength={maxLength}
              type={inputType}
              required={required}
            />
          </div>
          <button
            type="submit"
            className="button button-dark search-submit"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? (
              <>
                <LoaderCircle className="spin" size={17} /> Buscando
              </>
            ) : (
              'Consultar'
            )}
          </button>
        </div>
        {note && <small>{note}</small>}
      </div>
    </form>
  )
}

export function EmptyState({ icon, title, text }: EmptyStateProps) {
  return (
    <section className="empty-state">
      <div>{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </section>
  )
}

export function ErrorState({ error, compact = false }: ErrorStateProps) {
  const message = error instanceof Error ? error.message : 'Não foi possível carregar os dados.'

  return (
    <div role="alert" className={compact ? 'alert alert-error' : 'error-state'}>
      <AlertTriangle size={20} />
      <div>
        <strong>Algo deu errado</strong>
        <span>{message}</span>
      </div>
    </div>
  )
}

export function LoadingState({ text = 'Carregando dados…' }: LoadingStateProps) {
  return (
    <div role="status" aria-live="polite" className="loading-state">
      <LoaderCircle className="spin" size={24} />
      <span>{text}</span>
    </div>
  )
}

export function SuccessAlert({ children }: SuccessAlertProps) {
  return <div className="alert alert-success">{children}</div>
}

export function Detail({ label, value }: DetailProps) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

export function StatusBadge({ label, tone }: StatusBadgeProps) {
  return <span className={`status status-${tone}`}>{label}</span>
}

export function Modal({
  title,
  subtitle,
  children,
  onClose,
  onSubmit,
  pending,
  submitDisabled,
  error,
  submitLabel = 'Salvar',
}: ModalProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit(new FormData(event.currentTarget))
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="modal" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </header>
        <form onSubmit={handleSubmit}>
          {Boolean(error) && <ErrorState error={error} compact />}
          {children}
          <footer>
            <button
              type="button"
              className="button button-secondary"
              onClick={onClose}
              disabled={pending}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="button button-primary"
              disabled={pending || submitDisabled}
            >
              {pending && <LoaderCircle className="spin" size={16} />}
              {submitLabel}
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}

export function ConfirmModal({
  title,
  description,
  confirmLabel,
  onClose,
  onConfirm,
  pending,
  error,
}: ConfirmModalProps) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="modal modal-small" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </header>
        <div className="confirm-body">
          {Boolean(error) && <ErrorState error={error} compact />}
          <div className="inline-warning">
            <AlertTriangle size={18} />
            <span>Confirme esta ação antes de continuar.</span>
          </div>
        </div>
        <footer className="standalone-footer">
          <button
            type="button"
            className="button button-secondary"
            onClick={onClose}
            disabled={pending}
          >
            Voltar
          </button>
          <button
            type="button"
            className="button button-danger-solid"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending && <LoaderCircle className="spin" size={16} />}
            {confirmLabel}
          </button>
        </footer>
      </section>
    </div>
  )
}

export function Table({ headers, rows }: TableProps) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
