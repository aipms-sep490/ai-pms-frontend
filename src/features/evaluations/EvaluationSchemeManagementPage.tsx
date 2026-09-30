import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProject } from '../../services/api/projects.api'
import { HttpError } from '../../services/http/http-client'
import type { ProjectDto } from '../../types/backend'
import * as schemesApi from '../../services/api/evaluations.api'
import type { EvaluationScheme, EvaluationScope } from './evaluation-types'
import { listRubrics, type Rubric } from './rubrics-api'
import { getProjectPeriods } from '../academic/api/governance-api'
import type { ProjectPeriod } from '../academic/types/governance.types'
import { useAuthSession } from '../auth/context/useAuthSession'

type DraftComponent = schemesApi.EvaluationSchemeComponentInput & { key: string }

const component = (scope: EvaluationScope = 'COMMON'): DraftComponent => ({
  key: crypto.randomUUID(), name: '', scope, majorId: null, rubricId: 0,
  projectWeightPercent: scope === 'INDIVIDUAL' ? 0 : 100,
  studentWeightPercent: 100, requiredEvaluators: 1,
})

const scopeLabel: Record<EvaluationScope, string> = {
  COMMON: 'Dùng chung cho toàn đồ án',
  MAJOR_SPECIFIC: 'Theo chuyên ngành',
  INDIVIDUAL: 'Theo cá nhân',
}

function errorMessage(reason: unknown, fallback: string) {
  if (reason instanceof HttpError) {
    if (reason.status === 403) return 'Backend không cấp quyền quản lý scheme đánh giá trong phạm vi đồ án này.'
    if (reason.status === 404) return 'Không tìm thấy đồ án, rubric, kỳ đánh giá hoặc scheme. Hãy tải lại dữ liệu.'
    if (reason.status === 409) return 'Dữ liệu nghiệp vụ đã thay đổi (roster, policy, rubric, package hoặc token). Dữ liệu mới đã được tải lại; hãy kiểm tra trước khi thao tác lại.'
    if (reason.status === 400) return reason.problem?.detail || 'Scheme không thỏa điều kiện nghiệp vụ do Backend kiểm tra.'
  }
  return fallback
}

function asDraft(scheme: EvaluationScheme): DraftComponent[] {
  return scheme.components.map(item => ({ ...item, key: String(item.id) }))
}

function validNumber(value: number, decimals: number) {
  return Number.isFinite(value) && Math.round(value * 10 ** decimals) === value * 10 ** decimals
}

