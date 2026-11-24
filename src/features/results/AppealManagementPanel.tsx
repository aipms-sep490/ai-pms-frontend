import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { displayLabel } from '../../components/ui/display-label'
import { Pagination } from '../../components/ui/Pagination'
import { useClientPagination } from '../../components/ui/useClientPagination'
import { useActionConfirmation } from '../../components/ui/useActionConfirmation'
import { getEvaluationSchemes } from '../../services/api/evaluations.api'
import { getProjectResult, getStudentResult } from '../../services/api/project-results.api'
import { HttpError } from '../../services/http/http-client'
import type { PagedResult } from '../../types/backend'
import { evaluationStageLabel } from '../evaluations/evaluation-types'
import type { ProjectResult, StudentResult } from './result-types'
import * as api from './result-correction-api'
import { appealError, appealInputClass, AppealPaging, appealTargetTypeLabel, appealWindowStatusLabel } from './appeal-ui'

/** Only mounted for frozen lead staff; BE still validates every operation. */
export function AppealManagementPanel({ projectId, onCreated }: { projectId: number; onCreated: (id: number) => void }) {
  const [policy, setPolicy] = useState<api.AppealPolicy | null>(null), [windows, setWindows] = useState<PagedResult<api.AppealWindow> | null>(null)
  const [students, setStudents] = useState<number[]>([]), [targetId, setTargetId] = useState('PROJECT')
  const [result, setResult] = useState<ProjectResult | StudentResult | null>(null)
  const [targets, setTargets] = useState<api.AppealTarget[]>([])
  const [reference, setReference] = useState(''), [reason, setReason] = useState(''), [componentId, setComponentId] = useState('')
  const [opensAt, setOpensAt] = useState(''), [closesAt, setClosesAt] = useState('')
  const [page, setPage] = useState(1), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [stale, setStale] = useState(false), [error, setError] = useState('')
  const lock = useRef(false), generation = useRef(0), { requestConfirmation, confirmationDialog } = useActionConfirmation()
  const load = useCallback(async () => {
    const current = ++generation.current; setLoading(true); setPolicy(null); setWindows(null); setResult(null)
    try {
      const [next, periods, schemes] = await Promise.all([api.getAppealPolicy(projectId), api.getAppealWindows(projectId, page), getEvaluationSchemes(projectId)])
      if (current === generation.current) { setPolicy(next); setWindows(periods); setStudents([...new Set(schemes.filter(item => item.status === 'PUBLISHED').flatMap(item => item.students.map(student => student.studentId)))]) }
    } catch (cause) { if (current === generation.current) setError(appealError(cause)) }
    finally { if (current === generation.current) setLoading(false) }
  }, [projectId, page])
  useEffect(() => { void load(); return () => { generation.current++ } }, [load])
  async function run(operation: () => Promise<unknown>, mutation = false) {
    if (lock.current || loading || (mutation && stale)) return
    lock.current = true; setBusy(true); setError('')
    try { await operation(); if (mutation) await load() }
    catch (cause) { if (cause instanceof HttpError && cause.status === 409) { setStale(true); await load() }; setError(appealError(cause)) }
    finally { lock.current = false; setBusy(false) }
  }
  const target: api.AppealTarget | null = result ? { targetType: targetId === 'PROJECT' ? 'PROJECT' : 'STUDENT', studentId: targetId === 'PROJECT' ? null : Number(targetId), resultVersion: result.version } : null
  const components = result?.breakdown?.components.filter(item => item.weightPercent > 0) ?? []
  const disabled = busy || loading || stale
  const windowItems = useMemo(() => windows?.items ?? [], [windows])
  const windowPagination = useClientPagination(windowItems, 8)
  const targetPagination = useClientPagination(targets, 8)
  const displayedWindows = (windows?.totalCount ?? 0) > 20 ? windowItems : windowPagination.paginatedItems

  return <section className="overflow-hidden rounded-2xl border border-hairline bg-card shadow-xs" aria-label="Quản lý phúc khảo">
    {confirmationDialog}
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
      <div className="flex items-center gap-2">
        <h2 className="font-semibold text-ink">Chính sách, đợt phúc khảo và đính chính</h2>
        {windows && <span className="rounded-full bg-primary-subtle px-2.5 py-0.5 text-xs font-semibold tabular-nums text-primary">{windows.totalCount} đợt</span>}
      </div>
      <Button variant="secondary" disabled={busy || loading} onClick={() => { setStale(true); void load() }}>Tải lại cấu hình</Button>
    </div>
    <div className="space-y-4 p-5">
      {error && <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">{error}</p>}
      {loading && <p role="status" className="text-sm text-ink-muted">Đang tải cấu hình phúc khảo…</p>}
      {stale && <Button disabled={busy || loading || !windows} onClick={() => { setStale(false); setError('') }}>Tôi đã đối chiếu cấu hình mới</Button>}
      {!loading && windows && <>
        <div className="rounded-xl border border-hairline bg-canvas/50 p-3.5 text-sm">
          <p className="font-medium text-ink">{policy ? `Chính sách v${policy.version} · ${policy.approvalReference}` : 'Chưa ghi nhận nguồn phê duyệt học thuật.'}</p>
        </div>
        <details open className="overflow-hidden rounded-xl border border-hairline bg-card">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 bg-canvas/60 px-4 py-2.5 text-xs font-bold text-ink">
            <span>Cập nhật chính sách phúc khảo</span>
            <span className="material-symbols-outlined text-[18px] text-ink-muted" aria-hidden="true">expand_more</span>
          </summary>
          <form className="space-y-2.5 border-t border-hairline p-4" onSubmit={event => { event.preventDefault(); if (reference.trim()) void run(() => api.recordAppealPolicy(projectId, policy?.version ?? 0, reference.trim()), true) }}>
            <label className="block text-sm font-medium text-ink-soft">Nguồn phê duyệt học thuật có thật<input required maxLength={1000} value={reference} disabled={disabled} onChange={event => setReference(event.target.value)} className={appealInputClass} /></label>
            <Button type="submit" disabled={disabled}>Ghi nhận phiên bản chính sách</Button>
          </form>
        </details>

        <section className="space-y-3 rounded-xl border border-hairline bg-canvas/30 p-4">
          <h3 className="font-semibold text-ink">Chọn kết quả đã công bố</h3>
          <label className="block text-sm font-medium text-ink-soft">Đối tượng<select value={targetId} disabled={disabled} onChange={event => { setTargetId(event.target.value); setResult(null); setComponentId('') }} className={appealInputClass}><option value="PROJECT">Kết quả đồ án</option>{students.map(id => <option key={id} value={id}>Sinh viên #{id}</option>)}</select></label>
          <div className="flex flex-wrap gap-2">
            <Button disabled={disabled} variant="secondary" onClick={() => void run(async () => { const next = targetId === 'PROJECT' ? await getProjectResult(projectId) : await getStudentResult(projectId, Number(targetId)); setResult(next); if (!next) setError('Đối tượng chưa có kết quả đã công bố.') })}>Đọc phiên bản kết quả hiện tại</Button>
            <Button disabled={disabled || !target} variant="secondary" onClick={() => { if (target) setTargets(items => [...items.filter(item => item.targetType !== target.targetType || item.studentId !== target.studentId), target]) }}>Thêm đối tượng vào đợt</Button>
          </div>
          {result && <p className="rounded-lg border border-hairline bg-card px-3 py-2 text-sm font-medium tabular-nums text-ink">v{result.version} · {result.totalScore} · {result.outcome}</p>}
          {targets.length > 0 && (
            <div className="space-y-2">
              <ul className="space-y-1.5 text-sm">{targetPagination.paginatedItems.map((item, index) => <li key={`${item.targetType}:${item.studentId}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-hairline bg-card px-3 py-1.5"><span>{appealTargetTypeLabel(item.targetType, item.studentId)} · v{item.resultVersion}</span><button type="button" className="min-h-11 font-semibold text-status-error-text underline" disabled={disabled} onClick={() => setTargets(items => items.filter((_, i) => i !== (targetPagination.page - 1) * targetPagination.pageSize + index))}>Bỏ đối tượng</button></li>)}</ul>
              {targetPagination.showPagination && <Pagination page={targetPagination.page} pages={targetPagination.totalPages} total={targetPagination.total} pageSize={targetPagination.pageSize} onPage={targetPagination.setPage} />}
            </div>
          )}
        </section>

        <details className="overflow-hidden rounded-xl border border-hairline bg-card">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 bg-canvas/60 px-4 py-2.5 text-xs font-bold text-ink">
            <span>Mở đợt phúc khảo mới {targets.length > 0 ? `(${targets.length} đối tượng)` : ''}</span>
            <span className="material-symbols-outlined text-[18px] text-ink-muted" aria-hidden="true">expand_more</span>
          </summary>
          <form className="space-y-3 border-t border-hairline p-4" onSubmit={event => { event.preventDefault(); if (!policy || !targets.length || !opensAt || !closesAt) return; if (new Date(opensAt) >= new Date(closesAt)) { setError('Thời điểm kết thúc phải sau thời điểm mở.'); return }; void run(async () => { await api.openAppealWindow(projectId, { policyId: policy.id, opensAt: new Date(opensAt).toISOString(), closesAt: new Date(closesAt).toISOString(), targets }); setTargets([]) }, true) }}>
            <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium text-ink-soft">Mở đợt<input type="datetime-local" required value={opensAt} disabled={disabled} onChange={event => setOpensAt(event.target.value)} className={appealInputClass} /></label><label className="text-sm font-medium text-ink-soft">Kết thúc đợt<input type="datetime-local" required value={closesAt} disabled={disabled} onChange={event => setClosesAt(event.target.value)} className={appealInputClass} /></label></div>
            <Button type="submit" disabled={disabled || !policy || targets.length === 0}>Mở đợt phúc khảo</Button>
          </form>
        </details>

        {displayedWindows.length > 0 && (
          <details open className="overflow-hidden rounded-xl border border-hairline bg-card">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 bg-canvas/60 px-4 py-2.5 text-xs font-bold text-ink">
              <span>Danh sách đợt phúc khảo ({windows.totalCount})</span>
              <span className="material-symbols-outlined text-[18px] text-ink-muted" aria-hidden="true">expand_more</span>
            </summary>
            <div className="space-y-3 border-t border-hairline p-4">
              <ul className="space-y-3">
                {displayedWindows.map(item => <li key={item.id} className="space-y-2 rounded-xl border border-hairline bg-canvas/40 p-3.5 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-ink">Đợt #{item.id} · {new Date(item.opensAt).toLocaleString('vi-VN')} → {new Date(item.closesAt).toLocaleString('vi-VN')}</p>
                    <StatusBadge tone={item.status === 'OPEN' ? 'success' : item.status === 'SCHEDULED' ? 'info' : 'neutral'} label={appealWindowStatusLabel(item.status)} />
                  </div>
                  <p className="text-xs text-ink-muted">{item.targets.map(t => `${appealTargetTypeLabel(t.targetType, t.studentId)} · v${t.resultVersion}`).join(' · ')}</p>
                  {(item.status === 'OPEN' || item.status === 'SCHEDULED' || item.status === 'EXPIRED') && <Button disabled={disabled} variant="secondary" onClick={() => void run(async () => { const confirmed = await requestConfirmation({ title: 'Đóng đợt phúc khảo?', description: 'Sau khi đóng, sinh viên không thể gửi yêu cầu hoặc bổ sung minh chứng trong đợt này.', confirmLabel: 'Đóng đợt' }); if (confirmed !== null) await api.closeAppealWindow(projectId, item.id, item.concurrencyToken) }, true)}>Đóng đợt #{item.id}</Button>}
                </li>)}
              </ul>
              {windows.totalCount > 20 ? (
                <AppealPaging page={page} totalCount={windows.totalCount} busy={busy || loading} onChange={setPage} />
              ) : windowPagination.showPagination ? (
                <Pagination page={windowPagination.page} pages={windowPagination.totalPages} total={windowPagination.total} pageSize={windowPagination.pageSize} busy={busy || loading} onPage={windowPagination.setPage} />
              ) : null}
            </div>
          </details>
        )}

        <form className="space-y-3 rounded-xl border border-hairline bg-canvas/30 p-4" onSubmit={event => { event.preventDefault(); if (!policy || !target || !components.some(item => item.componentId === Number(componentId)) || !reason.trim()) return; void run(async () => { const next = await api.submitResultCorrectionRequest(projectId, { ...target, source: 'STAFF_CORRECTION', policyId: policy.id, windowId: null, componentId: Number(componentId), reason: reason.trim() }); setReason(''); onCreated(next.id) }, true) }}>
          <h3 className="font-semibold text-ink">Tạo yêu cầu đính chính của khoa</h3>
          <p className="text-sm text-ink-muted">Áp dụng cho kết quả vừa đọc; không cần đợt phúc khảo sinh viên.</p>
          <label className="block text-sm font-medium text-ink-soft">Thành phần đính chính<select required disabled={disabled} value={componentId} onChange={event => setComponentId(event.target.value)} className={appealInputClass}><option value="">Chọn thành phần kết quả</option>{components.map(item => <option key={item.componentId} value={item.componentId}>{item.name} · {displayLabel(item.scope)} · {evaluationStageLabel(item.stage)}</option>)}</select></label>
          <label className="block text-sm font-medium text-ink-soft">Lý do đính chính<textarea required maxLength={2000} disabled={disabled} value={reason} onChange={event => setReason(event.target.value)} className={appealInputClass} /></label>
          <Button type="submit" disabled={disabled || !policy || !target || !componentId || !reason.trim()}>Tạo yêu cầu đính chính</Button>
        </form>
      </>}
    </div>
  </section>
}
