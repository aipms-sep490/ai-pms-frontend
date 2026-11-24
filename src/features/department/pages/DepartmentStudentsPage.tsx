import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAcademicWorkflow } from '../../../app/context/useAcademicWorkflow'
import { Button } from '../../../components/ui/Button'
import { FilterToolbar, type ActiveFilterChip } from '../../../components/ui/FilterToolbar'
import { ListLoading } from '../../../components/ui/ListLoading'
import { Pagination } from '../../../components/ui/Pagination'
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
  const semesterParam = params.get('semesterId') ?? ''
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
  const [pageSize, setPageSize] = useState(12)
  const [sortBy, setSortBy] = useState<'default' | 'name_asc' | 'code_asc' | 'class_asc'>('default')
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
  const exportAbortRef = useRef<AbortController | null>(null)
  useEffect(() => () => { exportAbortRef.current?.abort(); exportAbortRef.current = null }, [])

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
    pageSize,
  }), [semesterParam, search, majorId, specializationId, classCode, curriculumCode, profileStatus, qualificationStatus, teamStatus, page, pageSize])

  const filteredSpecs = useMemo(() => {
    if (!majorId) return specializations
    const mid = Number(majorId)
    return specializations.filter(s => s.majorId === null || s.majorId === mid)
  }, [specializations, majorId])

  const sortedStudents = useMemo(() => {
    const items = data?.items ?? []
    if (sortBy === 'name_asc') return [...items].sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'))
    if (sortBy === 'code_asc') return [...items].sort((a, b) => (a.studentCode ?? '').localeCompare(b.studentCode ?? '', 'vi'))
    if (sortBy === 'class_asc') return [...items].sort((a, b) => (a.classCode ?? '').localeCompare(b.classCode ?? '', 'vi'))
    return items
  }, [data?.items, sortBy])

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
    if (!session?.accessToken || exporting || exportAbortRef.current) return
    const controller = new AbortController()
    exportAbortRef.current = controller
    setExporting(true)
    setError(null)
    setNotice(null)
    try {
      const blob = await exportDepartmentStudents(queryFilters, session.accessToken, controller.signal)
      if (controller.signal.aborted) return
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
      if (!controller.signal.aborted) setError(errorMessage(reason))
    } finally {
      if (exportAbortRef.current === controller) { exportAbortRef.current = null; setExporting(false) }
    }
  }

  const clearAllFilters = useCallback(() => {
    setSortBy('default')
    setFilter({
      search: '',
      semesterId: '',
      majorId: '',
      specializationId: '',
      classCode: '',
      curriculumCode: '',
      profileStatus: '',
      qualificationStatus: '',
      teamStatus: '',
      page: '1',
    })
  }, [setFilter])

  const advancedActiveCount = [semesterParam, specializationId, classCode, curriculumCode].filter(Boolean).length
  const hasActiveFilters = Boolean(search || semesterParam || majorId || specializationId || classCode || curriculumCode || profileStatus || qualificationStatus || teamStatus || sortBy !== 'default')
  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = []
    if (semesterParam) {
      const sem = (academic?.currentSemesters ?? []).find(s => String(s.id) === semesterParam)
      chips.push({ id: 'semesterId', label: 'Học kỳ', value: sem ? `${sem.code} · ${sem.name}` : semesterParam })
    }
    if (majorId) {
      const major = majors.find(m => String(m.id) === majorId)
      chips.push({ id: 'majorId', label: 'Ngành', value: major ? `${major.code} · ${major.name}` : majorId })
    }
    if (specializationId) {
      const spec = specializations.find(s => String(s.id) === specializationId)
      chips.push({ id: 'specializationId', label: 'CN hẹp', value: spec ? `${spec.code} · ${spec.name}` : specializationId })
    }
    if (classCode) chips.push({ id: 'classCode', label: 'Lớp', value: classCode })
    if (curriculumCode) chips.push({ id: 'curriculumCode', label: 'Khung CTĐT', value: curriculumCode })
    if (profileStatus) chips.push({ id: 'profileStatus', label: 'Hồ sơ', value: academicProfileStatus(profileStatus) })
    if (qualificationStatus) chips.push({ id: 'qualificationStatus', label: 'Điều kiện', value: qualLabels[qualificationStatus] ?? qualificationStatus })
    if (teamStatus) chips.push({ id: 'teamStatus', label: 'Nhóm', value: teamStatus === 'IN_TEAM' ? 'Đã có nhóm' : 'Chưa có nhóm' })
    return chips
  }, [academic?.currentSemesters, semesterParam, majorId, majors, specializationId, specializations, classCode, curriculumCode, profileStatus, qualificationStatus, teamStatus])
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
          {notice && (
            <div className="flex items-center gap-2 rounded-lg border border-hairline border-l-4 border-l-status-success-text bg-card px-4 py-3 text-sm text-ink">
              <span className="material-symbols-outlined shrink-0 text-[18px] text-status-success-text" aria-hidden="true">check_circle</span>
              <p role="status">{notice}</p>
            </div>
          )}

          <section className="grid items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Thống kê sinh viên Khoa">
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

          <FilterToolbar
            ariaLabel="Bộ lọc sinh viên Khoa"
            search={search}
            onSearchChange={val => setFilter({ search: val })}
            searchLabel="Tìm kiếm"
            searchPlaceholder="MSSV, họ tên hoặc email…"
            debounceMs={200}
            controls={
              <>
                <label className="ft-select-wrap">
                  <span className="sr-only">Ngành</span>
                  <select
                    aria-label="Ngành"
                    className="ft-select"
                    value={majorId}
                    onChange={event => setFilter({ majorId: event.target.value, specializationId: '' })}
                  >
                    <option value="">Tất cả ngành</option>
                    {majors.map(m => <option key={m.id} value={m.id}>{m.code} · {m.name}</option>)}
                  </select>
                </label>
                <label className="ft-select-wrap">
                  <span className="sr-only">Hồ sơ học vụ</span>
                  <select
                    aria-label="Hồ sơ học vụ"
                    className="ft-select"
                    value={profileStatus}
                    onChange={event => setFilter({ profileStatus: event.target.value })}
                  >
                    <option value="">Tất cả hồ sơ</option>
                    <option value="PENDING">Chờ xác minh</option>
                    <option value="VERIFIED">Đã xác minh</option>
                    <option value="REJECTED">Cần bổ sung</option>
                  </select>
                </label>
                <label className="ft-select-wrap">
                  <span className="sr-only">Điều kiện tham gia</span>
                  <select
                    aria-label="Điều kiện tham gia"
                    className="ft-select"
                    value={qualificationStatus}
                    onChange={event => setFilter({ qualificationStatus: event.target.value })}
                  >
                    <option value="">Mọi điều kiện</option>
                    <option value="VERIFIED">Đủ ĐK</option>
                    <option value="PENDING_VERIFICATION">Chờ ĐK</option>
                    <option value="REJECTED">Từ chối</option>
                    <option value="NOT_SUBMITTED">Chưa nộp</option>
                  </select>
                </label>
                <label className="ft-select-wrap">
                  <span className="sr-only">Trạng thái nhóm</span>
                  <select
                    aria-label="Trạng thái nhóm"
                    className="ft-select"
                    value={teamStatus}
                    onChange={event => setFilter({ teamStatus: event.target.value })}
                  >
                    <option value="">Mọi nhóm</option>
                    <option value="IN_TEAM">Đã có nhóm</option>
                    <option value="WITHOUT_TEAM">Chưa có nhóm</option>
                  </select>
                </label>
              </>
            }
            sort={{
              value: sortBy,
              onChange: val => setSortBy(val as 'default' | 'name_asc' | 'code_asc' | 'class_asc'),
              options: [
                { value: 'default', label: 'Mặc định' },
                { value: 'name_asc', label: 'Họ tên A–Z' },
                { value: 'code_asc', label: 'MSSV A–Z' },
                { value: 'class_asc', label: 'Lớp A–Z' },
              ],
            }}
            advancedActiveCount={advancedActiveCount}
            advancedControls={
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="text-xs font-semibold text-ink-soft">
                  Học kỳ (xem nhóm/đồ án)
                  <select
                    aria-label="Học kỳ (xem nhóm/đồ án)"
                    value={semesterParam}
                    onChange={event => setFilter({ semesterId: event.target.value })}
                    className="mt-1 block min-h-9 w-full rounded-lg border border-hairline bg-card px-2.5 text-sm font-normal text-ink"
                  >
                    <option value="">Học kỳ đang hoạt động (mặc định)</option>
                    {(academic?.currentSemesters ?? []).map(s => (
                      <option key={s.id} value={s.id}>{s.code} · {s.name}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold text-ink-soft">
                  Chuyên ngành hẹp
                  <select
                    aria-label="Chuyên ngành hẹp"
                    value={specializationId}
                    onChange={event => setFilter({ specializationId: event.target.value })}
                    className="mt-1 block min-h-9 w-full rounded-lg border border-hairline bg-card px-2.5 text-sm font-normal text-ink"
                  >
                    <option value="">Tất cả chuyên ngành hẹp</option>
                    {filteredSpecs.map(s => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
                  </select>
                </label>
                <label className="text-xs font-semibold text-ink-soft">
                  Lớp hành chính
                  <input
                    aria-label="Lớp hành chính"
                    value={classCode}
                    onChange={event => setFilter({ classCode: event.target.value })}
                    placeholder="Ví dụ: SE1801"
                    className="mt-1 block min-h-9 w-full rounded-lg border border-hairline bg-card px-2.5 text-sm font-normal text-ink"
                  />
                </label>
                <label className="text-xs font-semibold text-ink-soft">
                  Khung CTĐT
                  <input
                    aria-label="Khung CTĐT"
                    value={curriculumCode}
                    onChange={event => setFilter({ curriculumCode: event.target.value })}
                    placeholder="Ví dụ: K18_SE"
                    className="mt-1 block min-h-9 w-full rounded-lg border border-hairline bg-card px-2.5 text-sm font-normal text-ink"
                  />
                </label>
              </div>
            }
            activeChips={activeChips}
            onRemoveChip={id => {
              if (id === 'majorId') setFilter({ majorId: '', specializationId: '' })
              else setFilter({ [id]: '' })
            }}
            onClearAll={clearAllFilters}
            hasActiveFilters={hasActiveFilters}
            resultSummary={data ? `${sortedStudents.length} / ${data.totalCount} sinh viên` : undefined}
            rightActions={
              <Button
                variant="secondary"
                size="sm"
                icon="refresh"
                aria-label="Tải lại"
                disabled={loading}
                onClick={() => setReloadKey(k => k + 1)}
              />
            }
          />

          {loading ? (
            <ListLoading label="Đang tải danh sách sinh viên Khoa…" />
          ) : !data || data.items.length === 0 ? (
            <WorkspaceEmptyState
              title="Chưa có sinh viên phù hợp"
              message="Không tìm thấy sinh viên nào thuộc Khoa khớp với bộ lọc hiện tại."
              action={hasActiveFilters ? (
                <Button variant="outline" onClick={clearAllFilters}>
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
                  {sortedStudents.map(student => (
                    <StudentRow key={student.userId} student={student} semesterParam={semesterParam} />
                  ))}
                </TableBody>
              </Table>

              {(data.totalPages > 1 || data.totalCount > pageSize) && (
                <div className="mt-4">
                  <Pagination
                    page={data.page}
                    pages={Math.max(1, data.totalPages)}
                    total={data.totalCount}
                    pageSize={pageSize}
                    busy={loading}
                    onPage={nextPage => setFilter({ page: String(nextPage) })}
                    onPageSizeChange={nextSize => { setPageSize(nextSize); setFilter({ page: '1' }) }}
                  />
                </div>
              )}
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
      className={`flex h-full flex-col justify-between rounded-xl border p-4 text-left transition ${
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
