import { useContext, useEffect, useState, type RefObject } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getBreadcrumbForPath } from '../router/routes.config'
import { useAcademicWorkflow } from '../context/useAcademicWorkflow'
import { StudentJourneyContext } from '../context/StudentJourneyContext'
import { getWorkspaceRole } from '../../features/auth/utils/role-access'
import { useAuthSession } from '../../features/auth/context/useAuthSession'
import { getUnreadCount } from '../../features/notifications/notifications-api'

interface TopHeaderProps {
  onToggleMobileMenu: () => void
  isMobileMenuOpen: boolean
  triggerRef?: RefObject<HTMLButtonElement | null>
}

export function TopHeader({
  onToggleMobileMenu,
  isMobileMenuOpen,
  triggerRef,
}: TopHeaderProps) {
  const location = useLocation()
  const { academic } = useAcademicWorkflow()
  const journey = useContext(StudentJourneyContext)
  const selectedSemester = academic?.selectedSemester
  const { session } = useAuthSession()
  const [unreadCount, setUnreadCount] = useState<number | null>(null)
  useEffect(() => {
    if (!session) return
    let active = true
    const refresh = () => {
      void getUnreadCount()
        .then(count => { if (active) setUnreadCount(count) })
        .catch(() => { if (active) setUnreadCount(null) })
    }
    refresh()
    window.addEventListener('ai-pms:notifications-changed', refresh)
    return () => { active = false; window.removeEventListener('ai-pms:notifications-changed', refresh) }
  }, [session])
  const role = getWorkspaceRole(session?.user)
  const pendingStudent = role === 'student' && Boolean(journey?.isLoading || journey?.error)
  const semesterLabel = role === 'student' ? journey?.semester?.name || 'Học kỳ chưa xác định' : role === 'lecturer' ? 'Giảng viên' : role === 'department' ? 'Bộ môn' : role === 'admin' ? 'Quản trị' : 'Tài khoản'
  const teamLabel = role === 'student' ? journey?.team?.code || journey?.team?.name || 'Chưa có nhóm' : session?.user.fullName || 'Tài khoản'
  const stateLabel = {
    NO_TEAM: 'Chưa có nhóm',
    TEAM_FORMING: 'Đang kiện toàn',
    TEAM_ELIGIBLE: 'Sẵn sàng đăng ký',
    PROJECT_PENDING: 'Đang thẩm định',
    REVISION_REQUIRED: 'Cần chỉnh sửa',
    PROJECT_REJECTED: 'Không được chấp thuận',
    SUPERVISOR_PENDING: 'Đang ghép GVHD',
    ACTIVE: 'Đang thực hiện',
    FINAL_SUBMISSION: 'Đang bàn giao',
    COMPLETED: 'Đã hoàn thành',
  }[journey?.journeyState ?? 'NO_TEAM']

  return (
    <header className="app-top-header sticky top-0 h-12 bg-white border-b border-hairline z-30 px-3 sm:px-4 md:px-6 flex items-center justify-between">
      {/* Left: Mobile hamburger & Breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          ref={triggerRef}
          type="button"
          onClick={onToggleMobileMenu}
          aria-label={isMobileMenuOpen ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'}
          aria-expanded={isMobileMenuOpen}
          aria-controls="main-sidebar"
          className="lg:hidden min-w-[44px] min-h-[44px] -ml-2 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[22px] shrink-0" aria-hidden="true">
            {isMobileMenuOpen ? 'close' : 'menu'}
          </span>
        </button>

        <nav
          aria-label="Đường dẫn điều hướng breadcrumb"
          className="flex items-center gap-1.5 sm:gap-2 text-xs text-slate-500 font-sans truncate"
        >
          <span className="font-semibold text-slate-800 shrink-0">{selectedSemester?.code ?? 'AI-PMS'}</span>
          <span aria-hidden="true" className="text-slate-300 shrink-0">/</span>
          <span className="text-slate-600 font-medium hidden sm:inline shrink-0">{pendingStudent ? <span className="app-context-skeleton" aria-hidden="true" /> : teamLabel}</span>
          <span aria-hidden="true" className="hidden sm:inline text-slate-300 shrink-0">/</span>
          <span className="font-mono text-primary font-semibold truncate max-w-[200px] sm:max-w-xs md:max-w-none">
            {getBreadcrumbForPath(location.pathname)}
          </span>
        </nav>
      </div>

      {/* Right: Controls & Badges */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {selectedSemester && role === 'student' && !pendingStudent ? (
          <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-subtle text-primary border border-hairline text-[11px] font-mono font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />
            {selectedSemester.name} • {stateLabel}
          </span>
        ) : null}
        {role !== 'student' ? <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-subtle text-primary border border-hairline text-[11px] font-mono font-medium"><span className="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />{semesterLabel}</span> : null}
        <Link
          to="/notifications"
          aria-label={unreadCount === null ? 'Thông báo học vụ' : `Thông báo học vụ, ${unreadCount} chưa đọc`}
          className="relative flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <span className="material-symbols-outlined text-[20px] shrink-0" aria-hidden="true">notifications</span>
          {unreadCount !== null && unreadCount > 0 && <span aria-hidden="true" className="absolute right-0 top-0 rounded-full bg-rose-600 px-1.5 text-[10px] font-bold text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>}
        </Link>
        <span className="sr-only" role="status" aria-atomic="true">{unreadCount === null ? '' : unreadCount === 0 ? 'Không có thông báo chưa đọc.' : `${unreadCount} thông báo chưa đọc.`}</span>
      </div>
    </header>
  )
}
