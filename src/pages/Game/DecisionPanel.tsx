import type { ReactNode } from 'react'
import { ArrowIcon } from '../../components/icons'

interface Option {
  id: string
  label: string
  description: string
  meta?: string
}

interface DecisionPanelProps {
  title: string
  description: string
  options?: Option[]
  selected?: string
  onSelect?: (id: string) => void
  actionLabel?: string
  onAction?: () => void
  actionDisabled?: boolean
  children?: ReactNode
  tone?: 'default' | 'warning' | 'gold'
}

export function DecisionPanel({ title, description, options, selected, onSelect, actionLabel, onAction, actionDisabled, children, tone = 'default' }: DecisionPanelProps) {
  return (
    <section className={`decision-panel tone-${tone}`}>
      <header><h2>{title}</h2><p>{description}</p></header>
      {options && (
        <div className="decision-options">
          {options.map((option) => (
            <button key={option.id} className={selected === option.id ? 'is-selected' : ''} onClick={() => onSelect?.(option.id)} aria-pressed={selected === option.id}>
              <span className="radio-mark"><i /></span>
              <span><strong>{option.label}</strong><small>{option.description}</small></span>
              {option.meta && <b>{option.meta}</b>}
            </button>
          ))}
        </div>
      )}
      {children}
      {actionLabel && <button className="panel-action" onClick={onAction} disabled={actionDisabled}>{actionLabel}<ArrowIcon /></button>}
    </section>
  )
}
