import { Modal as AppModal } from '../../../components/ui/Modal'
import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { HttpError } from '../../../services/http/http-client'
import { useAcademicGovernance } from '../hooks/useAcademicGovernance'
import { projectPeriodTypes, type GovernanceStatus, type ProjectPeriod, type ProjectPeriodDraft, type Semester, type SemesterDraft } from '../types/governance.types'
import './academic-governance.css'
import './academic-governance-polish.css'

const nextStates: Record<GovernanceStatus, GovernanceStatus[]> = { DRAFT: ['UPCOMING', 'ARCHIVED'], UPCOMING: ['ACTIVE', 'DRAFT'], ACTIVE: ['CLOSED'], CLOSED: ['ARCHIVED'], ARCHIVED: [] }
const labels: Record<string, string> = { REGISTRATION: 'Đăng ký', PROJECT_REVIEW: 'Thẩm định', SUPERVISOR_SELECTION: 'Phân công hướng dẫn', EXECUTION: 'Thực hiện', FINAL_SUBMISSION: 'Bàn giao cuối kỳ', EVALUATION: 'Đánh giá' }
const statusLabels: Record<GovernanceStatus, string> = { DRAFT: 'Bản nháp', UPCOMING: 'Sắp diễn ra', ACTIVE: 'Đang hoạt động', CLOSED: 'Đã đóng', ARCHIVED: 'Đã lưu trữ' }
type Editor = { kind: 'semester'; record?: Semester } | { kind: 'period'; record?: ProjectPeriod }

function errorText(error: Error) { return error instanceof HttpError && error.status === 403 ? 'Bạn chưa có quyền quản trị cấu hình này.' : 'Không thể đồng bộ cấu hình học vụ. Hãy thử lại.' }
function toDate(value: string) { return value.slice(0, 10) }
function toDateTime(value: string) { return value.slice(0, 16) }
function formatDateTime(value: string) { const date = new Date(value); return Number.isNaN(date.valueOf()) ? value : date.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) }

