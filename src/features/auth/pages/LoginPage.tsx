import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { HttpError } from '../../../services/http/http-client'
import { Button } from '../../../components/ui/Button'
import { useAuthSession } from '../context/useAuthSession'
import { getHomePath } from '../utils/role-access'
import { GoogleLoginButton } from '../components/GoogleLoginButton'
import './auth-pages.css'
import './login-design.css'

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
  const location = useLocation()
  const { login, session, status } = useAuthSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const isSubmitting = status === 'authenticating' || status === 'refreshing'

  if (status === 'authenticated' && session) return <Navigate to={getHomePath(session.user)} replace />

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
      const authenticatedSession = await login({ email: email.trim(), password })
      navigate(getHomePath(authenticatedSession.user), { replace: true })
    } catch (error: unknown) {
      setFormError(getLoginErrorMessage(error))
    }
  }

  return (
    <main className="login-page">
      <aside className="login-story" aria-label="Giới thiệu AI-PMS">
        <div className="login-brand"><span className="material-symbols-outlined" aria-hidden="true">school</span><div><strong>AI-PMS</strong><span>Không gian đồ án · FPT University</span></div></div>
        <div className="login-story-copy"><p className="login-story-label">Cùng nhóm. Cùng giảng viên.</p><h2>Từ ý tưởng đến<br />đồ án hoàn chỉnh.</h2><p>Kế hoạch, trao đổi và kết quả của cả nhóm — kết nối trong một không gian.</p></div>
        <ol className="login-journey" aria-label="Quy trình đồ án">
          <li><span className="material-symbols-outlined" aria-hidden="true">lightbulb</span><div><strong>Khởi đầu có định hướng</strong><span>Đề tài, nhóm và giảng viên hướng dẫn</span></div></li>
          <li><span className="material-symbols-outlined" aria-hidden="true">route</span><div><strong>Theo sát từng bước</strong><span>Công việc, mốc tiến độ và trao đổi</span></div></li>
          <li><span className="material-symbols-outlined" aria-hidden="true">task_alt</span><div><strong>Hoàn thiện cùng nhau</strong><span>Bàn giao, phản hồi và đánh giá</span></div></li>
        </ol>
        <p className="login-story-footer">Một nền tảng cho sinh viên, giảng viên và nhà trường.</p>
      </aside>
      <div className="login-form-side"><section className="login-form-panel" aria-labelledby="login-title">
        <div className="login-mobile-brand"><span className="material-symbols-outlined" aria-hidden="true">school</span><strong>AI-PMS · FPTU</strong></div>
        <p className="login-welcome">Chào mừng trở lại</p>
        <h1 className="auth-login-title" id="login-title">Đăng nhập tài khoản</h1>
        <p className="login-description">Tiếp tục công việc và theo dõi đồ án của bạn.</p>
        {(location.state as { passwordChanged?: boolean } | null)?.passwordChanged && <p className="auth-status" role="status">Mật khẩu đã được đổi. Hãy đăng nhập lại bằng mật khẩu mới.</p>}
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="login-email">Email</label>
          <input id="login-email" type="email" autoComplete="username" placeholder="Email của bạn" spellCheck={false} autoCapitalize="none" value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={Boolean(formError)} aria-describedby={formError ? 'login-error' : undefined} disabled={isSubmitting} />
          <div className="login-password-label"><label htmlFor="login-password">Mật khẩu</label><Link to="/forgot-password">Quên mật khẩu?</Link></div>
          <div className="login-password-field"><input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Nhập mật khẩu" value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={Boolean(formError)} aria-describedby={formError ? 'login-error' : undefined} disabled={isSubmitting} /><button type="button" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-pressed={showPassword} disabled={isSubmitting} onClick={() => setShowPassword(value => !value)}><span className="material-symbols-outlined" aria-hidden="true">{showPassword ? 'visibility_off' : 'visibility'}</span></button></div>
          {formError && <p id="login-error" className="auth-error" role="alert">{formError}</p>}
          <Button className="auth-submit" type="submit" disabled={isSubmitting} icon={isSubmitting ? undefined : 'arrow_forward'}>{isSubmitting ? 'Đang xác thực…' : 'Đăng nhập'}</Button>
        </form>
        <div className="auth-divider" role="separator">hoặc</div>
        <GoogleLoginButton />
        <p className="login-help"><span className="material-symbols-outlined" aria-hidden="true">help_outline</span>Chưa có tài khoản? Liên hệ cán bộ phụ trách bộ môn để được hỗ trợ.</p>
      </section><p className="login-form-footer">AI-PMS · Quản lý và theo dõi đồ án học thuật</p></div>
    </main>
  )
}
