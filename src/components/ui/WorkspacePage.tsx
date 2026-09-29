import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import './workspace-page.css'

export function WorkspacePage({ title, description, eyebrow, backTo, action, children, className = '' }: {
  title: string; description?: string; eyebrow?: string; backTo?: string; action?: ReactNode; children: ReactNode; className?: string
}) {
  const parts = eyebrow?.split(/[•·]/)
  return <div className={`workspace-page ${className}`}>
    {backTo && <Link className="workspace-back" to={backTo}><span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>Quay lại</Link>}
    <header className="workspace-heading">
      <div className="workspace-heading-copy">
        {eyebrow && <div className="workspace-context"><span className="workspace-kicker">{parts?.[0].trim()}</span>{parts && parts.length > 1 && <span className="workspace-context-detail" title={parts.slice(1).join(' · ')}>{parts.slice(1).join(' · ')}</span>}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="workspace-heading-actions">{action}</div>}
    </header>
    {children}
  </div>
}
