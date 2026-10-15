import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { useAuthSession } from '../auth/context/useAuthSession'
import { getStudentResult } from '../../services/api/project-results.api'
import { readAllPages } from '../../services/api/paged-read'
import { HttpError } from '../../services/http/http-client'
import type { StudentResult } from './result-types'
import type { PagedResult } from '../../types/backend'
import * as api from './result-correction-api'
import { AppealRequestDetail } from './AppealRequestDetail'
import { appealError, appealInputClass, AppealPaging } from './appeal-ui'
import { ResultHistoryPanel } from './ResultHistoryPanel'

/** FE1 can keep its existing projectId-only integration; identity comes from the shared session. */
export function ResultCorrectionPanel({ projectId }: { projectId: number }) {
  const { session } = useAuthSession()
  const studentId = session?.user.id
  return studentId ? <StudentAppealPanel key={projectId + ':' + studentId} projectId={projectId} studentId={studentId} /> : <p role="alert">Cần đăng nhập để xem phúc khảo.</p>
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
  return <section className="space-y-4" aria-label="Phúc khảo cá nhân"><div className="workspace-surface space-y-4 p-5"><h2 className="font-semibold">Phúc khảo / đính chính kết quả</h2><p className="text-sm text-ink-muted">Yêu cầu gắn với đúng sinh viên, thành phần và phiên bản đã công bố. Điểm chính thức do hệ thống quyết định.</p>
    {error && <p role="alert">{error}</p>}{loading && <p role="status">Đang tải phúc khảo…</p>}
    <Button variant="secondary" disabled={busy || loading} onClick={() => { setError(''); setRevision(value => value + 1) }}>Tải lại phúc khảo</Button>
    {stale && <Button disabled={loading || busy || !requests} onClick={() => { setStale(false); setError('') }}>Tôi đã đối chiếu dữ liệu mới</Button>}
    {!loading && requests && <><form onSubmit={event => { event.preventDefault(); void submit() }} className="space-y-3"><fieldset disabled={busy || stale} className="space-y-3"><label className="block text-sm">Đợt phúc khảo<select required value={windowId} onChange={event => setWindowId(event.target.value)} className={appealInputClass}><option value="">Chọn đợt đúng phiên bản</option>{available.map(item => <option key={item.id} value={item.id}>Đợt #{item.id} · đến {new Date(item.closesAt).toLocaleString('vi-VN')}</option>)}</select></label><label className="block text-sm">Thành phần kết quả<select required value={componentId} onChange={event => setComponentId(event.target.value)} className={appealInputClass}><option value="">Chọn thành phần</option>{components.map(item => <option key={item.componentId} value={item.componentId}>{item.name} · {item.scope} · {item.stage ?? 'Chưa có giai đoạn'}</option>)}</select></label><label className="block text-sm">Lý do phúc khảo<textarea required maxLength={2000} value={reason} onChange={event => setReason(event.target.value)} className={appealInputClass} /></label><Button type="submit" disabled={!window || !component || !reason.trim()}>Gửi yêu cầu phúc khảo</Button></fieldset></form>
    {available.length === 0 && <p className="text-sm">Chưa có đợt phúc khảo đang mở cho phiên bản kết quả của bạn.</p>}{components.length === 0 && <p className="text-sm">Chưa có thành phần kết quả được hệ thống cung cấp để chọn.</p>}
    <h3 className="font-medium">Yêu cầu của bạn</h3>{requests.items.length === 0 && <p>Chưa có yêu cầu phúc khảo.</p>}<ul>{requests.items.map(item => <li key={item.id}><button type="button" disabled={busy} className="min-h-11 text-left font-medium text-primary underline" onClick={() => setSelectedId(item.id)}>#{item.id} · {item.status} · v{item.resultVersion} · Thành phần #{item.componentId}</button></li>)}</ul><AppealPaging page={page} totalCount={requests.totalCount} busy={busy || loading} onChange={setPage} /></>}
    </div>{selectedId != null && <AppealRequestDetail key={selectedId} projectId={projectId} requestId={selectedId} onChanged={() => setRevision(value => value + 1)} />}
    <ResultHistoryPanel key={revision} projectId={projectId} studentId={studentId} />
  </section>
}
