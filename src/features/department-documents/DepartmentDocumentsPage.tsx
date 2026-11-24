import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useInRouterContext } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { DocumentPreviewModal } from '../../components/ui/DocumentPreviewModal'
import { FilterToolbar } from '../../components/ui/FilterToolbar'
import { InlineAlert } from '../../components/ui/InlineAlert'
import { Modal } from '../../components/ui/Modal'
import { Pagination } from '../../components/ui/Pagination'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useClientPagination } from '../../components/ui/useClientPagination'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { getAcademicHierarchy } from '../academic/api/academic-api'
import { getProjectPeriods } from '../academic/api/governance-api'
import { useAuthSession } from '../auth/context/useAuthSession'
import { getMyProfile } from '../../services/api/auth.api'
import { getProjects } from '../../services/api/projects.api'
import { readAllPages } from '../../services/api/paged-read'
import { HttpError } from '../../services/http/http-client'
import {
  downloadDepartmentDocument, listDepartmentDocuments, publishDepartmentDocument,
  retireDepartmentDocument, uploadDepartmentDocument,
} from './department-documents-api'
import type { DepartmentDocument } from './department-documents-api'

type MajorOption = { id: number; name: string; code: string }
type PeriodOption = { id: number; name: string; code: string }

function errorText(error: unknown) {
  if (error instanceof HttpError) {
    if (error.status === 404) return 'Không truy cập được kho tài liệu cho ngành đã chọn (404). Hãy kiểm tra phạm vi ngành hoặc liên hệ quản trị hệ thống để kiểm tra dịch vụ.'
    if (error.status === 403) return 'Tài khoản không thuộc phạm vi ngành hoặc bộ môn này.'
    if (error.status === 409) return 'Dữ liệu đã thay đổi. Hãy tải lại danh sách trước khi thao tác.'
    if (error.status === 400 || error.status === 422) return 'Thông tin hoặc định dạng tệp chưa hợp lệ. Hãy kiểm tra mã, tên và tệp PDF/DOCX/XLSX tối đa 20 MB.'
  }
  return 'Chưa kết nối được kho tài liệu. Hãy thử lại.'
}

