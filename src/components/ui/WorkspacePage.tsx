import { useEffect, type ReactNode } from 'react'
import { BackLink } from './BackLink'
import { useTour } from '../../features/onboarding/tour-context'
import './workspace-page.css'
import './workspace-flat.css'

export function WorkspacePage({ title, description, eyebrow, backTo, action, identity, children, className = '', guideId }: {
  title: string; description?: string; eyebrow?: string; backTo?: string; action?: ReactNode; identity?: ReactNode; children: ReactNode; className?: string; guideId?: string
}) {
  const { setGuideId } = useTour()
  useEffect(() => {
    if (!guideId) return
    setGuideId(guideId)
    return () => setGuideId(null)
  }, [guideId, setGuideId])
  const parts = eyebrow?.split(/[•·]/)
  return <div className={`workspace-page workspace-flat ${className}`} data-guide-id={guideId}>
    {backTo && <BackLink className="workspace-back" fallback={backTo}><span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>Quay lại</BackLink>}
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
