import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { displayLabel } from '../../../components/ui/display-label'
import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'
import { HttpError } from '../../../services/http/http-client'
import { assignRole, getUser, removeRole, type Role, type UserAccount } from '../api/admin-api'

interface Props {
  user: UserAccount
  roles: Role[]
  rolesState: 'loading' | 'ready' | 'error'
  accessToken: string
  onReadback: (user: UserAccount) => void
}

export function AccountRoleAssignments({ user, roles, rolesState, accessToken, onReadback }: Props) {
  const [busyRole, setBusyRole] = useState<number | null>(null)
  const [uncertain, setUncertain] = useState(false)
  const [message, setMessage] = useState('')
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()
  const globalRoles = roles.filter(role => role.isAssignableGlobalRole && role.assignmentKind === 'GLOBAL')

  async function refresh() {
    try { onReadback(await getUser(user.id, accessToken)); setUncertain(false); setMessage('Đã tải lại vai trò từ máy chủ.') }
    catch { setMessage('Chưa tải lại được vai trò. Vui lòng thử lại.') }
  }

  async function change(role: Role) {
    if (busyRole !== null || uncertain) return
    const assigned = user.roles.includes(role.code)
    if (assigned) {
      const confirmed = await requestConfirmation({ title: `Thu hồi vai trò ${displayLabel(role.code)}?`,
        description: `Máy chủ sẽ kiểm tra các ràng buộc trước khi thu hồi vai trò của ${user.fullName}.`,
        confirmLabel: 'Thu hồi vai trò', danger: true })
      if (confirmed === null) return
    }
    setBusyRole(role.id); setMessage('')
    try {
      if (assigned) await removeRole(user.id, role.id, accessToken)
      else await assignRole(user.id, role.id, accessToken)
      try {
        const next = await getUser(user.id, accessToken)
        onReadback(next)
        if (next.roles.includes(role.code) === assigned) {
          setUncertain(true); setMessage('Máy chủ chưa xác nhận thay đổi vai trò. Tải lại hồ sơ trước khi thao tác tiếp.')
        } else setMessage('Vai trò đã được cập nhật và đối chiếu với máy chủ.')
      } catch {
        setUncertain(true); setMessage('Thao tác có thể đã hoàn tất nhưng chưa đọc lại được. Tải lại hồ sơ trước khi thao tác tiếp.')
      }
    } catch (reason) {
      setMessage(reason instanceof HttpError && reason.status === 403 ? 'Bạn không có quyền thay đổi vai trò này.'
        : reason instanceof HttpError && reason.status === 409 ? 'Vai trò đang bị ràng buộc hoặc đã thay đổi. Tải lại hồ sơ để kiểm tra.'
          : 'Chưa cập nhật được vai trò. Vui lòng thử lại.')
    } finally { setBusyRole(null) }
  }

  return <section className="admin-panel" aria-label="Quản lý vai trò toàn hệ thống">
    <h2>Gán vai trò hệ thống</h2>
    <p className="admin-boundary">Một tài khoản có thể có nhiều vai trò hệ thống. Giảng viên hướng dẫn và người chấm được phân công theo từng đồ án; cùng một người có thể hướng dẫn nhóm này và chấm nhóm khác.</p>
    {rolesState === 'loading' && <p role="status">Đang tải danh mục vai trò…</p>}
    {rolesState === 'error' && <p role="alert">Chưa tải được danh mục vai trò. Hãy tải lại trang trước khi gán.</p>}
    {rolesState === 'ready' && globalRoles.length === 0 && <p role="status">Chưa có vai trò hệ thống có thể gán.</p>}
    {rolesState === 'ready' && globalRoles.length > 0 && <ul className="space-y-2">{globalRoles.map(role => {
      const assigned = user.roles.includes(role.code)
      return <li key={role.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-hairline p-2">
        <span><strong>{displayLabel(role.code)}</strong> <span className="text-ink-muted">{assigned ? 'Đã gán' : 'Chưa gán'}</span></span>
        <Button type="button" size="sm" variant={assigned ? 'outline' : 'secondary'} disabled={busyRole !== null || uncertain}
          onClick={() => void change(role)}>{busyRole === role.id ? 'Đang lưu…' : assigned ? `Thu hồi ${displayLabel(role.code)}` : `Gán ${displayLabel(role.code)}`}</Button>
      </li>
    })}</ul>}
    {message && <p className="admin-notice" role={uncertain ? 'alert' : 'status'}>{message}</p>}
    {uncertain && <Button type="button" size="sm" variant="outline" onClick={() => void refresh()}>Tải lại vai trò</Button>}
    {confirmationDialog}
  </section>
}
