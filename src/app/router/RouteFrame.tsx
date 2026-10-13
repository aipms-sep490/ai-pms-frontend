import { Suspense, useLayoutEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { getBreadcrumbForPath } from './routes.config'
import { PageLoading } from '../../components/ui/PageLoading'

export function RouteFrame() {
  const { pathname } = useLocation()
  useLayoutEffect(() => { document.title = `${getBreadcrumbForPath(pathname)} · AI-PMS` }, [pathname])
  return <Suspense fallback={<PageLoading fullPage label="Đang tải trang…" />}><Outlet /></Suspense>
}
