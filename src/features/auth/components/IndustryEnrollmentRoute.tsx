import { useLayoutEffect, useState } from 'react'
import { GoogleLoginButton } from './GoogleLoginButton'

/** Mail links use #invitation=...; consume in memory and remove before provider scripts load. */
export function IndustryEnrollmentRoute() {
  const [invitationToken] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('invitation') ?? '')
  useLayoutEffect(() => {
    const url = new URL(window.location.href)
    url.hash = ''
    window.history.replaceState(window.history.state, '', url.pathname + url.search)
  }, [])
  return <main className="grid min-h-screen place-items-center bg-canvas p-5 text-ink"><section className="workspace-surface w-full max-w-lg space-y-4 p-6"><h1 className="text-xl font-semibold">Đăng ký chuyên gia doanh nghiệp</h1><p>Tiếp tục bằng đúng tài khoản Google nhận thư mời. Tài khoản chuyên gia chỉ có quyền tư vấn trong phạm vi được chia sẻ.</p>{invitationToken.length === 64 ? <GoogleLoginButton purpose="INDUSTRY_ENROLL" invitationToken={invitationToken} /> : <p role="alert">Liên kết mời không hợp lệ hoặc đã bị tải lại. Hãy mở lại đường dẫn từ thư mời.</p>}</section></main>
}
