import { Link } from 'react-router-dom'
import { useAuthSession } from '../../features/auth/context/useAuthSession'
import { getHomePath } from '../../features/auth/utils/role-access'

export function NotFoundPage() {
  const { session } = useAuthSession()
  return (
    <section className="empty-page flex flex-col items-center justify-center text-center py-16 px-4">
      <p className="eyebrow text-blue-600 font-mono text-xs font-bold uppercase tracking-widest">404 • Không tìm thấy trang</p>
      <h1 className="font-heading text-3xl md:text-4xl font-bold text-slate-900 mt-2 mb-3">
        Đường dẫn không tồn tại
      </h1>
      <p className="text-slate-500 max-w-md mb-6 text-sm">
        Trang này không tồn tại hoặc đã được chuyển đến địa chỉ khác.
      </p>
      <Link to={getHomePath(session?.user)} className="ex-button">
        <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
        Về trang chính
      </Link>
    </section>
  )
}
