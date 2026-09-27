import { useLayoutEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { getBreadcrumbForPath } from './routes.config'

export function RouteFrame() {
  const { pathname } = useLocation()
  useLayoutEffect(() => { document.title = `${getBreadcrumbForPath(pathname)} · AI-PMS` }, [pathname])
  return <Outlet />
}
