import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { displayLabel } from '../../components/ui/display-label'
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
  return studentId ? <StudentAppealPanel key={projectId + ':' + studentId} projectId={projectId} studentId={studentId} /> : <p role="alert" className="rounded-lg border border-status-warning-border bg-status-warning-bg p-4 text-sm text-status-warning-text">Cần đăng nhập để xem phúc khảo.</p>
}

export function StudentAppealPanel({ projectId, studentId }: { projectId: number; studentId: number }) {
  const [requests, setRequests] = useState<PagedResult<api.ResultCorrectionRequest> | null>(null)
  const [windows, setWindows] = useState<api.AppealWindow[]>([])
  const [result, setResult] = useState<StudentResult | null>(null)
  const [page, setPage] = useState(1)
  const [revision, setRevision] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reason, setReason] = useState('')
  const [appealKind, setAppealKind] = useState<api.AppealKind>('INDEPENDENT_80')
  const [componentId, setComponentId] = useState('')
  const [extraComponentIds, setExtraComponentIds] = useState<number[]>([])
  const [windowId, setWindowId] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [stale, setStale] = useState(false)
  const lock = useRef(false)

  useEffect(() => {
    const abort = new AbortController()
    setLoading(true); setRequests(null); setWindows([]); setResult(null)
    Promise.all([
      api.getResultCorrectionRequests(projectId, page, abort.signal),
      readAllPages(p => api.getAppealWindows(projectId, p, abort.signal)),
      getStudentResult(projectId, studentId, abort.signal),
    ])
      .then(([list, periods, published]) => {
        if (!abort.signal.aborted) { setRequests(list); setWindows(periods); setResult(published) }
      })
      .catch(cause => { if (!abort.signal.aborted) setError(appealError(cause)) })
      .finally(() => { if (!abort.signal.aborted) setLoading(false) })
    return () => abort.abort()
  }, [projectId, studentId, page, revision])

  const available = windows.filter(window =>
    window.status === 'OPEN'
    && window.targets.some(target => target.targetType === 'STUDENT' && target.studentId === studentId && target.resultVersion === result?.version))
  const window = available.find(item => item.id === Number(windowId))

  const allWeightedComponents = useMemo(
    () => result?.breakdown?.components.filter(item => item.weightPercent > 0) ?? [],
    [result],
  )
  const hasProcess20 = allWeightedComponents.some(c => c.scope === 'INDIVIDUAL' && c.stage === 'ON_GOING')
  const hasDefenseAbsence = result?.outcomeDetail === 'DEFENSE_ABSENT' && allWeightedComponents.some(c => c.stage === 'DEFENSE')

  const components = useMemo(() => {
    if (appealKind === 'PROCESS_20_ERRATA') {
      return allWeightedComponents.filter(c => c.scope === 'INDIVIDUAL' && c.stage === 'ON_GOING')
    }
    if (appealKind === 'DEFENSE_ABSENT_CONTEST') {
      return allWeightedComponents.filter(c => c.stage === 'DEFENSE')
    }
    return allWeightedComponents.filter(c => !(c.scope === 'INDIVIDUAL' && c.stage === 'ON_GOING'))
  }, [allWeightedComponents, appealKind])

  const component = components.find(item => item.componentId === Number(componentId))
  const combinableExtras = useMemo(
    () => appealKind === 'INDEPENDENT_80'
      ? components.filter(c => c.componentId !== component?.componentId && (c.stage === 'COLD' || c.stage === 'DEFENSE'))
      : [],
    [appealKind, components, component],
  )

  async function submit() {
    if (lock.current || loading || stale || !window || !component || !result || !reason.trim()) return
    lock.current = true; setBusy(true); setError('')
    try {
      const mergedIds = Array.from(new Set([component.componentId, ...extraComponentIds.filter(id => combinableExtras.some(c => c.componentId === id))]))
      const payload: api.CreateCorrectionRequest = {
        source: 'STUDENT_APPEAL',
        policyId: window.policyId,
        windowId: window.id,
        targetType: 'STUDENT',
        studentId,
        resultVersion: result.version,
        componentId: component.componentId,
        reason: reason.trim(),
      }
      if (appealKind !== 'INDEPENDENT_80') payload.appealKind = appealKind
      if (appealKind === 'INDEPENDENT_80' && mergedIds.length > 1) payload.componentIds = mergedIds
      const next = await api.submitResultCorrectionRequest(projectId, payload)
      setSelectedId(next.id); setReason(''); setExtraComponentIds([]); setRevision(value => value + 1)
    } catch (cause) {
      if (cause instanceof HttpError && cause.status === 409) { setStale(true); setRevision(value => value + 1) }
      setError(appealError(cause))
    } finally { lock.current = false; setBusy(false) }
  }

  return (
    <section className="space-y-4" aria-label="Phúc khảo cá nhân">
      <div className="workspace-surface space-y-4 p-5">
        <h2 className="font-semibold">Phúc khảo / đính chính kết quả</h2>
        <p className="text-sm text-ink-muted">
          Yêu cầu gắn với đúng sinh viên, thành phần và phiên bản đã công bố. Điểm 80% do người thẩm định độc lập rà soát; điểm quá trình 20% chỉ tiếp nhận đính chính sai sót nhập liệu cùng GVHD Chính.
        </p>
        {error && <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">{error}</p>}
        {loading && <p role="status" className="text-sm text-ink-muted">Đang tải phúc khảo…</p>}
        <Button variant="secondary" disabled={busy || loading} onClick={() => { setError(''); setRevision(value => value + 1) }}>Tải lại phúc khảo</Button>
        {stale && <Button disabled={loading || busy || !requests} onClick={() => { setStale(false); setError('') }}>Tôi đã đối chiếu dữ liệu mới</Button>}
        {!loading && requests && (
          <>
            <form onSubmit={event => { event.preventDefault(); void submit() }} className="space-y-3">
              <fieldset disabled={busy || stale} className="space-y-3">
                <label className="block text-sm">
                  Đợt phúc khảo
                  <select required value={windowId} onChange={event => setWindowId(event.target.value)} className={appealInputClass}>
                    <option value="">Chọn đợt đúng phiên bản</option>
                    {available.map((item, idx) => (
                      <option key={item.id} value={item.id}>
                        Đợt phúc khảo {idx + 1} · đến {new Date(item.closesAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
                      </option>
                    ))}
                  </select>
                </label>

                {(hasProcess20 || hasDefenseAbsence) && (
                  <label className="block text-sm">
                    Phạm vi yêu cầu
                    <select
                      value={appealKind}
                      onChange={event => {
                        setAppealKind(event.target.value as api.AppealKind)
                        setComponentId('')
                        setExtraComponentIds([])
                      }}
                      className={appealInputClass}
                    >
                      <option value="INDEPENDENT_80">Phúc khảo điểm 80% (Cold / Defense)</option>
                      {hasProcess20 && <option value="PROCESS_20_ERRATA">Đính chính sai sót điểm Quá trình 20% (GVHD Chính)</option>}
                      {hasDefenseAbsence && <option value="DEFENSE_ABSENT_CONTEST">Khiếu nại trạng thái Vắng bảo vệ</option>}
                    </select>
                  </label>
                )}

                <label className="block text-sm">
                  Thành phần kết quả
                  <select
                    required
                    value={componentId}
                    onChange={event => {
                      const nextId = event.target.value
                      setComponentId(nextId)
                      setExtraComponentIds(prev => prev.filter(id => String(id) !== nextId))
                    }}
                    className={appealInputClass}
                  >
                    <option value="">Chọn thành phần</option>
                    {components.map(item => (
                      <option key={item.componentId} value={item.componentId}>
                        {item.name} · {displayLabel(item.scope)} · {item.stage ? displayLabel(item.stage) : 'Chưa có giai đoạn'}
                      </option>
                    ))}
                  </select>
                </label>

                {combinableExtras.length > 0 && component && (
                  <fieldset className="rounded-lg border border-hairline bg-canvas p-3">
                    <legend className="px-1 text-xs font-semibold text-ink-soft">Gộp thêm thành phần 80% trong cùng đơn (tùy chọn)</legend>
                    <div className="mt-1 flex flex-wrap gap-3">
                      {combinableExtras.map(item => {
                        const checked = extraComponentIds.includes(item.componentId)
                        return (
                          <label key={item.componentId} className="inline-flex min-h-9 items-center gap-2 text-xs text-ink">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={event => setExtraComponentIds(prev =>
                                event.target.checked ? [...prev, item.componentId] : prev.filter(id => id !== item.componentId))}
                            />
                            <span>{item.name} ({item.stage ?? item.scope})</span>
                          </label>
                        )
                      })}
                    </div>
                  </fieldset>
                )}

                <label className="block text-sm">
                  Lý do phúc khảo
                  <textarea required maxLength={2000} value={reason} onChange={event => setReason(event.target.value)} className={appealInputClass} />
                </label>
                <Button type="submit" disabled={!window || !component || !reason.trim()}>Gửi yêu cầu phúc khảo</Button>
              </fieldset>
            </form>
            {available.length === 0 && <p className="text-sm">Chưa có đợt phúc khảo đang mở cho phiên bản kết quả của bạn.</p>}
            {components.length === 0 && <p className="text-sm">Chưa có thành phần kết quả được hệ thống cung cấp để chọn.</p>}
            <h3 className="font-medium">Yêu cầu của bạn</h3>
            {requests.items.length === 0 && <p>Chưa có yêu cầu phúc khảo.</p>}
            <ul>
              {requests.items.map(item => (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={busy}
                    className="min-h-11 text-left font-medium text-primary underline"
                    onClick={() => setSelectedId(item.id)}
                  >
                    {displayLabel(item.status)} · v{item.resultVersion} · {item.componentNames?.length ? item.componentNames.join(', ') : (item.componentName ?? 'Thành phần kết quả')}
                  </button>
                </li>
              ))}
            </ul>
            <AppealPaging page={page} totalCount={requests.totalCount} busy={busy || loading} onChange={setPage} />
          </>
        )}
      </div>
      {selectedId != null && <AppealRequestDetail key={selectedId} projectId={projectId} requestId={selectedId} onChanged={() => setRevision(value => value + 1)} />}
      <ResultHistoryPanel key={revision} projectId={projectId} studentId={studentId} />
    </section>
  )
}
