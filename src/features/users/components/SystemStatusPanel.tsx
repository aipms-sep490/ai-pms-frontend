import { useEffect, useState } from 'react'
import { httpGet } from '../../../services/http/http-client'
import { Button } from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { displayLabel } from '../../../components/ui/display-label'

export function SystemStatusPanel() {
  const [info, setInfo] = useState<{ name?: string; service?: string; version: string; status: string } | null>(null)
  const [error, setError] = useState(false)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    let active = true
    setError(false)
    setInfo(null)
    httpGet<{ name?: string; service?: string; version: string; status: string }>('/system')
      .then(value => { if (active) setInfo(value) })
      .catch(() => { if (active) setError(true) })
    return () => { active = false }
  }, [revision])

  const serviceName = info?.name || info?.service || 'AIPMS API'
  const healthy = info ? ['ok', 'healthy'].includes((info.status ?? '').toLowerCase()) : false
  const statusText = info ? (healthy ? 'Đang hoạt động' : info.status ? displayLabel(info.status) : 'Không xác định') : ''

  return (
    <section className="admin-panel admin-service-status" aria-labelledby="system-status-title">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">dns</span>
        <h2 id="system-status-title" className="text-sm font-bold text-ink">Kết nối dịch vụ</h2>
      </div>
      {info ? (
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={healthy ? 'success' : 'warning'} label={statusText} />
          <p role="status" className="text-sm text-ink-soft">{serviceName} · Phiên bản {info.version} · {statusText}</p>
        </div>
      ) : error ? (
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone="danger" label="Mất kết nối" />
          <p role="alert">Chưa kết nối được dịch vụ.</p>
        </div>
      ) : (
        <p role="status">Đang kiểm tra kết nối…</p>
      )}
      <Button size="sm" variant="secondary" icon="refresh" onClick={() => setRevision(value => value + 1)}>Kiểm tra lại</Button>
    </section>
  )
}
