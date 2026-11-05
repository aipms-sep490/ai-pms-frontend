import { useActionConfirmation } from '../../components/ui/useActionConfirmation'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { getAcademicHierarchy } from '../academic/api/academic-api'
import { getSemesters } from '../academic/api/governance-api'
import type { Department } from '../academic/types/academic.types'
import type { Semester } from '../academic/types/governance.types'
import { useAuthSession } from '../auth/context/useAuthSession'
import { HttpError } from '../../services/http/http-client'
import * as api from './rubrics-api'
import type { CriterionInput, Rubric, RubricCriterion, RubricCriterionLevel } from './rubrics-api'
import { Button } from '../../components/ui/Button'
import { formatPercent, formatScore } from '../../components/ui/format'
import './rubric-management.css'

const newCriterion = (): CriterionInput => ({ name: '', description: null, weightPercent: 100, maxScore: 10, sortOrder: 0, isRequired: true, children: [], criterionCode: '', learningOutcome: '', evidenceGuidance: '', levels: [] })
const rubricStatusLabel = (value: string) => ({ DRAFT: 'Bản nháp', PENDING_APPROVAL: 'Chờ phê duyệt', APPROVED: 'Đã phê duyệt', PUBLISHED: 'Đã công bố', RETIRED: 'Ngừng sử dụng' }[value] ?? value)
const fromCriterion = (value: RubricCriterion): CriterionInput => ({ name: value.name, description: value.description, weightPercent: value.weightPercent, maxScore: value.maxScore, sortOrder: value.sortOrder, isRequired: value.isRequired, children: (value.children || []).map(fromCriterion), criterionCode: value.criterionCode ?? '', learningOutcome: value.learningOutcome ?? '', evidenceGuidance: value.evidenceGuidance ?? '', levels: (value.levels || []).map(l => ({ ...l })) })
const normalize = (items: CriterionInput[]): CriterionInput[] => items.map((item, index) => ({ ...item, sortOrder: index, children: normalize(item.children) }))
function hasUnnamedCriterion(items: CriterionInput[]): boolean { return items.some(item => !item.name.trim() || hasUnnamedCriterion(item.children)) }
function editTree(items: CriterionInput[], path: number[], edit: (item: CriterionInput) => CriterionInput): CriterionInput[] {
  const [index, ...rest] = path
  return items.map((item, position) => position !== index ? item : rest.length ? { ...item, children: editTree(item.children, rest, edit) } : edit(item))
}
function removeTree(items: CriterionInput[], path: number[]): CriterionInput[] {
  const [index, ...rest] = path
  return rest.length ? items.map((item, position) => { if (position !== index) return item; const children = removeTree(item.children, rest); return { ...item, children, ...(children.length === 0 ? { maxScore: item.maxScore ?? 10, isRequired: true } : {}) } }) : items.filter((_, position) => position !== index)
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
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [departmentId, setDepartmentId] = useState(0)
  const [semesterId, setSemesterId] = useState(0)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [projectMode, setProjectMode] = useState<'SINGLE_MAJOR' | 'INTERDISCIPLINARY' | ''>('')
  const [evaluationStage, setEvaluationStage] = useState<'ON_GOING' | 'COLD' | 'DEFENSE' | ''>('')
  const [evaluationScope, setEvaluationScope] = useState<'COMMON' | 'MAJOR_SPECIFIC' | 'INDIVIDUAL' | ''>('')
  const [majorId, setMajorId] = useState<number | ''>('')
  const [effectiveFrom, setEffectiveFrom] = useState('')
  const [effectiveTo, setEffectiveTo] = useState('')
  const [approvalReference, setApprovalReference] = useState('')
  const [criteria, setCriteria] = useState<CriterionInput[]>([])
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
      setProjectMode(next.projectMode ?? '')
      setEvaluationStage(next.evaluationStage ?? '')
      setEvaluationScope(next.evaluationScope ?? '')
      setMajorId(next.majorId ?? '')
      setEffectiveFrom(next.effectiveFrom ? next.effectiveFrom.slice(0, 10) : '')
      setEffectiveTo(next.effectiveTo ? next.effectiveTo.slice(0, 10) : '')
      setApprovalReference(next.approvalReference ?? '')
      setCriteria(next.criteria.map(fromCriterion)); setError(null)
    } catch { if (request === selectionRequest.current) setError('Không thể tải bộ tiêu chí này.') }
    finally { if (request === selectionRequest.current) setDetailLoading(false) }
  }, [])
  useEffect(() => {
    if (!initialSelectionDone && !loading && rubrics.length && !creating && !selected) {
      setInitialSelectionDone(true)
      void select((rubrics.find(item => item.status === 'PUBLISHED') ?? rubrics[0]).id)
    }
  }, [initialSelectionDone, loading, rubrics, creating, selected, select])
  const newDraft = () => { ++selectionRequest.current; setDetailLoading(false); setCreating(true); setSelected(null); setCode(''); setName(''); setDescription(''); setProjectMode(''); setEvaluationStage(''); setEvaluationScope(''); setMajorId(''); setEffectiveFrom(''); setEffectiveTo(''); setApprovalReference(''); setCriteria([newCriterion()]); setDepartmentId(0); setSemesterId(0); setError(null) }
  const dirty = creating
    ? Boolean(code || name || description || departmentId || semesterId || JSON.stringify(criteria) !== JSON.stringify([newCriterion()]))
    : Boolean(selected?.canEdit && JSON.stringify({ name, description, criteria: normalize(criteria) }) !== JSON.stringify({ name: selected.name, description: selected.description ?? '', criteria: normalize(selected.criteria.map(fromCriterion)) }))
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
      if (reason instanceof HttpError && reason.status === 409) { await loadList(); if (selected) await select(selected.id) }
      setError(reason instanceof HttpError && reason.status === 409
        ? 'Bộ tiêu chí hoặc phạm vi học vụ đã thay đổi. Dữ liệu mới đã được tải lại; hãy kiểm tra trước khi thao tác lại.'
        : reason instanceof HttpError && reason.status === 403 ? 'Hệ thống không cấp quyền thao tác bộ tiêu chí này.' : 'Không thể lưu bộ tiêu chí. Kiểm tra dữ liệu, trọng số và trạng thái học kỳ.')
    } finally { setBusy(false) }
  }
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim() || hasUnnamedCriterion(criteria)) { setError('Hãy nhập tên bộ tiêu chí và tiêu chí.'); return }
    const draft: api.RubricDraft = {
      name: name.trim(),
      description: description.trim() || null,
      criteria: normalize(criteria),
      projectMode: (projectMode || null) as any,
      evaluationStage: (evaluationStage || null) as any,
      evaluationScope: (evaluationScope || null) as any,
      majorId: majorId ? Number(majorId) : null,
      effectiveFrom: effectiveFrom ? new Date(effectiveFrom).toISOString() : null,
      effectiveTo: effectiveTo ? new Date(effectiveTo).toISOString() : null,
    }
    if (creating) {
      if (!departmentId || !semesterId || !code.trim()) { setError('Chọn bộ môn, học kỳ và nhập mã bộ tiêu chí.'); return }
      void run(() => api.createRubric({ ...draft, departmentId, academicSemesterId: semesterId, code: code.trim() }))
    } else if (selected?.canEdit) void run(() => api.updateRubric(selected.id, draft, selected.concurrencyToken))
  }
  const act = async (kind: 'publish' | 'retire' | 'clone' | 'delete') => {
    if (!selected) return
    if (dirty && kind === 'publish') { setError('Lưu bản nháp trước khi công bố để sử dụng nội dung mới nhất.'); return }
    const decision = await requestConfirmation({
      title: kind === 'publish' ? 'Công bố bộ tiêu chí?' : kind === 'retire' ? 'Ngừng sử dụng bộ tiêu chí?' : kind === 'clone' ? 'Tạo phiên bản mới' : 'Xóa bản nháp?',
      description: kind === 'publish' ? 'Sau khi công bố, nội dung phiên bản này không thể chỉnh sửa.' : kind === 'retire' ? 'Phiên bản này sẽ không được dùng cho các phân công mới.' : kind === 'clone' ? 'Nhập mã riêng cho phiên bản mới. Nội dung hiện tại sẽ được sao chép sang bản nháp.' : 'Chỉ có thể xóa bản nháp chưa được sử dụng.',
      confirmLabel: kind === 'publish' ? 'Công bố' : kind === 'retire' ? 'Ngừng sử dụng' : kind === 'clone' ? 'Tạo phiên bản' : 'Xóa bản nháp',
      reasonSingleLine: kind === 'clone', danger: kind === 'delete', reasonLabel: kind === 'clone' ? 'Mã phiên bản mới' : undefined,
    })
    if (decision === null) return
    const cloneCode = kind === 'clone' ? decision : null
    const operation = kind === 'publish' ? () => api.publishRubric(selected.id, selected.concurrencyToken)
      : kind === 'retire' ? () => api.retireRubric(selected.id, selected.concurrencyToken)
      : kind === 'clone' ? () => api.cloneRubric(selected.id, cloneCode!, selected.concurrencyToken)
      : () => api.deleteRubric(selected.id, selected.concurrencyToken)
    void run(operation)
  }

  const actWorkflow = async (kind: 'submit' | 'approve' | 'reject') => {
    if (!selected) return
    if (dirty && kind === 'submit') { setError('Lưu bản nháp trước khi gửi phê duyệt để sử dụng nội dung mới nhất.'); return }
    const decision = await requestConfirmation({
      title: kind === 'submit' ? 'Gửi phê duyệt bộ tiêu chí?' : kind === 'approve' ? 'Phê duyệt bộ tiêu chí?' : 'Từ chối bộ tiêu chí?',
      description: kind === 'submit' ? 'Bộ tiêu chí sẽ chuyển sang trạng thái chờ phê duyệt để cấp thẩm quyền xem xét.' : kind === 'approve' ? 'Xác nhận phê duyệt bộ tiêu chí này để có thể công bố.' : 'Nhập lý do từ chối để người soạn thảo bản nháp điều chỉnh lại.',
      confirmLabel: kind === 'submit' ? 'Gửi phê duyệt' : kind === 'approve' ? 'Phê duyệt' : 'Từ chối',
      danger: kind === 'reject',
      reasonLabel: kind === 'approve' ? 'Số quyết định / Ký hiệu phê duyệt (nếu có)' : kind === 'reject' ? 'Lý do từ chối (bắt buộc)' : undefined,
      reasonSingleLine: kind === 'approve',
    })
    if (decision === null) return
    if (kind === 'reject' && (!decision || !decision.trim())) {
      setError('Vui lòng nhập lý do từ chối.')
      return
    }
    const operation = kind === 'submit' ? () => api.submitRubricForApproval(selected.id, selected.concurrencyToken)
      : kind === 'approve' ? () => api.approveRubric(selected.id, selected.concurrencyToken, decision?.trim() || null)
      : () => api.rejectRubric(selected.id, selected.concurrencyToken, decision.trim())
    void run(operation)
  }

  const topLevelWeightSum = criteria.reduce((sum, item) => sum + (Number(item.weightPercent) || 0), 0)
  const isWeight100 = Math.abs(topLevelWeightSum - 100) < 0.01

  return <WorkspacePage className="rubric-page space-y-5" title="Bộ tiêu chí đánh giá" eyebrow="Đánh giá đồ án" description="Quản lý tiêu chí, trọng số và các phiên bản dùng trong từng đợt đánh giá." action={<Button disabled={busy} onClick={() => void startDraft()}>Tạo bộ tiêu chí</Button>}>
    {confirmationDialog}
    {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error} <button type="button" className="font-semibold underline" onClick={() => void loadList()}>Tải lại</button></p>}
    <div className="workspace-master-detail grid"><section className="rounded-xl border bg-card p-4"><h2 className="font-semibold">Danh sách</h2><label className="mt-3 block text-sm">Trạng thái<select className="mt-1 min-h-11 w-full rounded-lg border px-3" value={status} onChange={event => { setStatus(event.target.value); setPage(1) }}><option value="">Tất cả</option><option value="DRAFT">Bản nháp</option><option value="PUBLISHED">Đã công bố</option><option value="RETIRED">Ngừng sử dụng</option></select></label>{loading && <p role="status" className="mt-3 text-sm">Đang tải bộ tiêu chí…</p>}{!loading && rubrics.length === 0 && <p className="mt-3 text-sm text-ink-muted">Chưa có bộ tiêu chí.</p>}<ul className="mt-3 space-y-2">{rubrics.map(item => <li key={item.id}><button type="button" aria-pressed={selected?.id === item.id} disabled={busy} className={`min-h-11 w-full rounded-lg border p-3 text-left text-sm ${selected?.id === item.id ? 'border-primary bg-primary-subtle' : 'border-hairline'}`} onClick={() => void chooseRubric(item.id)}><strong>{item.code}</strong> · v{item.version}<span className="block text-xs text-ink-muted">{item.name} · {rubricStatusLabel(item.status)}</span></button></li>)}</ul>{total > 20 && <div className="mt-3 flex justify-between text-sm"><button type="button" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Trước</button><span>{page} / {Math.ceil(total / 20)}</span><button type="button" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(value => value + 1)}>Sau</button></div>}</section>
    <section className="rounded-xl border bg-card p-5 rubric-detail" aria-busy={detailLoading}>{detailLoading ? <div className="rubric-empty" role="status"><span className="material-symbols-outlined" aria-hidden="true">grading</span><h2>Đang tải bộ tiêu chí…</h2></div> : !creating && !selected ? <div className="rubric-empty"><span className="material-symbols-outlined" aria-hidden="true">fact_check</span><h2>{rubrics.length ? 'Chọn bộ tiêu chí để xem' : 'Chưa có bộ tiêu chí'}</h2><p>Xem nội dung, trọng số và phiên bản tại đây.</p><Button variant="secondary" onClick={newDraft}>Tạo bản nháp</Button></div> : <><div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-semibold">{creating ? 'Bản nháp mới' : `${selected?.code} · v${selected?.version}`}</h2>{selected && <p className="text-xs text-ink-muted">{rubricStatusLabel(selected.status)} · {selected.canEdit ? 'Có thể sửa' : 'Chỉ đọc'}</p>}</div>{selected && <div className="flex flex-wrap gap-2">{selected.status === 'DRAFT' && <button type="button" disabled={busy} className="min-h-11 rounded-lg border px-3 text-xs font-semibold" onClick={() => void act('publish')}>Công bố</button>}{selected.canSubmitForApproval && <button type="button" disabled={busy} className="min-h-11 rounded-lg border border-primary px-3 text-xs font-semibold text-primary hover:bg-primary-subtle" onClick={() => void actWorkflow('submit')}>Gửi phê duyệt</button>}{selected.canApprove && <button type="button" disabled={busy} className="min-h-11 rounded-lg border border-emerald-600 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800 hover:bg-emerald-100" onClick={() => void actWorkflow('approve')}>Phê duyệt</button>}{selected.canReject && <button type="button" disabled={busy} className="min-h-11 rounded-lg border border-rose-300 bg-rose-50 px-3 text-xs font-semibold text-rose-800 hover:bg-rose-100" onClick={() => void actWorkflow('reject')}>Từ chối</button>}{selected.status === 'PUBLISHED' && <button type="button" disabled={busy} className="min-h-11 rounded-lg border px-3 text-xs font-semibold" onClick={() => void act('retire')}>Ngừng dùng</button>}{selected.status !== 'DRAFT' && <button type="button" disabled={busy} className="min-h-11 rounded-lg border px-3 text-xs font-semibold" onClick={() => void act('clone')}>Tạo phiên bản</button>}{selected.canEdit && <button type="button" disabled={busy} className="min-h-11 rounded-lg border border-rose-300 px-3 text-xs font-semibold text-rose-700" onClick={() => void act('delete')}>Xóa bản nháp</button>}</div>}</div>
      {selected && !selected.canEdit ? <RubricReadView rubric={selected} departments={departments} semesters={semesters} /> : <form onSubmit={save} className="mt-4 space-y-4"><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Bộ môn<select value={departmentId} onChange={event => { setDepartmentId(Number(event.target.value)); setSemesterId(0) }} disabled={!creating || busy} className="mt-1 min-h-11 w-full rounded-lg border px-3"><option value={0}>Chọn bộ môn</option>{departments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="text-sm">Học kỳ<select value={semesterId} onChange={event => setSemesterId(Number(event.target.value))} disabled={!creating || busy} className="mt-1 min-h-11 w-full rounded-lg border px-3"><option value={0}>Chọn học kỳ</option>{compatibleSemesters.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Mã bộ tiêu chí<input value={code} onChange={event => setCode(event.target.value)} disabled={!creating || busy} required className="mt-1 min-h-11 w-full rounded-lg border px-3" /></label><label className="text-sm">Tên bộ tiêu chí<input value={name} onChange={event => setName(event.target.value)} disabled={Boolean(selected && !selected.canEdit) || busy} required className="mt-1 min-h-11 w-full rounded-lg border px-3" /></label></div><label className="block text-sm">Mô tả<textarea value={description} onChange={event => setDescription(event.target.value)} disabled={Boolean(selected && !selected.canEdit) || busy} rows={2} className="mt-1 w-full rounded-lg border p-3" /></label><div className="grid gap-3 sm:grid-cols-3"><label className="text-sm">Chế độ đồ án<select value={projectMode} onChange={event => setProjectMode(event.target.value as any)} disabled={Boolean(selected && !selected.canEdit) || busy} className="mt-1 min-h-11 w-full rounded-lg border px-3"><option value="">Không phân biệt</option><option value="SINGLE_MAJOR">Đơn ngành (SINGLE_MAJOR)</option><option value="INTERDISCIPLINARY">Liên ngành (INTERDISCIPLINARY)</option></select></label><label className="text-sm">Giai đoạn đánh giá<select value={evaluationStage} onChange={event => setEvaluationStage(event.target.value as any)} disabled={Boolean(selected && !selected.canEdit) || busy} className="mt-1 min-h-11 w-full rounded-lg border px-3"><option value="">Chọn giai đoạn</option><option value="ON_GOING">Đánh giá quá trình (ON_GOING)</option><option value="COLD">Chấm báo cáo (COLD)</option><option value="DEFENSE">Bảo vệ (DEFENSE)</option></select></label><label className="text-sm">Phạm vi đánh giá<select value={evaluationScope} onChange={event => setEvaluationScope(event.target.value as any)} disabled={Boolean(selected && !selected.canEdit) || busy} className="mt-1 min-h-11 w-full rounded-lg border px-3"><option value="">Chọn phạm vi</option><option value="COMMON">Chung đồ án (COMMON)</option><option value="MAJOR_SPECIFIC">Chuyên môn ngành (MAJOR_SPECIFIC)</option><option value="INDIVIDUAL">Cá nhân (INDIVIDUAL)</option></select></label></div><div className="grid gap-3 sm:grid-cols-3"><label className="text-sm">Mã chuyên ngành (Major ID)<input type="number" min="1" value={majorId} onChange={event => setMajorId(event.target.value ? Number(event.target.value) : '')} disabled={Boolean(selected && !selected.canEdit) || busy} placeholder="Ví dụ: 8" className="mt-1 min-h-11 w-full rounded-lg border px-3" /></label><label className="text-sm">Hiệu lực từ ngày<input type="date" value={effectiveFrom} onChange={event => setEffectiveFrom(event.target.value)} disabled={Boolean(selected && !selected.canEdit) || busy} className="mt-1 min-h-11 w-full rounded-lg border px-3" /></label><label className="text-sm">Hiệu lực đến ngày<input type="date" value={effectiveTo} onChange={event => setEffectiveTo(event.target.value)} disabled={Boolean(selected && !selected.canEdit) || busy} className="mt-1 min-h-11 w-full rounded-lg border px-3" /></label></div>{approvalReference && <div className="rounded-lg border border-hairline bg-canvas p-3 text-xs text-ink-muted"><strong className="text-ink">Quyết định phê duyệt: </strong>{approvalReference} (Chỉ đọc)</div>}<div><h3 className="font-semibold">Tiêu chí và trọng số</h3><p className="mt-1 text-xs text-ink-muted">Trọng số của các tiêu chí cùng cấp phải bằng 100% trước khi công bố.</p><div className={`mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-xs font-semibold ${isWeight100 ? 'border-status-success-border bg-status-success-bg text-status-success-text' : 'border-status-warning-border bg-status-warning-bg text-status-warning-text'}`}><div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">{isWeight100 ? 'check_circle' : 'warning'}</span><span>Tổng trọng số tiêu chí chính: <strong>{topLevelWeightSum.toFixed(2)}%</strong> / 100%</span></div>{!isWeight100 && <span className="rounded-md bg-white/80 px-2 py-0.5 text-xs font-bold">{topLevelWeightSum < 100 ? `Còn thiếu ${(100 - topLevelWeightSum).toFixed(2)}%` : `Đang vượt ${(topLevelWeightSum - 100).toFixed(2)}%`}</span>}</div><div className="mt-3 space-y-3">{criteria.map((item, index) => <CriterionEditor key={index} item={item} path={[index]} disabled={Boolean(selected && !selected.canEdit) || busy} onEdit={(path, change) => setCriteria(current => editTree(current, path, node => ({ ...node, ...change })))} onAddChild={path => setCriteria(current => editTree(current, path, node => ({ ...node, maxScore: null, isRequired: false, children: [...node.children, newCriterion()] })))} onRemove={path => setCriteria(current => removeTree(current, path))} />)}</div>{(creating || selected?.canEdit) && <button type="button" className="mt-3 min-h-11 rounded-lg border px-3 text-sm" onClick={() => setCriteria(current => [...current, newCriterion()])}>Thêm tiêu chí</button>}</div>{(creating || selected?.canEdit) && <div className="flex flex-wrap gap-3"><Button type="submit" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu bản nháp'}</Button>{creating && <Button variant="secondary" disabled={busy} onClick={() => void cancelDraft()}>Hủy tạo mới</Button>}</div>}</form>}</>}</section></div>
  </WorkspacePage>
}

function CriterionEditor({ item, path, disabled, onEdit, onAddChild, onRemove }: {
  item: CriterionInput; path: number[]; disabled: boolean
  onEdit: (path: number[], change: Partial<CriterionInput>) => void
  onAddChild: (path: number[]) => void; onRemove: (path: number[]) => void
}) {
  return (
    <div className="criterion-editor rounded-lg border border-hairline bg-canvas p-3">
      <h4 className="criterion-heading">Tiêu chí {path.map(index => index + 1).join('.')}</h4>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs">Tên tiêu chí
          <input className="mt-1 min-h-11 w-full rounded border px-2" value={item.name} disabled={disabled} onChange={event => onEdit(path, { name: event.target.value })} />
        </label>
        <label className="text-xs">Mã tiêu chí (Code)
          <input className="mt-1 min-h-11 w-full rounded border px-2" placeholder="Ví dụ: CRIT-01" value={item.criterionCode ?? ''} disabled={disabled} onChange={event => onEdit(path, { criterionCode: event.target.value || null })} />
        </label>
        <label className="text-xs">Trọng số %
          <input className="mt-1 min-h-11 w-full rounded border px-2" type="number" min="0.01" max="100" step="0.01" value={item.weightPercent} disabled={disabled} onChange={event => onEdit(path, { weightPercent: Number(event.target.value) })} />
        </label>
        {item.children.length === 0 && (
          <label className="text-xs">Điểm tối đa
            <input className="mt-1 min-h-11 w-full rounded border px-2" type="number" min="0.01" max="999999.99" step="0.01" value={item.maxScore ?? ''} disabled={disabled} onChange={event => onEdit(path, { maxScore: Number(event.target.value) })} />
          </label>
        )}
        <label className="text-xs">Chuẩn đầu ra (CLO / PLO)
          <input className="mt-1 min-h-11 w-full rounded border px-2" placeholder="Ví dụ: CLO-3" value={item.learningOutcome ?? ''} disabled={disabled} onChange={event => onEdit(path, { learningOutcome: event.target.value || null })} />
        </label>
        <label className="text-xs">Mô tả
          <input className="mt-1 min-h-11 w-full rounded border px-2" value={item.description ?? ''} disabled={disabled} onChange={event => onEdit(path, { description: event.target.value || null })} />
        </label>
        <label className="text-xs sm:col-span-2">Hướng dẫn minh chứng
          <textarea rows={2} className="mt-1 w-full rounded border p-2 text-xs" placeholder="Mô tả minh chứng sinh viên cần cung cấp..." value={item.evidenceGuidance ?? ''} disabled={disabled} onChange={event => onEdit(path, { evidenceGuidance: event.target.value || null })} />
        </label>
      </div>

      {item.children.length === 0 && (
        <div className="mt-3 rounded border border-hairline bg-card p-3">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-semibold text-ink">Các mức đánh giá (Rubric Levels)</h5>
            {!disabled && (
              <button
                type="button"
                className="text-xs font-semibold text-primary underline"
                onClick={() => {
                  const currentLevels = item.levels ?? []
                  const nextOrder = currentLevels.length + 1
                  const newLevel: RubricCriterionLevel = {
                    levelOrder: nextOrder,
                    label: `Mức ${nextOrder}`,
                    descriptor: '',
                    scoreFrom: null,
                    scoreTo: null,
                  }
                  onEdit(path, { levels: [...currentLevels, newLevel] })
                }}
              >
                + Thêm mức đánh giá
              </button>
            )}
          </div>
          {(item.levels ?? []).length === 0 ? (
            <p className="mt-1 text-xs text-ink-muted">Chưa có mức đánh giá chi tiết (bản nháp vẫn có thể lưu).</p>
          ) : (
            <div className="mt-2 space-y-2">
              {(item.levels ?? []).map((level, levelIdx) => (
                <div key={levelIdx} className="grid gap-2 rounded border border-hairline bg-canvas/50 p-2 sm:grid-cols-4 items-center">
                  <input
                    aria-label={`Tên mức ${levelIdx + 1}`}
                    className="rounded border px-2 py-1 text-xs"
                    placeholder="Tên mức (ví dụ: Xuất sắc)"
                    value={level.label}
                    disabled={disabled}
                    onChange={e => {
                      const next = [...(item.levels ?? [])]
                      next[levelIdx] = { ...level, label: e.target.value }
                      onEdit(path, { levels: next })
                    }}
                  />
                  <input
                    aria-label={`Mô tả mức ${levelIdx + 1}`}
                    className="rounded border px-2 py-1 text-xs sm:col-span-2"
                    placeholder="Mô tả chi tiết đạt được..."
                    value={level.descriptor}
                    disabled={disabled}
                    onChange={e => {
                      const next = [...(item.levels ?? [])]
                      next[levelIdx] = { ...level, descriptor: e.target.value }
                      onEdit(path, { levels: next })
                    }}
                  />
                  <div className="flex items-center gap-1">
                    <input
                      aria-label={`Điểm từ mức ${levelIdx + 1}`}
                      type="number"
                      step="0.1"
                      className="w-14 rounded border px-1 py-1 text-xs"
                      placeholder="Từ"
                      value={level.scoreFrom ?? ''}
                      disabled={disabled}
                      onChange={e => {
                        const next = [...(item.levels ?? [])]
                        next[levelIdx] = { ...level, scoreFrom: e.target.value ? Number(e.target.value) : null }
                        onEdit(path, { levels: next })
                      }}
                    />
                    <span>-</span>
                    <input
                      aria-label={`Điểm đến mức ${levelIdx + 1}`}
                      type="number"
                      step="0.1"
                      className="w-14 rounded border px-1 py-1 text-xs"
                      placeholder="Đến"
                      value={level.scoreTo ?? ''}
                      disabled={disabled}
                      onChange={e => {
                        const next = [...(item.levels ?? [])]
                        next[levelIdx] = { ...level, scoreTo: e.target.value ? Number(e.target.value) : null }
                        onEdit(path, { levels: next })
                      }}
                    />
                    {!disabled && (
                      <button
                        type="button"
                        className="ml-auto text-xs text-rose-600 hover:underline"
                        onClick={() => {
                          const next = (item.levels ?? []).filter((_, idx) => idx !== levelIdx).map((lvl, idx) => ({ ...lvl, levelOrder: idx + 1 }))
                          onEdit(path, { levels: next })
                        }}
                      >
                        Bỏ
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {item.children.length === 0 && (
        <label className="mt-2 flex items-center gap-2 text-xs">
          <input type="checkbox" checked={item.isRequired} disabled={disabled} onChange={event => onEdit(path, { isRequired: event.target.checked })} />
          Bắt buộc
        </label>
      )}
      {!disabled && (
        <div className="mt-2 flex gap-2">
          <button type="button" className="min-h-11 rounded border px-3 text-xs" onClick={() => onAddChild(path)}>Thêm tiêu chí con</button>
          <button type="button" className="min-h-11 rounded border border-rose-300 px-3 text-xs text-rose-700" onClick={() => onRemove(path)}>Bỏ</button>
        </div>
      )}
      {item.children.length > 0 && (
        <div className="mt-3 space-y-2 border-l-2 border-line-strong pl-3">
          {item.children.map((child, index) => <CriterionEditor key={index} item={child} path={[...path, index]} disabled={disabled} onEdit={onEdit} onAddChild={onAddChild} onRemove={onRemove} />)}
        </div>
      )}
    </div>
  )
}

function RubricReadView({ rubric, departments, semesters }: { rubric: Rubric; departments: Department[]; semesters: Semester[] }) {
  return <div className="rubric-read-view">
    <h3>{rubric.name}</h3>
    <dl className="rubric-read-scope">
      <div><dt>Bộ môn</dt><dd>{departments.find(item => item.id === rubric.departmentId)?.name ?? 'Chưa có thông tin'}</dd></div>
      <div><dt>Học kỳ</dt><dd>{semesters.find(item => item.id === rubric.academicSemesterId)?.name ?? 'Chưa có thông tin'}</dd></div>
      <div><dt>Chế độ đồ án</dt><dd>{rubric.projectMode === 'INTERDISCIPLINARY' ? 'Liên ngành' : rubric.projectMode === 'SINGLE_MAJOR' ? 'Đơn ngành' : 'Chung'}</dd></div>
      <div><dt>Giai đoạn</dt><dd>{rubric.evaluationStage ?? 'Chưa xác định'}</dd></div>
      <div><dt>Phạm vi</dt><dd>{rubric.evaluationScope ?? 'Chưa xác định'}</dd></div>
      <div><dt>Chuyên ngành</dt><dd>{rubric.majorId ? `Mã #${rubric.majorId}` : 'Chung'}</dd></div>
      <div><dt>Hiệu lực</dt><dd>{rubric.effectiveFrom ? `${rubric.effectiveFrom.slice(0, 10)} → ${rubric.effectiveTo ? rubric.effectiveTo.slice(0, 10) : 'vô thời hạn'}` : 'Chưa thiết lập'}</dd></div>
      <div><dt>Quyết định phê duyệt</dt><dd>{rubric.approvalReference || 'Chưa có'}</dd></div>
    </dl>
    {rubric.description && <p className="rubric-read-description">{rubric.description}</p>}
    <div className="rubric-criteria-title"><h3>Tiêu chí và trọng số</h3><span>{rubric.criteria.length} tiêu chí chính</span></div>
    <ol className="rubric-read-criteria">{rubric.criteria.map((item, index) => <CriterionReadView key={item.id} item={item} number={String(index + 1)} />)}</ol>
  </div>
}
function CriterionReadView({ item, number }: { item: RubricCriterion; number: string }) {
  return (
    <li>
      <div className="rubric-read-criterion">
        <span className="rubric-criterion-number">{number}</span>
        <div>
          <h4>{item.name} {item.criterionCode && <span className="font-mono text-xs text-ink-muted">({item.criterionCode})</span>}</h4>
          {item.learningOutcome && <p className="text-xs font-semibold text-primary">Chuẩn đầu ra: {item.learningOutcome}</p>}
          {item.description && <p>{item.description}</p>}
          {item.evidenceGuidance && <p className="text-xs italic text-ink-muted">Minh chứng: {item.evidenceGuidance}</p>}
          <div className="rubric-criterion-meta">
            {item.children.length === 0 && (
              <>
                <span>Điểm tối đa: {formatScore(item.maxScore)}</span>
                {item.isRequired && <span>Bắt buộc</span>}
              </>
            )}
          </div>
          {item.levels && item.levels.length > 0 && (
            <div className="mt-2 text-xs">
              <span className="font-semibold text-ink-muted">Mức đánh giá ({item.levels.length} mức):</span>
              <ul className="mt-1 list-disc pl-4 space-y-0.5">
                {item.levels.map(l => (
                  <li key={l.levelOrder}>
                    <strong>{l.label}</strong> ({l.scoreFrom ?? '?'} - {l.scoreTo ?? '?'} đ): {l.descriptor}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <strong className="rubric-criterion-weight">{formatPercent(item.weightPercent)}</strong>
      </div>
      {item.children.length > 0 && (
        <ol>
          {item.children.map((child, index) => <CriterionReadView key={child.id} item={child} number={number + '.' + (index + 1)} />)}
        </ol>
      )}
    </li>
  )
}
