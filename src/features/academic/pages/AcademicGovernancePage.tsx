import { Modal as AppModal } from '../../../components/ui/Modal'
import { FilterToolbar, type ActiveFilterChip } from '../../../components/ui/FilterToolbar'
import { Pagination } from '../../../components/ui/Pagination'
import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'
import { useClientPagination } from '../../../components/ui/useClientPagination'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { env } from '../../../app/config/env'
import { Button } from '../../../components/ui/Button'
import { academicError, type AcademicError } from '../academic-error'
import { AcademicField } from '../components/AcademicField'
import { useAcademicGovernance } from '../hooks/useAcademicGovernance'
import { dateTimeLabel, localDateTime, toUtcDateTime } from '../../execution/execution-utils'
import { projectPeriodTypes, type GovernanceStatus, type ProjectPeriod, type ProjectPeriodDraft, type Semester, type SemesterDraft } from '../types/governance.types'
import './academic-governance.css'
import './academic-governance-polish.css'

const nextStates: Record<GovernanceStatus, GovernanceStatus[]> = { DRAFT: ['UPCOMING', 'ARCHIVED'], UPCOMING: ['ACTIVE', 'DRAFT'], ACTIVE: ['CLOSED'], CLOSED: ['ARCHIVED'], ARCHIVED: [] }
const labels: Record<string, string> = { REGISTRATION: 'Đăng ký', PROJECT_REVIEW: 'Thẩm định', SUPERVISOR_SELECTION: 'Phân công hướng dẫn', EXECUTION: 'Thực hiện', FINAL_SUBMISSION: 'Bàn giao cuối kỳ', EVALUATION: 'Đánh giá' }
const statusLabels: Record<GovernanceStatus, string> = { DRAFT: 'Bản nháp', UPCOMING: 'Sắp diễn ra', ACTIVE: 'Đang hoạt động', CLOSED: 'Đã đóng', ARCHIVED: 'Đã lưu trữ' }
type Editor = { kind: 'semester'; record?: Semester } | { kind: 'period'; record?: ProjectPeriod }
type GovernanceSort = 'newest' | 'start_asc' | 'name_asc'

function toDate(value: string) { return value.slice(0, 10) }
function formatDate(value: string) { return toDate(value).split('-').reverse().join('/') }

