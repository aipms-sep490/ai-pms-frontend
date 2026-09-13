import { Link } from 'react-router-dom'
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
  const { session, status, error, refreshProfile } = useAuthSession()

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

  const isRefreshing = status === 'refreshing_profile'

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

      <Button variant="secondary" onClick={() => void refreshProfile()} disabled={isRefreshing}>
        {isRefreshing ? 'Đang làm mới…' : 'Làm mới hồ sơ'}
      </Button>
    </section>
  )
}
