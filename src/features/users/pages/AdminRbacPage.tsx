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
    const confirmed = await requestConfirmation({ title: 'Lưu quyền truy cập?', description: `Máy chủ sẽ thay thế phân quyền hiện tại của vai trò ${selectedRole.code}. Quyền trên tài nguyên cụ thể vẫn phải qua scope và trạng thái nghiệp vụ.`, confirmLabel: 'Lưu quyền truy cập', danger: true })
    if (confirmed === null) return
    const ids = Array.from(new FormData(form).getAll('permissionIds')).map(Number).filter(Boolean)
    try { await admin.replacePermissions(selectedRole.id, ids); setNotice('Đã cập nhật quyền truy cập cho vai trò.') } catch (reason) { setNotice(reason instanceof Error ? reason.message : 'Chưa thể lưu phân quyền quyền.') }
  }
  return <main className="admin-workspace" aria-labelledby="rbac-title"><header className="admin-heading"><div><p className="admin-kicker">PHÂN QUYỀN NỀN TẢNG</p><h1 id="rbac-title">Vai trò và quyền truy cập</h1><p>Quản lý quyền truy cập của từng vai trò. Phân công trong đồ án được quản lý ở không gian học vụ.</p></div><Link className="admin-link-button" to="/admin/access">Về tổng quan</Link></header>
    {notice ? <p className="admin-notice" role="status">{notice}</p> : null}
    {admin.rbac.state === 'loading' ? <p role="status">Đang tải danh mục phân quyền…</p> : null}
    {admin.rbac.state === 'error' ? <p className="admin-error" role="alert">{fail ? 'Bạn không có quyền quản trị RBAC.' : 'Chưa tải được danh mục phân quyền.'} <Button size="sm" variant="outline" onClick={admin.refresh}>Thử lại</Button></p> : null}
    {admin.rbac.state !== 'error' ? <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Danh sách vai trò</h2><p>Chọn vai trò để xem và điều chỉnh các quyền được cấp.</p></div></div><div className="admin-rbac-layout"><div className="admin-role-list" role="list">{admin.rbac.value.roles.map((role) => <button key={role.id} type="button" className={role.id === selectedRoleId ? 'is-selected' : ''} onClick={() => setSelectedRoleId(role.id)}><strong>{role.code}</strong><span>{role.name}</span>{role.isSystemRole ? <small>vai trò hệ thống</small> : null}</button>)}</div><div className="admin-rbac-detail">{selectedRole ? <form onSubmit={(event) => { event.preventDefault(); void saveMapping(event.currentTarget) }}><h3>{selectedRole.code}</h3><p>{selectedRole.description || 'Không có mô tả.'}</p><label>Tìm quyền truy cập<input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Nhập mã hoặc tên quyền" /></label><fieldset><legend>Quyền truy cập ({permissions.length})</legend><div className="admin-permission-list">{permissions.map((permission) => <label key={permission.id} className="admin-choice"><input name="permissionIds" type="checkbox" value={permission.id} defaultChecked={selectedRole.permissions.some((item) => item.id === permission.id)} /> <span><strong>{permission.code}</strong><small>{permission.name}</small></span></label>)}</div></fieldset><Button type="submit">Lưu phân quyền</Button></form> : <p>Chọn một vai trò ở bên trái để xem quyền truy cập.</p>}</div></div><p className="admin-gap">Các vai trò theo đồ án như trưởng nhóm, giảng viên hướng dẫn và người chấm được cấp qua phân công, không gán tại đây.</p></section> : null}
    {confirmationDialog}
  </main>
}
