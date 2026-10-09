import { displayLabel } from '../../../components/ui/display-label'
import { ListLoading } from '../../../components/ui/ListLoading'
import { AcademicScopeFields } from '../../academic/components/AcademicScopeFields'
import { useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { HttpError } from '../../../services/http/http-client'
import type { UserAccount, UserDraft } from '../api/admin-api'
import { useAdminWorkspace } from '../hooks/useAdminWorkspace'
import './admin-workspace.css'
import { SystemStatusPanel } from '../components/SystemStatusPanel'

const blankAccount: UserDraft = { departmentId: null, majorId: null, email: '', password: '', fullName: '', phone: null, studentCode: null, employeeCode: null, title: null, roleIds: [] }
const messageFor = (reason: unknown) => reason instanceof HttpError ? reason.message : 'Chưa thể hoàn tất thao tác. Hãy thử lại.'
const integer = (value: FormDataEntryValue | null) => { const result = Number(value); return Number.isInteger(result) && result > 0 ? result : null }

export function AdminWorkspacePage() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1)
  const search = params.get('search') ?? ''
  const status = params.get('status') ?? ''
  const auditAction = params.get('auditAction') ?? ''
  const admin = useAdminWorkspace({ search, status: status || undefined, page }, { action: auditAction || undefined })
  const [notice, setNotice] = useState<string | null>(null)
  const [importText, setImportText] = useState('')
  const [accountScope, setAccountScope] = useState({ departmentId: '', majorId: '' })
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const globalRoles = useMemo(() => admin.rbac.value.roles.filter((role) => role.isAssignableGlobalRole && role.assignmentKind === 'GLOBAL'), [admin.rbac.value.roles])
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

  return <main className="workspace-page admin-workspace" aria-labelledby="admin-title">
    <header className="admin-heading"><div><p className="admin-kicker">QUẢN TRỊ NỀN TẢNG</p><h1 id="admin-title">Hệ thống và quyền truy cập</h1><p>Quản lý tài khoản, phân quyền và theo dõi hoạt động trên hệ thống.</p></div><Link className="admin-link-button" to="/academic">Cấu trúc tổ chức</Link></header>
    <nav className="admin-tabs" aria-label="Khu vực quản trị"><a href="#accounts">Tài khoản</a><Link to="/admin/access/rbac">Phân quyền</Link><a href="#audit">Nhật ký bảo mật</a></nav>
    {notice ? <p className="admin-notice" role="status">{notice}</p> : null}
    <SystemStatusPanel />

    <section className="admin-overview" aria-label="Tổng quan vận hành">
      <Fact label="Tài khoản theo bộ lọc" value={admin.users.state === 'ready' ? String(admin.users.value.totalCount) : admin.users.state === 'error' ? 'Chưa tải được' : '—'} />
      <Fact label="Vai trò hệ thống" value={admin.rbac.state === 'ready' ? String(globalRoles.length) : admin.rbac.state === 'error' ? 'Chưa tải được' : '—'} />
      <Fact label="Hoạt động đã ghi nhận" value={admin.audit.state === 'ready' ? String(admin.audit.value.totalCount) : admin.audit.state === 'error' ? 'Chưa tải được' : '—'} />
      <p className="admin-boundary">Theo dõi tài khoản, vai trò và hoạt động quản trị trên hệ thống.</p>
    </section>

    <section id="accounts" className="admin-panel" aria-labelledby="accounts-title"><div className="admin-panel-heading"><div><h2 id="accounts-title">Tài khoản người dùng</h2><p>Tìm kiếm, lọc trạng thái và quản lý vòng đời tài khoản. Vai trò hệ thống được quản lý riêng với phân công trong đồ án.</p></div></div>
      <form key={JSON.stringify([search,status])} className="admin-filter" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); setFilter({ search: String(data.get('search') ?? ''), status: String(data.get('status') ?? '') }) }}>
        <label>Tìm kiếm<input name="search" defaultValue={search} placeholder="Tên, email hoặc mã" /></label><label>Trạng thái<select name="status" defaultValue={status}><option value="">Tất cả</option><option value="ACTIVE">Đang hoạt động</option><option value="INACTIVE">Ngừng hoạt động</option><option value="SUSPENDED">Đang khóa</option></select></label><Button type="submit" variant="secondary">Áp dụng</Button>
      </form>
      {admin.users.state === 'loading' ? <ListLoading label="Đang tải danh sách tài khoản…" /> : null}
      {admin.users.state === 'error' ? <Failure message={admin.isForbidden(admin.users) ? 'Bạn không có quyền quản trị tài khoản.' : 'Chưa tải được danh sách tài khoản.'} retry={admin.refresh} /> : null}
      {admin.users.state === 'ready' ? <div className="admin-table-wrap"><table><thead><tr><th>Người dùng</th><th>Vai trò hệ thống</th><th>Trạng thái</th><th>Phạm vi học thuật</th><th aria-label="Thao tác" /></tr></thead><tbody>{admin.users.value.items.map((user) => <tr key={user.id}><td><strong>{user.fullName}</strong><span>{user.email}</span><small>{user.studentCode ?? user.employeeCode ?? 'Không có mã'}</small></td><td>{user.roles.filter((role) => globalRoles.some((globalRole) => globalRole.code === role)).map(role => role === 'LECTURER' ? 'Giảng viên' : role === 'EVALUATOR' ? 'Người chấm' : displayLabel(role)).join(', ') || 'Chưa gán'}</td><td><Status status={user.status} /></td><td>{user.departmentId ? `Bộ môn #${user.departmentId}` : '—'}{user.majorId ? ` · Ngành #${user.majorId}` : ''}</td><td><Link to={`/admin/access/users/${user.id}`} state={{ returnTo: `/admin/access?${params.toString()}` }}>Xem chi tiết</Link></td></tr>)}</tbody></table></div> : null}
      {admin.users.state === 'ready' && !admin.users.value.items.length ? <p>Không có tài khoản phù hợp với bộ lọc hiện tại.</p> : null}
      {admin.users.state === 'ready' && <Pagination page={admin.users.value.page} pageSize={admin.users.value.pageSize} total={admin.users.value.totalCount} onPage={(next) => setFilter({ page: String(next) })} />}
      <details className="admin-disclosure"><summary>Tạo tài khoản</summary><form className="admin-form" onSubmit={submitCreate}><fieldset className="admin-create-fields" disabled={busy}><label>Họ tên<input name="fullName" required /></label><label>Email<input name="email" type="email" required /></label><label>Mật khẩu ban đầu<input name="password" type="password" minLength={8} required autoComplete="new-password" /></label><label>Mã sinh viên<input name="studentCode" /></label><label>Mã nhân sự<input name="employeeCode" /></label><AcademicScopeFields {...accountScope} onChange={setAccountScope} /><fieldset><legend>Vai trò hệ thống</legend>{globalRoles.map((role) => <label key={role.id} className="admin-choice"><input name="roleIds" type="checkbox" value={role.id} />{role.code === 'LECTURER' ? 'Giảng viên' : displayLabel(role.code)}</label>)}</fieldset><p className="admin-boundary">Vai trò trưởng nhóm, giảng viên hướng dẫn và người chấm được quản lý theo từng đồ án.</p><Button type="submit" disabled={busy}>{busy ? 'Đang tạo…' : 'Tạo tài khoản'}</Button></fieldset></form></details>
      <details className="admin-disclosure"><summary>Nhập nhiều tài khoản</summary><p>Nhập từ 1 đến 500 tài khoản bằng tệp JSON. Cả lô chỉ được lưu khi tất cả tài khoản hợp lệ.</p><label className="admin-import-label">Nội dung JSON<textarea value={importText} onChange={(event) => setImportText(event.target.value)} placeholder={'[{"fullName":"…","email":"…","password":"…","roleIds":[1],"departmentId":null,"majorId":null}]'} /></label><Button type="button" disabled={busy || !importText.trim()} onClick={submitImport}>Gửi lô tới máy chủ</Button></details>
      <p className="admin-gap">Mở hồ sơ từng tài khoản để cập nhật bộ môn và chuyên ngành. Phân công đồ án được quản lý riêng.</p>
    </section>

    <section id="audit" className="admin-panel" aria-labelledby="audit-title"><div className="admin-panel-heading"><div><h2 id="audit-title">Nhật ký bảo mật</h2><p>Theo dõi thời gian, người thực hiện và nội dung hoạt động quản trị.</p></div></div><form className="admin-filter" onSubmit={(event) => { event.preventDefault(); setFilter({ auditAction: String(new FormData(event.currentTarget).get('action') ?? '') }) }}><label>Hành động<input name="action" defaultValue={auditAction} placeholder="Ví dụ: ACCOUNT_" /></label><Button type="submit" variant="secondary">Lọc</Button></form>{admin.audit.state === 'loading' ? <ListLoading label="Đang tải nhật ký…" /> : null}{admin.audit.state === 'error' ? <Failure message={admin.isForbidden(admin.audit) ? 'Bạn không có quyền xem nhật ký bảo mật.' : 'Chưa tải được nhật ký bảo mật.'} retry={admin.refresh} /> : null}{admin.audit.state === 'ready' ? <ul className="admin-audit-list">{admin.audit.value.items.map((record) => <li key={record.id}><strong title={record.action}>{auditActionLabel(record.action)}</strong><span>{record.entityType === 'USER' ? 'Tài khoản' : record.entityType} #{record.entityId ?? '—'} · {record.outcome === 'SUCCESS' ? 'Thành công' : record.outcome === 'FAILURE' ? 'Thất bại' : record.outcome}</span><time>{new Date(record.occurredAt).toLocaleString('vi-VN')}</time></li>)}</ul> : null}</section>
  </main>
}

function Fact({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div> }
function Status({ status }: { status: UserAccount['status'] }) { const label = { ACTIVE: 'Đang hoạt động', INACTIVE: 'Ngừng hoạt động', SUSPENDED: 'Đang khóa' }[status]; return <span className={`admin-status admin-status-${status.toLowerCase()}`}>{label}</span> }
function Failure({ message, retry }: { message: string; retry: () => void }) { return <p className="admin-error" role="alert">{message} <Button size="sm" variant="outline" onClick={retry}>Thử lại</Button></p> }
function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (page: number) => void }) { const pages = Math.max(1, Math.ceil(total / pageSize)); return <div className="admin-pagination"><span>Trang {page}/{pages} · {total} kết quả</span><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>Trang trước</Button><Button size="sm" variant="outline" disabled={page >= pages} onClick={() => onPage(page + 1)}>Trang sau</Button></div> }

function auditActionLabel(code: string) { return ({ AUTH_LOGIN: 'Đăng nhập', AUTH_LOGOUT: 'Đăng xuất', AUTH_REFRESH_TOKEN_ROTATED: 'Gia hạn phiên đăng nhập', ACCOUNT_CREATED: 'Tạo tài khoản', ACCOUNT_UPDATED: 'Cập nhật tài khoản' } as Record<string,string>)[code] ?? code }
