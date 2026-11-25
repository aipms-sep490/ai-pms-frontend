import { Avatar } from '../../components/ui/Avatar'
import { Modal } from '../../components/ui/Modal'
import { DocumentPreviewModal } from '../../components/ui/DocumentPreviewModal'
import { Pagination } from '../../components/ui/Pagination'
import { StatTileRow } from '../../components/ui/StatTileRow'
import { FilterToolbar } from '../../components/ui/FilterToolbar'
import type { FilterChipItem } from '../../components/ui/FilterChips'
import { dateTimeLabel, utcTimestamp } from '../execution/execution-utils'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useStudentJourney } from '../../app/context'
import { services } from '../../services/service-gateway'
import { getMeetings } from '../../services/api/meetings.api'
import { getDeliverables, getDeliverableVersions } from '../../services/api/deliverables.api'
import { getProgressReports } from '../../services/api/progress-reports.api'
import { HttpError } from '../../services/http/http-client'
import { useAuthSession } from '../auth/context/useAuthSession'
import { getWorkspaceRole } from '../auth/utils/role-access'
import * as api from './project-files-api'
import type { FileParentType, ProjectFile, ProjectFileFilters } from './project-files-api'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { ListLoading } from '../../components/ui/ListLoading'
import { getUploadPolicy, uploadPolicyLabel, validateUploadFile, type UploadPolicy } from '../../services/api/upload-policies.api'
import { cancelProjectFileUpload, getSavedProjectFileUploads, type ProjectFileUploadSession, type SavedProjectFileUpload } from './project-file-uploads'

type ParentOption = { type: FileParentType; id: number; label: string }
type FileSort = 'newest' | 'oldest' | 'name_asc' | 'size_desc'

const parentLabels: Record<string, string> = { TASK: 'Công việc', REPORT: 'Báo cáo tiến độ', MEETING: 'Cuộc họp', VERSION: 'Phiên bản hạng mục', FEEDBACK: 'Phản hồi' }
const formatLabels: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word (.docx)',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel (.xlsx)',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint (.pptx)',
  'application/zip': 'Tệp nén (.zip)',
  'image/png': 'Ảnh PNG',
  'image/jpeg': 'Ảnh JPEG',
}

