import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SemesterDto, ProjectPeriodDto } from '../../types/backend'
import type { KnowledgeDocument as Doc, KnowledgeVersion as Version } from '../../types/backend/academic-knowledge.backend.types'
import { getMyProfile } from '../../services/api/auth.api'
import { readAllPages } from '../../services/api/paged-read'
import { getSemesters, getProjectPeriods } from '../academic/api/governance-api'
import * as knowledge from './academic-knowledge-api'
import type { Department } from '../academic/types/academic.types'
import { useAuthSession } from '../auth/context/useAuthSession'
import { useActionConfirmation } from '../../components/ui/useActionConfirmation'
import { ConfigModeFrame } from '../../components/ui/ConfigModeFrame'
import { Pagination } from '../../components/ui/Pagination'
import { StatTileRow } from '../../components/ui/StatTileRow'
import { StatusBadge } from '../../components/ui/StatusBadge'
import type { BadgeTone } from '../../components/ui/status-badge-tone'
import { useClientPagination } from '../../components/ui/useClientPagination'
import { dateTimeLabel, toUtcDateTime } from '../execution/execution-utils'

const statusLabel: Record<string, string> = { DRAFT: 'Bản nháp', PUBLISHED: 'Đã công bố', RETIRED: 'Đã ngừng sử dụng' }
const statusTone: Record<string, BadgeTone> = { DRAFT: 'warning', PUBLISHED: 'success', RETIRED: 'neutral' }
const field = 'mt-1 w-full rounded-lg border border-line-strong bg-card p-2.5 text-sm text-ink'
const button = 'min-h-10 rounded-lg border border-hairline bg-card px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-primary/40 hover:bg-primary-subtle hover:text-primary disabled:opacity-50'
type DraftSnapshot = { title: string; type: string; version: string; content: string; from: string; to: string; departmentId: string; semesterId: string; periodId: string; selected: Doc | null }

