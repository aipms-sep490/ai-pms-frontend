import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { HttpError } from '../../../services/http/http-client'
import { changePassword, requestPasswordReset, resetPassword } from '../api/auth-api'
import { useAuthSession } from '../context/useAuthSession'
import './auth-pages.css'

const passwordMessage = 'Mật khẩu phải có ít nhất 10 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.'
function message(error: unknown) {
  if (error instanceof HttpError) {
    if (error.status === 400) return 'Thông tin chưa hợp lệ. Kiểm tra lại các trường.'
    if (error.status === 401) return 'Phiên hoặc liên kết đặt lại mật khẩu không còn hợp lệ.'
    if (error.status === 403) return 'Thao tác này không được phép.'
  }
  return 'Không thể kết nối dịch vụ xác thực. Hãy thử lại.'
}
function validPassword(value: string) { return value.length >= 10 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value) && /[^a-zA-Z0-9]/.test(value) }

export function ForgotPasswordPage() {
  const [email, setEmail] = useState(''); const [status, setStatus] = useState<string | null>(null); const [error, setError] = useState<string | null>(null)
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!/^\S+@\S+\.\S+$/.test(email)) { setError('Nhập địa chỉ email hợp lệ.'); return }; setError(null); try { await requestPasswordReset(email.trim()); setStatus('Nếu tài khoản tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi.') } catch (reason) { setError(message(reason)) } }
  return <main className="auth-page-shell"><section className="auth-card" aria-labelledby="forgot-title"><p className="auth-eyebrow">Khôi phục truy cập</p><h1 id="forgot-title">Quên mật khẩu</h1><p className="auth-description">Chúng tôi luôn trả về cùng một xác nhận để không tiết lộ tài khoản nào tồn tại.</p><form className="auth-form" onSubmit={submit} noValidate><label htmlFor="reset-email">Email</label><input id="reset-email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} />{error && <p className="auth-error" role="alert">{error}</p>}{status && <p className="auth-status" role="status">{status}</p>}<Button type="submit">Gửi hướng dẫn</Button></form><Link to="/login">Quay lại đăng nhập</Link></section></main>
}

export function ResetPasswordPage() {
  const [params] = useSearchParams(); const token = params.get('token') ?? ''; const [newPassword, setNewPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [status, setStatus] = useState<string | null>(null); const [error, setError] = useState<string | null>(null)
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!token) { setError('Liên kết đặt lại mật khẩu không hợp lệ.'); return }; if (!validPassword(newPassword)) { setError(passwordMessage); return }; if (newPassword !== confirm) { setError('Xác nhận mật khẩu không khớp.'); return }; setError(null); try { await resetPassword(token, newPassword); setNewPassword(''); setConfirm(''); setStatus('Mật khẩu đã được đặt lại. Bạn có thể đăng nhập bằng mật khẩu mới.') } catch (reason) { setError(message(reason)) } }
  return <main className="auth-page-shell"><section className="auth-card" aria-labelledby="reset-title"><p className="auth-eyebrow">Khôi phục truy cập</p><h1 id="reset-title">Đặt lại mật khẩu</h1><form className="auth-form" onSubmit={submit} noValidate><label htmlFor="new-password">Mật khẩu mới</label><input id="new-password" type="password" autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} /><label htmlFor="confirm-password">Xác nhận mật khẩu mới</label><input id="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={event => setConfirm(event.target.value)} /><p className="auth-session-note">{passwordMessage}</p>{error && <p className="auth-error" role="alert">{error}</p>}{status && <p className="auth-status" role="status">{status}</p>}<Button type="submit">Đặt lại mật khẩu</Button></form><Link to="/login">Quay lại đăng nhập</Link></section></main>
}

export function ProfileSecurityPage() {
  const { session } = useAuthSession(); const [currentPassword, setCurrentPassword] = useState(''); const [newPassword, setNewPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [status, setStatus] = useState<string | null>(null); const [error, setError] = useState<string | null>(null)
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!currentPassword) { setError('Nhập mật khẩu hiện tại.'); return }; if (!validPassword(newPassword)) { setError(passwordMessage); return }; if (newPassword !== confirm) { setError('Xác nhận mật khẩu không khớp.'); return }; setError(null); try { await changePassword(currentPassword, newPassword); setCurrentPassword(''); setNewPassword(''); setConfirm(''); setStatus('Mật khẩu đã được thay đổi.') } catch (reason) { setError(message(reason)) } }
  if (!session) return <main className="auth-page-shell"><section className="auth-card"><h1>Cần đăng nhập</h1><Link to="/login">Mở trang đăng nhập</Link></section></main>
  return <section className="auth-profile" aria-labelledby="security-title"><p className="auth-eyebrow">Bảo mật tài khoản</p><h1 id="security-title">Đổi mật khẩu</h1><form className="auth-form" onSubmit={submit} noValidate><label htmlFor="current-password">Mật khẩu hiện tại</label><input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} /><label htmlFor="security-password">Mật khẩu mới</label><input id="security-password" type="password" autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} /><label htmlFor="security-confirm">Xác nhận mật khẩu mới</label><input id="security-confirm" type="password" autoComplete="new-password" value={confirm} onChange={event => setConfirm(event.target.value)} /><p className="auth-session-note">{passwordMessage}</p>{error && <p className="auth-error" role="alert">{error}</p>}{status && <p className="auth-status" role="status">{status}</p>}<Button type="submit">Đổi mật khẩu</Button></form></section>
}
