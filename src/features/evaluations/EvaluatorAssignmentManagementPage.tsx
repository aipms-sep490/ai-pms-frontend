import { majorChoiceLabel, studentChoiceLabel, useProjectStudentNames } from './useProjectStudentNames'
import { list as listSupervisors } from '../supervisors/api/supervisor-api'
import { readAllPages } from '../../services/api/paged-read'
import { Avatar } from '../../components/ui/Avatar'
import { ButtonLink } from '../../components/ui/ButtonLink'
import { FilterToolbar, type ActiveFilterChip } from '../../components/ui/FilterToolbar'
import { Modal } from '../../components/ui/Modal'
import { Pagination } from '../../components/ui/Pagination'
import { useClientPagination } from '../../components/ui/useClientPagination'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { displayLabel } from '../../components/ui/display-label'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { projectEvaluationPaths } from './project-evaluation-paths'
import { useAuthSession } from '../auth/context/useAuthSession'
import { getProjectPeriods } from '../academic/api/governance-api'
import type { ProjectPeriod } from '../academic/types/governance.types'
import { getProject } from '../../services/api/projects.api'
import { assignEvaluator, getEligibleEvaluators, getEvaluationSchemes, getProjectEvaluationAssignments, replaceEvaluator, revokeEvaluator, type EligibleEvaluator } from '../../services/api/evaluations.api'
import { evaluationStageLabel, type EvaluationAssignment, type EvaluationScheme, type EvaluationSchemeComponent, type EvaluatorRole } from './evaluation-types'
import { HttpError } from '../../services/http/http-client'
import { Button } from '../../components/ui/Button'
import { InlineAlert } from '../../components/ui/InlineAlert'
import { ListLoading } from '../../components/ui/ListLoading'
import { ResourcePermissionNotice } from '../../components/ui/ResourcePermissionNotice'
import { useProjectCapabilities } from '../capabilities/useProjectCapabilities'

type AssignmentStatusFilter = 'ALL' | 'ACTIVE' | 'REVOKED'
type AssignmentFormErrors = { evaluatorId?: string; periodId?: string; componentId?: string; studentId?: string; revokeReason?: string; replaceEvaluatorId?: string; replaceReason?: string }

function assignmentError(reason: unknown, fallback: string) {
  if (reason instanceof HttpError) {
    const code = reason.problem?.code ?? reason.problem?.errorCode
    if (code === 'DEFENSE_COMMITTEE_REQUIRED') {
      return 'Cần thành lập và xác nhận (CONFIRMED) Hội đồng bảo vệ trước khi tải danh sách ứng viên hoặc phân công chấm nguội/bảo vệ.'
    }
    if (code === 'EVALUATOR_ROLE_CONFLICT') {
      return 'Xung đột vai trò D17 (EVALUATOR_ROLE_CONFLICT): Giảng viên hướng dẫn chính hoặc Mentor chuyên ngành không thể được phân công chấm phản biện hoặc hội đồng cho cùng đồ án.'
    }
    if (code === 'FINALIZED_ASSIGNMENT') {
      return 'Phân công này đã có phiếu chấm chốt điểm (FINALIZED) hoặc kết quả đã công bố nên không thể thu hồi hay thay thế.'
    }
    if (code === 'ASSIGNMENT_REVOKED') {
      return 'Phân công này đã bị thu hồi hoặc hết hạn (ASSIGNMENT_REVOKED).'
    }
    if (reason.status === 403) return 'Hệ thống không cấp quyền thực hiện thao tác này trong phạm vi đồ án.'
    if (reason.status === 404) return 'Không tìm thấy đồ án hoặc phân công. Hãy tải lại dữ liệu.'
  }
  return reason instanceof Error && reason.message.startsWith('Đã lưu ') ? reason.message : fallback
}

