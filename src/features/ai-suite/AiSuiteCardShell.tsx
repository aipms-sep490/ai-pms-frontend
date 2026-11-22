import { useState, type ReactNode } from 'react'
import { formatVnTime } from './ai-suite-api'
import type { AiSnapshotMetaDto } from './ai-suite.types'
import './ai-suite.css'

export function AiSuiteCardShell({
  icon,
  title,
  badge = 'AI Copilot',
  subtitle,
  actions,
  meta,
  markdownText,
  compact = false,
  error,
  notice,
  children,
}: {
  icon: string
  title: string
  badge?: string
  subtitle: string
  actions?: ReactNode
  meta?: AiSnapshotMetaDto | null
  markdownText?: string
  compact?: boolean
  error?: string | null
  notice?: string | null
  children?: ReactNode
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!markdownText || !navigator.clipboard) return
    try {
      await navigator.clipboard.writeText(markdownText)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard may be restricted in headless contexts
    }
  }

  return (
    <section className={`ais-card${compact ? ' ais-card--compact' : ''}`} aria-label={title}>
      <header className="ais-header">
        <div className="ais-header-left">
          <span className="ais-icon-badge" aria-hidden="true">
            <span className="material-symbols-outlined text-[20px]">{icon}</span>
          </span>
          <div className="min-w-0">
            <h3 className="ais-title">
              <span>{title}</span>
              <span className="ais-pill ais-pill--ai">{badge}</span>
            </h3>
            <p className="ais-subtitle">{subtitle}</p>
          </div>
        </div>
        {actions && <div className="ais-actions">{actions}</div>}
      </header>

      {(error || notice || children || meta) && (
        <div className="ais-body">
          {error && (
            <div role="alert" className="ais-error">
              {error}
            </div>
          )}
          {notice && (
            <div role="status" className="ais-notice">
              {notice}
            </div>
          )}
          {children}
          {meta && (
            <footer className="ais-meta-footer">
              <span>
                Nguồn: <strong>{meta.modelVersion ?? 'AI-PMS Copilot'}</strong>
                {meta.createdByName ? ` · bởi ${meta.createdByName}` : ''}
                {meta.generatedAt ? ` · ${formatVnTime(meta.generatedAt)}` : ''}
                {meta.status === 'FALLBACK' ? ' · (Chế độ dự phòng)' : ''}
              </span>
              {markdownText && (
                <button type="button" className="ais-btn" style={{ minHeight: '1.9rem', padding: '0.2rem 0.65rem' }} onClick={() => void handleCopy()}>
                  <span className="material-symbols-outlined text-[15px]" aria-hidden="true">{copied ? 'check' : 'content_copy'}</span>
                  {copied ? 'Đã sao chép' : 'Sao chép Markdown'}
                </button>
              )}
            </footer>
          )}
        </div>
      )}
    </section>
  )
}
