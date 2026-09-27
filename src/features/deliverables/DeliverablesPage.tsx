import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import * as api from '../../services/api/deliverables.api'
import type { PagedResult } from '../../types/backend'
import { ExIcon, ExPagination, ExState, ExecutionPage } from '../execution/execution-ui'
import { useExecutionAccess } from '../execution/context/ExecutionAccessContext'
import { deliverableError, needsAuthoritativeRefresh } from './deliverable-errors'
import type { Deliverable, DeliverableFeedback, DeliverableStatus, DeliverableVersion, SaveDeliverable } from './deliverable-types'
import './deliverables.css'

const statusLabel: Record<DeliverableStatus, string> = {
  DRAFT: 'Bản nháp', OPEN: 'Đang mở', SUBMITTED: 'Chờ duyệt', ACCEPTED: 'Đã chấp nhận', REJECTED: 'Cần chỉnh sửa', CLOSED: 'Đã khóa',
}
const statuses = Object.keys(statusLabel) as DeliverableStatus[]
type VersionState = PagedResult<DeliverableVersion> & { deliverableId: number }
type FeedbackState = PagedResult<DeliverableFeedback> & { versionId: number }

export function DeliverablesPage() {
  const access = useExecutionAccess()
  return <DeliverablesView key={`${access.project.id}:${access.actor}:${access.currentUserId ?? 0}`} />
}

