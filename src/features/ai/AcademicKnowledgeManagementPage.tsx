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
import { Button } from '../../components/ui/Button'
import { ConfigModeFrame } from '../../components/ui/ConfigModeFrame'
import { FilterToolbar, type ActiveFilterChip } from '../../components/ui/FilterToolbar'
import { Modal } from '../../components/ui/Modal'
import { Pagination } from '../../components/ui/Pagination'
import { StatusBadge } from '../../components/ui/StatusBadge'
import type { BadgeTone } from '../../components/ui/status-badge-tone'
import { useClientPagination } from '../../components/ui/useClientPagination'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { dateTimeLabel, toUtcDateTime } from '../execution/execution-utils'

const statusLabel: Record<string, string> = { DRAFT: 'Bản nháp', PUBLISHED: 'Đã công bố', RETIRED: 'Đã ngừng sử dụng' }
const statusTone = (value: string): BadgeTone =>
  value === 'PUBLISHED' ? 'success' : value === 'DRAFT' ? 'warning' : 'neutral'
const typeLabels: Record<string, string> = {
  PROCESS: 'Quy trình',
  FORM: 'Biểu mẫu',
  RUBRIC: 'Tiêu chí đánh giá',
  DEADLINE: 'Hạn học vụ',
  DEMO: 'Minh họa DEMO',
}
const field = 'mt-1 w-full rounded-lg border border-hairline bg-card p-3 text-sm text-ink'
const button = 'min-h-11 rounded-lg border border-hairline bg-card px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-primary-subtle hover:text-primary disabled:opacity-50'
type DraftSnapshot = { title: string; type: string; version: string; content: string; from: string; to: string; departmentId: string; semesterId: string; periodId: string; selected: Doc | null }

