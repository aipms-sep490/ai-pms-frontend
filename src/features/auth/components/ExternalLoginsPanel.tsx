import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { getExternalLogins, unlinkGoogle, type ExternalLogin } from '../api/auth-api'
import { GoogleLoginButton } from './GoogleLoginButton'
import { HttpError } from '../../../services/http/http-client'
import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'

export function ExternalLoginsPanel() {
  const [logins, setLogins] = useState<ExternalLogin[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [password, setPassword] = useState('')
  const [linkPassword, setLinkPassword] = useState<string | null>(null)
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setLogins(await getExternalLogins())
      setError('')
    } catch {
      setError('Chưa tải được tài khoản liên kết. Hãy thử lại.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const linked = useCallback(() => {
    setLinkPassword(null)
    setPassword('')
    setNotice('Đã liên kết tài khoản Google.')
    void load()
  }, [load])

  const hasGoogle = logins.some(item => item.provider.toUpperCase() === 'GOOGLE')

  async function unlink() {
    if (!password || busy || await requestConfirmation({
      title: 'Gỡ liên kết Google?',
      description: 'Bạn sẽ tiếp tục đăng nhập bằng mật khẩu tài khoản.',
      confirmLabel: 'Gỡ liên kết',
      danger: true,
    }) === null) return
    setBusy(true); setError(''); setNotice('')
    try {
      await unlinkGoogle(password)
      setPassword('')
      await load()
      setNotice('Đã gỡ liên kết Google.')
    } catch (reason) {
      setError(reason instanceof HttpError && reason.status === 401
        ? 'Mật khẩu hiện tại chưa đúng hoặc phiên đăng nhập đã hết hạn.'
        : 'Chưa gỡ được liên kết. Hãy kiểm tra mật khẩu và thử lại.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="profile-workspace workspace-surface !p-0" aria-labelledby="external-logins-title">
      {confirmationDialog}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">link</span>
          <h2 id="external-logins-title" className="font-heading text-sm font-bold text-ink">Tài khoản Google</h2>
        </div>
        {!loading && !error && (
          <StatusBadge tone={hasGoogle ? 'success' : 'neutral'} label={hasGoogle ? 'Đã liên kết' : 'Chưa liên kết'} />
        )}
      </div>

      <div className="p-5">
        <p className="text-sm text-ink-muted">Liên kết Google để có thêm cách đăng nhập. Xác nhận mật khẩu hiện tại trước khi thay đổi.</p>
        {loading ? (
          <p role="status" className="mt-4 text-sm text-ink-muted">Đang tải tài khoản liên kết…</p>
        ) : error ? null : (
          <>
            {logins.length > 0 && (
              <ul className="mt-4 divide-y divide-hairline rounded-xl border border-hairline bg-canvas/50 px-3.5">
                {logins.map(item => (
                  <li key={item.provider} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <strong className="text-ink">{item.provider}</strong>
                    <span className="break-all text-ink-muted">{item.email}</span>
                  </li>
                ))}
              </ul>
            )}
            {!hasGoogle && <p className="mt-3 text-sm text-ink-muted">Chưa liên kết tài khoản Google.</p>}
            <form
              className="auth-form"
              onSubmit={event => {
                event.preventDefault()
                if (hasGoogle) void unlink()
                else if (password) setLinkPassword(password)
              }}
            >
              <label htmlFor="external-current-password">Mật khẩu hiện tại</label>
              <input
                id="external-current-password"
                required
                type="password"
                autoComplete="current-password"
                value={password}
                disabled={busy || linkPassword !== null}
                onChange={e => setPassword(e.target.value)}
              />
              {linkPassword === null ? (
                <div className="pt-2">
                  <Button type="submit" variant={hasGoogle ? 'secondary' : 'primary'} disabled={busy || !password}>
                    {busy ? 'Đang xử lý…' : hasGoogle ? 'Gỡ liên kết Google' : 'Liên kết Google'}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <GoogleLoginButton purpose="LINK" currentPassword={linkPassword} onLinked={linked} />
                  <Button variant="secondary" onClick={() => setLinkPassword(null)}>Hủy liên kết</Button>
                </div>
              )}
            </form>
          </>
        )}
        {error && (
          <p role="alert" className="auth-error">
            {error}
            <button type="button" className="ml-2 font-semibold underline" onClick={() => void load()}>Thử lại</button>
          </p>
        )}
        {notice && <p role="status" className="auth-status">{notice}</p>}
      </div>
    </section>
  )
}