export function AcademicGovernancePage() {
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ search: '' })
  const [editor, setEditor] = useState<Editor | null>(null)
  const [operationError, setOperationError] = useState<string | null>(null)
  const [operationSuccess, setOperationSuccess] = useState<string | null>(null)
  const governance = useAcademicGovernance(filters)
  const openEditor = (next: Editor) => { setOperationError(null); setOperationSuccess(null); setEditor(next) }
  const saveSemester = async (draft: SemesterDraft) => { setOperationError(null); setOperationSuccess(null); try { await governance.saveSemester(draft); setEditor(null); setOperationSuccess('Đã lưu học kỳ và cập nhật danh sách.') } catch (reason: unknown) { setOperationError(errorText(reason instanceof Error ? reason : new Error('Save failed'))) } }
  const savePeriod = async (draft: ProjectPeriodDraft) => { setOperationError(null); setOperationSuccess(null); try { await governance.saveProjectPeriod(draft); setEditor(null); setOperationSuccess('Đã lưu cấu trúc giai đoạn. Chính sách áp dụng được quản lý ở màn hình riêng.') } catch (reason: unknown) { setOperationError(errorText(reason instanceof Error ? reason : new Error('Save failed'))) } }
  const changeStatus = async (kind: 'semester' | 'period', id: number, status: GovernanceStatus, expectedStatus: GovernanceStatus) => { if (await requestConfirmation({ title: 'Thay đổi trạng thái?', description: `Chuyển ${kind === 'semester' ? 'học kỳ' : 'giai đoạn'} sang ${statusLabels[status].toLowerCase()}.`, confirmLabel: 'Xác nhận thay đổi' }) === null) return; setOperationError(null); setOperationSuccess(null); try { await governance.setStatus(kind, id, status, expectedStatus); setOperationSuccess(`Đã chuyển trạng thái sang ${statusLabels[status].toLowerCase()}.`) } catch (reason: unknown) { setOperationError(errorText(reason instanceof Error ? reason : new Error('Status change failed'))) } }

  if (governance.isUnauthorized) return <section className="governance-state" role="alert"><strong>Cần đăng nhập để xem cấu hình học vụ.</strong><Link to="/login">Đăng nhập</Link></section>
  if (governance.loading) return <section className="governance-state" role="status">Đang tải học kỳ và các giai đoạn đồ án…</section>
  if (governance.isForbidden) return <section className="governance-state" role="alert">Bạn không có quyền truy cập cấu hình học vụ.</section>
  if (governance.error) return <section className="governance-state" role="alert">{errorText(governance.error)} <Button onClick={governance.retry}>Thử lại</Button></section>
  return <WorkspacePage className="governance-page" title="Học kỳ và giai đoạn đồ án" eyebrow="Quản lý học vụ" description="Thiết lập thời gian đăng ký, thực hiện và đánh giá cho từng học kỳ." action={governance.canManage ? <div className="governance-actions"><Button onClick={() => openEditor({ kind: 'semester' })}>Thêm học kỳ</Button><Button variant="secondary" onClick={() => openEditor({ kind: 'period' })}>Thêm giai đoạn</Button></div> : null}>
    
    <p className="text-sm text-slate-600">Điều kiện về thành viên và ngành tham gia được quản lý trong chính sách của từng giai đoạn.</p>
    <form className="governance-filter" onSubmit={(event) => { event.preventDefault(); setFilters({ search }) }}><input aria-label="Tìm học kỳ hoặc giai đoạn" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo mã hoặc tên"/><Button type="submit" variant="secondary">Lọc</Button></form>
    {!governance.canManage ? <p className="governance-note">Bạn đang ở chế độ chỉ xem.</p> : null}{operationError && !editor ? <p className="governance-error" role="alert">{operationError}</p> : null}{operationSuccess ? <p className="governance-message" role="status">{operationSuccess}</p> : null}
    <section aria-labelledby="governance-semesters-title">
      <div className="governance-section-title"><h2 id="governance-semesters-title">Học kỳ</h2><span>{governance.semesters.length} học kỳ</span></div>
      <div className="governance-grid">{governance.semesters.map(semester => <article key={semester.id} className="governance-card">
        <div className="governance-record-heading"><div><p className="governance-record-code">{semester.code}</p><h3>{semester.name}</h3></div><span className="governance-record-kind">Học kỳ</span></div>
        <p className="governance-record-meta">{semester.organizationName || semester.organizationCode}</p>
        <dl className="governance-dates"><div><dt>Bắt đầu</dt><dd>{new Date(semester.startDate).toLocaleDateString('vi-VN')}</dd></div><div><dt>Kết thúc</dt><dd>{new Date(semester.endDate).toLocaleDateString('vi-VN')}</dd></div></dl>
        <div className="governance-record-footer">{governance.canManage && !['CLOSED', 'ARCHIVED'].includes(semester.status) && <Button size="sm" variant="secondary" onClick={() => openEditor({ kind: 'semester', record: semester })}>Chỉnh sửa</Button>}
          <Status label={`học kỳ ${semester.code}`} status={semester.status} busy={governance.submitting} canManage={governance.canManage} onChange={status => changeStatus('semester', semester.id, status, semester.status)} />
        </div>
      </article>)}</div>
      {!governance.semesters.length && <p className="governance-empty">Chưa có học kỳ phù hợp.</p>}
    </section>
    <section aria-labelledby="governance-periods-title">
      <div className="governance-section-title"><h2 id="governance-periods-title">Giai đoạn đồ án</h2><span>{governance.periods.length} giai đoạn</span></div>
      <div className="governance-periods">{governance.periods.map(period => <article key={period.id} className="governance-period">
        <div className="governance-record-heading"><div><p className="governance-record-code">{period.semesterCode} · {labels[period.periodType]}</p><h3>{period.name}</h3></div></div>
        <dl className="governance-dates"><div><dt>Bắt đầu</dt><dd>{formatDateTime(period.startAt)}</dd></div><div><dt>Kết thúc</dt><dd>{formatDateTime(period.endAt)}</dd></div></dl>
        <dl className="governance-period-facts"><div><dt>Số thành viên</dt><dd>{period.minTeamSize}–{period.maxTeamSize}</dd></div><div><dt>Số ngành tối thiểu</dt><dd>{period.minDistinctMajors}</dd></div><div><dt>Đồ án tối đa mỗi GVHD</dt><dd>{period.maxProjectsPerSupervisor}</dd></div></dl>
        <div className="governance-record-footer"><div className="governance-record-actions">
          <Link to={`/academic/project-periods/${period.id}/policy`} className="workspace-action-link">Các phiên bản chính sách<span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span></Link>
          {governance.canManage && !['CLOSED', 'ARCHIVED'].includes(period.status) && <Button size="sm" variant="secondary" onClick={() => openEditor({ kind: 'period', record: period })}>Chỉnh sửa cấu trúc</Button>}
        </div><Status label={`giai đoạn ${period.name}`} status={period.status} busy={governance.submitting} canManage={governance.canManage} onChange={status => changeStatus('period', period.id, status, period.status)} /></div>
      </article>)}</div>
      {!governance.periods.length && <p className="governance-empty">Chưa có giai đoạn phù hợp với bộ lọc.</p>}
    </section>
    {confirmationDialog}
    {editor?.kind === 'semester' ? <SemesterForm record={editor.record} error={operationError} submitting={governance.submitting} onCancel={() => setEditor(null)} onSubmit={saveSemester}/> : null}{editor?.kind === 'period' ? <ProjectPeriodForm record={editor.record} semesters={governance.semesters} error={operationError} submitting={governance.submitting} onCancel={() => setEditor(null)} onSubmit={savePeriod}/> : null}
  </WorkspacePage>
}