export function AcademicGovernancePage() {
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | GovernanceStatus>('ALL')
  const [periodTypeFilter, setPeriodTypeFilter] = useState<string>('ALL')
  const [selectedSemesterCode, setSelectedSemesterCode] = useState<string>('ALL')
  const [sortBy, setSortBy] = useState<GovernanceSort>('newest')
  const [editor, setEditor] = useState<Editor | null>(null)
  const [operationError, setOperationError] = useState<AcademicError | null>(null)
  const [operationSuccess, setOperationSuccess] = useState<string | null>(null)
  const governance = useAcademicGovernance({ search })
  const openEditor = (next: Editor) => { setOperationError(null); setOperationSuccess(null); setEditor(next) }
  const saveSemester = async (draft: SemesterDraft) => { setOperationError(null); setOperationSuccess(null); try { await governance.saveSemester(draft); setEditor(null); setOperationSuccess('Đã lưu học kỳ và cập nhật danh sách.') } catch (reason: unknown) { setOperationError(academicError(reason, 'governance')) } }
  const savePeriod = async (draft: ProjectPeriodDraft) => { setOperationError(null); setOperationSuccess(null); try { await governance.saveProjectPeriod(draft); setEditor(null); setOperationSuccess('Đã lưu cấu trúc giai đoạn. Chính sách áp dụng được quản lý ở màn hình riêng.') } catch (reason: unknown) { setOperationError(academicError(reason, 'governance')) } }
  const changeStatus = async (kind: 'semester' | 'period', id: number, status: GovernanceStatus, expectedStatus: GovernanceStatus) => { if (await requestConfirmation({ title: 'Thay đổi trạng thái?', description: `Chuyển ${kind === 'semester' ? 'học kỳ' : 'giai đoạn'} sang ${statusLabels[status].toLowerCase()}.`, confirmLabel: 'Xác nhận thay đổi' }) === null) return; setOperationError(null); setOperationSuccess(null); try { await governance.setStatus(kind, id, status, expectedStatus); setOperationSuccess(`Đã chuyển trạng thái sang ${statusLabels[status].toLowerCase()}.`) } catch (reason: unknown) { setOperationError(academicError(reason, 'governance')) } }

  const periodSemesterCodes = useMemo(
    () => Array.from(new Set(governance.periods.map(p => p.semesterCode).filter(Boolean))),
    [governance.periods],
  )

  const filteredSemesters = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = governance.semesters.filter(semester => {
      if (statusFilter !== 'ALL' && semester.status !== statusFilter) return false
      if (q && !`${semester.code} ${semester.name} ${semester.organizationName ?? ''}`.toLowerCase().includes(q)) return false
      return true
    })
    return [...list].sort((a, b) => {
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name, 'vi')
      if (sortBy === 'start_asc') return a.startDate.localeCompare(b.startDate)
      return b.startDate.localeCompare(a.startDate)
    })
  }, [governance.semesters, search, statusFilter, sortBy])

  const filteredPeriods = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = governance.periods.filter(period => {
      if (statusFilter !== 'ALL' && period.status !== statusFilter) return false
      if (periodTypeFilter !== 'ALL' && period.periodType !== periodTypeFilter) return false
      if (selectedSemesterCode !== 'ALL' && period.semesterCode !== selectedSemesterCode) return false
      if (q && !`${period.code} ${period.name} ${period.semesterCode} ${labels[period.periodType] ?? ''}`.toLowerCase().includes(q)) return false
      return true
    })
    return [...list].sort((a, b) => {
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name, 'vi')
      if (sortBy === 'start_asc') return a.startAt.localeCompare(b.startAt)
      return b.startAt.localeCompare(a.startAt)
    })
  }, [governance.periods, search, statusFilter, periodTypeFilter, selectedSemesterCode, sortBy])

  const statusCounts = useMemo(() => {
    const allItems = [...governance.semesters, ...governance.periods]
    const counts: Record<'ALL' | GovernanceStatus, number> = { ALL: allItems.length, DRAFT: 0, UPCOMING: 0, ACTIVE: 0, CLOSED: 0, ARCHIVED: 0 }
    for (const item of allItems) counts[item.status] = (counts[item.status] ?? 0) + 1
    return counts
  }, [governance.semesters, governance.periods])

  const semesterPager = useClientPagination(filteredSemesters, 12)
  const periodPager = useClientPagination(filteredPeriods, 12)

  if (governance.isUnauthorized || governance.loading || governance.isForbidden || governance.error) {
    const issue = governance.error ? academicError(governance.error, 'governance') : null
    return <WorkspacePage size="wide" className="governance-page" title="Học kỳ và giai đoạn đồ án" eyebrow="Quản lý học vụ" description="Thiết lập thời gian đăng ký, thực hiện và đánh giá cho từng học kỳ.">
      {governance.isUnauthorized ? <section className="governance-state governance-error" role="alert"><strong>Cần đăng nhập để xem cấu hình học vụ.</strong><Link to="/login" className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Đăng nhập</Link></section>
        : governance.loading ? <section className="governance-state" role="status">Đang tải học kỳ và các giai đoạn đồ án…</section>
        : governance.isForbidden ? <section className="governance-state governance-error" role="alert">Bạn không có quyền truy cập cấu hình học vụ.</section>
        : issue ? <section className="governance-state governance-error" role="alert">{issue.message} {issue.action && <Button onClick={governance.retry}>{issue.action === 'reload' ? 'Tải lại dữ liệu' : 'Thử lại'}</Button>}</section> : null}
    </WorkspacePage>
  }

  const hasActiveFilters = Boolean(search.trim() || statusFilter !== 'ALL' || periodTypeFilter !== 'ALL' || selectedSemesterCode !== 'ALL')
  const activeChips: ActiveFilterChip[] = []
  if (statusFilter !== 'ALL') activeChips.push({ id: 'status', label: 'Trạng thái', value: statusLabels[statusFilter] })
  if (periodTypeFilter !== 'ALL') activeChips.push({ id: 'periodType', label: 'Loại giai đoạn', value: labels[periodTypeFilter] ?? periodTypeFilter })
  if (selectedSemesterCode !== 'ALL') activeChips.push({ id: 'semesterCode', label: 'Học kỳ', value: selectedSemesterCode })

  const clearAllFilters = () => {
    setSearch('')
    setStatusFilter('ALL')
    setPeriodTypeFilter('ALL')
    setSelectedSemesterCode('ALL')
    semesterPager.setPage(1)
    periodPager.setPage(1)
  }

  return <WorkspacePage size="wide" className="governance-page" title="Học kỳ và kỳ đồ án" eyebrow="Quản lý học vụ" description="Thiết lập thời gian đăng ký, thực hiện và đánh giá cho từng học kỳ. Điều kiện về thành viên và ngành tham gia được quản lý trong chính sách của từng giai đoạn." action={<div className="governance-actions"><Button variant="secondary" size="sm" icon="refresh" aria-label="Tải lại" onClick={governance.retry} />{governance.canManage && <><Button icon="add" onClick={() => openEditor({ kind: 'semester' })}>Thêm học kỳ</Button><Button variant="secondary" icon="event_note" onClick={() => openEditor({ kind: 'period' })}>Thêm giai đoạn</Button></>}</div>}>
    <FilterToolbar
      search={search}
      onSearchChange={value => { setSearch(value); semesterPager.setPage(1); periodPager.setPage(1) }}
      searchLabel="Tìm học kỳ hoặc giai đoạn"
      searchPlaceholder="Tìm theo mã, tên học kỳ hoặc giai đoạn..."
      tabs={[
        { value: 'ALL', label: 'Tất cả', count: statusCounts.ALL },
        { value: 'ACTIVE', label: 'Đang hoạt động', count: statusCounts.ACTIVE },
        { value: 'UPCOMING', label: 'Sắp diễn ra', count: statusCounts.UPCOMING },
        { value: 'DRAFT', label: 'Bản nháp', count: statusCounts.DRAFT },
        { value: 'CLOSED', label: 'Đã đóng', count: statusCounts.CLOSED },
        { value: 'ARCHIVED', label: 'Đã lưu trữ', count: statusCounts.ARCHIVED },
      ]}
      activeTab={statusFilter}
      onTabChange={value => { setStatusFilter(value as 'ALL' | GovernanceStatus); semesterPager.setPage(1); periodPager.setPage(1) }}
      tabsLabel="Lọc theo trạng thái học kỳ và giai đoạn"
      controls={
        <>
          <label className="ft-select-wrap">
            <span className="sr-only">Loại giai đoạn</span>
            <select
              className="ft-select"
              aria-label="Lọc theo loại giai đoạn"
              value={periodTypeFilter}
              onChange={event => { setPeriodTypeFilter(event.target.value); periodPager.setPage(1) }}
            >
              <option value="ALL">Tất cả loại giai đoạn</option>
              {projectPeriodTypes.map(type => (
                <option key={type} value={type}>{labels[type]}</option>
              ))}
            </select>
          </label>
          {periodSemesterCodes.length > 1 && (
            <label className="ft-select-wrap">
              <span className="sr-only">Học kỳ</span>
              <select
                className="ft-select"
                aria-label="Lọc giai đoạn theo học kỳ"
                value={selectedSemesterCode}
                onChange={event => { setSelectedSemesterCode(event.target.value); periodPager.setPage(1) }}
              >
                <option value="ALL">Tất cả học kỳ ({governance.periods.length})</option>
                {periodSemesterCodes.map(code => <option key={code} value={code}>{code}</option>)}
              </select>
            </label>
          )}
        </>
      }
      sort={{
        value: sortBy,
        onChange: value => setSortBy(value as GovernanceSort),
        options: [
          { value: 'newest', label: 'Mới nhất trước' },
          { value: 'start_asc', label: 'Bắt đầu sớm nhất' },
          { value: 'name_asc', label: 'Tên A–Z' },
        ],
      }}
      activeChips={activeChips}
      onRemoveChip={id => {
        if (id === 'status') setStatusFilter('ALL')
        if (id === 'periodType') setPeriodTypeFilter('ALL')
        if (id === 'semesterCode') setSelectedSemesterCode('ALL')
        semesterPager.setPage(1)
        periodPager.setPage(1)
      }}
      onClearAll={clearAllFilters}
      hasActiveFilters={hasActiveFilters}
      resultSummary={`${filteredSemesters.length} học kỳ · ${filteredPeriods.length} giai đoạn`}
    />
    {!governance.canManage && <p role="status" className="governance-note text-sm"><strong>Chế độ chỉ xem:</strong> Cấu trúc học kỳ và kỳ đồ án do quản trị viên cấu hình. Bộ môn có thể xem và mở chính sách của kỳ thuộc phạm vi được cấp.</p>}
    {operationError && !editor ? <div className="governance-error col-span-full" role="alert">{operationError.message}{operationError.action && <Button onClick={governance.retry}>Tải lại dữ liệu</Button>}</div> : null}
    {operationSuccess ? <p className="governance-message" role="status">{operationSuccess}</p> : null}
    <section aria-labelledby="governance-semesters-title">
      <div className="governance-section-title"><h2 id="governance-semesters-title">Học kỳ</h2><span>{filteredSemesters.length} học kỳ</span></div>
      <div className="governance-grid">{semesterPager.paginatedItems.map(semester => <article key={semester.id} className="governance-card">
        <div className="governance-record-heading"><div><p className="governance-record-code">{semester.code}</p><h3>{semester.name}</h3></div><span className="governance-record-kind">Học kỳ</span></div>
        <p className="governance-record-meta">{semester.organizationName || semester.organizationCode}</p>
        <dl className="governance-dates"><div><dt>Bắt đầu</dt><dd>{formatDate(semester.startDate)}</dd></div><div><dt>Kết thúc</dt><dd>{formatDate(semester.endDate)}</dd></div></dl>
        <div className="governance-record-footer">{governance.canManage && !['CLOSED', 'ARCHIVED'].includes(semester.status) && <Button size="sm" variant="secondary" onClick={() => openEditor({ kind: 'semester', record: semester })}>Chỉnh sửa</Button>}
          <Status label={`học kỳ ${semester.code}`} status={semester.status} busy={governance.submitting} canManage={governance.canManage} onChange={status => changeStatus('semester', semester.id, status, semester.status)} />
        </div>
      </article>)}</div>
      {semesterPager.showPagination && (
        <div className="mt-4">
          <Pagination
            page={semesterPager.page}
            pages={semesterPager.pages}
            total={semesterPager.total}
            pageSize={semesterPager.pageSize}
            onPage={semesterPager.setPage}
            onPageSizeChange={semesterPager.setPageSize}
          />
        </div>
      )}
      {!filteredSemesters.length && <p className="governance-empty">Chưa có học kỳ phù hợp với bộ lọc.</p>}
    </section>
    <section aria-labelledby="governance-periods-title">
      <div className="governance-section-title"><h2 id="governance-periods-title">Giai đoạn đồ án</h2><span>{filteredPeriods.length} giai đoạn</span></div>
      <div className="governance-periods">{periodPager.paginatedItems.map(period => <article key={period.id} className="governance-period">
        <div className="governance-record-heading"><div><p className="governance-record-code">{period.semesterCode} · {labels[period.periodType]}</p><h3>{period.name}</h3></div></div>
        <dl className="governance-dates"><div><dt>Bắt đầu (giờ Việt Nam)</dt><dd>{dateTimeLabel(period.startAt)}</dd></div><div><dt>Kết thúc (giờ Việt Nam)</dt><dd>{dateTimeLabel(period.endAt)}</dd></div></dl>
        <dl className="governance-period-facts"><div><dt>Số thành viên</dt><dd>{period.minTeamSize}–{period.maxTeamSize}</dd></div><div><dt>Số ngành tối thiểu</dt><dd>{period.minDistinctMajors}</dd></div><div><dt>Đồ án tối đa mỗi GVHD</dt><dd>{period.maxProjectsPerSupervisor}</dd></div></dl>
        <div className="governance-record-footer"><div className="governance-record-actions">
          <Link to={`/academic/project-periods/${period.id}/policy`} className="workspace-action-link">Các phiên bản chính sách<span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span></Link>
          <Link to={`/academic/project-periods/${period.id}/review-gates`} className="workspace-action-link">Cấu hình cổng kiểm duyệt<span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span></Link>
          {env.defenseScheduleEnabled && env.roomPlannerEnabled && <Link to={`/academic/project-periods/${period.id}/room-planner`} className="workspace-action-link">Phòng & lịch bảo vệ<span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span></Link>}
          {governance.canManage && !['CLOSED', 'ARCHIVED'].includes(period.status) && <Button size="sm" variant="secondary" onClick={() => openEditor({ kind: 'period', record: period })}>Chỉnh sửa cấu trúc</Button>}
        </div><Status label={`giai đoạn ${period.name}`} status={period.status} busy={governance.submitting} canManage={governance.canManage} onChange={status => changeStatus('period', period.id, status, period.status)} /></div>

      </article>)}</div>
      {periodPager.showPagination && (
        <div className="mt-4">
          <Pagination
            page={periodPager.page}
            pages={periodPager.pages}
            total={periodPager.total}
            pageSize={periodPager.pageSize}
            onPage={periodPager.setPage}
            onPageSizeChange={periodPager.setPageSize}
          />
        </div>
      )}
      {!filteredPeriods.length && <p className="governance-empty">Chưa có giai đoạn phù hợp với bộ lọc.</p>}
    </section>
    {confirmationDialog}
    {editor?.kind === 'semester' ? <SemesterForm record={editor.record} organizations={governance.organizations} error={operationError} submitting={governance.submitting} onCancel={() => setEditor(null)} onSubmit={saveSemester}/> : null}{editor?.kind === 'period' ? <ProjectPeriodForm record={editor.record} semesters={governance.semesters} error={operationError} submitting={governance.submitting} onCancel={() => setEditor(null)} onSubmit={savePeriod}/> : null}
  </WorkspacePage>
}

