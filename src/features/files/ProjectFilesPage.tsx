import { Modal } from '../../components/ui/Modal'
import { dateTimeLabel } from '../execution/execution-utils'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { useStudentJourney } from '../../app/context'
import { services } from '../../services/service-gateway'
import { getMeetings } from '../../services/api/meetings.api'
import { getProgressReports } from '../../services/api/progress-reports.api'
import { HttpError } from '../../services/http/http-client'
import { useAuthSession } from '../auth/context/useAuthSession'
import { getWorkspaceRole } from '../auth/utils/role-access'
import * as api from './project-files-api'
import type { FileParentType, ProjectFile, ProjectFileFilters } from './project-files-api'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { ListLoading } from '../../components/ui/ListLoading'

type ParentOption = { type: FileParentType; id: number; label: string }
type FilterDraft = { search: string; contentType: string; uploadedBy: string; from: string; to: string; parentType: string }

const emptyDraft: FilterDraft = { search: '', contentType: '', uploadedBy: '', from: '', to: '', parentType: '' }
const parentLabels: Record<string, string> = { TASK: 'Công việc', REPORT: 'Báo cáo tiến độ', MEETING: 'Cuộc họp', VERSION: 'Phiên bản hạng mục', FEEDBACK: 'Phản hồi' }

