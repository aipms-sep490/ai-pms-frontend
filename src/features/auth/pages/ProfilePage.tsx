import { Link } from 'react-router-dom'
import { useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { HttpError } from '../../../services/http/http-client'
import { useAuthSession } from '../context/useAuthSession'
import './auth-pages.css'

function getProfileErrorMessage(error: Error): string {
  if (error instanceof HttpError) {
    if (error.status === 401) return 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.'
    if (error.status === 403) return 'Tài khoản không có quyền xem hồ sơ hiện tại.'
  }

  return 'Không thể kết nối dịch vụ hồ sơ. Hãy thử lại.'
}

export function ProfilePage() {
  const { session, status, error, refreshProfile, updateProfile } = useAuthSession()
  const [isEditing, setIsEditing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  if (!session) {
    return (
      <section className="auth-profile-empty" aria-labelledby="profile-access-title">
        <p className="auth-eyebrow">Hồ sơ tài khoản</p>
        <h1 id="profile-access-title">Cần đăng nhập để xem hồ sơ</h1>
        <p>Hồ sơ được đọc từ endpoint hiện tại của backend sau khi xác thực thành công.</p>
        <Link className="auth-link-button" to="/login">Mở trang đăng nhập</Link>
      </section>
    )
  }

  const isRefreshing = status === 'refreshing'
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const fullName = String(form.get('fullName') ?? '').trim()
    if (!fullName) { setMessage('Họ và tên không được để trống.'); return }
    if (!updateProfile) { setMessage('Chức năng cập nhật hồ sơ hiện chưa sẵn sàng.'); return }
    setMessage(null)
    try {
      await updateProfile({ fullName, phone: String(form.get('phone') ?? '').trim() || null, title: String(form.get('title') ?? '').trim() || null })
      setMessage('Hồ sơ đã được backend cập nhật.')
      setIsEditing(false)
    } catch (reason) { setMessage(getProfileErrorMessage(reason instanceof Error ? reason : new Error())) }
  }

  return (
    <section className="auth-profile" aria-labelledby="profile-title">
      <div>
        <p className="auth-eyebrow">Hồ sơ đã xác thực</p>
        <h1 id="profile-title">{session.user.fullName}</h1>
        <p className="auth-description">{session.user.email}</p>
      </div>

      <div className="auth-profile-grid">
        <div>
          <span>Mã tài khoản</span>
          <strong>#{session.user.id}</strong>
        </div>
        <div>
          <span>Vai trò từ backend</span>
          <strong>{session.user.roles.length > 0 ? session.user.roles.join(', ') : 'Chưa có vai trò'}</strong>
        </div>
      </div>

      {error && <p className="auth-error" role="alert">{getProfileErrorMessage(error)}</p>}
      {message && <p className="auth-status" role="status">{message}</p>}

      {isEditing ? <form className="auth-form" onSubmit={submit} noValidate>
        <label htmlFor="profile-name">Họ và tên</label><input id="profile-name" name="fullName" defaultValue={session.user.fullName} required />
        <label htmlFor="profile-phone">Số điện thoại</label><input id="profile-phone" name="phone" type="tel" autoComplete="tel" />
        <label htmlFor="profile-title">Chức danh</label><input id="profile-title" name="title" autoComplete="organization-title" />
        <div className="auth-actions"><Button type="submit">Lưu hồ sơ</Button><Button type="button" variant="secondary" onClick={() => setIsEditing(false)}>Hủy</Button></div>
      </form> : <div className="auth-actions"><Button onClick={() => setIsEditing(true)}>Chỉnh sửa hồ sơ</Button><Link className="auth-link-button" to="/profile/security">Bảo mật tài khoản</Link></div>}

      <Button variant="secondary" onClick={() => void refreshProfile()} disabled={isRefreshing}>
        {isRefreshing ? 'Đang làm mới…' : 'Làm mới hồ sơ'}
      </Button>
    </section>
  )
}