const transitionLabels: Record<GovernanceStatus, string> = { DRAFT: 'Đưa về bản nháp', UPCOMING: 'Đưa vào lịch', ACTIVE: 'Mở hoạt động', CLOSED: 'Đóng', ARCHIVED: 'Lưu trữ' }
function Status({ label, status, busy, canManage, onChange }: { label: string; status: GovernanceStatus; busy: boolean; canManage: boolean; onChange: (status: GovernanceStatus) => Promise<void> }) {
  return <div className="governance-status"><span className={`governance-badge governance-badge--${status.toLowerCase()}`}>{statusLabels[status]}</span>{canManage && nextStates[status].length > 0 && <select aria-label={`Thay đổi trạng thái ${label}`} value="" disabled={busy} onChange={event => void onChange(event.target.value as GovernanceStatus)}><option value="" disabled>Đổi trạng thái</option>{nextStates[status].map(next => <option key={next} value={next}>{transitionLabels[next]}</option>)}</select>}</div>
}
function Modal({ title, children, busy, onClose }: { title: string; children: ReactNode; busy: boolean; onClose: () => void }) {
  return <AppModal open title={title} busy={busy} onClose={onClose}><div className="governance-editor">{children}</div></AppModal>
}
function SemesterForm({ record, organizations = [], error, submitting, onCancel, onSubmit }: { record?: Semester; organizations?: Array<{ id: number; code: string; name: string }>; error: AcademicError | null; submitting: boolean; onCancel: () => void; onSubmit: (draft: SemesterDraft) => Promise<void> }) {
  const [validationError, setValidationError] = useState('')
  const missingOrgs = !record && organizations.length === 0
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (missingOrgs) { setValidationError('Chưa có đơn vị tổ chức nào khả dụng. Hãy tạo đơn vị tại Cấu trúc đào tạo trước.'); return }
    const form = new FormData(event.currentTarget), startDate = String(form.get('startDate')), endDate = String(form.get('endDate'))
    if (startDate > endDate) { setValidationError('Ngày kết thúc không được trước ngày bắt đầu.'); return }
    setValidationError('')
    void onSubmit({ id: record?.id, organizationId: record?.organizationId ?? Number(form.get('organizationId')), code: String(form.get('code')).trim(), name: String(form.get('name')).trim(), startDate, endDate })
  }
  return <Modal title={record ? 'Chỉnh sửa học kỳ' : 'Tạo học kỳ'} busy={submitting} onClose={onCancel}><form onSubmit={submit}>
    {(validationError || error) && <div role="alert" className="governance-error col-span-full">{validationError || error?.message}{!validationError && error?.action === 'retry' && <Button type="submit" disabled={submitting}>Thử lại</Button>}</div>}
    {!record && <AcademicField label="Đơn vị tổ chức" field="organizationId" error={error}>{organizations.length > 0 ? <select name="organizationId" required disabled={submitting} defaultValue=""><option value="" disabled>-- Chọn đơn vị tổ chức --</option>{organizations.map(org => <option key={org.id} value={org.id}>{org.name} ({org.code})</option>)}</select> : <p role="status" className="rounded-lg border border-status-warning-border bg-status-warning-bg px-3 py-2.5 text-xs text-status-warning-text">Chưa có đơn vị tổ chức khả dụng. Vui lòng thiết lập tổ chức tại mục Cấu trúc đào tạo trước khi tạo học kỳ.</p>}</AcademicField>}
    <AcademicField label="Mã học kỳ" field="code" error={error}><input name="code" required defaultValue={record?.code} disabled={submitting} /></AcademicField>
    <AcademicField label="Tên học kỳ" field="name" error={error}><input name="name" required defaultValue={record?.name} disabled={submitting} /></AcademicField>
    <AcademicField label="Bắt đầu" field="startDate" error={error}><input name="startDate" type="date" required defaultValue={record ? toDate(record.startDate) : undefined} disabled={submitting} /></AcademicField>
    <AcademicField label="Kết thúc" field="endDate" error={error}><input name="endDate" type="date" required defaultValue={record ? toDate(record.endDate) : undefined} disabled={submitting} /></AcademicField>
    <div className="governance-editor-actions"><Button variant="secondary" onClick={onCancel} disabled={submitting}>Hủy</Button><Button type="submit" disabled={submitting || missingOrgs}>{submitting ? 'Đang lưu…' : record ? 'Lưu thay đổi' : 'Lưu học kỳ'}</Button></div>
  </form></Modal>
}
function ProjectPeriodForm({ record, semesters, error, submitting, onCancel, onSubmit }: { record?: ProjectPeriod; semesters: Semester[]; error: AcademicError | null; submitting: boolean; onCancel: () => void; onSubmit: (draft: ProjectPeriodDraft) => Promise<void> }) {
  const [validationError, setValidationError] = useState('')
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget), startAt = toUtcDateTime(String(form.get('startAt'))), endAt = toUtcDateTime(String(form.get('endAt')))
    const minTeamSize = record?.minTeamSize ?? Number(form.get('minTeamSize')), maxTeamSize = record?.maxTeamSize ?? Number(form.get('maxTeamSize'))
    const minDistinctMajors = record?.minDistinctMajors ?? Number(form.get('minDistinctMajors')), maxProjectsPerSupervisor = record?.maxProjectsPerSupervisor ?? Number(form.get('maxProjectsPerSupervisor'))
    if (!startAt || !endAt || startAt >= endAt) { setValidationError('Thời gian kết thúc phải sau thời gian bắt đầu.'); return }
    if (maxTeamSize < minTeamSize || minDistinctMajors > maxTeamSize) { setValidationError('Kiểm tra số thành viên tối thiểu, tối đa và số ngành tham gia.'); return }
    setValidationError('')
    void onSubmit({ id: record?.id, academicSemesterId: record?.academicSemesterId ?? Number(form.get('semesterId')), code: String(form.get('code')).trim(), name: String(form.get('name')).trim(), periodType: String(form.get('periodType')) as ProjectPeriodDraft['periodType'], startAt, endAt, minTeamSize, maxTeamSize, minDistinctMajors, maxProjectsPerSupervisor, rubricId: record?.rubricId ?? null })
  }
  return <Modal title={record ? 'Chỉnh sửa cấu trúc giai đoạn' : 'Tạo giai đoạn đồ án'} busy={submitting} onClose={onCancel}><form onSubmit={submit}>
    {(validationError || error) && <div role="alert" className="governance-error col-span-full">{validationError || error?.message}{!validationError && error?.action === 'retry' && <Button type="submit" disabled={submitting}>Thử lại</Button>}</div>}
    {!record && <AcademicField label="Học kỳ" field="semesterId" error={error}><select name="semesterId" required defaultValue="" disabled={submitting}><option value="" disabled>Chọn học kỳ</option>{semesters.map(semester => <option key={semester.id} value={semester.id}>{semester.code} · {semester.name}</option>)}</select></AcademicField>}
    <AcademicField label="Mã giai đoạn" field="code" error={error}><input name="code" required defaultValue={record?.code} disabled={submitting} /></AcademicField>
    <AcademicField label="Tên giai đoạn" field="name" error={error}><input name="name" required defaultValue={record?.name} disabled={submitting} /></AcademicField>
    <AcademicField label="Loại giai đoạn" field="periodType" error={error}><select name="periodType" defaultValue={record?.periodType} disabled={submitting}>{projectPeriodTypes.map(type => <option key={type} value={type}>{labels[type]}</option>)}</select></AcademicField>
    <p className="text-xs text-ink-muted">Nhập thời gian theo giờ Việt Nam.</p>
    <AcademicField label="Bắt đầu" field="startAt" error={error}><input aria-label="Bắt đầu (giờ Việt Nam)" name="startAt" type="datetime-local" required defaultValue={record ? localDateTime(record.startAt) : undefined} disabled={submitting} /></AcademicField>
    <AcademicField label="Kết thúc" field="endAt" error={error}><input aria-label="Kết thúc (giờ Việt Nam)" name="endAt" type="datetime-local" required defaultValue={record ? localDateTime(record.endAt) : undefined} disabled={submitting} /></AcademicField>
    <p className="text-xs text-ink-muted">{record ? 'Các điều kiện hiện tại được hiển thị để đối chiếu. Mở phiên bản chính sách để thay đổi điều kiện áp dụng.' : 'Các điều kiện dưới đây sẽ được dùng cho chính sách ban đầu của giai đoạn.'}</p>
    <AcademicField label="Thành viên tối thiểu" field="minTeamSize" error={error}><input name="minTeamSize" type="number" min="1" required disabled={Boolean(record) || submitting} defaultValue={record?.minTeamSize ?? 3} /></AcademicField>
    <AcademicField label="Thành viên tối đa" field="maxTeamSize" error={error}><input name="maxTeamSize" type="number" min="1" required disabled={Boolean(record) || submitting} defaultValue={record?.maxTeamSize ?? 5} /></AcademicField>
    <AcademicField label="Số ngành tối thiểu" field="minDistinctMajors" error={error}><input name="minDistinctMajors" type="number" min="1" required disabled={Boolean(record) || submitting} defaultValue={record?.minDistinctMajors ?? 1} /></AcademicField>
    <AcademicField label="Đồ án tối đa mỗi GVHD" field="maxProjectsPerSupervisor" error={error}><input name="maxProjectsPerSupervisor" type="number" min="1" required disabled={Boolean(record) || submitting} defaultValue={record?.maxProjectsPerSupervisor ?? 5} /></AcademicField>
    <div className="governance-editor-actions"><Button variant="secondary" onClick={onCancel} disabled={submitting}>Hủy</Button><Button type="submit" disabled={submitting}>{submitting ? 'Đang lưu…' : record ? 'Lưu cấu trúc giai đoạn' : 'Tạo giai đoạn'}</Button></div>
  </form></Modal>
}
