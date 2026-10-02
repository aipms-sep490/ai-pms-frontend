import { useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { HttpError } from '../../../services/http/http-client'
import type { UserAccount, UserDraft } from '../api/admin-api'
import { useAdminWorkspace } from '../hooks/useAdminWorkspace'
import './admin-workspace.css'

const globalRoleCodes = new Set(['ADMIN', 'DEPARTMENT_STAFF', 'LECTURER', 'STUDENT'])
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
  const globalRoles = useMemo(() => admin.rbac.value.roles.filter((role) => globalRoleCodes.has(role.code)), [admin.rbac.value.roles])
  const setFilter = (patch: Record<string, string>) => { const next = new URLSearchParams(params); Object.entries(patch).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key)); if (!('page' in patch)) next.set('page', '1'); setParams(next) }
  const run = async (action: () => Promise<unknown>, success: string) => { try { await action(); setNotice(success) } catch (reason) { setNotice(messageFor(reason)) } }

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget)
    const roleIds = Array.from(form.getAll('roleIds')).map(Number).filter(Boolean)
    void run(() => admin.createUser({ ...blankAccount, fullName: String(form.get('fullName') ?? '').trim(), email: String(form.get('email') ?? '').trim(), password: String(form.get('password') ?? ''), studentCode: String(form.get('studentCode') ?? '').trim() || null, employeeCode: String(form.get('employeeCode') ?? '').trim() || null, departmentId: integer(form.get('departmentId')), majorId: integer(form.get('majorId')), roleIds }), 'Máy chủ đã tạo tài khoản.').then(() => event.currentTarget.reset())
  }

  function submitImport() {
    try { const accounts = JSON.parse(importText) as UserDraft[]; if (!Array.isArray(accounts) || !accounts.length) throw new Error('invalid'); void run(() => admin.importUsers(accounts), 'Máy chủ đã nhập toàn bộ lô tài khoản.').then(() => setImportText('')) } catch { setNotice('Tệp JSON phải là mảng tài khoản theo đúng contract. Lô không được gửi khi dữ liệu chưa hợp lệ.') }
  }

  return <main className="admin-workspace" aria-labelledby="admin-title">
    <header className="admin-heading"><div><p className="admin-kicker">QUẢN TRỊ NỀN TẢNG</p><h1 id="admin-title">Hệ thống và quyền truy cập</h1><p>Quản lý tài khoản, RBAC, cấu trúc tổ chức và nhật ký bảo mật. Quyền học vụ, chấm điểm và phê duyệt đồ án thuộc phạm vi nghiệp vụ riêng.</p></div><Link className="admin-link-button" to="/academic">Cấu trúc tổ chức</Link></header>
    <nav className="admin-tabs" aria-label="Khu vực quản trị"><a href="#accounts">Tài khoản</a><Link to="/admin/access/rbac">Phân quyền</Link><a href="#audit">Nhật ký bảo mật</a></nav>
    {notice ? <p className="admin-notice" role="status">{notice}</p> : null}

    <section className="admin-overview" aria-label="Tổng quan vận hành">
      <Fact label="Tài khoản theo bộ lọc" value={admin.users.state === 'error' ? 'Chưa tải được' : String(admin.users.value.totalCount)} />
      <Fact label="Role nền tảng" value={admin.rbac.state === 'error' ? 'Chưa tải được' : String(globalRoles.length)} />
      <Fact label="Bản ghi audit" value={admin.audit.state === 'error' ? 'Chưa tải được' : String(admin.audit.value.totalCount)} />
      <p className="admin-boundary">Số liệu là metadata phân trang từ Backend; không dùng để mở quyền hoặc suy luận tình trạng học vụ.</p>
    </section>

    <section id="accounts" className="admin-panel" aria-labelledby="accounts-title"><div className="admin-panel-heading"><div><h2 id="accounts-title">Tài khoản người dùng</h2><p>Tìm kiếm, lọc trạng thái và quản lý vòng đời tài khoản. Global role không bao gồm vai trò theo dự án.</p></div></div>
      <form className="admin-filter" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); setFilter({ search: String(data.get('search') ?? ''), status: String(data.get('status') ?? '') }) }}>
        <label>Tìm kiếm<input name="search" defaultValue={search} placeholder="Tên, email hoặc mã" /></label><label>Trạng thái<select name="status" defaultValue={status}><option value="">Tất cả</option><option value="ACTIVE">Đang hoạt động</option><option value="INACTIVE">Ngừng hoạt động</option><option value="SUSPENDED">Đang khóa</option></select></label><Button type="submit" variant="secondary">Áp dụng</Button>
      </form>
      {admin.users.state === 'loading' ? <p role="status">Đang tải danh sách tài khoản…</p> : null}
      {admin.users.state === 'error' ? <Failure message={admin.isForbidden(admin.users) ? 'Bạn không có quyền quản trị tài khoản.' : 'Chưa tải được danh sách tài khoản.'} retry={admin.refresh} /> : null}
      {admin.users.state !== 'error' ? <div className="admin-table-wrap"><table><thead><tr><th>Người dùng</th><th>Vai trò toàn cục</th><th>Trạng thái</th><th>Phạm vi học thuật</th><th aria-label="Thao tác" /></tr></thead><tbody>{admin.users.value.items.map((user) => <tr key={user.id}><td><strong>{user.fullName}</strong><span>{user.email}</span><small>{user.studentCode ?? user.employeeCode ?? 'Không có mã'}</small></td><td>{user.roles.filter((role) => globalRoleCodes.has(role)).join(', ') || 'Chưa gán'}</td><td><Status status={user.status} /></td><td>{user.departmentId ? `Bộ môn #${user.departmentId}` : '—'}{user.majorId ? ` · Ngành #${user.majorId}` : ''}</td><td><Link to={`/admin/access/users/${user.id}`}>Xem chi tiết</Link></td></tr>)}</tbody></table></div> : null}
      {admin.users.state === 'ready' && !admin.users.value.items.length ? <p>Không có tài khoản phù hợp với bộ lọc hiện tại.</p> : null}
      <Pagination page={admin.users.value.page} pageSize={admin.users.value.pageSize} total={admin.users.value.totalCount} onPage={(next) => setFilter({ page: String(next) })} />
      <details className="admin-disclosure"><summary>Tạo tài khoản</summary><form className="admin-form" onSubmit={submitCreate}><label>Họ tên<input name="fullName" required /></label><label>Email<input name="email" type="email" required /></label><label>Mật khẩu ban đầu<input name="password" type="password" minLength={8} required autoComplete="new-password" /></label><label>Mã sinh viên<input name="studentCode" /></label><label>Mã nhân sự<input name="employeeCode" /></label><label>Bộ môn ID<input name="departmentId" inputMode="numeric" /></label><label>Ngành ID<input name="majorId" inputMode="numeric" /></label><fieldset><legend>Vai trò toàn cục</legend>{globalRoles.map((role) => <label key={role.id} className="admin-choice"><input name="roleIds" type="checkbox" value={role.id} />{role.code}</label>)}</fieldset><p className="admin-boundary">Không thể gán TEAM_LEADER, PRIMARY_SUPERVISOR hoặc EVALUATOR ở đây; đó là phân công theo tài nguyên.</p><Button type="submit">Tạo tài khoản</Button></form></details>
      <details className="admin-disclosure"><summary>Nhập lô JSON</summary><p>Backend nhận một lô nguyên tử 1–500 tài khoản JSON; không có contract CSV/Excel, preview hay kết quả một phần.</p><label className="admin-import-label">Nội dung JSON<textarea value={importText} onChange={(event) => setImportText(event.target.value)} placeholder={'[{"fullName":"…","email":"…","password":"…","roleIds":[1],"departmentId":null,"majorId":null}]'} /></label><Button type="button" disabled={!importText.trim()} onClick={submitImport}>Gửi lô tới máy chủ</Button></details>
      <p className="admin-gap">Cập nhật hồ sơ tài khoản và gán/xác minh academic profile riêng chưa có contract quản trị; trang giữ dữ liệu hiện tại ở chế độ chỉ đọc.</p>
    </section>

    <section id="audit" className="admin-panel" aria-labelledby="audit-title"><div className="admin-panel-heading"><div><h2 id="audit-title">Nhật ký bảo mật</h2><p>Chỉ hiển thị metadata audit Backend trả về, không hiển thị payload hay thông tin bí mật.</p></div></div><form className="admin-filter" onSubmit={(event) => { event.preventDefault(); setFilter({ auditAction: String(new FormData(event.currentTarget).get('action') ?? '') }) }}><label>Hành động<input name="action" defaultValue={auditAction} placeholder="Ví dụ: ACCOUNT_" /></label><Button type="submit" variant="secondary">Lọc</Button></form>{admin.audit.state === 'loading' ? <p role="status">Đang tải nhật ký…</p> : null}{admin.audit.state === 'error' ? <Failure message={admin.isForbidden(admin.audit) ? 'Bạn không có quyền xem nhật ký bảo mật.' : 'Chưa tải được nhật ký bảo mật.'} retry={admin.refresh} /> : null}{admin.audit.state === 'ready' ? <ul className="admin-audit-list">{admin.audit.value.items.map((record) => <li key={record.id}><strong>{record.action}</strong><span>{record.entityType} #{record.entityId ?? '—'} · {record.outcome}</span><time>{new Date(record.occurredAt).toLocaleString('vi-VN')}</time></li>)}</ul> : null}</section>
  </main>
}

function Fact({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div> }
function Status({ status }: { status: UserAccount['status'] }) { const label = { ACTIVE: 'Đang hoạt động', INACTIVE: 'Ngừng hoạt động', SUSPENDED: 'Đang khóa' }[status]; return <span className={`admin-status admin-status-${status.toLowerCase()}`}>{label}</span> }
function Failure({ message, retry }: { message: string; retry: () => void }) { return <p className="admin-error" role="alert">{message} <Button size="sm" variant="outline" onClick={retry}>Thử lại</Button></p> }
function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (page: number) => void }) { const pages = Math.max(1, Math.ceil(total / pageSize)); return <div className="admin-pagination"><span>Trang {page}/{pages} · {total} kết quả</span><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>Trang trước</Button><Button size="sm" variant="outline" disabled={page >= pages} onClick={() => onPage(page + 1)}>Trang sau</Button></div> }