function assignedAt(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

export function EvaluatorAssignmentManagementPage() {
  const projectId = Number(useParams().projectId)
  const paths = projectEvaluationPaths(projectId, useLocation().pathname)
  const { session } = useAuthSession()
  const capabilities = useProjectCapabilities(projectId)
  const canManage = capabilities.can('manage_evaluators')
  const readOnly = paths.admin && !canManage
  const mutationLock = useRef(false)
  const errorSummary = useRef<HTMLDivElement>(null)
  const identities = useProjectStudentNames(projectId, session?.accessToken)
  const studentNames = identities.names
  const [majorNames, setMajorNames] = useState<Record<number, string>>({})
  const [evaluatorNames, setEvaluatorNames] = useState<Record<number, string>>({})
  const [periods, setPeriods] = useState<ProjectPeriod[]>([])
  const [schemes, setSchemes] = useState<EvaluationScheme[]>([])
  const [assignments, setAssignments] = useState<EvaluationAssignment[]>([])
  const [assignmentStatus, setAssignmentStatus] = useState<AssignmentStatusFilter>('ALL')
  const [listSearch, setListSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [evaluatorId, setEvaluatorId] = useState('')
  const [evaluatorFilter, setEvaluatorFilter] = useState('')
  const [eligibleEvaluators, setEligibleEvaluators] = useState<EligibleEvaluator[]>([])
  const [candidatesLoading, setCandidatesLoading] = useState(false)
  const [periodId, setPeriodId] = useState('')
  const [componentId, setComponentId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [evaluationType, setEvaluationType] = useState<EvaluatorRole>('LECTURER')
  const [revokeTarget, setRevokeTarget] = useState<EvaluationAssignment | null>(null)
  const [revokeReason, setRevokeReason] = useState('')
  const [replaceTarget, setReplaceTarget] = useState<EvaluationAssignment | null>(null)
  const [replaceEvaluatorId, setReplaceEvaluatorId] = useState('')
  const [replaceReason, setReplaceReason] = useState('')
  const [replaceUpdateCommittee, setReplaceUpdateCommittee] = useState(true)
  const [replaceCandidates, setReplaceCandidates] = useState<EligibleEvaluator[]>([])
  const [replaceCandidatesLoading, setReplaceCandidatesLoading] = useState(false)
  const [committeeRequired, setCommitteeRequired] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<AssignmentFormErrors>({})
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => { if (error) errorSummary.current?.focus() }, [error])

  const load = useCallback(async () => {
    if (!session || !Number.isInteger(projectId) || projectId < 1) {
      setError('Mã đồ án không hợp lệ hoặc phiên đăng nhập chưa sẵn sàng.')
      setLoading(false)
      return
    }
    setLoading(true); setLoaded(false); setAssignments([]); setPeriods([]); setSchemes([])
    try {
      const assignmentsRequest = readAllPages(page => getProjectEvaluationAssignments(projectId, assignmentStatus === 'ALL' ? undefined : assignmentStatus, undefined, page))
      const [project, currentAssignments, options, schemeOptions] = await Promise.all([
        getProject(projectId), assignmentsRequest,
        readAllPages(page => getProjectPeriods(session.accessToken, { search: '', periodType: 'EVALUATION' }, undefined, page)),
        getEvaluationSchemes(projectId),
      ])
      if (!project.id) throw new Error('Project missing')
      setMajorNames(Object.fromEntries((project.majors ?? []).map(m => [m.majorId, m.majorName])))
      setPeriods(options.filter(item => item.periodType === 'EVALUATION'))
      setSchemes(schemeOptions)
      setAssignments(currentAssignments)
      setLoaded(true); setError(null)
    } catch (reason) {
      setError(assignmentError(reason, 'Không thể tải phân công người chấm và kỳ đánh giá.'))
    } finally { setLoading(false) }
  }, [assignmentStatus, projectId, session])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    if (!session) return
    let active = true
    void readAllPages(page => listSupervisors(session.accessToken, { page, pageSize: 100 })).then(people => {
      if (active) setEvaluatorNames(Object.fromEntries(people.map(person => [person.userId, person.fullName])))
    }).catch(() => undefined)
    return () => { active = false }
  }, [session, projectId])

  const selectedScheme = schemes.find((scheme) => scheme.components.some((component) => component.id === Number(componentId))) ?? null
  const selectedComponent: EvaluationSchemeComponent | null = selectedScheme?.components.find((component) => component.id === Number(componentId)) ?? null
  const selectedStudentIds = studentId.split(',').filter(Boolean).map(Number)
  const selectedStudentId = selectedStudentIds[0] ?? null
  const targetReady = Boolean(selectedComponent && (selectedComponent.scope !== 'INDIVIDUAL' || selectedStudentId))

  useEffect(() => {
    const period = Number(periodId)
    if (!canManage || !periods.some(item => item.id === period && item.status === 'ACTIVE') || !selectedComponent || !targetReady) {
      setEligibleEvaluators([])
      setEvaluatorId(''); setCandidatesLoading(false)
      return
    }
    const controller = new AbortController()
    setCandidatesLoading(true); setEligibleEvaluators([]); setEvaluatorId(''); setCommitteeRequired(false)
    Promise.all((selectedComponent.scope === 'INDIVIDUAL' ? selectedStudentIds : [null]).map(target => readAllPages(page => getEligibleEvaluators(projectId, period, { componentId: selectedComponent.id, scope: selectedComponent.scope, majorId: selectedComponent.majorId, studentId: target }, page, 100, controller.signal)))).then(groups => ({ items: (groups[0] ?? []).filter(candidate => groups.every(group => group.some(other => other.userId === candidate.userId && candidate.evaluationTypes.every(type => other.evaluationTypes.includes(type))))) }))
      .then(page => { if (!controller.signal.aborted) { setEligibleEvaluators(page.items); setEvaluatorNames(current => ({ ...current, ...Object.fromEntries(page.items.map(item => [item.userId, item.displayName])) })) } })
      .catch(reason => {
        if (!controller.signal.aborted) {
          const code = reason instanceof HttpError ? (reason.problem?.code ?? reason.problem?.errorCode) : undefined
          if (code === 'DEFENSE_COMMITTEE_REQUIRED') setCommitteeRequired(true)
          setError(assignmentError(reason, 'Không thể tải danh sách người chấm hợp lệ cho đợt này.'))
        }
      })
      .finally(() => { if (!controller.signal.aborted) setCandidatesLoading(false) })
    return () => controller.abort()
  }, [canManage, periodId, periods, projectId, selectedComponent, studentId, targetReady])

  useEffect(() => {
    if (!replaceTarget || !replaceTarget.componentId || replaceTarget.scope === 'UNKNOWN') {
      setReplaceCandidates([]); setReplaceCandidatesLoading(false)
      return
    }
    const controller = new AbortController()
    setReplaceCandidatesLoading(true)
    readAllPages(page => getEligibleEvaluators(
      projectId,
      replaceTarget.projectPeriodId,
      { componentId: replaceTarget.componentId!, scope: replaceTarget.scope as 'COMMON' | 'MAJOR_SPECIFIC' | 'INDIVIDUAL', majorId: replaceTarget.majorId, studentId: replaceTarget.studentId },
      page,
      100,
      controller.signal,
    ))
      .then(list => {
        if (!controller.signal.aborted) {
          setReplaceCandidates(list.filter(c => c.userId !== replaceTarget.evaluatorId))
        }
      })
      .catch(() => { if (!controller.signal.aborted) setReplaceCandidates([]) })
      .finally(() => { if (!controller.signal.aborted) setReplaceCandidatesLoading(false) })
    return () => controller.abort()
  }, [projectId, replaceTarget])

  const run = async (operation: () => Promise<unknown>, fallback: string, success: string) => {
    if (!canManage || mutationLock.current) return
    mutationLock.current = true
    setBusy(true); setError(null); setNotice(null)
    try {
      await operation()
      capabilities.retry()
      setRevokeTarget(null); setRevokeReason('')
      setReplaceTarget(null); setReplaceEvaluatorId(''); setReplaceReason('')
      await load()
      setNotice(success)
    } catch (reason) {
      capabilities.retry()
      if (reason instanceof HttpError && reason.status === 409) {
        await load()
        const code = reason.problem?.code ?? reason.problem?.errorCode
        if (code === 'DEFENSE_COMMITTEE_REQUIRED') setCommitteeRequired(true)
        if (code === 'EVALUATOR_ROLE_CONFLICT' || code === 'DEFENSE_COMMITTEE_REQUIRED' || code === 'FINALIZED_ASSIGNMENT') {
          setError(assignmentError(reason, fallback))
        } else {
          setError('Phân công, bộ tiêu chí hoặc điều kiện đánh giá đã thay đổi. Dữ liệu mới đã được tải lại; hãy kiểm tra trước khi thao tác tiếp.')
        }
      } else setError(assignmentError(reason, fallback))
    } finally { mutationLock.current = false; setBusy(false) }
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canManage || candidatesLoading || loading || !loaded || (selectedComponent?.scope === 'INDIVIDUAL' && identities.loading)) return
    const evaluator = Number(evaluatorId), period = Number(periodId)
    const errors: AssignmentFormErrors = {}
    const selectedCandidate = eligibleEvaluators.find(item => item.userId === evaluator)
    if (!selectedCandidate) errors.evaluatorId = 'Chọn người chấm từ danh sách đủ điều kiện do hệ thống trả về.'
    else if (!selectedCandidate.evaluationTypes.includes(evaluationType)) errors.evaluatorId = 'Vai trò đánh giá đã chọn không còn hợp lệ với người chấm này.'
    if (!periods.some(item => item.id === period && item.status === 'ACTIVE')) errors.periodId = 'Chọn một đợt đánh giá đang diễn ra.'
    if (!selectedComponent || selectedScheme?.status !== 'PUBLISHED' || selectedScheme.projectPeriodId !== period) errors.componentId = 'Chọn thành phần thuộc phương án đánh giá đã công bố của đúng đợt.'
    if (selectedComponent?.scope === 'INDIVIDUAL' && !selectedStudentId) errors.studentId = 'Chọn sinh viên thuộc danh sách thành viên đã chốt của thành phần này.'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) { setError('Kiểm tra các trường được đánh dấu trước khi phân công.'); return }
    if (!selectedComponent) return
    void run(async () => {
      const targets = selectedComponent.scope === 'INDIVIDUAL' ? selectedStudentIds : [null]
      let completed = 0
      for (const target of targets) {
        try {
          await assignEvaluator(projectId, { evaluatorId: evaluator, projectPeriodId: period, evaluationType, componentId: selectedComponent.id, scope: selectedComponent.scope, majorId: selectedComponent.majorId, studentId: target })
          completed++
        } catch (reason) {
          if (completed === 0) throw reason
          await load()
          throw new Error('Đã lưu ' + completed + '/' + targets.length + ' phân công. Đã dừng ở mục lỗi; hãy kiểm tra danh sách trước khi thử lại.')
        }
      }
      setStudentId('')
    }, 'Không thể lưu phân công.', 'Đã lưu các phân công đã chọn. Danh sách đã được cập nhật.')
  }

  const submitRevoke = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canManage || !revokeTarget) return
    const reason = revokeReason.trim()
    if (!reason) { setFieldErrors(current => ({ ...current, revokeReason: 'Nêu lý do thu hồi để tiếp tục.' })); return }
    setFieldErrors(current => ({ ...current, revokeReason: undefined }))
    void run(() => revokeEvaluator(revokeTarget.id, revokeTarget.concurrencyToken, reason), 'Không thể thu hồi phân công. Hãy kiểm tra lại trạng thái và thử lại.', 'Đã thu hồi phân công. Danh sách bên dưới đã được tải lại từ máy chủ.')
  }

  const submitReplace = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canManage || !replaceTarget) return
    const replacementId = Number(replaceEvaluatorId)
    const reason = replaceReason.trim()
    const nextErrors: AssignmentFormErrors = {}
    if (!Number.isInteger(replacementId) || replacementId < 1 || replacementId === replaceTarget.evaluatorId) {
      nextErrors.replaceEvaluatorId = 'Chọn giảng viên thay thế hợp lệ khác với người chấm hiện tại.'
    }
    if (!reason) {
      nextErrors.replaceReason = 'Nêu lý do thay thế giám khảo để ghi vết kiểm toán.'
    }
    setFieldErrors(current => ({ ...current, ...nextErrors }))
    if (nextErrors.replaceEvaluatorId || nextErrors.replaceReason) return
    void run(
      () => replaceEvaluator(replaceTarget.id, {
        replacementEvaluatorId: replacementId,
        concurrencyToken: replaceTarget.concurrencyToken,
        reason,
        updateCommitteeIfNeeded: replaceUpdateCommittee,
      }),
      'Không thể thay thế giám khảo. Kiểm tra quy tắc D17 hoặc trạng thái chốt điểm.',
      'Đã thu hồi phân công cũ và gán giám khảo thay thế trong cùng một giao dịch.',
    )
  }

  const eligiblePeriods = periods.filter(item => item.status === 'ACTIVE')
  const publishedComponents = schemes.filter((scheme) => scheme.status === 'PUBLISHED' && scheme.projectPeriodId === Number(periodId)).flatMap((scheme) => scheme.components.map((component) => ({ scheme, component })))
  const eligibleStudents = selectedComponent?.scope === 'INDIVIDUAL' ? (selectedScheme?.students.filter((student) => student.majorId === selectedComponent.majorId) ?? []) : []
  // v5 D14/BRX-EVAL-03: warn when a required component of the selected period lacks enough
  // active evaluators. Only reliable when active assignments are in the loaded set.
  const activeAssignments = assignments.filter((item) => item.status === 'ACTIVE')
  const coverageGaps = assignmentStatus === 'REVOKED' ? [] : publishedComponents
    .map(({ scheme, component }) => ({ scheme, component, assigned: component.scope === 'INDIVIDUAL'
      ? scheme.students.filter(student => student.majorId === component.majorId).reduce((total, student) => total + Math.min(component.requiredEvaluators, activeAssignments.filter(item => item.componentId === component.id && item.studentId === student.studentId).length), 0)
      : activeAssignments.filter((item) => item.componentId === component.id).length,
      required: component.requiredEvaluators * (component.scope === 'INDIVIDUAL' ? scheme.students.filter(student => student.majorId === component.majorId).length : 1) }))
    .filter((row) => row.assigned < row.required)
  const roleOptions = (evaluatorId ? eligibleEvaluators.find((item) => item.userId === Number(evaluatorId))?.evaluationTypes : undefined) ?? ['LECTURER', 'SUPERVISOR']
  const filteredEvaluators = eligibleEvaluators.filter(item =>
    !evaluatorFilter.trim() ||
    item.displayName.toLowerCase().includes(evaluatorFilter.toLowerCase()) ||
    item.departmentName.toLowerCase().includes(evaluatorFilter.toLowerCase())
  )

  const componentById = useMemo(
    () => new Map(schemes.flatMap(s => s.components).map(c => [c.id, c])),
    [schemes],
  )
  const visibleAssignments = useMemo(() => {
    const q = listSearch.trim().toLowerCase()
    return assignments.filter(item => {
      const comp = item.componentId ? componentById.get(item.componentId) : undefined
      if (stageFilter && comp?.stage !== stageFilter) return false
      if (roleFilter && item.evaluationType !== roleFilter) return false
      if (q) {
        const evalName = evaluatorNames[item.evaluatorId] ?? ''
        const compName = comp?.name ?? displayLabel(item.scope)
        const studentLabel = item.studentId ? studentChoiceLabel(item.studentId, studentNames[item.studentId]) : ''
        const periodName = periods.find(p => p.id === item.projectPeriodId)?.name ?? ''
        if (!`${evalName} ${compName} ${studentLabel} ${periodName} ${displayLabel(item.evaluationType)}`.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [assignments, componentById, stageFilter, roleFilter, listSearch, evaluatorNames, studentNames, periods])

  const assignmentPager = useClientPagination(visibleAssignments, 10)

  const hasListFilters = Boolean(listSearch.trim() || assignmentStatus !== 'ALL' || stageFilter || roleFilter)
  const listChips: ActiveFilterChip[] = []
  if (assignmentStatus !== 'ALL') listChips.push({ id: 'status', label: 'Trạng thái', value: assignmentStatus === 'ACTIVE' ? 'Đang hiệu lực' : 'Đã thu hồi' })
  if (stageFilter) listChips.push({ id: 'stage', label: 'Giai đoạn', value: evaluationStageLabel(stageFilter) })
  if (roleFilter) listChips.push({ id: 'role', label: 'Vai trò', value: displayLabel(roleFilter) })

  return (
    <WorkspacePage size="wide" className="space-y-6 academic-capability-page" title={readOnly ? 'Xem phân công người chấm' : 'Phân công người chấm'} eyebrow="Đánh giá đồ án" backTo={paths.admin ? '/admin/access' : '/department/portfolio'} backLabel={paths.admin ? 'Quản trị hệ thống' : 'Danh mục đồ án'} description={readOnly ? 'Theo dõi phân công theo dữ liệu học vụ đã ghi nhận.' : 'Chọn đợt đánh giá, thành phần chấm và giảng viên phù hợp cho đồ án.'} action={<ButtonLink to={paths.scheme} icon="schema">Phương án đánh giá</ButtonLink>}>
    {readOnly && !capabilities.loading && <p role="status" className="rounded-lg border border-hairline bg-canvas p-3 text-sm text-ink-muted">Chế độ theo dõi: bộ môn phụ trách thực hiện phân công và thu hồi người chấm.</p>}
    <ResourcePermissionNotice loading={capabilities.loading} error={capabilities.error} allowed={canManage} reason={capabilities.reasonLabel('manage_evaluators')} onRetry={capabilities.retry} />

    {error && <div ref={errorSummary} tabIndex={-1} role="alert" aria-labelledby="assignment-error-title" className="rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><p id="assignment-error-title" className="font-semibold">Chưa thể hoàn tất thao tác</p><p className="mt-1">{error}</p><button type="button" className="mt-2 min-h-11 font-semibold underline underline-offset-4" onClick={() => void load()}>Tải lại dữ liệu</button></div>}
    {committeeRequired && !paths.admin && (
      <InlineAlert
        tone="warning"
        action={<Link to={`/department/projects/${projectId}/defense`} className="inline-flex min-h-9 items-center rounded-lg bg-primary px-3 text-xs font-semibold text-white hover:bg-primary-hover">Mở Hội đồng bảo vệ →</Link>}
      >
        <strong>Chưa xác nhận Hội đồng bảo vệ (DEFENSE_COMMITTEE_REQUIRED):</strong> Vui lòng lập và xác nhận (CONFIRMED) Hội đồng trước khi phân công chấm nguội/bảo vệ. Không cần xếp lịch phòng khi chia phòng đang tắt (POL-06).
      </InlineAlert>
    )}
    {notice && (
      <div role="status" className="flex items-center gap-2.5 rounded-xl border border-hairline border-l-4 border-l-status-success-text bg-card p-4 text-sm text-ink shadow-xs">
        <span className="material-symbols-outlined text-[18px] text-status-success-text" aria-hidden="true">check_circle</span>
        <span>{notice}</span>
      </div>
    )}
    {loading && <ListLoading label="Đang tải phân công…" />}
    {!loading && loaded && (
      <div className={canManage ? 'grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]' : 'space-y-6'}>
        <div className="min-w-0 space-y-5">
          {periodId && publishedComponents.length > 0 && (
            <section
              aria-labelledby="coverage-title"
              className={`rounded-xl border border-hairline border-l-4 bg-card p-5 text-ink shadow-xs ${coverageGaps.length > 0 ? 'border-l-[var(--color-accent-amber)]' : 'border-l-status-success-text'}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-[20px] ${coverageGaps.length > 0 ? 'text-status-warning-text' : 'text-status-success-text'}`} aria-hidden="true">
                    {coverageGaps.length > 0 ? 'warning' : 'check_circle'}
                  </span>
                  <h2 id="coverage-title" className="font-heading font-semibold text-ink">Độ phủ người chấm theo thành phần</h2>
                </div>
                <StatusBadge tone={coverageGaps.length > 0 ? 'warning' : 'success'} label={coverageGaps.length > 0 ? `Thiếu ${coverageGaps.length} thành phần` : 'Đủ người chấm'} />
              </div>
              {coverageGaps.length === 0
                ? <p className="mt-2 text-sm text-ink-soft">Mọi thành phần đã công bố của đợt này đã đủ số người chấm theo yêu cầu.</p>
                : <><p className="mt-2 text-sm text-status-warning-text">Các thành phần sau chưa đủ người chấm — không thể chốt kết quả cho tới khi đủ số lượng theo yêu cầu.</p>
                  <ul className="mt-3 space-y-1 text-sm">{coverageGaps.map(({ scheme, component, assigned, required }) => <li key={component.id} className="flex flex-wrap items-center gap-2"><span className="font-medium text-ink">{scheme.name} v{scheme.version} · {component.name}</span><span className="text-ink-muted">({displayLabel(component.scope)}{component.majorId ? ` · ${majorChoiceLabel(component.majorId, majorNames[component.majorId])}` : ''})</span><span className="font-mono font-semibold text-status-warning-text">{assigned}/{required} người chấm</span></li>)}</ul></>}
            </section>
          )}

          <section aria-labelledby="assignment-list-title" className="rounded-xl border border-hairline bg-card p-5 shadow-xs space-y-4">
            <div>
              <h2 id="assignment-list-title" className="font-heading font-semibold text-ink">Phân công hiện có</h2>
              <p className="mt-1 text-sm text-ink-muted">Theo dõi người chấm đang được phân công và lịch sử thu hồi.</p>
            </div>
            <FilterToolbar
              embedded
              search={listSearch}
              onSearchChange={setListSearch}
              searchLabel="Tìm phân công người chấm"
              searchPlaceholder="Tìm theo giảng viên, thành phần, sinh viên..."
              debounceMs={0}
              tabs={[
                { value: 'ALL', label: 'Tất cả' },
                { value: 'ACTIVE', label: 'Đang hiệu lực' },
                { value: 'REVOKED', label: 'Đã thu hồi' },
              ]}
              activeTab={assignmentStatus}
              onTabChange={next => { if (!busy) setAssignmentStatus(next as AssignmentStatusFilter) }}
              tabsLabel="Lọc phân công theo trạng thái"
              controls={
                <>
                  <label className="ft-select-wrap">
                    <span className="sr-only">Giai đoạn</span>
                    <select className="ft-select" aria-label="Lọc theo giai đoạn" value={stageFilter} onChange={e => setStageFilter(e.target.value)} disabled={busy}>
                      <option value="">Tất cả giai đoạn</option>
                      <option value="ON_GOING">Đánh giá quá trình</option>
                      <option value="COLD">Chấm hồ sơ đã khóa</option>
                      <option value="DEFENSE">Bảo vệ</option>
                    </select>
                  </label>
                  <label className="ft-select-wrap">
                    <span className="sr-only">Vai trò đánh giá</span>
                    <select className="ft-select" aria-label="Lọc theo vai trò đánh giá" value={roleFilter} onChange={e => setRoleFilter(e.target.value)} disabled={busy}>
                      <option value="">Tất cả vai trò</option>
                      <option value="LECTURER">Giảng viên</option>
                      <option value="SUPERVISOR">Giảng viên hướng dẫn</option>
                    </select>
                  </label>
                </>
              }
              activeChips={listChips}
              onRemoveChip={id => {
                if (id === 'status') setAssignmentStatus('ALL')
                if (id === 'stage') setStageFilter('')
                if (id === 'role') setRoleFilter('')
              }}
              onClearAll={() => { setListSearch(''); setAssignmentStatus('ALL'); setStageFilter(''); setRoleFilter('') }}
              hasActiveFilters={hasListFilters}
              resultSummary={`${visibleAssignments.length} / ${assignments.length} phân công`}
              pagination={assignmentPager.showPagination ? { page: assignmentPager.page, pages: assignmentPager.pages, total: assignmentPager.total, pageSize: assignmentPager.pageSize, busy, onPage: assignmentPager.setPage } : undefined}
            />

            {visibleAssignments.length === 0 ? <p className="mt-4 text-sm text-ink-muted">Chưa có người chấm phù hợp với bộ lọc này.</p> : (
              <>
                <ul className="divide-y divide-hairline">{assignmentPager.paginatedItems.map(item => {
                  const displayName = evaluatorNames[item.evaluatorId] ?? 'Giảng viên được phân công'
                  const comp = item.componentId ? componentById.get(item.componentId) : undefined
                  return (
                    <li key={item.id} className="py-4 text-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <Avatar name={displayName} size="sm" />
                          <div className="min-w-0">
                            <p className="font-semibold text-ink">{displayName} · {comp?.name ?? displayLabel(item.scope)}{item.studentId ? ` · ${studentChoiceLabel(item.studentId, studentNames[item.studentId])}` : ''}</p>
                            <p className="mt-1 text-ink-muted">{displayLabel(item.evaluationType)}{comp?.stage ? ` · ${evaluationStageLabel(comp.stage)}` : ''} · {periods.find(p => p.id === item.projectPeriodId)?.name ?? 'Đợt đánh giá'}</p>
                            <p className="mt-1 font-mono text-xs text-ink-muted">Phân công {assignedAt(item.assignedAt)}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge tone={item.status === 'ACTIVE' ? 'success' : 'neutral'} label={item.status === 'ACTIVE' ? 'Đang hiệu lực' : 'Đã thu hồi'} />
                          {item.hasFinalizedEvaluation && (
                            <StatusBadge tone="info" label="Đã chốt điểm (không thể thu hồi)" />
                          )}
                          {canManage && item.status === 'ACTIVE' && (
                            <>
                              {item.componentId != null && item.scope !== 'UNKNOWN' && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  disabled={busy || Boolean(item.hasFinalizedEvaluation)}
                                  onClick={() => {
                                    setReplaceTarget(item)
                                    setReplaceEvaluatorId('')
                                    setReplaceReason('')
                                    setReplaceUpdateCommittee(true)
                                    setFieldErrors(current => ({ ...current, replaceEvaluatorId: undefined, replaceReason: undefined }))
                                  }}
                                >
                                  Thay thế
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={busy || Boolean(item.hasFinalizedEvaluation)}
                                className="text-status-error-text hover:bg-status-error-bg"
                                onClick={() => { setRevokeTarget(item); setRevokeReason(''); setFieldErrors(current => ({ ...current, revokeReason: undefined })) }}
                              >
                                Thu hồi
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </li>
                  )
                })}</ul>
                {assignmentPager.showPagination && (
                  <div className="border-t border-hairline pt-3">
                    <Pagination
                      page={assignmentPager.page}
                      pages={assignmentPager.pages}
                      total={assignmentPager.total}
                      pageSize={assignmentPager.pageSize}
                      onPage={assignmentPager.setPage}
                      onPageSizeChange={assignmentPager.setPageSize}
                    />
                  </div>
                )}
              </>
            )}
          </section>
        </div>

        {canManage && (
          <section aria-labelledby="new-assignment-title" className="rounded-xl border border-hairline bg-card p-5 shadow-xs xl:sticky xl:top-6">
            <h2 id="new-assignment-title" className="font-heading font-semibold text-ink">Phân công mới</h2>
            <p className="mt-1 text-xs leading-5 text-ink-muted">Chỉ những giảng viên đủ điều kiện cho đợt và thành phần đã chọn mới xuất hiện trong danh sách.</p>
            <form className="mt-4 grid gap-3.5" onSubmit={submit} noValidate>
              <label className="text-sm font-medium text-ink-soft" htmlFor="evaluation-period">Đợt đánh giá<select id="evaluation-period" aria-invalid={Boolean(fieldErrors.periodId)} aria-describedby={fieldErrors.periodId ? 'evaluation-period-error' : undefined} className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 font-normal text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" required value={periodId} onChange={event => { setPeriodId(event.target.value); setComponentId(''); setStudentId(''); setEvaluatorId(''); setFieldErrors(current => ({ ...current, periodId: undefined, componentId: undefined, studentId: undefined, evaluatorId: undefined })) }} disabled={busy}><option value="">Chọn đợt</option>{periods.map(item => <option key={item.id} value={item.id} disabled={item.status !== 'ACTIVE'}>{item.semesterName} · {item.name} · {displayLabel(item.status)}</option>)}</select>{fieldErrors.periodId && <span id="evaluation-period-error" className="mt-1 block text-xs text-status-error-text">{fieldErrors.periodId}</span>}</label>
              <label className="text-sm font-medium text-ink-soft" htmlFor="scheme-component">Thành phần đánh giá<select id="scheme-component" aria-invalid={Boolean(fieldErrors.componentId)} aria-describedby={fieldErrors.componentId ? 'scheme-component-error' : undefined} className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 font-normal text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" required value={componentId} onChange={event => { setComponentId(event.target.value); setStudentId(''); setEvaluatorId(''); setFieldErrors(current => ({ ...current, componentId: undefined, studentId: undefined, evaluatorId: undefined })) }} disabled={busy || !periodId}><option value="">Chọn thành phần đã công bố</option>{publishedComponents.map(({ scheme, component }) => <option key={component.id} value={component.id}>{scheme.name} v{scheme.version} · {component.name} · {displayLabel(component.scope)}{component.majorId ? ` · ${majorChoiceLabel(component.majorId, majorNames[component.majorId])}` : ''}</option>)}</select>{fieldErrors.componentId && <span id="scheme-component-error" className="mt-1 block text-xs text-status-error-text">{fieldErrors.componentId}</span>}</label>
              {selectedComponent?.scope === 'INDIVIDUAL' && <fieldset className="min-w-0" disabled={busy || identities.loading} aria-invalid={Boolean(fieldErrors.studentId)} aria-describedby={fieldErrors.studentId ? 'assignment-student-error' : undefined}>
                <legend className="text-sm font-medium text-ink-soft">Chọn sinh viên cần chấm ({selectedStudentIds.length}/{eligibleStudents.length})</legend>
                {identities.loading && <p role="status" className="mt-1 text-sm text-ink-muted">Đang tải tên sinh viên từ hồ sơ đã chốt…</p>}
                {identities.error && <div role="alert" className="mt-1 flex flex-wrap items-center gap-2 text-sm text-status-warning-text"><span>{identities.error}</span><Button type="button" size="sm" variant="secondary" onClick={identities.retry}>Thử tải lại tên sinh viên</Button></div>}
                <div className="mt-2 max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-hairline bg-canvas/40 p-2.5">
                  {eligibleStudents.map(student => {
                    const checked = selectedStudentIds.includes(student.studentId)
                    const label = `${studentChoiceLabel(student.studentId, studentNames[student.studentId])} · ${majorChoiceLabel(student.majorId, majorNames[student.majorId])}`
                    return (
                      <label key={student.studentId} className={`flex min-h-10 cursor-pointer items-center gap-2.5 rounded-md border px-3 py-1.5 text-sm transition-colors ${checked ? 'border-primary bg-primary-subtle font-semibold text-ink' : 'border-hairline bg-card text-ink-soft hover:border-primary/40'}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={busy || identities.loading}
                          onChange={() => {
                            const next = checked
                              ? selectedStudentIds.filter(id => id !== student.studentId)
                              : [...selectedStudentIds, student.studentId]
                            setStudentId(next.join(','))
                            setEvaluatorId('')
                            setFieldErrors(current => ({ ...current, studentId: undefined, evaluatorId: undefined }))
                          }}
                        />
                        <span>{label}</span>
                      </label>
                    )
                  })}
                </div>
                {fieldErrors.studentId && <span id="assignment-student-error" className="mt-1 block text-xs text-status-error-text">{fieldErrors.studentId}</span>}
              </fieldset>}
              <div className="flex flex-col"><label className="text-sm font-medium text-ink-soft" htmlFor="evaluator-id">Người chấm</label>{eligibleEvaluators.length > 5 && <input type="search" className="mt-1 mb-1 min-h-11 w-full rounded-md border border-hairline bg-card px-2.5 text-xs text-ink placeholder:text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" placeholder="Lọc nhanh theo tên hoặc bộ môn…" value={evaluatorFilter} onChange={e => setEvaluatorFilter(e.target.value)} aria-label="Lọc người chấm" disabled={busy || candidatesLoading || !periodId} />}<select id="evaluator-id" aria-invalid={Boolean(fieldErrors.evaluatorId)} aria-describedby={fieldErrors.evaluatorId ? 'evaluator-id-error' : undefined} required className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 font-normal text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" value={evaluatorId} onChange={event => { const selected = eligibleEvaluators.find(item => item.userId === Number(event.target.value)); setEvaluatorId(event.target.value); if (selected && !selected.evaluationTypes.includes(evaluationType)) setEvaluationType(selected.evaluationTypes[0] ?? 'LECTURER'); setFieldErrors(current => ({ ...current, evaluatorId: undefined })) }} disabled={busy || candidatesLoading || !periodId}><option value="">{candidatesLoading ? 'Đang tải người chấm…' : 'Chọn người chấm'}</option>{filteredEvaluators.map(item => <option key={item.userId} value={item.userId}>{item.displayName} · {item.departmentName} · {item.evaluationTypes.map(displayLabel).join(' / ')}</option>)}</select>{fieldErrors.evaluatorId && <span id="evaluator-id-error" className="mt-1 block text-xs text-status-error-text">{fieldErrors.evaluatorId}</span>}</div>
              <label className="text-sm font-medium text-ink-soft" htmlFor="evaluation-type">Vai trò đánh giá<select id="evaluation-type" className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 font-normal text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" value={evaluationType} onChange={event => setEvaluationType(event.target.value as EvaluatorRole)} disabled={busy || !evaluatorId}>{roleOptions.map(type => <option key={type} value={type}>{displayLabel(type)}</option>)}</select></label>
              <div>
                <Button
                  type="submit"
                  className="w-full justify-center"
                  disabled={busy || candidatesLoading || eligiblePeriods.length === 0 || !evaluatorId || !targetReady || (selectedComponent?.scope === 'INDIVIDUAL' && identities.loading)}
                >
                  {busy ? 'Đang lưu…' : 'Phân công người chấm'}
                </Button>
              </div>
            </form>
            {periods.length === 0 && <p className="mt-3 text-sm text-status-warning-text">Chưa có đợt đánh giá thuộc phạm vi quản lý của bạn.</p>}
            {periods.length > 0 && eligiblePeriods.length === 0 && <p className="mt-3 text-sm text-status-warning-text">Chưa có đợt đánh giá đang diễn ra để phân công.</p>}
            {periodId && publishedComponents.length === 0 && <p className="mt-3 text-sm text-status-warning-text">Đợt đã chọn chưa có phương án đánh giá được công bố.</p>}
            {targetReady && !candidatesLoading && eligibleEvaluators.length === 0 && <p className="mt-3 text-sm text-status-warning-text">Hệ thống chưa tìm thấy người chấm hợp lệ cho thành phần và đối tượng đã chọn.</p>}
          </section>
        )}
      </div>
    )}

    {revokeTarget && (
      <Modal
        open
        title="Thu hồi phân công người chấm"
        busy={busy}
        onClose={() => { setRevokeTarget(null); setRevokeReason(''); setFieldErrors(current => ({ ...current, revokeReason: undefined })) }}
      >
        <form onSubmit={submitRevoke} className="space-y-4">
          <p className="text-sm text-ink-soft">
            Thu hồi quyền chấm của <strong className="text-ink">{evaluatorNames[revokeTarget.evaluatorId] ?? 'Giảng viên được phân công'}</strong> cho thành phần <strong className="text-ink">{componentById.get(revokeTarget.componentId ?? 0)?.name ?? displayLabel(revokeTarget.scope)}</strong>.
          </p>
          <label className="block text-sm font-medium text-ink-soft" htmlFor={`revoke-reason-${revokeTarget.id}`}>
            Lý do thu hồi
            <input
              id={`revoke-reason-${revokeTarget.id}`}
              aria-invalid={Boolean(fieldErrors.revokeReason)}
              aria-describedby={fieldErrors.revokeReason ? `revoke-reason-error-${revokeTarget.id}` : undefined}
              className="mt-1.5 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 font-normal text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              value={revokeReason}
              onChange={event => { setRevokeReason(event.target.value); setFieldErrors(current => ({ ...current, revokeReason: undefined })) }}
              disabled={busy}
              autoFocus
            />
            {fieldErrors.revokeReason && <span id={`revoke-reason-error-${revokeTarget.id}`} className="mt-1 block text-xs text-status-error-text">{fieldErrors.revokeReason}</span>}
          </label>
          <p className="rounded-lg border border-status-warning-border bg-status-warning-bg p-3 text-xs text-status-warning-text">
            Thao tác này gỡ quyền chấm ngay lập tức và không thể tự khôi phục từ giao diện.
          </p>
          <div className="flex flex-wrap justify-end gap-2 border-t border-hairline pt-3">
            <Button type="button" variant="secondary" disabled={busy} onClick={() => { setRevokeTarget(null); setRevokeReason(''); setFieldErrors(current => ({ ...current, revokeReason: undefined })) }}>Hủy</Button>
            <Button type="submit" variant="danger" disabled={busy}>{busy ? 'Đang thu hồi…' : 'Xác nhận thu hồi'}</Button>
          </div>
        </form>
      </Modal>
    )}

    {replaceTarget && (
      <Modal
        open
        title="Thu hồi & Thay thế giám khảo"
        busy={busy}
        onClose={() => { setReplaceTarget(null); setReplaceEvaluatorId(''); setReplaceReason(''); setFieldErrors(current => ({ ...current, replaceEvaluatorId: undefined, replaceReason: undefined })) }}
      >
        <form onSubmit={submitReplace} className="space-y-4">
          <p className="text-sm text-ink-soft">
            Thay thế <strong className="text-ink">{evaluatorNames[replaceTarget.evaluatorId] ?? `GV #${replaceTarget.evaluatorId}`}</strong> ở thành phần <strong className="text-ink">{componentById.get(replaceTarget.componentId ?? 0)?.name ?? displayLabel(replaceTarget.scope)}</strong> trong 1 giao dịch nguyên tử (giữ nguyên các phiếu đã chốt của giám khảo khác và kiểm tra xung đột D17).
          </p>
          <label className="block text-sm font-medium text-ink-soft" htmlFor={`replace-evaluator-${replaceTarget.id}`}>
            Giảng viên thay thế
            {replaceCandidates.length > 0 ? (
              <select
                id={`replace-evaluator-${replaceTarget.id}`}
                aria-invalid={Boolean(fieldErrors.replaceEvaluatorId)}
                className="mt-1.5 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 font-normal text-ink"
                value={replaceEvaluatorId}
                disabled={busy || replaceCandidatesLoading}
                onChange={e => { setReplaceEvaluatorId(e.target.value); setFieldErrors(c => ({ ...c, replaceEvaluatorId: undefined })) }}
              >
                <option value="">{replaceCandidatesLoading ? 'Đang tải ứng viên…' : 'Chọn giảng viên thay thế hợp lệ'}</option>
                {replaceCandidates.map(cand => (
                  <option key={cand.userId} value={cand.userId}>
                    {cand.displayName} · {cand.departmentName}
                  </option>
                ))}
              </select>
            ) : (
              <select
                id={`replace-evaluator-${replaceTarget.id}`}
                aria-invalid={Boolean(fieldErrors.replaceEvaluatorId)}
                className="mt-1.5 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 font-normal text-ink"
                value={replaceEvaluatorId}
                disabled={busy || replaceCandidatesLoading}
                onChange={e => { setReplaceEvaluatorId(e.target.value); setFieldErrors(c => ({ ...c, replaceEvaluatorId: undefined })) }}
              >
                <option value="">{replaceCandidatesLoading ? 'Đang tải ứng viên…' : 'Chọn giảng viên trong hệ thống'}</option>
                {Object.entries(evaluatorNames)
                  .filter(([id]) => Number(id) !== replaceTarget.evaluatorId)
                  .map(([id, fullName]) => (
                    <option key={id} value={id}>{fullName}</option>
                  ))}
              </select>
            )}
            {fieldErrors.replaceEvaluatorId && <span className="mt-1 block text-xs text-status-error-text">{fieldErrors.replaceEvaluatorId}</span>}
          </label>
          <label className="block text-sm font-medium text-ink-soft" htmlFor={`replace-reason-${replaceTarget.id}`}>
            Lý do thay thế (bắt buộc)
            <input
              id={`replace-reason-${replaceTarget.id}`}
              aria-invalid={Boolean(fieldErrors.replaceReason)}
              className="mt-1.5 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 font-normal text-ink"
              value={replaceReason}
              onChange={e => { setReplaceReason(e.target.value); setFieldErrors(c => ({ ...c, replaceReason: undefined })) }}
              placeholder="Ví dụ: Giám khảo bận đột xuất / ốm..."
              disabled={busy}
            />
            {fieldErrors.replaceReason && <span className="mt-1 block text-xs text-status-error-text">{fieldErrors.replaceReason}</span>}
          </label>
          {(replaceTarget.stage === 'COLD' || replaceTarget.stage === 'DEFENSE') && (
            <label className="flex items-start gap-2 text-xs text-ink-soft">
              <input
                type="checkbox"
                checked={replaceUpdateCommittee}
                disabled={busy}
                onChange={e => setReplaceUpdateCommittee(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-hairline text-primary"
              />
              <span>Tự động bổ sung giảng viên thay thế vào Hội đồng bảo vệ đang hiệu lực nếu chưa có mặt (không làm thay đổi các phiếu Cold đã chốt).</span>
            </label>
          )}
          <div className="flex flex-wrap justify-end gap-2 border-t border-hairline pt-3">
            <Button type="button" variant="secondary" disabled={busy} onClick={() => { setReplaceTarget(null); setReplaceEvaluatorId(''); setReplaceReason('') }}>Hủy</Button>
            <Button type="submit" disabled={busy}>{busy ? 'Đang thay thế…' : 'Xác nhận thay thế'}</Button>
          </div>
        </form>
      </Modal>
    )}

    <div>
      <Link
        to={paths.result}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-hairline bg-card px-4 py-2.5 text-sm font-semibold text-ink-soft transition-all hover:bg-canvas"
      >
        <span>{capabilities.can('publish_project_result') ? 'Công bố kết quả' : 'Xem kết quả'}</span>
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_forward</span>
      </Link>
    </div>
  </WorkspacePage>
)
}
