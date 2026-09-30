import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuthSession } from '../auth/context/useAuthSession'
import { getProjectPeriods } from '../academic/api/governance-api'
import type { ProjectPeriod } from '../academic/types/governance.types'
import { getProject } from '../../services/api/projects.api'
import { assignEvaluator, getEligibleEvaluators, getEvaluationSchemes, getProjectEvaluationAssignments, revokeEvaluator, type EligibleEvaluator } from '../../services/api/evaluations.api'
import type { EvaluationAssignment, EvaluationScheme, EvaluationSchemeComponent } from './evaluation-types'
import { HttpError } from '../../services/http/http-client'

type AssignmentStatusFilter = 'ALL' | 'ACTIVE' | 'REVOKED'
type AssignmentFormErrors = { evaluatorId?: string; periodId?: string; componentId?: string; studentId?: string; revokeReason?: string }

function assignmentError(reason: unknown, fallback: string) {
  if (reason instanceof HttpError && reason.status === 403) return 'Backend không cấp quyền thực hiện thao tác này trong phạm vi đồ án.'
  if (reason instanceof HttpError && reason.status === 404) return 'Không tìm thấy đồ án hoặc phân công. Hãy tải lại dữ liệu.'
  return fallback
}

function assignedAt(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

export function EvaluatorAssignmentManagementPage() {
  const projectId = Number(useParams().projectId)
  const { session } = useAuthSession()
  const errorSummary = useRef<HTMLDivElement>(null)
  const [periods, setPeriods] = useState<ProjectPeriod[]>([])
  const [schemes, setSchemes] = useState<EvaluationScheme[]>([])
  const [assignments, setAssignments] = useState<EvaluationAssignment[]>([])
  const [assignmentStatus, setAssignmentStatus] = useState<AssignmentStatusFilter>('ALL')
  const [evaluatorId, setEvaluatorId] = useState('')
  const [eligibleEvaluators, setEligibleEvaluators] = useState<EligibleEvaluator[]>([])
  const [candidatesLoading, setCandidatesLoading] = useState(false)
  const [periodId, setPeriodId] = useState('')
  const [componentId, setComponentId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [evaluationType, setEvaluationType] = useState<'SUPERVISOR' | 'LECTURER'>('LECTURER')
  const [revokeTarget, setRevokeTarget] = useState<EvaluationAssignment | null>(null)
  const [revokeReason, setRevokeReason] = useState('')
  const [fieldErrors, setFieldErrors] = useState<AssignmentFormErrors>({})
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => { if (error) errorSummary.current?.focus() }, [error])

  const load = useCallback(async () => {
    if (!session || !Number.isInteger(projectId) || projectId < 1) {
      setError('Project ID không hợp lệ hoặc phiên đăng nhập chưa sẵn sàng.')
      setLoading(false)
      return
    }
    setLoading(true); setLoaded(false); setAssignments([]); setPeriods([]); setSchemes([])
    try {
      const assignmentsRequest = assignmentStatus === 'ALL' ? getProjectEvaluationAssignments(projectId) : getProjectEvaluationAssignments(projectId, assignmentStatus)
      const [project, currentAssignments, options, schemeOptions] = await Promise.all([
        getProject(projectId), assignmentsRequest,
        getProjectPeriods(session.accessToken, { search: '', periodType: 'EVALUATION' }),
        getEvaluationSchemes(projectId),
      ])
      if (!project.id) throw new Error('Project missing')
      setPeriods(options.items.filter(item => item.periodType === 'EVALUATION'))
      setSchemes(schemeOptions)
      setAssignments(currentAssignments.items)
      setLoaded(true); setError(null)
    } catch (reason) {
      setError(assignmentError(reason, 'Không thể tải phân công evaluator và kỳ đánh giá.'))
    } finally { setLoading(false) }
  }, [assignmentStatus, projectId, session])

  useEffect(() => { void load() }, [load])

  const selectedScheme = schemes.find((scheme) => scheme.components.some((component) => component.id === Number(componentId))) ?? null
  const selectedComponent: EvaluationSchemeComponent | null = selectedScheme?.components.find((component) => component.id === Number(componentId)) ?? null
  const selectedStudentId = studentId ? Number(studentId) : null
  const targetReady = Boolean(selectedComponent && (selectedComponent.scope !== 'INDIVIDUAL' || selectedStudentId))

  useEffect(() => {
    const period = Number(periodId)
    if (!periods.some(item => item.id === period && item.status === 'ACTIVE') || !selectedComponent || !targetReady) {
      setEligibleEvaluators([])
      return
    }
    const controller = new AbortController()
    setCandidatesLoading(true); setEligibleEvaluators([]); setEvaluatorId('')
    getEligibleEvaluators(projectId, period, { componentId: selectedComponent.id, scope: selectedComponent.scope, majorId: selectedComponent.majorId, studentId: selectedComponent.scope === 'INDIVIDUAL' ? selectedStudentId : null }, 1, 100, controller.signal)
      .then(page => { if (!controller.signal.aborted) setEligibleEvaluators(page.items) })
      .catch(reason => { if (!controller.signal.aborted) setError(assignmentError(reason, 'Không thể tải danh sách evaluator hợp lệ cho đợt này.')) })
      .finally(() => { if (!controller.signal.aborted) setCandidatesLoading(false) })
    return () => controller.abort()
  }, [periodId, periods, projectId, selectedComponent, selectedStudentId, targetReady])

  const run = async (operation: () => Promise<unknown>, fallback: string, success: string) => {
    setBusy(true); setError(null); setNotice(null)
    try {
      await operation()
      setRevokeTarget(null); setRevokeReason('')
      await load()
      setNotice(success)
    } catch (reason) {
      if (reason instanceof HttpError && reason.status === 409) {
        await load()
        setError('Phân công, rubric hoặc điều kiện đánh giá đã thay đổi. Dữ liệu mới đã được tải lại; hãy kiểm tra trước khi thao tác tiếp.')
      } else setError(assignmentError(reason, fallback))
    } finally { setBusy(false) }
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const evaluator = Number(evaluatorId), period = Number(periodId)
    const errors: AssignmentFormErrors = {}
    const selectedCandidate = eligibleEvaluators.find(item => item.userId === evaluator)
    if (!selectedCandidate) errors.evaluatorId = 'Chọn evaluator từ danh sách đủ điều kiện do Backend trả về.'
    else if (!selectedCandidate.evaluationTypes.includes(evaluationType)) errors.evaluatorId = 'Vai trò đánh giá đã chọn không còn hợp lệ với evaluator này.'
    if (!periods.some(item => item.id === period && item.status === 'ACTIVE')) errors.periodId = 'Chọn một đợt EVALUATION đang ACTIVE.'
    if (!selectedComponent || selectedScheme?.status !== 'PUBLISHED' || selectedScheme.projectPeriodId !== period) errors.componentId = 'Chọn component thuộc evaluation scheme PUBLISHED của đúng đợt.'
    if (selectedComponent?.scope === 'INDIVIDUAL' && !selectedStudentId) errors.studentId = 'Chọn sinh viên thuộc frozen roster của component này.'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) { setError('Kiểm tra các trường được đánh dấu trước khi phân công.'); return }
    if (!selectedComponent) return
    void run(() => assignEvaluator(projectId, { evaluatorId: evaluator, projectPeriodId: period, evaluationType, componentId: selectedComponent.id, scope: selectedComponent.scope, majorId: selectedComponent.majorId, studentId: selectedComponent.scope === 'INDIVIDUAL' ? selectedStudentId : null }), 'Không thể lưu phân công. Máy chủ có thể đã thay đổi scheme, component, roster, rubric hoặc kỳ đánh giá.', 'Đã tạo phân công scoped. Danh sách bên dưới đã được tải lại từ máy chủ.')
  }

  const submitRevoke = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!revokeTarget) return
    const reason = revokeReason.trim()
    if (!reason) { setFieldErrors(current => ({ ...current, revokeReason: 'Nêu lý do thu hồi để tiếp tục.' })); return }
    setFieldErrors(current => ({ ...current, revokeReason: undefined }))
    void run(() => revokeEvaluator(revokeTarget.id, revokeTarget.concurrencyToken, reason), 'Không thể thu hồi phân công. Hãy kiểm tra lại trạng thái và thử lại.', 'Đã thu hồi phân công. Danh sách bên dưới đã được tải lại từ máy chủ.')
  }

  const eligiblePeriods = periods.filter(item => item.status === 'ACTIVE')
  const publishedComponents = schemes.filter((scheme) => scheme.status === 'PUBLISHED' && scheme.projectPeriodId === Number(periodId)).flatMap((scheme) => scheme.components.map((component) => ({ scheme, component })))
  const eligibleStudents = selectedComponent?.scope === 'INDIVIDUAL' ? (selectedScheme?.students.filter((student) => student.majorId === selectedComponent.majorId) ?? []) : []

  return <main className="mx-auto max-w-5xl space-y-5 pb-12">
    <header className="space-y-1"><p className="font-mono text-xs font-semibold uppercase tracking-wide text-primary">Project #{projectId}</p><h1 className="font-heading text-2xl font-bold text-slate-950">Phân công evaluator</h1><p className="max-w-3xl text-sm leading-6 text-slate-600">Backend xác thực khoa quản lý, kỳ đánh giá, rubric đã công bố và tư cách giảng viên cho từng thao tác.</p></header>
    {error && <div ref={errorSummary} tabIndex={-1} role="alert" aria-labelledby="assignment-error-title" className="rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><p id="assignment-error-title" className="font-semibold">Chưa thể hoàn tất thao tác</p><p className="mt-1">{error}</p><button type="button" className="mt-2 min-h-11 font-semibold underline underline-offset-4" onClick={() => void load()}>Tải lại dữ liệu</button></div>}
    {notice && <p role="status" className="rounded-lg border border-status-success-border bg-status-success-bg p-4 text-sm text-status-success-text">{notice}</p>}
    {loading && <p role="status" className="rounded-lg border border-hairline bg-card p-4 text-sm text-slate-700">Đang tải phân công…</p>}
    {!loading && loaded && <>
      <section aria-labelledby="new-assignment-title" className="rounded-xl border border-hairline bg-card p-5 shadow-xs"><h2 id="new-assignment-title" className="font-heading font-semibold text-slate-950">Phân công mới</h2><p className="mt-1 text-sm leading-6 text-slate-600">Danh sách chỉ gồm evaluator đủ điều kiện do Backend trả về cho đúng đồ án, rubric và kỳ đánh giá. Máy chủ vẫn kiểm tra lại khi lưu.</p>
        <form className="mt-4 grid gap-4 sm:grid-cols-3" onSubmit={submit} noValidate>
          <label className="text-sm font-medium text-slate-800" htmlFor="evaluation-period">Đợt đánh giá<select id="evaluation-period" aria-invalid={Boolean(fieldErrors.periodId)} aria-describedby={fieldErrors.periodId ? 'evaluation-period-error' : undefined} className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" required value={periodId} onChange={event => { setPeriodId(event.target.value); setComponentId(''); setStudentId(''); setEvaluatorId(''); setFieldErrors(current => ({ ...current, periodId: undefined, componentId: undefined, studentId: undefined, evaluatorId: undefined })) }} disabled={busy}><option value="">Chọn đợt</option>{periods.map(item => <option key={item.id} value={item.id} disabled={item.status !== 'ACTIVE'}>{item.semesterName} · {item.name} · {item.status}</option>)}</select>{fieldErrors.periodId && <span id="evaluation-period-error" className="mt-1 block text-xs text-status-error-text">{fieldErrors.periodId}</span>}</label>
          <label className="text-sm font-medium text-slate-800" htmlFor="scheme-component">Scheme component<select id="scheme-component" aria-invalid={Boolean(fieldErrors.componentId)} aria-describedby={fieldErrors.componentId ? 'scheme-component-error' : undefined} className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" required value={componentId} onChange={event => { setComponentId(event.target.value); setStudentId(''); setEvaluatorId(''); setFieldErrors(current => ({ ...current, componentId: undefined, studentId: undefined, evaluatorId: undefined })) }} disabled={busy || !periodId}><option value="">Chọn component PUBLISHED</option>{publishedComponents.map(({ scheme, component }) => <option key={component.id} value={component.id}>{scheme.name} v{scheme.version} · {component.name} · {component.scope}{component.majorId ? ` · major #${component.majorId}` : ''}</option>)}</select>{fieldErrors.componentId && <span id="scheme-component-error" className="mt-1 block text-xs text-status-error-text">{fieldErrors.componentId}</span>}</label>
          {selectedComponent?.scope === 'INDIVIDUAL' && <label className="text-sm font-medium text-slate-800" htmlFor="assignment-student">Sinh viên<select id="assignment-student" aria-invalid={Boolean(fieldErrors.studentId)} aria-describedby={fieldErrors.studentId ? 'assignment-student-error' : undefined} className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" required value={studentId} onChange={event => { setStudentId(event.target.value); setEvaluatorId(''); setFieldErrors(current => ({ ...current, studentId: undefined, evaluatorId: undefined })) }} disabled={busy}><option value="">Chọn sinh viên frozen roster</option>{eligibleStudents.map(student => <option key={student.studentId} value={student.studentId}>Student #{student.studentId} · major #{student.majorId}</option>)}</select>{fieldErrors.studentId && <span id="assignment-student-error" className="mt-1 block text-xs text-status-error-text">{fieldErrors.studentId}</span>}</label>}
          <label className="text-sm font-medium text-slate-800" htmlFor="evaluator-id">Evaluator<select id="evaluator-id" aria-invalid={Boolean(fieldErrors.evaluatorId)} aria-describedby={fieldErrors.evaluatorId ? 'evaluator-id-error' : undefined} required className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" value={evaluatorId} onChange={event => { const selected = eligibleEvaluators.find(item => item.userId === Number(event.target.value)); setEvaluatorId(event.target.value); if (selected && !selected.evaluationTypes.includes(evaluationType)) setEvaluationType(selected.evaluationTypes[0] ?? 'LECTURER'); setFieldErrors(current => ({ ...current, evaluatorId: undefined })) }} disabled={busy || candidatesLoading || !periodId}><option value="">{candidatesLoading ? 'Đang tải evaluator…' : 'Chọn evaluator'}</option>{eligibleEvaluators.map(item => <option key={item.userId} value={item.userId}>{item.displayName} · {item.departmentName} · {item.evaluationTypes.join('/')}</option>)}</select>{fieldErrors.evaluatorId && <span id="evaluator-id-error" className="mt-1 block text-xs text-status-error-text">{fieldErrors.evaluatorId}</span>}</label>
          <label className="text-sm font-medium text-slate-800" htmlFor="evaluation-type">Vai trò đánh giá<select id="evaluation-type" className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" value={evaluationType} onChange={event => setEvaluationType(event.target.value as 'SUPERVISOR' | 'LECTURER')} disabled={busy || !evaluatorId}>{(['LECTURER', 'SUPERVISOR'] as const).filter(type => !evaluatorId || eligibleEvaluators.find(item => item.userId === Number(evaluatorId))?.evaluationTypes.includes(type)).map(type => <option key={type} value={type}>{type === 'LECTURER' ? 'Giảng viên đánh giá' : 'GVHD'}</option>)}</select></label>
          <button type="submit" disabled={busy || candidatesLoading || eligiblePeriods.length === 0 || !evaluatorId || !targetReady} className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-3">{busy ? 'Đang lưu…' : 'Phân công evaluator'}</button>
        </form>
        {periods.length === 0 && <p className="mt-3 text-sm text-status-warning-text">Chưa có đợt EVALUATION trong phạm vi học vụ.</p>}{periods.length > 0 && eligiblePeriods.length === 0 && <p className="mt-3 text-sm text-status-warning-text">Không có đợt EVALUATION ACTIVE để phân công.</p>}{periodId && publishedComponents.length === 0 && <p className="mt-3 text-sm text-status-warning-text">Chưa có evaluation scheme PUBLISHED cho đợt đã chọn.</p>}{targetReady && !candidatesLoading && eligibleEvaluators.length === 0 && <p className="mt-3 text-sm text-status-warning-text">Backend chưa trả evaluator hợp lệ cho component và target đã chọn.</p>}
      </section>
      <section aria-labelledby="assignment-list-title" className="rounded-xl border border-hairline bg-card p-5 shadow-xs"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 id="assignment-list-title" className="font-heading font-semibold text-slate-950">Phân công hiện có</h2><p className="mt-1 text-sm text-slate-600">Lịch sử thu hồi được giữ nguyên; phân công mới sẽ có ID riêng.</p></div><label className="text-sm font-medium text-slate-800" htmlFor="assignment-status">Trạng thái<select id="assignment-status" className="mt-1 min-h-11 rounded-lg border border-hairline bg-card px-3 text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" value={assignmentStatus} onChange={event => setAssignmentStatus(event.target.value as AssignmentStatusFilter)} disabled={busy}><option value="ALL">Tất cả</option><option value="ACTIVE">Đang hiệu lực</option><option value="REVOKED">Đã thu hồi</option></select></label></div>
        {assignments.length === 0 ? <p className="mt-4 text-sm text-slate-600">Chưa có evaluator phù hợp với bộ lọc này.</p> : <ul className="mt-4 divide-y divide-hairline">{assignments.map(item => <li key={item.id} className="py-4 text-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-slate-950">#{item.id} · giảng viên #{item.evaluatorId}</p><p className="mt-1 text-slate-600">{item.evaluationType} · rubric #{item.rubricId} · kỳ #{item.projectPeriodId}</p><p className="mt-1 font-mono text-xs text-slate-500">Phân công {assignedAt(item.assignedAt)} · khoa #{item.departmentId}</p></div><span className={item.status === 'ACTIVE' ? 'rounded-full bg-status-success-bg px-2.5 py-1 text-xs font-semibold text-status-success-text' : 'rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700'}>{item.status === 'ACTIVE' ? 'Đang hiệu lực' : 'Đã thu hồi'}</span></div>{item.status === 'ACTIVE' && <div className="mt-3">{revokeTarget?.id === item.id ? <form onSubmit={submitRevoke} className="rounded-lg border border-status-warning-border bg-status-warning-bg p-3"><label className="block text-sm font-medium text-slate-800" htmlFor={`revoke-reason-${item.id}`}>Lý do thu hồi<input id={`revoke-reason-${item.id}`} aria-invalid={Boolean(fieldErrors.revokeReason)} aria-describedby={fieldErrors.revokeReason ? `revoke-reason-error-${item.id}` : undefined} className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" value={revokeReason} onChange={event => { setRevokeReason(event.target.value); setFieldErrors(current => ({ ...current, revokeReason: undefined })) }} disabled={busy} autoFocus />{fieldErrors.revokeReason && <span id={`revoke-reason-error-${item.id}`} className="mt-1 block text-xs text-status-error-text">{fieldErrors.revokeReason}</span>}</label><p className="mt-2 text-xs text-slate-700">Thao tác này gỡ quyền chấm ngay lập tức và không thể tự khôi phục từ giao diện.</p><div className="mt-3 flex flex-wrap gap-2"><button type="submit" disabled={busy} className="min-h-11 rounded-lg bg-status-error px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Đang thu hồi…' : 'Xác nhận thu hồi'}</button><button type="button" disabled={busy} className="min-h-11 rounded-lg border border-hairline px-4 text-sm font-semibold text-slate-800 disabled:opacity-50" onClick={() => { setRevokeTarget(null); setRevokeReason(''); setFieldErrors(current => ({ ...current, revokeReason: undefined })) }}>Hủy</button></div></form> : <button type="button" disabled={busy} className="min-h-11 font-semibold text-status-error-text underline underline-offset-4 disabled:opacity-50" onClick={() => { setRevokeTarget(item); setRevokeReason(''); setFieldErrors(current => ({ ...current, revokeReason: undefined })) }}>Thu hồi</button>}</div>}</li>)}</ul>}
      </section>
    </>}
    <Link to={`/department/projects/${projectId}/result`} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline underline-offset-4 hover:text-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Đi đến chính sách và công bố kết quả →</Link>
  </main>
}
