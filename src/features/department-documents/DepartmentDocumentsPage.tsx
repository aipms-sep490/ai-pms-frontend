import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { DocumentPreviewModal } from '../../components/ui/DocumentPreviewModal'
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
  const [majors, setMajors] = useState<MajorOption[]>([])
  const [periods, setPeriods] = useState<PeriodOption[]>([])
  const [majorId, setMajorId] = useState('')
  const [periodId, setPeriodId] = useState('')
  const [catalogError, setCatalogError] = useState('')
  const [rows, setRows] = useState<DepartmentDocument[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [preview, setPreview] = useState<DepartmentDocument | null>(null)
  const [code, setCode] = useState('')
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [pendingUploadId, setPendingUploadId] = useState<number | null>(null)
  const uploadedNeedsReload = pendingUploadId !== null

  useEffect(() => {
    if (!session) return
    let active = true
    setCatalogError('')
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
        if (!profile.departmentId) setCatalogError('Tài khoản chưa có bộ môn học vụ để quản lý tài liệu.')
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
        }).catch(() => { if (active) setCatalogError('Chưa tải được ngành thuộc hồ sơ hoặc đồ án của bạn.') })
    }
    return () => { active = false }
  }, [session, manager])

  const refresh = useCallback(async (id: string, period: string, signal?: AbortSignal) => {
    if (!id) { setRows(null); return null }
    setRows(null); setLoading(true); setError('')
    try {
      const loaded = await listDepartmentDocuments(Number(id), period ? Number(period) : undefined, signal)
      if (signal?.aborted) return null
      setRows(loaded)
      return loaded
    } catch (reason) { if (!signal?.aborted) setError(errorText(reason)); return null }
    finally { if (!signal?.aborted) setLoading(false) }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void refresh(majorId, periodId, controller.signal)
    return () => controller.abort()
  }, [majorId, periodId, refresh])

  async function submitUpload(event: FormEvent) {
    event.preventDefault()
    if (!majorId || !file || uploadedNeedsReload) return
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
      setCode(''); setTitle(''); setFile(null)
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
    setCode(''); setTitle(''); setFile(null)
    const input = document.getElementById('department-document-file') as HTMLInputElement | null
    if (input) input.value = ''
    setSuccess('Đã xác nhận bản nháp trong danh sách. Hãy kiểm tra và công bố để sinh viên xem được.')
  }

  return <WorkspacePage title={manager ? 'Tài liệu mẫu của bộ môn' : 'Tài liệu mẫu theo ngành'}
    eyebrow={manager ? 'Điều hành học vụ' : 'Tiến trình đồ án'}
    description={manager ? 'Tải lên theo ngành/kỳ, kiểm tra bản nháp rồi công bố phiên bản. Bản cũ được lưu để truy vết.'
      : 'Xem tài liệu đã được bộ môn công bố cho ngành hoặc kỳ đồ án của bạn.'}>
    <section className="workspace-surface space-y-4 p-5" aria-label="Bộ lọc tài liệu">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-medium">Ngành
          <select className="block w-full rounded-lg border border-hairline bg-card p-2" value={majorId} disabled={uploadedNeedsReload || uploading || busyId !== null} onChange={event => setMajorId(event.target.value)}>
            {majors.length === 0 && <option value="">Chưa có ngành khả dụng</option>}
            {majors.map(major => <option key={major.id} value={major.id}>{major.name}{major.code ? ` (${major.code})` : ''}</option>)}
          </select>
        </label>
        {manager && <label className="space-y-1 text-sm font-medium">Kỳ đồ án
          <select className="block w-full rounded-lg border border-hairline bg-card p-2" value={periodId} disabled={uploadedNeedsReload || uploading || busyId !== null} onChange={event => setPeriodId(event.target.value)}>
            <option value="">Tất cả kỳ và tài liệu dùng chung</option>
            {periods.map(period => <option key={period.id} value={period.id}>{period.name} ({period.code})</option>)}
          </select>
        </label>}
      </div>
      {catalogError && <p role="alert" className="text-danger">{catalogError}</p>}
      <button type="button" className="rounded-lg border border-hairline px-3 py-2 text-sm" onClick={() => void retryList()} disabled={loading || !majorId}>Tải lại</button>
    </section>

    {manager && <form className="workspace-surface mt-4 space-y-3 p-5" onSubmit={event => void submitUpload(event)}>
      <h2 className="text-lg font-semibold">Tải lên phiên bản mới</h2>
      <p className="text-sm text-muted">PDF, DOCX hoặc XLSX; tối đa 20 MB. Cùng mã tài liệu sẽ tạo phiên bản kế tiếp trong ngành và kỳ đã chọn.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium">Mã tài liệu
          <input className="mt-1 block w-full rounded-lg border border-hairline bg-card p-2" value={code} onChange={event => setCode(event.target.value)} minLength={2} maxLength={60} pattern="[A-Za-z0-9_-]+" required />
        </label>
        <label className="text-sm font-medium">Tên tài liệu
          <input className="mt-1 block w-full rounded-lg border border-hairline bg-card p-2" value={title} onChange={event => setTitle(event.target.value)} minLength={2} maxLength={200} required />
        </label>
      </div>
      <label className="block text-sm font-medium">Tệp mẫu
        <input id="department-document-file" type="file" className="mt-1 block w-full text-sm" accept=".pdf,.docx,.xlsx" required
          onChange={event => setFile(event.target.files?.[0] ?? null)} />
      </label>
      <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-white disabled:opacity-50" disabled={uploading || uploadedNeedsReload || !majorId || !file || file.size > 20 * 1024 * 1024}>
        {uploading ? 'Đang tải lên…' : 'Tải lên bản nháp'}
      </button>
    </form>}

    <section className="workspace-surface mt-4 space-y-3 p-5" aria-label="Danh sách tài liệu">
      <h2 className="text-lg font-semibold">{manager ? 'Phiên bản tài liệu' : 'Tài liệu đã công bố'}</h2>
      {error && <p role="alert" className="text-danger">{error}</p>}
      {success && <p role="status" className="text-success">{success}</p>}
      {loading && <p role="status">Đang tải tài liệu…</p>}
      {!loading && !error && rows?.length === 0 && <p className="text-muted">Chưa có tài liệu phù hợp với ngành và kỳ đã chọn.</p>}
      {rows?.map(row => <article key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hairline bg-card p-4">
        <div className="min-w-0">
          <h3 className="font-semibold">{row.title}</h3>
          <p className="text-sm text-muted">{row.code} · v{row.version} · {row.fileName} · {row.status === 'PUBLISHED' ? 'Đã công bố' : row.status === 'DRAFT' ? 'Bản nháp' : 'Đã thu hồi'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="rounded-lg border border-hairline px-3 py-2 text-sm" onClick={() => setPreview(row)}>Xem trước</button>
          <button type="button" className="rounded-lg border border-hairline px-3 py-2 text-sm" onClick={() => void download(row)}>Tải về</button>
          {manager && row.status === 'DRAFT' && <button type="button" className="rounded-lg bg-primary px-3 py-2 text-sm text-white disabled:opacity-50" disabled={busyId !== null}
            onClick={() => void changeStatus(row, 'PUBLISHED')}>Công bố</button>}
          {manager && row.status === 'PUBLISHED' && <button type="button" className="rounded-lg border border-hairline px-3 py-2 text-sm disabled:opacity-50" disabled={busyId !== null}
            onClick={() => void changeStatus(row, 'RETIRED')}>Thu hồi</button>}
        </div>
      </article>)}
    </section>
    {preview && <DocumentPreviewModal open fileId={preview.id} fileName={preview.fileName} contentType={preview.contentType}
      fileSize={preview.sizeBytes} loadBlob={signal => downloadDepartmentDocument(preview.id, signal)}
      onDownload={() => saveDownload(preview)} onClose={() => setPreview(null)} />}
  </WorkspacePage>
}
