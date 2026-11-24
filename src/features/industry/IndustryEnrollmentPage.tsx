import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HttpError } from '../../services/http/http-client'
import {
  enrollIndustryGoogle,
  getIndustryGoogleChallenge,
  type GoogleChallenge,
} from './industry-api'

export function IndustryEnrollmentPage() {
  const navigate = useNavigate()
  const invitationTokenRef = useRef<string | null>(null)

  const [hasToken, setHasToken] = useState(false)
  const [challenge, setChallenge] = useState<GoogleChallenge | null>(null)
  const [loadingChallenge, setLoadingChallenge] = useState(true)
  const [googleIdToken, setGoogleIdToken] = useState('')
  const [enrolling, setEnrolling] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    // Extract #invitation={token} from URL fragment
    const hash = window.location.hash || ''
    const match = hash.match(/#invitation=([A-Za-z0-9_-]+)/)
    if (match && match[1]) {
      invitationTokenRef.current = match[1]
      setHasToken(true)
      // SECURITY: Strip token immediately from history & URL without logging or writing to localStorage
      try {
        const cleanUrl = window.location.pathname + window.location.search
        window.history.replaceState(null, '', cleanUrl)
      } catch {
        // Fallback
      }
    } else {
      setHasToken(false)
    }

    // Load Google Challenge
    const controller = new AbortController()
    setLoadingChallenge(true)
    getIndustryGoogleChallenge(controller.signal)
      .then((c) => {
        if (!controller.signal.aborted) setChallenge(c)
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('Không thể kết nối đến máy chủ xác thực Google.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingChallenge(false)
      })

    return () => controller.abort()
  }, [])

  async function handleEnroll() {
    const invToken = invitationTokenRef.current
    if (!invToken || !challenge || !googleIdToken.trim()) return

    setEnrolling(true)
    setError('')
    setSuccess('')
    try {
      const res = await enrollIndustryGoogle({
        challengeId: challenge.challengeId,
        idToken: googleIdToken.trim(),
        invitationToken: invToken,
      })

      setSuccess(`Kích hoạt tài khoản chuyên gia thành công cho ${res.user.email}! Đang chuyển hướng…`)
      setTimeout(() => {
        navigate('/industry/assignments')
      }, 1200)
    } catch (err) {
      if (err instanceof HttpError) {
        if (err.status === 401) {
          setError('Thư mời hoặc tài khoản Google không hợp lệ. Vui lòng kiểm tra lại email đăng nhập.')
        } else if (err.status === 409) {
          setError('Thư mời đã được sử dụng hoặc tài khoản đã được kích hoạt trước đó.')
        } else {
          setError(err.message || 'Không thể kích hoạt tài khoản chuyên gia.')
        }
      } else {
        setError('Có lỗi xảy ra khi kích hoạt tài khoản. Hãy thử lại.')
      }
    } finally {
      setEnrolling(false)
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-hairline bg-card shadow-sm">
        <header className="bg-canvas/70 border-b border-hairline px-6 py-6 text-center space-y-2.5">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-primary/20 bg-primary-subtle text-primary">
            <span className="material-symbols-outlined text-2xl" aria-hidden="true">verified_user</span>
          </div>
          <div className="flex justify-center">
            <span className="workspace-kicker">Cố vấn doanh nghiệp</span>
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-ink">
            Kích hoạt tài khoản Cố vấn Doanh nghiệp
          </h1>
          <p className="mx-auto max-w-md text-sm leading-6 text-ink-muted">
            Xác thực tài khoản chuyên gia thông qua Google để bắt đầu tham gia cố vấn đồ án.
          </p>
        </header>

        <div className="p-6 space-y-5">
          {!hasToken && (
            <div role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-4 text-xs leading-relaxed text-status-error-text">
              <strong>Không tìm thấy mã thư mời:</strong> Vui lòng truy cập lại liên kết từ email thư mời mà bạn đã nhận được (đường dẫn chứa mã thư mời).
            </div>
          )}

          {hasToken && (
            <div className="space-y-4">
              <div className="rounded-xl border border-primary/20 bg-primary-subtle p-3.5 text-xs leading-relaxed text-primary">
                ✓ Đã nhận diện mã thư mời bảo mật. Hãy đăng nhập tài khoản Google của bạn để hoàn tất kích hoạt.
              </div>

              {loadingChallenge && (
                <p role="status" className="py-2 text-center text-xs text-ink-muted">Đang khởi tạo kết nối an toàn…</p>
              )}

              {!loadingChallenge && challenge && (
                <div className="space-y-3.5">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                    Mã xác thực Google (Google ID Token)
                    <textarea
                      className="mt-1.5 block w-full rounded-lg border border-line-strong bg-card p-3 font-mono text-xs font-normal normal-case tracking-normal text-ink focus:border-primary focus:outline-none"
                      rows={4}
                      placeholder="Dán Google ID Token tại đây hoặc đăng nhập qua Google button…"
                      value={googleIdToken}
                      disabled={enrolling}
                      onChange={(e) => setGoogleIdToken(e.target.value)}
                    />
                  </label>

                  {error && <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-xs text-status-error-text">{error}</p>}
                  {success && <p role="status" className="rounded-lg border border-status-success-border bg-status-success-bg p-3 text-xs text-status-success-text">{success}</p>}

                  <button
                    type="button"
                    className="min-h-11 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    disabled={enrolling || !googleIdToken.trim()}
                    onClick={() => void handleEnroll()}
                  >
                    {enrolling ? 'Đang kích hoạt tài khoản…' : 'Kích hoạt tài khoản Chuyên gia'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
