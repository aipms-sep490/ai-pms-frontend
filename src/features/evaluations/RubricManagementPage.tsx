import { useActionConfirmation } from '../../components/ui/useActionConfirmation'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { getAcademicHierarchy } from '../academic/api/academic-api'
import { getSemesters } from '../academic/api/governance-api'
import type { Department, Major } from '../academic/types/academic.types'
import type { Semester } from '../academic/types/governance.types'
import { useAuthSession } from '../auth/context/useAuthSession'
import { HttpError } from '../../services/http/http-client'
import * as api from './rubrics-api'
import type { CriterionInput, Rubric, RubricCriterion } from './rubrics-api'
import { Button } from '../../components/ui/Button'
import { formatPercent, formatScore } from '../../components/ui/format'
import { RubricSheetPreview } from './components/RubricSheetPreview'
import { RubricVersionDiff } from './components/RubricVersionDiff'
import { rubricWeightGroupIssues, weightGroupIssueLabel, type WeightGroupIssue } from './rubric-weight-groups'
import './rubric-management.css'

const newCriterion = (sortOrder = 0): CriterionInput => ({ name: '', description: null, weightPercent: 100, maxScore: 10, sortOrder, isRequired: true, levels: [], children: [] })
const nextSortOrder = (items: CriterionInput[]) => Math.max(-1, ...items.map(item => item.sortOrder)) + 1
const rubricStatusLabel = (value: string) => ({ DRAFT: 'Bản nháp', PENDING_APPROVAL: 'Đang chờ duyệt', PUBLISHED: 'Đã công bố', RETIRED: 'Ngừng sử dụng' }[value] ?? value)
const fromCriterion = (value: RubricCriterion): CriterionInput => ({ name: value.name, description: value.description, weightPercent: value.weightPercent, maxScore: value.maxScore, sortOrder: value.sortOrder, isRequired: value.isRequired, criterionCode: value.criterionCode, learningOutcome: value.learningOutcome, evidenceGuidance: value.evidenceGuidance, effectiveWeightPercent: value.effectiveWeightPercent, levels: value.levels ?? [], children: value.children.map(fromCriterion) })
const normalize = (items: CriterionInput[]): CriterionInput[] => items.map((item, index) => ({ ...item, sortOrder: index, children: normalize(item.children) }))
/** Never echo server-computed effective weights into a rubric write request. */
const toWriteCriteria = (items: CriterionInput[]): CriterionInput[] => items.map((item, index) => ({
  name: item.name, description: item.description, weightPercent: item.weightPercent, maxScore: item.maxScore,
  sortOrder: index, isRequired: item.isRequired, criterionCode: item.criterionCode,
  learningOutcome: item.learningOutcome, evidenceGuidance: item.evidenceGuidance,
  levels: item.children.length ? [] : item.levels ?? [], children: toWriteCriteria(item.children),
}))
function hasUnnamedCriterion(items: CriterionInput[]): boolean { return items.some(item => !item.name.trim() || hasUnnamedCriterion(item.children)) }
function editTree(items: CriterionInput[], path: number[], edit: (item: CriterionInput) => CriterionInput): CriterionInput[] {
  const [index, ...rest] = path
  return items.map((item, position) => position !== index ? item : rest.length ? { ...item, children: editTree(item.children, rest, edit) } : edit(item))
}
function removeTree(items: CriterionInput[], path: number[]): CriterionInput[] {
  const [index, ...rest] = path
  return rest.length ? items.map((item, position) => { if (position !== index) return item; const children = removeTree(item.children, rest); return { ...item, children, ...(children.length === 0 ? { maxScore: item.maxScore ?? 10, isRequired: true } : {}) } }) : items.filter((_, position) => position !== index)
}
function moveTree(items: CriterionInput[], path: number[], direction: -1 | 1): CriterionInput[] {
  const [index, ...rest] = path
  if (rest.length) return items.map((item, position) => position === index ? { ...item, children: moveTree(item.children, rest, direction) } : item)
  const target = index + direction
  if (target < 0 || target >= items.length) return items
  const next = [...items]; [next[index], next[target]] = [next[target], next[index]]
  return normalize(next)
}
function incompleteLeaves(items: CriterionInput[], count: number, prefix = ''): string[] {
  return items.flatMap((item, index) => {
    const path = `${prefix}${index + 1}`
    return item.children.length ? incompleteLeaves(item.children, count, `${path}.`) :
      item.levels?.length === count && item.levels.every((level, position) => level.levelOrder === position + 1 && level.descriptor.trim()) ? [] : [`${path} ${item.name || 'Chưa đặt tên'}`]
  })
}

