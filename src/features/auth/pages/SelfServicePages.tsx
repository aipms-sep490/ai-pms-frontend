import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { HttpError } from '../../../services/http/http-client'
import { changePassword, requestPasswordReset, resetPassword } from '../api/auth-api'
import { useAuthSession } from '../context/useAuthSession'
import './auth-pages.css'

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
    <p className="auth-description">Nhập email tài khoản AI-PMS để yêu cầu liên kết đặt lại mật khẩu.</p>
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

  if (!session) return <main className="auth-page-shell"><section className="auth-card"><h1>Cần đăng nhập</h1><Link to="/login">Mở trang đăng nhập</Link></section></main>

  return <section className="auth-profile" aria-labelledby="security-title">
    <h1 id="security-title">Đổi mật khẩu</h1>
    <p className="auth-description">Sau khi đổi mật khẩu, bạn cần đăng nhập lại.</p>
    <form className="auth-form" onSubmit={submit} noValidate>
      <label htmlFor="current-password">Mật khẩu hiện tại</label>
      <input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} disabled={pending} />
      <label htmlFor="security-password">Mật khẩu mới</label>
      <input id="security-password" type="password" autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} aria-describedby="security-password-hint" disabled={pending} />
      <p className="auth-form-hint" id="security-password-hint">{passwordMessage}</p>
      <label htmlFor="security-confirm">Xác nhận mật khẩu mới</label>
      <input id="security-confirm" type="password" autoComplete="new-password" value={confirm} onChange={event => setConfirm(event.target.value)} disabled={pending} />
      {error && <p className="auth-error" role="alert">{error}</p>}
      <Button type="submit" disabled={pending}>{pending ? 'Đang đổi mật khẩu…' : 'Đổi mật khẩu'}</Button>
    </form>
  </section>
}
