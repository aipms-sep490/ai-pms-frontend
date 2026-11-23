import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAcademicWorkflow } from '../../../app/context/useAcademicWorkflow'
import { Button } from '../../../components/ui/Button'
import { ListLoading } from '../../../components/ui/ListLoading'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import type { BadgeTone } from '../../../components/ui/status-badge-tone'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../../../components/ui/Table'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { WorkspaceEmptyState } from '../../../components/ui/WorkspaceState'
import { HttpError } from '../../../services/http/http-client'
import { getAcademicHierarchy } from '../../academic/api/academic-api'
import { academicProfileStatus } from '../../academic/api/profile-verification-api'
import { ProfileVerificationsPage } from '../../academic/pages/ProfileVerificationsPage'
import { useAuthSession } from '../../auth/context/useAuthSession'
import { QualificationVerificationPage } from '../../qualifications/pages/QualificationVerificationPage'
import { CurriculumImportDialog } from '../../users/components/CurriculumImportDialog'
import { RosterExportDialog } from '../../users/components/RosterExportDialog'
import {
  exportDepartmentStudents,
  listDepartmentStudents,
  listSpecializations,
  type DepartmentSpecialization,
  type DepartmentStudentDirectoryPage,
  type DepartmentStudentSummary,
} from '../api/department-students-api'
import { SpecializationCatalogPanel } from '../components/SpecializationCatalogPanel'

type TabKey = 'directory' | 'profiles' | 'qualifications'

const profileTone: Record<string, BadgeTone> = { VERIFIED: 'success', PENDING: 'warning', REJECTED: 'danger' }
const qualLabels: Record<string, string> = {
  VERIFIED: 'Đủ điều kiện',
  PENDING_VERIFICATION: 'Chờ duyệt ĐK',
  REJECTED: 'Bị từ chối',
  EXPIRED: 'Hết hạn',
  NOT_SUBMITTED: 'Chưa nộp',
}
const qualTone: Record<string, BadgeTone> = {
  VERIFIED: 'success',
  PENDING_VERIFICATION: 'warning',
  REJECTED: 'danger',
  EXPIRED: 'danger',
  NOT_SUBMITTED: 'neutral',
}

function errorMessage(reason: unknown): string {
  if (reason instanceof HttpError) {
    if (reason.status === 403) return 'Bạn không có quyền truy cập danh sách sinh viên của khoa này.'
    if (reason.status === 422) return reason.problem?.detail || 'Bộ lọc không hợp lệ.'
  }
  return 'Chưa thể tải danh sách sinh viên Khoa. Vui lòng thử lại.'
}