export function EvaluationSchemeManagementPage() {
  const projectId = Number(useParams().projectId)
  const { session } = useAuthSession()
  const errorSummary = useRef<HTMLDivElement>(null)
  const [project, setProject] = useState<ProjectDto | null>(null)
  const [periods, setPeriods] = useState<ProjectPeriod[]>([])
  const [rubrics, setRubrics] = useState<Rubric[]>([])
  const [items, setItems] = useState<EvaluationScheme[]>([])
  const [selected, setSelected] = useState<EvaluationScheme | null>(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [periodId, setPeriodId] = useState(0)
  const [threshold, setThreshold] = useState(5)
  const [components, setComponents] = useState<DraftComponent[]>(() => [component()])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => { if (error) errorSummary.current?.focus() }, [error])

  const load = useCallback(async () => {
    if (!session || !Number.isInteger(projectId) || projectId < 1) {
      setError('Project ID không hợp lệ hoặc phiên đăng nhập chưa sẵn sàng.')
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [nextProject, schemeItems, periodPage, rubricPage] = await Promise.all([
        getProject(projectId), schemesApi.getEvaluationSchemes(projectId),
        getProjectPeriods(session.accessToken, { search: '', periodType: 'EVALUATION' }),
        listRubrics(1, 'PUBLISHED'),
      ])
      setProject(nextProject)
      setItems(schemeItems)
      setPeriods(periodPage.items.filter(item => item.periodType === 'EVALUATION'))
      setRubrics(rubricPage.items)
      setError(null)
    } catch (reason) {
      setError(errorMessage(reason, 'Không thể tải scheme đánh giá, rubric và kỳ đánh giá.'))
    } finally { setLoading(false) }
  }, [projectId, session])

  useEffect(() => { void load() }, [load])

  const majorIds = useMemo(() => new Set(project?.majors.map(item => item.majorId) ?? []), [project])
  const selectedPeriod = periods.find(item => item.id === periodId)
  const projectWeight = useMemo(() => components.reduce((sum, item) => sum + item.projectWeightPercent, 0), [components])
  const studentWeights = useMemo(() => (project?.majors ?? []).map(major => ({
    major,
    total: components.filter(item => item.scope === 'COMMON' || item.majorId === major.majorId).reduce((sum, item) => sum + item.studentWeightPercent, 0),
  })), [components, project])

  const choose = (scheme: EvaluationScheme) => {
    setSelected(scheme); setCreating(false); setName(scheme.name); setPeriodId(scheme.projectPeriodId)
    setThreshold(scheme.passThreshold); setComponents(asDraft(scheme)); setError(null); setNotice(null)
  }
  const startDraft = () => {
    setSelected(null); setCreating(true); setName(''); setPeriodId(0); setThreshold(5); setComponents([component()]); setError(null); setNotice(null)
  }
  const updateComponent = (key: string, patch: Partial<DraftComponent>) => setComponents(current => current.map(item => item.key === key ? { ...item, ...patch } : item))
  const changeScope = (key: string, scope: EvaluationScope) => setComponents(current => current.map(item => item.key !== key ? item : {
    ...item,
    scope,
    majorId: scope === 'COMMON' ? null : (project?.majors[0]?.majorId ?? null),
    projectWeightPercent: scope === 'INDIVIDUAL' ? 0 : item.projectWeightPercent,
  }))

  const validate = () => {
    const issues: string[] = []
    if (!name.trim() || name.trim().length > 200) issues.push('Nhập tên scheme từ 1 đến 200 ký tự.')
    if (!selectedPeriod || selectedPeriod.status !== 'ACTIVE') issues.push('Chọn kỳ EVALUATION đang ACTIVE.')
    if (threshold < 0 || threshold > 10 || !validNumber(threshold, 2)) issues.push('Ngưỡng đạt phải từ 0 đến 10 với tối đa 2 chữ số thập phân.')
    if (!components.length || components.length > 100) issues.push('Scheme cần từ 1 đến 100 component.')
    components.forEach((item, index) => {
      const row = index + 1
      if (!item.name.trim() || item.name.trim().length > 200) issues.push(`Component ${row} cần tên hợp lệ.`)
      if (!rubrics.some(rubric => rubric.id === item.rubricId)) issues.push(`Component ${row} phải dùng một rubric PUBLISHED Backend trả về.`)
      if (item.scope === 'COMMON' ? item.majorId !== null : item.majorId === null || !majorIds.has(item.majorId)) issues.push(`Component ${row} có scope/major không thuộc đồ án.`)
      if (item.requiredEvaluators < 1 || item.requiredEvaluators > 20 || !Number.isInteger(item.requiredEvaluators)) issues.push(`Component ${row} cần 1–20 evaluator.`)
      if (item.projectWeightPercent < 0 || item.projectWeightPercent > 100 || item.studentWeightPercent < 0 || item.studentWeightPercent > 100 || !validNumber(item.projectWeightPercent, 4) || !validNumber(item.studentWeightPercent, 4) || item.projectWeightPercent + item.studentWeightPercent === 0) issues.push(`Component ${row} có trọng số không hợp lệ.`)
      if (item.scope === 'INDIVIDUAL' && item.projectWeightPercent !== 0) issues.push(`Component ${row}: INDIVIDUAL không được đóng góp điểm project.`)
    })
    if (projectWeight !== 100) issues.push('Tổng trọng số điểm project phải đúng 100%.')
    studentWeights.filter(item => item.total !== 100).forEach(item => issues.push(`Tổng trọng số điểm student của ngành ${item.major.majorCode} phải đúng 100%.`))
    return issues
  }

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const issues = validate()
    if (issues.length) { setError(issues.join(' ')); return }
    const input: schemesApi.SaveEvaluationSchemeInput = {
      projectId, projectPeriodId: periodId, name: name.trim(), passThreshold: threshold,
      components: components.map(({ key: _key, ...item }) => ({ ...item, name: item.name.trim() })),
      ...(selected ? { concurrencyToken: selected.concurrencyToken } : {}),
    }
    void run(() => selected ? schemesApi.updateEvaluationScheme(selected.id, input) : schemesApi.createEvaluationScheme(input), selected ? 'Đã lưu thay đổi cho scheme draft.' : 'Đã tạo scheme draft.', true)
  }

  const run = async (operation: () => Promise<EvaluationScheme | void>, success: string, selectResult = false) => {
    setBusy(true); setError(null); setNotice(null)
    try {
      const result = await operation()
      await load()
      if (result && selectResult) choose(result)
      else if (selected) {
        const fresh = (await schemesApi.getEvaluationSchemes(projectId)).find(item => item.id === selected.id)
        if (fresh) choose(fresh)
      }
      setNotice(success)
    } catch (reason) {
      if (reason instanceof HttpError && reason.status === 409) await load()
      setError(errorMessage(reason, 'Không thể hoàn tất thao tác với scheme.'))
    } finally { setBusy(false) }
  }

  const publish = () => {
    if (!selected || !window.confirm('Công bố scheme sẽ đóng băng roster và policy version. Sau đó nội dung không thể sửa trực tiếp. Tiếp tục?')) return
    void run(() => schemesApi.publishEvaluationScheme(selected.id, selected.concurrencyToken), 'Đã công bố scheme và đóng băng snapshot nghiệp vụ.', true)
  }
  const version = () => {
    if (!selected) return
    void run(() => schemesApi.createEvaluationSchemeVersion(selected.id, selected.concurrencyToken), 'Đã tạo phiên bản draft mới từ scheme đã công bố.', true)
  }
  const remove = () => {
    if (!selected || !window.confirm('Xóa draft này? Thao tác không thể hoàn tác.')) return
    void run(() => schemesApi.deleteEvaluationScheme(selected.id, selected.concurrencyToken), 'Đã xóa scheme draft.'); setSelected(null); setCreating(false)
  }

  const editable = creating || selected?.status === 'DRAFT'
  return <main className="mx-auto max-w-7xl space-y-5 pb-12">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-bold text-slate-900">Scheme đánh giá</h1><p className="mt-1 max-w-3xl text-sm text-slate-600">Thiết kế thành phần chấm, phạm vi và trọng số trước khi phân công evaluator. Backend là nguồn quyết định cuối cùng về package lock, roster, policy và rubric.</p></div><div className="flex flex-wrap gap-2"><Link to={`/department/projects/${projectId}/evaluations`} className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Phân công evaluator</Link><button type="button" onClick={startDraft} className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90">Tạo scheme draft</button></div></header>
    {error && <div ref={errorSummary} tabIndex={-1} role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">{error} <button type="button" className="font-semibold underline" onClick={() => void load()}>Tải lại</button></div>}
    {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{notice}</p>}
    <div className="grid gap-5 xl:grid-cols-[20rem_1fr]">
      <section className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="font-semibold text-slate-900">Phiên bản của project</h2>{loading ? <p role="status" className="mt-3 text-sm text-slate-600">Đang tải scheme…</p> : items.length === 0 ? <p className="mt-3 text-sm text-slate-600">Chưa có scheme. Chỉ tạo draft khi final package và kỳ đánh giá đã sẵn sàng.</p> : <ul className="mt-3 space-y-2">{items.map(item => <li key={item.id}><button type="button" onClick={() => choose(item)} className={`min-h-11 w-full rounded-lg border p-3 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${selected?.id === item.id ? 'border-primary bg-primary/5' : 'border-slate-200 hover:bg-slate-50'}`}><strong>{item.name}</strong><span className="mt-1 block text-xs text-slate-600">v{item.version} · {item.status} · {item.components.length} component</span></button></li>)}</ul>}</section>
      <section className="rounded-xl border border-slate-200 bg-white p-5">{!creating && !selected ? <p className="text-sm text-slate-600">Chọn một scheme hoặc tạo draft mới. Scheme PUBLISHED là chỉ đọc; hãy tạo phiên bản để thay đổi.</p> : <form onSubmit={save} className="space-y-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-900">{creating ? 'Scheme draft mới' : `${selected?.name} · v${selected?.version}`}</h2>{selected && <p className="mt-1 text-xs text-slate-600">{selected.status} · {selected.policyVersionId ? `Policy snapshot #${selected.policyVersionId}` : 'Chưa có policy snapshot'}</p>}</div>{selected && <div className="flex flex-wrap gap-2">{selected.status === 'DRAFT' && <><button type="button" disabled={busy} onClick={publish} className="min-h-11 rounded-lg bg-primary px-3 text-sm font-semibold text-white disabled:opacity-50">Công bố & đóng băng</button><button type="button" disabled={busy} onClick={remove} className="min-h-11 rounded-lg border border-rose-300 px-3 text-sm font-semibold text-rose-700 disabled:opacity-50">Xóa draft</button></>}{selected.status !== 'DRAFT' && <button type="button" disabled={busy} onClick={version} className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 disabled:opacity-50">Tạo phiên bản</button>}</div>}</div>
        <div className="grid gap-3 md:grid-cols-3"><label className="text-sm font-medium text-slate-700">Tên scheme<input value={name} disabled={!editable || busy} onChange={event => setName(event.target.value)} required className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 disabled:bg-slate-100" /></label><label className="text-sm font-medium text-slate-700">Kỳ đánh giá<select value={periodId} disabled={!editable || busy} onChange={event => setPeriodId(Number(event.target.value))} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 disabled:bg-slate-100"><option value={0}>Chọn kỳ EVALUATION</option>{periods.map(item => <option key={item.id} value={item.id}>{item.name} · {item.status}</option>)}</select></label><label className="text-sm font-medium text-slate-700">Ngưỡng đạt (0–10)<input type="number" min="0" max="10" step="0.01" value={threshold} disabled={!editable || busy} onChange={event => setThreshold(Number(event.target.value))} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 disabled:bg-slate-100" /></label></div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"><strong>Kiểm tra trước khi lưu:</strong><span className={projectWeight === 100 ? 'ml-2 text-emerald-700' : 'ml-2 text-rose-700'}>Project: {projectWeight}% / 100%</span>{studentWeights.map(item => <span key={item.major.majorId} className={item.total === 100 ? 'ml-3 text-emerald-700' : 'ml-3 text-rose-700'}>Student {item.major.majorCode}: {item.total}% / 100%</span>)}<p className="mt-2 text-xs text-slate-600">`COMMON` không chọn major. `MAJOR_SPECIFIC` và `INDIVIDUAL` chỉ được chọn major thuộc project; `INDIVIDUAL` có project weight bằng 0.</p></div>
        <fieldset disabled={!editable || busy} className="space-y-3"><legend className="font-semibold text-slate-900">Components</legend>{components.map((item, index) => <div key={item.key} className="rounded-lg border border-slate-200 p-4"><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">Component {index + 1}</h3>{editable && components.length > 1 && <button type="button" onClick={() => setComponents(current => current.filter(row => row.key !== item.key))} className="min-h-11 text-sm font-semibold text-rose-700">Xóa</button>}</div><div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><label className="text-sm">Tên<input value={item.name} onChange={event => updateComponent(item.key, { name: event.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label><label className="text-sm">Phạm vi<select value={item.scope} onChange={event => changeScope(item.key, event.target.value as EvaluationScope)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3">{(Object.keys(scopeLabel) as EvaluationScope[]).map(scope => <option key={scope} value={scope}>{scopeLabel[scope]}</option>)}</select></label><label className="text-sm">Chuyên ngành<select value={item.majorId ?? ''} disabled={item.scope === 'COMMON'} onChange={event => updateComponent(item.key, { majorId: Number(event.target.value) || null })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 disabled:bg-slate-100"><option value="">Không áp dụng</option>{project?.majors.map(major => <option key={major.majorId} value={major.majorId}>{major.majorCode} · {major.majorName}</option>)}</select></label><label className="text-sm">Rubric published<select value={item.rubricId} onChange={event => updateComponent(item.key, { rubricId: Number(event.target.value) })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3"><option value={0}>Chọn rubric</option>{rubrics.map(rubric => <option key={rubric.id} value={rubric.id}>{rubric.code} · v{rubric.version}</option>)}</select></label><label className="text-sm">Project weight %<input type="number" min="0" max="100" step="0.0001" value={item.projectWeightPercent} disabled={item.scope === 'INDIVIDUAL'} onChange={event => updateComponent(item.key, { projectWeightPercent: Number(event.target.value) })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 disabled:bg-slate-100" /></label><label className="text-sm">Student weight %<input type="number" min="0" max="100" step="0.0001" value={item.studentWeightPercent} onChange={event => updateComponent(item.key, { studentWeightPercent: Number(event.target.value) })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label><label className="text-sm">Số evaluator<input type="number" min="1" max="20" step="1" value={item.requiredEvaluators} onChange={event => updateComponent(item.key, { requiredEvaluators: Number(event.target.value) })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label></div></div>)}</fieldset>
        {editable && <div className="flex flex-wrap gap-3"><button type="button" onClick={() => setComponents(current => [...current, component('COMMON')])} className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700">Thêm component</button><button type="submit" disabled={busy} className="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Đang lưu…' : 'Lưu draft'}</button></div>}
      </form>}</section>
    </div>
  </main>
}
