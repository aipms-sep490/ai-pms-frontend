import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'

/** Navigation discovers existing resource pages; each endpoint still authorizes access. */
export function DepartmentProjectLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const match = /^\/department\/projects\/(?:review\/)?([1-9]\d*)(?:\/|$)/.exec(pathname)
  const projectId = match?.[1]
  const links = projectId ? [
    ['Thẩm định', `/department/projects/review/${projectId}`],
    ['Điều phối và hướng dẫn', `/department/projects/${projectId}/governance`],
    ['Phương án đánh giá', `/department/projects/${projectId}/evaluation-schemes`],
    ['Phân công người chấm', `/department/projects/${projectId}/evaluators`],
    ['Yêu cầu bàn giao', `/department/projects/${projectId}/final-requirements`],
    ['Hồ sơ bàn giao', `/department/projects/${projectId}/final-submission`],
    ['Kết quả', `/department/projects/${projectId}/result`],
    ['Kho tệp', `/department/projects/${projectId}/files`],
    ['Đóng góp', `/department/projects/${projectId}/contributions`],
  ] : []
  const currentPath = pathname.replace(/\/evaluations$/, '/evaluators')
  const selected = links.find(([, to]) => to === currentPath)?.[1] ?? ''
  return <>{projectId && <nav aria-label="Các nghiệp vụ của đồ án" className="mb-5 space-y-2 rounded-lg border border-hairline bg-card p-3">
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="font-semibold text-slate-700">Đồ án #{projectId}</span><Link to="/department/portfolio" className="inline-flex min-h-11 items-center font-semibold text-primary underline">Danh mục đồ án</Link></div>
    <label className="block space-y-2 md:hidden"><span className="text-sm font-semibold text-slate-700">Chọn nghiệp vụ của đồ án</span><select className="min-h-11 w-full rounded-lg border border-hairline bg-card px-3 text-sm text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" value={selected} onChange={event => navigate(event.target.value)}><option value="" disabled>Chọn nghiệp vụ</option>{links.map(([title, to]) => <option key={to} value={to}>{title}</option>)}</select></label>
    <div className="hidden flex-wrap gap-2 md:flex">{links.map(([title, to]) => <NavLink key={to} to={to} end className={({ isActive }) => `inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${isActive ? 'bg-primary-subtle text-primary' : 'text-slate-600 hover:bg-primary-subtle'}`}>{title}</NavLink>)}</div>
  </nav>}<Outlet /></>
}
