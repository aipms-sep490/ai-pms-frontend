import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { displayLabel } from '../../components/ui/display-label'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useActionConfirmation } from '../../components/ui/useActionConfirmation'
import { getEvaluationSchemes } from '../../services/api/evaluations.api'
import { getProjectResult, getStudentResult } from '../../services/api/project-results.api'
import { getProject } from '../../services/api/projects.api'
import { getTeam } from '../../services/api/teams.api'
import { HttpError } from '../../services/http/http-client'
import type { PagedResult } from '../../types/backend'
import type { ProjectResult, StudentResult } from './result-types'
import * as api from './result-correction-api'
import { appealError, appealInputClass, AppealPaging } from './appeal-ui'

type StudentDirectoryEntry = { fullName: string; studentCode?: string | null }

function formatStudentOption(id: number, idx: number, directory: Record<number, StudentDirectoryEntry>): string {
  const info = directory[id]
  if (info?.fullName) {
    return info.studentCode ? `${info.fullName} (${info.studentCode})` : info.fullName
  }
  return `Thành viên nhóm ${idx + 1}`
}

/** Only mounted for frozen lead staff; BE still validates every operation. */
export function AppealManagementPanel({ projectId, onCreated }: { projectId: number; onCreated: (id: number) => void }) {
  const [policy, setPolicy] = useState<api.AppealPolicy | null>(null), [windows, setWindows] = useState<PagedResult<api.AppealWindow> | null>(null)
  const [students, setStudents] = useState<number[]>([]), [targetId, setTargetId] = useState('PROJECT')
  const [studentDirectory, setStudentDirectory] = useState<Record<number, StudentDirectoryEntry>>({})
  const [result, setResult] = useState<ProjectResult | StudentResult | null>(null)
  const [targets, setTargets] = useState<api.AppealTarget[]>([])
  const [reference, setReference] = useState(''), [reason, setReason] = useState(''), [componentId, setComponentId] = useState('')
  const [opensAt, setOpensAt] = useState(''), [closesAt, setClosesAt] = useState('')
  const [page, setPage] = useState(1), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [stale, setStale] = useState(false), [error, setError] = useState('')
  const lock = useRef(false), generation = useRef(0), { requestConfirmation, confirmationDialog } = useActionConfirmation()

  // Resolve real student names & codes via project -> team roster so the dropdown never falls back to anonymous #1/#2/#3.
  useEffect(() => {
    let active = true
    void Promise.resolve()
      .then(() => getProject(projectId))
      .then(project => (project?.teamId ? getTeam(project.teamId) : null))
      .then(team => {
        if (!active || !team?.members?.length) return
        const next: Record<number, StudentDirectoryEntry> = {}
        for (const member of team.members) {
          const entry = member as typeof member & { studentCode?: string | null }
          next[member.userId] = { fullName: member.fullName, studentCode: entry.studentCode ?? null }
        }
        setStudentDirectory(next)
      })
      .catch(() => undefined)
    return () => { active = false }
  }, [projectId])

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

  const targetDisplayName = (item: { targetType: string; studentId?: number | null; resultVersion: number }) => {
    if (item.targetType === 'STUDENT' && item.studentId) {
      const idx = students.indexOf(item.studentId)
      const info = studentDirectory[item.studentId]
      if (info?.fullName) return `${info.fullName}${info.studentCode ? ` (${info.studentCode})` : ''} · v${item.resultVersion}`
      if (idx >= 0) return `Thành viên nhóm ${idx + 1} · v${item.resultVersion}`
    }
    return `${displayLabel(item.targetType)} · v${item.resultVersion}`
  }

  return <section className="workspace-surface space-y-5 p-5" aria-label="Quản lý phúc khảo">{confirmationDialog}
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-3">
      <div>
        <h2 className="font-semibold text-ink">Chính sách, đợt phúc khảo và đính chính</h2>
        <p className="mt-0.5 text-xs text-ink-muted">{policy ? `Chính sách hiện hành: v${policy.version} · ${policy.approvalReference}` : 'Chưa ghi nhận nguồn phê duyệt học thuật.'}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" icon="refresh" aria-label="Tải lại cấu hình" disabled={busy || loading} onClick={() => { setStale(true); void load() }} />
        {stale && <Button size="sm" disabled={busy || loading || !windows} onClick={() => { setStale(false); setError('') }}>Tôi đã đối chiếu cấu hình mới</Button>}
      </div>
    </div>
    {error && <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">{error}</p>}
    {loading && <p role="status" className="text-sm text-ink-muted">Đang tải cấu hình phúc khảo…</p>}
    {!loading && windows && (
      <div className="grid items-stretch gap-5 xl:grid-cols-2">
        <div className="space-y-5">
          <form className="rounded-xl border border-hairline bg-canvas/50 p-4 space-y-3" onSubmit={event => { event.preventDefault(); if (reference.trim()) void run(() => api.recordAppealPolicy(projectId, policy?.version ?? 0, reference.trim()), true) }}>
            <h3 className="text-sm font-semibold text-ink">1. Chính sách phê duyệt</h3>
            <label className="block text-sm">Nguồn phê duyệt học thuật có thật<input required maxLength={1000} value={reference} disabled={disabled} onChange={event => setReference(event.target.value)} className={appealInputClass} /></label>
            <Button type="submit" disabled={disabled}>Ghi nhận phiên bản chính sách</Button>
          </form>

          <section className="rounded-xl border border-hairline bg-canvas/50 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-ink">2. Chọn kết quả đã công bố</h3>
            <label className="block text-sm">Đối tượng
              <select value={targetId} disabled={disabled} onChange={event => { setTargetId(event.target.value); setResult(null); setComponentId('') }} className={appealInputClass}>
                <option value="PROJECT">Kết quả đồ án</option>
                {students.map((id, idx) => <option key={id} value={id}>{formatStudentOption(id, idx, studentDirectory)}</option>)}
              </select>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <Button disabled={disabled} variant="secondary" onClick={() => void run(async () => { const next = targetId === 'PROJECT' ? await getProjectResult(projectId) : await getStudentResult(projectId, Number(targetId)); setResult(next); if (!next) setError('Đối tượng chưa có kết quả đã công bố.') })}>Đọc phiên bản kết quả hiện tại</Button>
              <Button disabled={disabled || !target} variant="secondary" onClick={() => { if (target) setTargets(items => [...items.filter(item => item.targetType !== target.targetType || item.studentId !== target.studentId), target]) }}>Thêm đối tượng vào đợt</Button>
            </div>
            {result && <p className="rounded-lg border border-hairline bg-card px-3 py-2 text-sm font-medium text-ink">v{result.version} · {result.totalScore} · {displayLabel(result.outcome)}</p>}
            {targets.length > 0 && (
              <ul className="space-y-1.5 text-sm">
                {targets.map((item, index) => (
                  <li key={`${item.targetType}:${item.studentId}`} className="flex items-center justify-between gap-2 rounded-lg border border-hairline bg-card px-3 py-1.5">
                    <span>{targetDisplayName(item)}</span>
                    <button type="button" className="min-h-9 text-xs font-semibold text-status-error-text underline" disabled={disabled} onClick={() => setTargets(items => items.filter((_, i) => i !== index))}>Bỏ đối tượng</button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-5">
          <form className="rounded-xl border border-hairline bg-canvas/50 p-4 space-y-3" onSubmit={event => { event.preventDefault(); if (!policy || !targets.length || !opensAt || !closesAt) return; if (new Date(opensAt) >= new Date(closesAt)) { setError('Thời điểm kết thúc phải sau thời điểm mở.'); return }; void run(async () => { await api.openAppealWindow(projectId, { policyId: policy.id, opensAt: new Date(opensAt).toISOString(), closesAt: new Date(closesAt).toISOString(), targets }); setTargets([]) }, true) }}>
            <h3 className="text-sm font-semibold text-ink">3. Mở đợt phúc khảo cho sinh viên</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">Mở đợt<input type="datetime-local" required value={opensAt} disabled={disabled} onChange={event => setOpensAt(event.target.value)} className={appealInputClass} /></label>
              <label className="text-sm">Kết thúc đợt<input type="datetime-local" required value={closesAt} disabled={disabled} onChange={event => setClosesAt(event.target.value)} className={appealInputClass} /></label>
            </div>
            <Button type="submit" disabled={disabled || !policy || targets.length === 0}>Mở đợt phúc khảo</Button>
            {windows.items.length > 0 && (
              <ul className="space-y-2.5 border-t border-hairline pt-3">
                {windows.items.map((item, index) => (
                  <li key={item.id} className="rounded-lg border border-hairline bg-card p-3 space-y-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-ink">Đợt phúc khảo {index + 1}</strong>
                      <StatusBadge tone={item.status === 'OPEN' ? 'success' : item.status === 'CLOSED' ? 'neutral' : 'warning'} label={displayLabel(item.status)} />
                    </div>
                    <p className="text-ink-muted">{new Date(item.opensAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} → {new Date(item.closesAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
                    <p className="text-ink-soft">{item.targets.map(t => targetDisplayName(t)).join(' · ')}</p>
                    {(item.status === 'OPEN' || item.status === 'SCHEDULED' || item.status === 'EXPIRED') && <Button size="sm" disabled={disabled} variant="secondary" onClick={() => void run(async () => { const confirmed = await requestConfirmation({ title: 'Đóng đợt phúc khảo?', description: 'Sau khi đóng, sinh viên không thể gửi yêu cầu hoặc bổ sung minh chứng trong đợt này.', confirmLabel: 'Đóng đợt' }); if (confirmed !== null) await api.closeAppealWindow(projectId, item.id, item.concurrencyToken) }, true)}>Đóng đợt phúc khảo</Button>}
                  </li>
                ))}
              </ul>
            )}
            <AppealPaging page={page} totalCount={windows.totalCount} busy={busy || loading} onChange={setPage} />
          </form>

          <form className="rounded-xl border border-hairline bg-canvas/50 p-4 space-y-3" onSubmit={event => { event.preventDefault(); if (!policy || !target || !components.some(item => item.componentId === Number(componentId)) || !reason.trim()) return; void run(async () => { const next = await api.submitResultCorrectionRequest(projectId, { ...target, source: 'STAFF_CORRECTION', policyId: policy.id, windowId: null, componentId: Number(componentId), reason: reason.trim() }); setReason(''); onCreated(next.id) }, true) }}>
            <h3 className="text-sm font-semibold text-ink">4. Tạo yêu cầu đính chính của khoa</h3>
            <p className="text-xs text-ink-muted">Áp dụng cho kết quả vừa đọc ở mục 2; không cần mở đợt phúc khảo sinh viên.</p>
            <label className="block text-sm">Thành phần đính chính<select required disabled={disabled} value={componentId} onChange={event => setComponentId(event.target.value)} className={appealInputClass}><option value="">Chọn thành phần kết quả</option>{components.map(item => <option key={item.componentId} value={item.componentId}>{item.name} · {displayLabel(item.scope)} · {item.stage ? displayLabel(item.stage) : 'Chưa xác định'}</option>)}</select></label>
            <label className="block text-sm">Lý do đính chính<textarea required maxLength={2000} disabled={disabled} value={reason} onChange={event => setReason(event.target.value)} className={appealInputClass} /></label>
            <Button type="submit" disabled={disabled || !policy || !target || !componentId || !reason.trim()}>Tạo yêu cầu đính chính</Button>
          </form>
        </div>
      </div>
    )}
  </section>
}
