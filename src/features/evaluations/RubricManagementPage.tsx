import { rubricErrors } from './rubric-errors'
import { displayLabel } from '../../components/ui/display-label'
import { useActionConfirmation } from '../../components/ui/useActionConfirmation'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { ActionVerdict } from '../../components/ui/ActionVerdict'
import { FilterToolbar, type ActiveFilterChip } from '../../components/ui/FilterToolbar'
import { Modal } from '../../components/ui/Modal'
import { Pagination } from '../../components/ui/Pagination'
import { useClientPagination } from '../../components/ui/useClientPagination'
import { StatusBadge } from '../../components/ui/StatusBadge'
import type { BadgeTone } from '../../components/ui/status-badge-tone'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { getAcademicHierarchy } from '../academic/api/academic-api'
import { getSemesters } from '../academic/api/governance-api'
import type { Department, Major } from '../academic/types/academic.types'
import type { Semester } from '../academic/types/governance.types'
import { useAuthSession } from '../auth/context/useAuthSession'
import { HttpError } from '../../services/http/http-client'
import * as api from './rubrics-api'
import type { CriterionInput, Rubric, RubricCriterion, RubricScopeFields } from './rubrics-api'
import { Button } from '../../components/ui/Button'
import { formatPercent, formatScore } from '../../components/ui/format'
import { RubricSheetPreview } from './components/RubricSheetPreview'
import { RubricVersionDiff } from './components/RubricVersionDiff'
import { RubricWorkbookPanel } from './components/RubricWorkbookPanel'
import { DepartmentAiDraftBar } from '../ai-suite/DepartmentAiDraftBar'
import { AssistantRubricSetupCard } from '../ai/components/AssistantSetupPlanCard'
import { rubricWeightGroupIssues, weightGroupIssueLabel, type WeightGroupIssue } from './rubric-weight-groups'
import './rubric-management.css'

type KeyedCriterionInput = Omit<CriterionInput, 'children'> & { _uid?: string; children: KeyedCriterionInput[] }

let criterionUidSeq = 0
const nextCriterionUid = () => `crit-${++criterionUidSeq}`

const newCriterion = (sortOrder = 0): KeyedCriterionInput => ({
  _uid: nextCriterionUid(),
  name: '',
  description: null,
  weightPercent: 100,
  maxScore: 10,
  sortOrder,
  isRequired: true,
  levels: [],
  children: [],
})
const nextSortOrder = (items: CriterionInput[]) => Math.max(-1, ...items.map(item => item.sortOrder)) + 1
const rubricStatusLabel = (value: string) => ({ DRAFT: 'Bản nháp', PENDING_APPROVAL: 'Đang chờ duyệt', PUBLISHED: 'Đã công bố', RETIRED: 'Ngừng sử dụng' }[value] ?? value)
const rubricStatusTone = (value: string): BadgeTone =>
  value === 'PUBLISHED' ? 'success' : value === 'PENDING_APPROVAL' ? 'info' : value === 'DRAFT' ? 'warning' : 'neutral'
const stageLabels: Record<string, string> = {
  ON_GOING: 'Đánh giá quá trình',
  COLD: 'Chấm nguội',
  DEFENSE: 'Bảo vệ',
}
const rubricScope = (rubric?: Rubric | null): RubricScopeFields => ({ projectMode: rubric?.projectMode ?? null, evaluationStage: rubric?.evaluationStage ?? null, evaluationScope: rubric?.evaluationScope ?? null, majorId: rubric?.majorId ?? null, effectiveFrom: rubric?.effectiveFrom ?? null, effectiveTo: rubric?.effectiveTo ?? null })
const isLegacyRubric = (rubric: Rubric) => !rubric.projectMode && !rubric.evaluationStage && !rubric.evaluationScope && rubric.majorId == null
function incompleteLeaves(items: CriterionInput[], count?: number | null): string[] {
  return items.flatMap(item => item.children.length ? incompleteLeaves(item.children, count) :
    (item.levels?.length && (count == null || item.levels.length === count) && item.levels.every((level, index) => level.levelOrder === index + 1 && level.descriptor.trim()) ? [] : [item.name || 'Tiêu chí chưa đặt tên']))
}
const fromCriterion = (value: RubricCriterion): KeyedCriterionInput => ({
  _uid: value.id ? `crit-id-${value.id}` : nextCriterionUid(),
  name: value.name,
  description: value.description,
  weightPercent: value.weightPercent,
  maxScore: value.maxScore,
  sortOrder: value.sortOrder,
  isRequired: value.isRequired,
  criterionCode: value.criterionCode,
  learningOutcome: value.learningOutcome,
  evidenceGuidance: value.evidenceGuidance,
  effectiveWeightPercent: value.effectiveWeightPercent,
  levels: value.levels ?? [],
  children: value.children.map(fromCriterion),
})
const normalize = (items: KeyedCriterionInput[]): KeyedCriterionInput[] =>
  items.map((item, index) => ({ ...item, sortOrder: index, children: normalize(item.children) }))
const stripUids = (items: KeyedCriterionInput[]): CriterionInput[] =>
  items.map(({ _uid: _ignored, children, ...rest }) => ({ ...rest, children: stripUids(children) }))
