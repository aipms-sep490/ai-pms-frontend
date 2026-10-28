import { Suspense, useLayoutEffect } from 'react'
import { isRouteErrorResponse, Link, Outlet, useLocation, useRouteError } from 'react-router-dom'
import { getBreadcrumbForPath } from './routes.config'
import { PageLoading } from '../../components/ui/PageLoading'

export function RouteFrame() {
  const { pathname } = useLocation()
  useLayoutEffect(() => { document.title = `${getBreadcrumbForPath(pathname)} · AIPMS` }, [pathname])
  return <Suspense fallback={<PageLoading fullPage label="Đang tải trang…" />}><Outlet /></Suspense>
}

export function RouteErrorBoundary() {
  const error = useRouteError()
  const status = isRouteErrorResponse(error) ? error.status : null
  return (
    <div className="min-h-screen bg-canvas text-ink flex items-center justify-center p-6 font-sans">
      <section role="alert" className="w-full max-w-lg rounded-2xl border border-hairline bg-card p-6 sm:p-8 shadow-sm space-y-4">
        <span role="img" aria-label="AIPMS" className="aipms-brand-logo" />
        <div className="space-y-2">
          <span className="inline-block rounded-md bg-status-error-bg px-2.5 py-1 text-xs font-semibold text-status-error-text">
            {status ? `Mã trạng thái ${status}` : 'Gián đoạn hiển thị'}
          </span>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-ink">
            Chưa thể hiển thị màn hình này
          </h1>
          <p className="text-sm leading-6 text-ink-muted">
            Trang gặp sự cố khi tải dữ liệu hoặc phiên bản giao diện vừa được cập nhật. Bạn có thể tải lại trang hoặc quay về trang chủ để tiếp tục công việc.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">refresh</span>
            <span>Tải lại trang</span>
          </button>
          <Link to="/" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-hairline bg-card px-4 text-xs font-semibold text-ink hover:border-primary hover:bg-primary-subtle hover:text-primary transition-colors">
            Về trang chủ
          </Link>
        </div>
      </section>
    </div>
  )
}
