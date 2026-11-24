import { displayLabel } from '../../../components/ui/display-label'
import { utcTimestamp } from '../../projects/utils/collaboration-workspace'
import { ListLoading } from '../../../components/ui/ListLoading'
import { Pagination } from '../../../components/ui/Pagination'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { StatTileRow } from '../../../components/ui/StatTileRow'
import type { BadgeTone } from '../../../components/ui/status-badge-tone'
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../../../components/ui/Table'
import { AcademicScopeFields } from '../../academic/components/AcademicScopeFields'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useAuthSession } from '../../auth/context/useAuthSession'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { HttpError } from '../../../services/http/http-client'
import { env } from '../../../app/config/env'
import type { UserAccount, UserDraft } from '../api/admin-api'
import { useAdminWorkspace } from '../hooks/useAdminWorkspace'
import './admin-workspace.css'
import { SystemStatusPanel } from '../components/SystemStatusPanel'
import { RosterExportDialog } from '../components/RosterExportDialog'
import { CurriculumImportDialog } from '../components/CurriculumImportDialog'
import { StudentImportDialog } from '../components/StudentImportDialog'
import { getAcademicHierarchy } from '../../academic/api/academic-api'
import { AccessEventsPanel } from '../components/AccessEventsPanel'

const blankAccount: UserDraft = { departmentId: null, majorId: null, email: '', password: '', fullName: '', phone: null, studentCode: null, employeeCode: null, title: null, roleIds: [] }
const messageFor = (reason: unknown) => reason instanceof HttpError ? reason.message : 'Chưa thể hoàn tất thao tác. Hãy thử lại.'
const integer = (value: FormDataEntryValue | null) => { const result = Number(value); return Number.isInteger(result) && result > 0 ? result : null }

function auditDateBoundary(day: string, end = false): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return undefined
  const date = new Date(`${day}T${end ? '23:59:59.999' : '00:00:00.000'}+07:00`)
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined
}

