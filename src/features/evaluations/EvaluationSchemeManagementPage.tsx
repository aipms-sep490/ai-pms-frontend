import { useActionConfirmation } from '../../components/ui/useActionConfirmation'
import { ButtonLink } from '../../components/ui/ButtonLink'
import { displayLabel } from '../../components/ui/display-label'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { formatPercent } from '../../components/ui/format'
import { EvaluationSchemePolicySummary } from './EvaluationSchemePolicySummary'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { projectEvaluationPaths } from './project-evaluation-paths'
import { getProject } from '../../services/api/projects.api'
import { readAllPages } from '../../services/api/paged-read'
import { HttpError } from '../../services/http/http-client'
import type { ProjectDto } from '../../types/backend'
import * as schemesApi from '../../services/api/evaluations.api'
import type { EvaluationScheme, EvaluationScope } from './evaluation-types'
import { listRubrics, type Rubric } from './rubrics-api'
import { getProjectPeriods } from '../academic/api/governance-api'
import type { ProjectPeriod } from '../academic/types/governance.types'
import { useAuthSession } from '../auth/context/useAuthSession'
import { Button } from '../../components/ui/Button'
import { ResourcePermissionNotice } from '../../components/ui/ResourcePermissionNotice'
import { useProjectCapabilities } from '../capabilities/useProjectCapabilities'
import { SchemeConflictReview, type SchemeConflict } from './SchemeConflictReview'

type DraftComponent = schemesApi.EvaluationSchemeComponentInput & { key: string }

const component = (scope: EvaluationScope = 'COMMON'): DraftComponent => ({
  key: crypto.randomUUID(), name: '', scope, majorId: null, rubricId: 0,
  projectWeightPercent: 0,
  studentWeightPercent: 0, requiredEvaluators: 1,
})

const scopeLabel: Record<EvaluationScope, string> = {
  COMMON: 'Dùng chung cho toàn đồ án',
  MAJOR_SPECIFIC: 'Theo chuyên ngành',
  INDIVIDUAL: 'Theo cá nhân',
}

