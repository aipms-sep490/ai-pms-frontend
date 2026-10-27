import { useCallback, useEffect, useRef, useState } from 'react'
import type { SemesterDto, ProjectPeriodDto } from '../../types/backend'
import type { KnowledgeDocument as Doc, KnowledgeVersion as Version } from '../../types/backend/academic-knowledge.backend.types'
import { getMyProfile } from '../../services/api/auth.api'
import { readAllPages } from '../../services/api/paged-read'
import { getSemesters, getProjectPeriods } from '../academic/api/governance-api'
import * as knowledge from './academic-knowledge-api'
import type { Department } from '../academic/types/academic.types'
import { useAuthSession } from '../auth/context/useAuthSession'
import { useActionConfirmation } from '../../components/ui/useActionConfirmation'
import { dateTimeLabel, toUtcDateTime } from '../execution/execution-utils'

const statusLabel: Record<string, string> = { DRAFT: 'Bản nháp', PUBLISHED: 'Đã công bố', RETIRED: 'Đã ngừng sử dụng' }
const field = 'mt-1 w-full rounded-lg border border-hairline bg-card p-3 text-sm text-ink'
const button = 'min-h-10 rounded-lg border border-hairline px-3 py-2 text-sm font-semibold text-ink disabled:opacity-50'

