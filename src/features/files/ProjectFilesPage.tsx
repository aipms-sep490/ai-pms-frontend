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

  const load = useCallback(async () => {
    if (!projectId) { setLoading(false); setData(null); return }
    setLoading(true)
    try {
      setData(await api.getProjectFiles(projectId, filters))
      setError(null)
    } catch (reason) { setError(fileError(reason, 'tải kho tệp')) }
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
      setDeleteTarget(null); setNotice('Đã xóa tệp. Danh sách đang được đồng bộ từ Backend.')
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
      setUploadParentId(''); formElement.reset(); setNotice('Đã tải tệp lên. Danh sách đang được đồng bộ từ Backend.'); await load()
    }).catch(async reason => {
      if (reason instanceof HttpError && reason.status === 409) await load()
      setError(reason instanceof HttpError && reason.status === 409 ? 'Trạng thái hạng mục đã thay đổi. Danh sách đã được tải lại; hãy chọn lại trước khi tải tệp.' : fileError(reason, 'tải tệp lên'))
    }).finally(() => setBusy(false))
  }

  const canDelete = (file: ProjectFile) => file.uploadedBy === session?.user.id || isLeader || (canUpload && role === 'lecturer')
  return <main className="mx-auto max-w-6xl space-y-5 pb-12">
    <header><h1 className="text-2xl font-bold text-slate-900">Kho tệp đồ án</h1><p className="mt-1 text-sm text-slate-600">Project #{projectId ?? '—'}. Tệp luôn thuộc một công việc, báo cáo hoặc cuộc họp; quyền và trạng thái được Backend kiểm tra khi thao tác.</p></header>
    {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error} <button type="button" className="font-semibold underline" onClick={() => void load()}>Tải lại</button></p>}
    {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{notice}</p>}
    <form className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4" onSubmit={applyFilters}>
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 sm:col-span-2">Tìm tên tệp<input value={draft.search} maxLength={255} onChange={event => setDraft(current => ({ ...current, search: event.target.value }))} className="min-h-11 rounded-lg border border-slate-300 px-3" placeholder="Ví dụ: minutes, report…" /></label>
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">Loại nội dung (MIME)<input value={draft.contentType} maxLength={100} onChange={event => setDraft(current => ({ ...current, contentType: event.target.value }))} className="min-h-11 rounded-lg border border-slate-300 px-3" placeholder="application/pdf" /></label>
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">Người tải lên (ID)<input value={draft.uploadedBy} inputMode="numeric" onChange={event => setDraft(current => ({ ...current, uploadedBy: event.target.value }))} className="min-h-11 rounded-lg border border-slate-300 px-3" /></label>
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">Từ ngày<input type="date" value={draft.from} onChange={event => setDraft(current => ({ ...current, from: event.target.value }))} className="min-h-11 rounded-lg border border-slate-300 px-3" /></label>
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">Đến hết ngày<input type="date" value={draft.to} onChange={event => setDraft(current => ({ ...current, to: event.target.value }))} className="min-h-11 rounded-lg border border-slate-300 px-3" /></label>
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">Nguồn tệp<select value={draft.parentType} onChange={event => setDraft(current => ({ ...current, parentType: event.target.value }))} className="min-h-11 rounded-lg border border-slate-300 px-3"><option value="">Tất cả</option>{Object.entries(parentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <div className="flex flex-wrap items-end gap-3"><button className="min-h-11 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white">Áp dụng</button><button type="button" className="min-h-11 font-semibold text-blue-700 underline" onClick={() => { setDraft(emptyDraft); setFilters({ page: 1, pageSize: 20 }) }}>Xóa lọc</button></div>
    </form>
    {canUpload && <section className="rounded-xl border bg-white p-5" aria-labelledby="upload-file-title"><div><h2 id="upload-file-title" className="font-semibold">Đính kèm tệp</h2><p className="mt-1 text-sm text-slate-600">Chỉ các hạng mục hiện còn chỉnh sửa được mới xuất hiện. Backend sẽ kiểm tra lại quyền, trạng thái ACTIVE và parent khi nhận tệp.</p></div>{parentLoading ? <p role="status" className="mt-3 text-sm">Đang xác nhận hạng mục có thể đính kèm…</p> : parentError ? <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{parentError} <button type="button" className="font-semibold underline" onClick={() => setParentRevision(value => value + 1)}>Tải lại hạng mục</button></p> : <form className="mt-4 grid gap-3 md:grid-cols-[180px_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end" onSubmit={upload}><label className="flex flex-col gap-1 text-sm font-medium text-slate-700">Gắn với<select value={uploadType} disabled={busy} onChange={event => { setUploadType(event.target.value as FileParentType); setUploadParentId('') }} className="min-h-11 rounded-lg border border-slate-300 px-3"><option value="TASK">Công việc</option><option value="REPORT">Báo cáo tiến độ</option><option value="MEETING">Cuộc họp</option></select></label><label className="flex flex-col gap-1 text-sm font-medium text-slate-700">Hạng mục<select required value={uploadParentId} disabled={busy || !currentParents.length} onChange={event => setUploadParentId(event.target.value)} className="min-h-11 rounded-lg border border-slate-300 px-3"><option value="">{currentParents.length ? 'Chọn hạng mục' : 'Không có hạng mục phù hợp'}</option>{currentParents.map(parent => <option key={`${parent.type}-${parent.id}`} value={parent.id}>{parent.label}</option>)}</select></label><label className="flex flex-col gap-1 text-sm font-medium text-slate-700">Tệp<input required type="file" name="file" disabled={busy || !currentParents.length} className="min-h-11 max-w-full text-sm" /></label><button disabled={busy || !uploadParentId || !currentParents.length} className="min-h-11 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Đang tải…' : 'Tải lên'}</button></form>}</section>}
    <section className="overflow-hidden rounded-xl border bg-white" aria-labelledby="project-file-list"><div className="border-b px-5 py-4"><h2 id="project-file-list" className="font-semibold">Tệp trong phạm vi đồ án</h2><p className="mt-1 text-xs text-slate-600">Mốc thời gian bộ lọc được gửi theo UTC; thao tác xóa luôn cần xác nhận.</p></div>{loading ? <p role="status" className="p-5 text-sm">Đang tải kho tệp…</p> : !projectId ? <p className="p-5 text-sm text-slate-600">Không tìm thấy Project để xem tệp.</p> : data && data.items.length === 0 ? <p className="p-5 text-sm text-slate-600">Chưa có tệp phù hợp. Thay đổi bộ lọc hoặc thêm tệp vào một hạng mục khi bạn có quyền.</p> : data && <><ul className="divide-y">{data.items.map(file => <li key={file.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm"><div className="min-w-0"><strong className="block break-words text-slate-900">{file.fileName}</strong><p className="mt-1 text-xs text-slate-600">{parentLabels[file.parentType] ?? file.parentType} #{file.parentId} · {file.contentType || 'Chưa khai báo MIME'} · {formatBytes(file.sizeBytes)}</p><p className="mt-1 text-xs text-slate-500">Tải bởi #{file.uploadedBy} · {formatDate(file.createdAt)}</p></div><div className="flex flex-wrap gap-3"><button type="button" disabled={busy} className="min-h-11 font-semibold text-blue-700 underline disabled:opacity-50" onClick={() => void download(file)}>Tải xuống</button>{canDelete(file) && <button type="button" disabled={busy} className="min-h-11 font-semibold text-rose-700 underline disabled:opacity-50" onClick={() => setDeleteTarget(file)}>Xóa</button>}</div></li>)}</ul><nav aria-label="Phân trang kho tệp" className="flex items-center justify-between gap-3 border-t px-5 py-3 text-sm"><button type="button" disabled={busy || data.page <= 1} className="min-h-11 font-semibold text-blue-700 underline disabled:opacity-40" onClick={() => setFilters(current => ({ ...current, page: (current.page ?? 1) - 1 }))}>Trang trước</button><span>Trang {data.page} / {totalPages} · {data.totalCount} tệp</span><button type="button" disabled={busy || data.page >= totalPages} className="min-h-11 font-semibold text-blue-700 underline disabled:opacity-40" onClick={() => setFilters(current => ({ ...current, page: (current.page ?? 1) + 1 }))}>Trang sau</button></nav></>}</section>
    {deleteTarget && <section role="alertdialog" aria-modal="true" aria-labelledby="delete-file-title" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900"><h2 id="delete-file-title" className="font-semibold">Xóa tệp “{deleteTarget.fileName}”?</h2><p className="mt-2">Backend chỉ xóa khi bạn còn quyền trên hạng mục chứa tệp. Hành động này không thể hoàn tác từ giao diện.</p><div className="mt-4 flex flex-wrap gap-3"><button type="button" disabled={busy} className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 font-semibold disabled:opacity-50" onClick={() => setDeleteTarget(null)}>Giữ lại</button><button type="button" disabled={busy} className="min-h-11 rounded-lg bg-rose-700 px-4 font-semibold text-white disabled:opacity-50" onClick={() => void remove()}>{busy ? 'Đang xóa…' : 'Xác nhận xóa'}</button></div></section>}
  </main>
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
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Thời gian không hợp lệ' : date.toLocaleString('vi-VN') }
function fileError(reason: unknown, action: string) {
  if (!(reason instanceof HttpError)) return `Không thể ${action}. Hãy thử lại.`
  if (reason.status === 400) return 'Dữ liệu lọc hoặc tệp không hợp lệ.'
  if (reason.status === 401) return 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.'
  if (reason.status === 403) return 'Backend không cấp quyền thao tác tệp hoặc hạng mục này.'
  if (reason.status === 404) return 'Không tìm thấy tệp hoặc hạng mục liên quan.'
  if (reason.status === 409) return 'Dữ liệu hoặc trạng thái hạng mục đã thay đổi. Hãy tải lại trước khi thử tiếp.'
  return `Không thể ${action}. Hãy thử lại.`
}
