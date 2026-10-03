import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'
import { HttpError } from '../../../services/http/http-client'
import { useAdminWorkspace } from '../hooks/useAdminWorkspace'
import './admin-workspace.css'

export function AdminRbacPage() {
  const admin = useAdminWorkspace()
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null)
  const [filter, setFilter] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()
  const selectedRole = admin.rbac.value.roles.find((role) => role.id === selectedRoleId) ?? null
  const permissions = useMemo(() => admin.rbac.value.permissions.filter((item) => `${item.code} ${item.name}`.toLowerCase().includes(filter.toLowerCase())), [admin.rbac.value.permissions, filter])
  const fail = admin.rbac.error instanceof HttpError && admin.rbac.error.status === 403
  async function saveMapping(form: HTMLFormElement) {
    if (!selectedRole) return
    const confirmed = await requestConfirmation({ title: 'Lưu mapping quyền?', description: `Máy chủ sẽ thay thế mapping hiện tại của role ${selectedRole.code}. Quyền trên tài nguyên cụ thể vẫn phải qua scope và trạng thái nghiệp vụ.`, confirmLabel: 'Lưu mapping quyền', danger: true })
    if (confirmed === null) return
    const ids = Array.from(new FormData(form).getAll('permissionIds')).map(Number).filter(Boolean)
    try { await admin.replacePermissions(selectedRole.id, ids); setNotice('Máy chủ đã lưu mapping role–permission.') } catch (reason) { setNotice(reason instanceof Error ? reason.message : 'Chưa thể lưu mapping quyền.') }
  }
  return <main className="admin-workspace" aria-labelledby="rbac-title"><header className="admin-heading"><div><p className="admin-kicker">PHÂN QUYỀN NỀN TẢNG</p><h1 id="rbac-title">Role và permission</h1><p>Catalog RBAC quản lý identity role và permission metadata; không tạo quyền trên project, assignment hoặc phạm vi học vụ.</p></div><Link className="admin-link-button" to="/admin/access">Về tổng quan</Link></header>
    {notice ? <p className="admin-notice" role="status">{notice}</p> : null}
    {admin.rbac.state === 'loading' ? <p role="status">Đang tải catalog phân quyền…</p> : null}
    {admin.rbac.state === 'error' ? <p className="admin-error" role="alert">{fail ? 'Bạn không có quyền quản trị RBAC.' : 'Chưa tải được catalog phân quyền.'} <Button size="sm" variant="outline" onClick={admin.refresh}>Thử lại</Button></p> : null}
    {admin.rbac.state !== 'error' ? <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Role catalogue</h2><p>Role hệ thống và mapping hiện tại do Backend cung cấp.</p></div></div><div className="admin-rbac-layout"><div className="admin-role-list" role="list">{admin.rbac.value.roles.map((role) => <button key={role.id} type="button" className={role.id === selectedRoleId ? 'is-selected' : ''} onClick={() => setSelectedRoleId(role.id)}><strong>{role.code}</strong><span>{role.name}</span>{role.isSystemRole ? <small>Role hệ thống</small> : null}</button>)}</div><div className="admin-rbac-detail">{selectedRole ? <form onSubmit={(event) => { event.preventDefault(); void saveMapping(event.currentTarget) }}><h3>{selectedRole.code}</h3><p>{selectedRole.description || 'Không có mô tả.'}</p><label>Lọc permission<input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Mã hoặc tên permission" /></label><fieldset><legend>Permission hiện có ({permissions.length})</legend><div className="admin-permission-list">{permissions.map((permission) => <label key={permission.id} className="admin-choice"><input name="permissionIds" type="checkbox" value={permission.id} defaultChecked={selectedRole.permissions.some((item) => item.id === permission.id)} /> <span><strong>{permission.code}</strong><small>{permission.name}</small></span></label>)}</div></fieldset><Button type="submit">Lưu mapping</Button></form> : <p>Chọn một role để xem và quản lý mapping permission.</p>}</div></div><p className="admin-gap">Tạo role/permission mới được giữ fail-closed: contract hiện có cho phép catalog tùy ý nhưng không phân loại role nghiệp vụ và role theo resource. Không dùng UI để tạo TEAM_LEADER, EVALUATOR hoặc các role theo phân công.</p></section> : null}
    {confirmationDialog}
  </main>
}
