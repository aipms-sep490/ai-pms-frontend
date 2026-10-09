import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { projectEvaluationPaths } from './project-evaluation-paths'

export function AdminEvaluationLayout() {
  const { projectId = '' } = useParams()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const paths = projectEvaluationPaths(projectId, pathname)
  const links = [['Hồ sơ bàn giao', paths.submission], ['Phương án đánh giá', paths.scheme], ['Phân công người chấm', paths.evaluators], ['Kết quả', paths.result]]
  return <><nav aria-label="Các nghiệp vụ đánh giá của đồ án" className="mb-5 space-y-2 rounded-lg border border-hairline bg-card p-3">
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="font-semibold">Đồ án #{projectId}</span><Link className="inline-flex min-h-11 items-center font-semibold text-primary underline" to={paths.portfolio}>Danh mục đồ án</Link></div>
    <label className="block space-y-2 md:hidden"><span className="text-sm font-semibold">Chọn nghiệp vụ đánh giá</span><select className="min-h-11 w-full rounded-lg border border-hairline bg-card px-3 text-sm" value={pathname} onChange={event => navigate(event.target.value)}>{links.map(([title, to]) => <option key={to} value={to}>{title}</option>)}</select></label>
    <div className="hidden flex-wrap gap-2 md:flex">{links.map(([title, to]) => <NavLink key={to} to={to} end className={({ isActive }) => `inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${isActive ? 'bg-primary-subtle text-primary' : 'text-slate-600 hover:bg-primary-subtle'}`}>{title}</NavLink>)}</div>
  </nav><Outlet key={projectId} /></>
}
