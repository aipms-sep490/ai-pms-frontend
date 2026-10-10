import { AcademicProfileSummary } from '../../academic/components/AcademicProfileSummary'
import { Link } from 'react-router-dom'
import { useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { HttpError } from '../../../services/http/http-client'
import { useAuthSession } from '../context/useAuthSession'
import './auth-pages.css'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'

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
        <p>Đăng nhập để xem và cập nhật thông tin cá nhân.</p>
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
      setMessage('Đã cập nhật hồ sơ của bạn.')
      setIsEditing(false)
    } catch (reason) { setMessage(getProfileErrorMessage(reason instanceof Error ? reason : new Error())) }
  }

  return (
    <WorkspacePage title="Hồ sơ tài khoản" eyebrow="Tài khoản cá nhân" description="Quản lý thông tin cá nhân và thiết lập bảo mật của bạn." action={<Button variant="secondary" onClick={() => void refreshProfile()} disabled={isRefreshing} icon="refresh">{isRefreshing ? 'Đang làm mới…' : 'Làm mới hồ sơ'}</Button>}>
    <section className="profile-workspace workspace-surface" aria-labelledby="profile-title">
      <div className="profile-identity">
        <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center font-bold text-2xl shadow-sm shrink-0">
          {session.user.fullName.charAt(0)}
        </div>
        <div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-primary-subtle text-primary border border-primary/20 font-mono text-xs font-bold uppercase tracking-wider mb-1">
            Hồ sơ đã xác thực
          </span>
          <h2 id="profile-title" className="text-xl font-bold text-slate-900">{session.user.fullName}</h2>
          <p className="auth-description text-xs text-slate-500 mt-0.5">{session.user.email}</p>
        </div>
      </div>

      <div className="auth-profile-grid">
        <div>
          <span>Mã tài khoản</span>
          <strong>#{session.user.id}</strong>
        </div>
        <div>
          <span>Vai trò tài khoản</span>
          <strong>{session.user.roles.length > 0 ? session.user.roles.map(role => ({ STUDENT: 'Sinh viên', LECTURER: 'Giảng viên', DEPARTMENT_STAFF: 'Cán bộ bộ môn', ADMIN: 'Quản trị viên' } as Record<string, string>)[role] ?? role).join(', ') : 'Chưa có vai trò'}</strong>
        </div>
      </div>

      <AcademicProfileSummary />
      {error && <p className="auth-error" role="alert">{getProfileErrorMessage(error)}</p>}
      {message && <p className="auth-status" role="status">{message}</p>}

      {isEditing ? <form className="auth-form" onSubmit={submit} noValidate>
        <label htmlFor="profile-name">Họ và tên</label><input id="profile-name" name="fullName" defaultValue={session.user.fullName} required />
        <label htmlFor="profile-phone">Số điện thoại</label><input id="profile-phone" name="phone" type="tel" autoComplete="tel" />
        <label htmlFor="profile-job-title">Chức danh</label><input id="profile-job-title" name="title" autoComplete="organization-title" />
        <div className="auth-actions"><Button type="submit">Lưu hồ sơ</Button><Button type="button" variant="secondary" onClick={() => setIsEditing(false)}>Hủy</Button></div>
      </form> : <div className="auth-actions"><Button onClick={() => setIsEditing(true)}>Chỉnh sửa hồ sơ</Button><Link className="profile-security-link" to="/profile/security">Bảo mật tài khoản<span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span></Link></div>}
    </section>
    </WorkspacePage>
  )
}

