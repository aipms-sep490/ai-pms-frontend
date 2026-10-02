import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'
import { HttpError } from '../../../services/http/http-client'
import { useAuthSession } from '../../auth/context/useAuthSession'
import { getUser, type UserAccount } from '../api/admin-api'
import { useAdminWorkspace } from '../hooks/useAdminWorkspace'
import './admin-workspace.css'

const globalRoleCodes = new Set(['ADMIN', 'DEPARTMENT_STAFF', 'LECTURER', 'STUDENT'])

export function AdminUserDetailPage() {
  const { userId } = useParams()
  const id = Number(userId)
  const { session } = useAuthSession()
  const admin = useAdminWorkspace()
  const [user, setUser] = useState<UserAccount | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'forbidden' | 'error'>('loading')
  const [notice, setNotice] = useState<string | null>(null)
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()
  const load = useCallback(async () => {
    if (!session || !Number.isInteger(id) || id < 1) { setState('missing'); return }
    setState('loading')
    try { setUser(await getUser(id, session.accessToken)); setState('ready') } catch (reason) { setState(reason instanceof HttpError && reason.status === 403 ? 'forbidden' : reason instanceof HttpError && reason.status === 404 ? 'missing' : 'error') }
  }, [id, session])
  useEffect(() => { void load() }, [load])
  async function change(action: 'activate' | 'deactivate' | 'block' | 'unblock') {
    if (!user) return
    const labels = { activate: 'kích hoạt', deactivate: 'vô hiệu hóa', block: 'khóa', unblock: 'mở khóa' }
    const confirmed = await requestConfirmation({ title: `${labels[action]} tài khoản?`, description: `Máy chủ sẽ kiểm tra lại tài khoản ${user.fullName}, bao gồm ràng buộc System Administrator cuối cùng.`, confirmLabel: `${labels[action]} tài khoản`, danger: action === 'deactivate' || action === 'block' })
    if (confirmed === null) return
    try { await admin[action](user.id); setNotice('Máy chủ đã cập nhật trạng thái tài khoản.'); await load() } catch (reason) { setNotice(reason instanceof Error ? reason.message : 'Chưa thể cập nhật trạng thái.') }
  }
  const globalRoles = user?.roles.filter((role) => globalRoleCodes.has(role)) ?? []
  return <main className="admin-workspace admin-detail" aria-labelledby="admin-user-title"><Link className="admin-back" to="/admin/access">← Danh sách tài khoản</Link>{state === 'loading' ? <p role="status">Đang tải hồ sơ tài khoản…</p> : null}{state === 'forbidden' ? <p className="admin-error" role="alert">Bạn không có quyền xem hồ sơ tài khoản này.</p> : null}{state === 'missing' ? <p className="admin-error" role="alert">Không tìm thấy tài khoản.</p> : null}{state === 'error' ? <p className="admin-error" role="alert">Chưa tải được hồ sơ tài khoản. <Button size="sm" variant="outline" onClick={() => void load()}>Thử lại</Button></p> : null}{state === 'ready' && user ? <><header className="admin-heading"><div><p className="admin-kicker">TÀI KHOẢN #{user.id}</p><h1 id="admin-user-title">{user.fullName}</h1><p>{user.email}</p></div><span className={`admin-status admin-status-${user.status.toLowerCase()}`}>{user.status}</span></header>{notice ? <p className="admin-notice" role="status">{notice}</p> : null}<div className="admin-detail-grid"><section className="admin-panel"><h2>Danh tính</h2><dl><dt>Email</dt><dd>{user.email}</dd><dt>Mã</dt><dd>{user.studentCode ?? user.employeeCode ?? 'Không có'}</dd><dt>Chức danh</dt><dd>{user.title ?? 'Không có'}</dd><dt>Điện thoại</dt><dd>{user.phone ?? 'Không có'}</dd></dl></section><section className="admin-panel"><h2>Vai trò toàn cục</h2><p>{globalRoles.join(', ') || 'Chưa có role toàn cục'}</p><p className="admin-boundary">Project, supervisor và evaluator assignment không phải global role nên không hiển thị hay chỉnh sửa tại đây.</p></section><section className="admin-panel"><h2>Trạng thái và bảo mật</h2><dl><dt>Lần đăng nhập thất bại</dt><dd>{user.accessFailedCount}</dd><dt>Khóa đến</dt><dd>{user.lockoutEndAt ? new Date(user.lockoutEndAt).toLocaleString('vi-VN') : 'Không có'}</dd></dl><div className="admin-actions">{user.status !== 'ACTIVE' ? <Button onClick={() => void change('activate')}>Kích hoạt</Button> : null}{user.status !== 'INACTIVE' ? <Button variant="secondary" onClick={() => void change('deactivate')}>Vô hiệu hóa</Button> : null}{user.status !== 'SUSPENDED' ? <Button variant="danger" onClick={() => void change('block')}>Khóa</Button> : <Button variant="secondary" onClick={() => void change('unblock')}>Mở khóa</Button>}</div></section><section className="admin-panel"><h2>Phạm vi học thuật</h2><dl><dt>Bộ môn</dt><dd>{user.departmentId ? `#${user.departmentId}` : 'Chưa liên kết'}</dd><dt>Ngành</dt><dd>{user.majorId ? `#${user.majorId}` : 'Chưa liên kết'}</dd></dl><p className="admin-gap">Backend chưa có endpoint quản trị để cập nhật academic profile scope; các liên kết chỉ đọc để không tạo tổ hợp role/scope ở client.</p></section></div></> : null}{confirmationDialog}</main>
}
