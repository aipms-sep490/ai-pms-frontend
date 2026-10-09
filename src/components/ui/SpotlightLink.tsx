import { Link, type LinkProps } from 'react-router-dom'
import type { MouseEvent } from 'react'
import './interaction-polish.css'

/** Adapted from React Bits SpotlightCard; see THIRD_PARTY_UI_NOTICES.md. */
const areaIcons: Record<string, string> = { tasks: 'checklist', milestones: 'flag', gantt: 'view_timeline', reports: 'assignment', progress: 'rate_review', deliverables: 'inventory_2', files: 'folder_open', meetings: 'calendar_month', contributions: 'groups', 'final-submission': 'verified', evaluations: 'grading', ai: 'auto_awesome', portfolio: 'folder_special', supervisors: 'school', topics: 'lightbulb' }

export function SpotlightLink({ className = '', onMouseMove, children, ...props }: LinkProps) {
  const track = (event: MouseEvent<HTMLAnchorElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    event.currentTarget.style.setProperty('--mouse-x', `${event.clientX - rect.left}px`)
    event.currentTarget.style.setProperty('--mouse-y', `${event.clientY - rect.top}px`)
    onMouseMove?.(event)
  }
  const path = typeof props.to === 'string' ? props.to.split('?')[0].split('/').filter(Boolean).at(-1) : ''
  const icon = areaIcons[path ?? ''] ?? 'space_dashboard'
  return <Link {...props} onMouseMove={track} className={`workspace-spotlight ${className}`}><span className="workspace-feature-icon material-symbols-outlined" aria-hidden="true">{icon}</span><span className="workspace-feature-watermark material-symbols-outlined" aria-hidden="true">{icon}</span>{children}</Link>
}
