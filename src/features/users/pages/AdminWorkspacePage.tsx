import { displayLabel } from '../../../components/ui/display-label'
import { utcTimestamp } from '../../projects/utils/collaboration-workspace'
import { ListLoading } from '../../../components/ui/ListLoading'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import type { BadgeTone } from '../../../components/ui/status-badge-tone'
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../../../components/ui/Table'
import { AcademicScopeFields } from '../../academic/components/AcademicScopeFields'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useAuthSession } from '../../auth/context/useAuthSession'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { humanizeHttpError } from '../../../services/http/humanize-http-error'
import { exportAdminUserAccounts, type Audit, type UserAccount, type UserDraft } from '../api/admin-api'
import { useAdminWorkspace } from '../hooks/useAdminWorkspace'
import './admin-workspace.css'
import { SystemStatusPanel } from '../components/SystemStatusPanel'
import { StudentImportDialog } from '../components/StudentImportDialog'
import { getAcademicHierarchy } from '../../academic/api/academic-api'
import type { AcademicHierarchyOrganization } from '../../academic/types/academic.types'
import { AccessEventsPanel } from '../components/AccessEventsPanel'

const blankAccount: UserDraft = { departmentId: null, majorId: null, email: '', password: '', fullName: '', phone: null, studentCode: null, employeeCode: null, title: null, roleIds: [] }
const messageFor = (reason: unknown) => humanizeHttpError(reason, 'Chưa thể hoàn tất thao tác. Hãy thử lại.')
const integer = (value: FormDataEntryValue | null) => { const result = Number(value); return Number.isInteger(result) && result > 0 ? result : null }

function auditDateBoundary(day: string, end = false): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return undefined
  const date = new Date(`${day}T${end ? '23:59:59.999' : '00:00:00.000'}+07:00`)
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined
}