export function AdminWorkspacePage() {
  const { session } = useAuthSession()
  const [academicNames, setAcademicNames] = useState<{ departments: Record<number, string>; majors: Record<number, string> }>({ departments: {}, majors: {} })
  useEffect(() => {
    const abort = new AbortController()
    setAcademicNames({ departments: {}, majors: {} })
    if (session?.accessToken) void getAcademicHierarchy(session.accessToken, { search: '', includeInactive: true }, abort.signal).then(rows => {
      if (abort.signal.aborted) return
      const departments: Record<number, string> = {}, majors: Record<number, string> = {}
      for (const organization of rows) for (const entry of organization.departments) {
        departments[entry.department.id] = entry.department.name
        for (const major of entry.majors) majors[major.id] = major.name
      }
      setAcademicNames({ departments, majors })
    }).catch(() => undefined)
    return () => abort.abort()
  }, [session?.accessToken])
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1)
  const search = params.get('search') ?? ''
  const status = params.get('status') ?? ''
  const auditAction = params.get('auditAction') ?? ''
  const auditEntityType = params.get('auditEntityType') ?? ''
  const auditOutcome = params.get('auditOutcome') ?? ''
  const auditFrom = params.get('auditFrom') ?? ''
  const auditTo = params.get('auditTo') ?? ''
  const admin = useAdminWorkspace({ search, status: status || undefined, page }, {
    action: auditAction || undefined,
    entityType: auditEntityType || undefined,
    outcome: auditOutcome || undefined,
    fromUtc: auditDateBoundary(auditFrom),
    toUtc: auditDateBoundary(auditTo, true),
  })
  const [notice, setNotice] = useState<string | null>(null)
  const [importText, setImportText] = useState('')
  const [accountScope, setAccountScope] = useState({ departmentId: '', majorId: '' })
  const [busy, setBusy] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [curriculumImportOpen, setCurriculumImportOpen] = useState(false)
  const [studentImportOpen, setStudentImportOpen] = useState(false)
  const busyRef = useRef(false)
  const globalRoles = useMemo(() => (admin.rbac.value?.roles ?? []).filter((role) => role.isAssignableGlobalRole && role.assignmentKind === 'GLOBAL'), [admin.rbac.value?.roles])
  const setFilter = (patch: Record<string, string>) => { const next = new URLSearchParams(params); Object.entries(patch).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key)); if (!('page' in patch)) next.set('page', '1'); setParams(next) }
  const run = async (action: () => Promise<unknown>, success: string) => { if (busyRef.current) return false; busyRef.current = true; setBusy(true); try { await action(); setNotice(success); return true } catch (reason) { setNotice(messageFor(reason)); return false } finally { busyRef.current = false; setBusy(false) } }

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const element = event.currentTarget; const form = new FormData(element)
    const roleIds = Array.from(form.getAll('roleIds')).map(Number).filter(Boolean)
    void run(() => admin.createUser({ ...blankAccount, fullName: String(form.get('fullName') ?? '').trim(), email: String(form.get('email') ?? '').trim(), password: String(form.get('password') ?? ''), studentCode: String(form.get('studentCode') ?? '').trim() || null, employeeCode: String(form.get('employeeCode') ?? '').trim() || null, departmentId: integer(form.get('departmentId')), majorId: integer(form.get('majorId')), roleIds }), 'Máy chủ đã tạo tài khoản.').then(ok => { if (ok) { element.reset(); setAccountScope({ departmentId: '', majorId: '' }) } })
  }

  function submitImport() {
    try { const accounts = JSON.parse(importText) as UserDraft[]; if (!Array.isArray(accounts) || !accounts.length) throw new Error('invalid'); void run(() => admin.importUsers(accounts), 'Máy chủ đã nhập toàn bộ lô tài khoản.').then(ok => { if (ok) setImportText('') }) } catch { setNotice('Tệp JSON phải là mảng tài khoản theo cấu trúc yêu cầu. Lô không được gửi khi dữ liệu chưa hợp lệ.') }
  }

  const activeTab = params.get('tab') === 'audit' ? 'audit' : params.get('tab') === 'access' ? 'access' : 'accounts'

  return <div className="workspace-page admin-workspace space-y-5" aria-labelledby="admin-title">
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

    <section aria-label="Tổng quan vận hành" className="space-y-3">
      <StatTileRow tiles={[
        {
          icon: 'manage_accounts',
          label: 'Tài khoản theo bộ lọc',
          value: admin.users.state === 'ready' ? admin.users.value.totalCount : null,
          hero: true,
          caption: admin.users.state === 'error' ? 'Chưa tải được danh sách tài khoản.' : 'Tài khoản khớp tiêu chí đang lọc.',
        },
        {
          icon: 'admin_panel_settings',
          label: 'Vai trò hệ thống',
          value: admin.rbac.state === 'ready' ? globalRoles.length : null,
          tone: 'info',
          caption: admin.rbac.state === 'error' ? 'Chưa tải được danh mục vai trò.' : 'Vai trò toàn cục được phép gán.',
        },
        {
          icon: 'verified_user',
          label: 'Hoạt động bảo mật',
          value: admin.audit.state === 'ready' ? admin.audit.value.totalCount : null,
          tone: 'neutral',
          caption: admin.audit.state === 'error' ? 'Chưa tải được nhật ký bảo mật.' : 'Hoạt động đã ghi nhận trên hệ thống.',
        },
        {
          icon: 'key',
          label: 'Danh mục quyền hệ thống',
          value: admin.rbac.state === 'ready' ? (admin.rbac.value?.permissions ?? []).length : null,
          tone: 'success',
          caption: 'Phân công theo đồ án quản lý ở học vụ.',
        },
      ]} />
    </section>

    <SystemStatusPanel />

    <nav className="admin-tabs" aria-label="Khu vực quản trị">
      <button type="button" className={`admin-tab-btn ${activeTab === 'accounts' ? 'is-active' : ''}`} aria-controls="accounts" aria-pressed={activeTab === 'accounts'} onClick={() => setFilter({ tab: 'accounts' })}><span className="material-symbols-outlined text-[18px]" aria-hidden="true">group</span>Tài khoản người dùng</button>
      <Link to="/admin/access/rbac"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">admin_panel_settings</span>Phân quyền</Link>
      <button type="button" className={`admin-tab-btn ${activeTab === 'access' ? 'is-active' : ''}`} aria-controls="access-events" aria-pressed={activeTab === 'access'} onClick={() => setFilter({ tab: 'access' })}><span className="material-symbols-outlined text-[18px]" aria-hidden="true">login</span>Nhật ký truy cập</button>
      <button type="button" className={`admin-tab-btn ${activeTab === 'audit' ? 'is-active' : ''}`} aria-controls="audit" aria-pressed={activeTab === 'audit'} onClick={() => setFilter({ tab: 'audit' })}><span className="material-symbols-outlined text-[18px]" aria-hidden="true">security</span>Nhật ký bảo mật</button>
      <Link to="/academic/governance"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">calendar_month</span>Học kỳ &amp; Kỳ đồ án</Link>
      {env.industryEnabled && <Link to="/admin/industry"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">business_center</span>Chuyên gia doanh nghiệp</Link>}
    </nav>

    {notice ? <p className="admin-notice" role="status">{notice}</p> : null}

    <section id="accounts" className="admin-panel" aria-labelledby="accounts-title" hidden={activeTab !== 'accounts'}>
      <div className="admin-panel-header admin-roster-heading">
        <div>
          <h2 id="accounts-title">Tài khoản người dùng</h2>
          <p>Tìm kiếm, lọc trạng thái và quản lý vòng đời tài khoản. Vai trò hệ thống được quản lý riêng với phân công trong đồ án.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button icon="upload" onClick={() => setStudentImportOpen(true)}>Nhập sinh viên từ Excel</Button>
          <Button variant="outline" icon="download" onClick={() => setExportOpen(true)}>Xuất Excel danh sách nhóm</Button>
        </div>
      </div>
      <div className="admin-panel-body">
        {exportOpen && <RosterExportDialog onClose={() => setExportOpen(false)} />}
        {curriculumImportOpen && <CurriculumImportDialog onClose={() => setCurriculumImportOpen(false)} onImported={admin.refresh} />}
        {studentImportOpen && <StudentImportDialog onClose={() => setStudentImportOpen(false)} onImported={admin.refresh} />}
        <form key={JSON.stringify([search, status])} className="admin-filter-bar" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); setFilter({ search: String(data.get('search') ?? ''), status: String(data.get('status') ?? ''), page: '1' }) }}>
          <label className="flex-[2]">Tìm kiếm<input name="search" defaultValue={search} placeholder="Tên, email hoặc mã" /></label>
          <label>Trạng thái<select name="status" defaultValue={status}><option value="">Tất cả</option><option value="ACTIVE">Đang hoạt động</option><option value="INACTIVE">Ngừng hoạt động</option><option value="SUSPENDED">Đang khóa</option></select></label>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" variant="secondary">Áp dụng</Button>
            {(search || status) ? <Button type="button" variant="outline" onClick={() => setFilter({ search: '', status: '', page: '1' })}>Đặt lại bộ lọc</Button> : null}
          </div>
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
              <TableCell label="Người dùng"><div className="flex flex-col"><strong className="text-ink">{user.fullName}</strong><span className="text-ink-soft">{user.email}</span><small className="font-mono text-xs text-ink-muted">{user.studentCode ?? user.employeeCode ?? 'Không có mã'}</small></div></TableCell>
              <TableCell label="Vai trò hệ thống">{user.roles.filter((role) => globalRoles.some((globalRole) => globalRole.code === role)).map(role => role === 'LECTURER' ? 'Giảng viên' : role === 'EVALUATOR' ? 'Người chấm' : displayLabel(role)).join(', ') || 'Chưa gán'}</TableCell>
              <TableCell label="Trạng thái"><Status status={user.status} /></TableCell>
              <TableCell label="Đăng nhập gần nhất">{user.lastLoginAt ? <time className="tabular-nums text-ink-soft" dateTime={user.lastLoginAt}>{new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(utcTimestamp(user.lastLoginAt))}</time> : <span className="text-ink-muted">Chưa ghi nhận</span>}</TableCell>
              <TableCell label="Phạm vi học thuật">
                {user.departmentId ? academicNames.departments[user.departmentId] ?? 'Chưa tải được tên bộ môn' : 'Chưa liên kết bộ môn'}
                {user.majorId ? ` · ${academicNames.majors[user.majorId] ?? 'Chưa tải được tên ngành'}` : ''}
              </TableCell>
              <TableCell label="Thao tác"><Link className="font-semibold text-primary hover:text-primary-hover" to={`/admin/access/users/${user.id}`} state={{ returnTo: `/admin/access?${params.toString()}` }}>Xem chi tiết</Link></TableCell>
            </TableRow>)}
          </TableBody>
        </Table> : null}
        {admin.users.state === 'ready' && !admin.users.value.items.length ? <p className="py-4 text-sm text-ink-muted">Không có tài khoản phù hợp với bộ lọc hiện tại.</p> : null}
        {admin.users.state === 'ready' && <AdminServerPagination page={admin.users.value.page} pageSize={admin.users.value.pageSize} total={admin.users.value.totalCount} onPage={(next) => setFilter({ page: String(next) })} />}

        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          <details className="admin-disclosure !mt-0"><summary className="cursor-pointer font-bold text-ink hover:text-primary">Tạo tài khoản đơn lẻ</summary><form className="admin-form mt-3" onSubmit={submitCreate}><fieldset className="admin-create-fields" disabled={busy}><label>Họ tên<input name="fullName" required /></label><label>Email<input name="email" type="email" required /></label><label>Mật khẩu ban đầu<input name="password" type="password" minLength={10} placeholder="Ít nhất 10 ký tự" required autoComplete="new-password" /></label><label>Mã sinh viên<input name="studentCode" /></label><label>Mã nhân sự<input name="employeeCode" /></label><AcademicScopeFields {...accountScope} onChange={setAccountScope} /><fieldset><legend>Vai trò hệ thống</legend>{globalRoles.map((role) => <label key={role.id} className="admin-choice"><input name="roleIds" type="checkbox" value={role.id} />{role.code === 'LECTURER' ? 'Giảng viên' : displayLabel(role.code)}</label>)}</fieldset><p className="admin-boundary">Vai trò trưởng nhóm, giảng viên hướng dẫn và người chấm được quản lý theo từng đồ án.</p><Button type="submit" disabled={busy}>{busy ? 'Đang tạo…' : 'Tạo tài khoản'}</Button></fieldset></form></details>
          <details className="admin-disclosure !mt-0"><summary className="cursor-pointer font-bold text-ink hover:text-primary">Nhập nhiều tài khoản (JSON Batch)</summary><div className="mt-3"><p className="text-xs text-ink-muted">Nhập từ 1 đến 500 tài khoản bằng tệp JSON. Cả lô chỉ được lưu khi tất cả tài khoản hợp lệ.</p><div className="mt-2 flex flex-wrap items-center gap-2"><Button size="sm" variant="outline" type="button" onClick={() => setImportText(JSON.stringify([{ fullName: 'Nguyễn Văn Mẫu', email: 'mau@example.edu.vn', password: 'Password123!', roleIds: [1], departmentId: null, majorId: null }], null, 2))}>Điền dữ liệu mẫu</Button>{importText.trim() ? <Button size="sm" variant="ghost" type="button" onClick={() => setImportText('')}>Xóa nội dung</Button> : null}</div><label className="admin-import-label mt-2"><span className="text-xs font-semibold text-ink-soft">Nội dung JSON</span><textarea value={importText} onChange={(event) => setImportText(event.target.value)} placeholder={'[{"fullName":"…","email":"…","password":"…","roleIds":[1],"departmentId":null,"majorId":null}]'} className="font-mono text-xs" /></label><Button type="button" disabled={busy || !importText.trim()} onClick={submitImport}>{busy ? 'Đang gửi...' : 'Gửi lô tới máy chủ'}</Button></div></details>
          <details className="admin-disclosure !mt-0"><summary className="cursor-pointer font-bold text-ink hover:text-primary">Cập nhật Khung cho sinh viên đã có tài khoản</summary><div className="mt-3"><p className="text-xs text-ink-muted mb-3">Chỉ cập nhật cột Khung theo MSSV, không tạo tài khoản mới.</p><Button variant="outline" onClick={() => setCurriculumImportOpen(true)}>Nhập Khung từ file</Button></div></details>
        </div>
        <p className="admin-gap mt-4 text-xs">Mở hồ sơ từng tài khoản để cập nhật bộ môn và chuyên ngành. Phân công đồ án được quản lý riêng.</p>
      </div>
    </section>

    {activeTab === 'accounts' && admin.audit.state === 'ready' && admin.audit.value.items.length > 0 ? <section className="admin-panel admin-activity-preview" aria-labelledby="admin-activity-title">
      <div className="admin-panel-header">
        <div>
          <h2 id="admin-activity-title">Hoạt động bảo mật được ghi nhận</h2>
          <p>Các bản ghi gần nhất trong nhật ký bảo mật. Chuyển sang tab Nhật ký bảo mật để lọc đầy đủ.</p>
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={() => setFilter({ tab: 'audit' })}>Xem nhật ký</Button>
      </div>
      <div className="admin-panel-body">
        <ul className="admin-activity-list !mt-0">{admin.audit.value.items.slice(0, 3).map(record => <li key={record.id}>
          <span className={`admin-activity-indicator ${record.outcome === 'SUCCESS' ? 'is-success' : 'is-failure'}`} aria-hidden="true" />
          <span><strong>{auditActionLabel(record.action)}</strong><small>{record.entityType === 'USER' ? 'Tài khoản' : record.entityType}{record.entityId ? ` #${record.entityId}` : ''} · {record.outcome === 'SUCCESS' ? 'Thành công' : record.outcome === 'FAILURE' ? 'Thất bại' : displayLabel(record.outcome)}</small></span>
          <time className="tabular-nums" dateTime={record.occurredAt}>{new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }).format(utcTimestamp(record.occurredAt))}</time>
        </li>)}</ul>
      </div>
    </section> : null}

    {activeTab === 'access' && <AccessEventsPanel />}

    <section id="audit" className="admin-panel" aria-labelledby="audit-title" hidden={activeTab !== 'audit'}>
      <div className="admin-panel-header">
        <div>
          <h2 id="audit-title">Nhật ký bảo mật</h2>
          <p>Theo dõi thời gian, người thực hiện và nội dung hoạt động quản trị.</p>
        </div>
        {admin.audit.state === 'ready' && <span className="inline-flex items-center rounded-full border border-hairline bg-card px-3 py-1 text-xs font-bold tabular-nums text-ink-soft">{admin.audit.value.totalCount} bản ghi</span>}
      </div>
      <div className="admin-panel-body">
        <form key={[auditAction, auditEntityType, auditOutcome, auditFrom, auditTo].join('|')} className="admin-filter-bar" onSubmit={(event) => {
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
          <label>Hành động<input name="action" defaultValue={auditAction} placeholder="Ví dụ: ACCOUNT_, AUTH_" /></label>
          <label>Đối tượng<input name="entityType" defaultValue={auditEntityType} placeholder="Ví dụ: USER, PROJECT" /></label>
          <label>Kết quả
            <select name="outcome" defaultValue={auditOutcome}>
              <option value="">Tất cả</option>
              <option value="SUCCESS">Thành công</option>
              <option value="FAILURE">Thất bại</option>
            </select>
          </label>
          <label>Từ ngày (giờ Việt Nam)<input type="date" name="fromUtc" defaultValue={auditFrom} /></label>
          <label>Đến ngày (giờ Việt Nam)<input type="date" name="toUtc" defaultValue={auditTo} /></label>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" variant="secondary">Lọc</Button>
            {(auditAction || auditEntityType || auditOutcome || auditFrom || auditTo) ? (
              <Button type="button" variant="outline" onClick={() => setFilter({ auditAction: '', auditEntityType: '', auditOutcome: '', auditFrom: '', auditTo: '' })}>Đặt lại</Button>
            ) : null}
          </div>
        </form>
        {admin.audit.state === 'loading' ? <ListLoading label="Đang tải nhật ký…" /> : null}
        {admin.audit.state === 'error' ? <Failure message={admin.isForbidden(admin.audit) ? 'Bạn không có quyền xem nhật ký bảo mật.' : 'Chưa tải được nhật ký bảo mật.'} retry={admin.refresh} /> : null}
        {admin.audit.state === 'ready' && admin.audit.value.items.length > 0 ? (
          <Table className="mt-2">
            <TableHead>
              <TableRow head>
                <TableHeaderCell>Hành động</TableHeaderCell>
                <TableHeaderCell>Đối tượng</TableHeaderCell>
                <TableHeaderCell>Kết quả</TableHeaderCell>
                <TableHeaderCell>Thời gian</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {admin.audit.value.items.map((record) => (
                <TableRow key={record.id}>
                  <TableCell label="Hành động"><strong title={record.action}>{auditActionLabel(record.action)}</strong></TableCell>
                  <TableCell label="Đối tượng">{record.entityType === 'USER' ? 'Tài khoản' : record.entityType} #{record.entityId ?? '—'}</TableCell>
                  <TableCell label="Kết quả">
                    <StatusBadge
                      tone={record.outcome === 'SUCCESS' ? 'success' : 'danger'}
                      label={record.outcome === 'SUCCESS' ? 'Thành công' : record.outcome === 'FAILURE' ? 'Thất bại' : record.outcome}
                    />
                  </TableCell>
                  <TableCell label="Thời gian"><time className="tabular-nums text-ink-soft">{new Date(utcTimestamp(record.occurredAt)).toLocaleString('vi-VN')}</time></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
        {admin.audit.state === 'ready' && admin.audit.value.totalCount === 0 ? <p role="status" className="py-4 text-sm text-ink-muted">Không có hoạt động phù hợp với bộ lọc hiện tại.</p> : null}
        {admin.audit.state === 'ready' && admin.audit.value.totalCount > 0 && <AdminServerPagination page={admin.audit.value.page} pageSize={admin.audit.value.pageSize} total={admin.audit.value.totalCount} onPage={(next) => setFilter({ page: String(next) })} />}
      </div>
    </section>
  </div>
}

const statusTone: Record<UserAccount['status'], BadgeTone> = { ACTIVE: 'success', INACTIVE: 'neutral', SUSPENDED: 'danger' }
function Status({ status }: { status: UserAccount['status'] }) { const label = { ACTIVE: 'Đang hoạt động', INACTIVE: 'Ngừng hoạt động', SUSPENDED: 'Đang khóa' }[status]; return <StatusBadge tone={statusTone[status]} label={label} /> }
function Failure({ message, retry }: { message: string; retry: () => void }) { return <p className="admin-error" role="alert">{message} <Button size="sm" variant="outline" onClick={retry}>Thử lại</Button></p> }
function AdminServerPagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (pages <= 1 && page <= 1) return null
  return (
    <div className="mt-4 space-y-2 border-t border-hairline pt-3">
      <p className="text-xs font-semibold tabular-nums text-ink-muted">Trang {page}/{pages} · {total} kết quả</p>
      <Pagination page={page} pages={pages} total={total} pageSize={pageSize} onPage={onPage} />
    </div>
  )
}

function auditActionLabel(code: string) { return ({ AUTH_LOGIN: 'Đăng nhập', AUTH_LOGOUT: 'Đăng xuất', AUTH_REFRESH_TOKEN_ROTATED: 'Gia hạn phiên đăng nhập', ACCOUNT_CREATED: 'Tạo tài khoản', ACCOUNT_UPDATED: 'Cập nhật tài khoản' } as Record<string,string>)[code] ?? code }

