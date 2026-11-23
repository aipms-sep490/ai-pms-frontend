import { useEffect, type ReactNode } from 'react'
import { BackLink } from './BackLink'
import { useTour } from '../../features/onboarding/tour-context'
import './workspace-page.css'
import './workspace-flat.css'

export type WorkspacePageSize = 'wide' | 'standard' | 'narrow'

export function WorkspacePage({ title, description, eyebrow, backTo, backLabel = 'Quay lại', action, identity, children, className = '', guideId, size = 'wide' }: {
  title: string; description?: string; eyebrow?: string; backTo?: string; backLabel?: string; action?: ReactNode; identity?: ReactNode; children: ReactNode; className?: string; guideId?: string; size?: WorkspacePageSize
}) {
  const { setGuideId } = useTour()
  useEffect(() => {
    if (!guideId) return
    setGuideId(guideId)
    return () => setGuideId(null)
  }, [guideId, setGuideId])
  const parts = eyebrow?.split(/[•·]/)
  return <div className={`workspace-page workspace-flat workspace-page--${size} ${className}`} data-guide-id={guideId}>
    {backTo && <BackLink className="workspace-back" fallback={backTo}><span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>{backLabel}</BackLink>}
    <header className="workspace-heading">
      <div className="workspace-heading-copy">
        {eyebrow && <div className="workspace-context"><span className="workspace-kicker">{parts?.[0].trim()}</span>{parts && parts.length > 1 && <span className="workspace-context-detail" title={parts.slice(1).join(' · ')}>{parts.slice(1).join(' · ')}</span>}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="workspace-heading-actions">{action}</div>}
    </header>
    {identity}
    {children}
  </div>
}
