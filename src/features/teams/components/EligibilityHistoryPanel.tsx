import { dateTimeLabel } from '../../execution/execution-utils'
import { useRef, useState } from 'react'
import * as api from '../team-eligibility-api'
import { HttpError } from '../../../services/http/http-client'
import { Button } from '../../../components/ui/Button'
import { Pagination, StatusBadge, useClientPagination } from '../../../components/ui'
import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'

export function EligibilityHistoryPanel({ teamId, canCheck, canLock, onChanged }: { teamId: number; canCheck: boolean; canLock: boolean; onChanged: () => void }) {
  const [latest, setLatest] = useState<api.EligibilityCheck | null>(null)
  const [history, setHistory] = useState<api.EligibilityCheck[]>([])
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()
  const pagination = useClientPagination(history, 8)

  async function load() {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError('')
    try {
      const [current, checks] = await Promise.all([
        api.getEligibilityCheck(teamId).catch(reason => { if (reason instanceof HttpError && reason.status === 404) return null; throw reason }),
        api.getEligibilityHistory(teamId),
      ])
      setLatest(current)
      setHistory(checks)
      setLoaded(true)
    } catch {
      setError('Chưa tải được lịch sử kiểm tra điều kiện. Hãy thử lại.')
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  async function run(shouldLock: boolean) {
    if (lock.current) return
    if (shouldLock && await requestConfirmation({ title: 'Chốt danh sách nhóm?', description: 'Danh sách thành viên và phạm vi chuyên ngành sẽ được khóa. Hệ thống kiểm tra lại điều kiện trước khi chốt.', confirmLabel: 'Chốt nhóm' }) === null) return
    lock.current = true
    setBusy(true)
    setError('')
    try {
      if (shouldLock) await api.lockEligibility(teamId)
      else setLatest(await api.checkEligibility(teamId))
      onChanged()
      setHistory(await api.getEligibilityHistory(teamId))
      setLoaded(true)
    } catch (reason) {
      setError(reason instanceof HttpError && reason.status === 409 ? 'Điều kiện nhóm vừa thay đổi. Kiểm tra lại trước khi chốt nhóm.' : 'Chưa thực hiện được thao tác. Kiểm tra quyền và điều kiện nhóm rồi thử lại.')
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  return (
    <details
      className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs"
      onToggle={event => { if (event.currentTarget.open && !loaded && !busy) void load() }}
    >
      <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-2 bg-canvas/70 px-5 py-3.5 text-sm font-bold text-ink">
        <span className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">history</span>
          Lịch sử kiểm tra điều kiện nhóm
        </span>
        {loaded && (
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary-subtle px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums text-primary">
            {history.length}
          </span>
        )}
      </summary>
      {confirmationDialog}
      <div className="space-y-4 border-t border-hairline p-5">
        {error && <p role="alert" className="text-sm text-status-error-text">{error}</p>}
        {busy && <p role="status" className="text-sm text-ink-muted">Đang xử lý…</p>}
        <div className="flex flex-wrap gap-2.5">
          <Button variant="secondary" className="min-h-11" disabled={busy} onClick={() => void load()}>Tải lại</Button>
          {canCheck && <Button className="min-h-11" disabled={busy} onClick={() => void run(false)}>Kiểm tra điều kiện</Button>}
          {canLock && <Button className="min-h-11" disabled={busy || latest?.result !== 'PASS'} onClick={() => void run(true)}>Chốt nhóm</Button>}
        </div>
        {latest && (
          <p className="rounded-lg border border-hairline bg-canvas px-3.5 py-2.5 text-sm text-ink-soft">
            Lần gần nhất: <strong className="text-ink">{latest.result === 'PASS' ? 'Đủ điều kiện' : 'Chưa đủ điều kiện'}</strong> · {dateTimeLabel(latest.checkedAt)} {latest.freshness === 'STALE' && '· Cần kiểm tra lại'}
          </p>
        )}
        <ul className="divide-y divide-hairline text-sm">
          {pagination.paginatedItems.map(item => (
            <li key={item.checkId} className="space-y-2 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-ink">{item.result === 'PASS' ? 'Đủ điều kiện' : 'Chưa đủ điều kiện'}</strong>
                <StatusBadge tone={item.result === 'PASS' ? 'success' : 'warning'} label={item.result === 'PASS' ? 'Đạt' : 'Cần bổ sung'} />
              </div>
              <p className="text-xs text-ink-muted">{dateTimeLabel(item.checkedAt)} · Chính sách {item.policyVersion}</p>
              {item.issues.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-xs text-ink-soft">
                  {item.issues.map(issue => <li key={issue.id}>{issue.message}</li>)}
                </ul>
              )}
            </li>
          ))}
        </ul>
        {pagination.showPagination && (
          <div className="border-t border-hairline pt-3">
            <Pagination
              page={pagination.page}
              pages={pagination.totalPages}
              total={pagination.total}
              pageSize={pagination.pageSize}
              onPage={pagination.setPage}
            />
          </div>
        )}
        {loaded && !history.length && <p className="text-sm text-ink-muted">Chưa có lần kiểm tra nào được lưu.</p>}
      </div>
    </details>
  )
}