export function ProjectFilesPage() {
  const routeId = Number(useParams().projectId)
  const journey = useStudentJourney()
  const { session } = useAuthSession()
  const role = getWorkspaceRole(session?.user)
  const projectId = Number.isInteger(routeId) && routeId > 0 ? routeId : journey.project?.id
  const activeStudentProject = role === 'student' && journey.journeyState === 'ACTIVE' && journey.project?.id === projectId
  const isLeader = activeStudentProject && Boolean(journey.team?.members.some(member => member.userId === session?.user.id && member.isLeader))
  // Student routes have the ACTIVE journey guard and supervisor routes have the current-assignment guard.
  // This merely avoids suggesting an upload on a staff read-only route; the server remains the write authority.
  const canUpload = activeStudentProject || (role === 'lecturer' && Number.isInteger(routeId) && routeId > 0)
  const [draft, setDraft] = useState<FilterDraft>(emptyDraft)
  const [filters, setFilters] = useState<ProjectFileFilters>({ page: 1, pageSize: 20 })
  const [data, setData] = useState<{ items: ProjectFile[]; page: number; pageSize: number; totalCount: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ProjectFile | null>(null)
  const [parents, setParents] = useState<ParentOption[]>([])
  const [parentLoading, setParentLoading] = useState(false)
  const [parentError, setParentError] = useState<string | null>(null)
  const [parentRevision, setParentRevision] = useState(0)
  const [uploadType, setUploadType] = useState<FileParentType>('TASK')
  const [uploadParentId, setUploadParentId] = useState('')
  const [uploadFileName, setUploadFileName] = useState('Chưa chọn tệp')

  const load = useCallback(async () => {
    if (!projectId) { setLoading(false); setData(null); return }
    setLoading(true)
    try {
      setData(await api.getProjectFiles(projectId, filters))
      setError(null)
    } catch (reason) { setData(null); setError(fileError(reason, 'tải kho tệp')) }
    finally { setLoading(false) }
  }, [filters, projectId])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!projectId || !canUpload) { setParents([]); return }
    let active = true
    setParentLoading(true); setParentError(null)
    void Promise.all([
      services.task.getProjectTimeline(projectId),
      loadAllReports(projectId),
      loadAllMeetings(projectId),
    ]).then(([timeline, reports, meetings]) => {
      if (!active) return
      setParents([
        ...timeline.milestones.flatMap(milestone => milestone.tasks.map(task => ({ type: 'TASK' as const, id: task.id, label: `${milestone.title} · ${task.title}` }))),
        ...reports.filter(report => report.status === 'DRAFT').map(report => ({ type: 'REPORT' as const, id: report.id, label: `${report.reportType === 'WEEKLY' ? 'Báo cáo tuần' : 'Báo cáo tháng'} · ${report.periodStart.slice(0, 10)}` })),
        ...meetings.filter(meeting => meeting.status === 'SCHEDULED').map(meeting => ({ type: 'MEETING' as const, id: meeting.id, label: meeting.title })),
      ])
    }).catch(() => { if (active) setParentError('Chưa thể xác nhận hạng mục còn cho phép đính kèm tệp. Hãy tải lại trước khi tải lên.') })
      .finally(() => { if (active) setParentLoading(false) })
    return () => { active = false }
  }, [canUpload, parentRevision, projectId])

  const currentParents = useMemo(() => parents.filter(parent => parent.type === uploadType), [parents, uploadType])
  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const uploadedBy = Number(draft.uploadedBy)
    if (draft.uploadedBy && (!Number.isSafeInteger(uploadedBy) || uploadedBy < 1)) {
      setError('Người tải lên phải là mã người dùng dương.'); return
    }
    const from = startOfVietnamDay(draft.from)
    const to = endExclusiveOfVietnamDay(draft.to)
    if (from && to && from >= to) { setError('Ngày kết thúc phải sau ngày bắt đầu.'); return }
    setFilters({ page: 1, pageSize: 20, search: draft.search.trim() || undefined, contentType: draft.contentType.trim() || undefined, uploadedBy: draft.uploadedBy ? uploadedBy : undefined, from, to, parentType: draft.parentType || undefined })
  }

  async function download(file: ProjectFile) {
    setBusy(true); setError(null)
    try {
      const blob = await api.downloadProjectFile(file.id)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = file.fileName; anchor.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (reason) { setError(fileError(reason, 'tải tệp')) }
    finally { setBusy(false) }
  }

  async function remove() {
    if (!deleteTarget) return
    setBusy(true); setError(null); setNotice(null)
    try {
      await api.deleteProjectFile(deleteTarget.id)
      setDeleteTarget(null); setNotice('Đã xóa tệp. Danh sách đang được cập nhật.')
      await load()
    } catch (reason) {
      if (reason instanceof HttpError && reason.status === 409) await load()
      setError(reason instanceof HttpError && reason.status === 409 ? 'Dữ liệu hoặc trạng thái đã thay đổi. Danh sách đã được tải lại; hãy kiểm tra trước khi thao tác tiếp.' : fileError(reason, 'xóa tệp'))
    } finally { setBusy(false) }
  }

  function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const file = form.get('file')
    const parentId = Number(uploadParentId)
    if (!(file instanceof File) || !file.size) { setError('Hãy chọn một tệp để đính kèm.'); return }
    if (!currentParents.some(parent => parent.id === parentId)) { setError('Chọn hạng mục hiện còn được phép đính kèm.'); return }
    setBusy(true); setError(null); setNotice(null)
    void api.uploadProjectFile(uploadType, parentId, file).then(async () => {
      setUploadParentId(''); setUploadFileName('Chưa chọn tệp'); formElement.reset(); setNotice('Đã tải tệp lên. Danh sách đang được cập nhật.'); await load()
    }).catch(async reason => {
      if (reason instanceof HttpError && reason.status === 409) await load()
      setError(reason instanceof HttpError && reason.status === 409 ? 'Trạng thái hạng mục đã thay đổi. Danh sách đã được tải lại; hãy chọn lại trước khi tải tệp.' : fileError(reason, 'tải tệp lên'))
    }).finally(() => setBusy(false))
  }

  const canDelete = (file: ProjectFile) => file.uploadedBy === session?.user.id || isLeader || (canUpload && role === 'lecturer')
  const inputClass = 'min-h-11 min-w-0 w-full rounded-md border border-hairline bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#0f5b4e] focus:ring-2 focus:ring-[#0f5b4e]/15'
  return <WorkspacePage className="project-files-page space-y-5" title="Kho tệp đồ án" eyebrow={`Tài liệu đồ án • Đồ án #${projectId ?? '—'}`} description="Tìm và quản lý tài liệu theo công việc, báo cáo và cuộc họp của nhóm." action={data && !loading && <span className="text-sm text-slate-600"><strong className="font-mono text-xl text-[#0f5b4e]">{data.totalCount}</strong> tệp phù hợp</span>}>
    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><span>{error}</span><button type="button" className="min-h-10 font-semibold underline underline-offset-4" onClick={() => void load()}>Tải lại</button></div>}
    {notice && <div role="status" className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><span className="material-symbols-outlined text-[19px]" aria-hidden="true">check_circle</span>{notice}</div>}

    <form className="workspace-surface workspace-surface-padding grid gap-4 sm:grid-cols-2 lg:grid-cols-4" onSubmit={applyFilters}>
      <div className="flex items-center justify-between sm:col-span-2 lg:col-span-4"><div><h2 className="font-semibold text-slate-950">Bộ lọc tệp</h2><p className="mt-1 text-xs text-slate-500">Tìm theo tên, định dạng, người tải và nguồn phát sinh.</p></div><span className="material-symbols-outlined text-slate-400" aria-hidden="true">filter_list</span></div>
      <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:col-span-2">Tên tệp<input value={draft.search} maxLength={255} onChange={event => setDraft(current => ({ ...current, search: event.target.value }))} className={inputClass} placeholder="Ví dụ: biên bản họp, báo cáo…" /></label>
      <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Nguồn tệp<select value={draft.parentType} onChange={event => setDraft(current => ({ ...current, parentType: event.target.value }))} className={inputClass}><option value="">Tất cả nguồn</option>{Object.entries(parentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <div className="flex flex-wrap items-end gap-2"><button className="min-h-11 rounded-md bg-[#0f5b4e] px-5 text-sm font-semibold text-white hover:bg-[#0a493f] shadow-[0_2px_8px_-2px_rgba(15,91,78,0.25)] transition-all">Áp dụng</button><button type="button" className="min-h-11 px-2 text-sm font-semibold text-[#0f5b4e] hover:underline underline-offset-4" onClick={() => { setDraft(emptyDraft); setFilters({ page: 1, pageSize: 20 }) }}>Xóa lọc</button></div>
      <details className="sm:col-span-2 lg:col-span-4"><summary className="cursor-pointer text-sm font-semibold text-[#0f5b4e]">Lọc thêm theo ngày, định dạng và người tải</summary><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Loại nội dung<input value={draft.contentType} maxLength={100} onChange={event => setDraft(current => ({ ...current, contentType: event.target.value }))} className={inputClass} placeholder="application/pdf" /></label>
      <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Người tải lên (ID)<input value={draft.uploadedBy} inputMode="numeric" onChange={event => setDraft(current => ({ ...current, uploadedBy: event.target.value }))} className={inputClass} /></label>
      <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Từ ngày<input type="date" value={draft.from} onChange={event => setDraft(current => ({ ...current, from: event.target.value }))} className={inputClass} /></label>
      <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Đến hết ngày<input type="date" value={draft.to} onChange={event => setDraft(current => ({ ...current, to: event.target.value }))} className={inputClass} /></label>
</div></details>
    </form>

    {canUpload && <section className="workspace-surface workspace-surface-padding" aria-labelledby="upload-file-title">
      <div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-md bg-[#edf3f0] text-[#0f5b4e]"><span className="material-symbols-outlined text-[20px]" aria-hidden="true">upload_file</span></span><div><h2 id="upload-file-title" className="font-semibold text-slate-950">Đính kèm tệp</h2><p className="mt-1 text-sm leading-6 text-slate-600">Chọn công việc, báo cáo hoặc cuộc họp để đính kèm tài liệu.</p></div></div>
      {parentLoading ? <p role="status" className="mt-4 text-sm text-slate-600">Đang xác nhận hạng mục có thể đính kèm…</p> : parentError ? <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{parentError} <button type="button" className="font-semibold underline" onClick={() => setParentRevision(value => value + 1)}>Tải lại hạng mục</button></p> : <form className="mt-4 grid min-w-0 gap-3 md:grid-cols-[160px_minmax(0,1.3fr)_minmax(0,1fr)_auto] md:items-end" onSubmit={upload}>
        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Gắn với<select value={uploadType} disabled={busy} onChange={event => { setUploadType(event.target.value as FileParentType); setUploadParentId('') }} className={inputClass}><option value="TASK">Công việc</option><option value="REPORT">Báo cáo tiến độ</option><option value="MEETING">Cuộc họp</option></select></label>
        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Hạng mục<select required value={uploadParentId} disabled={busy || !currentParents.length} onChange={event => setUploadParentId(event.target.value)} className={inputClass}><option value="">{currentParents.length ? 'Chọn hạng mục' : 'Không có hạng mục phù hợp'}</option>{currentParents.map(parent => <option key={`${parent.type}-${parent.id}`} value={parent.id}>{parent.label}</option>)}</select></label>
        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Tệp<span className="relative grid min-h-11 min-w-0 grid-cols-[auto_minmax(0,1fr)] overflow-hidden rounded-md border border-hairline bg-white normal-case tracking-normal"><span className="flex items-center border-r border-hairline bg-[#edf3f0] px-3 text-xs font-semibold text-[#0f5b4e]">Chọn tệp</span><span className="truncate px-3 py-3 text-xs font-medium text-slate-500">{uploadFileName}</span><input required type="file" name="file" disabled={busy || !currentParents.length} className="absolute inset-0 cursor-pointer opacity-0" onChange={event => setUploadFileName(event.target.files?.[0]?.name || 'Chưa chọn tệp')} /></span></label>
        <button disabled={busy || !uploadParentId || !currentParents.length} className="min-h-11 rounded-md bg-[#0f5b4e] px-5 text-sm font-semibold text-white shadow-[0_2px_8px_-2px_rgba(15,91,78,0.25)] transition-all hover:bg-[#0a493f] disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Đang tải…' : 'Tải lên'}</button>
      </form>}
    </section>}

    <section className="workspace-surface" aria-labelledby="project-file-list"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-4 py-4 sm:px-6"><div><h2 id="project-file-list" className="font-semibold text-slate-950">Tệp trong phạm vi đồ án</h2><p className="mt-1 text-xs text-slate-500">Sắp xếp theo thời điểm cập nhật từ hệ thống.</p></div>{data && !loading && <span className="rounded-full border border-[#a7f3d0] bg-[#edf3f0] px-2.5 py-1 text-xs font-bold text-[#0f5b4e]">{data.totalCount} tệp</span>}</div>
      {loading ? <ListLoading label="Đang tải kho tệp…" /> : !projectId ? <p className="p-5 text-sm text-slate-600">Không tìm thấy đồ án để xem tệp.</p> : data && data.items.length === 0 ? <div className="p-8 text-center text-sm text-slate-600"><span className="material-symbols-outlined mb-2 block text-3xl text-slate-300" aria-hidden="true">folder_off</span>Chưa có tệp phù hợp. Hãy thay đổi bộ lọc hoặc đính kèm tệp mới.</div> : data && <><ul className="divide-y divide-hairline">{data.items.map(file => <li key={file.id} className="grid gap-3 px-4 py-4 text-sm transition-colors hover:bg-slate-50/80 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:px-5"><span className="grid size-10 place-items-center rounded-xl bg-[#edf3f0] text-[#0f5b4e]"><span className="material-symbols-outlined text-[20px]" aria-hidden="true">description</span></span><div className="min-w-0"><strong className="block break-words text-slate-950">{file.fileName}</strong><p className="mt-1 text-xs text-slate-600">{parentLabels[file.parentType] ?? file.parentType} <span className="font-mono">#{file.parentId}</span> · <span title={file.contentType || undefined}>{fileFormat(file.contentType, file.fileName)}</span> · <span className="font-mono">{formatBytes(file.sizeBytes)}</span></p><p className="mt-1 text-xs text-slate-500">Tải bởi <span>{journey.team?.members.find(member => member.userId === file.uploadedBy)?.fullName ?? `Tài khoản #${file.uploadedBy}`}</span> · {dateTimeLabel(file.createdAt)}</p></div><div className="flex flex-wrap gap-2"><button type="button" disabled={busy} className="min-h-10 rounded-md border border-slate-200 px-3.5 font-semibold text-[#0f5b4e] hover:border-[#0f5b4e]/30 hover:bg-[#edf3f0] disabled:opacity-50 transition-all" onClick={() => void download(file)}>Tải xuống</button>{canDelete(file) && <button type="button" disabled={busy} className="min-h-10 rounded-md px-2.5 font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 transition-colors" onClick={() => setDeleteTarget(file)}>Xóa</button>}</div></li>)}</ul><nav aria-label="Phân trang kho tệp" className="flex items-center justify-between gap-3 border-t border-hairline px-4 py-3 text-sm sm:px-6"><button type="button" disabled={busy || data.page <= 1} className="min-h-10 rounded-md border border-hairline px-3 font-semibold text-[#0f5b4e] disabled:opacity-40" onClick={() => setFilters(current => ({ ...current, page: (current.page ?? 1) - 1 }))}>Trang trước</button><span className="font-mono text-xs text-slate-600">Trang {data.page} / {totalPages} · {data.totalCount} tệp</span><button type="button" disabled={busy || data.page >= totalPages} className="min-h-10 rounded-md border border-hairline px-3 font-semibold text-[#0f5b4e] disabled:opacity-40" onClick={() => setFilters(current => ({ ...current, page: (current.page ?? 1) + 1 }))}>Trang sau</button></nav></>}
    </section>
    {deleteTarget && <Modal open busy={busy} title={`Xóa tệp “${deleteTarget.fileName}”?`} description="Tệp sẽ được xóa khỏi hạng mục đang lưu trữ. Thao tác này không thể hoàn tác." onClose={() => setDeleteTarget(null)}><div className="app-modal__actions"><button type="button" disabled={busy} className="app-modal__button" onClick={() => setDeleteTarget(null)}>Giữ lại</button><button type="button" disabled={busy} className="app-modal__button app-modal__button--danger" onClick={() => void remove()}>{busy ? 'Đang xóa…' : 'Xác nhận xóa'}</button></div></Modal>}
  </WorkspacePage>
}

function startOfVietnamDay(value: string) { return value ? new Date(`${value}T00:00:00+07:00`).toISOString() : undefined }
function endExclusiveOfVietnamDay(value: string) {
  if (!value) return undefined
  const next = new Date(`${value}T00:00:00+07:00`)
  next.setUTCDate(next.getUTCDate() + 1)
  return next.toISOString()
}
async function loadAllReports(projectId: number) {
  const first = await getProgressReports(projectId, { page: 1, pageSize: 100 })
  const pages = await Promise.all(Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, index) => getProgressReports(projectId, { page: index + 2, pageSize: 100 })))
  return [first, ...pages].flatMap(page => page.items)
}
async function loadAllMeetings(projectId: number) {
  const first = await getMeetings(projectId, { page: 1, pageSize: 100 })
  const pages = await Promise.all(Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, index) => getMeetings(projectId, { page: index + 2, pageSize: 100 })))
  return [first, ...pages].flatMap(page => page.items)
}
function formatBytes(value: number) { return value < 1024 ? `${value} B` : value < 1024 * 1024 ? `${Math.ceil(value / 1024)} KB` : `${(value / 1024 / 1024).toFixed(1)} MB` }
function fileError(reason: unknown, action: string) {
  if (!(reason instanceof HttpError)) return `Không thể ${action}. Hãy thử lại.`
  if (reason.status === 400) return 'Dữ liệu lọc hoặc tệp không hợp lệ.'
  if (reason.status === 401) return 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.'
  if (reason.status === 403) return 'Bạn không có quyền thao tác với tệp hoặc hạng mục này.'
  if (reason.status === 404) return 'Không tìm thấy tệp hoặc hạng mục liên quan.'
  if (reason.status === 409) return 'Dữ liệu hoặc trạng thái hạng mục đã thay đổi. Hãy tải lại trước khi thử tiếp.'
  return `Không thể ${action}. Hãy thử lại.`
}




function fileFormat(contentType: string | null | undefined, fileName: string) {
  const formats: Record<string, string> = { 'application/pdf': 'PDF', 'application/zip': 'ZIP', 'application/x-zip-compressed': 'ZIP', 'text/plain': 'Văn bản', 'text/csv': 'CSV', 'application/msword': 'Word', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word', 'application/vnd.ms-excel': 'Excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel', 'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint', 'image/png': 'PNG', 'image/jpeg': 'JPEG', 'image/webp': 'WebP' }
  return formats[contentType ?? ''] ?? (fileName.includes('.') ? fileName.split('.').at(-1)?.toUpperCase() : 'Tệp đính kèm')
}
