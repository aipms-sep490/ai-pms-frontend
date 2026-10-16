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
      // Save token if token storage helper exists or let caller redirect
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
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-hairline bg-card p-6 shadow-sm">
        <div className="space-y-1 text-center">
          <h1 className="font-heading text-xl font-bold text-ink">Kích hoạt tài khoản Cố vấn Doanh nghiệp</h1>
          <p className="text-xs text-ink-muted">
            Xác thực tài khoản chuyên gia thông qua Google để bắt đầu tham gia cố vấn đồ án.
          </p>
        </div>

        {!hasToken && (
          <div role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-4 text-xs text-status-error-text">
            <strong>Không tìm thấy mã thư mời:</strong> Vui lòng truy cập lại liên kết từ email thư mời mà bạn đã nhận được (đường dẫn chứa mã thư mời).
          </div>
        )}

        {hasToken && (
          <div className="space-y-4">
            <div className="rounded-lg border border-primary/20 bg-primary-subtle p-3 text-xs text-primary">
              ✓ Đã nhận diện mã thư mời bảo mật. Hãy đăng nhập tài khoản Google của bạn để hoàn tất kích hoạt.
            </div>

            {loadingChallenge && (
              <p className="text-xs text-ink-muted text-center">Đang khởi tạo kết nối an toàn…</p>
            )}

            {!loadingChallenge && challenge && (
              <div className="space-y-3">
                <label className="block text-xs text-ink-soft">
                  Mã xác thực Google (Google ID Token)
                  <textarea
                    className="mt-1 block w-full rounded-lg border border-hairline p-2 text-xs font-mono"
                    rows={4}
                    placeholder="Dán Google ID Token tại đây hoặc đăng nhập qua Google button…"
                    value={googleIdToken}
                    disabled={enrolling}
                    onChange={(e) => setGoogleIdToken(e.target.value)}
                  />
                </label>

                {error && <p role="alert" className="text-xs text-status-error-text">{error}</p>}
                {success && <p role="status" className="text-xs text-status-success-text">{success}</p>}

                <button
                  type="button"
                  className="w-full rounded-lg bg-primary py-2.5 text-xs font-semibold text-white disabled:opacity-50"
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
  )
}