/** Never echo server-computed effective weights into a rubric write request. */
const toWriteCriteria = (items: CriterionInput[]): CriterionInput[] => items.map((item, index) => ({
  name: item.name, description: item.description, weightPercent: item.weightPercent, maxScore: item.maxScore,
  sortOrder: index, isRequired: item.isRequired, learningOutcome: item.learningOutcome ?? null,
  evidenceGuidance: item.evidenceGuidance ?? null, levels: item.children.length ? [] : item.levels ?? [],
  children: toWriteCriteria(item.children),
}))
function hasUnnamedCriterion(items: CriterionInput[]): boolean { return items.some(item => !item.name.trim() || hasUnnamedCriterion(item.children)) }
function editTree(items: KeyedCriterionInput[], path: number[], edit: (item: KeyedCriterionInput) => KeyedCriterionInput): KeyedCriterionInput[] {
  const [index, ...rest] = path
  return items.map((item, position) => position !== index ? item : rest.length ? { ...item, children: editTree(item.children, rest, edit) } : edit(item))
}
function removeTree(items: KeyedCriterionInput[], path: number[]): KeyedCriterionInput[] {
  const [index, ...rest] = path
  return rest.length ? items.map((item, position) => { if (position !== index) return item; const children = removeTree(item.children, rest); return { ...item, children, ...(children.length === 0 ? { maxScore: item.maxScore ?? 10, isRequired: true } : {}) } }) : items.filter((_, position) => position !== index)
}
function moveTree(items: KeyedCriterionInput[], path: number[], direction: -1 | 1): KeyedCriterionInput[] {
  const [index, ...rest] = path
  if (rest.length) return items.map((item, position) => position === index ? { ...item, children: moveTree(item.children, rest, direction) } : item)
  const target = index + direction
  if (target < 0 || target >= items.length) return items
  const next = [...items]; [next[index], next[target]] = [next[target], next[index]]
  return normalize(next)
}
function deepCloneNode(item: KeyedCriterionInput, isRoot: boolean): KeyedCriterionInput {
  return {
    ...item,
    _uid: nextCriterionUid(),
    criterionCode: null,
    name: isRoot ? `${item.name || 'Tiêu chí'} (Bản sao)` : item.name,
    levels: (item.levels ?? []).map(level => ({ ...level })),
    children: item.children.map(child => deepCloneNode(child, false)),
  }
}
function cloneTree(items: KeyedCriterionInput[], path: number[]): KeyedCriterionInput[] {
  const [index, ...rest] = path
  if (rest.length) return items.map((item, position) => position === index ? { ...item, children: cloneTree(item.children, rest) } : item)
  const source = items[index]
  if (!source) return items
  const next = [...items]
  next.splice(index + 1, 0, deepCloneNode(source, true))
  return normalize(next)
}
function findCriterionAtPath(items: KeyedCriterionInput[], path: number[]): KeyedCriterionInput | null {
  let current: KeyedCriterionInput | undefined
  let list = items
  for (const idx of path) {
    current = list[idx]
    if (!current) return null
    list = current.children
  }
  return current ?? null
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
  const [scopeFields, setScopeFields] = useState<RubricScopeFields>(rubricScope())
  const [criteria, setCriteria] = useState<KeyedCriterionInput[]>([])
  const [expandedCriteria, setExpandedCriteria] = useState<Record<string, boolean>>({})
  const [modalCriterionPath, setModalCriterionPath] = useState<number[] | null>(null)
  const [preview, setPreview] = useState(false)
  const [status, setStatus] = useState('')
  const [listSearch, setListSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [semesterFilter, setSemesterFilter] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [busy, setBusy] = useState(false)
  const [aiDraftOpen, setAiDraftOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [listFailed, setListFailed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadList = useCallback(async () => {
    setLoading(true)
    setRubrics([])
    try { const result = await api.listRubrics(page, status || undefined, pageSize); setRubrics(result.items); setTotal(result.totalCount); setListFailed(false); setError(null) }
    catch (reason) { setTotal(0); setListFailed(true); setError(reason instanceof HttpError && reason.status === 403 ? 'Hệ thống không cấp quyền quản lý bộ tiêu chí trong phạm vi này.' : 'Không thể tải bộ tiêu chí.') }
    finally { setLoading(false) }
  }, [page, pageSize, status])
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
      setScopeFields(rubricScope(next))
      const mapped = next.criteria.map(fromCriterion)
      setCriteria(mapped)
      setExpandedCriteria({})
      setModalCriterionPath(null)
      setError(null)
      setPreview(false)
    } catch { if (request === selectionRequest.current) setError('Không thể tải bộ tiêu chí này.') }
    finally { if (request === selectionRequest.current) setDetailLoading(false) }
  }, [])
  useEffect(() => {
    if (!initialSelectionDone && !loading && rubrics.length && !creating && !selected) {
      setInitialSelectionDone(true)
      void select((rubrics.find(item => item.status === 'PUBLISHED') ?? rubrics[0]).id)
    }
  }, [initialSelectionDone, loading, rubrics, creating, selected, select])
  const newDraft = () => { ++selectionRequest.current; setDetailLoading(false); setCreating(true); setSelected(null); setCode(''); setName(''); setDescription(''); setScopeFields(rubricScope()); setCriteria([newCriterion()]); setExpandedCriteria({}); setModalCriterionPath(null); setDepartmentId(0); setSemesterId(0); setPreview(false); setError(null) }
  const dirty = creating
    ? Boolean(code || name || description || departmentId || semesterId || Object.values(scopeFields).some(value => value != null) || JSON.stringify(stripUids(criteria)) !== JSON.stringify(stripUids([newCriterion()])))
    : Boolean(selected?.canEdit && JSON.stringify({ name, description, scopeFields, criteria: stripUids(normalize(criteria)) }) !== JSON.stringify({ name: selected.name, description: selected.description ?? '', scopeFields: rubricScope(selected), criteria: stripUids(normalize(selected.criteria.map(fromCriterion))) }))
  const canLeaveDraft = async () => !dirty || await requestConfirmation({ title: 'Bỏ thay đổi chưa lưu?', description: 'Nội dung đang chỉnh sửa sẽ không được lưu. Bạn có thể hủy để tiếp tục chỉnh sửa.', confirmLabel: 'Bỏ thay đổi' }) !== null
  const chooseRubric = async (id: number) => { if (selected?.id === id && !detailLoading) return; if (await canLeaveDraft()) await select(id) }
  const startDraft = async () => { if (await canLeaveDraft()) newDraft() }
  const cancelDraft = async () => { if (!await canLeaveDraft()) return; setCreating(false); if (rubrics.length) await select((rubrics.find(item => item.status === 'PUBLISHED') ?? rubrics[0]).id) }
  const selectedDepartment = departments.find(item => item.id === departmentId)
  const compatibleSemesters = semesters.filter(item => !selectedDepartment || item.organizationId === selectedDepartment.organizationId)
  const eligibleMajors = majors.filter(item => item.departmentId === departmentId)
  const missingLevels = selected ? incompleteLeaves(selected.criteria.map(fromCriterion), selected.requiredLevelCount) : []

  const filteredRubrics = useMemo(() => {
    const q = listSearch.trim().toLowerCase()
    return rubrics.filter(item => {
      if (deptFilter && String(item.departmentId) !== deptFilter) return false
      if (semesterFilter && String(item.academicSemesterId) !== semesterFilter) return false
      if (stageFilter && item.evaluationStage !== stageFilter) return false
      if (q && !`${item.code} ${item.name} v${item.version}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [rubrics, listSearch, deptFilter, semesterFilter, stageFilter])

  const rubricPager = useClientPagination(filteredRubrics, 10)
  const useServerPaging = total > rubrics.length && total > pageSize
  const displayedRubrics = useServerPaging ? filteredRubrics : rubricPager.paginatedItems

  const hasListFilters = Boolean(listSearch.trim() || status || deptFilter || semesterFilter || stageFilter)
  const listChips: ActiveFilterChip[] = []
  if (status) listChips.push({ id: 'status', label: 'Trạng thái', value: rubricStatusLabel(status) })
  if (deptFilter) listChips.push({ id: 'dept', label: 'Bộ môn', value: departments.find(d => String(d.id) === deptFilter)?.name ?? deptFilter })
  if (semesterFilter) listChips.push({ id: 'semester', label: 'Học kỳ', value: semesters.find(s => String(s.id) === semesterFilter)?.name ?? semesterFilter })
  if (stageFilter) listChips.push({ id: 'stage', label: 'Giai đoạn', value: stageLabels[stageFilter] ?? stageFilter })

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
      const message = reason instanceof HttpError ? rubricErrors[reason.problem?.code ?? ''] : undefined
      setError(message ?? (reason instanceof HttpError && reason.status === 409
        ? 'Bộ tiêu chí hoặc phạm vi học vụ đã thay đổi. Bản nhập của bạn vẫn được giữ; hãy tải lại bản máy chủ để đối chiếu trước khi lưu.'
        : reason instanceof HttpError && reason.status === 403 ? 'Hệ thống không cấp quyền thao tác bộ tiêu chí này.' : 'Không thể lưu bộ tiêu chí. Kiểm tra dữ liệu, trọng số và trạng thái học kỳ.'))
    } finally { setBusy(false) }
  }
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim() || hasUnnamedCriterion(criteria)) { setError('Hãy nhập tên bộ tiêu chí và tiêu chí.'); return }
    if (!scopeFields.evaluationScope && (scopeFields.projectMode || scopeFields.evaluationStage || scopeFields.majorId != null)) { setError('Chọn phạm vi trước khi khai loại đồ án, giai đoạn hoặc ngành.'); return }
    if (scopeFields.evaluationScope === 'MAJOR_SPECIFIC' && scopeFields.majorId == null) { setError('Chọn ngành cho bộ tiêu chí theo ngành.'); return }
    if (scopeFields.effectiveFrom && scopeFields.effectiveTo && scopeFields.effectiveTo < scopeFields.effectiveFrom) { setError('Ngày kết thúc hiệu lực phải bằng hoặc sau ngày bắt đầu.'); return }
    const draft = { name: name.trim(), description: description.trim() || null, ...scopeFields, criteria: toWriteCriteria(criteria) }
    if (creating) {
      if (!departmentId || !semesterId || !code.trim()) { setError('Chọn bộ môn, học kỳ và nhập mã bộ tiêu chí.'); return }
      void run(() => api.createRubric({ ...draft, departmentId, academicSemesterId: semesterId, code: code.trim() }))
    } else if (selected?.canEdit) void run(() => api.updateRubric(selected.id, draft, selected.concurrencyToken))
  }
  const act = async (kind: 'publish' | 'submit' | 'approve' | 'reject' | 'retire' | 'clone' | 'delete') => {
    if (!selected) return
    if (dirty && (kind === 'submit' || kind === 'publish')) { setError('Lưu bản nháp trước khi công bố hoặc gửi duyệt để dùng nội dung mới nhất.'); return }
    if (kind === 'submit' && !selected.canSubmitForApproval) { setError('Máy chủ chưa cấp khả năng gửi duyệt bộ tiêu chí này.'); return }
    const deptName = departments.find(item => item.id === selected.departmentId)?.name ?? 'chưa xác định'
    const semName = semesters.find(item => item.id === selected.academicSemesterId)?.name ?? 'chưa xác định'
    const versionContext = `${selected.code} v${selected.version}${selected.previousVersion ? ` thay ${selected.previousVersion.code} v${selected.previousVersion.version}` : ''}. Phạm vi: bộ môn ${deptName}, học kỳ ${semName}.`
    const decision = await requestConfirmation({
      title: kind === 'publish' ? 'Công bố bộ tiêu chí?' : kind === 'submit' ? 'Gửi duyệt bộ tiêu chí?' : kind === 'approve' ? 'Phê duyệt bộ tiêu chí?' : kind === 'reject' ? 'Từ chối bộ tiêu chí?' : kind === 'retire' ? 'Ngừng sử dụng bộ tiêu chí?' : kind === 'clone' ? 'Tạo phiên bản mới' : 'Xóa bản nháp?',
      description: kind === 'publish' ? `${versionContext} Máy chủ sẽ kiểm tra bộ tiêu chí và khóa phiên bản để dùng trong phương án đánh giá.` : kind === 'submit' ? 'Sau khi gửi duyệt, bản nháp sẽ chỉ đọc cho đến khi có quyết định.' : kind === 'approve' ? `${versionContext} Máy chủ sẽ kiểm tra quyền duyệt và nguyên tắc hai người.` : kind === 'reject' ? 'Nhập lý do để người gửi chỉnh sửa.' : kind === 'retire' ? 'Phiên bản này sẽ không được dùng cho các phân công mới.' : kind === 'clone' ? 'Nhập mã riêng cho phiên bản mới.' : 'Chỉ có thể xóa bản nháp chưa được sử dụng.',
      confirmLabel: kind === 'publish' ? 'Công bố' : kind === 'submit' ? 'Gửi duyệt' : kind === 'approve' ? 'Phê duyệt' : kind === 'reject' ? 'Từ chối' : kind === 'retire' ? 'Ngừng sử dụng' : kind === 'clone' ? 'Tạo phiên bản' : 'Xóa bản nháp',
      reasonSingleLine: kind === 'clone' || kind === 'approve', optionalReason: kind === 'approve', danger: kind === 'delete' || kind === 'reject', reasonLabel: kind === 'clone' ? 'Mã phiên bản mới' : kind === 'reject' ? 'Lý do từ chối' : kind === 'approve' ? 'Số văn bản phê duyệt (có thể để trống)' : undefined,
    })
    if (decision === null) return
    const cloneCode = kind === 'clone' ? decision : null
    if (kind === 'reject' && !decision.trim()) { setError('Cần nhập lý do từ chối.'); return }
    const operation = kind === 'publish' ? () => api.publishRubric(selected.id, selected.concurrencyToken)
      : kind === 'submit' ? () => api.submitRubricForApproval(selected.id, selected.concurrencyToken)
      : kind === 'approve' ? () => api.approveRubric(selected.id, selected.concurrencyToken, decision.trim() || null)
      : kind === 'reject' ? () => api.rejectRubric(selected.id, selected.concurrencyToken, decision.trim())
      : kind === 'retire' ? () => api.retireRubric(selected.id, selected.concurrencyToken)
      : kind === 'clone' ? () => api.cloneRubric(selected.id, cloneCode!, selected.concurrencyToken)
      : () => api.deleteRubric(selected.id, selected.concurrencyToken)
    void run(operation)
  }

  const weightIssues = rubricWeightGroupIssues(criteria)
  const invalidGroupPaths = new Set(weightIssues.map(issue => issue.parentPath.join('.')))
  const isCriterionExpanded = (uid: string, pathKey: string) => {
    if (expandedCriteria[uid] !== undefined) return expandedCriteria[uid]
    return criteria.length <= 2 || invalidGroupPaths.has(pathKey)
  }
  const toggleAllCriteria = (expand: boolean) => {
    const next: Record<string, boolean> = {}
    const walk = (list: KeyedCriterionInput[]) => {
      for (const node of list) {
        if (node._uid) next[node._uid] = expand
        walk(node.children)
      }
    }
    walk(criteria)
    setExpandedCriteria(next)
  }
  const modalCriterion = modalCriterionPath ? findCriterionAtPath(criteria, modalCriterionPath) : null
  const formDisabled = Boolean(selected && !selected.canEdit) || busy

  return <WorkspacePage size="wide" className="rubric-page space-y-5" title="Bộ tiêu chí đánh giá" eyebrow="Cấu hình học vụ" description="Quản lý tiêu chí, trọng số và các phiên bản dùng trong từng đợt đánh giá." action={<div className="flex flex-wrap items-center gap-2"><Button variant="secondary" icon="auto_awesome" disabled={busy || loading || listFailed} onClick={() => setAiDraftOpen(true)}>Soạn nháp bằng AI</Button><Button icon="add" disabled={busy || loading || listFailed} onClick={() => void startDraft()}>Tạo bộ tiêu chí</Button></div>}>
    {confirmationDialog}
    <DepartmentAiDraftBar
      open={aiDraftOpen}
      onClose={() => setAiDraftOpen(false)}
      title="Soạn nháp Bộ tiêu chí đánh giá bằng AI"
      description="Tải lên Đề cương học phần / Bảng chấm mẫu (PDF, DOCX, XLSX, ảnh) hoặc mô tả yêu cầu để AI dựng khung Rubric tổng 100% cùng 4 mức chất lượng ở trạng thái DRAFT."
      toolMode="RUBRIC_SETUP"
      pageContext="/academic/rubrics"
      placeholder="VD: Thiết lập bộ tiêu chí bảo vệ đồ án tốt nghiệp ngành Kỹ thuật phần mềm (giai đoạn Bảo vệ, 4 tiêu chí gốc tổng 100%, mỗi tiêu chí đủ 4 mức chất lượng)…"
      starters={[
        { label: 'Bảo vệ đồ án CNTT', prompt: 'Thiết lập bộ tiêu chí Bảo vệ đồ án tốt nghiệp đơn ngành CNTT (tổng 100%, 4 mức chất lượng: Xuất sắc, Khá, Đạt, Chưa đạt).' },
        { label: 'Chấm nguội (Cold)', prompt: 'Thiết lập bộ tiêu chí Chấm nguội (COLD) tài liệu SRS/SDS và mã nguồn, tổng 100%, kèm hướng dẫn minh chứng cụ thể.' },
        { label: 'Liên ngành SE + MKT', prompt: 'Thiết lập bộ tiêu chí Liên ngành (INTERDISCIPLINARY) phạm vi Chung cho đồ án kết hợp Kỹ thuật phần mềm và Marketing.' },
      ]}
      renderResult={(res) => (
        res.draft?.kind === 'RUBRIC_SETUP' && res.draft.rubricSetup ? (
          <AssistantRubricSetupCard
            runId={res.runId}
            plan={res.draft.rubricSetup}
            canApply
            departments={departments}
            semesters={semesters}
            majors={majors}
            defaultDepartmentId={departmentId || departments[0]?.id || null}
            academicSemesterId={semesterId || semesters[0]?.id || 0}
            onApplied={(created) => {
              void loadList().then(() => select(created.rubricId))
              setAiDraftOpen(false)
            }}
          />
        ) : (
          <div className="rounded-xl border border-status-warning-border bg-status-warning-bg p-4 text-xs text-status-warning-text space-y-2">
            <p className="font-semibold">AI chưa trích xuất được cấu trúc tiêu chí chuẩn từ yêu cầu trên.</p>
            <p className="whitespace-pre-wrap text-ink">{res.answer}</p>
          </div>
        )
      )}
    />
    {error && <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">{error} <button type="button" className="min-h-11 font-semibold underline" onClick={() => void loadList()}>Tải lại</button></p>}
    <FilterToolbar
      search={listSearch}
      onSearchChange={setListSearch}
      searchLabel="Tìm bộ tiêu chí"
      searchPlaceholder="Tìm mã, tên bộ tiêu chí…"
      debounceMs={0}
      tabs={[
        { value: '', label: 'Tất cả' },
        { value: 'PUBLISHED', label: 'Đã công bố' },
        { value: 'DRAFT', label: 'Bản nháp' },
        { value: 'PENDING_APPROVAL', label: 'Đang chờ duyệt' },
        { value: 'RETIRED', label: 'Ngừng sử dụng' },
      ]}
      activeTab={status}
      onTabChange={next => { setStatus(next); setPage(1) }}
      tabsLabel="Lọc bộ tiêu chí theo trạng thái"
      controls={
        <>
          {departments.length > 1 && (
            <label className="ft-select-wrap">
              <span className="sr-only">Bộ môn</span>
              <select className="ft-select" aria-label="Lọc theo bộ môn" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
                <option value="">Tất cả bộ môn</option>
                {departments.map(dept => <option key={dept.id} value={String(dept.id)}>{dept.name}</option>)}
              </select>
            </label>
          )}
          {semesters.length > 1 && (
            <label className="ft-select-wrap">
              <span className="sr-only">Học kỳ</span>
              <select className="ft-select" aria-label="Lọc theo học kỳ" value={semesterFilter} onChange={e => setSemesterFilter(e.target.value)}>
                <option value="">Tất cả học kỳ</option>
                {semesters.map(sem => <option key={sem.id} value={String(sem.id)}>{sem.name}</option>)}
              </select>
            </label>
          )}
          <label className="ft-select-wrap">
            <span className="sr-only">Giai đoạn</span>
            <select className="ft-select" aria-label="Lọc theo giai đoạn" value={stageFilter} onChange={e => setStageFilter(e.target.value)}>
              <option value="">Tất cả giai đoạn</option>
              <option value="ON_GOING">Đánh giá quá trình</option>
              <option value="COLD">Chấm nguội</option>
              <option value="DEFENSE">Bảo vệ</option>
            </select>
          </label>
        </>
      }
      activeChips={listChips}
      onRemoveChip={id => {
        if (id === 'status') { setStatus(''); setPage(1) }
        if (id === 'dept') setDeptFilter('')
        if (id === 'semester') setSemesterFilter('')
        if (id === 'stage') setStageFilter('')
      }}
      onClearAll={() => { setListSearch(''); setStatus(''); setDeptFilter(''); setSemesterFilter(''); setStageFilter(''); setPage(1) }}
      hasActiveFilters={hasListFilters}
      resultSummary={`${filteredRubrics.length} / ${total} bộ tiêu chí`}
      pagination={
        useServerPaging
          ? { page, pages: Math.max(1, Math.ceil(total / pageSize)), total, pageSize, busy: loading, onPage: setPage }
          : rubricPager.showPagination
            ? { page: rubricPager.page, pages: rubricPager.pages, total: rubricPager.total, pageSize: rubricPager.pageSize, onPage: rubricPager.setPage }
            : undefined
      }
    />
    {selected && !detailLoading && <RubricWorkbookPanel key={`${selected.id}:${selected.concurrencyToken}`} rubric={selected} dirty={dirty}
      onCommitted={async preview => {
        if (!preview.draft) return
        await api.updateRubric(selected.id, preview.draft, preview.draft.concurrencyToken)
        await loadList()
        await select(selected.id)
      }} />}
    <div className="workspace-master-detail grid"><section className="min-w-0 rounded-xl border border-hairline bg-card p-4"><div className="flex items-center justify-between gap-2"><h2 className="font-semibold">Danh sách</h2><span className="text-xs text-ink-muted">{filteredRubrics.length} mục</span></div>{loading && <p role="status" className="mt-3 text-sm">Đang tải bộ tiêu chí…</p>}{!loading && !listFailed && filteredRubrics.length === 0 && <p className="mt-3 text-sm text-ink-muted">Chưa có bộ tiêu chí.</p>}<ul className="mt-3 space-y-2">{displayedRubrics.map(item => <li key={item.id} className="min-w-0"><button type="button" aria-pressed={selected?.id === item.id} disabled={busy} className={`min-h-11 w-full min-w-0 overflow-hidden rounded-lg border p-3 text-left text-sm transition-colors ${selected?.id === item.id ? 'border-primary bg-primary-subtle' : 'border-hairline hover:bg-canvas'}`} onClick={() => void chooseRubric(item.id)}><span className="flex w-full items-center justify-between gap-2"><StatusBadge tone={rubricStatusTone(item.status)} label={rubricStatusLabel(item.status)} /></span><strong className="mt-1.5 block w-full min-w-0 break-words [overflow-wrap:anywhere] text-[13px] leading-snug text-ink">{item.code} <span className="font-normal text-ink-muted whitespace-nowrap">· v{item.version}</span></strong><span className="mt-1 block min-w-0 break-words text-xs text-ink-muted">{item.name}</span></button></li>)}</ul>{useServerPaging ? <div className="mt-3 border-t border-hairline pt-3"><Pagination page={page} pages={Math.ceil(total / pageSize)} total={total} pageSize={pageSize} busy={loading} onPage={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1) }} /></div> : rubricPager.showPagination ? <div className="mt-3 border-t border-hairline pt-3"><Pagination page={rubricPager.page} pages={rubricPager.pages} total={rubricPager.total} pageSize={rubricPager.pageSize} onPage={rubricPager.setPage} onPageSizeChange={rubricPager.setPageSize} /></div> : null}</section>
    <section className="min-w-0 rounded-xl border border-hairline bg-card p-5 rubric-detail" aria-busy={loading || detailLoading}>{(loading && !creating && !selected) || detailLoading ? <div className="rubric-empty" role="status"><span className="material-symbols-outlined" aria-hidden="true">grading</span><h2>Đang tải bộ tiêu chí…</h2></div> : !creating && !selected && listFailed ? <div className="rubric-empty" role="status"><h2>Không thể tải danh sách</h2><p>Hãy tải lại bộ tiêu chí trước khi tạo hoặc chọn phiên bản.</p></div> : !creating && !selected ? <div className="rubric-empty"><span className="material-symbols-outlined" aria-hidden="true">fact_check</span><h2>{rubrics.length ? 'Chọn bộ tiêu chí để xem' : 'Chưa có bộ tiêu chí'}</h2><p>Xem nội dung, trọng số và phiên bản tại đây.</p><Button variant="secondary" onClick={newDraft}>Tạo bản nháp</Button></div> : <><div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-semibold break-words [overflow-wrap:anywhere]">{creating ? 'Bản nháp mới' : `${selected?.code} · v${selected?.version}`}</h2>{selected && <p className="text-xs text-ink-muted">{rubricStatusLabel(selected.status)} · {selected.canEdit ? 'Có thể sửa' : 'Chỉ đọc'}</p>}</div>{selected && <div className="flex flex-wrap gap-2">{selected.status === 'DRAFT' && (selected.canSubmitForApproval ? <><button type="button" disabled={busy || dirty || missingLevels.length > 0} className="min-h-11 rounded-lg border border-hairline px-3 text-xs font-semibold" onClick={() => void act('submit')}>Gửi duyệt</button>{missingLevels.length > 0 && <span role="status" className="text-xs text-status-warning-text">{missingLevels.length} tiêu chí lá {selected.requiredLevelCount == null ? 'chưa hoàn tất mức chất lượng' : `chưa đủ ${selected.requiredLevelCount} mức chất lượng`} ({missingLevels.join(', ')}).</span>}</> : isLegacyRubric(selected) ? <button type="button" disabled={busy || dirty} className="min-h-11 rounded-lg border border-hairline px-3 text-xs font-semibold" onClick={() => void act('publish')}>Công bố</button> : null)}{selected.status === 'PUBLISHED' && <button type="button" disabled={busy} className="min-h-11 rounded-lg border border-hairline px-3 text-xs font-semibold" onClick={() => void act('retire')}>Ngừng dùng</button>}{selected.status !== 'DRAFT' && <button type="button" disabled={busy} className="min-h-11 rounded-lg border border-hairline px-3 text-xs font-semibold" onClick={() => void act('clone')}>Tạo phiên bản</button>}{selected.canEdit && <button type="button" disabled={busy} className="min-h-11 rounded-lg border border-status-error-border px-3 text-xs font-semibold text-status-error-text" onClick={() => void act('delete')}>Xóa bản nháp</button>}</div>}</div>
      {selected?.status === 'PENDING_APPROVAL' && <p role="status" className="mt-3 rounded-lg border border-status-warning-border bg-status-warning-bg p-3 text-sm text-status-warning-text">Đang chờ phê duyệt — người gửi không tự duyệt được.</p>}{selected?.status === 'PENDING_APPROVAL' && <ActionVerdict actions={[{ code: 'APPROVE', allowed: Boolean(selected.canApprove), reasons: [] }]} actionCode="APPROVE" status="ready" okLabel="Điều kiện phê duyệt hợp lệ" blockedLabel="Chưa được cấp quyền phê duyệt">{(selected.canApprove || selected.canReject) && <ActionVerdict.Decision primary={{ label: 'Phê duyệt', onClick: () => void act('approve'), disabled: busy }} secondary={selected.canReject ? { label: 'Từ chối', onClick: () => void act('reject'), disabled: busy } : undefined} />}</ActionVerdict>}{selected?.approvalReference && <p className="mt-2 text-sm">Văn bản phê duyệt: {selected.approvalReference}</p>}{selected && !selected.canEdit ? <RubricReadView rubric={selected} departments={departments} semesters={semesters} majors={majors} /> : <form onSubmit={save} className="mt-4 space-y-4"><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Bộ môn<select value={departmentId} onChange={event => { setDepartmentId(Number(event.target.value)); setSemesterId(0) }} disabled={!creating || busy} className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 font-normal text-ink"><option value={0}>Chọn bộ môn</option>{departments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="text-sm">Học kỳ<select value={semesterId} onChange={event => setSemesterId(Number(event.target.value))} disabled={!creating || busy} className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 font-normal text-ink"><option value={0}>Chọn học kỳ</option>{compatibleSemesters.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Mã bộ tiêu chí<input value={code} onChange={event => setCode(event.target.value)} disabled={!creating || busy} required className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 font-normal text-ink" /></label><label className="text-sm">Tên bộ tiêu chí<input value={name} onChange={event => setName(event.target.value)} disabled={formDisabled} required className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 font-normal text-ink" /></label></div><label className="block text-sm">Mô tả<textarea value={description} onChange={event => setDescription(event.target.value)} disabled={formDisabled} rows={2} className="mt-1 w-full rounded-lg border border-hairline bg-card p-3 font-normal text-ink" /></label><RubricScopeEditor value={scopeFields} majors={eligibleMajors} disabled={busy} onChange={patch => setScopeFields(current => ({ ...current, ...patch }))} /><div><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold">Tiêu chí và trọng số</h3><p className="mt-1 text-xs text-ink-muted">Trọng số của các tiêu chí cùng cấp phải bằng 100% trước khi công bố.</p></div>{criteria.length > 1 && <div className="flex gap-2"><Button type="button" size="sm" variant="ghost" onClick={() => toggleAllCriteria(true)}>Mở rộng tất cả</Button><Button type="button" size="sm" variant="ghost" onClick={() => toggleAllCriteria(false)}>Thu gọn tất cả</Button></div>}</div><RubricWeightSummary issues={weightIssues} /><div className="mt-3 space-y-3">{criteria.map((item, index) => { const uid = item._uid ?? `root-${index}`; const pathKey = String(index); return <CriterionEditor key={uid} item={item} path={[index]} expanded={isCriterionExpanded(uid, pathKey)} onToggleExpand={targetUid => setExpandedCriteria(prev => ({ ...prev, [targetUid]: !isCriterionExpanded(targetUid, pathKey) }))} isExpandedCheck={isCriterionExpanded} onOpenModal={path => setModalCriterionPath(path)} invalidGroupPaths={invalidGroupPaths} disabled={formDisabled} onEdit={(path, change) => setCriteria(current => editTree(current, path, node => ({ ...node, ...change })))} onAddChild={path => { const createdChild = newCriterion(0); setCriteria(current => editTree(current, path, node => ({ ...node, maxScore: null, isRequired: false, levels: [], children: [...node.children, { ...createdChild, sortOrder: nextSortOrder(node.children) }] }))); if (createdChild._uid) setExpandedCriteria(prev => ({ ...prev, [createdChild._uid!]: true })) }} onClone={path => setCriteria(current => cloneTree(current, path))} onRemove={path => setCriteria(current => normalize(removeTree(current, path)))} onMove={(path, direction) => setCriteria(current => moveTree(current, path, direction))} /> })}</div>{(creating || selected?.canEdit) && <button type="button" className="mt-3 min-h-11 rounded-lg border border-hairline bg-card px-3 text-sm text-ink hover:bg-canvas" onClick={() => { const added = newCriterion(nextSortOrder(criteria)); setCriteria(current => [...current, added]); if (added._uid) setExpandedCriteria(prev => ({ ...prev, [added._uid!]: true })) }}>Thêm tiêu chí</button>}</div><button type="button" className="min-h-11 rounded-lg border border-hairline bg-card px-3 text-sm text-ink hover:bg-canvas" onClick={() => setPreview(value => !value)}>{preview ? 'Đóng xem trước phiếu chấm' : 'Xem trước phiếu chấm'}</button>{preview && <RubricSheetPreview criteria={criteria} />}{selected?.previousVersion && <RubricVersionDiff current={selected} previous={selected.previousVersion} />}{(creating || selected?.canEdit) && <div className="flex flex-wrap gap-3"><Button type="submit" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu bản nháp'}</Button>{creating && <Button variant="secondary" disabled={busy} onClick={() => void cancelDraft()}>Hủy tạo mới</Button>}</div>}</form>}</>}</section></div>
    {modalCriterion && modalCriterionPath && (
      <Modal
        open
        className="max-w-3xl"
        title={`Chi tiết tiêu chí ${modalCriterionPath.map(i => i + 1).join('.')}${modalCriterion.name ? `: ${modalCriterion.name}` : ''}`}
        onClose={() => setModalCriterionPath(null)}
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-ink-soft">Tên tiêu chí<input className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 text-sm text-ink" value={modalCriterion.name} disabled={formDisabled} onChange={event => setCriteria(current => editTree(current, modalCriterionPath, node => ({ ...node, name: event.target.value })))} /></label>
            <label className="text-xs font-medium text-ink-soft">Trọng số %<input className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 text-sm text-ink" type="number" min="0.01" max="100" step="0.01" value={modalCriterion.weightPercent} disabled={formDisabled} onChange={event => setCriteria(current => editTree(current, modalCriterionPath, node => ({ ...node, weightPercent: Number(event.target.value) })))} /></label>
            {modalCriterion.children.length === 0 && <label className="text-xs font-medium text-ink-soft">Điểm tối đa<input className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 text-sm text-ink" type="number" min="0.01" max="999999.99" step="0.01" value={modalCriterion.maxScore ?? ''} disabled={formDisabled} onChange={event => setCriteria(current => editTree(current, modalCriterionPath, node => ({ ...node, maxScore: Number(event.target.value) })))} /></label>}
            <label className="text-xs font-medium text-ink-soft">Mô tả<input className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 text-sm text-ink" value={modalCriterion.description ?? ''} disabled={formDisabled} onChange={event => setCriteria(current => editTree(current, modalCriterionPath, node => ({ ...node, description: event.target.value || null })))} /></label>
          </div>
          <CriterionDetailsEditor
            item={modalCriterion}
            path={modalCriterionPath}
            disabled={formDisabled}
            onEdit={(path, change) => setCriteria(current => editTree(current, path, node => ({ ...node, ...change })))}
          />
          <div className="flex justify-end border-t border-hairline pt-3">
            <Button type="button" onClick={() => setModalCriterionPath(null)}>Xong</Button>
          </div>
        </div>
      </Modal>
    )}
  </WorkspacePage>
}

function RubricScopeEditor({ value, majors, disabled, onChange }: {
  value: RubricScopeFields; majors: Major[]; disabled: boolean; onChange: (patch: Partial<RubricScopeFields>) => void
}) {
  return <fieldset className="rounded-lg border border-hairline p-3" disabled={disabled}>
    <legend className="px-1 text-sm font-semibold">Phạm vi áp dụng</legend>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm">Phạm vi<select aria-label="Phạm vi" className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 font-normal text-ink" value={value.evaluationScope ?? ''} onChange={event => onChange({ evaluationScope: event.target.value as RubricScopeFields['evaluationScope'] || null, majorId: null })}><option value="">Chưa khai phạm vi (mẫu cũ)</option><option value="COMMON">Chung</option><option value="MAJOR_SPECIFIC">Theo ngành</option><option value="INDIVIDUAL">Cá nhân</option></select></label>
      <label className="text-sm">Ngành<select aria-label="Ngành áp dụng" className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 font-normal text-ink" value={value.majorId ?? ''} disabled={disabled || value.evaluationScope !== 'MAJOR_SPECIFIC'} onChange={event => onChange({ majorId: event.target.value ? Number(event.target.value) : null })}><option value="">Chọn ngành</option>{value.majorId != null && !majors.some(item => item.id === value.majorId) && <option value={value.majorId}>Chuyên ngành đã chọn</option>}{majors.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="text-sm">Loại đồ án<select className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 font-normal text-ink" value={value.projectMode ?? ''} onChange={event => onChange({ projectMode: event.target.value as RubricScopeFields['projectMode'] || null })}><option value="">Chưa xác định</option><option value="SINGLE_MAJOR">Một ngành</option><option value="INTERDISCIPLINARY">Liên ngành</option></select></label>
      <label className="text-sm">Giai đoạn<select className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 font-normal text-ink" value={value.evaluationStage ?? ''} onChange={event => onChange({ evaluationStage: event.target.value as RubricScopeFields['evaluationStage'] || null })}><option value="">Chưa xác định</option><option value="ON_GOING">Đánh giá quá trình</option><option value="COLD">Chấm nguội</option><option value="DEFENSE">Bảo vệ</option></select></label>
      <label className="text-sm">Hiệu lực từ<input className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 font-normal text-ink" type="date" value={value.effectiveFrom ?? ''} onChange={event => onChange({ effectiveFrom: event.target.value || null })} /></label>
      <label className="text-sm">Hiệu lực đến<input className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 font-normal text-ink" type="date" min={value.effectiveFrom ?? undefined} value={value.effectiveTo ?? ''} onChange={event => onChange({ effectiveTo: event.target.value || null })} /></label>
    </div>
  </fieldset>
}

function CriterionDetailsEditor({ item, path, disabled, onEdit }: {
  item: CriterionInput; path: number[]; disabled: boolean; onEdit: (path: number[], change: Partial<CriterionInput>) => void
}) {
  const levels = item.levels ?? []
  const changeLevel = (index: number, patch: Partial<(typeof levels)[number]>) => onEdit(path, { levels: levels.map((level, position) => position === index ? { ...level, ...patch } : level) })
  return <div className="mt-3 space-y-3 border-t border-hairline pt-3">
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="text-xs">Chuẩn đầu ra<input className="mt-1 min-h-11 w-full rounded border px-2" value={item.learningOutcome ?? ''} disabled={disabled} onChange={event => onEdit(path, { learningOutcome: event.target.value || null })} /></label>
      <label className="text-xs">Hướng dẫn minh chứng<input className="mt-1 min-h-11 w-full rounded border px-2" value={item.evidenceGuidance ?? ''} disabled={disabled} onChange={event => onEdit(path, { evidenceGuidance: event.target.value || null })} /></label>
    </div>
    {item.children.length === 0 && <><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-xs">Mức chất lượng ({levels.length})</strong><button type="button" className="min-h-11 rounded border px-3 text-xs" disabled={disabled} onClick={() => onEdit(path, { levels: [...levels, { levelOrder: levels.length + 1, label: '', descriptor: '', scoreFrom: null, scoreTo: null }] })}>Thêm mức vào bản nháp</button></div>
    {levels.map((level, index) => <fieldset key={`lvl-${level.levelOrder}-${index}`} className="grid gap-2 rounded border border-hairline p-2 sm:grid-cols-2"><legend className="px-1 text-xs font-semibold">Mức {index + 1}</legend>
      <label className="text-xs">Nhãn mức<input className="mt-1 min-h-11 w-full rounded border px-2" value={level.label} disabled={disabled} onChange={event => changeLevel(index, { label: event.target.value })} /></label>
      <label className="text-xs">Mô tả mức<input className="mt-1 min-h-11 w-full rounded border px-2" value={level.descriptor} disabled={disabled} onChange={event => changeLevel(index, { descriptor: event.target.value })} /></label>
      <label className="text-xs">Điểm từ<input className="mt-1 min-h-11 w-full rounded border px-2" type="number" step="0.01" value={level.scoreFrom ?? ''} disabled={disabled} onChange={event => changeLevel(index, { scoreFrom: event.target.value ? Number(event.target.value) : null })} /></label>
      <label className="text-xs">Điểm đến<input className="mt-1 min-h-11 w-full rounded border px-2" type="number" step="0.01" value={level.scoreTo ?? ''} disabled={disabled} onChange={event => changeLevel(index, { scoreTo: event.target.value ? Number(event.target.value) : null })} /></label>
      <button type="button" className="min-h-11 rounded border border-status-error-border px-3 text-xs text-status-error-text" disabled={disabled} onClick={() => onEdit(path, { levels: levels.filter((_, position) => position !== index).map((entry, position) => ({ ...entry, levelOrder: position + 1 })) })}>Bỏ mức {index + 1}</button>
    </fieldset>)}</>}
  </div>
}

function CriterionEditor({ item, path, expanded, onToggleExpand, isExpandedCheck, onOpenModal, invalidGroupPaths, disabled, onEdit, onAddChild, onClone, onRemove, onMove }: {
  item: KeyedCriterionInput; path: number[]; expanded: boolean
  onToggleExpand: (uid: string) => void
  isExpandedCheck: (uid: string, pathKey: string) => boolean
  onOpenModal: (path: number[]) => void
  invalidGroupPaths: Set<string>; disabled: boolean
  onEdit: (path: number[], change: Partial<KeyedCriterionInput>) => void
  onAddChild: (path: number[]) => void; onClone: (path: number[]) => void; onRemove: (path: number[]) => void; onMove: (path: number[], direction: -1 | 1) => void
}) {
  const pathLabel = path.map(index => index + 1).join('.')
  const uid = item._uid ?? `path-${pathLabel}`
  const hasGroupError = invalidGroupPaths.has(path.join('.'))
  return (
    <div role="group" aria-label={`Tiêu chí ${pathLabel}: ${item.name || 'Chưa đặt tên'}`} className={`criterion-editor rounded-lg border bg-canvas p-3 ${hasGroupError ? 'border-status-error-border' : 'border-hairline'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onToggleExpand(uid)}
          aria-expanded={expanded}
          className="flex min-h-9 flex-1 items-center gap-2 text-left"
        >
          <span className="material-symbols-outlined text-[18px] text-ink-muted" aria-hidden="true">
            {expanded ? 'expand_more' : 'chevron_right'}
          </span>
          <h4 className="criterion-heading m-0">Tiêu chí {pathLabel}{!expanded && item.name ? ` · ${item.name}` : ''}</h4>
          <span className="rounded-full border border-hairline bg-card px-2 py-0.5 font-mono text-xs font-semibold text-ink-soft">
            {formatPercent(item.weightPercent)}
          </span>
          {item.children.length === 0 && (
            <span className="text-xs text-ink-muted">
              {(item.levels?.length ?? 0)} mức
            </span>
          )}
        </button>
        {!disabled && (
          <button
            type="button"
            onClick={() => onOpenModal(path)}
            className="min-h-9 rounded-lg border border-hairline bg-card px-2.5 text-xs font-semibold text-primary hover:bg-primary-subtle"
          >
            Sửa chi tiết
          </button>
        )}
      </div>
      {hasGroupError && <p className="mt-1 mb-2 text-xs text-status-error-text">Nhóm con của tiêu chí này cần kiểm tra.</p>}
      {expanded && (
        <div className="mt-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-xs">Tên tiêu chí<input className="mt-1 min-h-11 w-full rounded border px-2" value={item.name} disabled={disabled} onChange={event => onEdit(path, { name: event.target.value })} /></label>
            <label className="text-xs">Trọng số %<input className="mt-1 min-h-11 w-full rounded border px-2" type="number" min="0.01" max="100" step="0.01" value={item.weightPercent} disabled={disabled} onChange={event => onEdit(path, { weightPercent: Number(event.target.value) })} /></label>
            {item.children.length === 0 && <label className="text-xs">Điểm tối đa<input className="mt-1 min-h-11 w-full rounded border px-2" type="number" min="0.01" max="999999.99" step="0.01" value={item.maxScore ?? ''} disabled={disabled} onChange={event => onEdit(path, { maxScore: Number(event.target.value) })} /></label>}
            <label className="text-xs">Mô tả<input className="mt-1 min-h-11 w-full rounded border px-2" value={item.description ?? ''} disabled={disabled} onChange={event => onEdit(path, { description: event.target.value || null })} /></label>
          </div>
          {item.children.length === 0 && <label className="mt-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={item.isRequired} disabled={disabled} onChange={event => onEdit(path, { isRequired: event.target.checked })} />Bắt buộc</label>}
          <CriterionDetailsEditor item={item} path={path} disabled={disabled} onEdit={onEdit} />
          {!disabled && <div className="mt-2 flex flex-wrap gap-2"><button type="button" className="min-h-11 rounded border border-hairline px-3 text-xs" onClick={() => onAddChild(path)}>Thêm tiêu chí con</button><button type="button" className="min-h-11 rounded border border-hairline px-3 text-xs" onClick={() => onClone(path)}>Nhân bản</button><button type="button" aria-label={`Đưa tiêu chí ${item.name} lên`} className="min-h-11 rounded border border-hairline px-3 text-xs" onClick={() => onMove(path, -1)}>▲</button><button type="button" aria-label={`Đưa tiêu chí ${item.name} xuống`} className="min-h-11 rounded border border-hairline px-3 text-xs" onClick={() => onMove(path, 1)}>▼</button><button type="button" className="min-h-11 rounded border border-status-error-border px-3 text-xs text-status-error-text" onClick={() => onRemove(path)}>Bỏ</button></div>}
        </div>
      )}
      {item.children.length > 0 && (
        <div className="mt-3 space-y-2 border-l-2 border-hairline pl-3">
          {item.children.map((child, index) => {
            const childPath = [...path, index]
            const childUid = child._uid ?? `${uid}-${index}`
            const childKey = childPath.join('.')
            return (
              <CriterionEditor
                key={childUid}
                item={child}
                path={childPath}
                expanded={isExpandedCheck(childUid, childKey)}
                onToggleExpand={onToggleExpand}
                isExpandedCheck={isExpandedCheck}
                onOpenModal={onOpenModal}
                invalidGroupPaths={invalidGroupPaths}
                disabled={disabled}
                onEdit={onEdit}
                onAddChild={onAddChild}
                onClone={onClone}
                onRemove={onRemove}
                onMove={onMove}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

function RubricWeightSummary({ issues }: { issues: WeightGroupIssue[] }) {
  return <div role="status" className={`mt-2.5 rounded-lg border p-3 text-xs ${issues.length ? 'border-status-error-border bg-status-error-bg text-status-error-text' : 'border-hairline border-l-4 border-l-status-success-text bg-card text-ink'}`}>
    {issues.length ? <><strong>Các nhóm cần kiểm tra:</strong><ul className="mt-2 list-disc space-y-1 pl-5">{issues.map(issue => <li key={issue.parentPath.join('.') || 'root'}>{weightGroupIssueLabel(issue)}</li>)}</ul></> : <span className="inline-flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-status-success-text" aria-hidden="true">check_circle</span><strong>Tất cả nhóm tiêu chí đã đủ 100%.</strong></span>}
  </div>
}

function RubricReadView({ rubric, departments, semesters, majors }: { rubric: Rubric; departments: Department[]; semesters: Semester[]; majors: Major[] }) {
  return <div className="rubric-read-view">
    <h3>{rubric.name}</h3>
    <dl className="rubric-read-scope"><div><dt>Bộ môn</dt><dd>{departments.find(item => item.id === rubric.departmentId)?.name ?? 'Chưa có thông tin'}</dd></div><div><dt>Học kỳ</dt><dd>{semesters.find(item => item.id === rubric.academicSemesterId)?.name ?? 'Chưa có thông tin'}</dd></div></dl>
    {rubric.evaluationScope && <dl className="rubric-read-scope"><div><dt>Phạm vi</dt><dd>{displayLabel(rubric.evaluationScope)}</dd></div><div><dt>Loại đồ án</dt><dd>{rubric.projectMode ? displayLabel(rubric.projectMode) : 'Chưa xác định'}</dd></div><div><dt>Giai đoạn</dt><dd>{rubric.evaluationStage ? (stageLabels[rubric.evaluationStage] ?? displayLabel(rubric.evaluationStage)) : 'Chưa xác định'}</dd></div><div><dt>Ngành</dt><dd>{rubric.majorId == null ? 'Không áp dụng' : majors.find(item => item.id === rubric.majorId)?.name ?? 'Chưa tải được tên ngành'}</dd></div><div><dt>Hiệu lực</dt><dd>{rubric.effectiveFrom ?? 'Chưa xác định'} – {rubric.effectiveTo ?? 'Chưa xác định'}</dd></div></dl>}
    {rubric.description && <p className="rubric-read-description">{rubric.description}</p>}
    <div className="rubric-criteria-title"><h3>Tiêu chí và trọng số</h3><span>{rubric.criteria.length} tiêu chí chính</span></div>
    <ol className="rubric-read-criteria">{rubric.criteria.map((item, index) => <CriterionReadView key={item.id} item={item} number={String(index + 1)} />)}</ol>
  </div>
}
function CriterionReadView({ item, number }: { item: RubricCriterion; number: string }) {
  const effective = item.effectiveWeightPercent
  const distinct = effective != null && Number.isFinite(effective) && effective !== item.weightPercent
  return <li><div className="rubric-read-criterion"><span className="rubric-criterion-number">{number}</span><div><h4>{item.name}</h4>{item.description && <p>{item.description}</p>}{item.learningOutcome && <p>Chuẩn đầu ra: {item.learningOutcome}</p>}{item.evidenceGuidance && <p>Minh chứng: {item.evidenceGuidance}</p>}<div className="rubric-criterion-meta">{item.children.length === 0 && <><span>Điểm tối đa: {formatScore(item.maxScore)}</span>{item.isRequired && <span>Bắt buộc</span>}</>}</div></div><div className="rubric-criterion-weight">{distinct ? <><span>Trong nhóm: {formatPercent(item.weightPercent)}</span><span>Tỷ trọng hiệu lực trong bộ tiêu chí: {formatPercent(effective)}</span></> : <span>Trọng số: {formatPercent(item.weightPercent)}</span>}</div></div>{item.children.length === 0 && !!item.levels?.length && <details className="mt-2 rounded border p-2 text-sm"><summary className="cursor-pointer">Mức chất lượng</summary><ul className="mt-2 space-y-1">{item.levels.map(level => <li key={level.levelOrder}>{level.label}: {level.descriptor}</li>)}</ul></details>}{item.children.length > 0 && <ol>{item.children.map((child, index) => <CriterionReadView key={child.id} item={child} number={number + '.' + (index + 1)} />)}</ol>}</li>
}