export function AdminWorkspacePage() {
  const { session } = useAuthSession()
  const [hierarchy, setHierarchy] = useState<AcademicHierarchyOrganization[]>([])
  const [academicNames, setAcademicNames] = useState<{ departments: Record<number, string>; majors: Record<number, string> }>({ departments: {}, majors: {} })
  useEffect(() => {
    const abort = new AbortController()
    setHierarchy([])
    setAcademicNames({ departments: {}, majors: {} })
    if (session?.accessToken) void getAcademicHierarchy(session.accessToken, { search: '', includeInactive: true }, abort.signal).then(rows => {
      if (abort.signal.aborted) return
      const departments: Record<number, string> = {}, majors: Record<number, string> = {}
      for (const organization of rows) for (const entry of organization.departments) {
        departments[entry.department.id] = entry.department.name
        for (const major of entry.majors) majors[major.id] = major.name
      }
      setHierarchy(rows)
      setAcademicNames({ departments, majors })
    }).catch(() => undefined)
    return () => abort.abort()
  }, [session?.accessToken])
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1)
  const search = params.get('search') ?? ''
  const status = params.get('status') ?? ''
  const roleFilter = params.get('role') ?? ''
  const departmentFilter = params.get('departmentId') ?? ''
  const majorFilter = params.get('majorId') ?? ''
  const departmentIdNum = Number(departmentFilter) > 0 ? Number(departmentFilter) : undefined
  const majorIdNum = Number(majorFilter) > 0 ? Number(majorFilter) : undefined
  const auditAction = params.get('auditAction') ?? ''
  const auditEntityType = params.get('auditEntityType') ?? ''
  const auditOutcome = params.get('auditOutcome') ?? ''
  const auditFrom = params.get('auditFrom') ?? ''
  const auditTo = params.get('auditTo') ?? ''
  const admin = useAdminWorkspace({
    search,
    status: status || undefined,
    role: roleFilter || undefined,
    departmentId: departmentIdNum,
    majorId: majorIdNum,
    page,
  }, {
    action: auditAction || undefined,
    entityType: auditEntityType || undefined,
    outcome: auditOutcome || undefined,
    fromUtc: auditDateBoundary(auditFrom),
    toUtc: auditDateBoundary(auditTo, true),
  })
  const [notice, setNotice] = useState<string | null>(null)
  const [errorNotice, setErrorNotice] = useState<string | null>(null)
  const [importText, setImportText] = useState('')
  const [accountScope, setAccountScope] = useState({ departmentId: '', majorId: '' })
  const [busy, setBusy] = useState(false)
  const [exportingAccounts, setExportingAccounts] = useState(false)
  const [studentImportOpen, setStudentImportOpen] = useState(false)
  const busyRef = useRef(false)
  const exportAbortRef = useRef<AbortController | null>(null)
  useEffect(() => () => { exportAbortRef.current?.abort(); exportAbortRef.current = null }, [])
  const allDepartments = useMemo(() => hierarchy.flatMap(org => org.departments), [hierarchy])
  const availableMajors = useMemo(() => {
    if (!departmentFilter) return allDepartments.flatMap(d => d.majors)
    return allDepartments.find(d => String(d.department.id) === departmentFilter)?.majors ?? []
  }, [allDepartments, departmentFilter])
  const globalRoles = useMemo(() => admin.rbac.value.roles.filter((role) => role.isAssignableGlobalRole && role.assignmentKind === 'GLOBAL'), [admin.rbac.value.roles])
  const setFilter = (patch: Record<string, string>) => { const next = new URLSearchParams(params); Object.entries(patch).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key)); if (!('page' in patch)) next.set('page', '1'); setParams(next) }
  const run = async (action: () => Promise<unknown>, success: string) => { if (busyRef.current) return false; busyRef.current = true; setBusy(true); setNotice(null); setErrorNotice(null); try { await action(); setNotice(success); return true } catch (reason) { setErrorNotice(messageFor(reason)); return false } finally { busyRef.current = false; setBusy(false) } }

  async function handleExportAccounts() {
    if (!session?.accessToken || exportingAccounts || exportAbortRef.current) return
    const controller = new AbortController()
    exportAbortRef.current = controller
    setExportingAccounts(true)
    setNotice(null)
    try {
      const blob = await exportAdminUserAccounts({
        search: search || undefined,
        status: status || undefined,
        role: roleFilter || undefined,
        departmentId: departmentIdNum,
        majorId: majorIdNum,
      }, session.accessToken, controller.signal)
      if (controller.signal.aborted) return
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      try {
        anchor.href = url
        anchor.download = 'system-accounts.xlsx'
        document.body.appendChild(anchor)
        anchor.click()
      } finally {
        anchor.remove()
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
      }
      setNotice('Đã xuất tệp Excel danh sách tài khoản hệ thống theo bộ lọc hiện tại.')
    } catch (reason) {
      if (!controller.signal.aborted) setNotice(messageFor(reason))
    } finally {
      if (exportAbortRef.current === controller) { exportAbortRef.current = null; setExportingAccounts(false) }
    }
  }

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const element = event.currentTarget; const form = new FormData(element)
    const roleIds = Array.from(form.getAll('roleIds')).map(Number).filter(Boolean)
    void run(() => admin.createUser({ ...blankAccount, fullName: String(form.get('fullName') ?? '').trim(), email: String(form.get('email') ?? '').trim(), password: String(form.get('password') ?? ''), studentCode: String(form.get('studentCode') ?? '').trim() || null, employeeCode: String(form.get('employeeCode') ?? '').trim() || null, departmentId: integer(form.get('departmentId')), majorId: integer(form.get('majorId')), roleIds }), 'Máy chủ đã tạo tài khoản.').then(ok => { if (ok) { element.reset(); setAccountScope({ departmentId: '', majorId: '' }) } })
  }

  function submitImport() {
    try { const accounts = JSON.parse(importText) as UserDraft[]; if (!Array.isArray(accounts) || !accounts.length) throw new Error('invalid'); void run(() => admin.importUsers(accounts), 'Máy chủ đã nhập toàn bộ lô tài khoản.').then(ok => { if (ok) setImportText('') }) } catch { setNotice(null); setErrorNotice('Tệp JSON phải là mảng tài khoản theo cấu trúc yêu cầu. Lô không được gửi khi dữ liệu chưa hợp lệ.') }
  }

  const activeTab = params.get('tab') === 'audit' ? 'audit' : params.get('tab') === 'access' ? 'access' : 'accounts'

  return <div className="workspace-page admin-workspace" aria-labelledby="admin-title">
    <header className="admin-heading">
      <div>
        <p className="admin-kicker">Quản trị nền tảng</p>
        <h1 id="admin-title">Hệ thống và quyền truy cập</h1>
        <p>Quản lý tài khoản, phân quyền và theo dõi hoạt động trên hệ thống.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link className="admin-link-button" to="/academic/governance">Quản lý học vụ</Link>
        <Link className="admin-link-button" to="/academic">Cấu trúc tổ chức</Link>
      </div>
    </header>
    <nav className="admin-tabs" aria-label="Khu vực quản trị">
      <div className="admin-tab-group">
        <button type="button" className={`admin-tab-btn ${activeTab === 'accounts' ? 'is-active' : ''}`} aria-controls="accounts" aria-pressed={activeTab === 'accounts'} onClick={() => setFilter({ tab: 'accounts' })}>Tài khoản người dùng</button>
        <button type="button" className={`admin-tab-btn ${activeTab === 'access' ? 'is-active' : ''}`} aria-controls="access-events" aria-pressed={activeTab === 'access'} onClick={() => setFilter({ tab: 'access' })}>Nhật ký truy cập</button>
        <button type="button" className={`admin-tab-btn ${activeTab === 'audit' ? 'is-active' : ''}`} aria-controls="audit" aria-pressed={activeTab === 'audit'} onClick={() => setFilter({ tab: 'audit' })}>Nhật ký bảo mật</button>
      </div>
      <div className="admin-nav-links" aria-label="Trang quản trị liên quan">
        <Link to="/admin/access/rbac">Phân quyền</Link>
        <Link to="/academic/governance">Học kỳ & Kỳ đồ án</Link>
      </div>
    </nav>
    {notice ? <p className="admin-notice" role="status">{notice}</p> : null}
    {errorNotice ? <p className="admin-error" role="alert">{errorNotice}</p> : null}
    <SystemStatusPanel />

    <section className="admin-overview" aria-label="Tổng quan vận hành">
      <Fact label="Tài khoản theo bộ lọc" value={admin.users.state === 'ready' ? String(admin.users.value.totalCount) : admin.users.state === 'error' ? 'Chưa tải được' : '—'} />
      <Fact label="Vai trò hệ thống" value={admin.rbac.state === 'ready' ? String(globalRoles.length) : admin.rbac.state === 'error' ? 'Chưa tải được' : '—'} />
      <Fact label="Hoạt động đã ghi nhận" value={admin.audit.state === 'ready' ? String(admin.audit.value.totalCount) : admin.audit.state === 'error' ? 'Chưa tải được' : '—'} />
      <p className="admin-boundary">Theo dõi tài khoản, vai trò và hoạt động quản trị trên hệ thống.</p>
    </section>

    {activeTab === 'accounts' && admin.audit.state === 'ready' && admin.audit.value.items.length > 0 ? <section className="admin-panel admin-activity-preview" aria-labelledby="admin-activity-title">
      <div className="admin-panel-heading"><div><h2 id="admin-activity-title">Hoạt động bảo mật được ghi nhận</h2><p>Các bản ghi trong trang nhật ký hiện tại. Mở nhật ký để lọc và xem thêm.</p></div><Button type="button" variant="secondary" onClick={() => setFilter({ tab: 'audit' })}>Xem nhật ký</Button></div>
      <ul className="admin-activity-list">{admin.audit.value.items.slice(0, 4).map(record => <li key={record.id}>
        <span className={`admin-activity-indicator ${record.outcome === 'SUCCESS' ? 'is-success' : 'is-failure'}`} aria-hidden="true" />
        <span><strong>{auditActionLabel(record.action)}</strong><small>{formatAuditEntity(record)}{record.actorName ? ` · bởi ${record.actorName}` : ''} · {record.outcome === 'SUCCESS' ? 'Thành công' : record.outcome === 'FAILURE' ? 'Thất bại' : displayLabel(record.outcome)}</small></span>
        <time dateTime={record.occurredAt}>{new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }).format(utcTimestamp(record.occurredAt))}</time>
      </li>)}</ul>
    </section> : null}

    <section id="accounts" className="admin-panel" aria-labelledby="accounts-title" hidden={activeTab !== 'accounts'}><div className="admin-panel-heading admin-roster-heading"><div><h2 id="accounts-title">Tài khoản người dùng</h2><p>Tìm kiếm, lọc theo vai trò, khoa/ngành, trạng thái và quản lý vòng đời tài khoản. Vai trò hệ thống được quản lý riêng với phân công trong đồ án.</p></div><div className="flex flex-wrap gap-2"><Button icon="upload" onClick={() => setStudentImportOpen(true)}>Nhập sinh viên từ Excel</Button><Button variant="outline" icon="download" disabled={exportingAccounts} onClick={() => void handleExportAccounts()}>{exportingAccounts ? 'Đang xuất…' : 'Xuất Excel Tài khoản'}</Button></div></div>
      {studentImportOpen && <StudentImportDialog onClose={() => setStudentImportOpen(false)} onImported={admin.refresh} />}
      <form key={JSON.stringify([search, status, roleFilter, departmentFilter, majorFilter])} className="admin-filter" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); setFilter({ search: String(data.get('search') ?? ''), status: String(data.get('status') ?? ''), role: String(data.get('role') ?? ''), departmentId: String(data.get('departmentId') ?? ''), majorId: String(data.get('majorId') ?? ''), page: '1' }) }}>
        <label>Tìm kiếm<input name="search" defaultValue={search} placeholder="Tên, email hoặc mã" /></label>
        <label>Vai trò<select name="role" defaultValue={roleFilter}>
          <option value="">Tất cả vai trò</option>
          <option value="STUDENT">Sinh viên</option>
          <option value="LECTURER">Giảng viên</option>
          <option value="DEPARTMENT_STAFF">Giáo vụ Khoa</option>
          <option value="ADMIN">Quản trị viên</option>
        </select></label>
        <label>Khoa / Bộ môn<select name="departmentId" defaultValue={departmentFilter} onChange={event => {
          const data = event.currentTarget.form ? new FormData(event.currentTarget.form) : null
          setFilter({
            search: data ? String(data.get('search') ?? '') : search,
            status: data ? String(data.get('status') ?? '') : status,
            role: data ? String(data.get('role') ?? '') : roleFilter,
            departmentId: event.target.value,
            majorId: '',
            page: '1',
          })
        }}>
          <option value="">Tất cả khoa</option>
          {allDepartments.map(({ department }) => <option key={department.id} value={department.id}>{department.name}</option>)}
        </select></label>
        <label>Ngành<select name="majorId" defaultValue={majorFilter}>
          <option value="">Tất cả ngành</option>
          {availableMajors.map(major => <option key={major.id} value={major.id}>{major.name}</option>)}
        </select></label>
        <label>Trạng thái<select name="status" defaultValue={status}><option value="">Tất cả</option><option value="ACTIVE">Đang hoạt động</option><option value="INACTIVE">Ngừng hoạt động</option><option value="SUSPENDED">Đang khóa</option></select></label>
        <Button type="submit" variant="secondary">Áp dụng</Button>
        {(search || status || roleFilter || departmentFilter || majorFilter) ? <Button type="button" variant="outline" onClick={() => setFilter({ search: '', status: '', role: '', departmentId: '', majorId: '', page: '1' })}>Đặt lại bộ lọc</Button> : null}
      </form>
      {admin.users.state === 'loading' ? <ListLoading label="Đang tải danh sách tài khoản…" /> : null}
      {admin.users.state === 'error' ? <Failure message={admin.isForbidden(admin.users) ? 'Bạn không có quyền quản trị tài khoản.' : 'Chưa tải được danh sách tài khoản.'} retry={admin.refresh} /> : null}
      {admin.users.state === 'ready' ? <Table stack>
        <TableHead>
          <TableRow head>
            <TableHeaderCell>Người dùng</TableHeaderCell>
            <TableHeaderCell>Vai trò hệ thống</TableHeaderCell>
            <TableHeaderCell>Trạng thái</TableHeaderCell>
            <TableHeaderCell>Đăng nhập gần nhất</TableHeaderCell>
            <TableHeaderCell>Phạm vi học thuật</TableHeaderCell>
            <TableHeaderCell>Thao tác</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {admin.users.value.items.map((user) => <TableRow key={user.id}>
            <TableCell label="Người dùng"><div className="flex flex-col"><strong>{user.fullName}</strong><span>{user.email}</span><small className="text-ink-muted">{user.studentCode ?? user.employeeCode ?? 'Không có mã'}</small></div></TableCell>
            <TableCell label="Vai trò hệ thống">{user.roles.filter((role) => globalRoles.some((globalRole) => globalRole.code === role)).map(role => role === 'LECTURER' ? 'Giảng viên' : role === 'EVALUATOR' ? 'Người chấm' : displayLabel(role)).join(', ') || 'Chưa gán'}</TableCell>
            <TableCell label="Trạng thái"><Status status={user.status} /></TableCell>
            <TableCell label="Đăng nhập gần nhất">{user.lastLoginAt ? <time dateTime={user.lastLoginAt}>{new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(utcTimestamp(user.lastLoginAt))}</time> : 'Chưa ghi nhận'}</TableCell>
            <TableCell label="Phạm vi học thuật">
              <div className="flex flex-col">
                <span>
                  {user.departmentId ? academicNames.departments[user.departmentId] ?? 'Chưa tải được tên bộ môn' : 'Chưa liên kết bộ môn'}
                  {user.majorId ? ` · ${academicNames.majors[user.majorId] ?? 'Chưa tải được tên ngành'}` : ''}
                </span>
                {(user.classCode || user.specializationName) && (
                  <small className="text-ink-muted">
                    {[user.classCode ? `Lớp ${user.classCode}` : null, user.specializationName].filter(Boolean).join(' · ')}
                  </small>
                )}
              </div>
            </TableCell>
            <TableCell label="Thao tác"><Link to={`/admin/access/users/${user.id}`} state={{ returnTo: `/admin/access?${params.toString()}` }}>Xem chi tiết</Link></TableCell>
          </TableRow>)}
        </TableBody>
      </Table> : null}
      {admin.users.state === 'ready' && !admin.users.value.items.length ? <p>Không có tài khoản phù hợp với bộ lọc hiện tại.</p> : null}
      {admin.users.state === 'ready' && <Pagination page={admin.users.value.page} pageSize={admin.users.value.pageSize} total={admin.users.value.totalCount} onPage={(next) => setFilter({ page: String(next) })} />}
      <details className="admin-disclosure rounded-xl border border-hairline bg-canvas p-4 mt-4"><summary className="cursor-pointer font-bold text-ink hover:text-primary">Tạo tài khoản đơn lẻ</summary><form className="admin-form mt-3" onSubmit={submitCreate}><fieldset className="admin-create-fields" disabled={busy}><label>Họ tên<input name="fullName" required /></label><label>Email<input name="email" type="email" required /></label><label>Mật khẩu ban đầu<input name="password" type="password" minLength={10} placeholder="Ít nhất 10 ký tự" required autoComplete="new-password" /></label><label>Mã sinh viên<input name="studentCode" /></label><label>Mã nhân sự<input name="employeeCode" /></label><AcademicScopeFields {...accountScope} onChange={setAccountScope} /><fieldset><legend>Vai trò hệ thống</legend>{globalRoles.map((role) => <label key={role.id} className="admin-choice"><input name="roleIds" type="checkbox" value={role.id} />{role.code === 'LECTURER' ? 'Giảng viên' : displayLabel(role.code)}</label>)}</fieldset><p className="admin-boundary">Vai trò trưởng nhóm, giảng viên hướng dẫn và người chấm được quản lý theo từng đồ án.</p><Button type="submit" disabled={busy}>{busy ? 'Đang tạo…' : 'Tạo tài khoản'}</Button></fieldset></form></details>
      <details className="admin-disclosure rounded-xl border border-hairline bg-canvas p-4 mt-4"><summary className="cursor-pointer font-bold text-ink hover:text-primary">Nhập nhiều tài khoản (JSON Batch)</summary><div className="mt-3"><p className="text-xs text-ink-muted">Nhập từ 1 đến 500 tài khoản bằng tệp JSON. Cả lô chỉ được lưu khi tất cả tài khoản hợp lệ.</p><div className="mt-2 flex items-center gap-2"><Button size="sm" variant="outline" type="button" onClick={() => setImportText(JSON.stringify([{ fullName: 'Nguyễn Văn Mẫu', email: 'mau@example.edu.vn', password: 'Password123!', roleIds: [1], departmentId: null, majorId: null }], null, 2))}>Điền dữ liệu mẫu</Button>{importText.trim() ? <Button size="sm" variant="ghost" type="button" onClick={() => setImportText('')}>Xóa nội dung</Button> : null}</div><label className="admin-import-label mt-2"><span className="text-xs font-semibold text-ink-soft">Nội dung JSON</span><textarea value={importText} onChange={(event) => setImportText(event.target.value)} placeholder={'[{"fullName":"…","email":"…","password":"…","roleIds":[1],"departmentId":null,"majorId":null}]'} className="font-mono text-xs" /></label><Button type="button" disabled={busy || !importText.trim()} onClick={submitImport}>{busy ? 'Đang gửi...' : 'Gửi lô tới máy chủ'}</Button></div></details>
      <p className="admin-gap">Mở hồ sơ từng tài khoản để cập nhật bộ môn và ngành. Cập nhật khung CTĐT, xác minh hồ sơ sinh viên và xuất danh sách nhóm thuộc thẩm quyền Giáo vụ Khoa.</p>
    </section>

    {activeTab === 'access' && <AccessEventsPanel />}
    <section id="audit" className="admin-panel" aria-labelledby="audit-title" hidden={activeTab !== 'audit'}>
      <div className="admin-panel-heading"><div><h2 id="audit-title">Nhật ký bảo mật</h2><p>Theo dõi thời gian, người thực hiện và nội dung hoạt động quản trị.</p></div></div>
      <form key={[auditAction, auditEntityType, auditOutcome, auditFrom, auditTo].join('|')} className="admin-filter" onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        setFilter({
          auditAction: String(data.get('action') ?? ''),
          auditEntityType: String(data.get('entityType') ?? ''),
          auditOutcome: String(data.get('outcome') ?? ''),
          auditFrom: String(data.get('fromUtc') ?? ''),
          auditTo: String(data.get('toUtc') ?? ''),
        })
      }}>
        <label>Hành động<input name="action" defaultValue={auditAction} placeholder="Nhập mã hành động cần lọc..." /></label>
        <label>Đối tượng<input name="entityType" defaultValue={auditEntityType} placeholder="Nhập loại đối tượng cần lọc..." /></label>
        <label>Kết quả
          <select name="outcome" defaultValue={auditOutcome}>
            <option value="">Tất cả</option>
            <option value="SUCCESS">Thành công</option>
            <option value="FAILURE">Thất bại</option>
          </select>
        </label>
        <label>Từ ngày (giờ Việt Nam)<input type="date" name="fromUtc" defaultValue={auditFrom} /></label>
        <label>Đến ngày (giờ Việt Nam)<input type="date" name="toUtc" defaultValue={auditTo} /></label>
        <Button type="submit" variant="secondary">Lọc</Button>
        {(auditAction || auditEntityType || auditOutcome || auditFrom || auditTo) ? (
          <Button type="button" variant="outline" onClick={() => setFilter({ auditAction: '', auditEntityType: '', auditOutcome: '', auditFrom: '', auditTo: '' })}>Đặt lại</Button>
        ) : null}
      </form>
      {admin.audit.state === 'loading' ? <ListLoading label="Đang tải nhật ký…" /> : null}
      {admin.audit.state === 'error' ? <Failure message={admin.isForbidden(admin.audit) ? 'Bạn không có quyền xem nhật ký bảo mật.' : 'Chưa tải được nhật ký bảo mật.'} retry={admin.refresh} /> : null}
      {admin.audit.state === 'ready' && admin.audit.value.items.length > 0 ? (
        <Table stack className="mt-3">
          <TableHead>
            <TableRow head>
              <TableHeaderCell>Hành động</TableHeaderCell>
              <TableHeaderCell>Người thực hiện</TableHeaderCell>
              <TableHeaderCell>Đối tượng</TableHeaderCell>
              <TableHeaderCell>Kết quả</TableHeaderCell>
              <TableHeaderCell>Thời gian</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {admin.audit.value.items.map((record) => (
              <TableRow key={record.id}>
                <TableCell label="Hành động"><strong title={record.action}>{auditActionLabel(record.action)}</strong></TableCell>
                <TableCell label="Người thực hiện">{record.actorName?.trim() || 'Hệ thống'}</TableCell>
                <TableCell label="Đối tượng">{formatAuditEntity(record)}</TableCell>
                <TableCell label="Kết quả">
                  <StatusBadge
                    tone={record.outcome === 'SUCCESS' ? 'success' : 'danger'}
                    label={record.outcome === 'SUCCESS' ? 'Thành công' : record.outcome === 'FAILURE' ? 'Thất bại' : displayLabel(record.outcome)}
                  />
                </TableCell>
                <TableCell label="Thời gian"><time dateTime={record.occurredAt}>{new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }).format(utcTimestamp(record.occurredAt))}</time></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
      {admin.audit.state === 'ready' && admin.audit.value.totalCount === 0 ? <p role="status">Không có hoạt động phù hợp với bộ lọc hiện tại.</p> : null}
      {admin.audit.state === 'ready' && admin.audit.value.totalCount > 0 && <Pagination page={admin.audit.value.page} pageSize={admin.audit.value.pageSize} total={admin.audit.value.totalCount} onPage={(next) => setFilter({ page: String(next) })} />}
    </section>
  </div>
}

function formatAuditEntity(record: Audit): string {
  const typeLabel = displayLabel(record.entityType)
  if (record.entityDisplayName?.trim()) return `${typeLabel}: ${record.entityDisplayName.trim()}`
  return typeLabel
}

function Fact({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div> }
const statusTone: Record<UserAccount['status'], BadgeTone> = { ACTIVE: 'success', INACTIVE: 'neutral', SUSPENDED: 'danger' }
function Status({ status }: { status: UserAccount['status'] }) { const label = { ACTIVE: 'Đang hoạt động', INACTIVE: 'Ngừng hoạt động', SUSPENDED: 'Đang khóa' }[status]; return <StatusBadge tone={statusTone[status]} label={label} /> }
function Failure({ message, retry }: { message: string; retry: () => void }) { return <p className="admin-error" role="alert">{message} <Button size="sm" variant="outline" onClick={retry}>Thử lại</Button></p> }
function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  return (
    <div className="admin-pagination">
      <span>Trang {page}/{pages} · {total} kết quả</span>
      <div className="flex items-center gap-1">
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPage(1)}>Đầu</Button>
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>Trang trước</Button>
        <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => onPage(page + 1)}>Trang sau</Button>
        <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => onPage(pages)}>Cuối</Button>
      </div>
    </div>
  )
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  AUTH_LOGIN: 'Đăng nhập',
  AUTH_LOGIN_SUCCESS: 'Đăng nhập thành công',
  AUTH_LOGIN_FAILED: 'Đăng nhập thất bại',
  AUTH_LOGOUT: 'Đăng xuất',
  AUTH_PASSWORD_CHANGED: 'Đổi mật khẩu',
  AUTH_PASSWORD_RESET: 'Đặt lại mật khẩu',
  AUTH_REFRESH_TOKEN_ROTATED: 'Gia hạn phiên đăng nhập',
  ACCOUNT_CREATED: 'Tạo tài khoản',
  ACCOUNT_UPDATED: 'Cập nhật tài khoản',
  ACCOUNT_ACTIVATED: 'Kích hoạt tài khoản',
  ACCOUNT_DEACTIVATED: 'Vô hiệu hóa tài khoản',
  ACCOUNT_BLOCKED: 'Khóa tài khoản',
  ACCOUNT_UNBLOCKED: 'Mở khóa tài khoản',
  ACCOUNT_IMPORTED: 'Nhập lô tài khoản',
  ACCOUNT_ROLE_ASSIGNED: 'Gán vai trò cho tài khoản',
  ACCOUNT_ROLE_REMOVED: 'Gỡ vai trò khỏi tài khoản',
  ACADEMIC_PROFILE_UPDATED: 'Cập nhật hồ sơ học vụ',
  ACADEMIC_PROFILE_VERIFIED: 'Xác minh hồ sơ học vụ',
  ACADEMIC_PROFILE_REJECTED: 'Yêu cầu bổ sung hồ sơ học vụ',
  ROLE_PERMISSIONS_UPDATED: 'Cập nhật quyền của vai trò',
  ROLE_CREATED: 'Tạo vai trò',
  ROLE_UPDATED: 'Cập nhật vai trò',
  ROLE_DELETED: 'Xóa vai trò',
  PERMISSION_CREATED: 'Tạo quyền truy cập',
  PERMISSION_UPDATED: 'Cập nhật quyền truy cập',
  PERMISSION_DELETED: 'Xóa quyền truy cập',
  USER_CREATED: 'Tạo người dùng',
  USER_UPDATED: 'Cập nhật người dùng',
  USER_STATUS_CHANGED: 'Đổi trạng thái người dùng',
  PROJECT_CREATED: 'Tạo đồ án',
  PROJECT_UPDATED: 'Cập nhật đồ án',
  PROJECT_APPROVED: 'Phê duyệt đồ án',
  PROJECT_REJECTED: 'Từ chối đồ án',
  EXPERT_INVITED: 'Mời chuyên gia doanh nghiệp',
  EXPERT_INVITATION_REVOKED: 'Thu hồi lời mời chuyên gia',
  CHAT_CREATED: 'Tạo cuộc trò chuyện',
  CHAT_MESSAGE_SENT: 'Gửi tin nhắn',
  CHAT_MESSAGE_DELETED: 'Xóa tin nhắn',
  ACADEMIC_ASSISTANT_ASKED: 'Hỏi đáp Trợ lý AI',
  ASSISTANT_CONVERSATION_CREATED: 'Tạo hội thoại Trợ lý AI',
  ASSISTANT_CONVERSATION_DELETED: 'Xóa hội thoại Trợ lý AI',
}

function auditActionLabel(code: string) {
  return AUDIT_ACTION_LABELS[code] ?? displayLabel(code)
}