export function DepartmentStudentsPage() {
  const { session } = useAuthSession()
  const { academic } = useAcademicWorkflow()
  const [params, setParams] = useSearchParams()

  const activeTab: TabKey = params.get('tab') === 'profiles'
    ? 'profiles'
    : params.get('tab') === 'qualifications'
      ? 'qualifications'
      : 'directory'

  const departmentId = academic?.departments[0]?.id ?? null
  const departmentName = academic?.departments[0]?.name ?? 'Khoa của bạn'

  const page = Math.max(1, Number(params.get('page') ?? '1') || 1)
  const semesterParam = params.get('semesterId') ?? (academic?.selectedSemester ? String(academic.selectedSemester.id) : '')
  const search = params.get('search') ?? ''
  const majorId = params.get('majorId') ?? ''
  const specializationId = params.get('specializationId') ?? ''
  const classCode = params.get('classCode') ?? ''
  const curriculumCode = params.get('curriculumCode') ?? ''
  const profileStatus = params.get('profileStatus') ?? ''
  const qualificationStatus = params.get('qualificationStatus') ?? ''
  const teamStatus = params.get('teamStatus') ?? ''

  const [majors, setMajors] = useState<Array<{ id: number; code: string; name: string }>>([])
  const [specializations, setSpecializations] = useState<DepartmentSpecialization[]>([])
  const [data, setData] = useState<DepartmentStudentDirectoryPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [specOpen, setSpecOpen] = useState(false)
  const [curriculumOpen, setCurriculumOpen] = useState(false)
  const [rosterExportOpen, setRosterExportOpen] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const requestSeq = useRef(0)

  const setFilter = useCallback((patch: Record<string, string>) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([key, value]) => {
      if (value) next.set(key, value)
      else next.delete(key)
    })
    if (!('page' in patch)) next.set('page', '1')
    setParams(next)
  }, [params, setParams])

  useEffect(() => {
    if (!session?.accessToken || !departmentId) return
    const controller = new AbortController()
    getAcademicHierarchy(session.accessToken, { search: '', includeInactive: true }, controller.signal)
      .then(orgs => {
        if (controller.signal.aborted) return
        const found = orgs.flatMap(o => o.departments).find(d => d.department.id === departmentId)
        setMajors(found?.majors.map(m => ({ id: m.id, code: m.code, name: m.name })) ?? [])
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setMajors(academic?.majors.map(m => ({ id: m.id, code: m.code, name: m.name })) ?? [])
        }
      })
    return () => controller.abort()
  }, [session?.accessToken, departmentId, academic?.majors])

  const loadSpecializations = useCallback(async (signal?: AbortSignal) => {
    if (!departmentId) return
    try {
      const list = await listSpecializations({ departmentId, includeInactive: false }, signal)
      if (!signal?.aborted) setSpecializations(list)
    } catch {
      // Non-blocking filter catalog
    }
  }, [departmentId])

  useEffect(() => {
    const controller = new AbortController()
    void loadSpecializations(controller.signal)
    return () => controller.abort()
  }, [loadSpecializations, reloadKey])

  const queryFilters = useMemo(() => ({
    semesterId: Number(semesterParam) > 0 ? Number(semesterParam) : undefined,
    search: search || undefined,
    majorId: Number(majorId) > 0 ? Number(majorId) : undefined,
    specializationId: Number(specializationId) > 0 ? Number(specializationId) : undefined,
    classCode: classCode || undefined,
    curriculumCode: curriculumCode || undefined,
    profileStatus: profileStatus || undefined,
    qualificationStatus: qualificationStatus || undefined,
    teamStatus: teamStatus || undefined,
    page,
    pageSize: 20,
  }), [semesterParam, search, majorId, specializationId, classCode, curriculumCode, profileStatus, qualificationStatus, teamStatus, page])

  const filteredSpecs = useMemo(() => {
    if (!majorId) return specializations
    const mid = Number(majorId)
    return specializations.filter(s => s.majorId === null || s.majorId === mid)
  }, [specializations, majorId])

  useEffect(() => {
    if (activeTab !== 'directory') return
    const controller = new AbortController()
    const seq = ++requestSeq.current
    setLoading(true)
    setError(null)
    listDepartmentStudents(queryFilters, controller.signal)
      .then(result => {
        if (!controller.signal.aborted && seq === requestSeq.current) {
          setData(result)
          setLoading(false)
        }
      })
      .catch(reason => {
        if (!controller.signal.aborted && seq === requestSeq.current) {
          setError(errorMessage(reason))
          setLoading(false)
        }
      })
    return () => controller.abort()
  }, [activeTab, queryFilters, reloadKey])

  async function handleExportStudents() {
    if (!session?.accessToken || exporting) return
    setExporting(true)
    setError(null)
    setNotice(null)
    try {
      const blob = await exportDepartmentStudents(queryFilters, session.accessToken)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      try {
        anchor.href = url
        anchor.download = 'department-students.xlsx'
        document.body.appendChild(anchor)
        anchor.click()
      } finally {
        anchor.remove()
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
      }
      setNotice('Đã xuất danh sách sinh viên Khoa (.xlsx) theo bộ lọc hiện tại.')
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setExporting(false)
    }
  }

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setFilter({
      search: String(form.get('search') ?? ''),
      semesterId: String(form.get('semesterId') ?? ''),
      majorId: String(form.get('majorId') ?? ''),
      specializationId: String(form.get('specializationId') ?? ''),
      classCode: String(form.get('classCode') ?? ''),
      curriculumCode: String(form.get('curriculumCode') ?? ''),
      profileStatus: String(form.get('profileStatus') ?? ''),
      qualificationStatus: String(form.get('qualificationStatus') ?? ''),
      teamStatus: String(form.get('teamStatus') ?? ''),
      page: '1',
    })
  }

  const hasActiveFilters = Boolean(search || majorId || specializationId || classCode || curriculumCode || profileStatus || qualificationStatus || teamStatus)
  const stats = data?.stats

  return (
    <WorkspacePage
      title="Quản lý sinh viên Khoa"
      eyebrow={`Học vụ · ${departmentName}`}
      description="Theo dõi danh sách sinh viên, lớp hành chính, chuyên ngành hẹp, khung CTĐT, xác minh hồ sơ học vụ và điều kiện tham gia đồ án trong phạm vi Khoa."
      action={
        activeTab === 'directory' ? (
          <div className="flex flex-wrap gap-2">
            {departmentId && (
              <Button variant="secondary" icon="category" onClick={() => setSpecOpen(true)}>
                Quản lý Chuyên ngành hẹp
              </Button>
            )}
            <Button variant="outline" icon="upload" onClick={() => setCurriculumOpen(true)}>
              Cập nhật Khung CTĐT
            </Button>
            <Button variant="outline" icon="download" disabled={exporting} onClick={() => void handleExportStudents()}>
              {exporting ? 'Đang xuất…' : 'Xuất DS SV Khoa'}
            </Button>
            <Button variant="outline" icon="groups" onClick={() => setRosterExportOpen(true)}>
              Xuất DS Nhóm Khoa
            </Button>
          </div>
        ) : undefined
      }
    >
      <nav className="flex flex-wrap gap-2 border-b border-hairline pb-3" aria-label="Phân khu quản lý sinh viên">
        <Button
          variant={activeTab === 'directory' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setFilter({ tab: 'directory' })}
        >
          Danh sách sinh viên Khoa
        </Button>
        <Button
          variant={activeTab === 'profiles' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setFilter({ tab: 'profiles' })}
        >
          Xác minh hồ sơ học vụ
        </Button>
        <Button
          variant={activeTab === 'qualifications' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setFilter({ tab: 'qualifications' })}
        >
          Xác minh điều kiện
        </Button>
      </nav>

      {activeTab === 'profiles' && <ProfileVerificationsPage embedded />}
      {activeTab === 'qualifications' && <QualificationVerificationPage embedded />}

      {activeTab === 'directory' && (
        <div className="space-y-4">
          {error && <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg px-4 py-3 text-sm text-status-error-text">{error}</p>}
          {notice && <p role="status" className="rounded-lg border border-status-success-border bg-status-success-bg px-4 py-3 text-sm text-status-success-text">{notice}</p>}

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Thống kê sinh viên Khoa">
            <KpiCard
              label="Tổng SV thuộc Khoa"
              value={stats ? String(stats.totalStudents) : '—'}
              active={!profileStatus && !qualificationStatus && !teamStatus}
              onClick={() => setFilter({ profileStatus: '', qualificationStatus: '', teamStatus: '', page: '1' })}
            />
            <KpiCard
              label="Chờ xác minh hồ sơ"
              value={stats ? String(stats.pendingVerificationCount) : '—'}
              active={profileStatus === 'PENDING'}
              onClick={() => setFilter({ profileStatus: profileStatus === 'PENDING' ? '' : 'PENDING', page: '1' })}
            />
            <KpiCard
              label="Đủ điều kiện đồ án"
              value={stats ? String(stats.qualifiedCount) : '—'}
              active={qualificationStatus === 'VERIFIED'}
              onClick={() => setFilter({ qualificationStatus: qualificationStatus === 'VERIFIED' ? '' : 'VERIFIED', page: '1' })}
            />
            <KpiCard
              label="Chưa có nhóm"
              value={stats ? String(stats.withoutTeamCount) : '—'}
              active={teamStatus === 'WITHOUT_TEAM'}
              onClick={() => setFilter({ teamStatus: teamStatus === 'WITHOUT_TEAM' ? '' : 'WITHOUT_TEAM', page: '1' })}
            />
          </section>

          <section className="workspace-surface p-4" aria-label="Bộ lọc sinh viên Khoa">
            <form
              key={JSON.stringify([semesterParam, search, majorId, specializationId, classCode, curriculumCode, profileStatus, qualificationStatus, teamStatus])}
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
              onSubmit={handleFilterSubmit}
            >
              <label className="text-sm font-medium">
                Tìm kiếm
                <input
                  name="search"
                  defaultValue={search}
                  placeholder="MSSV, họ tên hoặc email"
                  className="mt-1 block w-full rounded-lg border border-hairline px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm font-medium">
                Học kỳ (xem nhóm/đồ án)
                <select name="semesterId" defaultValue={semesterParam} className="mt-1 block w-full rounded-lg border border-hairline px-3 py-2 text-sm">
                  <option value="">Tất cả học kỳ</option>
                  {(academic?.currentSemesters ?? []).map(s => (
                    <option key={s.id} value={s.id}>{s.code} · {s.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium">
                Ngành
                <select name="majorId" defaultValue={majorId} className="mt-1 block w-full rounded-lg border border-hairline px-3 py-2 text-sm">
                  <option value="">Tất cả ngành</option>
                  {majors.map(m => <option key={m.id} value={m.id}>{m.code} · {m.name}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium">
                Chuyên ngành hẹp
                <select name="specializationId" defaultValue={specializationId} className="mt-1 block w-full rounded-lg border border-hairline px-3 py-2 text-sm">
                  <option value="">Tất cả chuyên ngành hẹp</option>
                  {filteredSpecs.map(s => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium">
                Lớp hành chính
                <input
                  name="classCode"
                  defaultValue={classCode}
                  placeholder="Ví dụ: SE1801"
                  className="mt-1 block w-full rounded-lg border border-hairline px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm font-medium">
                Khung CTĐT
                <input
                  name="curriculumCode"
                  defaultValue={curriculumCode}
                  placeholder="Ví dụ: K18_SE"
                  className="mt-1 block w-full rounded-lg border border-hairline px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm font-medium">
                Hồ sơ học vụ
                <select name="profileStatus" defaultValue={profileStatus} className="mt-1 block w-full rounded-lg border border-hairline px-3 py-2 text-sm">
                  <option value="">Tất cả trạng thái</option>
                  <option value="PENDING">Chờ xác minh</option>
                  <option value="VERIFIED">Đã xác minh</option>
                  <option value="REJECTED">Cần bổ sung</option>
                </select>
              </label>
              <label className="text-sm font-medium">
                Điều kiện & Nhóm
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <select name="qualificationStatus" aria-label="Điều kiện tham gia" defaultValue={qualificationStatus} className="rounded-lg border border-hairline px-2 py-2 text-sm">
                    <option value="">Mọi ĐK</option>
                    <option value="VERIFIED">Đủ ĐK</option>
                    <option value="PENDING_VERIFICATION">Chờ ĐK</option>
                    <option value="REJECTED">Từ chối</option>
                    <option value="NOT_SUBMITTED">Chưa nộp</option>
                  </select>
                  <select name="teamStatus" aria-label="Trạng thái nhóm" defaultValue={teamStatus} className="rounded-lg border border-hairline px-2 py-2 text-sm">
                    <option value="">Mọi nhóm</option>
                    <option value="IN_TEAM">Đã có nhóm</option>
                    <option value="WITHOUT_TEAM">Chưa có nhóm</option>
                  </select>
                </div>
              </label>
              <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-4">
                <Button type="submit" variant="secondary">Lọc sinh viên</Button>
                {hasActiveFilters && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFilter({
                      search: '',
                      majorId: '',
                      specializationId: '',
                      classCode: '',
                      curriculumCode: '',
                      profileStatus: '',
                      qualificationStatus: '',
                      teamStatus: '',
                      page: '1',
                    })}
                  >
                    Đặt lại bộ lọc
                  </Button>
                )}
              </div>
            </form>
          </section>

          {loading ? (
            <ListLoading label="Đang tải danh sách sinh viên Khoa…" />
          ) : !data || data.items.length === 0 ? (
            <WorkspaceEmptyState
              title="Chưa có sinh viên phù hợp"
              message="Không tìm thấy sinh viên nào thuộc Khoa khớp với bộ lọc hiện tại."
              action={hasActiveFilters ? (
                <Button
                  variant="outline"
                  onClick={() => setFilter({
                    search: '',
                    majorId: '',
                    specializationId: '',
                    classCode: '',
                    curriculumCode: '',
                    profileStatus: '',
                    qualificationStatus: '',
                    teamStatus: '',
                    page: '1',
                  })}
                >
                  Xóa bộ lọc
                </Button>
              ) : undefined}
            />
          ) : (
            <section className="workspace-surface overflow-hidden p-4">
              <Table stack>
                <TableHead>
                  <TableRow head>
                    <TableHeaderCell>Sinh viên</TableHeaderCell>
                    <TableHeaderCell>Lớp & Chuyên ngành hẹp</TableHeaderCell>
                    <TableHeaderCell>Ngành & Khung CTĐT</TableHeaderCell>
                    <TableHeaderCell>Hồ sơ & Điều kiện</TableHeaderCell>
                    <TableHeaderCell>Nhóm & Đồ án</TableHeaderCell>
                    <TableHeaderCell aria-label="Thao tác" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.items.map(student => (
                    <StudentRow key={student.userId} student={student} semesterParam={semesterParam} />
                  ))}
                </TableBody>
              </Table>

              <nav className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm" aria-label="Phân trang danh sách sinh viên">
                <span className="text-ink-muted">
                  Trang {data.page} / {Math.max(1, data.totalPages)} · {data.totalCount} sinh viên
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={data.page <= 1} onClick={() => setFilter({ page: String(data.page - 1) })}>
                    Trang trước
                  </Button>
                  <Button size="sm" variant="outline" disabled={data.page >= data.totalPages} onClick={() => setFilter({ page: String(data.page + 1) })}>
                    Trang sau
                  </Button>
                </div>
              </nav>
            </section>
          )}
        </div>
      )}

      {specOpen && departmentId && (
        <SpecializationCatalogPanel
          departmentId={departmentId}
          majors={majors}
          onClose={() => setSpecOpen(false)}
          onChanged={() => setReloadKey(k => k + 1)}
        />
      )}
      {curriculumOpen && (
        <CurriculumImportDialog
          onClose={() => setCurriculumOpen(false)}
          onImported={() => setReloadKey(k => k + 1)}
        />
      )}
      {rosterExportOpen && (
        <RosterExportDialog
          lockedDepartmentId={departmentId}
          onClose={() => setRosterExportOpen(false)}
        />
      )}
    </WorkspacePage>
  )
}

function StudentRow({ student, semesterParam }: { student: DepartmentStudentSummary; semesterParam: string }) {
  const detailUrl = semesterParam
    ? `/department/students/${student.userId}?semesterId=${encodeURIComponent(semesterParam)}`
    : `/department/students/${student.userId}`

  return (
    <TableRow>
      <TableCell label="Sinh viên">
        <div className="flex flex-col">
          <strong>{student.fullName}</strong>
          <span className="font-mono text-xs text-ink-muted">{student.studentCode ?? 'Chưa có MSSV'}</span>
          <span className="text-xs text-ink-muted">{student.email}</span>
        </div>
      </TableCell>
      <TableCell label="Lớp & Chuyên ngành hẹp">
        <div className="flex flex-col">
          <span>{student.classCode ? `Lớp ${student.classCode}` : 'Chưa nhập lớp'}</span>
          <small className="text-ink-muted">
            {student.specializationName
              ? `${student.specializationCode ? `${student.specializationCode} · ` : ''}${student.specializationName}`
              : 'Chưa chọn chuyên ngành hẹp'}
          </small>
        </div>
      </TableCell>
      <TableCell label="Ngành & Khung CTĐT">
        <div className="flex flex-col">
          <span>{student.majorName ?? 'Chưa gán ngành'}</span>
          <small className="text-ink-muted">{student.curriculumCode ? `Khung ${student.curriculumCode}` : 'Chưa có khung'}</small>
        </div>
      </TableCell>
      <TableCell label="Hồ sơ & Điều kiện">
        <div className="flex flex-wrap gap-1.5">
          <StatusBadge tone={profileTone[student.academicProfileStatus] ?? 'neutral'} label={academicProfileStatus(student.academicProfileStatus)} />
          <StatusBadge tone={qualTone[student.qualificationStatus] ?? 'neutral'} label={qualLabels[student.qualificationStatus] ?? student.qualificationStatus} />
        </div>
      </TableCell>
      <TableCell label="Nhóm & Đồ án">
        {student.teamCode ? (
          <div className="flex flex-col">
            <span>
              <strong>{student.teamCode}</strong>
              {student.isTeamLeader ? ' · Trưởng nhóm' : ' · Thành viên'}
            </span>
            {student.projectCode && <small className="text-ink-muted">{student.projectCode} ({student.projectStatus})</small>}
          </div>
        ) : (
          <span className="text-xs text-ink-muted">Chưa có nhóm</span>
        )}
      </TableCell>
      <TableCell label="Thao tác">
        <Link className="font-medium text-primary hover:underline" to={detailUrl}>
          Chi tiết
        </Link>
      </TableCell>
    </TableRow>
  )
}

function KpiCard({ label, value, active, onClick }: { label: string; value: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-xl border p-4 text-left transition ${
        active
          ? 'border-primary bg-primary-subtle/40 shadow-xs'
          : 'border-hairline bg-card hover:border-primary/40'
      }`}
    >
      <span className="block text-xs font-medium text-ink-muted">{label}</span>
      <strong className="mt-1 block text-2xl font-bold text-ink">{value}</strong>
    </button>
  )
}
