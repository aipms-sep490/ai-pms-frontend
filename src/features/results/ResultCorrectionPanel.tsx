import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { displayLabel } from '../../components/ui/display-label'
import { Pagination } from '../../components/ui/Pagination'
import { useClientPagination } from '../../components/ui/useClientPagination'
import { useAuthSession } from '../auth/context/useAuthSession'
import { evaluationStageLabel } from '../evaluations/evaluation-types'
import { getStudentResult } from '../../services/api/project-results.api'
import { readAllPages } from '../../services/api/paged-read'
import { HttpError } from '../../services/http/http-client'
import type { StudentResult } from './result-types'
import type { PagedResult } from '../../types/backend'
import * as api from './result-correction-api'
import { AppealRequestDetail } from './AppealRequestDetail'
import { appealError, appealInputClass, AppealPaging, correctionStatusLabel } from './appeal-ui'
import { ResultHistoryPanel } from './ResultHistoryPanel'

/** FE1 can keep its existing projectId-only integration; identity comes from the shared session. */
export function ResultCorrectionPanel({ projectId }: { projectId: number }) {
  const { session } = useAuthSession()
  const studentId = session?.user.id
  return studentId ? <StudentAppealPanel key={projectId + ':' + studentId} projectId={projectId} studentId={studentId} /> : <p role="alert" className="rounded-lg border border-status-warning-border bg-status-warning-bg p-4 text-sm text-status-warning-text">Cần đăng nhập để xem phúc khảo.</p>
}