function DeliverablesView() {
  const { project, actor, canManageStructure, routeBase } = useExecutionAccess()
  const [params, setParams] = useSearchParams()
  const page = positivePage(params.get('page'))
  const status = statuses.includes(params.get('status') as DeliverableStatus) ? params.get('status') as DeliverableStatus : undefined
  const deliverableType = params.get('deliverableType')?.trim() || undefined
  const search = params.get('search')?.trim() || undefined
  const [filterDraft, setFilterDraft] = useState({ search: search ?? '', status: status ?? '', deliverableType: deliverableType ?? '' })
  const [data, setData] = useState<PagedResult<Deliverable> | null>(null)
  const [selected, setSelected] = useState<Deliverable | null>(null)
  const [versions, setVersions] = useState<VersionState | null>(null)
  const [selectedVersion, setSelectedVersion] = useState<DeliverableVersion | null>(null)
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [revision, setRevision] = useState(0)
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Deliverable | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Deliverable | null>(null)
  const mutationLock = useRef(false)

  useEffect(() => setFilterDraft({ search: search ?? '', status: status ?? '', deliverableType: deliverableType ?? '' }), [search, status, deliverableType])

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError('')
    try {
      const result = await api.getDeliverables(project.id, { search, status, deliverableType, page, pageSize: 10 }, signal)
      if (!signal?.aborted) {
        setData(result)
        setSelected((current) => current ? result.items.find((item) => item.id === current.id) ?? null : null)
      }
      return result
    } catch (reason) { if (!signal?.aborted) setError(deliverableError(reason)) }
    finally { if (!signal?.aborted) setLoading(false) }
    return null
  }, [deliverableType, page, project.id, search, status])

  const loadVersions = useCallback(async (item: Deliverable, versionPage = 1, signal?: AbortSignal) => {
    setSelected(item); setSelectedVersion(null); setFeedback(null); setDetailLoading(true); setError('')
    try {
      const result = await api.getDeliverableVersions(item.id, versionPage, 10, signal)
      if (!signal?.aborted) setVersions({ ...result, deliverableId: item.id })
    } catch (reason) { if (!signal?.aborted) setError(deliverableError(reason)) }
    finally { if (!signal?.aborted) setDetailLoading(false) }
  }, [])

  const loadFeedback = useCallback(async (version: DeliverableVersion, feedbackPage = 1, signal?: AbortSignal) => {
    setSelectedVersion(version); setDetailLoading(true); setError('')
    try {
      const result = await api.getDeliverableFeedback(version.id, feedbackPage, 10, signal)
      if (!signal?.aborted) setFeedback({ ...result, versionId: version.id })
    } catch (reason) { if (!signal?.aborted) setError(deliverableError(reason)) }
    finally { if (!signal?.aborted) setDetailLoading(false) }
  }, [])

  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort() }, [load, revision])

  async function mutate(action: () => Promise<unknown>, message: string, refreshDetail = false) {
    if (mutationLock.current) return
    mutationLock.current = true; setBusy(true); setError(''); setSuccess('')
    try {
      await action(); setSuccess(message); setShowCreate(false); setEditing(null); setDeleteTarget(null)
      const refreshed = await load()
      if (refreshDetail && selected) {
        const current = refreshed?.items.find((item) => item.id === selected.id)
        if (current) await loadVersions(current)
      }
    } catch (reason) {
      if (needsAuthoritativeRefresh(reason)) {
        const refreshed = await load()
        if (selected) {
          const current = refreshed?.items.find((item) => item.id === selected.id)
          if (current) await loadVersions(current)
        }
      }
      setError(deliverableError(reason))
    } finally { mutationLock.current = false; setBusy(false) }
  }

  function applyFilters(event: FormEvent) {
    event.preventDefault()
    const next = new URLSearchParams()
    if (filterDraft.search.trim()) next.set('search', filterDraft.search.trim())
    if (filterDraft.status) next.set('status', filterDraft.status)
    if (filterDraft.deliverableType.trim()) next.set('deliverableType', filterDraft.deliverableType.trim())
    setParams(next)
  }

  function saveDefinition(event: FormEvent<HTMLFormElement>, item?: Deliverable) {
    event.preventDefault()
    const body = definitionFromForm(event.currentTarget)
    if (!body) return
    void mutate(
      () => item ? api.updateDeliverable(item.id, body) : api.createDeliverable(project.id, body),
      item ? 'Đã cập nhật định nghĩa hạng mục.' : 'Đã tạo hạng mục cần nộp.',
      Boolean(item && selected?.id === item.id),
    )
  }

  function submitVersion(event: FormEvent<HTMLFormElement>, item: Deliverable) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const input = event.currentTarget.elements.namedItem('file')
    const files = input instanceof HTMLInputElement ? input.files : null
    const file = files ? (typeof files.item === 'function' ? files.item(0) : files[0] ?? null) : null
    if (!isUploadFile(file)) { setError('Hãy chọn một tệp trước khi nộp phiên bản.'); return }
    void mutate(
      () => api.submitDeliverableVersion(item.id, item.latestVersion, file, String(form.get('note') ?? '')),
      'Đã nộp phiên bản mới. Phiên bản cũ vẫn được giữ nguyên.',
      selected?.id === item.id,
    )
  }

  function reviewVersion(event: FormEvent<HTMLFormElement>, version: DeliverableVersion) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const feedbackText = String(form.get('feedback') ?? '').trim()
    if (!feedbackText) return
    void mutate(
      () => api.reviewDeliverableVersion(version.id, String(form.get('decision')) as 'ACCEPTED' | 'REJECTED', feedbackText),
      'Đã lưu quyết định và nhận xét cho phiên bản.', true,
    )
  }

  async function download(file: DeliverableVersion['files'][number]) {
    if (mutationLock.current) return
    mutationLock.current = true; setBusy(true); setError('')
    try {
      const blob = await api.downloadDeliverableFile(file.id)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = file.fileName; anchor.click()
      URL.revokeObjectURL(url)
    } catch (reason) { setError(deliverableError(reason)) }
    finally { mutationLock.current = false; setBusy(false) }
  }

  const types = useMemo(() => [...new Set(data?.items.map((item) => item.deliverableType).filter((value): value is string => Boolean(value)) ?? [])], [data])
  return <ExecutionPage title="Hạng mục cần nộp" eyebrow={`Thực hiện đồ án • ${project.title}`} backTo={`${routeBase}/workspace`}
    description="Quản lý yêu cầu đầu ra, nộp phiên bản bất biến và lưu phản hồi của giảng viên theo dữ liệu Backend."
    action={<><Link className="ex-button" to={`${routeBase}/workspace`}><ExIcon name="dashboard" />Không gian đồ án</Link>{canManageStructure && <button className="ex-button ex-button-primary" type="button" onClick={() => { setShowCreate((value) => !value); setEditing(null) }}><ExIcon name="add" />Tạo hạng mục</button>}</>}>
    {success && <p className="ex-notice" role="status">{success}</p>}
    {error && <div className="ex-notice ex-notice-error" role="alert"><p>{error}</p><button className="ex-text-button" disabled={loading || busy} onClick={() => setRevision((value) => value + 1)}>Tải lại dữ liệu</button></div>}
    {showCreate && canManageStructure && <DefinitionForm title="Tạo hạng mục cần nộp" item={null} busy={busy} onSubmit={saveDefinition} onCancel={() => setShowCreate(false)} />}

    <section className="ex-panel" aria-label="Danh sách hạng mục cần nộp">
      <form className="ex-filters" onSubmit={applyFilters}>
        <label className="ex-filter-search">Tìm theo tên<input value={filterDraft.search} onChange={(event) => setFilterDraft({ ...filterDraft, search: event.target.value })} /></label>
        <label>Trạng thái<select value={filterDraft.status} onChange={(event) => setFilterDraft({ ...filterDraft, status: event.target.value })}><option value="">Tất cả</option>{statuses.map((value) => <option key={value} value={value}>{statusLabel[value]}</option>)}</select></label>
        <label>Loại hạng mục<input list="deliverable-types" value={filterDraft.deliverableType} onChange={(event) => setFilterDraft({ ...filterDraft, deliverableType: event.target.value })} /><datalist id="deliverable-types">{types.map((value) => <option key={value} value={value} />)}</datalist></label>
        <button className="ex-button" type="submit" disabled={loading}>Áp dụng</button>
        <button className="ex-text-button" type="button" onClick={() => { setFilterDraft({ search: '', status: '', deliverableType: '' }); setParams({}) }}>Xóa lọc</button>
      </form>
      {loading ? <ExState loading /> : data && data.items.length === 0 ? <ExState title="Chưa có hạng mục phù hợp" message="Thay đổi bộ lọc hoặc tạo hạng mục mới khi bạn có quyền." /> : data && <>
        <div className="deliverable-list-heading"><span>Hạng mục</span><span>Trạng thái</span><span>Phiên bản</span><span>Thao tác</span></div>
        <div>{data.items.map((item) => <article className="deliverable-row" key={item.id}>
          <div className="deliverable-main"><h2>{item.title}</h2><p>{item.description || 'Chưa có mô tả.'}</p><small>{item.deliverableType || 'Chưa phân loại'}{item.dueAt ? ` • Hạn ${formatDate(item.dueAt)}` : ' • Không đặt hạn riêng'}</small></div>
          <span className={`ex-badge ex-badge-${item.status}`}>{statusLabel[item.status] ?? 'Trạng thái chưa xác định'}</span>
          <span className="deliverable-version">V{item.latestVersion}</span>
          <div className="deliverable-actions"><button className="ex-text-button" type="button" onClick={() => void loadVersions(item)}>Xem phiên bản</button>{canManageStructure && <button className="ex-text-button" type="button" onClick={() => { setEditing(item); setShowCreate(false) }}>Sửa</button>}{canManageStructure && ['DRAFT', 'OPEN'].includes(item.status) && item.latestVersion === 0 && <button className="ex-text-button ex-danger-text" type="button" onClick={() => setDeleteTarget(item)}>Xóa</button>}</div>
          {actor === 'student' && !['ACCEPTED', 'CLOSED'].includes(item.status) && <form className="deliverable-upload" onSubmit={(event) => submitVersion(event, item)}><label>Chọn tệp<input aria-label={`Tệp ${item.title}`} name="file" type="file" required disabled={busy} /></label><label>Ghi chú phiên bản<input aria-label={`Ghi chú ${item.title}`} name="note" maxLength={2000} disabled={busy} /></label><button className="ex-button ex-button-primary" disabled={busy}>Nộp phiên bản</button></form>}
          {editing?.id === item.id && <div className="deliverable-inline-form"><DefinitionForm title={`Sửa ${item.title}`} item={item} busy={busy} onSubmit={saveDefinition} onCancel={() => setEditing(null)} /></div>}
          {deleteTarget?.id === item.id && <div className="deliverable-delete"><h3>Xóa hạng mục chưa có phiên bản?</h3><p>Thao tác chỉ thành công nếu Backend xác nhận hạng mục vẫn đang mở và chưa từng có phiên bản.</p><div className="ex-actions"><button className="ex-button" disabled={busy} onClick={() => setDeleteTarget(null)}>Giữ lại</button><button className="ex-button ex-button-danger" disabled={busy} onClick={() => void mutate(() => api.deleteDeliverable(item.id), 'Đã xóa hạng mục.')}>Xác nhận xóa</button></div></div>}
        </article>)}</div>
        <ExPagination page={page} pages={data.totalPages} total={data.totalCount} busy={loading} onPage={(next) => { const query = new URLSearchParams(params); query.set('page', String(next)); setParams(query) }} />
      </>}
    </section>

    {selected && <section className="ex-panel" aria-labelledby="version-history-title">
      <div className="ex-panel-heading"><div><h2 id="version-history-title">Lịch sử phiên bản</h2><p>{selected.title} • dữ liệu bất biến theo từng lần nộp</p></div><button className="ex-text-button" onClick={() => { setSelected(null); setVersions(null); setSelectedVersion(null); setFeedback(null) }}>Đóng</button></div>
      {detailLoading && !versions ? <ExState loading /> : versions && versions.items.length === 0 ? <ExState title="Chưa có phiên bản" message="Thành viên nhóm có thể nộp phiên bản đầu tiên khi Backend đang mở giai đoạn thực hiện." /> : versions && <>
        <div className="deliverable-history">{versions.items.map((version) => <article key={version.id} className="deliverable-history-row"><div><h3>Phiên bản {version.versionNumber}</h3><p>{version.note || 'Không có ghi chú.'}</p><small>Nộp {formatDate(version.submittedAt)}</small></div><span className={`ex-badge ex-badge-${version.status}`}>{statusLabel[version.status] ?? version.status}</span><div className="deliverable-file-list">{version.files.map((file) => <button key={file.id} className="ex-text-button" type="button" disabled={busy} onClick={() => void download(file)}><ExIcon name="download" />{file.fileName} ({formatBytes(file.sizeBytes)})</button>)}</div><button className="ex-text-button" type="button" onClick={() => void loadFeedback(version)}>Xem phản hồi</button>
          {actor === 'supervisor' && version.status === 'SUBMITTED' && version.versionNumber === selected.latestVersion && <form className="deliverable-review" onSubmit={(event) => reviewVersion(event, version)}><label>Quyết định<select name="decision"><option value="ACCEPTED">Chấp nhận</option><option value="REJECTED">Yêu cầu chỉnh sửa</option></select></label><label>Nhận xét bắt buộc<input aria-label={`Nhận xét V${version.versionNumber}`} name="feedback" required maxLength={10000} /></label><button className="ex-button ex-button-primary" disabled={busy}>Gửi đánh giá</button></form>}
        </article>)}</div>
        <ExPagination page={versions.page} pages={versions.totalPages} total={versions.totalCount} busy={detailLoading} onPage={(next) => void loadVersions(selected, next)} />
      </>}
    </section>}

    {selectedVersion && <section className="ex-panel" aria-labelledby="version-feedback-title"><div className="ex-panel-heading"><div><h2 id="version-feedback-title">Phản hồi phiên bản {selectedVersion.versionNumber}</h2><p>Nhận xét đã lưu của giảng viên hướng dẫn.</p></div><button className="ex-text-button" onClick={() => { setSelectedVersion(null); setFeedback(null) }}>Đóng</button></div>{detailLoading && !feedback ? <ExState loading /> : feedback && feedback.items.length === 0 ? <ExState title="Chưa có phản hồi" message="Phản hồi sẽ xuất hiện sau khi giảng viên đánh giá phiên bản." /> : feedback && <><ol className="deliverable-feedback">{feedback.items.map((item) => <li key={item.id}><p>{item.feedback}</p><time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time></li>)}</ol><ExPagination page={feedback.page} pages={feedback.totalPages} total={feedback.totalCount} busy={detailLoading} onPage={(next) => void loadFeedback(selectedVersion, next)} /></>}</section>}
  </ExecutionPage>
}

