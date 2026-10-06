import { useEffect, useState } from 'react'
import { httpGet } from '../../../services/http/http-client'
import { Button } from '../../../components/ui/Button'

export function SystemStatusPanel() {
  const [info, setInfo] = useState<{ name: string; version: string; status: string } | null>(null), [error, setError] = useState(false), [revision, setRevision] = useState(0)
  useEffect(() => { let active = true; setError(false); setInfo(null); httpGet<{ name: string; version: string; status: string }>('/system').then(value => { if (active) setInfo(value) }).catch(() => { if (active) setError(true) }); return () => { active = false } }, [revision])
  return <section className="admin-panel" aria-labelledby="system-status-title"><h2 id="system-status-title">Kết nối dịch vụ</h2>{info ? <p role="status">{info.name} · Phiên bản {info.version} · {info.status === 'ok' ? 'Đang hoạt động' : info.status}</p> : error ? <p role="alert">Chưa kết nối được dịch vụ.</p> : <p role="status">Đang kiểm tra kết nối…</p>}<Button variant="secondary" onClick={() => setRevision(value => value + 1)}>Kiểm tra lại</Button></section>
}