async function saveDownload(row: DepartmentDocument) {
  const blob = await downloadDepartmentDocument(row.id)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = row.fileName
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function DepartmentDocumentsPage({ manager = false }: { manager?: boolean }) {
  const { session } = useAuthSession()
  const inRouter = useInRouterContext()
  const [majors, setMajors] = useState<MajorOption[]>([])
  const [periods, setPeriods] = useState<PeriodOption[]>([])
  const [majorId, setMajorId] = useState('')
  const [periodId, setPeriodId] = useState('')
  const [catalogError, setCatalogError] = useState('')
  const [listState, setListState] = useState<{
    key: string
    rows: DepartmentDocument[] | null
    error: string
    unsupported: boolean
  } | null>(null)
  const [reloading, setReloading] = useState(false)
  const [actionError, setActionError] = useState('')
  const [success, setSuccess] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [preview, setPreview] = useState<DepartmentDocument | null>(null)
  const [code, setCode] = useState('')
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pendingUploadId, setPendingUploadId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState<'newest' | 'title_asc' | 'version_desc'>('newest')
  const uploadedNeedsReload = pendingUploadId !== null

  const filterKey = `${majorId}:${periodId}`
  const activeList = majorId && listState?.key === filterKey ? listState : null
  const rows = activeList?.rows ?? null
  const loading = Boolean(majorId) && (activeList === null || reloading)
  const error = actionError || activeList?.error || ''
  const unsupported = activeList?.unsupported ?? false
  const setError = (value: string) => setActionError(value)

  useEffect(() => {
    if (!session) return
    let active = true
    if (manager) {
      void Promise.all([
        getMyProfile(),
        getAcademicHierarchy(session.accessToken, { search: '', includeInactive: false }),
        readAllPages(page => getProjectPeriods(session.accessToken, { search: '' }, undefined, page)),
      ]).then(([profile, hierarchy, periodRows]) => {
        if (!active) return
        const options = hierarchy.flatMap(org => org.departments)
          .filter(dept => dept.department.id === profile.departmentId)
          .flatMap(dept => dept.majors)
        setMajors(options)
        setMajorId(current => current || String(options[0]?.id ?? ''))
        setPeriods(periodRows.map(row => ({ id: row.id, code: row.code, name: row.name })))
        setCatalogError(!profile.departmentId ? 'Tài khoản chưa có bộ môn học vụ để quản lý tài liệu.' : '')
      }).catch(() => { if (active) setCatalogError('Chưa tải được danh mục ngành và kỳ đồ án.') })
    } else {
      void Promise.all([getMyProfile(), readAllPages(page => getProjects({ page, pageSize: 100 }))])
        .then(([profile, projects]) => {
          if (!active) return
          const options = new Map<number, MajorOption>()
          if (profile.majorId) options.set(profile.majorId, { id: profile.majorId, code: '', name: 'Ngành của tôi' })
          projects.forEach(project => project.majors.forEach(major =>
            options.set(major.majorId, { id: major.majorId, code: major.majorCode, name: major.majorName })))
          const values = [...options.values()]
          setMajors(values)
          setMajorId(current => current || String(values[0]?.id ?? ''))
          setCatalogError('')
        }).catch(() => { if (active) setCatalogError('Chưa tải được ngành thuộc hồ sơ hoặc đồ án của bạn.') })
    }
    return () => { active = false }
  }, [session, manager])

  const readDocuments = useCallback(async (id: string, period: string, signal?: AbortSignal) => {
    const key = `${id}:${period}`
    try {
      const loaded = await listDepartmentDocuments(Number(id), period ? Number(period) : undefined, signal)
      if (signal?.aborted) return null
      return { key, rows: loaded, error: '', unsupported: false }
    } catch (reason) {
      if (signal?.aborted) return null
      return {
        key,
        rows: null as DepartmentDocument[] | null,
        error: errorText(reason),
        unsupported: reason instanceof HttpError && reason.status === 404,
      }
    }
  }, [])

  const refresh = useCallback(async (id: string, period: string) => {
    if (!id) return null
    setActionError('')
    setReloading(true)
    setListState(null)
    try {
      const next = await readDocuments(id, period)
      if (next) setListState(next)
      return next?.rows ?? null
    } finally {
      setReloading(false)
    }
  }, [readDocuments])

  useEffect(() => {
    if (!majorId) return
    const controller = new AbortController()
    void readDocuments(majorId, periodId, controller.signal).then(next => {
      if (next && !controller.signal.aborted) setListState(next)
    })
    return () => controller.abort()
  }, [majorId, periodId, readDocuments])

  async function submitUpload(event: FormEvent) {
    event.preventDefault()
    if (!majorId || !file || uploadedNeedsReload || unsupported) return
    setUploading(true); setError(''); setSuccess('')
    try {
      const uploaded = await uploadDepartmentDocument({ majorId: Number(majorId), projectPeriodId: periodId ? Number(periodId) : undefined,
        code: code.trim(), title: title.trim(), file })
      setPendingUploadId(uploaded.id)
      const loaded = await refresh(majorId, periodId)
      if (!loaded?.some(row => row.id === uploaded.id && row.status === 'DRAFT')) {
        setError('Máy chủ đã nhận bản nháp nhưng chưa xác nhận được trong danh sách. Hãy chọn Tải lại; không gửi tệp lần nữa.')
        return
      }
      setPendingUploadId(null)
      setCode(''); setTitle(''); setFile(null); setUploadOpen(false)
      const input = document.getElementById('department-document-file') as HTMLInputElement | null
      if (input) input.value = ''
      setSuccess('Đã tải lên bản nháp. Hãy kiểm tra và công bố để sinh viên xem được.')
    } catch (reason) { setError(errorText(reason)) }
    finally { setUploading(false) }
  }

  async function changeStatus(row: DepartmentDocument, target: 'PUBLISHED' | 'RETIRED') {
    setBusyId(row.id); setError(''); setSuccess('')
    try {
      if (target === 'PUBLISHED') await publishDepartmentDocument(row)
      else await retireDepartmentDocument(row)
      const loaded = await refresh(majorId, periodId)
      if (!loaded?.some(item => item.id === row.id && item.status === target)) {
        setError('Máy chủ đã nhận thay đổi nhưng chưa xác nhận được trạng thái mới. Hãy chọn Tải lại trước khi thao tác tiếp.')
        return
      }
      setSuccess(target === 'PUBLISHED' ? 'Tài liệu đã được công bố.' : 'Tài liệu đã được thu hồi.')
    } catch (reason) { setError(errorText(reason)) }
    finally { setBusyId(null) }
  }

  async function download(row: DepartmentDocument) {
    setError('')
    try { await saveDownload(row) }
    catch (reason) { setError(errorText(reason)) }
  }

  async function retryList() {
    const loaded = await refresh(majorId, periodId)
    if (!uploadedNeedsReload || !loaded) return
    const pending = loaded.some(row => row.id === pendingUploadId && row.status === 'DRAFT')
    if (!pending) {
      setError('Chưa thấy bản nháp vừa tải lên trong danh sách. Hãy thử Tải lại, không gửi tệp lần nữa.')
      return
    }
    setPendingUploadId(null)
    setCode(''); setTitle(''); setFile(null); setUploadOpen(false)
    const input = document.getElementById('department-document-file') as HTMLInputElement | null
    if (input) input.value = ''
    setSuccess('Đã xác nhận bản nháp trong danh sách. Hãy kiểm tra và công bố để sinh viên xem được.')
  }

  const filteredRows = useMemo(() => {
    const items = rows ?? []
    const q = search.trim().toLowerCase()
    const list = items.filter(row => {
      if (manager && statusFilter && row.status !== statusFilter) return false
      if (q && !`${row.title} ${row.code} ${row.fileName}`.toLowerCase().includes(q)) return false
      return true
    })
    return [...list].sort((a, b) => {
      if (sortBy === 'title_asc') return a.title.localeCompare(b.title, 'vi-VN')
      if (sortBy === 'version_desc') return b.version - a.version
      return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    })
  }, [rows, manager, statusFilter, search, sortBy])

  const docPager = useClientPagination(filteredRows, 10)
  const hasLocalFilters = Boolean(search.trim() || statusFilter || sortBy !== 'newest')
  const clearLocalFilters = () => { setSearch(''); setStatusFilter(''); setSortBy('newest') }

  return <WorkspacePage
    size="wide"
    className="space-y-5"
    title={manager ? 'Tài liệu mẫu của bộ môn' : 'Tài liệu mẫu theo ngành'}
    eyebrow={manager ? 'Điều hành học vụ' : 'Tiến trình đồ án'}
    description={manager ? 'Tải lên theo ngành/kỳ, kiểm tra bản nháp rồi công bố phiên bản. Bản cũ được lưu để truy vết.'
      : 'Xem tài liệu đã được bộ môn công bố cho ngành hoặc kỳ đồ án của bạn.'}
    action={
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" icon="refresh" aria-label="Tải lại" onClick={() => void retryList()} disabled={loading || !majorId} />
        {manager && !unsupported && (
          <button type="button" className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50" disabled={!majorId} onClick={() => setUploadOpen(true)}>
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">upload_file</span>
            Tải lên phiên bản mới
          </button>
        )}
      </div>
    }
  >
    {catalogError && <InlineAlert tone="error">{catalogError}</InlineAlert>}

    {manager && !unsupported && uploadOpen && (
      <Modal open title="Tải lên phiên bản mới" description="PDF, DOCX hoặc XLSX; tối đa 20 MB. Cùng mã tài liệu sẽ tạo phiên bản kế tiếp trong ngành và kỳ đã chọn." busy={uploading} onClose={() => setUploadOpen(false)}>
        <form className="space-y-4" onSubmit={event => void submitUpload(event)}>
          {error && <InlineAlert tone="error">{error}</InlineAlert>}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-ink-soft">Mã tài liệu
              <input className="mt-1 block min-h-11 w-full rounded-lg border border-hairline bg-card px-3 py-2 text-sm font-normal text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" value={code} onChange={event => setCode(event.target.value)} minLength={2} maxLength={60} pattern="[A-Za-z0-9_-]+" required />
            </label>
            <label className="text-sm font-medium text-ink-soft">Tên tài liệu
              <input className="mt-1 block min-h-11 w-full rounded-lg border border-hairline bg-card px-3 py-2 text-sm font-normal text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" value={title} onChange={event => setTitle(event.target.value)} minLength={2} maxLength={200} required />
            </label>
          </div>
          <div>
            <label htmlFor="department-document-file" className="block text-sm font-medium text-ink-soft">Tệp mẫu</label>
            <div className="relative mt-1 grid min-h-11 min-w-0 cursor-pointer grid-cols-[auto_minmax(0,1fr)] overflow-hidden rounded-lg border border-hairline bg-card font-normal transition-colors hover:border-primary/50 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
              <span aria-hidden="true" className="flex items-center border-r border-hairline bg-primary-subtle px-3.5 text-xs font-semibold text-primary">Chọn tệp</span>
              <span aria-hidden="true" className="flex items-center truncate px-3 text-xs font-medium text-ink-muted">{file ? file.name : 'Chưa chọn tệp'}</span>
              <input id="department-document-file" type="file" className="absolute inset-0 cursor-pointer opacity-0" accept=".pdf,.docx,.xlsx" required
                onChange={event => setFile(event.target.files?.[0] ?? null)} />
            </div>
          </div>
          <div className="app-modal__actions">
            {uploadedNeedsReload ? (
              <button type="button" className="app-modal__button" onClick={() => void retryList()} disabled={loading}>Tải lại danh sách</button>
            ) : (
              <button type="button" className="app-modal__button" disabled={uploading} onClick={() => setUploadOpen(false)}>Hủy</button>
            )}
            <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50" disabled={uploading || uploadedNeedsReload || !majorId || !file || file.size > 20 * 1024 * 1024}>
              {uploading ? 'Đang tải lên…' : 'Tải lên bản nháp'}
            </button>
          </div>
        </form>
      </Modal>
    )}

    <section className="workspace-surface overflow-hidden" aria-label="Danh sách tài liệu">
      <div className="border-b border-hairline px-5 py-4">
        <h2 className="text-lg font-semibold text-ink">{manager ? 'Phiên bản tài liệu' : 'Tài liệu đã công bố'}</h2>
      </div>
      <FilterToolbar
        embedded
        className={manager ? 'ft-bar--compact' : undefined}
        tabs={manager ? [
          { value: '', label: 'Tất cả' },
          { value: 'PUBLISHED', label: 'Đã công bố' },
          { value: 'DRAFT', label: 'Bản nháp' },
          { value: 'RETIRED', label: 'Đã thu hồi' },
        ] : undefined}
        activeTab={statusFilter}
        onTabChange={setStatusFilter}
        search={search}
        onSearchChange={setSearch}
        searchLabel="Tìm tài liệu"
        searchPlaceholder="Tìm tên, mã tài liệu…"
        controls={
          <>
            <select aria-label="Ngành" value={majorId} disabled={uploadedNeedsReload || uploading || busyId !== null} onChange={event => { setActionError(''); setMajorId(event.target.value) }}>
              {majors.length === 0 && <option value="">Chưa có ngành khả dụng</option>}
              {majors.map(major => <option key={major.id} value={major.id}>{major.name}{major.code ? ` (${major.code})` : ''}</option>)}
            </select>
            {manager && (
              <select aria-label="Kỳ đồ án" value={periodId} disabled={uploadedNeedsReload || uploading || busyId !== null} onChange={event => { setActionError(''); setPeriodId(event.target.value) }}>
                <option value="">Tất cả kỳ & dùng chung</option>
                {periods.map(period => <option key={period.id} value={period.id}>{period.name} ({period.code})</option>)}
              </select>
            )}
          </>
        }
        sort={{
          value: sortBy,
          onChange: (val) => setSortBy(val as 'newest' | 'title_asc' | 'version_desc'),
          options: [
            { value: 'newest', label: 'Mới cập nhật' },
            { value: 'title_asc', label: 'Tên A–Z' },
            { value: 'version_desc', label: 'Phiên bản cao nhất' },
          ],
        }}
        hasActiveFilters={hasLocalFilters}
        onClearAll={clearLocalFilters}
        resultSummary={rows ? `${filteredRows.length} / ${rows.length} tài liệu` : undefined}
      />

      <div className="space-y-3 p-5">
        {error && !uploadOpen && <InlineAlert tone="error">{error}</InlineAlert>}
        {success && <InlineAlert tone="success">{success}</InlineAlert>}
        {loading && <p role="status" className="text-sm text-ink-muted">Đang tải tài liệu…</p>}
        {!loading && !error && rows?.length === 0 && <p className="rounded-lg border border-hairline bg-canvas p-4 text-sm text-ink-muted">Chưa có tài liệu phù hợp với ngành và kỳ đã chọn.</p>}
        {!loading && !error && rows && rows.length > 0 && filteredRows.length === 0 && (
          <div className="rounded-lg border border-hairline bg-canvas p-4 text-center text-sm text-ink-muted">
            <p>Không có tài liệu nào khớp bộ lọc hiện tại.</p>
            <button type="button" className="mt-2 font-semibold text-primary underline" onClick={clearLocalFilters}>Xóa bộ lọc</button>
          </div>
        )}
        {docPager.paginatedItems.map(row => <article key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hairline bg-card p-4 transition-colors hover:border-primary/30">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-ink">{row.title}</h3>
              <StatusBadge tone={row.status === 'PUBLISHED' ? 'success' : row.status === 'DRAFT' ? 'warning' : 'neutral'} label={row.status === 'PUBLISHED' ? 'Đã công bố' : row.status === 'DRAFT' ? 'Bản nháp' : 'Đã thu hồi'} />
            </div>
            <p className="mt-1 text-sm text-ink-muted">{row.code} · v{row.version} · {row.fileName}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-lg border border-hairline bg-card px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:border-primary hover:bg-primary-subtle hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" onClick={() => setPreview(row)}>Xem trước</button>
            <button type="button" className="inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-lg border border-hairline bg-card px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:border-primary hover:bg-primary-subtle hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" onClick={() => void download(row)}>Tải về</button>
            {manager && row.status === 'DRAFT' && <button type="button" className="inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50" disabled={busyId !== null}
              onClick={() => void changeStatus(row, 'PUBLISHED')}>Công bố</button>}
            {manager && row.status === 'PUBLISHED' && (
              inRouter ? (
                <Link
                  to={`/academic/knowledge?fromDepartmentDocId=${row.id}`}
                  className="inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-lg border border-primary/30 bg-primary-subtle px-3 py-1.5 text-sm font-semibold text-primary transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Đẩy sang Kho tri thức AI
                </Link>
              ) : (
                <a
                  href={`/academic/knowledge?fromDepartmentDocId=${row.id}`}
                  className="inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-lg border border-primary/30 bg-primary-subtle px-3 py-1.5 text-sm font-semibold text-primary transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Đẩy sang Kho tri thức AI
                </a>
              )
            )}
            {manager && row.status === 'PUBLISHED' && <button type="button" className="inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-lg border border-hairline bg-card px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:border-primary hover:bg-primary-subtle hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50" disabled={busyId !== null}
              onClick={() => void changeStatus(row, 'RETIRED')}>Thu hồi</button>}
          </div>
        </article>)}
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
      </div>
    </section>
    {preview && <DocumentPreviewModal open fileId={preview.id} fileName={preview.fileName} contentType={preview.contentType}
      fileSize={preview.sizeBytes} loadBlob={signal => downloadDepartmentDocument(preview.id, signal)}
      onDownload={() => saveDownload(preview)} onClose={() => setPreview(null)} />}
  </WorkspacePage>
}