export function AcademicKnowledgeManagementPage() {
  const { session } = useAuthSession()
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()
  const inFlight = useRef(false)
  const formRef = useRef<HTMLFormElement>(null)
  const extractFileInputRef = useRef<HTMLInputElement>(null)
  const handledDeptDocRef = useRef<string | null>(null)
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [draftSnapshot, setDraftSnapshot] = useState<DraftSnapshot | null>(null)
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
  const [sourceFileName, setSourceFileName] = useState<string | null>(null)
  const [customChunks, setCustomChunks] = useState<knowledge.KnowledgeChunkDraft[] | null>(null)
  const [extractBusy, setExtractBusy] = useState(false)
  const [extractPreview, setExtractPreview] = useState<knowledge.KnowledgeExtractPreview | null>(null)
  const [extractError, setExtractError] = useState<string | null>(null)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [selected, setSelected] = useState<Doc | null>(null)
  const [history, setHistory] = useState<{ title: string; rows: Version[] } | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<knowledge.KnowledgeFailure | null>(null)
  const [reload, setReload] = useState(0)
  const [readyFor, setReadyFor] = useState<{ reload: number; token?: string; admin: boolean } | null>(null)
  const [listSearch, setListSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [deptFilter, setDeptFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState<'default' | 'title_asc' | 'version_desc'>('default')
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
  const act = async (work: () => Promise<unknown>, success: string, action = 'save') => {
    if (inFlight.current || !ready) return
    inFlight.current = true
    setBusy(true); setError(null); setMessage(null)
    try { await work(); setMessage(success); await load() }
    catch (reason) { setError(knowledge.knowledgeFailure(reason, action)) }
    finally { inFlight.current = false; setBusy(false) }
  }
  const runExtract = useCallback(async (input: { file?: File; departmentDocumentId?: number }) => {
    setExtractBusy(true)
    setExtractError(null)
    try {
      const result = await knowledge.extractKnowledgePreview(input)
      setExtractPreview(result)
      setMode('edit')
    } catch (reason) {
      setExtractError(knowledge.knowledgeFailure(reason, 'extract').message)
    } finally {
      setExtractBusy(false)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !ready) return
    const params = new URLSearchParams(window.location.search)
    const rawId = params.get('fromDepartmentDocId')
    if (!rawId || handledDeptDocRef.current === rawId) return
    const parsed = Number(rawId)
    if (!Number.isSafeInteger(parsed) || parsed <= 0) return
    handledDeptDocRef.current = rawId
    setDraftSnapshot(prev => prev ?? { title, type, version, content, from, to, departmentId, semesterId, periodId, selected })
    void runExtract({ departmentDocumentId: parsed })
    params.delete('fromDepartmentDocId')
    const query = params.toString()
    window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
  }, [ready, runExtract, title, type, version, content, from, to, departmentId, semesterId, periodId, selected])

  const applyExtractToForm = () => {
    if (!extractPreview) return
    const validChunks = extractPreview.chunks.filter(c => c.content.trim().length > 0)
    if (!selected && extractPreview.suggestedTitle) setTitle(extractPreview.suggestedTitle)
    if (!selected && extractPreview.suggestedDocumentType) setType(extractPreview.suggestedDocumentType)
    setSourceFileName(extractPreview.sourceFileName)
    if (validChunks.length > 0) {
      setCustomChunks(validChunks)
      setContent(validChunks.map(c => (c.heading ? `## ${c.heading}\n${c.content.trim()}` : c.content.trim())).join('\n\n'))
    } else {
      setCustomChunks(null)
      setContent(extractPreview.content)
    }
    setExtractPreview(null)
    setMode('edit')
    setMessage(`Đã nạp ${validChunks.length || 1} đoạn nguồn từ tệp "${extractPreview.sourceFileName}" vào bản nháp. Kiểm tra rồi bấm Lưu bản nháp.`)
  }

  const save = () => {
    let effectiveFrom: string | null, effectiveTo: string | null
    try { effectiveFrom = toUtcDateTime(from); effectiveTo = toUtcDateTime(to) }
    catch { setError({ message: 'Thời điểm hiệu lực chưa hợp lệ. Kiểm tra giờ Việt Nam đã nhập.', retryable: false }); return }
    if (effectiveFrom && effectiveTo && effectiveFrom >= effectiveTo) {
      setError({ message: 'Hết hiệu lực phải sau thời điểm bắt đầu hiệu lực (giờ Việt Nam).', retryable: false }); return
    }
    return act(async () => {
    const data = { version, content, sourceFileName, effectiveFrom, effectiveTo, chunks: customChunks && customChunks.length > 0 ? customChunks.map(c => ({ heading: c.heading ?? null, pageNumber: c.pageNumber ?? null, content: c.content.trim() })) : null }
    if (selected) await knowledge.createKnowledgeVersion(selected.id, data)
    else await knowledge.createKnowledgeDocument({ ...data, title, documentType: type, departmentId: departmentId ? Number(departmentId) : null, academicSemesterId: semesterId ? Number(semesterId) : null, projectPeriodId: periodId ? Number(periodId) : null })
    setTitle(''); setContent(''); setSourceFileName(null); setCustomChunks(null); setExtractPreview(null); setSelected(null); setHistory(null); setMode('view'); setDraftSnapshot(null)
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
  const statusCounts = useMemo(() => {
    const counts = { ALL: docs.length, PUBLISHED: 0, DRAFT: 0, RETIRED: 0 }
    for (const d of docs) {
      if (d.status === 'PUBLISHED') counts.PUBLISHED++
      else if (d.status === 'DRAFT') counts.DRAFT++
      else if (d.status === 'RETIRED') counts.RETIRED++
    }
    return counts
  }, [docs])

  const filteredDocs = useMemo(() => {
    const q = listSearch.trim().toLowerCase()
    const filtered = docs.filter(doc => {
      if (statusFilter !== 'ALL' && doc.status !== statusFilter) return false
      if (typeFilter !== 'ALL' && doc.documentType !== typeFilter) return false
      if (deptFilter !== 'ALL') {
        if (deptFilter === 'SHARED' && doc.departmentId != null) return false
        if (deptFilter !== 'SHARED' && String(doc.departmentId ?? '') !== deptFilter) return false
      }
      if (q) {
        const deptName = departments.find(d => d.id === doc.departmentId)?.name ?? 'Dùng chung theo kỳ'
        if (!`${doc.title} ${doc.currentVersion} ${deptName} ${typeLabels[doc.documentType ?? ''] ?? ''}`.toLowerCase().includes(q)) return false
      }
      return true
    })
    if (sortBy === 'title_asc') return [...filtered].sort((a, b) => a.title.localeCompare(b.title, 'vi'))
    if (sortBy === 'version_desc') return [...filtered].sort((a, b) => String(b.currentVersion).localeCompare(String(a.currentVersion), 'vi', { numeric: true }))
    return filtered
  }, [docs, statusFilter, typeFilter, deptFilter, listSearch, departments, sortBy])

  const docPager = useClientPagination(filteredDocs, 10)

  const hasDocFilters = Boolean(listSearch.trim() || statusFilter !== 'ALL' || typeFilter !== 'ALL' || deptFilter !== 'ALL' || sortBy !== 'default')
  const docChips: ActiveFilterChip[] = []
  if (statusFilter !== 'ALL') docChips.push({ id: 'status', label: 'Trạng thái', value: statusLabel[statusFilter] ?? statusFilter })
  if (typeFilter !== 'ALL') docChips.push({ id: 'type', label: 'Loại', value: typeLabels[typeFilter] ?? typeFilter })
  if (deptFilter !== 'ALL') {
    docChips.push({
      id: 'dept',
      label: 'Khoa',
      value: deptFilter === 'SHARED' ? 'Dùng chung theo kỳ' : (departments.find(d => String(d.id) === deptFilter)?.name ?? deptFilter),
    })
  }

  return <WorkspacePage size="wide" className="space-y-5 pb-12" eyebrow="Quản trị học vụ" title="Kho tài liệu cho trợ lý AI" description="Nhập nội dung tài liệu, lưu bản nháp rồi công bố. Chỉ phiên bản còn hiệu lực, đúng khoa và kỳ mới được dùng để trả lời.">
    {error && <div role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text"><p>{error.message}</p>{error.retryable && <button type="button" disabled={busy} className={button} onClick={() => setReload(value => value + 1)}>Thử tải lại danh sách</button>}</div>}
    {message && (
      <div className="flex items-center gap-2 rounded-lg border border-hairline border-l-4 border-l-status-success-text bg-card p-3 text-sm text-ink">
        <span className="material-symbols-outlined shrink-0 text-[18px] text-status-success-text" aria-hidden="true">check_circle</span>
        <p role="status">{message}</p>
      </div>
    )}
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      <section className="rounded-xl border border-hairline bg-card p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold text-ink">Tài liệu trong phạm vi quản lý</h2>
          <Button variant="secondary" size="sm" icon="refresh" aria-label="Tải lại danh sách" disabled={busy} onClick={() => setReload(value => value + 1)} />
        </div>
        {ready && (
          <FilterToolbar
            embedded
            search={listSearch}
            onSearchChange={v => { setListSearch(v); docPager.setPage(1) }}
            searchLabel="Tìm tài liệu AI"
            searchPlaceholder="Tìm theo tiêu đề, phiên bản, khoa..."
            debounceMs={0}
            tabs={[
              { value: 'ALL', label: 'Tất cả', count: statusCounts.ALL },
              { value: 'PUBLISHED', label: 'Đã công bố', count: statusCounts.PUBLISHED },
              { value: 'DRAFT', label: 'Bản nháp', count: statusCounts.DRAFT },
              { value: 'RETIRED', label: 'Ngừng sử dụng', count: statusCounts.RETIRED },
            ]}
            activeTab={statusFilter}
            onTabChange={v => { setStatusFilter(v); docPager.setPage(1) }}
            tabsLabel="Lọc tài liệu AI theo trạng thái"
            controls={
              <>
                <label className="ft-select-wrap">
                  <span className="sr-only">Loại tài liệu</span>
                  <select className="ft-select" aria-label="Lọc theo loại tài liệu" value={typeFilter} onChange={e => { setTypeFilter(e.target.value); docPager.setPage(1) }}>
                    <option value="ALL">Tất cả loại</option>
                    {Object.entries(typeLabels).map(([k, lbl]) => <option key={k} value={k}>{lbl}</option>)}
                  </select>
                </label>
                {departments.length > 1 && (
                  <label className="ft-select-wrap">
                    <span className="sr-only">Phạm vi khoa</span>
                    <select className="ft-select" aria-label="Lọc theo khoa" value={deptFilter} onChange={e => { setDeptFilter(e.target.value); docPager.setPage(1) }}>
                      <option value="ALL">Tất cả khoa</option>
                      <option value="SHARED">Dùng chung theo kỳ</option>
                      {departments.map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
                    </select>
                  </label>
                )}
              </>
            }
            sort={{
              value: sortBy,
              onChange: val => setSortBy(val as 'default' | 'title_asc' | 'version_desc'),
              options: [
                { value: 'default', label: 'Mặc định' },
                { value: 'title_asc', label: 'Tiêu đề A–Z' },
                { value: 'version_desc', label: 'Phiên bản mới nhất' },
              ],
            }}
            activeChips={docChips}
            onRemoveChip={id => {
              if (id === 'status') setStatusFilter('ALL')
              if (id === 'type') setTypeFilter('ALL')
              if (id === 'dept') setDeptFilter('ALL')
              docPager.setPage(1)
            }}
            onClearAll={() => { setListSearch(''); setStatusFilter('ALL'); setTypeFilter('ALL'); setDeptFilter('ALL'); setSortBy('default'); docPager.setPage(1) }}
            hasActiveFilters={hasDocFilters}
            resultSummary={`${filteredDocs.length} / ${docs.length} tài liệu`}
          />
        )}
        {!ready ? <p role="status" className="mt-4 text-sm text-ink-muted">{error ? 'Chưa tải được dữ liệu quản lý.' : 'Đang tải dữ liệu quản lý…'}</p> : docPager.paginatedItems.length === 0 ? <p className="mt-4 text-sm text-ink-muted">{hasDocFilters ? 'Không có tài liệu khớp bộ lọc hiện tại.' : 'Chưa có tài liệu.'}</p> : <ul className="divide-y divide-hairline">{docPager.paginatedItems.map(doc => <li key={doc.id} className="space-y-3 py-4"><div><div className="flex flex-wrap items-center gap-2"><p className="break-words font-semibold text-ink">{doc.title}</p><StatusBadge tone={statusTone(doc.status)} label={statusLabel[doc.status] ?? 'Trạng thái chưa xác định'} /></div><p className="mt-1 text-xs text-ink-muted">v{doc.currentVersion}{doc.documentType ? ` · ${typeLabels[doc.documentType] ?? doc.documentType}` : ''} · {departments.find(d => d.id === doc.departmentId)?.name ?? 'Dùng chung theo kỳ'}</p></div><div className="flex flex-wrap gap-2">
          <button disabled={busy} className={button} onClick={() => void act(async () => { const rows = await knowledge.getKnowledgeHistory(doc.id); setHistory({ title: doc.title, rows }) }, 'Đã tải lịch sử phiên bản.', 'history')}>Lịch sử</button>
          {['DRAFT', 'PUBLISHED'].includes(doc.status) && <><button disabled={busy} className={button} onClick={() => { if (mode === 'view') setDraftSnapshot(snapshot()); setSelected(doc); setMode('edit'); setVersion(''); setContent(''); setFrom(''); setTo('') }}>Tạo phiên bản</button><button disabled={busy} className="min-h-10 rounded-lg border border-primary bg-card px-3 py-2 text-sm font-semibold text-primary hover:bg-primary-subtle disabled:opacity-50" onClick={() => void transition(doc, 'publish')}>Công bố bản nháp mới nhất</button><button disabled={busy} className="min-h-10 rounded-lg border border-status-error-border bg-status-error-bg px-3 py-2 text-sm font-semibold text-status-error-text hover:opacity-90 disabled:opacity-50" onClick={() => void transition(doc, 'retire')}>Ngừng sử dụng</button></>}
          {doc.status === 'PUBLISHED' && <button disabled={busy} className={button} onClick={() => void act(() => knowledge.reindexKnowledgeDocument(doc.id), 'Đã kiểm tra lại chỉ mục tài liệu.', 'reindex')}>Lập chỉ mục lại</button>}
        </div></li>)}</ul>}
        {docPager.showPagination && (
          <Pagination
            page={docPager.page}
            pages={docPager.pages}
            total={docPager.total}
            pageSize={docPager.pageSize}
            onPage={docPager.setPage}
            onPageSizeChange={docPager.setPageSize}
          />
        )}
      </section>

      <div className="min-w-0 xl:sticky xl:top-6">
        <ConfigModeFrame mode={mode} dirty={draftDirty} busy={busy} onEdit={() => { setDraftSnapshot(snapshot()); setMode('edit') }} onCancel={cancelDraft} onSave={() => formRef.current?.requestSubmit()} saveLabel={busy ? 'Đang xử lý…' : 'Lưu bản nháp'} editDisabled={!ready} saveDisabled={!ready || (!selected && !admin && !departmentId)} allowSaveUnchanged navigationGuard={false} blastRadius="Bản nháp mới chỉ nằm trong kho quản lý. Trợ lý AI chỉ dùng tài liệu sau khi công bố; phạm vi khoa, kỳ và thời gian hiệu lực quyết định tài liệu nào được dùng. Phiên bản đang công bố có thể bị thu hồi khi công bố bản mới.">
        <section className="rounded-xl border border-hairline bg-card p-5 shadow-xs"><h2 className="font-heading text-lg font-semibold text-ink">{selected ? `Phiên bản mới: ${selected.title}` : 'Tạo tài liệu'}</h2>
          <div className="mt-3 rounded-xl border border-primary/25 bg-primary-subtle/40 p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-primary">Trích xuất tự động từ tệp PDF / DOCX / XLSX</p>
                <p className="text-xs text-ink-soft">AI tự đề xuất tên tài liệu, phân loại và tách thành các đoạn nguồn (chunks) có thể sửa/xóa trước khi lưu nháp.</p>
              </div>
              <input
                ref={extractFileInputRef}
                type="file"
                className="sr-only"
                accept=".pdf,.docx,.xlsx,.txt,.md,.csv,.json"
                onChange={e => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (file) void runExtract({ file })
                }}
              />
              <button
                type="button"
                disabled={busy || !ready || extractBusy}
                onClick={() => extractFileInputRef.current?.click()}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">upload_file</span>
                {extractBusy ? 'Đang trích xuất…' : 'Chọn tệp để trích xuất'}
              </button>
            </div>
            {extractError && <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg px-3 py-2 text-xs text-status-error-text">{extractError}</p>}
            {sourceFileName && !extractPreview && (
              <p className="text-xs text-ink-soft">
                Nguồn đang nạp: <strong className="text-ink">{sourceFileName}</strong>
                {customChunks ? ` · ${customChunks.length} đoạn nguồn đã chọn` : ''}
              </p>
            )}
            {extractPreview && (
              <div className="space-y-2.5 rounded-lg border border-hairline bg-card p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-ink">
                      Kết quả trích xuất: {extractPreview.sourceFileName} ({extractPreview.chunks.length} đoạn)
                    </p>
                    <p className="text-xs text-ink-muted">{extractPreview.summary}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="min-h-9 rounded-lg border border-hairline bg-canvas px-3 text-xs font-semibold text-ink-soft hover:text-ink"
                      onClick={() => setExtractPreview(null)}
                    >
                      Đóng xem trước
                    </button>
                    <button
                      type="button"
                      disabled={extractPreview.chunks.length === 0}
                      className="min-h-9 rounded-lg bg-primary px-3 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
                      onClick={applyExtractToForm}
                    >
                      Đổ vào bản nháp ({extractPreview.chunks.length} đoạn)
                    </button>
                  </div>
                </div>
                {extractPreview.warnings.length > 0 && (
                  <ul className="space-y-1 rounded-md border border-status-warning-border bg-status-warning-bg px-2.5 py-2 text-xs text-status-warning-text">
                    {extractPreview.warnings.map((w, idx) => <li key={idx}>• {w}</li>)}
                  </ul>
                )}
                <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                  {extractPreview.chunks.map((chunk, idx) => (
                    <div key={idx} className="space-y-1.5 rounded-lg border border-hairline bg-canvas p-2.5">
                      <div className="flex items-center gap-2">
                        <input
                          aria-label={`Tiêu đề đoạn ${idx + 1}`}
                          placeholder="Tiêu đề mục"
                          value={chunk.heading ?? ''}
                          onChange={e => setExtractPreview(prev => prev ? {
                            ...prev,
                            chunks: prev.chunks.map((c, i) => (i === idx ? { ...c, heading: e.target.value } : c)),
                          } : prev)}
                          className="min-h-8 flex-1 rounded border border-hairline bg-card px-2 text-xs font-semibold text-ink"
                        />
                        {chunk.pageNumber && <span className="text-xs text-ink-muted">Trang {chunk.pageNumber}</span>}
                        <button
                          type="button"
                          onClick={() => setExtractPreview(prev => prev ? {
                            ...prev,
                            chunks: prev.chunks.filter((_, i) => i !== idx),
                          } : prev)}
                          className="rounded border border-hairline px-2 py-1 text-xs font-semibold text-status-error-text hover:bg-status-error-bg"
                        >
                          Bỏ đoạn
                        </button>
                      </div>
                      <textarea
                        aria-label={`Nội dung đoạn ${idx + 1}`}
                        rows={3}
                        value={chunk.content}
                        onChange={e => setExtractPreview(prev => prev ? {
                          ...prev,
                          chunks: prev.chunks.map((c, i) => (i === idx ? { ...c, content: e.target.value } : c)),
                        } : prev)}
                        className="w-full rounded border border-hairline bg-card p-2 text-xs text-ink"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <form ref={formRef} onSubmit={event => { event.preventDefault(); void save() }} className="mt-4 space-y-3">
            <fieldset disabled={busy || !ready} className="min-w-0 space-y-3">
            {!selected && <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm text-ink">Tên tài liệu<input aria-label="Tên tài liệu" {...invalid('title')} required maxLength={255} value={title} onChange={e => setTitle(e.target.value)} className={field} />{fieldError('title')}</label>
              <label className="text-sm text-ink">Loại tài liệu<select value={type} onChange={e => setType(e.target.value)} className={field}><option value="PROCESS">Quy trình</option><option value="FORM">Biểu mẫu</option><option value="RUBRIC">Tiêu chí đánh giá</option><option value="DEADLINE">Hạn học vụ</option><option value="DEMO">Minh họa DEMO</option></select></label>
              <label className="text-sm text-ink">Phạm vi khoa<select disabled={!admin} value={departmentId} onChange={e => { setDepartmentId(e.target.value); setSemesterId(''); setPeriodId('') }} className={field}>{admin && <option value="">Dùng chung trong trường theo kỳ</option>}{departments.filter(d => d.isActive && (admin || d.id === Number(departmentId))).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
              <label className="text-sm text-ink">Kỳ áp dụng<select required={!departmentId} value={semesterId} onChange={e => { setSemesterId(e.target.value); setPeriodId('') }} className={field}><option value="">{departmentId ? 'Mọi kỳ trong khoa' : 'Chọn kỳ để xác định trường'}</option>{semesters.filter(s => !dep || s.organizationId === dep.organizationId).map(s => <option key={s.id} value={s.id}>{s.name} · {s.organizationName}</option>)}</select></label>
              <label className="text-sm text-ink md:col-span-2">Đợt đồ án<select disabled={!semesterId} value={periodId} onChange={e => setPeriodId(e.target.value)} className={field}><option value="">Mọi đợt trong kỳ</option>{periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
            </div>}
            <div className="grid gap-3 sm:grid-cols-3"><label className="text-sm text-ink">Phiên bản<input aria-label="Phiên bản" {...invalid('version')} required maxLength={64} value={version} onChange={e => setVersion(e.target.value)} className={field} />{fieldError('version')}</label><label className="text-sm text-ink">Hiệu lực từ (giờ Việt Nam)<input aria-label="Hiệu lực từ (giờ Việt Nam)" {...invalid('effectiveFrom')} type="datetime-local" value={from} onChange={e => setFrom(e.target.value)} className={field} />{fieldError('effectiveFrom')}</label><label className="text-sm text-ink">Hết hiệu lực (giờ Việt Nam)<input aria-label="Hết hiệu lực (giờ Việt Nam)" {...invalid('effectiveTo')} type="datetime-local" value={to} onChange={e => setTo(e.target.value)} className={field} />{fieldError('effectiveTo')}</label></div>
            <label className="block text-sm text-ink">Nội dung tài liệu<textarea aria-label="Nội dung tài liệu" {...invalid('content')} required maxLength={100000} value={content} onChange={e => setContent(e.target.value)} rows={8} className={field} />{fieldError('content')}</label>
            {selected && <button type="button" className={button} onClick={() => { setSelected(null); setContent('') }}>Hủy tạo phiên bản</button>}
            </fieldset>
          </form></section>
        </ConfigModeFrame>
      </div>
    </div>
    {history && (
      <Modal open title={`Lịch sử · ${history.title}`} onClose={() => setHistory(null)}>
        <ul className="space-y-2">{history.rows.map(row => <li key={row.id} className="rounded-lg border border-hairline bg-canvas p-3 text-sm text-ink-soft"><strong>v{row.version}</strong> · {statusLabel[row.status] ?? 'Trạng thái chưa xác định'} · {row.chunkCount} đoạn nguồn{row.publishedAt ? ` · Công bố ${dateTimeLabel(row.publishedAt)} (giờ Việt Nam)` : ''}</li>)}</ul>
      </Modal>
    )}
    {confirmationDialog}
  </WorkspacePage>
}
