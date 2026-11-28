import { useCallback, useEffect, useState } from 'react'
import { httpGet, httpPost } from '../../../services/http/http-client'
import { Button } from '../../../components/ui/Button'
import { displayLabel } from '../../../components/ui/display-label'

interface EmailDeliverySummary {
  pendingCount: number
  retryPendingCount: number
  sendingCount: number
  sentCount: number
  failedCount: number
  oldestPendingAtUtc: string | null
  recentFailures: Array<{ notificationRecipientId: number; notificationType: string; recipientEmail: string; attemptCount: number; lastError: string | null }>
}

export function SystemStatusPanel() {
  const [info, setInfo] = useState<{ name?: string; service?: string; version: string; status: string } | null>(null)
  const [emailSummary, setEmailSummary] = useState<EmailDeliverySummary | null>(null)
  const [retrying, setRetrying] = useState(false)
  const [retryNotice, setRetryNotice] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const [revision, setRevision] = useState(0)

  const load = useCallback(() => {
    let active = true
    setError(false)
    setInfo(null)
    httpGet<{ name?: string; service?: string; version: string; status: string }>('/system')
      .then(value => { if (active) setInfo(value) })
      .catch(() => { if (active) setError(true) })
    httpGet<EmailDeliverySummary>('/notifications/email-deliveries/summary')
      .then(value => { if (active) setEmailSummary(value) })
      .catch(() => { if (active) setEmailSummary(null) })
    return () => { active = false }
  }, [])

  useEffect(() => load(), [load, revision])

  async function retryFailedEmails() {
    if (retrying) return
    setRetrying(true)
    setRetryNotice(null)
    try {
      const res = await httpPost<{ requeuedCount: number }>('/notifications/email-deliveries/retry-failed', {})
      setRetryNotice(`Đã đưa ${res.requeuedCount} email lỗi vào hàng đợi gửi lại.`)
      setRevision(v => v + 1)
    } catch {
      setRetryNotice('Không thể kích hoạt gửi lại email ngay lúc này.')
    } finally {
      setRetrying(false)
    }
  }

  const rawName = info?.name || info?.service || 'Hệ thống AIPMS'
  const serviceName = rawName.replace(/AI-?PMS\s*API/i, 'Hệ thống AIPMS')
  const statusText = info ? (['ok', 'healthy'].includes((info.status ?? '').toLowerCase()) ? 'Đang hoạt động' : displayLabel(info.status ?? '')) : ''
  return (
    <section
      className="mt-4 space-y-2.5 rounded-xl border border-line-strong/65 bg-card px-4 py-2.5 shadow-2xs"
      aria-labelledby="system-status-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
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
      </div>
      {emailSummary && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-2 text-xs text-ink-muted">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-ink-soft">Hàng đợi Email SMTP:</span>
            <span>Đang chờ: <strong className="text-ink">{emailSummary.pendingCount + emailSummary.retryPendingCount}</strong></span>
            <span>Đã gửi: <strong className="text-status-success-text">{emailSummary.sentCount}</strong></span>
            <span>Lỗi vĩnh viễn: <strong className={emailSummary.failedCount > 0 ? 'text-status-error-text' : 'text-ink'}>{emailSummary.failedCount}</strong></span>
            {retryNotice && <span role="status" className="font-medium text-primary">{retryNotice}</span>}
          </div>
          {emailSummary.failedCount > 0 && (
            <Button variant="secondary" size="sm" disabled={retrying} onClick={() => void retryFailedEmails()}>
              {retrying ? 'Đang đưa vào hàng đợi…' : 'Thử gửi lại email lỗi'}
            </Button>
          )}
        </div>
      )}
    </section>
  )
}
