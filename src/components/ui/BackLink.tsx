import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'

/** Use app history when available; direct links keep a safe in-app fallback. */
export function BackLink({ fallback, className, children }: { fallback: string; className?: string; children: ReactNode }) {
  const navigate = useNavigate()
  return <Link to={fallback} replace className={className} onClick={event => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
    const index: unknown = window.history.state?.idx
    if (typeof index === 'number' && index > 0) {
      event.preventDefault()
      void navigate(-1)
    }
  }}>{children}</Link>
}
