import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { readAllPages } from '../../../services/api/paged-read'
import { HttpError } from '../../../services/http/http-client'
import { getAcademicHierarchy } from '../../academic/api/academic-api'
import { getSemesters } from '../../academic/api/governance-api'
import type { AcademicHierarchyOrganization } from '../../academic/types/academic.types'
import type { Semester } from '../../academic/types/governance.types'
import { useAuthSession } from '../../auth/context/useAuthSession'
import { getWorkspaceRole } from '../../auth/utils/role-access'
import { exportTeamRoster } from '../api/roster-export-api'
import './roster-export.css'

function exportError(reason: unknown): string {
  if (reason instanceof HttpError) {
    if (reason.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    if (reason.status === 403) return 'Chỉ tài khoản Admin đang hoạt động mới được xuất danh sách này.'
    if (reason.status === 404) return 'Học kỳ hoặc phạm vi đã chọn không còn hợp lệ. Hãy đóng và mở lại để tải danh mục mới.'
    if (reason.status === 422) return 'Danh sách vượt giới hạn 10.000 sinh viên. Hãy chọn bộ môn hoặc chuyên ngành để thu hẹp phạm vi.'
    if (reason.status === 400) return 'Bộ lọc chưa hợp lệ. Hãy kiểm tra học kỳ, bộ môn và chuyên ngành.'
  }
  return 'Chưa tải được tệp Excel. Vui lòng thử lại.'
}

export function RosterExportDialog({ onClose }: { onClose: () => void }) {
  const { session } = useAuthSession()
  const token = session?.accessToken
  const isAdmin = getWorkspaceRole(session?.user) === 'admin'
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [hierarchy, setHierarchy] = useState<AcademicHierarchyOrganization[]>([])
  const [semesterId, setSemesterId] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [majorId, setMajorId] = useState('')
  const [loaded, setLoaded] = useState<{ token: string; revision: number; failed: boolean } | null>(null)
  const [revision, setRevision] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const request = useRef<AbortController | null>(null)
  const loading = loaded?.token !== token || loaded?.revision !== revision
  const loadError = !loading && loaded?.failed === true

  useEffect(() => {
    if (!token || !isAdmin) return
    const controller = new AbortController()
    Promise.all([
      readAllPages(page => getSemesters(token, { search: '' }, controller.signal, page)),
      getAcademicHierarchy(token, { search: '', includeInactive: true }, controller.signal),
    ]).then(([periods, structure]) => {
      if (controller.signal.aborted) return
      setSemesters(periods)
      setHierarchy(structure)
      setLoaded({ token, revision, failed: false })
    }).catch(() => { if (!controller.signal.aborted) setLoaded({ token, revision, failed: true }) })
    return () => controller.abort()
  }, [token, isAdmin, revision])

  useEffect(() => () => { request.current?.abort(); request.current = null }, [])

  const selectedSemester = semesters.find(item => String(item.id) === semesterId)
  const departments = hierarchy.filter(item => item.organization.id === selectedSemester?.organizationId).flatMap(item => item.departments)
  const majors = departments.find(item => String(item.department.id) === departmentId)?.majors ?? []
  const canExport = isAdmin && !!token && !loading && !loadError && !!selectedSemester
    && (!departmentId || departments.some(item => String(item.department.id) === departmentId))
    && (!majorId || majors.some(item => String(item.id) === majorId))
  const clearFeedback = () => { setError(null); setNotice(null) }

  async function download(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canExport || !token || request.current) return
    const controller = new AbortController()
    request.current = controller
    setExporting(true)
    clearFeedback()
    try {
      const blob = await exportTeamRoster({ semesterId: Number(semesterId), departmentId: departmentId ? Number(departmentId) : undefined, majorId: majorId ? Number(majorId) : undefined }, token, controller.signal)
      if (controller.signal.aborted) return
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      try {
        anchor.href = url
        anchor.download = `team-roster-${semesterId}.xlsx`
        document.body.appendChild(anchor)
        anchor.click()
      } finally {
        anchor.remove()
        // Give the browser time to start the download before releasing the blob.
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
      }
      setNotice('Đã tạo tệp Excel. Kiểm tra mục tải xuống của trình duyệt.')
    } catch (reason) {
      if (!controller.signal.aborted) setError(exportError(reason))
    } finally {
      if (request.current === controller) { request.current = null; setExporting(false) }
    }
  }

  return <Modal open title="Xuất danh sách sinh viên theo nhóm" description="Tải tệp Excel theo mẫu danh sách nhóm của học kỳ." busy={exporting} onClose={onClose}>
    <form className="roster-export" onSubmit={event => void download(event)} aria-busy={exporting}>
      <div className="roster-export__format"><span className="material-symbols-outlined" aria-hidden="true">table_view</span><div><strong>Excel (.xlsx)</strong><p>STT · Mã nhóm · MSSV · Họ và tên · Trưởng nhóm/Thành viên · SĐT · Email · Khung</p></div></div>
      {!isAdmin || !token ? <p role="alert">Chỉ tài khoản Admin mới được xuất danh sách này.</p> : <>
        {loading && <p role="status">Đang tải học kỳ và danh mục đào tạo…</p>}
        {loadError && <p role="alert">Chưa tải được bộ lọc. <Button variant="outline" size="sm" onClick={() => setRevision(value => value + 1)}>Thử lại</Button></p>}
        {!loading && !loadError && !semesters.length && <p role="status">Chưa có học kỳ để xuất danh sách.</p>}
        <fieldset disabled={loading || loadError || exporting}>
          <label>Học kỳ <span aria-hidden="true">*</span><select required value={semesterId} onChange={event => { setSemesterId(event.target.value); setDepartmentId(''); setMajorId(''); clearFeedback() }}>
            <option value="">Chọn học kỳ</option>
            {semesters.map(item => <option key={item.id} value={item.id}>{item.code} · {item.name} ({item.organizationCode})</option>)}
          </select></label>
          <label>Bộ môn<select value={departmentId} disabled={!selectedSemester} onChange={event => { setDepartmentId(event.target.value); setMajorId(''); clearFeedback() }}>
            <option value="">Tất cả bộ môn</option>
            {departments.map(({ department }) => <option key={department.id} value={department.id}>{department.name}{department.isActive ? '' : ' · Ngừng hoạt động'}</option>)}
          </select></label>
          <label>Chuyên ngành<select value={majorId} disabled={!departmentId} onChange={event => { setMajorId(event.target.value); clearFeedback() }}>
            <option value="">Tất cả chuyên ngành</option>
            {majors.map(item => <option key={item.id} value={item.id}>{item.code} · {item.name}{item.isActive ? '' : ' · Ngừng hoạt động'}</option>)}
          </select></label>
        </fieldset>
      </>}
      <p className="roster-export__hint">Xuất thành viên hiện tại của các nhóm trong học kỳ, tối đa 10.000 sinh viên. Sinh viên chưa có nhóm không nằm trong tệp. Bộ lọc tìm kiếm tài khoản trên trang không áp dụng cho danh sách này.</p>
      {departmentId && <p className="roster-export__hint">Lọc theo bộ môn/chuyên ngành của từng sinh viên có thể chỉ xuất một phần nhóm liên ngành. Chọn tất cả bộ môn để lấy đủ thành viên.</p>}
      {error && <p className="roster-export__error" role="alert">{error}</p>}
      {notice && <p className="roster-export__success" role="status">{notice}</p>}
      <div className="app-modal__actions"><Button variant="outline" onClick={onClose} disabled={exporting}>Đóng</Button><Button type="submit" icon="download" disabled={!canExport || exporting}>{exporting ? 'Đang xuất…' : 'Tải Excel'}</Button></div>
    </form>
  </Modal>
}
