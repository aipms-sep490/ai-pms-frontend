import { useCallback, useEffect, useState } from 'react'
import { httpGet, httpPost, HttpError } from '../../services/http/http-client'
import type { PagedResult, SemesterDto, ProjectPeriodDto, UserAccountDto } from '../../types/backend'
import type { Department } from '../academic/types/academic.types'
import { useAuthSession } from '../auth/context/useAuthSession'

type Doc = { id: number; title: string; documentType: string; departmentId: number | null; academicSemesterId: number | null; projectPeriodId: number | null; status: string; currentVersion: string; updatedAt: string }
type Version = { id: number; version: string; status: string; chunkCount: number; publishedAt: string | null }
const statusLabel: Record<string, string> = { DRAFT: 'Bản nháp', PUBLISHED: 'Đã công bố', RETIRED: 'Đã ngừng sử dụng' }
const field = 'mt-1 w-full rounded-lg border border-hairline bg-card p-3 text-sm text-ink'
const button = 'min-h-10 rounded-lg border border-hairline px-3 py-2 text-sm font-semibold text-ink disabled:opacity-50'

export function AcademicKnowledgeManagementPage() {
  const { session } = useAuthSession()
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
  const [ready, setReady] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    const data = await httpGet<PagedResult<Doc>>('/academic/knowledge-documents?page=1&pageSize=100')
    setDocs(data.items)
  }, [])
  useEffect(() => {
    let active = true
    Promise.all([load(), httpGet<Department[]>('/academic/departments'), httpGet<PagedResult<SemesterDto>>('/academic/semesters?page=1&pageSize=100'), httpGet<UserAccountDto>('/users/me/profile')])
      .then(([, deps, terms, profile]) => { if (active) { setDepartments(deps); setSemesters(terms.items); if (!admin) setDepartmentId(String(profile.departmentId ?? '')); setReady(true) } })
      .catch(() => { if (active) setError('Không tải được cấu hình kho tài liệu. Hãy kiểm tra quyền và thử lại.') })
    return () => { active = false }
  }, [admin, load])
  useEffect(() => {
    let active = true
    setPeriods([]); setPeriodId('')
    if (semesterId) void httpGet<PagedResult<ProjectPeriodDto>>(`/academic/project-periods?semesterId=${semesterId}&page=1&pageSize=100`).then(data => { if (active) setPeriods(data.items) }).catch(() => { if (active) setError('Không tải được đợt đồ án.') })
    return () => { active = false }
  }, [semesterId])
  const act = async (work: () => Promise<unknown>, success: string) => {
    if (busy) return
    setBusy(true); setError(null); setMessage(null)
    try { await work(); await load(); setMessage(success) }
    catch (reason) { setError(reason instanceof HttpError ? reason.message : 'Không thực hiện được thao tác. Hãy thử lại.') }
    finally { setBusy(false) }
  }
  const save = () => act(async () => {
    const data = { version, content, sourceFileName: null, effectiveFrom: from ? new Date(from).toISOString() : null, effectiveTo: to ? new Date(to).toISOString() : null, chunks: null }
    if (selected) await httpPost(`/academic/knowledge-documents/${selected.id}/versions`, data)
    else await httpPost('/academic/knowledge-documents', { ...data, title, documentType: type, departmentId: departmentId ? Number(departmentId) : null, academicSemesterId: semesterId ? Number(semesterId) : null, projectPeriodId: periodId ? Number(periodId) : null })
    setTitle(''); setContent(''); setSelected(null); setHistory(null)
  }, 'Đã lưu bản nháp. Kiểm tra nội dung rồi chọn Công bố bản nháp mới nhất.')
  const dep = departments.find(item => item.id === Number(departmentId))
  return <main className="workspace-page mx-auto max-w-5xl space-y-5 pb-12">
    <header><p className="font-mono text-xs font-semibold uppercase tracking-wide text-primary">Quản trị học vụ</p><h1 className="mt-1 font-heading text-2xl font-bold text-ink">Kho tài liệu cho trợ lý AI</h1><p className="mt-2 text-sm leading-6 text-ink-muted">Nhập nội dung text, lưu nháp rồi công bố. Chỉ phiên bản còn hiệu lực, đúng khoa và kỳ mới được dùng để trả lời. Tài liệu DEMO chỉ dùng kiểm thử.</p></header>
    {error && <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">{error}</p>}
    {message && <p role="status" className="rounded-lg border border-primary-subtle bg-primary-subtle p-3 text-sm text-ink">{message}</p>}
    <section className="rounded-xl border border-hairline bg-card p-5 shadow-xs"><h2 className="font-heading text-lg font-semibold text-ink">{selected ? `Phiên bản mới: ${selected.title}` : 'Tạo tài liệu'}</h2>
      <form onSubmit={event => { event.preventDefault(); void save() }} className="mt-4 space-y-3">
        {!selected && <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm text-ink">Tên tài liệu<input required maxLength={255} value={title} onChange={e => setTitle(e.target.value)} className={field} /></label>
          <label className="text-sm text-ink">Loại tài liệu<select value={type} onChange={e => setType(e.target.value)} className={field}><option value="PROCESS">Quy trình</option><option value="FORM">Biểu mẫu</option><option value="RUBRIC">Tiêu chí đánh giá</option><option value="DEADLINE">Hạn học vụ</option><option value="DEMO">Minh họa DEMO</option></select></label>
          <label className="text-sm text-ink">Phạm vi khoa<select disabled={!admin} value={departmentId} onChange={e => { setDepartmentId(e.target.value); setSemesterId('') }} className={field}>{admin && <option value="">Dùng chung trong trường theo kỳ</option>}{departments.filter(d => d.isActive && (admin || d.id === Number(departmentId))).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
          <label className="text-sm text-ink">Kỳ áp dụng<select required={!departmentId} value={semesterId} onChange={e => setSemesterId(e.target.value)} className={field}><option value="">{departmentId ? 'Mọi kỳ trong khoa' : 'Chọn kỳ để xác định trường'}</option>{semesters.filter(s => !dep || s.organizationId === dep.organizationId).map(s => <option key={s.id} value={s.id}>{s.name} · {s.organizationName}</option>)}</select></label>
          <label className="text-sm text-ink">Đợt đồ án<select disabled={!semesterId} value={periodId} onChange={e => setPeriodId(e.target.value)} className={field}><option value="">Mọi đợt trong kỳ</option>{periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        </div>}
        <div className="grid gap-3 md:grid-cols-3"><label className="text-sm text-ink">Phiên bản<input required maxLength={64} value={version} onChange={e => setVersion(e.target.value)} className={field} /></label><label className="text-sm text-ink">Hiệu lực từ<input type="datetime-local" value={from} onChange={e => setFrom(e.target.value)} className={field} /></label><label className="text-sm text-ink">Hết hiệu lực<input type="datetime-local" value={to} onChange={e => setTo(e.target.value)} className={field} /></label></div>
        <label className="block text-sm text-ink">Nội dung tài liệu<textarea required maxLength={100000} value={content} onChange={e => setContent(e.target.value)} rows={8} className={field} /></label>
        <div className="flex gap-2"><button disabled={busy || !ready || (!selected && !admin && !departmentId)} className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Đang xử lý…' : 'Lưu bản nháp'}</button>{selected && <button type="button" className={button} onClick={() => { setSelected(null); setContent('') }}>Hủy tạo phiên bản</button>}</div>
      </form></section>
    <section className="rounded-xl border border-hairline bg-card p-5 shadow-xs"><h2 className="font-heading text-lg font-semibold text-ink">Tài liệu trong phạm vi quản lý</h2>{docs.length === 0 ? <p className="mt-4 text-sm text-ink-muted">Chưa có tài liệu.</p> : <ul className="mt-3 divide-y divide-hairline">{docs.map(doc => <li key={doc.id} className="space-y-3 py-4"><div><p className="font-semibold text-ink">{doc.title}</p><p className="mt-1 text-xs text-ink-muted">{statusLabel[doc.status] ?? doc.status} · v{doc.currentVersion} · {departments.find(d => d.id === doc.departmentId)?.name ?? 'Dùng chung theo kỳ'}</p></div><div className="flex flex-wrap gap-2">
      <button disabled={busy} className={button} onClick={() => void act(async () => { const rows = await httpGet<Version[]>(`/academic/knowledge-documents/${doc.id}/history`); setHistory({ title: doc.title, rows }) }, 'Đã tải lịch sử phiên bản.')}>Lịch sử</button>
      {doc.status !== 'RETIRED' && <><button disabled={busy} className={button} onClick={() => { setSelected(doc); setVersion(''); setContent(''); setFrom(''); setTo(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Tạo phiên bản</button><button disabled={busy} className={button} onClick={() => void act(() => httpPost(`/academic/knowledge-documents/${doc.id}/publish`), 'Đã công bố bản nháp mới nhất.')}>Công bố bản nháp mới nhất</button><button disabled={busy} className={button} onClick={() => void act(() => httpPost(`/academic/knowledge-documents/${doc.id}/retire`), 'Đã ngừng sử dụng tài liệu.')}>Ngừng sử dụng</button></>}
      {doc.status === 'PUBLISHED' && <button disabled={busy} className={button} onClick={() => void act(() => httpPost(`/academic/knowledge-documents/${doc.id}/reindex`), 'Đã kiểm tra lại chỉ mục tài liệu.')}>Lập chỉ mục lại</button>}
    </div></li>)}</ul>}</section>
    {history && <section className="rounded-xl border border-hairline bg-card p-5"><h2 className="font-heading font-semibold text-ink">Lịch sử · {history.title}</h2><ul className="mt-3 space-y-2">{history.rows.map(row => <li key={row.id} className="text-sm text-ink-soft">v{row.version} · {statusLabel[row.status]} · {row.chunkCount} đoạn nguồn{row.publishedAt ? ` · Công bố ${new Date(row.publishedAt).toLocaleString('vi-VN')}` : ''}</li>)}</ul></section>}
  </main>
}