export function StudentAppealPanel({ projectId, studentId }: { projectId: number; studentId: number }) {
  const [requests, setRequests] = useState<PagedResult<api.ResultCorrectionRequest> | null>(null)
  const [windows, setWindows] = useState<api.AppealWindow[]>([]), [result, setResult] = useState<StudentResult | null>(null)
  const [page, setPage] = useState(1), [revision, setRevision] = useState(0), [loading, setLoading] = useState(true)
  const [error, setError] = useState(''), [reason, setReason] = useState(''), [componentId, setComponentId] = useState(''), [windowId, setWindowId] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null), [busy, setBusy] = useState(false), [stale, setStale] = useState(false)
  const lock = useRef(false)
  useEffect(() => {
    const abort = new AbortController(); setLoading(true); setRequests(null); setWindows([]); setResult(null)
    Promise.all([api.getResultCorrectionRequests(projectId, page, abort.signal), readAllPages(p => api.getAppealWindows(projectId, p, abort.signal)), getStudentResult(projectId, studentId, abort.signal)])
      .then(([list, periods, published]) => { if (!abort.signal.aborted) { setRequests(list); setWindows(periods); setResult(published) } })
      .catch(cause => { if (!abort.signal.aborted) setError(appealError(cause)) })
      .finally(() => { if (!abort.signal.aborted) setLoading(false) })
    return () => abort.abort()
  }, [projectId, studentId, page, revision])
  const available = windows.filter(window => window.status === 'OPEN' && window.targets.some(target => target.targetType === 'STUDENT' && target.studentId === studentId && target.resultVersion === result?.version))
  const window = available.find(item => item.id === Number(windowId))
  const components = result?.breakdown?.components.filter(item => item.weightPercent > 0) ?? []
  const component = components.find(item => item.componentId === Number(componentId))
  async function submit() {
    if (lock.current || loading || stale || !window || !component || !result || !reason.trim()) return
    lock.current = true; setBusy(true); setError('')
    try {
      const next = await api.submitResultCorrectionRequest(projectId, { source: 'STUDENT_APPEAL', policyId: window.policyId, windowId: window.id, targetType: 'STUDENT', studentId, resultVersion: result.version, componentId: component.componentId, reason: reason.trim() })
      setSelectedId(next.id); setReason(''); setRevision(value => value + 1)
    } catch (cause) {
      if (cause instanceof HttpError && cause.status === 409) { setStale(true); setRevision(value => value + 1) }
      setError(appealError(cause))
    } finally { lock.current = false; setBusy(false) }
  }
  const requestItems = useMemo(() => requests?.items ?? [], [requests])
  const requestPagination = useClientPagination(requestItems, 8)
  const displayedRequests = (requests?.totalCount ?? 0) > 20 ? requestItems : requestPagination.paginatedItems

  return <section className="space-y-5" aria-label="Phúc khảo cá nhân">
    <div className="overflow-hidden rounded-2xl border border-hairline bg-card shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
        <div>
          <h2 className="font-semibold text-ink">Phúc khảo / đính chính kết quả</h2>
          <p className="mt-0.5 text-xs text-ink-muted">Yêu cầu gắn với đúng sinh viên, thành phần và phiên bản đã công bố. Điểm chính thức do hệ thống quyết định.</p>
        </div>
        <Button variant="secondary" disabled={busy || loading} onClick={() => { setError(''); setRevision(value => value + 1) }}>Tải lại phúc khảo</Button>
      </div>
      <div className="space-y-4 p-5">
        {error && <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">{error}</p>}
        {loading && <p role="status" className="text-sm text-ink-muted">Đang tải phúc khảo…</p>}
        {stale && <Button disabled={loading || busy || !requests} onClick={() => { setStale(false); setError('') }}>Tôi đã đối chiếu dữ liệu mới</Button>}
        {!loading && requests && (
          <div className="space-y-5">
            <form onSubmit={event => { event.preventDefault(); void submit() }} className="space-y-3">
              <fieldset disabled={busy || stale} className="space-y-3">
                <label className="block text-sm font-medium text-ink-soft">Đợt phúc khảo<select required value={windowId} onChange={event => setWindowId(event.target.value)} className={appealInputClass}><option value="">Chọn đợt đúng phiên bản</option>{available.map(item => <option key={item.id} value={item.id}>Đợt #{item.id} · đến {new Date(item.closesAt).toLocaleString('vi-VN')}</option>)}</select></label>
                <label className="block text-sm font-medium text-ink-soft">Thành phần kết quả<select required value={componentId} onChange={event => setComponentId(event.target.value)} className={appealInputClass}><option value="">Chọn thành phần</option>{components.map(item => <option key={item.componentId} value={item.componentId}>{item.name} · {displayLabel(item.scope)} · {evaluationStageLabel(item.stage)}</option>)}</select></label>
                <label className="block text-sm font-medium text-ink-soft">Lý do phúc khảo<textarea required maxLength={2000} value={reason} onChange={event => setReason(event.target.value)} className={appealInputClass} /></label>
                <Button type="submit" disabled={!window || !component || !reason.trim()}>Gửi yêu cầu phúc khảo</Button>
              </fieldset>
            </form>
            {available.length === 0 && <p className="text-sm text-ink-muted">Chưa có đợt phúc khảo đang mở cho phiên bản kết quả của bạn.</p>}
            {components.length === 0 && <p className="text-sm text-ink-muted">Chưa có thành phần kết quả được hệ thống cung cấp để chọn.</p>}
            <div className="space-y-3 border-t border-hairline pt-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-ink">Yêu cầu của bạn</h3>
                <span className="rounded-full bg-primary-subtle px-2.5 py-0.5 text-xs font-semibold tabular-nums text-primary">{requests.totalCount}</span>
              </div>
              {requests.items.length === 0 && <p className="text-sm text-ink-muted">Chưa có yêu cầu phúc khảo.</p>}
              {displayedRequests.length > 0 && (
                <ul className="divide-y divide-hairline">
                  {displayedRequests.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5 first:pt-0 last:pb-0">
                    <button type="button" disabled={busy} className="min-h-11 text-left text-sm font-medium text-primary underline" onClick={() => setSelectedId(item.id)}>
                      #{item.id} · v{item.resultVersion} · Thành phần #{item.componentId}
                    </button>
                    <StatusBadge tone={item.status === 'ACCEPTED' ? 'success' : item.status === 'REJECTED' ? 'danger' : 'warning'} label={correctionStatusLabel(item.status)} />
                  </li>)}
                </ul>
              )}
              {requests.totalCount > 20 ? (
                <AppealPaging page={page} totalCount={requests.totalCount} busy={busy || loading} onChange={setPage} />
              ) : requestPagination.showPagination ? (
                <Pagination page={requestPagination.page} pages={requestPagination.totalPages} total={requestPagination.total} pageSize={requestPagination.pageSize} busy={busy || loading} onPage={requestPagination.setPage} />
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
    {selectedId != null && <AppealRequestDetail key={selectedId} projectId={projectId} requestId={selectedId} onChanged={() => setRevision(value => value + 1)} />}
    <ResultHistoryPanel key={revision} projectId={projectId} studentId={studentId} />
  </section>
}
