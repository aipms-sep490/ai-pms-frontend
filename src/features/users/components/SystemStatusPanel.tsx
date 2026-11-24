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
  return <section className="admin-panel admin-service-status" aria-labelledby="system-status-title"><h2 id="system-status-title">Kết nối dịch vụ</h2>{info ? <p role="status">{serviceName} · Phiên bản {info.version} · {statusText}</p> : error ? <p role="alert">Chưa kết nối được dịch vụ.</p> : <p role="status">Đang kiểm tra kết nối…</p>}<Button variant="secondary" size="sm" icon="refresh" aria-label="Kiểm tra lại" onClick={() => setRevision(value => value + 1)} /></section>
}