export function AcademicKnowledgeManagementPage() {
  const { session } = useAuthSession()
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()
  const inFlight = useRef(false)
  const formRef = useRef<HTMLFormElement>(null)
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [draftSnapshot, setDraftSnapshot] = useState<DraftSnapshot | null>(null)
  const admin = session?.user.roles.includes('ADMIN') ?? false
  const [docs, setDocs] = useState<Doc[]>([])
  const [docSearch, setDocSearch] = useState('')
  const [docStatusFilter, setDocStatusFilter] = useState('')
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
    setPeriods([])
    if (semesterId) void readAllPages(page => getProjectPeriods(session?.accessToken ?? '', { search: '', semesterId: Number(semesterId) }, undefined, page)).then(data => { if (active) setPeriods(data) }).catch(reason => { if (active) setError(knowledge.knowledgeFailure(reason)) })
    return () => { active = false }
  }, [semesterId, session?.accessToken])

  const filteredDocs = useMemo(() => {
    const q = docSearch.trim().toLowerCase()
    return docs.filter(doc => {
      if (docStatusFilter && doc.status !== docStatusFilter) return false
      if (!q) return true
      return doc.title.toLowerCase().includes(q) || doc.currentVersion.toLowerCase().includes(q)
    })
  }, [docs, docSearch, docStatusFilter])
  const docPagination = useClientPagination(filteredDocs, 8)
  const historyRows = useMemo(() => history?.rows ?? [], [history])
  const historyPagination = useClientPagination(historyRows, 8)
  const publishedCount = useMemo(() => docs.filter(d => d.status === 'PUBLISHED').length, [docs])
  const draftCount = useMemo(() => docs.filter(d => d.status === 'DRAFT').length, [docs])
  const retiredCount = useMemo(() => docs.filter(d => d.status === 'RETIRED').length, [docs])

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
      setTitle(''); setContent(''); setSelected(null); setHistory(null); setMode('view'); setDraftSnapshot(null)
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
  const snapshot = (): DraftSnapshot => ({ title, type, version, content, from, to, departmentId, semesterId, periodId, selected })
  const draftDirty = draftSnapshot !== null && (
    title !== draftSnapshot.title || type !== draftSnapshot.type || version !== draftSnapshot.version || content !== draftSnapshot.content ||
    from !== draftSnapshot.from || to !== draftSnapshot.to || departmentId !== draftSnapshot.departmentId ||
    semesterId !== draftSnapshot.semesterId || periodId !== draftSnapshot.periodId || selected?.id !== draftSnapshot.selected?.id
  )
  const cancelDraft = () => {
    if (draftSnapshot) {
      setTitle(draftSnapshot.title); setType(draftSnapshot.type); setVersion(draftSnapshot.version); setContent(draftSnapshot.content)
      setFrom(draftSnapshot.from); setTo(draftSnapshot.to); setDepartmentId(draftSnapshot.departmentId)
      setSemesterId(draftSnapshot.semesterId); setPeriodId(draftSnapshot.periodId); setSelected(draftSnapshot.selected)
    }
    setMode('view'); setDraftSnapshot(null); setMessage('Đã hủy các thay đổi.')
  }

  return (
    <div className="workspace-page space-y-5 pb-12">
      <header className="workspace-heading">
        <div className="workspace-heading-copy">
          <div className="workspace-context">
            <span className="workspace-kicker">Quản trị học vụ</span>
          </div>
          <h1>Kho tài liệu cho trợ lý AI</h1>
          <p>Nhập nội dung text, lưu nháp rồi công bố. Chỉ phiên bản còn hiệu lực, đúng khoa và kỳ mới được dùng để trả lời. Tài liệu DEMO chỉ dùng kiểm thử.</p>
        </div>
      </header>

      <StatTileRow tiles={[
        { icon: 'library_books', label: 'Tổng tài liệu', value: ready ? docs.length : null, hero: true, caption: 'Tài liệu trong phạm vi quản lý của bạn.' },
        { icon: 'verified', label: 'Đã công bố', value: ready ? publishedCount : null, tone: 'success', caption: 'Đang được trợ lý AI sử dụng làm nguồn.' },
        { icon: 'edit_document', label: 'Bản nháp', value: ready ? draftCount : null, tone: 'warning', caption: 'Chờ rà soát trước khi công bố chính thức.' },
        { icon: 'archive', label: 'Ngừng sử dụng', value: ready ? retiredCount : null, tone: 'neutral', caption: 'Đã thu hồi khỏi phạm vi trả lời của AI.' },
      ]} />

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-status-error-border bg-status-error-bg p-3.5 text-sm text-status-error-text">
          <p>{error.message}</p>
          {error.retryable && <button type="button" disabled={busy} className={button} onClick={() => setReload(value => value + 1)}>Thử tải lại danh sách</button>}
        </div>
      )}
      {message && <p role="status" className="rounded-xl border border-primary/25 bg-primary-subtle p-3.5 text-sm font-medium text-ink">{message}</p>}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12 items-start">
        {/* Left Bento Column (8 cols): Knowledge Document Library with 1-row filter & pagination */}
        <section className="workspace-surface xl:col-span-8" aria-labelledby="knowledge-docs-heading">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-canvas/70 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">menu_book</span>
              <h2 id="knowledge-docs-heading" className="font-heading text-sm font-bold text-ink">Tài liệu trong phạm vi quản lý</h2>
              {ready && (
                <span className="inline-flex items-center rounded-full border border-hairline bg-card px-2.5 py-0.5 text-xs font-bold tabular-nums text-ink-soft">
                  {filteredDocs.length}
                </span>
              )}
            </div>
            <button type="button" disabled={busy} className={button} onClick={() => setReload(value => value + 1)}>Tải lại danh sách</button>
          </div>

          <div className="p-5 space-y-4">
            <div className="flex flex-wrap items-end gap-3 rounded-xl border border-hairline bg-canvas/50 p-3.5">
              <label className="flex min-w-52 flex-1 flex-col gap-1 text-xs font-semibold text-ink-soft">
                Tìm kiếm tài liệu
                <input
                  value={docSearch}
                  onChange={e => { setDocSearch(e.target.value); docPagination.setPage(1) }}
                  placeholder="Tên tài liệu hoặc phiên bản…"
                  className="min-h-10 rounded-lg border border-line-strong bg-card px-3 text-sm font-normal text-ink"
                />
              </label>
              <label className="flex min-w-44 flex-col gap-1 text-xs font-semibold text-ink-soft">
                Trạng thái
                <select
                  value={docStatusFilter}
                  onChange={e => { setDocStatusFilter(e.target.value); docPagination.setPage(1) }}
                  className="min-h-10 rounded-lg border border-line-strong bg-card px-3 text-sm font-normal text-ink"
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="PUBLISHED">Đã công bố</option>
                  <option value="DRAFT">Bản nháp</option>
                  <option value="RETIRED">Đã ngừng sử dụng</option>
                </select>
              </label>
              {(docSearch || docStatusFilter) && (
                <button type="button" className={button} onClick={() => { setDocSearch(''); setDocStatusFilter('') }}>Đặt lại lọc</button>
              )}
            </div>

            {!ready ? (
              <p role="status" className="py-4 text-sm text-ink-muted">{error ? 'Chưa tải được dữ liệu quản lý.' : 'Đang tải dữ liệu quản lý…'}</p>
            ) : docs.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-muted">Chưa có tài liệu.</p>
            ) : filteredDocs.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-muted">Không có tài liệu phù hợp bộ lọc hiện tại.</p>
            ) : (
              <>
                <ul className="divide-y divide-hairline">
                  {docPagination.paginatedItems.map(doc => (
                    <li key={doc.id} className="space-y-3 py-4 first:pt-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="break-words font-semibold text-ink">{doc.title}</p>
                            <StatusBadge tone={statusTone[doc.status] ?? 'neutral'} label={statusLabel[doc.status] ?? 'Trạng thái chưa xác định'} />
                          </div>
                          <p className="mt-1 text-xs text-ink-muted">
                            <span className="font-mono font-semibold text-ink-soft">v{doc.currentVersion}</span> · {departments.find(d => d.id === doc.departmentId)?.name ?? 'Dùng chung theo kỳ'}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button disabled={busy} className={button} onClick={() => void act(async () => { const rows = await knowledge.getKnowledgeHistory(doc.id); setHistory({ title: doc.title, rows }) }, 'Đã tải lịch sử phiên bản.', 'history')}>Lịch sử</button>
                        {['DRAFT', 'PUBLISHED'].includes(doc.status) && <>
                          <button disabled={busy} className={button} onClick={() => { if (mode === 'view') setDraftSnapshot(snapshot()); setSelected(doc); setMode('edit'); setVersion(''); setContent(''); setFrom(''); setTo('') }}>Tạo phiên bản</button>
                          <button disabled={busy} className={button} onClick={() => void transition(doc, 'publish')}>Công bố bản nháp mới nhất</button>
                          <button disabled={busy} className={button} onClick={() => void transition(doc, 'retire')}>Ngừng sử dụng</button>
                        </>}
                        {doc.status === 'PUBLISHED' && <button disabled={busy} className={button} onClick={() => void act(() => knowledge.reindexKnowledgeDocument(doc.id), 'Đã kiểm tra lại chỉ mục tài liệu.', 'reindex')}>Lập chỉ mục lại</button>}
                      </div>
                    </li>
                  ))}
                </ul>
                {docPagination.showPagination && (
                  <Pagination
                    page={docPagination.page}
                    pages={docPagination.totalPages}
                    total={docPagination.total}
                    pageSize={docPagination.pageSize}
                    pageSizeOptions={[8, 16, 30]}
                    onPage={docPagination.setPage}
                    onPageSizeChange={docPagination.setPageSize}
                  />
                )}
              </>
            )}
          </div>
        </section>

        {/* Right Bento Column (4 cols): Create/Version Form & Publication History */}
        <div className="xl:col-span-4 xl:sticky xl:top-20 space-y-5">
          <ConfigModeFrame
            mode={mode}
            dirty={draftDirty}
            busy={busy}
            onEdit={() => { setDraftSnapshot(snapshot()); setMode('edit') }}
            onCancel={cancelDraft}
            onSave={() => formRef.current?.requestSubmit()}
            saveLabel={busy ? 'Đang xử lý…' : 'Lưu bản nháp'}
            editDisabled={!ready}
            saveDisabled={!ready || (!selected && !admin && !departmentId)}
            allowSaveUnchanged
            navigationGuard={false}
            blastRadius="Bản nháp mới chỉ nằm trong kho quản lý. Trợ lý AI chỉ dùng tài liệu sau khi công bố; phạm vi khoa, kỳ và thời gian hiệu lực quyết định tài liệu nào được dùng. Phiên bản đang công bố có thể bị thu hồi khi công bố bản mới."
          >
            <section className="workspace-surface">
              <div className="flex items-center justify-between gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">note_add</span>
                  <h2 className="font-heading text-sm font-bold text-ink truncate">{selected ? `Phiên bản mới: ${selected.title}` : 'Tạo tài liệu'}</h2>
                </div>
              </div>
              <form ref={formRef} onSubmit={event => { event.preventDefault(); void save() }} className="p-5 space-y-3">
                <fieldset disabled={busy || !ready} className="min-w-0 space-y-3">
                  {!selected && (
                    <div className="grid gap-3">
                      <label className="text-xs font-semibold text-ink-soft">Tên tài liệu<input aria-label="Tên tài liệu" {...invalid('title')} required maxLength={255} value={title} onChange={e => setTitle(e.target.value)} className={field} />{fieldError('title')}</label>
                      <label className="text-xs font-semibold text-ink-soft">Loại tài liệu<select value={type} onChange={e => setType(e.target.value)} className={field}><option value="PROCESS">Quy trình</option><option value="FORM">Biểu mẫu</option><option value="RUBRIC">Tiêu chí đánh giá</option><option value="DEADLINE">Hạn học vụ</option><option value="DEMO">Minh họa DEMO</option></select></label>
                      <label className="text-xs font-semibold text-ink-soft">Phạm vi khoa<select disabled={!admin} value={departmentId} onChange={e => { setDepartmentId(e.target.value); setSemesterId(''); setPeriodId('') }} className={field}>{admin && <option value="">Dùng chung trong trường theo kỳ</option>}{departments.filter(d => d.isActive && (admin || d.id === Number(departmentId))).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
                      <label className="text-xs font-semibold text-ink-soft">Kỳ áp dụng<select required={!departmentId} value={semesterId} onChange={e => { setSemesterId(e.target.value); setPeriodId('') }} className={field}><option value="">{departmentId ? 'Mọi kỳ trong khoa' : 'Chọn kỳ để xác định trường'}</option>{semesters.filter(s => !dep || s.organizationId === dep.organizationId).map(s => <option key={s.id} value={s.id}>{s.name} · {s.organizationName}</option>)}</select></label>
                      <label className="text-xs font-semibold text-ink-soft">Đợt đồ án<select disabled={!semesterId} value={periodId} onChange={e => setPeriodId(e.target.value)} className={field}><option value="">Mọi đợt trong kỳ</option>{periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
                    </div>
                  )}
                  <div className="grid gap-3">
                    <label className="text-xs font-semibold text-ink-soft">Phiên bản<input aria-label="Phiên bản" {...invalid('version')} required maxLength={64} value={version} onChange={e => setVersion(e.target.value)} className={field} />{fieldError('version')}</label>
                    <label className="text-xs font-semibold text-ink-soft">Hiệu lực từ (giờ Việt Nam)<input aria-label="Hiệu lực từ (giờ Việt Nam)" {...invalid('effectiveFrom')} type="datetime-local" value={from} onChange={e => setFrom(e.target.value)} className={field} />{fieldError('effectiveFrom')}</label>
                    <label className="text-xs font-semibold text-ink-soft">Hết hiệu lực (giờ Việt Nam)<input aria-label="Hết hiệu lực (giờ Việt Nam)" {...invalid('effectiveTo')} type="datetime-local" value={to} onChange={e => setTo(e.target.value)} className={field} />{fieldError('effectiveTo')}</label>
                  </div>
                  <label className="block text-xs font-semibold text-ink-soft">Nội dung tài liệu<textarea aria-label="Nội dung tài liệu" {...invalid('content')} required maxLength={100000} value={content} onChange={e => setContent(e.target.value)} rows={6} className={field} />{fieldError('content')}</label>
                  {selected && <button type="button" className={button} onClick={() => { setSelected(null); setContent('') }}>Hủy tạo phiên bản</button>}
                </fieldset>
              </form>
            </section>
          </ConfigModeFrame>

          {history && (
            <section className="workspace-surface" aria-labelledby="knowledge-history-heading">
              <div className="flex items-center justify-between gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
                <h2 id="knowledge-history-heading" className="font-heading text-sm font-bold text-ink">Lịch sử · {history.title}</h2>
                <span className="inline-flex items-center rounded-full border border-hairline bg-card px-2 py-0.5 text-xs font-bold tabular-nums text-ink-soft">{history.rows.length}</span>
              </div>
              <div className="p-5 space-y-3">
                <ul className="divide-y divide-hairline">
                  {historyPagination.paginatedItems.map(row => (
                    <li key={row.id} className="py-2.5 first:pt-0 last:pb-0 text-xs text-ink-soft">
                      v{row.version} · {statusLabel[row.status] ?? 'Trạng thái chưa xác định'} · {row.chunkCount} đoạn nguồn{row.publishedAt ? ` · Công bố ${dateTimeLabel(row.publishedAt)} (giờ Việt Nam)` : ''}
                    </li>
                  ))}
                </ul>
                {historyPagination.showPagination && (
                  <Pagination
                    page={historyPagination.page}
                    pages={historyPagination.totalPages}
                    total={historyPagination.total}
                    pageSize={historyPagination.pageSize}
                    onPage={historyPagination.setPage}
                  />
                )}
              </div>
            </section>
          )}
        </div>
      </div>

      {confirmationDialog}
    </div>
  )
}