export function AcademicKnowledgeManagementPage() {
  const { session } = useAuthSession()
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()
  const inFlight = useRef(false)
  const admin = session?.user.roles.includes('ADMIN') ?? false
  const [docs, setDocs] = useState<Doc[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [semesters, setSemesters] = useState<SemesterDto[]>([])
  const [periods, setPeriods] = useState<ProjectPeriodDto[]>([])
  const [departmentId, setDepartmentId] = useState('')
  const [semesterId, setSemesterId] = useState('')
  const [periodId, setPeriodId] = useState('')
  const [title, setTitle] = useState('')
  const [type, setType] = useState('PROCESS')
  const [version, setVersion] = useState('2026.1')
  const [content, setContent] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [selected, setSelected] = useState<Doc | null>(null)
  const [history, setHistory] = useState<{ title: string; rows: Version[] } | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<knowledge.KnowledgeFailure | null>(null)
  const [reload, setReload] = useState(0)
  const [readyFor, setReadyFor] = useState<{ reload: number; token?: string; admin: boolean } | null>(null)
  const ready = readyFor?.reload === reload && readyFor?.token === session?.accessToken && readyFor?.admin === admin
  const load = useCallback(async () => {
    setDocs(await readAllPages(page => knowledge.listKnowledgeDocuments(page)))
  }, [])
  useEffect(() => {
    let active = true
    Promise.all([readAllPages(page => knowledge.listKnowledgeDocuments(page)), readAllPages(knowledge.listAcademicDepartments), readAllPages(page => getSemesters(session?.accessToken ?? '', { search: '' }, undefined, page)), getMyProfile()])
      .then(([documents, deps, terms, profile]) => { if (active) { setDocs(documents); setDepartments(deps); setSemesters(terms); if (!admin) setDepartmentId(String(profile.departmentId ?? '')); setError(null); setReadyFor({ reload, token: session?.accessToken, admin }) } })
      .catch(reason => { if (active) setError(knowledge.knowledgeFailure(reason)) })
    return () => { active = false }
  }, [admin, reload, session?.accessToken])
  useEffect(() => {
    let active = true
    setPeriods([]); setPeriodId('')
    if (semesterId) void readAllPages(page => getProjectPeriods(session?.accessToken ?? '', { search: '', semesterId: Number(semesterId) }, undefined, page)).then(data => { if (active) setPeriods(data) }).catch(reason => { if (active) setError(knowledge.knowledgeFailure(reason)) })
    return () => { active = false }
  }, [semesterId, session?.accessToken])
  const act = async (work: () => Promise<unknown>, success: string, action = 'save') => {
    if (inFlight.current || !ready) return
    inFlight.current = true
    setBusy(true); setError(null); setMessage(null)
    try { await work(); setMessage(success); await load() }
    catch (reason) { setError(knowledge.knowledgeFailure(reason, action)) }
    finally { inFlight.current = false; setBusy(false) }
  }
  const save = () => {
    let effectiveFrom: string | null, effectiveTo: string | null
    try { effectiveFrom = toUtcDateTime(from); effectiveTo = toUtcDateTime(to) }
    catch { setError({ message: 'Thời điểm hiệu lực chưa hợp lệ. Kiểm tra giờ Việt Nam đã nhập.', retryable: false }); return }
    if (effectiveFrom && effectiveTo && effectiveFrom >= effectiveTo) {
      setError({ message: 'Hết hiệu lực phải sau thời điểm bắt đầu hiệu lực (giờ Việt Nam).', retryable: false }); return
    }
    return act(async () => {
    const data = { version, content, sourceFileName: null, effectiveFrom, effectiveTo, chunks: null }
    if (selected) await knowledge.createKnowledgeVersion(selected.id, data)
    else await knowledge.createKnowledgeDocument({ ...data, title, documentType: type, departmentId: departmentId ? Number(departmentId) : null, academicSemesterId: semesterId ? Number(semesterId) : null, projectPeriodId: periodId ? Number(periodId) : null })
    setTitle(''); setContent(''); setSelected(null); setHistory(null)
    }, 'Đã lưu bản nháp. Kiểm tra nội dung rồi chọn Công bố bản nháp mới nhất.')
  }
  const transition = async (doc: Doc, action: 'publish' | 'retire') => {
    if (!ready || inFlight.current) return
    if (await requestConfirmation({
      title: action === 'publish' ? 'Công bố tài liệu này?' : 'Ngừng sử dụng tài liệu này?',
      description: action === 'publish'
        ? `Công bố bản nháp mới nhất của "${doc.title}". Bản đang hiệu lực sẽ bị thu hồi; trợ lý AI sẽ dùng nội dung mới khi phù hợp phạm vi và thời gian hiệu lực.`
        : `Ngừng sử dụng "${doc.title}". Tài liệu sẽ không còn được dùng làm nguồn trả lời của trợ lý AI.`,
      confirmLabel: action === 'publish' ? 'Xác nhận công bố' : 'Xác nhận ngừng sử dụng',
      danger: action === 'retire',
    }) === null) return
    await act(() => action === 'publish' ? knowledge.publishKnowledgeDocument(doc.id) : knowledge.retireKnowledgeDocument(doc.id), action === 'publish' ? 'Đã công bố bản nháp mới nhất.' : 'Đã ngừng sử dụng tài liệu.', action)
  }
  const invalid = (name: keyof NonNullable<knowledge.KnowledgeFailure['fields']>) => ({ 'aria-invalid': error?.fields?.[name] ? true : undefined, 'aria-describedby': error?.fields?.[name] ? `knowledge-${name}-error` : undefined })
  const fieldError = (name: keyof NonNullable<knowledge.KnowledgeFailure['fields']>) => error?.fields?.[name] && <span id={`knowledge-${name}-error`} className="mt-1 block text-sm text-status-error-text">{error.fields[name]}</span>
  const dep = departments.find(item => item.id === Number(departmentId))
  return <main className="workspace-page mx-auto max-w-5xl space-y-5 pb-12">
    <header><p className="font-mono text-xs font-semibold uppercase tracking-wide text-primary">Quản trị học vụ</p><h1 className="mt-1 font-heading text-2xl font-bold text-ink">Kho tài liệu cho trợ lý AI</h1><p className="mt-2 text-sm leading-6 text-ink-muted">Nhập nội dung text, lưu nháp rồi công bố. Chỉ phiên bản còn hiệu lực, đúng khoa và kỳ mới được dùng để trả lời. Tài liệu DEMO chỉ dùng kiểm thử.</p></header>
    {error && <div role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text"><p>{error.message}</p>{error.retryable && <button type="button" disabled={busy} className={button} onClick={() => setReload(value => value + 1)}>Thử tải lại danh sách</button>}</div>}
    {message && <p role="status" className="rounded-lg border border-primary-subtle bg-primary-subtle p-3 text-sm text-ink">{message}</p>}
    <section className="rounded-xl border border-hairline bg-card p-5 shadow-xs"><h2 className="font-heading text-lg font-semibold text-ink">{selected ? `Phiên bản mới: ${selected.title}` : 'Tạo tài liệu'}</h2>
      <form onSubmit={event => { event.preventDefault(); void save() }} className="mt-4 space-y-3">
        <fieldset disabled={busy || !ready} className="min-w-0 space-y-3">
        {!selected && <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm text-ink">Tên tài liệu<input aria-label="Tên tài liệu" {...invalid('title')} required maxLength={255} value={title} onChange={e => setTitle(e.target.value)} className={field} />{fieldError('title')}</label>
          <label className="text-sm text-ink">Loại tài liệu<select value={type} onChange={e => setType(e.target.value)} className={field}><option value="PROCESS">Quy trình</option><option value="FORM">Biểu mẫu</option><option value="RUBRIC">Tiêu chí đánh giá</option><option value="DEADLINE">Hạn học vụ</option><option value="DEMO">Minh họa DEMO</option></select></label>
          <label className="text-sm text-ink">Phạm vi khoa<select disabled={!admin} value={departmentId} onChange={e => { setDepartmentId(e.target.value); setSemesterId('') }} className={field}>{admin && <option value="">Dùng chung trong trường theo kỳ</option>}{departments.filter(d => d.isActive && (admin || d.id === Number(departmentId))).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
          <label className="text-sm text-ink">Kỳ áp dụng<select required={!departmentId} value={semesterId} onChange={e => setSemesterId(e.target.value)} className={field}><option value="">{departmentId ? 'Mọi kỳ trong khoa' : 'Chọn kỳ để xác định trường'}</option>{semesters.filter(s => !dep || s.organizationId === dep.organizationId).map(s => <option key={s.id} value={s.id}>{s.name} · {s.organizationName}</option>)}</select></label>
          <label className="text-sm text-ink">Đợt đồ án<select disabled={!semesterId} value={periodId} onChange={e => setPeriodId(e.target.value)} className={field}><option value="">Mọi đợt trong kỳ</option>{periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        </div>}
        <div className="grid gap-3 md:grid-cols-3"><label className="text-sm text-ink">Phiên bản<input aria-label="Phiên bản" {...invalid('version')} required maxLength={64} value={version} onChange={e => setVersion(e.target.value)} className={field} />{fieldError('version')}</label><label className="text-sm text-ink">Hiệu lực từ (giờ Việt Nam)<input aria-label="Hiệu lực từ (giờ Việt Nam)" {...invalid('effectiveFrom')} type="datetime-local" value={from} onChange={e => setFrom(e.target.value)} className={field} />{fieldError('effectiveFrom')}</label><label className="text-sm text-ink">Hết hiệu lực (giờ Việt Nam)<input aria-label="Hết hiệu lực (giờ Việt Nam)" {...invalid('effectiveTo')} type="datetime-local" value={to} onChange={e => setTo(e.target.value)} className={field} />{fieldError('effectiveTo')}</label></div>
        <label className="block text-sm text-ink">Nội dung tài liệu<textarea aria-label="Nội dung tài liệu" {...invalid('content')} required maxLength={100000} value={content} onChange={e => setContent(e.target.value)} rows={8} className={field} />{fieldError('content')}</label>
        <div className="flex gap-2"><button disabled={busy || !ready || (!selected && !admin && !departmentId)} className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Đang xử lý…' : 'Lưu bản nháp'}</button>{selected && <button type="button" className={button} onClick={() => { setSelected(null); setContent('') }}>Hủy tạo phiên bản</button>}</div>
        </fieldset>
      </form></section>
    <section className="rounded-xl border border-hairline bg-card p-5 shadow-xs"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-heading text-lg font-semibold text-ink">Tài liệu trong phạm vi quản lý</h2><button type="button" disabled={busy} className={button} onClick={() => setReload(value => value + 1)}>Tải lại danh sách</button></div>{!ready ? <p role="status" className="mt-4 text-sm text-ink-muted">{error ? 'Chưa tải được dữ liệu quản lý.' : 'Đang tải dữ liệu quản lý…'}</p> : docs.length === 0 ? <p className="mt-4 text-sm text-ink-muted">Chưa có tài liệu.</p> : <ul className="mt-3 divide-y divide-hairline">{docs.map(doc => <li key={doc.id} className="space-y-3 py-4"><div><p className="break-words font-semibold text-ink">{doc.title}</p><p className="mt-1 text-xs text-ink-muted">{statusLabel[doc.status] ?? 'Trạng thái chưa xác định'} · v{doc.currentVersion} · {departments.find(d => d.id === doc.departmentId)?.name ?? 'Dùng chung theo kỳ'}</p></div><div className="flex flex-wrap gap-2">
      <button disabled={busy} className={button} onClick={() => void act(async () => { const rows = await knowledge.getKnowledgeHistory(doc.id); setHistory({ title: doc.title, rows }) }, 'Đã tải lịch sử phiên bản.', 'history')}>Lịch sử</button>
      {['DRAFT', 'PUBLISHED'].includes(doc.status) && <><button disabled={busy} className={button} onClick={() => { setSelected(doc); setVersion(''); setContent(''); setFrom(''); setTo(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Tạo phiên bản</button><button disabled={busy} className={button} onClick={() => void transition(doc, 'publish')}>Công bố bản nháp mới nhất</button><button disabled={busy} className={button} onClick={() => void transition(doc, 'retire')}>Ngừng sử dụng</button></>}
      {doc.status === 'PUBLISHED' && <button disabled={busy} className={button} onClick={() => void act(() => knowledge.reindexKnowledgeDocument(doc.id), 'Đã kiểm tra lại chỉ mục tài liệu.', 'reindex')}>Lập chỉ mục lại</button>}
    </div></li>)}</ul>}</section>
    {history && <section className="rounded-xl border border-hairline bg-card p-5"><h2 className="font-heading font-semibold text-ink">Lịch sử · {history.title}</h2><ul className="mt-3 space-y-2">{history.rows.map(row => <li key={row.id} className="text-sm text-ink-soft">v{row.version} · {statusLabel[row.status] ?? 'Trạng thái chưa xác định'} · {row.chunkCount} đoạn nguồn{row.publishedAt ? ` · Công bố ${dateTimeLabel(row.publishedAt)} (giờ Việt Nam)` : ''}</li>)}</ul></section>}
    {confirmationDialog}
  </main>
}
