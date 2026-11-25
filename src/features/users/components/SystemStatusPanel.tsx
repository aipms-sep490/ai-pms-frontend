import { useEffect, useState } from 'react'
import { httpGet } from '../../../services/http/http-client'
import { Button } from '../../../components/ui/Button'
import { displayLabel } from '../../../components/ui/display-label'

export function SystemStatusPanel() {
  const [info, setInfo] = useState<{ name?: string; service?: string; version: string; status: string } | null>(null), [error, setError] = useState(false), [revision, setRevision] = useState(0)
  useEffect(() => { let active = true; setError(false); setInfo(null); httpGet<{ name?: string; service?: string; version: string; status: string }>('/system').then(value => { if (active) setInfo(value) }).catch(() => { if (active) setError(true) }); return () => { active = false } }, [revision])
  const rawName = info?.name || info?.service || 'Hệ thống AIPMS'
  const serviceName = rawName.replace(/AI-?PMS\s*API/i, 'Hệ thống AIPMS')
  const statusText = info ? (['ok', 'healthy'].includes((info.status ?? '').toLowerCase()) ? 'Đang hoạt động' : displayLabel(info.status ?? '')) : ''
  return (
    <section
      className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line-strong/65 bg-card px-4 py-2.5 shadow-2xs"
      aria-labelledby="system-status-title"
    >
      <div className="flex flex-wrap items-center gap-2.5 text-sm">
        <span
          className={`inline-block size-2.5 shrink-0 rounded-full ${error ? 'bg-status-error-text' : info ? 'bg-status-success-text' : 'bg-status-warning-text'}`}
          aria-hidden="true"
        />
        <h2 id="system-status-title" className="text-xs font-bold uppercase tracking-wider text-ink-muted">
          Kết nối dịch vụ
        </h2>
        <span className="text-hairline" aria-hidden="true">|</span>
        {info ? (
          <p role="status" className="font-medium text-ink">
            {serviceName} · Phiên bản <span className="font-mono">{info.version}</span> · <span className="font-semibold text-status-success-text">{statusText}</span>
          </p>
        ) : error ? (
          <p role="alert" className="font-medium text-status-error-text">Chưa kết nối được dịch vụ.</p>
        ) : (
          <p role="status" className="text-ink-muted">Đang kiểm tra kết nối…</p>
        )}
      </div>
      <Button variant="secondary" size="sm" icon="refresh" aria-label="Kiểm tra lại" onClick={() => setRevision(value => value + 1)} />
    </section>
  )
}
