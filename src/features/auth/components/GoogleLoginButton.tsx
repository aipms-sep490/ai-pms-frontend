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
  if (window.google) return Promise.resolve()
  if (!script) {
    script = new Promise((resolve, reject) => {
      const tag = document.createElement('script')
      tag.src = 'https://accounts.google.com/gsi/client'
      tag.async = true
      tag.onload = () => resolve()
      tag.onerror = () => {
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
  if (error instanceof HttpError && error.status === 401) return 'Không thể xác thực tài khoản Google.'
  return 'Đăng nhập Google tạm thời không khả dụng.'
}

export function GoogleLoginButton({ purpose = 'LOGIN', currentPassword = '', onLinked }: { purpose?: 'LOGIN' | 'LINK'; currentPassword?: string; onLinked?: () => void } = {}) {
  const host = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { acceptExternalLogin } = useAuthSession()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    let pending = false
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const challenge = await getGoogleChallenge(purpose)
        await loadGoogleScript()
        if (!active || !host.current) return
        if (!window.google) throw new Error('Google Identity did not initialize.')
        host.current.replaceChildren()
        window.google.accounts.id.initialize({
          client_id: challenge.clientId,
          nonce: challenge.nonce,
          callback: async (response) => {
            if (!active || pending) return
            if (!response.credential || (purpose === 'LOGIN' && !acceptExternalLogin)) {
              setError('Không thể hoàn tất đăng nhập Google.')
              return
            }
            try {
              pending = true
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
              if (active) setError(errorMessage(reason))
            } finally {
              pending = false
            }
          },
        })
        window.google.accounts.id.renderButton(host.current, { theme: 'outline', size: 'large', width: 320, text: 'signin_with' })
      } catch (reason) {
        if (active) setError(errorMessage(reason))
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [acceptExternalLogin, navigate, attempt, purpose, currentPassword, onLinked])

  return <div className="auth-google">
    <div ref={host} aria-label={purpose === 'LINK' ? 'Liên kết tài khoản Google' : 'Đăng nhập với Google'} />
    {loading && <p className="auth-google-status" role="status">Đang tải đăng nhập Google…</p>}
    {error && <div className="auth-google-fallback"><p className="auth-error" role="status">{error}</p><button type="button" onClick={() => setAttempt((value) => value + 1)}>Thử lại</button></div>}
  </div>
}
