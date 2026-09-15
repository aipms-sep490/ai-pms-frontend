import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuthSession } from '../context/useAuthSession'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation()
  const { status, restoreSession } = useAuthSession()

  if (status === 'restoring' || status === 'refreshing') {
    return (
      <main className="min-h-screen grid place-items-center bg-canvas text-slate-600" aria-live="polite">
        Đang khôi phục phiên đăng nhập…
      </main>
    )
  }

  if (status === 'auth_error') {
    return (
      <main className="min-h-screen grid place-items-center bg-canvas p-6 text-center">
        <div>
          <p className="text-slate-700">Không thể xác minh phiên đăng nhập hiện tại.</p>
          <button type="button" className="mt-3 text-blue-700 underline" onClick={() => void restoreSession()}>
            Thử lại
          </button>
        </div>
      </main>
    )
  }

  if (status !== 'authenticated') {
    const from = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to="/login" replace state={{ from }} />
  }

  return <>{children}</>
}
