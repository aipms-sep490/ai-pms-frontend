import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { getExternalLogins, unlinkGoogle, type ExternalLogin } from '../api/auth-api'
import { GoogleLoginButton } from './GoogleLoginButton'
import { HttpError } from '../../../services/http/http-client'
import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'

export function ExternalLoginsPanel() {
  const [logins, setLogins] = useState<ExternalLogin[]>([]), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false)
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [password, setPassword] = useState(''), [linkPassword, setLinkPassword] = useState<string | null>(null)
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()
  const load = useCallback(async () => { setLoading(true); try { setLogins(await getExternalLogins()); setError('') } catch { setError('Chưa tải được tài khoản liên kết. Hãy thử lại.') } finally { setLoading(false) } }, [])
  useEffect(() => { void load() }, [load])
  const linked = useCallback(() => { setLinkPassword(null); setPassword(''); setNotice('Đã liên kết tài khoản Google.'); void load() }, [load])
  const hasGoogle = logins.some(item => item.provider.toUpperCase() === 'GOOGLE')
  async function unlink() {
    if (!password || busy || await requestConfirmation({ title: 'Gỡ liên kết Google?', description: 'Bạn sẽ tiếp tục đăng nhập bằng mật khẩu tài khoản.', confirmLabel: 'Gỡ liên kết', danger: true }) === null) return
    setBusy(true); setError(''); setNotice('')
    try { await unlinkGoogle(password); setPassword(''); await load(); setNotice('Đã gỡ liên kết Google.') }
    catch (reason) { setError(reason instanceof HttpError && reason.status === 401 ? 'Mật khẩu hiện tại chưa đúng hoặc phiên đăng nhập đã hết hạn.' : 'Chưa gỡ được liên kết. Hãy kiểm tra mật khẩu và thử lại.') }
    finally { setBusy(false) }
  }
  return <section className="profile-workspace workspace-surface mt-6" aria-labelledby="external-logins-title">{confirmationDialog}<h2 id="external-logins-title" className="text-lg font-semibold">Tài khoản Google</h2><p className="mt-2 text-sm text-slate-600">Liên kết Google để có thêm cách đăng nhập. Xác nhận mật khẩu hiện tại trước khi thay đổi.</p>{loading ? <p role="status" className="mt-4 text-sm">Đang tải tài khoản liên kết…</p> : error ? null : <><ul className="mt-4 divide-y divide-hairline">{logins.map(item => <li key={item.provider} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><strong>{item.provider}</strong><span className="break-all text-slate-600">{item.email}</span></li>)}</ul>{!hasGoogle && <p className="text-sm text-slate-500">Chưa liên kết tài khoản Google.</p>}<form className="auth-form" onSubmit={event => { event.preventDefault(); if (hasGoogle) void unlink(); else if (password) setLinkPassword(password) }}><label htmlFor="external-current-password">Mật khẩu hiện tại</label><input id="external-current-password" required type="password" autoComplete="current-password" value={password} disabled={busy || linkPassword !== null} onChange={e => setPassword(e.target.value)} />{linkPassword === null ? <Button type="submit" variant={hasGoogle ? 'secondary' : 'primary'} disabled={busy || !password}>{busy ? 'Đang xử lý…' : hasGoogle ? 'Gỡ liên kết Google' : 'Liên kết Google'}</Button> : <><GoogleLoginButton purpose="LINK" currentPassword={linkPassword} onLinked={linked} /><Button variant="secondary" onClick={() => setLinkPassword(null)}>Hủy liên kết</Button></>}</form></>}{error && <p role="alert" className="auth-error">{error}<button type="button" className="ml-2 font-semibold underline" onClick={() => void load()}>Thử lại</button></p>}{notice && <p role="status" className="auth-status">{notice}</p>}</section>
}
