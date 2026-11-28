import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { env } from '../../app/config/env'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useExecutionAccess } from './context/ExecutionAccessContext'
import './project-section-navigation.css'

/** Mounted only after the route has verified the persisted project assignment. */
export function ProjectSectionNavigation() {
  const access = useExecutionAccess()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  // Keep the video room focused on the call; its own return control remains available.
  if (pathname.endsWith('/video')) return null

  const sections: [string, string][] = access.actor === 'mentor'
    ? [
        ['workspace', 'Tổng quan'],
        ['tasks', 'Công việc'],
        ['reports', 'Báo cáo'],
        ['meetings', 'Lịch họp'],
        ['evidence', 'Minh chứng'],
        ['mentor-notes', 'Nhận xét quá trình (G1–G3)'],
        ...(env.gatesEnabled ? [['checkpoints', 'Mốc kiểm soát'] as [string, string]] : []),
      ]
    : [
        ['workspace', 'Tổng quan'],
        ['progress', 'Tiến độ'],
        ['review-gates', 'Cổng kiểm duyệt'],
        ['individual-process', 'Điểm quá trình 20% (G1–G3)'],
        ['tasks', 'Công việc'],
        ['milestones', 'Mốc đồ án'],
        ['gantt', 'Lịch thực hiện'],
        ['reports', 'Báo cáo'],
        ['meetings', 'Lịch họp'],
        ['deliverables', 'Hạng mục cần nộp'],
        ['files', 'Tệp'],
        ['contributions', 'Đóng góp'],
        ['evidence', 'Minh chứng'],
        ...(env.weeklyAssessmentEnabled ? [['weekly-assessments', 'Nhận xét tuần (Tham khảo)'] as [string, string]] : []),
        ...(env.gatesEnabled ? [['checkpoints', 'Mốc kiểm soát'] as [string, string]] : []),
        ...(env.aiAdvisoryEnabled || env.aiProgressRiskEnabled ? [['ai', 'Trợ lý AI'] as [string, string]] : []),
        ['final-submission', 'Bàn giao'],
        ...(env.defenseScheduleEnabled ? [['defense', 'Bảo vệ'] as [string, string]] : []),
      ]

  const mentorMajorName = access.actor === 'mentor' && access.supervisor?.majorId
    ? `${access.project.majors?.find(m => m.majorId === access.supervisor?.majorId)?.majorName ?? 'Hướng dẫn chuyên ngành'} · Phạm vi: Ngành phụ trách + Chung/Tích hợp`
    : null

  return (
    <section className="project-section-navigation">
      <div className="project-section-context">
        <Link to={access.actor === 'mentor' ? '/mentor/workspace' : '/supervisor/workspace'}>
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_back</span>
          Danh sách đồ án
        </Link>
        <span title={access.project.title}>
          {access.project.code || access.project.title}{mentorMajorName ? ` · ${mentorMajorName}` : ''}
        </span>
        {access.readOnly && <StatusBadge tone="neutral" label="Chế độ chỉ xem" />}
      </div>
      {access.readOnly && <p role="status" className="ex-notice">Đồ án đang ở chế độ chỉ xem. Các thao tác chỉnh sửa không còn khả dụng.</p>}
      <select
        className="project-section-mobile"
        aria-label="Khu vực đồ án"
        value={sections.find(([path]) => pathname === `${access.routeBase}/${path}` || pathname.startsWith(`${access.routeBase}/${path}/`))?.[0] ?? 'workspace'}
        onChange={event => navigate(`${access.routeBase}/${event.target.value}`)}
      >
        {sections.map(([path, label]) => <option key={path} value={path}>{label}</option>)}
      </select>
      <nav aria-label="Chuyển khu vực trong đồ án">
        {sections.map(([path, label]) => <NavLink key={path} to={`${access.routeBase}/${path}`}>{label}</NavLink>)}
      </nav>
    </section>
  )
}
