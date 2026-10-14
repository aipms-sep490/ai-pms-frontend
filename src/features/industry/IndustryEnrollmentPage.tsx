import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HttpError } from '../../services/http/http-client'
import { useAuthSession } from '../auth/context/useAuthSession'
import { getHomePath } from '../auth/utils/role-access'
import { loadGoogleScript } from '../auth/utils/google-identity'
import { enrollIndustryGoogle, getIndustryGoogleChallenge } from './industry-api'
import '../auth/pages/auth-pages.css'

/**
 * The invitation secret travels in the URL fragment (`#invitation=...`), never a query string —
 * fragments are not sent to any server, so it cannot leak through request logs or a Referer header
 * (AIPMS.Infrastructure/Services/Projects/IndustryInvitationEmail.cs). Read it once, then clear the
 * fragment immediately so it doesn't linger in browser history.
 */
function readInvitationToken(): string | null {
  const match = /(?:^|[#&])invitation=([^&]+)/.exec(window.location.hash)
  const token = match ? decodeURIComponent(match[1]) : null
  if (window.location.hash) window.history.replaceState(null, '', window.location.pathname + window.location.search)
  return token && token.length === 64 ? token : null
}

function errorMessage(error: unknown): string {
  if (error instanceof HttpError) {
    if (error.status === 401) return 'Lời mời không hợp lệ, đã hết hạn hoặc đã được sử dụng. Liên hệ quản trị viên để được mời lại.'
    if (error.status === 403) return 'Nguồn truy cập này chưa được phép kích hoạt tài khoản.'
    if (error.status === 409) return 'Tài khoản Google này đã được liên kết với một tài khoản khác trên hệ thống.'
    if (error.status === 503) return 'Hệ thống chưa cấu hình kích hoạt chuyên gia. Liên hệ quản trị viên.'
  }
  return 'Chưa kích hoạt được tài khoản. Hãy thử lại.'
}

/**
 * Industry expert enrollment (AIPMS.Api/Controllers/IndustryEnrollmentController.cs). Public route
 * reached only via the one-time emailed invitation link. On success the expert is signed in with a
 * zero-role session — no academic role or scoring authority is granted by this flow.
 */
export function IndustryEnrollmentPage() {
  const navigate = useNavigate()
  const { acceptExternalLogin } = useAuthSession()
  const host = useRef<HTMLDivElement>(null)
  const [invitationToken] = useState(readInvitationToken)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!invitationToken) {
      setError('Liên kết lời mời không hợp lệ hoặc đã bị xoá. Hãy mở lại email mời để lấy liên kết mới.')
      setLoading(false)
      return
    }
    let active = true
    let pending = false
    let expired = false
    let expiryTimer: ReturnType<typeof setTimeout> | undefined
    setLoading(true); setError(null); setBusy(false)
    host.current?.replaceChildren()
    void (async () => {
      try {
        const challenge = await getIndustryGoogleChallenge()
        if (!active) return
        expiryTimer = setTimeout(() => {
          expired = true
          if (active && !pending) { host.current?.replaceChildren(); setError('Phiên kích hoạt đã hết hạn. Chọn Thử lại để tiếp tục.') }
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
            if (!response.credential || !acceptExternalLogin) { setError('Không thể hoàn tất kích hoạt tài khoản.'); return }
            try {
              pending = true; setBusy(true)
              const session = await enrollIndustryGoogle(challenge.challengeId, response.credential, invitationToken)
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
        window.google.accounts.id.renderButton(host.current, { theme: 'outline', size: 'large', width: Math.min(320, host.current.clientWidth || 320), text: 'signin_with', locale: 'vi' })
      } catch (reason) {
        if (active) setError(errorMessage(reason))
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false; clearTimeout(expiryTimer) }
  }, [acceptExternalLogin, navigate, invitationToken, attempt])

  return <main className="login-page">
    <div className="login-form-side"><section className="login-form-panel" aria-labelledby="industry-enroll-title">
      <h1 className="auth-login-title" id="industry-enroll-title">Kích hoạt tài khoản cố vấn</h1>
      <p className="login-description">Đăng nhập bằng đúng tài khoản Google đã nhận lời mời để kích hoạt vai trò cố vấn doanh nghiệp. Vai trò này chỉ mang tính tư vấn — không có quyền học thuật, không chấm điểm.</p>
      <div ref={host} hidden={busy || loading || Boolean(error)} aria-label="Đăng nhập với Google để kích hoạt" />
      {loading && <p className="auth-google-status" role="status">Đang chuẩn bị kích hoạt…</p>}
      {busy && <p className="auth-google-status" role="status">Đang xác thực tài khoản Google…</p>}
      {error && <div className="auth-google-fallback"><p className="auth-error" role="alert">{error}</p>{invitationToken && <button type="button" onClick={() => setAttempt(value => value + 1)}>Thử lại</button>}</div>}
    </section></div>
  </main>
}