function errorMessage(reason: unknown, fallback: string) {
  if (reason instanceof HttpError) {
    if (reason.status === 403) return 'Hệ thống không cấp quyền quản lý phương án đánh giá trong phạm vi đồ án này.'
    if (reason.status === 404) return 'Không tìm thấy đồ án, bộ tiêu chí, kỳ đánh giá hoặc phương án đánh giá. Hãy tải lại dữ liệu.'
    if (reason.status === 409) return 'Dữ liệu đánh giá đã thay đổi. Thông tin mới đã được tải lại; hãy kiểm tra trước khi tiếp tục.'
    if (reason.status === 400) return reason.problem?.detail || 'phương án đánh giá không thỏa điều kiện nghiệp vụ do hệ thống kiểm tra.'
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
  return <EvaluationSchemeEditor key={projectId} projectId={projectId} />
}

function EvaluationSchemeEditor({ projectId }: { projectId: number }) {
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()
  const paths = projectEvaluationPaths(projectId, useLocation().pathname)
  const { session } = useAuthSession()
  const capabilities = useProjectCapabilities(projectId)
  const canManage = capabilities.can('manage_evaluation_scheme')
  const authority = useRef({ projectId, session, data: capabilities.data, allowed: false })
  useEffect(() => { authority.current = { projectId, session, data: capabilities.data, allowed: canManage } }, [projectId, session, capabilities.data, canManage])
  // A capability retry (fired after every mutation, per useProjectCapabilities' fail-closed design) briefly
  // clears the cached answer while it reconfirms. Hiding the management actions during that window — rather
  // than just disabling them — would unmount buttons mid-interaction for an authorized user. Show the last
  // confirmed answer while a reconfirmation is in flight; mutation guards below keep using the raw,
  // fail-closed `canManage`, so nothing becomes clickable before the server re-confirms access.
  const stableCanManage = useRef({ session, value: canManage })
  if (stableCanManage.current.session !== session) stableCanManage.current = { session, value: canManage }
  else if (!capabilities.loading) stableCanManage.current.value = canManage
  const displayCanManage = capabilities.loading ? stableCanManage.current.value : canManage
  const errorSummary = useRef<HTMLDivElement>(null)
  const [project, setProject] = useState<ProjectDto | null>(null)
  const [periods, setPeriods] = useState<ProjectPeriod[]>([])
  const [rubrics, setRubrics] = useState<Rubric[]>([])
  const [items, setItems] = useState<EvaluationScheme[]>([])
  const [selected, setSelected] = useState<EvaluationScheme | null>(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [periodId, setPeriodId] = useState(0)
  const [threshold, setThreshold] = useState<number | ''>('')
  const [components, setComponents] = useState<DraftComponent[]>(() => [component()])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [conflict, setConflict] = useState<SchemeConflict | null>(null)
  const conflicted = conflict !== null
  const mounted = useRef(true)
  const mutationLock = useRef(false)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  useEffect(() => { if (error) errorSummary.current?.focus() }, [error])

  const load = useCallback(async () => {
    if (!session || !Number.isInteger(projectId) || projectId < 1) {
      setError('đồ án ID không hợp lệ hoặc phiên đăng nhập chưa sẵn sàng.')
      setLoading(false)
      return
    }
    setLoading(true)
    setProject(null)
    try {
      const [nextProject, schemeItems, periodPage, rubricPage] = await Promise.all([
        getProject(projectId), schemesApi.getEvaluationSchemes(projectId),
        readAllPages(page => getProjectPeriods(session.accessToken, { search: '', periodType: 'EVALUATION' }, undefined, page)),
        readAllPages(page => listRubrics(page, 'PUBLISHED')),
      ])
      if (!mounted.current || authority.current.session !== session) return
      setProject(nextProject)
      setItems(schemeItems)
      setPeriods(periodPage.filter(item => item.periodType === 'EVALUATION'))
      setRubrics(rubricPage)
      setConflict(current => current ? { ...current, latest: schemeItems.find(item => item.id === current.schemeId) ?? null, loaded: true } : null)
      setError(null)
      return schemeItems
    } catch (reason) {
      if (!mounted.current || authority.current.session !== session) return
      setItems([])
      setPeriods([])
      setRubrics([])
      setConflict(current => current ? { ...current, loaded: false } : null)
      setError(errorMessage(reason, 'Không thể tải phương án đánh giá, bộ tiêu chí và kỳ đánh giá.'))
    } finally { if (mounted.current && authority.current.session === session) setLoading(false) }
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
    if (busy || loading) return
    setSelected(scheme); setCreating(false); setName(scheme.name); setPeriodId(scheme.projectPeriodId)
    setThreshold(scheme.passThreshold); setComponents(asDraft(scheme)); setError(null); setNotice(null); setConflict(null)
  }
  const startDraft = () => {
    if (!canManage || busy || loading || conflicted || !project) return
    setSelected(null); setCreating(true); setName(''); setPeriodId(0); setThreshold(''); setComponents([component()]); setError(null); setNotice(null); setConflict(null)
  }
  const useServer = () => {
    if (busy || loading || !conflict?.loaded) return
    if (conflict.latest) choose(conflict.latest)
    else { setSelected(null); setCreating(false); setConflict(null); setError(null) }
  }
  const keepDraft = () => {
    if (!canManage || busy || loading || !project || !conflict?.loaded || conflict.latest?.status !== 'DRAFT') return
    setSelected(conflict.latest); setConflict(null); setError(null)
    setNotice('Đã giữ nội dung bạn nhập với phiên bản hiện tại. Kiểm tra lại rồi lưu bản nháp khi sẵn sàng.')
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
    if (!name.trim() || name.trim().length > 200) issues.push('Nhập tên phương án đánh giá từ 1 đến 200 ký tự.')
    if (!selectedPeriod || selectedPeriod.status !== 'ACTIVE') issues.push('Chọn đợt đánh giá đang diễn ra.')
    if (threshold === '' || threshold < 0 || threshold > 10 || !validNumber(threshold, 2)) issues.push('Nhập ngưỡng đạt từ cấu hình đã được duyệt, từ 0 đến 10 với tối đa 2 chữ số thập phân.')
    if (!components.length || components.length > 100) issues.push('phương án đánh giá cần từ 1 đến 100 thành phần.')
    components.forEach((item, index) => {
      const row = index + 1
      if (!item.name.trim() || item.name.trim().length > 200) issues.push(`Thành phần ${row} cần tên hợp lệ.`)
      if (!rubrics.some(rubric => rubric.id === item.rubricId)) issues.push(`Thành phần ${row} cần chọn bộ tiêu chí đã công bố.`)
      if (item.scope === 'COMMON' ? item.majorId !== null : item.majorId === null || !majorIds.has(item.majorId)) issues.push(`Thành phần ${row} có phạm vi hoặc chuyên ngành không phù hợp với đồ án.`)
      if (item.requiredEvaluators < 1 || item.requiredEvaluators > 20 || !Number.isInteger(item.requiredEvaluators)) issues.push(`Thành phần ${row} cần 1–20 người chấm.`)
      if (item.projectWeightPercent < 0 || item.projectWeightPercent > 100 || item.studentWeightPercent < 0 || item.studentWeightPercent > 100 || !validNumber(item.projectWeightPercent, 4) || !validNumber(item.studentWeightPercent, 4) || (item.projectWeightPercent + item.studentWeightPercent === 0 && item.stage !== 'COLD')) issues.push(`Thành phần ${row} có trọng số không hợp lệ.`)
      if (item.scope === 'INDIVIDUAL' && item.projectWeightPercent !== 0) issues.push(`Thành phần ${row}: INDIVIDUAL không được đóng góp điểm project.`)
    })
    if (projectWeight !== 100) issues.push('Tổng trọng số điểm đồ án phải đúng 100%.')
    studentWeights.filter(item => item.total !== 100).forEach(item => issues.push(`Tổng trọng số điểm sinh viên của ngành ${item.major.majorCode} phải đúng 100%.`))
    return issues
  }

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canManage || (!creating && selected?.status !== 'DRAFT')) return
    if (busy || conflicted || loading || !project || threshold === '') { if (threshold === '') setError('Nhập ngưỡng đạt từ cấu hình đã được duyệt.'); return }
    const issues = validate()
    if (issues.length) { setError(issues.join(' ')); return }
    const input: schemesApi.SaveEvaluationSchemeInput = {
      projectId, projectPeriodId: periodId, name: name.trim(), passThreshold: threshold,
      components: components.map(({ key: _key, ...item }) => ({ ...item, name: item.name.trim() })),
      ...(selected ? { concurrencyToken: selected.concurrencyToken } : {}),
    }
    void run(() => selected ? schemesApi.updateEvaluationScheme(selected.id, input) : schemesApi.createEvaluationScheme(input), selected ? 'Đã lưu thay đổi cho phương án đánh giá bản nháp.' : 'Đã tạo phương án đánh giá bản nháp.', true)
  }

  const run = async (operation: () => Promise<EvaluationScheme | void>, success: string, selectResult = false) => {
    if (!mounted.current || !authority.current.allowed || authority.current.projectId !== projectId || authority.current.session !== session || authority.current.data !== capabilities.data || mutationLock.current || conflicted || loading || !project) return
    mutationLock.current = true
    setBusy(true); setError(null); setNotice(null)
    try {
      const result = await operation()
      if (!mounted.current || authority.current.session !== session) return
      capabilities.retry()
      const freshItems = await load()
      if (!mounted.current || authority.current.session !== session) return
      if (result && selectResult) {
        setSelected(result); setCreating(false); setName(result.name); setPeriodId(result.projectPeriodId)
        setThreshold(result.passThreshold); setComponents(asDraft(result)); setConflict(null)
      }
      else if (selected) {
        const fresh = freshItems?.find(item => item.id === selected.id)
        if (fresh) { setSelected(fresh); setName(fresh.name); setPeriodId(fresh.projectPeriodId); setThreshold(fresh.passThreshold); setComponents(asDraft(fresh)) }
        else if (freshItems) { setSelected(null); setCreating(false) }
      }
      setNotice(success)
    } catch (reason) {
      if (!mounted.current || authority.current.session !== session) return
      capabilities.retry()
      if (reason instanceof HttpError && reason.status === 409) {
        setConflict({ schemeId: selected?.id ?? null, latest: null, loaded: false, draft: { name, periodId, threshold, components } })
        const freshItems = await load()
        if (!mounted.current || authority.current.session !== session || !freshItems) return
      }
      setError(errorMessage(reason, 'Không thể hoàn tất thao tác với phương án đánh giá.'))
    } finally { mutationLock.current = false; if (mounted.current) setBusy(false) }
  }

  const publish = async () => {
    if (!canManage || !selected || selected.status !== 'DRAFT' || await requestConfirmation({ title: 'Công bố phương án đánh giá?', description: 'Cấu hình và danh sách thành viên sẽ được khóa để chấm. Thao tác này không phê duyệt học thuật hay công bố điểm chính thức. Muốn chỉnh sửa sau đó, hãy tạo phiên bản mới.', confirmLabel: 'Công bố phương án' }) === null) return
    void run(() => schemesApi.publishEvaluationScheme(selected.id, selected.concurrencyToken), 'Đã công bố phương án đánh giá và chốt thông tin áp dụng.', true)
  }
  const version = () => {
    if (!canManage || !selected || selected.status === 'DRAFT') return
    void run(() => schemesApi.createEvaluationSchemeVersion(selected.id, selected.concurrencyToken), 'Đã tạo phiên bản nháp mới ở chế độ minh họa; không kế thừa phê duyệt và thời điểm khóa của phiên bản cũ.', true)
  }
  const remove = async () => {
    if (!canManage || !selected || selected.status !== 'DRAFT' || await requestConfirmation({ title: 'Xóa bản nháp?', description: 'Bản nháp này sẽ bị xóa và không thể khôi phục.', confirmLabel: 'Xóa bản nháp', danger: true }) === null) return
    await run(() => schemesApi.deleteEvaluationScheme(selected.id, selected.concurrencyToken), 'Đã xóa phương án đánh giá bản nháp.')
  }

  const editable = canManage && !conflicted && project !== null && (creating || selected?.status === 'DRAFT')
  return <WorkspacePage className="space-y-5 evaluation-scheme-page academic-capability-page" title="Phương án đánh giá" eyebrow="Đánh giá đồ án" description="Thiết lập các thành phần, trọng số và ngưỡng đạt trước khi phân công người chấm." action={<><ButtonLink to={paths.evaluators}>Phân công người chấm</ButtonLink>{displayCanManage && <Button disabled={busy || loading || conflicted || !project || !canManage} onClick={startDraft} icon="add">Tạo bản nháp</Button>}</>}>
    
    {confirmationDialog}
    <ResourcePermissionNotice loading={capabilities.loading} error={capabilities.error} allowed={canManage} reason={capabilities.reasonLabel('manage_evaluation_scheme')} onRetry={capabilities.retry} />
    {conflict && <SchemeConflictReview conflict={conflict} periods={periods} rubrics={rubrics} project={project} busy={busy || loading} canManage={canManage} onReload={() => void load()} onUseServer={useServer} onKeepDraft={keepDraft} />}
    {error && <div ref={errorSummary} tabIndex={-1} role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-danger-text">{error} <button type="button" className="font-semibold underline" onClick={() => void load()}>Tải lại</button></div>}
    {notice && <p role="status" className="rounded-lg border border-status-success-border bg-status-success-bg p-4 text-sm text-status-success-text">{notice}</p>}
    <p className="workspace-note p-4 text-sm">Bản nháp cần ngưỡng đạt và trọng số từ quy định đã được duyệt. Việc công bố kỹ thuật không thay cho phê duyệt học thuật; không dùng tỷ lệ minh họa của tài liệu làm quy định chính thức.</p>
    <div className="workspace-master-detail">
      <section className="rounded-xl border border-hairline bg-card p-4"><h2 className="font-semibold text-ink">Phiên bản của đồ án</h2>{loading ? <p role="status" className="mt-3 text-sm text-ink-muted">Đang tải phương án đánh giá…</p> : items.length === 0 ? <p className="mt-3 text-sm text-ink-muted">Chưa có phương án đánh giá. Bạn có thể tạo bản nháp khi gói bàn giao và đợt đánh giá đã sẵn sàng.</p> : <ul className="mt-3 space-y-2">{items.map(item => <li key={item.id}><button type="button" disabled={busy || loading} onClick={() => choose(item)} className={`min-h-11 w-full rounded-lg border p-3 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${selected?.id === item.id ? 'border-primary bg-primary/5' : 'border-hairline hover:bg-canvas'}`}><strong>{item.name}</strong><span className="mt-1 block text-xs text-ink-muted">v{item.version} · {displayLabel(item.status)} · {item.components.length} thành phần</span></button></li>)}</ul>}</section>
      <section className="rounded-xl border border-hairline bg-card p-5">{!creating && !selected ? <div className="workspace-empty-detail"><span className="material-symbols-outlined" aria-hidden="true">schema</span><h2>Thiết lập phương án đánh giá</h2><p>Chọn phiên bản để xem, hoặc tạo bản nháp với các thành phần và trọng số của đợt đánh giá.</p>{displayCanManage && <Button variant="secondary" disabled={busy || loading || conflicted || !project || !canManage} onClick={startDraft}>Tạo bản nháp</Button>}</div> : <form onSubmit={save} className="space-y-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-ink">{creating ? 'Bản nháp phương án đánh giá mới' : `${selected?.name} · v${selected?.version}`}</h2>{selected && <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted"><StatusBadge status={selected.status} /> <span>{selected.policyVersionId ? `Chính sách kỳ đánh giá #${selected.policyVersionId}` : 'Chưa chốt chính sách áp dụng'}</span></p>}{selected && (selected.status ?? '').toUpperCase() === 'PROPOSED' && <p role="note" className="mt-2 rounded-lg border border-status-warning-border bg-status-warning-bg p-2 text-xs text-status-warning-text">Phương án này mới là đề xuất, chưa được bộ môn phê duyệt. Khóa cấu hình để chấm không thay cho phê duyệt học thuật; hệ thống kiểm tra riêng điều kiện công bố điểm chính thức.</p>}</div>{selected && displayCanManage && <div className="flex flex-wrap gap-2">{selected.status === 'DRAFT' && <><Button disabled={busy || conflicted || !project || !canManage} onClick={publish} icon="lock">Công bố phương án</Button><Button variant="danger" disabled={busy || conflicted || !project || !canManage} onClick={remove} icon="delete">Xóa bản nháp</Button></>}{selected.status !== 'DRAFT' && <Button variant="secondary" disabled={busy || conflicted || !project || !canManage} onClick={version} icon="content_copy">Tạo phiên bản</Button>}</div>}</div>
        {selected && <EvaluationSchemePolicySummary scheme={selected} />}{creating && <p className="workspace-note p-4 text-sm">Bản nháp mới được hệ thống lưu ở chế độ minh họa khi chưa có chính sách phê duyệt riêng.</p>}
        <div className="grid gap-3 md:grid-cols-3"><label className="text-sm font-medium text-ink-soft">Tên phương án đánh giá<input value={name} disabled={!editable || busy} onChange={event => setName(event.target.value)} required className="mt-1 min-h-11 w-full rounded-lg border border-line-strong px-3 disabled:bg-slate-100" /></label><label className="text-sm font-medium text-ink-soft">Kỳ đánh giá<select value={periodId} disabled={!editable || busy} onChange={event => setPeriodId(Number(event.target.value))} className="mt-1 min-h-11 w-full rounded-lg border border-line-strong px-3 disabled:bg-slate-100"><option value={0}>Chọn đợt đánh giá</option>{periods.map(item => <option key={item.id} value={item.id}>{item.name} · {displayLabel(item.status)}</option>)}</select></label><label className="text-sm font-medium text-ink-soft">Ngưỡng đạt (0–10)<input type="number" min="0" max="10" step="0.01" value={threshold} disabled={!editable || busy} onChange={event => setThreshold(event.target.value === '' ? '' : Number(event.target.value))} required className="mt-1 min-h-11 w-full rounded-lg border border-line-strong px-3 disabled:bg-slate-100" /></label></div>
        <div className="workspace-note py-4 text-sm text-ink-soft">
          <strong>Kiểm tra trước khi lưu:</strong>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge tone={projectWeight === 100 ? 'success' : 'danger'} label={`Điểm đồ án: ${formatPercent(projectWeight)} / 100%`} />
            {studentWeights.map(item => <StatusBadge key={item.major.majorId} tone={item.total === 100 ? 'success' : 'danger'} label={`Sinh viên ${item.major.majorCode}: ${formatPercent(item.total)} / 100%`} />)}
          </div>
          <p className="mt-2 text-xs text-ink-muted">Thành phần chung áp dụng cho cả đồ án. Thành phần theo ngành hoặc sinh viên chỉ áp dụng cho ngành tham gia; điểm cá nhân không đóng góp vào điểm đồ án.</p>
        </div>
        <fieldset disabled={!editable || busy} className="space-y-3"><legend className="font-semibold text-ink">Các thành phần đánh giá</legend>{components.map((item, index) => <div key={item.key} className="workspace-editor-row"><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">Thành phần {index + 1}</h3>{editable && components.length > 1 && <Button variant="danger" size="sm" onClick={() => setComponents(current => current.filter(row => row.key !== item.key))}>Xóa</Button>}</div><div className="mt-3 grid gap-3 md:grid-cols-2"><label className="text-sm">Tên<input value={item.name} onChange={event => updateComponent(item.key, { name: event.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-line-strong px-3" /></label><label className="text-sm">Phạm vi<select value={item.scope} onChange={event => changeScope(item.key, event.target.value as EvaluationScope)} className="mt-1 min-h-11 w-full rounded-lg border border-line-strong px-3">{(Object.keys(scopeLabel) as EvaluationScope[]).map(scope => <option key={scope} value={scope}>{scopeLabel[scope]}</option>)}</select></label><label className="text-sm">Chuyên ngành<select value={item.majorId ?? ''} disabled={item.scope === 'COMMON'} onChange={event => updateComponent(item.key, { majorId: Number(event.target.value) || null })} className="mt-1 min-h-11 w-full rounded-lg border border-line-strong px-3 disabled:bg-slate-100"><option value="">Không áp dụng</option>{project?.majors.map(major => <option key={major.majorId} value={major.majorId}>{major.majorCode} · {major.majorName}</option>)}</select></label><label className="text-sm">Bộ tiêu chí đã công bố<select value={item.rubricId} onChange={event => updateComponent(item.key, { rubricId: Number(event.target.value) })} className="mt-1 min-h-11 w-full rounded-lg border border-line-strong px-3"><option value={0}>Chọn bộ tiêu chí</option>{rubrics.map(rubric => <option key={rubric.id} value={rubric.id}>{rubric.code} · v{rubric.version}</option>)}</select></label><label className="text-sm">Trọng số điểm đồ án (%)<input type="number" min="0" max="100" step="0.0001" value={item.projectWeightPercent} disabled={item.scope === 'INDIVIDUAL'} onChange={event => updateComponent(item.key, { projectWeightPercent: Number(event.target.value) })} className="mt-1 min-h-11 w-full rounded-lg border border-line-strong px-3 disabled:bg-slate-100" /></label><label className="text-sm">Trọng số điểm sinh viên (%)<input type="number" min="0" max="100" step="0.0001" value={item.studentWeightPercent} onChange={event => updateComponent(item.key, { studentWeightPercent: Number(event.target.value) })} className="mt-1 min-h-11 w-full rounded-lg border border-line-strong px-3" /></label><label className="text-sm">Số người chấm<input type="number" min="1" max="20" step="1" value={item.requiredEvaluators} onChange={event => updateComponent(item.key, { requiredEvaluators: Number(event.target.value) })} className="mt-1 min-h-11 w-full rounded-lg border border-line-strong px-3" /></label></div></div>)}</fieldset>
        {displayCanManage && (creating || selected?.status === 'DRAFT') && <div className="flex flex-wrap gap-3"><Button variant="secondary" disabled={!editable || busy || loading} onClick={() => setComponents(current => [...current, component('COMMON')])} icon="add">Thêm thành phần</Button><Button type="submit" disabled={!editable || busy || loading}>{busy ? 'Đang lưu…' : 'Lưu bản nháp'}</Button>{creating && <Button variant="secondary" disabled={busy} onClick={() => setCreating(false)}>Hủy tạo mới</Button>}</div>}
      </form>}</section>
    </div>
  </WorkspacePage>
}
