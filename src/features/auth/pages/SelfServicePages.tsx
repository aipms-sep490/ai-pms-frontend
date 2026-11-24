import { ExternalLoginsPanel } from '../components/ExternalLoginsPanel'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { HttpError } from '../../../services/http/http-client'
import { changePassword, requestPasswordReset, resetPassword } from '../api/auth-api'
import { useAuthSession } from '../context/useAuthSession'
import './auth-pages.css'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'

const passwordMessage = 'Ít nhất 10 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.'

function validPassword(value: string) {
  return value.length >= 10 && value.length <= 128 && /[A-Z]/.test(value)
    && /[a-z]/.test(value) && /\d/.test(value) && /[^a-zA-Z0-9]/.test(value)
}

function requestError(error: unknown) {
  if (error instanceof HttpError) {
    if (error.status === 429) return 'Bạn đã gửi quá nhiều yêu cầu. Hãy thử lại sau.'
    if (error.status === 503) return 'Dịch vụ email hiện chưa sẵn sàng. Hãy thử lại sau hoặc liên hệ quản trị viên.'
    if (error.status === 400) return 'Địa chỉ email chưa hợp lệ.'
  }
  return 'Không thể gửi yêu cầu lúc này. Hãy thử lại sau.'
}

function resetError(error: unknown) {
  if (error instanceof HttpError) {
    if (error.status === 400) return 'Mật khẩu mới chưa đáp ứng yêu cầu.'
    if (error.status === 401 || error.status === 409) return 'Liên kết đã hết hạn hoặc đã được sử dụng. Hãy yêu cầu liên kết mới.'
    if (error.status === 429) return 'Bạn đã thử quá nhiều lần. Hãy thử lại sau.'
  }
  return 'Không thể đặt lại mật khẩu lúc này. Hãy thử lại sau.'
}

function changeError(error: unknown) {
  if (error instanceof HttpError) {
    if (error.status === 400) return 'Mật khẩu mới chưa đáp ứng yêu cầu.'
    if (error.status === 401) return 'Mật khẩu hiện tại không đúng hoặc phiên đăng nhập đã hết hạn.'
    if (error.status === 409) return 'Mật khẩu mới phải khác mật khẩu hiện tại.'
    if (error.status === 429) return 'Bạn đã thử quá nhiều lần. Hãy thử lại sau.'
  }
  return 'Không thể đổi mật khẩu lúc này. Hãy thử lại sau.'
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [pending, setPending] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return
    setError(null)
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Nhập địa chỉ email hợp lệ.')
      return
    }
    setPending(true)
    try {
      await requestPasswordReset(email.trim())
      setAccepted(true)
    } catch (reason) {
      setError(requestError(reason))
    } finally {
      setPending(false)
    }
  }

  return <main className="auth-page-shell"><section className="auth-card" aria-labelledby="forgot-title">
    <h1 id="forgot-title">Quên mật khẩu</h1>
    <p className="auth-description">Nhập email tài khoản AIPMS để yêu cầu liên kết đặt lại mật khẩu.</p>
    {accepted ? <p className="auth-status" role="status">Yêu cầu đã được tiếp nhận. Nếu email thuộc tài khoản đang hoạt động, hãy kiểm tra hộp thư và thư rác để tìm liên kết đặt lại.</p>
      : <form className="auth-form" onSubmit={submit} noValidate>
        <label htmlFor="reset-email">Email</label>
        <input id="reset-email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? 'forgot-error' : undefined} disabled={pending} />
        {error && <p className="auth-error" id="forgot-error" role="alert">{error}</p>}
        <Button type="submit" disabled={pending}>{pending ? 'Đang gửi yêu cầu…' : 'Gửi liên kết đặt lại'}</Button>
      </form>}
    <Link className="auth-return-link" to="/login">Quay lại đăng nhập</Link>
  </section></main>
}

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token')?.trim() ?? ''
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pending, setPending] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return
    setError(null)
    if (!validPassword(newPassword)) {
      setError(passwordMessage)
      return
    }
    if (newPassword !== confirm) {
      setError('Xác nhận mật khẩu không khớp.')
      return
    }
    setPending(true)
    try {
      await resetPassword(token, newPassword)
      setNewPassword('')
      setConfirm('')
      setCompleted(true)
    } catch (reason) {
      setError(resetError(reason))
    } finally {
      setPending(false)
    }
  }

  return <main className="auth-page-shell"><section className="auth-card" aria-labelledby="reset-title">
    <h1 id="reset-title">Đặt lại mật khẩu</h1>
    {!token ? <><p className="auth-error" role="alert">Liên kết đặt lại không hợp lệ. Hãy yêu cầu liên kết mới.</p><Link className="auth-return-link" to="/forgot-password">Yêu cầu liên kết mới</Link></>
      : completed ? <><p className="auth-status" role="status">Mật khẩu đã được đặt lại. Hãy đăng nhập bằng mật khẩu mới.</p><Link className="auth-return-link" to="/login">Đăng nhập</Link></>
        : <><form className="auth-form" onSubmit={submit} noValidate>
          <label htmlFor="new-password">Mật khẩu mới</label>
          <input id="new-password" type="password" autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} aria-invalid={Boolean(error)} aria-describedby="reset-password-hint" disabled={pending} />
          <p className="auth-form-hint" id="reset-password-hint">{passwordMessage}</p>
          <label htmlFor="confirm-password">Xác nhận mật khẩu mới</label>
          <input id="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={event => setConfirm(event.target.value)} disabled={pending} />
          {error && <p className="auth-error" role="alert">{error} {error.includes('liên kết') && <Link to="/forgot-password">Yêu cầu liên kết mới</Link>}</p>}
          <Button type="submit" disabled={pending}>{pending ? 'Đang đặt lại…' : 'Đặt lại mật khẩu'}</Button>
        </form><Link className="auth-return-link" to="/login">Quay lại đăng nhập</Link></>}
  </section></main>
}