function DefinitionForm({ title, item, busy, onSubmit, onCancel }: { title: string; item: Deliverable | null; busy: boolean; onSubmit: (event: FormEvent<HTMLFormElement>, item?: Deliverable) => void; onCancel: () => void }) {
  return <section className={item ? 'deliverable-definition deliverable-definition-inline' : 'ex-panel deliverable-definition'}><div className="ex-panel-heading"><div><h2>{title}</h2><p>Loại và hạn nộp được Backend kiểm tra khi lưu.</p></div></div><form className="ex-form" onSubmit={(event) => onSubmit(event, item ?? undefined)}><fieldset disabled={busy}><div className="ex-fields"><label>Tên hạng mục *<input name="title" required maxLength={255} defaultValue={item?.title ?? ''} /></label><label>Loại hạng mục<input name="deliverableType" maxLength={50} defaultValue={item?.deliverableType ?? ''} /></label><label className="ex-full">Mô tả<textarea name="description" maxLength={10000} rows={4} defaultValue={item?.description ?? ''} /></label><label>Hạn nộp theo giờ Việt Nam<input name="dueAt" type="datetime-local" defaultValue={toDateTimeInput(item?.dueAt ?? null)} /></label></div><div className="ex-form-footer"><button className="ex-button" type="button" onClick={onCancel}>Hủy</button><button className="ex-button ex-button-primary">{busy ? 'Đang lưu…' : 'Lưu hạng mục'}</button></div></fieldset></form></section>
}

function definitionFromForm(form: HTMLFormElement): SaveDeliverable | null {
  const data = new FormData(form); const title = String(data.get('title') ?? '').trim()
  if (!title) return null
  return { title, milestoneId: null, description: String(data.get('description') ?? '').trim() || null, deliverableType: String(data.get('deliverableType') ?? '').trim() || null, dueAt: toUtc(String(data.get('dueAt') ?? '')) }
}
function positivePage(value: string | null) { const parsed = Number(value ?? 1); return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1 }
function toUtc(value: string): string | null { return value ? new Date(`${value}:00+07:00`).toISOString() : null }
function toDateTimeInput(value: string | null) { if (!value) return ''; const date = new Date(value); if (Number.isNaN(date.getTime())) return ''; return new Intl.DateTimeFormat('sv-SE', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(date).replace(' ', 'T') }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Thời gian không hợp lệ' : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(date) }
function formatBytes(value: number) { if (value < 1024) return `${value} B`; if (value < 1024 * 1024) return `${Math.ceil(value / 1024)} KB`; return `${(value / 1024 / 1024).toFixed(1)} MB` }
function isUploadFile(value: File | null): value is File { return Boolean(value && value.size > 0 && value.name) }
