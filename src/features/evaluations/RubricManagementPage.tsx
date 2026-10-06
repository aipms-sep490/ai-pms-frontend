import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { getAcademicHierarchy } from '../academic/api/academic-api'
import { getSemesters } from '../academic/api/governance-api'
import type { Department } from '../academic/types/academic.types'
import type { Semester } from '../academic/types/governance.types'
import { useAuthSession } from '../auth/context/useAuthSession'
import { HttpError } from '../../services/http/http-client'
import * as api from './rubrics-api'
import type { CriterionInput, Rubric, RubricCriterion } from './rubrics-api'
import { Button } from '../../components/ui/Button'
import './rubric-management.css'

const newCriterion = (): CriterionInput => ({ name: '', description: null, weightPercent: 100, maxScore: 10, sortOrder: 0, isRequired: true, children: [] })
const rubricStatusLabel = (value: string) => ({ DRAFT: 'Bản nháp', PUBLISHED: 'Đã công bố', RETIRED: 'Ngừng sử dụng' }[value] ?? value)
const fromCriterion = (value: RubricCriterion): CriterionInput => ({ name: value.name, description: value.description, weightPercent: value.weightPercent, maxScore: value.maxScore, sortOrder: value.sortOrder, isRequired: value.isRequired, children: value.children.map(fromCriterion) })
const normalize = (items: CriterionInput[]): CriterionInput[] => items.map((item, index) => ({ ...item, sortOrder: index, children: normalize(item.children) }))
function editTree(items: CriterionInput[], path: number[], edit: (item: CriterionInput) => CriterionInput): CriterionInput[] {
  const [index, ...rest] = path
  return items.map((item, position) => position !== index ? item : rest.length ? { ...item, children: editTree(item.children, rest, edit) } : edit(item))
}
function removeTree(items: CriterionInput[], path: number[]): CriterionInput[] {
  const [index, ...rest] = path
  return rest.length ? items.map((item, position) => position !== index ? item : { ...item, children: removeTree(item.children, rest) }) : items.filter((_, position) => position !== index)
}

