import { useContext, type RefObject } from 'react'
import { useLocation } from 'react-router-dom'
import { getBreadcrumbForPath } from '../router/routes.config'
import { useAcademicWorkflow } from '../context/useAcademicWorkflow'
import { StudentJourneyContext } from '../context/StudentJourneyContext'
import { getWorkspaceRole } from '../../features/auth/utils/role-access'
import { useAuthSession } from '../../features/auth/context/useAuthSession'

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
  const openPeriod = academic?.periods.find((period) => period.isOpen)
  const { session } = useAuthSession()
  const role = getWorkspaceRole(session?.user)
  const semesterLabel = role === 'student' ? journey?.semester?.name || 'Học kỳ chưa xác định' : role === 'lecturer' ? 'Giảng viên' : role === 'department' ? 'Bộ môn' : role === 'admin' ? 'Quản trị' : 'Tài khoản'
  const teamLabel = role === 'student' ? journey?.team?.code || journey?.team?.name || 'Chưa có nhóm' : session?.user.fullName || 'Tài khoản'
  const stateLabel = {
    NO_TEAM: 'Chưa có nhóm',
    TEAM_FORMING: 'Đang kiện toàn',
    TEAM_ELIGIBLE: 'Sẵn sàng đăng ký',
    PROJECT_PENDING: 'Đang thẩm định',
    REVISION_REQUIRED: 'Cần chỉnh sửa',
    SUPERVISOR_PENDING: 'Đang ghép GVHD',
    ACTIVE: 'Đang thực hiện',
    FINAL_SUBMISSION: 'Đang bàn giao',
    COMPLETED: 'Đã hoàn thành',
  }[journey?.journeyState ?? 'NO_TEAM']

  return (
    <header className="sticky top-0 h-12 bg-white/95 backdrop-blur-md border-b border-hairline z-30 px-3 sm:px-4 md:px-6 flex items-center justify-between">
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
          <span className="text-slate-600 font-medium hidden sm:inline shrink-0">{teamLabel}</span>
          <span aria-hidden="true" className="hidden sm:inline text-slate-300 shrink-0">/</span>
          <span className="font-mono text-primary font-semibold truncate max-w-[200px] sm:max-w-xs md:max-w-none">
            {getBreadcrumbForPath(location.pathname)}
          </span>
        </nav>
      </div>

      {/* Right: Controls & Badges */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Command Search (Linear style - honest disabled preview, no fake shortcut) */}
        <button
          type="button"
          disabled
          aria-label="Tìm kiếm toàn hệ thống (Chức năng sắp có)"
          title="Tìm kiếm toàn hệ thống (Chức năng sắp có)"
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-md border border-hairline text-slate-400 text-xs cursor-not-allowed opacity-80"
        >
          <span className="material-symbols-outlined text-[15px] shrink-0" aria-hidden="true">
            search
          </span>
          <span className="text-slate-500 font-medium">Tìm kiếm (Sắp có)</span>
        </button>

        {selectedSemester && role === 'student' ? (
          <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-subtle text-primary border border-hairline text-[11px] font-mono font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />
            {selectedSemester.name} • {openPeriod?.name ?? stateLabel}
          </span>
        ) : null}
        {role !== 'student' ? <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-subtle text-primary border border-hairline text-[11px] font-mono font-medium"><span className="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />{semesterLabel}</span> : null}

        {/* Notification Bell (Honest disabled state with tooltip) */}
        <button
          type="button"
          disabled
          aria-label="Thông báo học vụ (Chức năng sắp có)"
          title="Thông báo học vụ (Chức năng sắp có)"
          className="min-w-[44px] min-h-[44px] rounded-lg text-slate-400 flex items-center justify-center transition-colors cursor-not-allowed opacity-75"
        >
          <span className="material-symbols-outlined text-[20px] shrink-0" aria-hidden="true">
            notifications
          </span>
        </button>
      </div>
    </header>
  )
}