export function ProfileSecurityPage() {
  const navigate = useNavigate()
  const { session, logout } = useAuthSession()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return
    setError(null)
    if (!currentPassword) {
      setError('Nhập mật khẩu hiện tại.')
      return
    }
    if (!validPassword(newPassword)) {
      setError(passwordMessage)
      return
    }
    if (newPassword !== confirm) {
      setError('Xác nhận mật khẩu không khớp.')
      return
    }
    setPending(true)
    try {
      await changePassword(currentPassword, newPassword)
      // The backend revokes all sessions after a password change. Clear the local copy too.
      try { await logout() } catch { /* logout clears local state even if the revoked token is rejected */ }
      navigate('/login', { replace: true, state: { passwordChanged: true } })
    } catch (reason) {
      setError(changeError(reason))
    } finally {
      setPending(false)
    }
  }

  if (!session) return <div className="auth-page-shell"><section className="auth-card"><h1>Cần đăng nhập</h1><Link to="/login">Mở trang đăng nhập</Link></section></div>

  return (
    <WorkspacePage title="Bảo mật tài khoản" eyebrow="Tài khoản cá nhân" description="Cập nhật mật khẩu và quản lý tài khoản đăng nhập liên kết." backTo="/profile">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12 items-start">
        {/* Left Bento Column: Password Change Form */}
        <section className="profile-workspace workspace-surface !p-0 xl:col-span-7" aria-labelledby="security-title">
          <div className="flex items-center gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
            <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">lock_reset</span>
            <div>
              <h2 id="security-title" className="font-heading text-sm font-bold text-ink">Đổi mật khẩu</h2>
              <p className="text-xs text-ink-muted">Sau khi đổi mật khẩu, tất cả phiên cũ sẽ bị thu hồi và bạn cần đăng nhập lại.</p>
            </div>
          </div>
          <div className="p-5">
            <form className="auth-form !mt-0" onSubmit={submit} noValidate>
              <label htmlFor="current-password">Mật khẩu hiện tại</label>
              <input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} disabled={pending} />
              <label htmlFor="security-password">Mật khẩu mới</label>
              <input id="security-password" type="password" autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} aria-describedby="security-password-hint" disabled={pending} />
              <p className="auth-form-hint" id="security-password-hint">{passwordMessage}</p>
              <label htmlFor="security-confirm">Xác nhận mật khẩu mới</label>
              <input id="security-confirm" type="password" autoComplete="new-password" value={confirm} onChange={event => setConfirm(event.target.value)} disabled={pending} />
              {error && <p className="auth-error" role="alert">{error}</p>}
              <div className="pt-2">
                <Button type="submit" disabled={pending}>{pending ? 'Đang đổi mật khẩu…' : 'Đổi mật khẩu'}</Button>
              </div>
            </form>
          </div>
        </section>

        {/* Right Bento Column: Security Guidance & External Logins */}
        <div className="xl:col-span-5 space-y-5">
          <section className="workspace-surface" aria-labelledby="security-guidance-title">
            <div className="flex items-center gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
              <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">verified_user</span>
              <h2 id="security-guidance-title" className="font-heading text-sm font-bold text-ink">Khuyến nghị bảo mật</h2>
            </div>
            <ul className="space-y-2.5 p-5 text-xs leading-5 text-ink-soft">
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined mt-0.5 text-[16px] text-status-success-text shrink-0" aria-hidden="true">check_circle</span>
                <span>Sử dụng mật khẩu riêng dài từ 10 ký tự trở lên, kết hợp chữ hoa, chữ thường, số và ký tự đặc biệt.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined mt-0.5 text-[16px] text-status-success-text shrink-0" aria-hidden="true">check_circle</span>
                <span>Không dùng lại mật khẩu cá nhân hoặc chia sẻ tài khoản sinh viên/giảng viên cho người khác.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined mt-0.5 text-[16px] text-status-success-text shrink-0" aria-hidden="true">check_circle</span>
                <span>Đổi mật khẩu ngay nếu nghi ngờ truy cập trái phép — hệ thống sẽ tự đăng xuất các phiên còn lại.</span>
              </li>
            </ul>
          </section>

          <ExternalLoginsPanel />
        </div>
      </div>
    </WorkspacePage>
  )
}

