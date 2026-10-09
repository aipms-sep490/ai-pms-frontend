import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useExecutionAccess } from './context/ExecutionAccessContext'
import './project-section-navigation.css'

/** Mounted only after the route has verified the persisted project assignment. */
export function ProjectSectionNavigation() {
  const access = useExecutionAccess()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  // Keep the video room focused on the call; its own return control remains available.
  if (pathname.endsWith('/video')) return null
  const sections = access.actor === 'mentor'
    ? [['workspace', 'Tổng quan'], ['tasks', 'Công việc'], ['reports', 'Báo cáo'], ['meetings', 'Lịch họp'], ['evidence', 'Minh chứng']]
    : [['workspace', 'Tổng quan'], ['tasks', 'Công việc'], ['milestones', 'Mốc đồ án'], ['gantt', 'Lịch thực hiện'], ['reports', 'Báo cáo'], ['meetings', 'Lịch họp'], ['deliverables', 'Hạng mục cần nộp'], ['files', 'Tệp'], ['contributions', 'Đóng góp'], ['evidence', 'Minh chứng'], ['final-submission', 'Bàn giao']]
  return <section className="project-section-navigation">
    <div className="project-section-context"><Link to={access.actor === 'mentor' ? '/mentor/workspace' : '/supervisor/workspace'}>Danh sách đồ án</Link><span title={access.project.title}>{access.project.code || access.project.title}{access.actor === 'mentor' ? ` · Chuyên ngành #${access.supervisor?.majorId}` : ''}</span></div>
    <select className="project-section-mobile" aria-label="Khu vực đồ án" value={sections.find(([path]) => pathname === `${access.routeBase}/${path}` || pathname.startsWith(`${access.routeBase}/${path}/`))?.[0] ?? 'workspace'} onChange={event => navigate(`${access.routeBase}/${event.target.value}`)}>{sections.map(([path, label]) => <option key={path} value={path}>{label}</option>)}</select>
    <nav aria-label="Chuyển khu vực trong đồ án">{sections.map(([path, label]) => <NavLink key={path} to={`${access.routeBase}/${path}`}>{label}</NavLink>)}</nav>
  </section>
}