export function RubricManagementPage() {
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()
  const { session } = useAuthSession()
  const selectionRequest = useRef(0)
  const [initialSelectionDone, setInitialSelectionDone] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [rubrics, setRubrics] = useState<Rubric[]>([])
  const [selected, setSelected] = useState<Rubric | null>(null)
  const [creating, setCreating] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])
  const [majors, setMajors] = useState<Major[]>([])
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [departmentId, setDepartmentId] = useState(0)
  const [semesterId, setSemesterId] = useState(0)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [criteria, setCriteria] = useState<CriterionInput[]>([])
  const [projectMode, setProjectMode] = useState<Rubric['projectMode']>(null)
  const [evaluationStage, setEvaluationStage] = useState<Rubric['evaluationStage']>(null)
  const [evaluationScope, setEvaluationScope] = useState<Rubric['evaluationScope']>(null)
  const [majorId, setMajorId] = useState<number | null>(null)
  const [effectiveFrom, setEffectiveFrom] = useState('')
  const [effectiveTo, setEffectiveTo] = useState('')
  const [preview, setPreview] = useState(false)
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadList = useCallback(async () => {
    setLoading(true)
    setRubrics([])
    try { const result = await api.listRubrics(page, status || undefined); setRubrics(result.items); setTotal(result.totalCount); setError(null) }
    catch (reason) { setError(reason instanceof HttpError && reason.status === 403 ? 'Hệ thống không cấp quyền quản lý bộ tiêu chí trong phạm vi này.' : 'Không thể tải bộ tiêu chí.') }
    finally { setLoading(false) }
  }, [page, status])
  useEffect(() => { void loadList() }, [loadList])
  useEffect(() => {
    if (!session) return
    let active = true
    void Promise.all([
      getAcademicHierarchy(session.accessToken, { search: '', includeInactive: false }),
      getSemesters(session.accessToken, { search: '' }),
    ]).then(([hierarchy, semesterPage]) => {
      if (!active) return
      setDepartments(hierarchy.flatMap(organization => organization.departments.map(item => item.department)))
      setMajors(hierarchy.flatMap(organization => organization.departments.flatMap(item => item.majors)))
      setSemesters(semesterPage.items)
    }).catch(() => { if (active) setError('Không thể tải bộ môn và học kỳ để tạo bộ tiêu chí.') })
    return () => { active = false }
  }, [session])

  const select = useCallback(async (id: number) => {
    const request = ++selectionRequest.current
    setDetailLoading(true)
    try {
      const next = await api.getRubric(id)
      if (request !== selectionRequest.current) return
      setSelected(next); setCreating(false); setCode(next.code); setName(next.name); setDescription(next.description ?? '')
      setDepartmentId(next.departmentId ?? 0); setSemesterId(next.academicSemesterId ?? 0)
      setCriteria(next.criteria.map(fromCriterion)); setError(null)
      setProjectMode(next.projectMode ?? null); setEvaluationStage(next.evaluationStage ?? null)
      setEvaluationScope(next.evaluationScope ?? null); setMajorId(next.majorId ?? null)
      setEffectiveFrom(next.effectiveFrom ?? ''); setEffectiveTo(next.effectiveTo ?? ''); setPreview(false)
    } catch { if (request === selectionRequest.current) setError('Không thể tải bộ tiêu chí này.') }
    finally { if (request === selectionRequest.current) setDetailLoading(false) }
  }, [])
  useEffect(() => {
    if (!initialSelectionDone && !loading && rubrics.length && !creating && !selected) {
      setInitialSelectionDone(true)
      void select((rubrics.find(item => item.status === 'PUBLISHED') ?? rubrics[0]).id)
    }
  }, [initialSelectionDone, loading, rubrics, creating, selected, select])
  const newDraft = () => { ++selectionRequest.current; setDetailLoading(false); setCreating(true); setSelected(null); setCode(''); setName(''); setDescription(''); setCriteria([newCriterion()]); setDepartmentId(0); setSemesterId(0); setProjectMode(null); setEvaluationStage(null); setEvaluationScope(null); setMajorId(null); setEffectiveFrom(''); setEffectiveTo(''); setPreview(false); setError(null) }
  const dirty = creating
    ? Boolean(code || name || description || departmentId || semesterId || JSON.stringify(criteria) !== JSON.stringify([newCriterion()]))
    : Boolean(selected?.canEdit && JSON.stringify({ name, description, criteria: normalize(criteria), projectMode, evaluationStage, evaluationScope, majorId, effectiveFrom, effectiveTo }) !== JSON.stringify({ name: selected.name, description: selected.description ?? '', criteria: normalize(selected.criteria.map(fromCriterion)), projectMode: selected.projectMode ?? null, evaluationStage: selected.evaluationStage ?? null, evaluationScope: selected.evaluationScope ?? null, majorId: selected.majorId ?? null, effectiveFrom: selected.effectiveFrom ?? '', effectiveTo: selected.effectiveTo ?? '' }))
  const canLeaveDraft = async () => !dirty || await requestConfirmation({ title: 'Bỏ thay đổi chưa lưu?', description: 'Nội dung đang chỉnh sửa sẽ không được lưu. Bạn có thể hủy để tiếp tục chỉnh sửa.', confirmLabel: 'Bỏ thay đổi' }) !== null
  const chooseRubric = async (id: number) => { if (selected?.id === id && !detailLoading) return; if (await canLeaveDraft()) await select(id) }
  const startDraft = async () => { if (await canLeaveDraft()) newDraft() }
  const cancelDraft = async () => { if (!await canLeaveDraft()) return; setCreating(false); if (rubrics.length) await select((rubrics.find(item => item.status === 'PUBLISHED') ?? rubrics[0]).id) }
  const selectedDepartment = departments.find(item => item.id === departmentId)
  const compatibleSemesters = semesters.filter(item => !selectedDepartment || item.organizationId === selectedDepartment.organizationId)

  const run = async (operation: () => Promise<Rubric | void>) => {
    setBusy(true)
    setError(null)
    try {
      const result = await operation()
      await loadList()
      if (result) await select(result.id)
      else { setSelected(null); setCreating(false) }
    } catch (reason) {
      if (reason instanceof HttpError && reason.status === 409) await loadList()
      const serverValidation = reason instanceof HttpError && reason.status === 422
        ? Object.values(reason.problem?.errors ?? {}).flat().join(' ') || reason.problem?.detail
        : null
      setError(reason instanceof HttpError && reason.problem?.code === 'RUBRIC_SELF_APPROVAL_FORBIDDEN'
        ? 'Người gửi không được tự phê duyệt bộ tiêu chí này.'
        : reason instanceof HttpError && reason.problem?.code === 'RUBRIC_SCOPE_NOT_LEAD_DEPARTMENT'
          ? 'Chỉ bộ môn chủ trì được phê duyệt tiêu chí chung của đồ án liên ngành.'
        : reason instanceof HttpError && reason.problem?.code === 'RUBRIC_APPROVAL_ADMIN_NOT_ACADEMIC'
          ? 'Tài khoản quản trị không có thẩm quyền học vụ để phê duyệt.'
        : reason instanceof HttpError && reason.status === 409
        ? 'Bộ tiêu chí hoặc phạm vi học vụ đã thay đổi. Bản nhập của bạn vẫn được giữ; hãy tải lại bản máy chủ để đối chiếu trước khi lưu.'
        : reason instanceof HttpError && reason.status === 403 ? 'Hệ thống không cấp quyền thao tác bộ tiêu chí này.' : serverValidation || 'Không thể lưu bộ tiêu chí. Kiểm tra dữ liệu, trọng số và trạng thái học kỳ.')
    } finally { setBusy(false) }
  }
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim() || hasUnnamedCriterion(criteria)) { setError('Hãy nhập tên bộ tiêu chí và tiêu chí.'); return }
    if (evaluationScope === 'MAJOR_SPECIFIC' && !majorId) { setError('Phạm vi theo ngành cần chọn ngành.'); return }
    if (effectiveFrom && effectiveTo && effectiveFrom > effectiveTo) { setError('Ngày bắt đầu hiệu lực phải trước hoặc bằng ngày kết thúc.'); return }
    const scoped = Boolean(projectMode || evaluationStage || evaluationScope || majorId || effectiveFrom || effectiveTo || selected?.projectMode || selected?.evaluationStage || selected?.evaluationScope || selected?.majorId || selected?.effectiveFrom || selected?.effectiveTo)
    const draft = { name: name.trim(), description: description.trim() || null, criteria: toWriteCriteria(criteria), ...(scoped ? { projectMode, evaluationStage, evaluationScope, majorId: evaluationScope === 'COMMON' ? null : majorId, effectiveFrom: effectiveFrom || null, effectiveTo: effectiveTo || null } : {}) }
    if (creating) {
      if (!departmentId || !semesterId || !code.trim()) { setError('Chọn bộ môn, học kỳ và nhập mã bộ tiêu chí.'); return }
      void run(() => api.createRubric({ ...draft, departmentId, academicSemesterId: semesterId, code: code.trim() }))
    } else if (selected?.canEdit) void run(() => api.updateRubric(selected.id, draft, selected.concurrencyToken))
  }
  const act = async (kind: 'submit' | 'approve' | 'reject' | 'retire' | 'clone' | 'delete') => {
    if (!selected) return
    if (dirty && kind === 'submit') { setError('Lưu bản nháp trước khi gửi duyệt để dùng nội dung mới nhất.'); return }
    if (kind === 'submit' && (!selected.requiredLevelCount || incompleteLeaves(criteria, selected.requiredLevelCount).length)) { setError('Chưa thể gửi duyệt: BE chưa cung cấp số mức hoặc tiêu chí lá còn thiếu mức.'); return }
    const decision = await requestConfirmation({
      title: kind === 'submit' ? 'Gửi duyệt bộ tiêu chí?' : kind === 'approve' ? 'Phê duyệt bộ tiêu chí?' : kind === 'reject' ? 'Từ chối bộ tiêu chí?' : kind === 'retire' ? 'Ngừng sử dụng bộ tiêu chí?' : kind === 'clone' ? 'Tạo phiên bản mới' : 'Xóa bản nháp?',
      description: kind === 'submit' ? 'Sau khi gửi duyệt, bản nháp sẽ chỉ đọc cho đến khi có quyết định.' : kind === 'approve' ? 'Máy chủ sẽ kiểm tra quyền duyệt và nguyên tắc hai người.' : kind === 'reject' ? 'Nhập lý do để người gửi chỉnh sửa.' : kind === 'retire' ? 'Phiên bản này sẽ không được dùng cho các phân công mới.' : kind === 'clone' ? 'Nhập mã riêng cho phiên bản mới.' : 'Chỉ có thể xóa bản nháp chưa được sử dụng.',
      confirmLabel: kind === 'submit' ? 'Gửi duyệt' : kind === 'approve' ? 'Phê duyệt' : kind === 'reject' ? 'Từ chối' : kind === 'retire' ? 'Ngừng sử dụng' : kind === 'clone' ? 'Tạo phiên bản' : 'Xóa bản nháp',
      reasonSingleLine: kind === 'clone' || kind === 'approve', optionalReason: kind === 'approve', danger: kind === 'delete' || kind === 'reject', reasonLabel: kind === 'clone' ? 'Mã phiên bản mới' : kind === 'reject' ? 'Lý do từ chối' : kind === 'approve' ? 'Số văn bản phê duyệt (có thể để trống)' : undefined,
    })
    if (decision === null) return
    const cloneCode = kind === 'clone' ? decision : null
    if (kind === 'reject' && !decision.trim()) { setError('Cần nhập lý do từ chối.'); return }
    const operation = kind === 'submit' ? () => api.submitRubricForApproval(selected.id, selected.concurrencyToken)
      : kind === 'approve' ? () => api.approveRubric(selected.id, selected.concurrencyToken, decision.trim() || null)
      : kind === 'reject' ? () => api.rejectRubric(selected.id, selected.concurrencyToken, decision.trim())
      : kind === 'retire' ? () => api.retireRubric(selected.id, selected.concurrencyToken)
      : kind === 'clone' ? () => api.cloneRubric(selected.id, cloneCode!, selected.concurrencyToken)
      : () => api.deleteRubric(selected.id, selected.concurrencyToken)
    void run(operation)
  }

  const weightIssues = rubricWeightGroupIssues(criteria)
  const invalidGroupPaths = new Set(weightIssues.map(issue => issue.parentPath.join('.')))
  const missingLevels = selected?.requiredLevelCount ? incompleteLeaves(criteria, selected.requiredLevelCount) : []

  return <WorkspacePage className="rubric-page space-y-5" title="Bộ tiêu chí đánh giá" eyebrow="Đánh giá đồ án" description="Quản lý tiêu chí, trọng số và các phiên bản dùng trong từng đợt đánh giá." action={<Button disabled={busy} onClick={() => void startDraft()}>Tạo bộ tiêu chí</Button>}>
    {confirmationDialog}
    {error && <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-danger-text">{error} <button type="button" className="font-semibold underline" onClick={() => void loadList()}>Tải lại</button></p>}
    <div className="workspace-master-detail grid"><section className="rounded-xl border bg-card p-4"><h2 className="font-semibold">Danh sách</h2><label className="mt-3 block text-sm">Trạng thái<select className="mt-1 min-h-11 w-full rounded-lg border px-3" value={status} onChange={event => { setStatus(event.target.value); setPage(1) }}><option value="">Tất cả</option><option value="DRAFT">Bản nháp</option><option value="PENDING_APPROVAL">Đang chờ duyệt</option><option value="PUBLISHED">Đã công bố</option><option value="RETIRED">Ngừng sử dụng</option></select></label>{loading && <p role="status" className="mt-3 text-sm">Đang tải bộ tiêu chí…</p>}{!loading && rubrics.length === 0 && <p className="mt-3 text-sm text-ink-muted">Chưa có bộ tiêu chí.</p>}<ul className="mt-3 space-y-2">{rubrics.map(item => <li key={item.id}><button type="button" aria-pressed={selected?.id === item.id} disabled={busy} className={`min-h-11 w-full rounded-lg border p-3 text-left text-sm ${selected?.id === item.id ? 'border-primary bg-primary-subtle' : 'border-hairline'}`} onClick={() => void chooseRubric(item.id)}><strong>{item.code}</strong> · v{item.version}<span className="block text-xs text-ink-muted">{item.name} · {rubricStatusLabel(item.status)}</span></button></li>)}</ul>{total > 20 && <div className="mt-3 flex justify-between text-sm"><button type="button" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Trước</button><span>{page} / {Math.ceil(total / 20)}</span><button type="button" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(value => value + 1)}>Sau</button></div>}</section>
    <section className="rounded-xl border bg-card p-5 rubric-detail" aria-busy={detailLoading}>{detailLoading ? <div className="rubric-empty" role="status"><span className="material-symbols-outlined" aria-hidden="true">grading</span><h2>Đang tải bộ tiêu chí…</h2></div> : !creating && !selected ? <div className="rubric-empty"><span className="material-symbols-outlined" aria-hidden="true">fact_check</span><h2>{rubrics.length ? 'Chọn bộ tiêu chí để xem' : 'Chưa có bộ tiêu chí'}</h2><p>Xem nội dung, trọng số và phiên bản tại đây.</p><Button variant="secondary" onClick={newDraft}>Tạo bản nháp</Button></div> : <><div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-semibold">{creating ? 'Bản nháp mới' : `${selected?.code} · v${selected?.version}`}</h2>{selected && <p className="text-xs text-ink-muted">{rubricStatusLabel(selected.status)} · {selected.canEdit ? 'Có thể sửa' : 'Chỉ đọc'}</p>}</div>{selected && <div className="flex flex-wrap gap-2">{selected.status === 'DRAFT' && <button type="button" disabled={busy || dirty || !selected.requiredLevelCount || missingLevels.length > 0} className="min-h-11 rounded-lg border px-3 text-xs font-semibold" onClick={() => void act('submit')}>Gửi duyệt</button>}{selected.status === 'PENDING_APPROVAL' && selected.canApprove && <button type="button" disabled={busy} className="min-h-11 rounded-lg border px-3 text-xs font-semibold" onClick={() => void act('approve')}>Phê duyệt</button>}{selected.status === 'PENDING_APPROVAL' && selected.canReject && <button type="button" disabled={busy} className="min-h-11 rounded-lg border px-3 text-xs font-semibold" onClick={() => void act('reject')}>Từ chối</button>}{selected.status === 'PUBLISHED' && <button type="button" disabled={busy} className="min-h-11 rounded-lg border px-3 text-xs font-semibold" onClick={() => void act('retire')}>Ngừng dùng</button>}{selected.status !== 'DRAFT' && <button type="button" disabled={busy} className="min-h-11 rounded-lg border px-3 text-xs font-semibold" onClick={() => void act('clone')}>Tạo phiên bản</button>}{selected.canEdit && <button type="button" disabled={busy} className="min-h-11 rounded-lg border border-danger px-3 text-xs font-semibold text-danger-text" onClick={() => void act('delete')}>Xóa bản nháp</button>}</div>}</div>
      {selected?.status === 'PENDING_APPROVAL' && <p role="status" className="mt-3 rounded-lg border border-status-warning-border bg-status-warning-bg p-3 text-sm">Đang chờ phê duyệt — người gửi không tự duyệt được.</p>}{selected?.approvalReference && <p className="mt-2 text-sm">Văn bản phê duyệt: {selected.approvalReference}</p>}{selected?.status === 'DRAFT' && !selected.requiredLevelCount && <p role="status" className="mt-2 text-sm text-status-warning-text">Chưa có cấu hình số mức từ BE; có thể lưu nháp, chưa thể gửi duyệt.</p>}{missingLevels.length > 0 && <p role="status" className="mt-2 text-sm text-status-warning-text">Tiêu chí còn thiếu mức: {missingLevels.join(', ')}</p>}{selected && !selected.canEdit ? <RubricReadView rubric={selected} departments={departments} semesters={semesters} /> : <form onSubmit={save} className="mt-4 space-y-4"><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Bộ môn<select value={departmentId} onChange={event => { setDepartmentId(Number(event.target.value)); setSemesterId(0) }} disabled={!creating || busy} className="mt-1 min-h-11 w-full rounded-lg border px-3"><option value={0}>Chọn bộ môn</option>{departments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="text-sm">Học kỳ<select value={semesterId} onChange={event => setSemesterId(Number(event.target.value))} disabled={!creating || busy} className="mt-1 min-h-11 w-full rounded-lg border px-3"><option value={0}>Chọn học kỳ</option>{compatibleSemesters.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Hình thức đồ án<select value={projectMode ?? ''} onChange={event => setProjectMode(event.target.value as Rubric['projectMode'] || null)} className="mt-1 min-h-11 w-full rounded-lg border px-3"><option value="">Chưa xác định</option><option value="SINGLE_MAJOR">Một ngành</option><option value="INTERDISCIPLINARY">Liên ngành</option></select></label><label className="text-sm">Giai đoạn<select value={evaluationStage ?? ''} onChange={event => setEvaluationStage(event.target.value as Rubric['evaluationStage'] || null)} className="mt-1 min-h-11 w-full rounded-lg border px-3"><option value="">Chưa xác định</option><option value="ON_GOING">Trong quá trình</option><option value="COLD">Chấm hồ sơ đã khóa</option><option value="DEFENSE">Bảo vệ</option></select></label><label className="text-sm">Phạm vi<select value={evaluationScope ?? ''} onChange={event => { const value = event.target.value as Rubric['evaluationScope']; setEvaluationScope(value || null); if (value === 'COMMON') setMajorId(null) }} className="mt-1 min-h-11 w-full rounded-lg border px-3"><option value="">Chưa xác định</option><option value="COMMON">Chung</option><option value="MAJOR_SPECIFIC">Theo ngành</option><option value="INDIVIDUAL">Cá nhân</option></select></label>{evaluationScope !== 'COMMON' && <label className="text-sm">Ngành<select value={majorId ?? ''} required={evaluationScope === 'MAJOR_SPECIFIC'} onChange={event => setMajorId(event.target.value ? Number(event.target.value) : null)} className="mt-1 min-h-11 w-full rounded-lg border px-3"><option value="">Chọn ngành</option>{majors.filter(major => !departmentId || major.departmentId === departmentId).map(major => <option key={major.id} value={major.id}>{major.name}</option>)}</select></label>}<label className="text-sm">Hiệu lực từ<input type="date" value={effectiveFrom} onChange={event => setEffectiveFrom(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border px-3" /></label><label className="text-sm">Hiệu lực đến<input type="date" value={effectiveTo} onChange={event => setEffectiveTo(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border px-3" /></label></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Mã bộ tiêu chí<input value={code} onChange={event => setCode(event.target.value)} disabled={!creating || busy} required className="mt-1 min-h-11 w-full rounded-lg border px-3" /></label><label className="text-sm">Tên bộ tiêu chí<input value={name} onChange={event => setName(event.target.value)} disabled={Boolean(selected && !selected.canEdit) || busy} required className="mt-1 min-h-11 w-full rounded-lg border px-3" /></label></div><label className="block text-sm">Mô tả<textarea value={description} onChange={event => setDescription(event.target.value)} disabled={Boolean(selected && !selected.canEdit) || busy} rows={2} className="mt-1 w-full rounded-lg border p-3" /></label><div><h3 className="font-semibold">Tiêu chí và trọng số</h3><p className="mt-1 text-xs text-ink-muted">Trọng số của các tiêu chí cùng cấp phải bằng 100% trước khi công bố.</p><RubricWeightSummary issues={weightIssues} /><div className="mt-3 space-y-3">{criteria.map((item, index) => <CriterionEditor key={index} item={item} path={[index]} invalidGroupPaths={invalidGroupPaths} disabled={Boolean(selected && !selected.canEdit) || busy} onEdit={(path, change) => setCriteria(current => editTree(current, path, node => ({ ...node, ...change })))} onAddChild={path => setCriteria(current => editTree(current, path, node => ({ ...node, maxScore: null, isRequired: false, levels: [], children: [...node.children, newCriterion(nextSortOrder(node.children))] })))} onRemove={path => setCriteria(current => normalize(removeTree(current, path)))} onMove={(path, direction) => setCriteria(current => moveTree(current, path, direction))} />)}</div>{(creating || selected?.canEdit) && <button type="button" className="mt-3 min-h-11 rounded-lg border px-3 text-sm" onClick={() => setCriteria(current => [...current, newCriterion(nextSortOrder(current))])}>Thêm tiêu chí</button>}</div><button type="button" className="min-h-11 rounded-lg border px-3 text-sm" onClick={() => setPreview(value => !value)}>{preview ? 'Đóng xem trước phiếu chấm' : 'Xem trước phiếu chấm'}</button>{preview && <RubricSheetPreview criteria={criteria} />}{selected?.previousVersion && <RubricVersionDiff current={selected} previous={selected.previousVersion} />}{(creating || selected?.canEdit) && <div className="flex flex-wrap gap-3"><Button type="submit" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu bản nháp'}</Button>{creating && <Button variant="secondary" disabled={busy} onClick={() => void cancelDraft()}>Hủy tạo mới</Button>}</div>}</form>}</>}</section></div>
  </WorkspacePage>
}

function CriterionEditor({ item, path, invalidGroupPaths, disabled, onEdit, onAddChild, onRemove, onMove }: {
  item: CriterionInput; path: number[]; invalidGroupPaths: Set<string>; disabled: boolean
  onEdit: (path: number[], change: Partial<CriterionInput>) => void
  onAddChild: (path: number[]) => void; onRemove: (path: number[]) => void; onMove: (path: number[], direction: -1 | 1) => void
}) {
  return <div role="group" aria-label={`Tiêu chí ${path.map(index => index + 1).join('.')}: ${item.name || 'Chưa đặt tên'}`} className={`criterion-editor rounded-lg border bg-canvas p-3 ${invalidGroupPaths.has(path.join('.')) ? 'border-status-error-border' : 'border-hairline'}`}><h4 className="criterion-heading">Tiêu chí {path.map(index => index + 1).join('.')}</h4>{invalidGroupPaths.has(path.join('.')) && <p className="mb-2 text-xs text-status-error-text">Nhóm con của tiêu chí này cần kiểm tra.</p>}<div className="grid gap-2 sm:grid-cols-2"><label className="text-xs">Tên tiêu chí<input className="mt-1 min-h-11 w-full rounded border px-2" value={item.name} disabled={disabled} onChange={event => onEdit(path, { name: event.target.value })} /></label><label className="text-xs">Trọng số %<input className="mt-1 min-h-11 w-full rounded border px-2" type="number" min="0.01" max="100" step="0.01" value={item.weightPercent} disabled={disabled} onChange={event => onEdit(path, { weightPercent: Number(event.target.value) })} /></label>{item.children.length === 0 && <label className="text-xs">Điểm tối đa<input className="mt-1 min-h-11 w-full rounded border px-2" type="number" min="0.01" max="999999.99" step="0.01" value={item.maxScore ?? ''} disabled={disabled} onChange={event => onEdit(path, { maxScore: Number(event.target.value) })} /></label>}<label className="text-xs">Mô tả<input className="mt-1 min-h-11 w-full rounded border px-2" value={item.description ?? ''} disabled={disabled} onChange={event => onEdit(path, { description: event.target.value || null })} /></label></div><div className="mt-2 grid gap-2 sm:grid-cols-2"><label className="text-xs">Chuẩn đầu ra<textarea value={item.learningOutcome ?? ''} disabled={disabled} className="mt-1 w-full rounded border p-2" onChange={event => onEdit(path, { learningOutcome: event.target.value || null })} /></label><label className="text-xs">Hướng dẫn minh chứng<textarea value={item.evidenceGuidance ?? ''} disabled={disabled} className="mt-1 w-full rounded border p-2" onChange={event => onEdit(path, { evidenceGuidance: event.target.value || null })} /></label></div>{item.children.length === 0 && <label className="mt-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={item.isRequired} disabled={disabled} onChange={event => onEdit(path, { isRequired: event.target.checked })} />Bắt buộc</label>}{!disabled && <div className="mt-2 flex gap-2"><button type="button" className="min-h-11 rounded border px-3 text-xs" onClick={() => onAddChild(path)}>Thêm tiêu chí con</button><button type="button" aria-label={`Đưa tiêu chí ${item.name} lên`} className="min-h-11 rounded border px-3 text-xs" onClick={() => onMove(path, -1)}>▲</button><button type="button" aria-label={`Đưa tiêu chí ${item.name} xuống`} className="min-h-11 rounded border px-3 text-xs" onClick={() => onMove(path, 1)}>▼</button><button type="button" className="min-h-11 rounded border border-danger px-3 text-xs text-danger-text" onClick={() => onRemove(path)}>Bỏ</button></div>}{item.children.length === 0 && <div className="mt-3 space-y-2"><h5 className="text-xs font-semibold">Mức chất lượng</h5>{(item.levels ?? []).map((level, index) => <div key={index} className="grid gap-2 rounded border p-2 sm:grid-cols-2"><label className="text-xs">Nhãn<input value={level.label} disabled={disabled} className="mt-1 w-full rounded border p-2" onChange={event => onEdit(path, { levels: (item.levels ?? []).map((value, position) => position === index ? { ...value, label: event.target.value } : value) })} /></label><label className="text-xs">Mô tả<textarea value={level.descriptor} disabled={disabled} className="mt-1 w-full rounded border p-2" onChange={event => onEdit(path, { levels: (item.levels ?? []).map((value, position) => position === index ? { ...value, descriptor: event.target.value } : value) })} /></label><label className="text-xs">Từ<input type="number" value={level.scoreFrom ?? ''} disabled={disabled} className="mt-1 w-full rounded border p-2" onChange={event => onEdit(path, { levels: (item.levels ?? []).map((value, position) => position === index ? { ...value, scoreFrom: event.target.value ? Number(event.target.value) : null } : value) })} /></label><label className="text-xs">Đến<input type="number" value={level.scoreTo ?? ''} disabled={disabled} className="mt-1 w-full rounded border p-2" onChange={event => onEdit(path, { levels: (item.levels ?? []).map((value, position) => position === index ? { ...value, scoreTo: event.target.value ? Number(event.target.value) : null } : value) })} /></label>{!disabled && <button type="button" aria-label={`Bỏ mức ${index + 1}`} className="min-h-11 rounded border px-3 text-xs" onClick={() => onEdit(path, { levels: (item.levels ?? []).filter((_, position) => position !== index).map((value, position) => ({ ...value, levelOrder: position + 1 })) })}>Bỏ mức</button>}</div>)}{!disabled && <button type="button" className="min-h-11 rounded border px-3 text-xs" onClick={() => onEdit(path, { levels: [...(item.levels ?? []), { levelOrder: (item.levels?.length ?? 0) + 1, label: '', descriptor: '', scoreFrom: null, scoreTo: null }] })}>Thêm mức vào bản nháp</button>}</div>}{item.children.length > 0 && <div className="mt-3 space-y-2 border-l-2 border-line-strong pl-3">{item.children.map((child, index) => <CriterionEditor key={index} item={child} path={[...path, index]} invalidGroupPaths={invalidGroupPaths} disabled={disabled} onEdit={onEdit} onAddChild={onAddChild} onRemove={onRemove} onMove={onMove} />)}</div>}</div>
}

function RubricWeightSummary({ issues }: { issues: WeightGroupIssue[] }) {
  return <div role="status" className={`mt-2.5 rounded-lg border p-3 text-xs ${issues.length ? 'border-status-error-border bg-status-error-bg text-status-error-text' : 'border-status-success-border bg-status-success-bg text-status-success-text'}`}>
    {issues.length ? <><strong>Các nhóm cần kiểm tra:</strong><ul className="mt-2 list-disc space-y-1 pl-5">{issues.map(issue => <li key={issue.parentPath.join('.') || 'root'}>{weightGroupIssueLabel(issue)}</li>)}</ul></> : <strong>Tất cả nhóm tiêu chí đã đủ 100%.</strong>}
  </div>
}

function RubricReadView({ rubric, departments, semesters }: { rubric: Rubric; departments: Department[]; semesters: Semester[] }) {
  return <div className="rubric-read-view">
    <h3>{rubric.name}</h3>
    <dl className="rubric-read-scope"><div><dt>Bộ môn</dt><dd>{departments.find(item => item.id === rubric.departmentId)?.name ?? 'Chưa có thông tin'}</dd></div><div><dt>Học kỳ</dt><dd>{semesters.find(item => item.id === rubric.academicSemesterId)?.name ?? 'Chưa có thông tin'}</dd></div></dl>
    {rubric.description && <p className="rubric-read-description">{rubric.description}</p>}
    <div className="rubric-criteria-title"><h3>Tiêu chí và trọng số</h3><span>{rubric.criteria.length} tiêu chí chính</span></div>
    <ol className="rubric-read-criteria">{rubric.criteria.map((item, index) => <CriterionReadView key={item.id} item={item} number={String(index + 1)} />)}</ol>
  </div>
}
function CriterionReadView({ item, number }: { item: RubricCriterion; number: string }) {
  const effective = item.effectiveWeightPercent
  const distinct = effective != null && Number.isFinite(effective) && effective !== item.weightPercent
  return <li><div className="rubric-read-criterion"><span className="rubric-criterion-number">{number}</span><div><h4>{item.name}</h4>{item.description && <p>{item.description}</p>}<div className="rubric-criterion-meta">{item.children.length === 0 && <><span>Điểm tối đa: {formatScore(item.maxScore)}</span>{item.isRequired && <span>Bắt buộc</span>}</>}</div></div><div className="rubric-criterion-weight">{distinct ? <><span>Trong nhóm: {formatPercent(item.weightPercent)}</span><span>Tỷ trọng hiệu lực trong bộ tiêu chí: {formatPercent(effective)}</span></> : <span>Trọng số: {formatPercent(item.weightPercent)}</span>}</div></div>{item.children.length === 0 && !!item.levels?.length && <details className="mt-2 rounded border p-2 text-sm"><summary className="cursor-pointer">Mức chất lượng</summary><ul className="mt-2 space-y-1">{item.levels.map(level => <li key={level.levelOrder}>{level.label}: {level.descriptor}</li>)}</ul></details>}{item.children.length > 0 && <ol>{item.children.map((child, index) => <CriterionReadView key={child.id} item={child} number={number + '.' + (index + 1)} />)}</ol>}</li>
}