export function RubricManagementPage() {
  const { session } = useAuthSession()
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
    }).catch(() => { if (active) setError('Không thể tải khoa và học kỳ để tạo bộ tiêu chí.') })
    return () => { active = false }
  }, [session])

  const select = async (id: number) => {
    setLoading(true)
    try {
      const next = await api.getRubric(id)
      setSelected(next); setCreating(false); setCode(next.code); setName(next.name); setDescription(next.description ?? '')
      setDepartmentId(next.departmentId ?? 0); setSemesterId(next.academicSemesterId ?? 0)
      setCriteria(next.criteria.map(fromCriterion)); setError(null)
    } catch { setError('Không thể tải bộ tiêu chí này.') }
    finally { setLoading(false) }
  }
  const newDraft = () => { setCreating(true); setSelected(null); setCode(''); setName(''); setDescription(''); setCriteria([newCriterion()]); setDepartmentId(0); setSemesterId(0); setError(null) }
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
        ? 'Rubric hoặc phạm vi học vụ đã thay đổi. Dữ liệu mới đã được tải lại; hãy kiểm tra trước khi thao tác lại.'
        : reason instanceof HttpError && reason.status === 403 ? 'Hệ thống không cấp quyền thao tác bộ tiêu chí này.' : 'Không thể lưu bộ tiêu chí. Kiểm tra dữ liệu, trọng số và trạng thái học kỳ.')
    } finally { setBusy(false) }
  }
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim() || criteria.some(item => !item.name.trim())) { setError('Hãy nhập tên bộ tiêu chí và tiêu chí.'); return }
    const draft = { name: name.trim(), description: description.trim() || null, criteria: normalize(criteria) }
    if (creating) {
      if (!departmentId || !semesterId || !code.trim()) { setError('Chọn khoa, học kỳ và nhập mã bộ tiêu chí.'); return }
      void run(() => api.createRubric({ ...draft, departmentId, academicSemesterId: semesterId, code: code.trim() }))
    } else if (selected?.canEdit) void run(() => api.updateRubric(selected.id, draft, selected.concurrencyToken))
  }
  const act = (kind: 'publish' | 'retire' | 'clone' | 'delete') => {
    if (!selected) return
    if (kind === 'delete' && !window.confirm('Xóa bộ tiêu chí bản nháp chưa sử dụng?')) return
    if (kind === 'publish' && !window.confirm('Công bố phiên bản bộ tiêu chí này? Nội dung sẽ không thể sửa.')) return
    if (kind === 'retire' && !window.confirm('Ngừng sử dụng phiên bản bộ tiêu chí này cho phân công mới?')) return
    const cloneCode = kind === 'clone' ? window.prompt('Mã mới cho phiên bản bộ tiêu chí:')?.trim() : null
    if (kind === 'clone' && !cloneCode) return
    const operation = kind === 'publish' ? () => api.publishRubric(selected.id, selected.concurrencyToken)
      : kind === 'retire' ? () => api.retireRubric(selected.id, selected.concurrencyToken)
      : kind === 'clone' ? () => api.cloneRubric(selected.id, cloneCode!, selected.concurrencyToken)
      : () => api.deleteRubric(selected.id, selected.concurrencyToken)
    void run(operation)
  }

  return <WorkspacePage className="rubric-page space-y-5" title="Bộ tiêu chí đánh giá" eyebrow="Đánh giá đồ án" description="Quản lý tiêu chí, trọng số và các phiên bản dùng trong từng đợt đánh giá." action={<Button onClick={newDraft}>Tạo bộ tiêu chí</Button>}>
    {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error} <button type="button" className="font-semibold underline" onClick={() => void loadList()}>Tải lại</button></p>}
    <div className="grid gap-5 lg:grid-cols-[18rem_1fr]"><section className="rounded-xl border bg-white p-4"><h2 className="font-semibold">Danh sách</h2><label className="mt-3 block text-sm">Trạng thái<select className="mt-1 min-h-11 w-full rounded-lg border px-3" value={status} onChange={event => { setStatus(event.target.value); setPage(1) }}><option value="">Tất cả</option><option value="DRAFT">Bản nháp</option><option value="PUBLISHED">Đã công bố</option><option value="RETIRED">Ngừng sử dụng</option></select></label>{loading && <p role="status" className="mt-3 text-sm">Đang tải bộ tiêu chí…</p>}{!loading && rubrics.length === 0 && <p className="mt-3 text-sm text-slate-600">Chưa có bộ tiêu chí.</p>}<ul className="mt-3 space-y-2">{rubrics.map(item => <li key={item.id}><button type="button" className={`min-h-11 w-full rounded-lg border p-3 text-left text-sm ${selected?.id === item.id ? 'border-primary bg-primary-subtle' : 'border-slate-200'}`} onClick={() => void select(item.id)}><strong>{item.code}</strong> · v{item.version}<span className="block text-xs text-slate-600">{item.name} · {rubricStatusLabel(item.status)}</span></button></li>)}</ul>{total > 20 && <div className="mt-3 flex justify-between text-sm"><button type="button" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Trước</button><span>{page} / {Math.ceil(total / 20)}</span><button type="button" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(value => value + 1)}>Sau</button></div>}</section>
    <section className="rounded-xl border bg-white p-5">{!creating && !selected ? <p className="text-sm text-slate-600">Chọn bộ tiêu chí hoặc tạo bản nháp mới.</p> : <><div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-semibold">{creating ? 'Bản nháp mới' : `${selected?.code} · v${selected?.version}`}</h2>{selected && <p className="text-xs text-slate-600">{rubricStatusLabel(selected.status)} · {selected.canEdit ? 'Có thể sửa' : 'Chỉ đọc'}</p>}</div>{selected && <div className="flex flex-wrap gap-2">{selected.status === 'DRAFT' && <button type="button" disabled={busy} className="min-h-11 rounded-lg border px-3 text-xs font-semibold" onClick={() => act('publish')}>Công bố</button>}{selected.status === 'PUBLISHED' && <button type="button" disabled={busy} className="min-h-11 rounded-lg border px-3 text-xs font-semibold" onClick={() => act('retire')}>Ngừng dùng</button>}{selected.status !== 'DRAFT' && <button type="button" disabled={busy} className="min-h-11 rounded-lg border px-3 text-xs font-semibold" onClick={() => act('clone')}>Tạo phiên bản</button>}{selected.canEdit && <button type="button" disabled={busy} className="min-h-11 rounded-lg border border-rose-300 px-3 text-xs font-semibold text-rose-700" onClick={() => act('delete')}>Xóa bản nháp</button>}</div>}</div>
      <form onSubmit={save} className="mt-4 space-y-4"><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Khoa<select value={departmentId} onChange={event => { setDepartmentId(Number(event.target.value)); setSemesterId(0) }} disabled={!creating || busy} className="mt-1 min-h-11 w-full rounded-lg border px-3"><option value={0}>Chọn khoa</option>{departments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="text-sm">Học kỳ<select value={semesterId} onChange={event => setSemesterId(Number(event.target.value))} disabled={!creating || busy} className="mt-1 min-h-11 w-full rounded-lg border px-3"><option value={0}>Chọn học kỳ</option>{compatibleSemesters.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Mã bộ tiêu chí<input value={code} onChange={event => setCode(event.target.value)} disabled={!creating || busy} required className="mt-1 min-h-11 w-full rounded-lg border px-3" /></label><label className="text-sm">Tên bộ tiêu chí<input value={name} onChange={event => setName(event.target.value)} disabled={Boolean(selected && !selected.canEdit) || busy} required className="mt-1 min-h-11 w-full rounded-lg border px-3" /></label></div><label className="block text-sm">Mô tả<textarea value={description} onChange={event => setDescription(event.target.value)} disabled={Boolean(selected && !selected.canEdit) || busy} rows={2} className="mt-1 w-full rounded-lg border p-3" /></label><div><h3 className="font-semibold">Cây tiêu chí</h3><p className="mt-1 text-xs text-slate-600">Trọng số của các tiêu chí cùng cấp phải bằng 100% trước khi công bố.</p><div className="mt-3 space-y-3">{criteria.map((item, index) => <CriterionEditor key={index} item={item} path={[index]} disabled={Boolean(selected && !selected.canEdit) || busy} onEdit={(path, change) => setCriteria(current => editTree(current, path, node => ({ ...node, ...change })))} onAddChild={path => setCriteria(current => editTree(current, path, node => ({ ...node, maxScore: null, isRequired: false, children: [...node.children, newCriterion()] })))} onRemove={path => setCriteria(current => removeTree(current, path))} />)}</div>{(creating || selected?.canEdit) && <button type="button" className="mt-3 min-h-11 rounded-lg border px-3 text-sm" onClick={() => setCriteria(current => [...current, newCriterion()])}>Thêm tiêu chí gốc</button>}</div>{(creating || selected?.canEdit) && <Button type="submit" disabled={busy}>Lưu bản nháp</Button>}</form></>}</section></div>
  </WorkspacePage>
}

function CriterionEditor({ item, path, disabled, onEdit, onAddChild, onRemove }: {
  item: CriterionInput; path: number[]; disabled: boolean
  onEdit: (path: number[], change: Partial<CriterionInput>) => void
  onAddChild: (path: number[]) => void; onRemove: (path: number[]) => void
}) {
  return <div className="criterion-editor rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="grid gap-2 sm:grid-cols-2"><label className="text-xs">Tên tiêu chí<input className="mt-1 min-h-11 w-full rounded border px-2" value={item.name} disabled={disabled} onChange={event => onEdit(path, { name: event.target.value })} /></label><label className="text-xs">Trọng số %<input className="mt-1 min-h-11 w-full rounded border px-2" type="number" min="0.01" max="100" step="0.01" value={item.weightPercent} disabled={disabled} onChange={event => onEdit(path, { weightPercent: Number(event.target.value) })} /></label>{item.children.length === 0 && <label className="text-xs">Điểm tối đa<input className="mt-1 min-h-11 w-full rounded border px-2" type="number" min="0.01" step="0.01" value={item.maxScore ?? ''} disabled={disabled} onChange={event => onEdit(path, { maxScore: Number(event.target.value) })} /></label>}<label className="text-xs">Mô tả<input className="mt-1 min-h-11 w-full rounded border px-2" value={item.description ?? ''} disabled={disabled} onChange={event => onEdit(path, { description: event.target.value || null })} /></label></div>{item.children.length === 0 && <label className="mt-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={item.isRequired} disabled={disabled} onChange={event => onEdit(path, { isRequired: event.target.checked })} />Bắt buộc</label>}{!disabled && <div className="mt-2 flex gap-2"><button type="button" className="min-h-11 rounded border px-3 text-xs" onClick={() => onAddChild(path)}>Thêm tiêu chí con</button><button type="button" className="min-h-11 rounded border border-rose-300 px-3 text-xs text-rose-700" onClick={() => onRemove(path)}>Bỏ</button></div>}{item.children.length > 0 && <div className="mt-3 space-y-2 border-l-2 border-slate-300 pl-3">{item.children.map((child, index) => <CriterionEditor key={index} item={child} path={[...path, index]} disabled={disabled} onEdit={onEdit} onAddChild={onAddChild} onRemove={onRemove} />)}</div>}</div>
}