const transitionLabels: Record<GovernanceStatus, string> = { DRAFT: 'Đưa về bản nháp', UPCOMING: 'Đưa vào lịch', ACTIVE: 'Mở hoạt động', CLOSED: 'Đóng', ARCHIVED: 'Lưu trữ' }
function Status({ label, status, busy, canManage, onChange }: { label: string; status: GovernanceStatus; busy: boolean; canManage: boolean; onChange: (status: GovernanceStatus) => Promise<void> }) {
  return <div className="governance-status"><span className={`governance-badge governance-badge--${status.toLowerCase()}`}>{statusLabels[status]}</span>{canManage && nextStates[status].length > 0 && <select aria-label={`Thay đổi trạng thái ${label}`} value="" disabled={busy} onChange={event => void onChange(event.target.value as GovernanceStatus)}><option value="" disabled>Đổi trạng thái</option>{nextStates[status].map(next => <option key={next} value={next}>{transitionLabels[next]}</option>)}</select>}</div>
}
function Modal({ title, children, busy, onClose }: { title: string; children: ReactNode; busy: boolean; onClose: () => void }) {
  return <AppModal open title={title} busy={busy} onClose={onClose}><div className="governance-editor">{children}</div></AppModal>
}
function SemesterForm({ record, error, submitting, onCancel, onSubmit }: { record?: Semester; error: string | null; submitting: boolean; onCancel: () => void; onSubmit: (draft: SemesterDraft) => Promise<void> }) {
  const [validationError, setValidationError] = useState('')
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget), startDate = String(form.get('startDate')), endDate = String(form.get('endDate'))
    if (startDate > endDate) { setValidationError('Ngày kết thúc không được trước ngày bắt đầu.'); return }
    setValidationError('')
    void onSubmit({ id: record?.id, organizationId: record?.organizationId ?? Number(form.get('organizationId')), code: String(form.get('code')).trim(), name: String(form.get('name')).trim(), startDate, endDate })
  }
  return <Modal title={record ? 'Chỉnh sửa học kỳ' : 'Tạo học kỳ'} busy={submitting} onClose={onCancel}><form onSubmit={submit}>
    {(validationError || error) && <p role="alert" className="governance-error">{validationError || error}</p>}
    {!record && <label>Mã đơn vị<input name="organizationId" type="number" min="1" required disabled={submitting} /></label>}
    <label>Mã học kỳ<input name="code" required defaultValue={record?.code} disabled={submitting} /></label>
    <label>Tên học kỳ<input name="name" required defaultValue={record?.name} disabled={submitting} /></label>
    <label>Bắt đầu<input name="startDate" type="date" required defaultValue={record ? toDate(record.startDate) : undefined} disabled={submitting} /></label>
    <label>Kết thúc<input name="endDate" type="date" required defaultValue={record ? toDate(record.endDate) : undefined} disabled={submitting} /></label>
    <div className="governance-editor-actions"><Button variant="secondary" onClick={onCancel} disabled={submitting}>Hủy</Button><Button type="submit" disabled={submitting}>{submitting ? 'Đang lưu…' : record ? 'Lưu thay đổi' : 'Lưu học kỳ'}</Button></div>
  </form></Modal>
}
function ProjectPeriodForm({ record, semesters, error, submitting, onCancel, onSubmit }: { record?: ProjectPeriod; semesters: Semester[]; error: string | null; submitting: boolean; onCancel: () => void; onSubmit: (draft: ProjectPeriodDraft) => Promise<void> }) {
  const [validationError, setValidationError] = useState('')
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget), startAt = String(form.get('startAt')), endAt = String(form.get('endAt'))
    const minTeamSize = record?.minTeamSize ?? Number(form.get('minTeamSize')), maxTeamSize = record?.maxTeamSize ?? Number(form.get('maxTeamSize'))
    const minDistinctMajors = record?.minDistinctMajors ?? Number(form.get('minDistinctMajors')), maxProjectsPerSupervisor = record?.maxProjectsPerSupervisor ?? Number(form.get('maxProjectsPerSupervisor'))
    if (startAt >= endAt) { setValidationError('Thời gian kết thúc phải sau thời gian bắt đầu.'); return }
    if (maxTeamSize < minTeamSize || minDistinctMajors > maxTeamSize) { setValidationError('Kiểm tra số thành viên tối thiểu, tối đa và số ngành tham gia.'); return }
    setValidationError('')
    void onSubmit({ id: record?.id, academicSemesterId: record?.academicSemesterId ?? Number(form.get('semesterId')), code: String(form.get('code')).trim(), name: String(form.get('name')).trim(), periodType: String(form.get('periodType')) as ProjectPeriodDraft['periodType'], startAt, endAt, minTeamSize, maxTeamSize, minDistinctMajors, maxProjectsPerSupervisor, rubricId: record?.rubricId ?? null })
  }
  return <Modal title={record ? 'Chỉnh sửa cấu trúc giai đoạn' : 'Tạo giai đoạn đồ án'} busy={submitting} onClose={onCancel}><form onSubmit={submit}>
    {(validationError || error) && <p role="alert" className="governance-error">{validationError || error}</p>}
    {!record && <label>Học kỳ<select name="semesterId" required defaultValue="" disabled={submitting}><option value="" disabled>Chọn học kỳ</option>{semesters.map(semester => <option key={semester.id} value={semester.id}>{semester.code} · {semester.name}</option>)}</select></label>}
    <label>Mã giai đoạn<input name="code" required defaultValue={record?.code} disabled={submitting} /></label>
    <label>Tên giai đoạn<input name="name" required defaultValue={record?.name} disabled={submitting} /></label>
    <label>Loại giai đoạn<select name="periodType" defaultValue={record?.periodType} disabled={submitting}>{projectPeriodTypes.map(type => <option key={type} value={type}>{labels[type]}</option>)}</select></label>
    <label>Bắt đầu<input name="startAt" type="datetime-local" required defaultValue={record ? toDateTime(record.startAt) : undefined} disabled={submitting} /></label>
    <label>Kết thúc<input name="endAt" type="datetime-local" required defaultValue={record ? toDateTime(record.endAt) : undefined} disabled={submitting} /></label>
    <p className="text-xs text-slate-600">{record ? 'Các điều kiện hiện tại được hiển thị để đối chiếu. Mở phiên bản chính sách để thay đổi điều kiện áp dụng.' : 'Các điều kiện dưới đây sẽ được dùng cho chính sách ban đầu của giai đoạn.'}</p>
    <label>Thành viên tối thiểu<input name="minTeamSize" type="number" min="1" required disabled={Boolean(record) || submitting} defaultValue={record?.minTeamSize ?? 3} /></label>
    <label>Thành viên tối đa<input name="maxTeamSize" type="number" min="1" required disabled={Boolean(record) || submitting} defaultValue={record?.maxTeamSize ?? 5} /></label>
    <label>Số ngành tối thiểu<input name="minDistinctMajors" type="number" min="1" required disabled={Boolean(record) || submitting} defaultValue={record?.minDistinctMajors ?? 1} /></label>
    <label>Đồ án tối đa mỗi GVHD<input name="maxProjectsPerSupervisor" type="number" min="1" required disabled={Boolean(record) || submitting} defaultValue={record?.maxProjectsPerSupervisor ?? 5} /></label>
    <div className="governance-editor-actions"><Button variant="secondary" onClick={onCancel} disabled={submitting}>Hủy</Button><Button type="submit" disabled={submitting}>{submitting ? 'Đang lưu…' : record ? 'Lưu cấu trúc giai đoạn' : 'Tạo giai đoạn'}</Button></div>
  </form></Modal>
}
