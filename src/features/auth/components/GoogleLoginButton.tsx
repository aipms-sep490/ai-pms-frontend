import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HttpError } from '../../../services/http/http-client'
import { getGoogleChallenge, linkGoogle, loginWithGoogle } from '../api/auth-api'
import { useAuthSession } from '../context/useAuthSession'
import { getHomePath } from '../utils/role-access'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; nonce: string; callback: (response: { credential?: string }) => void }) => void
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void
        }
      }
    }
  }
}

let script: Promise<void> | null = null

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (!script) {
    script = new Promise((resolve, reject) => {
      const tag = document.createElement('script')
      tag.src = 'https://accounts.google.com/gsi/client'
      tag.async = true
      const timeout = window.setTimeout(() => { script = null; tag.remove(); reject(new Error('Google Identity timed out.')) }, 15000)
      tag.onload = () => { window.clearTimeout(timeout); resolve() }
      tag.onerror = () => {
        window.clearTimeout(timeout)
        script = null
        tag.remove()
        reject(new Error('Google Identity could not load.'))
      }
      document.head.append(tag)
    })
  }
  return script
}

function errorMessage(error: unknown) {
  if (error instanceof HttpError && error.status === 403) return 'Nguồn truy cập này chưa được phép đăng nhập bằng Google.'
  if (error instanceof HttpError && error.status === 401) return 'Chưa thể đăng nhập bằng tài khoản Google này. Nếu chưa liên kết, hãy đăng nhập bằng mật khẩu và liên kết Google trong hồ sơ tài khoản.'
  if (error instanceof HttpError && error.status === 409) return 'Tài khoản Google này đã được liên kết với tài khoản khác.'
  if (error instanceof HttpError && error.status === 429) return 'Bạn đã thử nhiều lần. Chờ một chút rồi thử lại.'
  return 'Chưa kết nối được với dịch vụ đăng nhập Google. Bạn có thể đăng nhập bằng mật khẩu hoặc thử lại.'
}

export function GoogleLoginButton({ purpose = 'LOGIN', currentPassword = '', onLinked }: { purpose?: 'LOGIN' | 'LINK'; currentPassword?: string; onLinked?: () => void } = {}) {
  const host = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { acceptExternalLogin } = useAuthSession()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    let pending = false
    let expired = false
    let expiryTimer: ReturnType<typeof setTimeout> | undefined
    setLoading(true)
    setError(null)
    setBusy(false)
    host.current?.replaceChildren()
    void (async () => {
      try {
        const challenge = await getGoogleChallenge(purpose)
        if (!active) return
        expiryTimer = setTimeout(() => {
          expired = true
          if (active && !pending) { host.current?.replaceChildren(); setError('Phiên đăng nhập Google đã hết hạn. Chọn Thử lại để tiếp tục.') }
        }, Math.max(0, new Date(challenge.expiresAtUtc).getTime() - Date.now()))
        await loadGoogleScript()
        if (!active || !host.current) return
        if (!window.google) throw new Error('Google Identity did not initialize.')
        host.current.replaceChildren()
        window.google.accounts.id.initialize({
          client_id: challenge.clientId,
          nonce: challenge.nonce,
          callback: async (response) => {
            if (!active || pending || expired) return
            if (!response.credential || (purpose === 'LOGIN' && !acceptExternalLogin)) {
              setError('Không thể hoàn tất đăng nhập Google.')
              return
            }
            try {
              pending = true
              setBusy(true)
              if (purpose === 'LINK') {
                await linkGoogle(challenge.challengeId, response.credential, currentPassword)
                if (active) onLinked?.()
                return
              }
              if (!acceptExternalLogin) return
              const session = await loginWithGoogle(challenge.challengeId, response.credential)
              const completed = await acceptExternalLogin(session)
              if (active) navigate(getHomePath(completed.user), { replace: true })
            } catch (reason) {
              if (active) { expired = true; host.current?.replaceChildren(); setError(errorMessage(reason)) }
            } finally {
              pending = false
              if (active) setBusy(false)
            }
          },
        })
        window.google.accounts.id.renderButton(host.current, { theme: 'outline', size: 'large', width: Math.min(320, host.current.clientWidth || 320), text: purpose === 'LINK' ? 'continue_with' : 'signin_with', locale: 'vi' })
      } catch (reason) {
        if (active) setError(errorMessage(reason))
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false; clearTimeout(expiryTimer) }
  }, [acceptExternalLogin, navigate, attempt, purpose, currentPassword, onLinked])

  return <div className="auth-google">
    <div ref={host} hidden={busy} aria-label={purpose === 'LINK' ? 'Liên kết tài khoản Google' : 'Đăng nhập với Google'} />
    {busy && <p className="auth-google-status" role="status">{purpose === 'LINK' ? 'Đang liên kết tài khoản Google…' : 'Đang xác thực tài khoản Google…'}</p>}
    {loading && <p className="auth-google-status" role="status">Đang tải đăng nhập Google…</p>}
    {error && <div className="auth-google-fallback"><p className="auth-error" role="status">{error}</p><button type="button" onClick={() => setAttempt((value) => value + 1)}>Thử lại</button></div>}
  </div>
}
