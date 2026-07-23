import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import { AlertTriangle, LoaderCircle, Search, X } from 'lucide-react'

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <header className="page-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</header>
}

export function Field({ label, name, ...props }: { label: string; name: string } & InputHTMLAttributes<HTMLInputElement>) {
  return <label className="field"><span>{label}{props.required && <b> *</b>}</span><input name={name} {...props} /></label>
}

export function SelectField({ label, name, options, ...props }: { label: string; name: string; options: { value: string; label: string }[] } & SelectHTMLAttributes<HTMLSelectElement>) {
  return <label className="field"><span>{label}{props.required && <b> *</b>}</span><select name={name} {...props}><option value="">Selecione</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
}

export function SearchCard({ label, placeholder, note, value, loading, onChange, onSearch }: { label: string; placeholder: string; note?: string; value: string; loading?: boolean; onChange: (value: string) => void; onSearch: () => void }) {
  return <form className="search-card" onSubmit={(event) => { event.preventDefault(); onSearch() }}><div><label>{label}</label><div className="search-input"><Search size={19} /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} inputMode="numeric" min="1" type="number" required /><button className="button button-dark" disabled={loading}>{loading ? <LoaderCircle className="spin" size={17} /> : 'Consultar'}</button></div>{note && <small>{note}</small>}</div></form>
}

export function EmptyState({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <section className="empty-state"><div>{icon}</div><h3>{title}</h3><p>{text}</p></section>
}

export function ErrorState({ error, compact = false }: { error: unknown; compact?: boolean }) {
  const message = error instanceof Error ? error.message : 'Não foi possível carregar os dados.'
  return <div className={compact ? 'alert alert-error' : 'error-state'}><AlertTriangle size={20} /><div><strong>Algo deu errado</strong><span>{message}</span></div></div>
}

export function LoadingState({ text = 'Carregando dados…' }: { text?: string }) {
  return <div className="loading-state"><LoaderCircle className="spin" size={24} /><span>{text}</span></div>
}

export function SuccessAlert({ children }: { children: ReactNode }) { return <div className="alert alert-success">{children}</div> }

export function Detail({ label, value }: { label: string; value: ReactNode }) { return <div><dt>{label}</dt><dd>{value}</dd></div> }

export function StatusBadge({ label, tone }: { label: string; tone: 'success' | 'info' | 'warning' | 'danger' | 'neutral' }) { return <span className={`status status-${tone}`}>{label}</span> }

export function Modal({ title, subtitle, children, onClose, onSubmit, pending, error, submitLabel = 'Salvar' }: { title: string; subtitle: string; children: ReactNode; onClose: () => void; onSubmit: (data: FormData) => void; pending?: boolean; error?: unknown; submitLabel?: string }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal" onMouseDown={(event) => event.stopPropagation()}><header><div><h2>{title}</h2><p>{subtitle}</p></div><button type="button" className="icon-button" onClick={onClose} aria-label="Fechar"><X size={20} /></button></header><form onSubmit={(event) => { event.preventDefault(); onSubmit(new FormData(event.currentTarget)) }}>{Boolean(error) && <ErrorState error={error} compact />}{children}<footer><button type="button" className="button button-secondary" onClick={onClose} disabled={pending}>Cancelar</button><button type="submit" className="button button-primary" disabled={pending}>{pending && <LoaderCircle className="spin" size={16} />}{submitLabel}</button></footer></form></section></div>
}

export function ConfirmModal({ title, description, confirmLabel, onClose, onConfirm, pending, error }: { title: string; description: string; confirmLabel: string; onClose: () => void; onConfirm: () => void; pending?: boolean; error?: unknown }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal modal-small" onMouseDown={(event) => event.stopPropagation()}><header><div><h2>{title}</h2><p>{description}</p></div><button className="icon-button" onClick={onClose}><X size={20} /></button></header><div className="confirm-body">{Boolean(error) && <ErrorState error={error} compact />}<div className="inline-warning"><AlertTriangle size={18} /><span>Confirme esta ação antes de continuar.</span></div></div><footer className="standalone-footer"><button className="button button-secondary" onClick={onClose} disabled={pending}>Voltar</button><button className="button button-danger-solid" onClick={onConfirm} disabled={pending}>{pending && <LoaderCircle className="spin" size={16} />}{confirmLabel}</button></footer></section></div>
}

export function Table({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) { return <div className="table-scroll"><table><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div> }