export function ProjectFilesPage() {
  const location = useLocation()
  const routeId = Number(useParams().projectId)
  const journey = useStudentJourney()
  const { session } = useAuthSession()
  const role = getWorkspaceRole(session?.user)
  const projectId = Number.isInteger(routeId) && routeId > 0 ? routeId : journey.project?.id
  const executionBase = useMemo(() => {
    const mentorMatch = location.pathname.match(/^(\/mentor\/projects\/\d+\/majors\/\d+)/)
    if (mentorMatch) return mentorMatch[1]
    if (location.pathname.startsWith('/supervisor/projects/') && projectId) return `/supervisor/projects/${projectId}`
    if (location.pathname.startsWith('/project/')) return '/project'
    if (role === 'student') return '/project'
    if (role === 'lecturer' && projectId) return `/supervisor/projects/${projectId}`
    return null
  }, [location.pathname, projectId, role])
  const parentHref = (file: ProjectFile): string | null => {
    if (!executionBase) return null
    if (file.parentType === 'TASK') return `${executionBase}/tasks/${file.parentId}`
    if (file.parentType === 'REPORT') return `${executionBase}/reports/${file.parentId}`
    if (file.parentType === 'MEETING') return `${executionBase}/meetings/${file.parentId}`
    if (file.parentType === 'VERSION') return `${executionBase}/deliverables`
    return null
  }
  const activeStudentProject = role === 'student' && journey.journeyState === 'ACTIVE' && journey.project?.id === projectId
  const canUpload = activeStudentProject || (role === 'lecturer' && Number.isInteger(routeId) && routeId > 0)

  const [filters, setFilters] = useState<ProjectFileFilters>({ page: 1, pageSize: 12 })
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [sortBy, setSortBy] = useState<FileSort>('newest')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [data, setData] = useState<{ items: ProjectFile[]; page: number; pageSize: number; totalCount: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ProjectFile | null>(null)
  const [previewTarget, setPreviewTarget] = useState<ProjectFile | null>(null)
  const [parents, setParents] = useState<ParentOption[]>([])
  const [versionLabels, setVersionLabels] = useState<Record<number, string>>({})
  const versionCacheRef = useRef<Record<number, string>>({})

  useEffect(() => {
    versionCacheRef.current = {}
    setVersionLabels({})
  }, [projectId])

  useEffect(() => {
    if (!projectId || !data?.items.some(file => file.parentType === 'VERSION')) return
    const unresolved = new Set(
      data.items
        .filter(file => file.parentType === 'VERSION' && !versionCacheRef.current[file.parentId])
        .map(file => file.parentId),
    )
    if (!unresolved.size) {
      setVersionLabels({ ...versionCacheRef.current })
      return
    }
    let active = true
    void (async () => {
      const result = await getDeliverables(projectId, { page: 1, pageSize: 100 })
      const resolved: Record<number, string> = { ...versionCacheRef.current }
      await Promise.all(result.items.map(async (item) => {
        if (!active || !unresolved.size) return
        const versions = await getDeliverableVersions(item.id, 1, 100).catch(() => null)
        if (!versions) return
        for (const version of versions.items) {
          if (unresolved.has(version.id)) {
            resolved[version.id] = `${item.title} · V${version.versionNumber}`
            unresolved.delete(version.id)
          }
        }
      }))
      if (active) {
        versionCacheRef.current = resolved
        setVersionLabels(resolved)
      }
    })().catch(() => { /* Keep a readable generic label when source access is denied. */ })
    return () => { active = false }
  }, [projectId, data])

  const [parentLoading, setParentLoading] = useState(false)
  const [parentError, setParentError] = useState<string | null>(null)
  const [parentRevision, setParentRevision] = useState(0)
  const [uploadType, setUploadType] = useState<FileParentType>('TASK')
  const [uploadPolicy, setUploadPolicy] = useState<UploadPolicy | null>(null)
  const [policyLoaded, setPolicyLoaded] = useState(false)
  useEffect(() => {
    let active = true
    setUploadPolicy(null); setPolicyLoaded(false)
    void getUploadPolicy(uploadType).then(policy => { if (active) { setUploadPolicy(policy); setPolicyLoaded(true) } })
      .catch(() => { if (active) setPolicyLoaded(true) })
    return () => { active = false }
  }, [uploadType])

  const [uploadParentId, setUploadParentId] = useState('')
  const [uploadFileName, setUploadFileName] = useState('Chưa chọn tệp')
  const [uploadProgress, setUploadProgress] = useState<ProjectFileUploadSession | null>(null)
  const [savedUploads, setSavedUploads] = useState<SavedProjectFileUpload[]>([])
  const uploadController = useRef<AbortController | null>(null)
  const uploadForm = useRef<HTMLFormElement | null>(null)
  const ownerId = session?.user.id
  const refreshSavedUploads = useCallback(() => setSavedUploads(ownerId == null ? [] : getSavedProjectFileUploads(ownerId)), [ownerId])

  useEffect(() => {
    refreshSavedUploads(); setUploadProgress(null); setUploadFileName('Chưa chọn tệp'); setUploadParentId(''); setBusy(false)
    uploadForm.current?.reset()
    return () => { uploadController.current?.abort(); uploadController.current = null }
  }, [ownerId, projectId, refreshSavedUploads])

  const load = useCallback(async () => {
    if (!projectId) { setLoading(false); setData(null); return }
    setLoading(true)
    try {
      setData(await api.getProjectFiles(projectId, filters))
      setError(null)
    } catch (reason) {
      setData(null)
      setError(fileError(reason, 'tải kho tệp'))
    } finally {
      setLoading(false)
    }
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
        ...reports.filter(report => report.status === 'DRAFT').map(report => ({ type: 'REPORT' as const, id: report.id, label: `${report.reportType === 'WEEKLY' ? 'Báo cáo tuần' : 'Báo cáo tháng'} · ${new Date(report.periodStart).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}` })),
        ...meetings.filter(meeting => meeting.status === 'SCHEDULED').map(meeting => ({ type: 'MEETING' as const, id: meeting.id, label: meeting.title })),
      ])
    }).catch(() => { if (active) setParentError('Chưa thể xác nhận hạng mục còn cho phép đính kèm tệp. Hãy tải lại trước khi tải lên.') })
      .finally(() => { if (active) setParentLoading(false) })
    return () => { active = false }
  }, [canUpload, parentRevision, projectId])

  const currentParents = useMemo(() => parents.filter(parent => parent.type === uploadType), [parents, uploadType])
  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1

  const sortedItems = useMemo(() => {
    const items = data?.items ?? []
    return [...items].sort((a, b) => {
      if (sortBy === 'oldest') return utcTimestamp(a.createdAt) - utcTimestamp(b.createdAt)
      if (sortBy === 'name_asc') return a.fileName.localeCompare(b.fileName, 'vi-VN')
      if (sortBy === 'size_desc') return b.sizeBytes - a.sizeBytes
      return utcTimestamp(b.createdAt) - utcTimestamp(a.createdAt)
    })
  }, [data, sortBy])

  function updateDateRange(nextFrom: string, nextTo: string) {
    setFromDate(nextFrom)
    setToDate(nextTo)
    const fromIso = startOfVietnamDay(nextFrom)
    const toIso = endExclusiveOfVietnamDay(nextTo)
    if (fromIso && toIso && fromIso >= toIso) {
      setError('Ngày kết thúc phải sau ngày bắt đầu.')
      return
    }
    setError(null)
    setFilters(current => ({ ...current, page: 1, from: fromIso, to: toIso }))
  }

  function clearAllFilters() {
    setFromDate('')
    setToDate('')
    setSortBy('newest')
    setError(null)
    setFilters({ page: 1, pageSize: filters.pageSize ?? 12 })
  }

  const activeFilterChips = useMemo<FilterChipItem[]>(() => {
    const chips: FilterChipItem[] = []
    if (filters.search) chips.push({ id: 'search', label: 'Tên tệp', value: filters.search })
    if (filters.parentType) chips.push({ id: 'parentType', label: 'Nguồn', value: parentLabels[filters.parentType] ?? filters.parentType })
    if (filters.contentType) chips.push({ id: 'contentType', label: 'Định dạng', value: formatLabels[filters.contentType] ?? filters.contentType })
    if (filters.uploadedBy) {
      const member = journey.team?.members.find(m => m.userId === filters.uploadedBy)
      chips.push({ id: 'uploadedBy', label: 'Người tải', value: member?.fullName ?? 'Thành viên' })
    }
    if (fromDate) chips.push({ id: 'from', label: 'Từ ngày', value: fromDate })
    if (toDate) chips.push({ id: 'to', label: 'Đến ngày', value: toDate })
    return chips
  }, [filters, journey.team, fromDate, toDate])

  async function download(file: ProjectFile) {
    setBusy(true); setError(null)
    try {
      await api.saveProjectFile(file)
    } catch (reason) {
      if (!(reason instanceof Error && reason.name === 'AbortError')) setError(fileError(reason, 'tải tệp'))
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!deleteTarget || busy || !data?.items.some(file => file.id === deleteTarget.id && file.canDelete === true)) return
    setBusy(true); setError(null); setNotice(null)
    try {
      await api.deleteProjectFile(deleteTarget.id)
      setDeleteTarget(null); setNotice('Đã xóa tệp. Danh sách đang được cập nhật.')
      await load()
    } catch (reason) {
      if (reason instanceof HttpError && reason.status === 409) await load()
      setError(reason instanceof HttpError && reason.status === 409 ? 'Dữ liệu hoặc trạng thái đã thay đổi. Danh sách đã được tải lại; hãy kiểm tra trước khi thao tác tiếp.' : fileError(reason, 'xóa tệp'))
    } finally {
      setBusy(false)
    }
  }

  function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (uploadController.current || busy) return
    const formElement = event.currentTarget
    const input = formElement.elements.namedItem('file')
    const file = input instanceof HTMLInputElement ? input.files?.[0] : undefined
    const parentId = Number(uploadParentId)
    if (!(file instanceof File) || !file.size) { setError('Hãy chọn một tệp để đính kèm.'); return }
    const policyError = validateUploadFile(file, uploadPolicy)
    if (policyError) { setError(policyError); return }
    if (!currentParents.some(parent => parent.id === parentId)) { setError('Chọn hạng mục hiện còn được phép đính kèm.'); return }
    const controller = new AbortController()
    uploadController.current = controller
    setBusy(true); setError(null); setNotice(null)
    void api.uploadProjectFile(uploadType, parentId, file, {
      ownerId, signal: controller.signal, useSession: Boolean(uploadPolicy?.chunkSizeBytes),
      onProgress: progress => { if (uploadController.current === controller) setUploadProgress(progress) },
    }).then(async () => {
      if (uploadController.current !== controller) return
      setUploadProgress(null); setUploadParentId(''); setUploadFileName('Chưa chọn tệp'); formElement.reset(); setUploadOpen(false)
      setNotice('Đã tải tệp lên. Danh sách đang được cập nhật.')
      await load()
    }).catch(async reason => {
      if (uploadController.current !== controller) return
      if (controller.signal.aborted) { setNotice('Đã tạm dừng. Chọn lại đúng tệp nếu bạn quay lại trang, rồi bấm Tiếp tục tải.'); return }
      if (reason instanceof HttpError && reason.status === 409) await load()
      setError(reason instanceof HttpError && reason.status === 409 ? 'Trạng thái hạng mục hoặc phiên tải đã thay đổi. Nội dung đã chọn được giữ lại; hãy kiểm tra rồi tiếp tục.' : reason instanceof HttpError ? fileError(reason, 'tải tệp lên') : reason instanceof Error ? reason.message : fileError(reason, 'tải tệp lên'))
    }).finally(() => {
      if (uploadController.current === controller) { uploadController.current = null; setBusy(false); refreshSavedUploads() }
    })
  }

  async function cancelUpload(sessionId: string) {
    if (ownerId == null || busy) return
    setBusy(true); setError(null)
    try {
      await cancelProjectFileUpload(sessionId, ownerId)
      setUploadProgress(null); refreshSavedUploads()
      setNotice('Đã hủy phiên tải. Tệp trên máy của bạn vẫn được giữ nguyên.')
    } catch (reason) {
      setError(fileError(reason, 'hủy phiên tải'))
    } finally {
      setBusy(false)
    }
  }

  const canDelete = (file: ProjectFile) => file.canDelete === true
  const resumableUploads = savedUploads.filter(saved => parents.some(parent => parent.type === saved.parentType && parent.id === saved.parentId))
  const inputClass = 'min-h-11 min-w-0 w-full rounded-md border border-hairline bg-card px-3 text-sm font-normal normal-case tracking-normal text-ink outline-none placeholder:text-ink-muted focus:border-primary focus:ring-2 focus:ring-primary/15'
  const hasActiveFilters = activeFilterChips.length > 0 || sortBy !== 'newest'

  const backTo = Number.isInteger(routeId) && routeId > 0
    ? (role === 'department' || role === 'admin' ? '/department/portfolio' : `/supervisor/projects/${routeId}/workspace`)
    : undefined
  const backLabel = role === 'department' || role === 'admin' ? 'Danh mục đồ án' : 'Tổng quan đồ án'

  return (
    <WorkspacePage
      className="project-files-page space-y-5"
      title="Kho tệp đồ án"
      eyebrow={journey.project?.code ? `Kho tài liệu • ${journey.project.code}` : 'Kho tài liệu đồ án'}
      backTo={backTo}
      backLabel={backLabel}
      description="Tìm và quản lý tài liệu theo công việc, báo cáo và cuộc họp của nhóm."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="ex-button ex-button-icon" aria-label="Làm mới" title="Làm mới" disabled={loading} onClick={() => void load()}>
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">refresh</span>
          </button>
          {canUpload && (
            <button type="button" className="ex-button ex-button-primary" onClick={() => { setError(null); setUploadOpen(true) }}>
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">upload_file</span>
              Đính kèm tệp
            </button>
          )}
        </div>
      }
    >
      {error && !uploadOpen && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">
          <span>{error}</span>
          <button type="button" className="min-h-10 font-semibold underline underline-offset-4" onClick={() => void load()}>Tải lại</button>
        </div>
      )}
      {notice && (
        <div role="status" className="flex items-center gap-2 rounded-lg border border-hairline border-l-4 border-l-status-success-text bg-card p-4 text-sm text-ink shadow-xs">
          <span className="material-symbols-outlined text-[19px] text-status-success-text" aria-hidden="true">check_circle</span>
          <span>{notice}</span>
        </div>
      )}

      {canUpload && !busy && resumableUploads.length > 0 && (
        <section className="workspace-surface p-4 space-y-2" aria-label="Phiên tải đang dang dở">
          {resumableUploads.map(saved => (
            <div key={saved.sessionId} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-hairline bg-canvas p-3 text-sm">
              <p className="min-w-0 break-words">Phiên tải chưa xác nhận hoàn tất: <strong>{saved.fileName}</strong> · {formatBytes(saved.sizeBytes)}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="min-h-10 rounded-md bg-primary-subtle px-3 font-semibold text-primary" onClick={() => {
                  setUploadType(saved.parentType); setUploadParentId(String(saved.parentId)); setUploadProgress(null); setUploadOpen(true)
                  setNotice(`Chọn lại tệp “${saved.fileName}” có cùng kích thước và thời gian sửa, rồi bấm Tiếp tục tải để tiếp tục.`)
                }}>Chọn để tiếp tục</button>
                <button type="button" className="min-h-10 rounded-md px-3 font-semibold text-status-error-text" onClick={() => void cancelUpload(saved.sessionId)}>Hủy phiên</button>
              </div>
            </div>
          ))}
        </section>
      )}

      <StatTileRow
        tiles={[
          { icon: 'folder_open', label: 'Tổng tệp đồ án', value: data ? data.totalCount : null, caption: 'Theo bộ lọc nguồn và định dạng hiện tại', hero: true },
          { icon: 'inventory_2', label: 'Hạng mục & báo cáo', value: data ? data.items.filter(f => f.parentType === 'VERSION' || f.parentType === 'REPORT').length : null, caption: 'Tệp bàn giao và báo cáo trên trang này', tone: 'info' },
          { icon: 'assignment', label: 'Công việc & họp', value: data ? data.items.filter(f => f.parentType === 'TASK' || f.parentType === 'MEETING').length : null, caption: 'Tệp đính kèm thực thi trên trang này', tone: 'success' },
          { icon: 'storage', label: 'Dung lượng trang này', value: data ? formatBytes(data.items.reduce((sum, f) => sum + f.sizeBytes, 0)) : null, caption: `${data?.items.length ?? 0} tệp đang hiển thị`, tone: 'neutral' },
        ]}
      />

      <section className="workspace-surface overflow-hidden" aria-labelledby="project-file-list">
        <h2 id="project-file-list" className="sr-only">Tệp trong phạm vi đồ án</h2>

        <FilterToolbar
          embedded
          tabs={[
            { value: '', label: 'Tất cả nguồn' },
            ...Object.entries(parentLabels).map(([value, label]) => ({ value, label })),
          ]}
          activeTab={filters.parentType ?? ''}
          onTabChange={(val) => setFilters(current => ({ ...current, page: 1, parentType: val || undefined }))}
          search={filters.search ?? ''}
          onSearchChange={(val) => setFilters(current => ({ ...current, page: 1, search: val.trim() || undefined }))}
          searchLabel="Tên tệp"
          searchPlaceholder="Tìm theo tên tệp…"
          controls={
            <>
              <select
                aria-label="Định dạng tệp"
                value={filters.contentType ?? ''}
                onChange={(e) => setFilters(current => ({ ...current, page: 1, contentType: e.target.value || undefined }))}
              >
                <option value="">Tất cả định dạng</option>
                {Object.entries(formatLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              {(journey.team?.members?.length ?? 0) > 0 && (
                <select
                  aria-label="Người tải lên"
                  value={filters.uploadedBy ? String(filters.uploadedBy) : ''}
                  onChange={(e) => setFilters(current => ({ ...current, page: 1, uploadedBy: e.target.value ? Number(e.target.value) : undefined }))}
                >
                  <option value="">Tất cả thành viên</option>
                  {journey.team?.members.map(member => <option key={member.userId} value={member.userId}>{member.fullName}</option>)}
                </select>
              )}
            </>
          }
          sort={{
            value: sortBy,
            onChange: (val) => setSortBy(val as FileSort),
            options: [
              { value: 'newest', label: 'Mới tải lên' },
              { value: 'oldest', label: 'Cũ nhất' },
              { value: 'name_asc', label: 'Tên tệp A–Z' },
              { value: 'size_desc', label: 'Dung lượng lớn nhất' },
            ],
          }}
          advancedControls={
            <>
              <label>Từ ngày
                <input type="date" aria-label="Từ ngày" value={fromDate} onChange={(e) => updateDateRange(e.target.value, toDate)} />
              </label>
              <label>Đến hết ngày
                <input type="date" aria-label="Đến hết ngày" value={toDate} onChange={(e) => updateDateRange(fromDate, e.target.value)} />
              </label>
            </>
          }
          advancedActiveCount={Number(Boolean(fromDate)) + Number(Boolean(toDate))}
          advancedLabel="Khoảng ngày"
          activeChips={activeFilterChips}
          onRemoveChip={(chipId) => {
            if (chipId === 'from') updateDateRange('', toDate)
            else if (chipId === 'to') updateDateRange(fromDate, '')
            else setFilters(f => ({ ...f, [chipId]: undefined, page: 1 }))
          }}
          hasActiveFilters={hasActiveFilters}
          onClearAll={clearAllFilters}
          resultSummary={data ? `${sortedItems.length} / ${data.totalCount} tệp` : undefined}
          pagination={data ? { page: data.page, pages: totalPages, total: data.totalCount, pageSize: data.pageSize, busy: loading || busy, onPage: (nextPage) => setFilters(current => ({ ...current, page: nextPage })) } : undefined}
        />

        {loading ? (
          <ListLoading label="Đang tải kho tệp…" />
        ) : !projectId ? (
          <p className="p-5 text-sm text-ink-muted">Không tìm thấy đồ án để xem tệp.</p>
        ) : data && sortedItems.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-muted">
            <span className="material-symbols-outlined mb-2 block text-3xl text-ink-muted" aria-hidden="true">folder_off</span>
            <p>Chưa có tệp phù hợp. Hãy thay đổi bộ lọc hoặc đính kèm tệp mới.</p>
            <div className="mt-4 flex justify-center gap-2">
              {hasActiveFilters && <button type="button" className="ex-button" onClick={clearAllFilters}>Xóa bộ lọc</button>}
              {canUpload && <button type="button" className="ex-button ex-button-primary" onClick={() => setUploadOpen(true)}>Đính kèm tệp</button>}
            </div>
          </div>
        ) : data && (
          <>
            <ul className="divide-y divide-hairline">
              {sortedItems.map(file => {
                const parentLabel = (file.parentType === 'VERSION' ? versionLabels[file.parentId] : parents.find(parent => parent.type === file.parentType && parent.id === file.parentId)?.label) ?? parentLabels[file.parentType] ?? 'Tệp đồ án'
                const sourceHref = parentHref(file)
                const uploaderName = file.uploadedByName || journey.team?.members.find(member => member.userId === file.uploadedBy)?.fullName || 'Thành viên dự án'
                const visual = fileVisual(file.contentType, file.fileName)
                return (
                <li key={file.id} className="grid gap-3.5 px-4 py-4 text-sm transition-colors hover:bg-canvas/75 sm:px-5 lg:grid-cols-[42px_minmax(0,1.55fr)_minmax(200px,0.85fr)_auto] lg:items-center">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setPreviewTarget(file)}
                    aria-label={`Xem trước ${file.fileName}`}
                    className={`grid size-[42px] shrink-0 place-items-center rounded-xl border transition-opacity hover:opacity-85 ${visual.tone}`}
                  >
                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{visual.icon}</span>
                  </button>
                  <div className="min-w-0">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setPreviewTarget(file)}
                      className="block max-w-full truncate text-left text-sm font-bold text-ink transition-colors hover:text-primary hover:underline"
                      title={file.fileName}
                    >
                      {file.fileName}
                    </button>
                    <div className="mt-1.5 flex min-w-0 items-center gap-2 text-xs text-ink-muted">
                      <span className="inline-flex shrink-0 items-center rounded-full border border-hairline bg-canvas px-2 py-0.5 font-semibold text-ink-soft">
                        {parentLabels[file.parentType] ?? 'Tệp đồ án'}
                      </span>
                      {sourceHref ? (
                        <Link to={sourceHref} className="min-w-0 flex-1 truncate font-medium text-primary hover:underline" title={parentLabel}>
                          {parentLabel}
                        </Link>
                      ) : (
                        <span className="min-w-0 flex-1 truncate" title={parentLabel}>{parentLabel}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 lg:border-l lg:border-line lg:pl-4">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span title={file.contentType || undefined} className="inline-flex items-center rounded-md border border-hairline bg-canvas px-2 py-0.5 font-mono font-semibold text-ink-soft">
                        {fileFormat(file.contentType, file.fileName)} · {formatBytes(file.sizeBytes)}
                      </span>
                      <span className="font-mono text-xs text-ink-muted">{dateTimeLabel(file.createdAt)}</span>
                    </div>
                    <div className="flex min-w-0 items-center gap-2 text-xs text-ink-soft">
                      <Avatar name={uploaderName} size="xs" shape="circle" />
                      <span className="truncate font-medium">{uploaderName}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <button type="button" disabled={busy} className="flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border border-primary/20 bg-primary-subtle px-3 text-xs font-semibold text-primary transition-all hover:bg-primary/10 disabled:opacity-50" onClick={() => setPreviewTarget(file)}>
                      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">visibility</span><span>Xem trước</span>
                    </button>
                    <button type="button" disabled={busy} className="flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border border-hairline bg-card px-3 text-xs font-semibold text-ink-soft transition-all hover:border-primary/35 hover:bg-primary-subtle hover:text-primary disabled:opacity-50" onClick={() => void download(file)}>
                      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">download</span><span>Tải xuống</span>
                    </button>
                    {canDelete(file) && (
                      <button type="button" disabled={busy} className="min-h-9 whitespace-nowrap rounded-lg px-2.5 text-xs font-semibold text-status-error-text transition-colors hover:bg-status-error-bg disabled:opacity-50" onClick={() => setDeleteTarget(file)}>Xóa</button>
                    )}
                  </div>
                </li>
                )
              })}
            </ul>
            {(totalPages > 1 || data.totalCount > data.pageSize) && (
              <Pagination
                page={data.page}
                pages={totalPages}
                total={data.totalCount}
                pageSize={data.pageSize}
                busy={busy}
                onPage={(nextPage) => setFilters(current => ({ ...current, page: nextPage }))}
                onPageSizeChange={(newSize) => setFilters(current => ({ ...current, page: 1, pageSize: newSize }))}
              />
            )}
          </>
        )}
      </section>

      {canUpload && uploadOpen && (
        <Modal open title="Đính kèm tệp" description="Chọn công việc, báo cáo hoặc cuộc họp để đính kèm tài liệu." busy={busy} onClose={() => setUploadOpen(false)}>
          <div className="space-y-4">
            {error && <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">{error}</p>}
            <p role="status" className="text-xs text-ink-muted">{uploadPolicy ? uploadPolicyLabel(uploadPolicy) : policyLoaded ? 'Chưa tải được chính sách tệp. Máy chủ sẽ kiểm tra khi tải lên.' : 'Đang tải chính sách tệp…'}</p>
            {parentLoading ? (
              <p role="status" className="text-sm text-ink-muted">Đang xác nhận hạng mục có thể đính kèm…</p>
            ) : parentError ? (
              <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">
                {parentError} <button type="button" className="font-semibold underline" onClick={() => setParentRevision(value => value + 1)}>Tải lại hạng mục</button>
              </p>
            ) : (
              <form ref={uploadForm} className="grid gap-4" onSubmit={upload}>
                <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">Gắn với
                  <select value={uploadType} disabled={busy} onChange={event => { setUploadType(event.target.value as FileParentType); setUploadParentId('') }} className={inputClass}>
                    <option value="TASK">Công việc</option>
                    <option value="REPORT">Báo cáo tiến độ</option>
                    <option value="MEETING">Cuộc họp</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">Hạng mục
                  <select required value={uploadParentId} disabled={busy || !currentParents.length} onChange={event => setUploadParentId(event.target.value)} className={inputClass}>
                    <option value="">{currentParents.length ? 'Chọn hạng mục' : 'Không có hạng mục phù hợp'}</option>
                    {currentParents.map(parent => <option key={`${parent.type}-${parent.id}`} value={parent.id}>{parent.label}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">Tệp
                  <span className="relative grid min-h-11 min-w-0 grid-cols-[auto_minmax(0,1fr)] overflow-hidden rounded-md border border-hairline bg-card normal-case tracking-normal">
                    <span className="flex items-center border-r border-hairline bg-primary-subtle px-3 text-xs font-semibold text-primary">Chọn tệp</span>
                    <span className="truncate px-3 py-3 text-xs font-medium text-ink-muted">{uploadFileName}</span>
                    <input required type="file" name="file" accept={uploadPolicy?.allowedExtensions.join(',')} disabled={busy || !currentParents.length} className="absolute inset-0 cursor-pointer opacity-0" onChange={event => setUploadFileName(event.target.files?.[0]?.name || 'Chưa chọn tệp')} />
                  </span>
                </label>
                {uploadPolicy?.chunkSizeBytes && <p className="text-xs text-ink-muted">Có thể tạm dừng và tiếp tục tải. Khi quay lại trang, chọn lại đúng tệp để tiếp tục phần còn lại.</p>}
                {uploadProgress && (
                  <div className="rounded-md border border-hairline bg-canvas p-4">
                    <div role="status" aria-live="polite" className="text-sm text-ink">
                      <p className="break-words font-semibold">{uploadProgress.fileName}</p>
                      <p className="mt-1">{uploadProgress.state === 'PROCESSING' ? 'Đã gửi đủ dữ liệu. Máy chủ đang kiểm tra và lưu tệp…' : uploadProgress.state === 'FAILED' ? 'Chưa lưu được tệp. Bấm Tiếp tục tải để thử lưu lại, hoặc hủy phiên nếu cần chọn tệp khác.' : `${busy ? 'Đang tải' : 'Đã tạm dừng'}: ${formatBytes(uploadProgress.nextOffset)} / ${formatBytes(uploadProgress.totalBytes)} (${Math.floor(uploadProgress.nextOffset * 100 / Math.max(1, uploadProgress.totalBytes))}%)`}</p>
                    </div>
                    <progress aria-label="Tiến độ gửi tệp" className="mt-3 h-2 w-full accent-primary" max={uploadProgress.totalBytes} value={uploadProgress.nextOffset} />
                    <div className="mt-2 flex flex-wrap gap-2">
                      {busy && <button type="button" className="min-h-10 rounded-md border border-hairline bg-card px-3 text-sm font-semibold text-primary" onClick={() => uploadController.current?.abort()}>{uploadProgress.state === 'PROCESSING' ? 'Tạm dừng theo dõi' : 'Tạm dừng tải'}</button>}
                      {!busy && uploadProgress.state !== 'PROCESSING' && <button type="button" className="min-h-10 rounded-md px-3 text-sm font-semibold text-status-error-text" onClick={() => void cancelUpload(uploadProgress.sessionId)}>Hủy phiên tải</button>}
                    </div>
                  </div>
                )}
                <div className="app-modal__actions">
                  <button type="button" disabled={busy} className="app-modal__button" onClick={() => setUploadOpen(false)}>Hủy</button>
                  <button type="submit" disabled={busy || !uploadParentId || !currentParents.length} className="min-h-11 rounded-md bg-primary px-5 text-sm font-semibold text-white shadow-primary transition-all hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50">
                    {busy ? 'Đang tải…' : uploadProgress || resumableUploads.some(saved => saved.parentType === uploadType && String(saved.parentId) === uploadParentId && saved.fileName === uploadFileName) ? 'Tiếp tục tải' : 'Tải lên'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal open busy={busy} title={`Xóa tệp “${deleteTarget.fileName}”?`} description="Tệp sẽ được xóa khỏi hạng mục đang lưu trữ. Thao tác này không thể hoàn tác." onClose={() => setDeleteTarget(null)}>
          <div className="app-modal__actions">
            <button type="button" disabled={busy} className="app-modal__button" onClick={() => setDeleteTarget(null)}>Giữ lại</button>
            <button type="button" disabled={busy} className="app-modal__button app-modal__button--danger" onClick={() => void remove()}>{busy ? 'Đang xóa…' : 'Xác nhận xóa'}</button>
          </div>
        </Modal>
      )}
      {previewTarget && (
        <DocumentPreviewModal key={previewTarget.id} fileId={previewTarget.id} open fileName={previewTarget.fileName} fileSize={previewTarget.sizeBytes} contentType={previewTarget.contentType} loadBlob={signal => api.downloadProjectFile(previewTarget.id, signal)} onDownload={() => download(previewTarget)} onClose={() => setPreviewTarget(null)} />
      )}
    </WorkspacePage>
  )
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
  const code = reason.problem?.code ?? reason.problem?.errorCode
  if (code === 'ASSIGNMENT_REVOKED') return 'Phân công của bạn đã bị thu hồi hoặc hết hiệu lực (ASSIGNMENT_REVOKED).'
  if (code === 'SCOPE_ACCESS_DENIED') return 'Tệp hoặc hạng mục này nằm ngoài phạm vi chuyên ngành được phân công (SCOPE_ACCESS_DENIED).'
  if (code === 'RESTRICTED_DELETE') return 'Không thể xóa tệp vì đang được tham chiếu trong sổ minh chứng, gói Gate hoặc gói nộp cuối đã khóa (RESTRICTED_DELETE).'
  if (code === 'FILE_QUARANTINED') return 'Tệp đang bị cách ly bảo mật (QUARANTINED) và không được phép tải hoặc xem trước.'
  if (reason.status === 400) return 'Dữ liệu lọc hoặc tệp không hợp lệ.'
  if (reason.status === 401) return 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.'
  if (reason.status === 403) return 'Bạn không có quyền thao tác với tệp hoặc hạng mục này.'
  if (reason.status === 404) return 'Không tìm thấy tệp hoặc hạng mục liên quan.'
  if (reason.status === 409) return 'Dữ liệu hoặc trạng thái hạng mục đã thay đổi. Hãy tải lại trước khi thử tiếp.'
  if (reason.status === 413) return reason.problem?.maxBytesLabel ? `Tệp vượt giới hạn ${reason.problem.maxBytesLabel} do máy chủ công bố.` : 'Tệp vượt giới hạn do máy chủ công bố.'
  return `Không thể ${action}. Hãy thử lại.`
}
function fileFormat(contentType?: string | null, fileName?: string | null) {
  const normalized = contentType?.toLowerCase() ?? ''
  if (normalized.includes('pdf') || fileName?.toLowerCase().endsWith('.pdf')) return 'PDF'
  if (normalized.includes('wordprocessingml') || fileName?.toLowerCase().endsWith('.docx')) return 'Word'
  if (normalized.includes('spreadsheetml') || fileName?.toLowerCase().endsWith('.xlsx')) return 'Excel'
  if (normalized.includes('presentationml') || fileName?.toLowerCase().endsWith('.pptx')) return 'PowerPoint'
  if (normalized.includes('zip') || fileName?.toLowerCase().endsWith('.zip')) return 'ZIP'
  if (normalized.startsWith('image/')) return 'Hình ảnh'
  return contentType || 'Tệp đính kèm'
}

function fileVisual(contentType?: string | null, fileName?: string | null): { icon: string; tone: string } {
  const normalized = contentType?.toLowerCase() ?? ''
  const lowerName = fileName?.toLowerCase() ?? ''
  if (normalized.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/.test(lowerName)) {
    return { icon: 'image', tone: 'border-status-success-border bg-status-success-bg text-status-success-text' }
  }
  if (normalized.includes('pdf') || lowerName.endsWith('.pdf')) {
    return { icon: 'picture_as_pdf', tone: 'border-status-error-border bg-status-error-bg text-status-error-text' }
  }
  if (normalized.includes('wordprocessingml') || /\.(docx?)$/.test(lowerName)) {
    return { icon: 'description', tone: 'border-tag-se/25 bg-tag-se-bg text-tag-se' }
  }
  if (normalized.includes('spreadsheetml') || /\.(xlsx?|csv)$/.test(lowerName)) {
    return { icon: 'table_chart', tone: 'border-status-success-border bg-status-success-bg text-status-success-text' }
  }
  if (normalized.includes('zip') || /\.(zip|rar|7z)$/.test(lowerName)) {
    return { icon: 'folder_zip', tone: 'border-status-warning-border bg-status-warning-bg text-status-warning-text' }
  }
  return { icon: 'draft', tone: 'border-primary/20 bg-primary-subtle text-primary' }
}
