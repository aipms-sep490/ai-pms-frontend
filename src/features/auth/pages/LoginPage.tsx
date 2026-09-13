import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { HttpError } from '../../../services/http/http-client'
import { Button } from '../../../components/ui/Button'
import { useAuthSession } from '../context/useAuthSession'
import './auth-pages.css'

function getLoginErrorMessage(error: unknown): string {
  if (error instanceof HttpError) {
    if (error.status === 401) return 'Email hoặc mật khẩu không chính xác.'
    if (error.status === 403) return 'Tài khoản chưa hoạt động hoặc không được phép đăng nhập.'
    if (error.status === 400) return 'Thông tin đăng nhập chưa hợp lệ. Hãy kiểm tra lại email và mật khẩu.'
  }

  return 'Không thể kết nối dịch vụ xác thực. Hãy thử lại sau.'
}

export function LoginPage() {
  const navigate = useNavigate()
  const { login, status } = useAuthSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const isSubmitting = status === 'authenticating'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)

    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
      setFormError('Nhập địa chỉ email hợp lệ.')
      return
    }

    if (!password) {
      setFormError('Nhập mật khẩu để tiếp tục.')
      return
    }

    try {
      await login({ email: email.trim(), password })
      navigate('/profile', { replace: true })
    } catch (error: unknown) {
      setFormError(getLoginErrorMessage(error))
    }
  }

  return (
    <main className="auth-page-shell">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="auth-brand">
          <span className="material-symbols-outlined" aria-hidden="true">school</span>
          <span>AI-PMS · FPTU</span>
        </div>
        <p className="auth-eyebrow">Cổng xác thực học vụ</p>
        <h1 id="login-title">Đăng nhập tài khoản</h1>
        <p className="auth-description">
          Xác thực bằng tài khoản do hệ thống AI-PMS quản lý để xem hồ sơ và không gian làm việc được cấp quyền.
        </p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(formError)}
            disabled={isSubmitting}
          />

          <label htmlFor="login-password">Mật khẩu</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(formError)}
            disabled={isSubmitting}
          />

          {formError && <p className="auth-error" role="alert">{formError}</p>}

          <Button className="auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Đang xác thực…' : 'Đăng nhập'}
          </Button>
        </form>

        <p className="auth-session-note">
          Phiên tích hợp hiện được giữ trong bộ nhớ trình duyệt; tải lại trang sẽ yêu cầu đăng nhập lại.
        </p>
      </section>
    </main>
  )
}
