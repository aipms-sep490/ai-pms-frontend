import { useContext, useEffect, useRef, useCallback, type RefObject } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { getStudentNavItems } from '../router/routes.config'
import { StudentJourneyContext } from '../context'
import { useAcademicWorkflow } from '../context/useAcademicWorkflow'
import { useAuthSession } from '../../features/auth/context/useAuthSession'
import { getWorkspaceRole } from '../../features/auth/utils/role-access'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  triggerRef?: RefObject<HTMLButtonElement | null>
}

export function Sidebar({ isOpen, onClose, triggerRef }: SidebarProps) {
  const location = useLocation()
  const asideRef = useRef<HTMLElement | null>(null)
  const journey = useContext(StudentJourneyContext)
  const { academic } = useAcademicWorkflow()
  const { logout, session } = useAuthSession()
  const role = getWorkspaceRole(session?.user)
  const { profile, semester, team, project } = journey ?? {}
  const workspaceCode = role === 'student'
    ? project?.code?.trim() || academic?.selectedSemester?.code || 'Ngữ cảnh chưa xác định'
    : 'AI-PMS'
  const teamLabel = role === 'student'
    ? team?.code?.trim() || team?.name?.trim() || 'Chưa có nhóm'
    : role === 'lecturer' ? 'Giảng viên' : role === 'department' ? 'Bộ môn' : role === 'admin' ? 'Quản trị' : 'Tài khoản'
  const profileName = profile?.fullName?.trim() || session?.user.fullName || 'Tài khoản'
  const profileCode = role === 'student' ? profile?.studentCode || 'Tài khoản sinh viên' : session?.user.email || 'Tài khoản'
  const profileInitials = profileName.split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase()

  const { workspaceItems } = getStudentNavItems()

  const handleClose = useCallback(() => {
    onClose()
    triggerRef?.current?.focus()
  }, [onClose, triggerRef])

  // Body scroll lock on mobile when drawer is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [isOpen])

  // Focus management & Focus trap in mobile drawer
  useEffect(() => {
    if (!isOpen) return

    // Focus first interactive element inside drawer
    const focusTimer = setTimeout(() => {
      if (asideRef.current) {
        const focusableElements = asideRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        if (focusableElements.length > 0) {
          focusableElements[0].focus()
        }
      }
    }, 50)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleClose()
        return
      }

      if (e.key === 'Tab' && asideRef.current) {
        const focusableElements = asideRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        if (focusableElements.length === 0) return

        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement.focus()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      clearTimeout(focusTimer)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleClose])

  return (
    <>
      {/* Mobile/Tablet Backdrop */}
      {isOpen && (
        <div
          role="presentation"
          onClick={handleClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Aside Rail / Mobile Drawer */}
      <aside
        ref={asideRef}
        id="main-sidebar"
        role={isOpen ? 'dialog' : undefined}
        aria-modal={isOpen ? true : undefined}
        aria-label="Menu điều hướng chính"
        className={`fixed left-0 top-0 bottom-0 w-60 bg-white border-r border-hairline z-50 flex flex-col justify-between select-none sidebar-rail ${
          isOpen ? 'drawer-open' : ''
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Top Brand & Academic Header */}
          <div className="p-4 pb-3 border-b border-hairline flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-xs">
                  <span className="material-symbols-outlined text-[19px] shrink-0" aria-hidden="true">
                    school
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-heading font-bold text-[14px] text-slate-900 tracking-tight leading-tight">
                    AI-PMS • FPTU
                  </span>
                  <span className="font-mono text-[10px] text-slate-500 leading-tight">
                    {role === 'student' ? semester?.name || 'Học kỳ chưa xác định' : teamLabel}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary-subtle text-primary border border-hairline">
                  v2.4
                </span>
                {/* Dedicated Close Button for Mobile Drawer */}
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Đóng ngăn điều hướng"
                  className="lg:hidden min-w-[36px] min-h-[36px] rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                    close
                  </span>
                </button>
              </div>
            </div>

            {/* Academic Context Badge */}
            <div className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-hairline flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="material-symbols-outlined text-[14px] text-academic-emerald shrink-0" aria-hidden="true">
                  verified
                </span>
                <span className="font-mono text-[11px] font-semibold text-slate-800 truncate">
                  {workspaceCode} / {teamLabel}
                </span>
              </div>
              <span className="w-2 h-2 rounded-full bg-academic-emerald shrink-0" title="Đang hoạt động" />
            </div>

            {/* Quick Action CTA (Disabled preview) */}
            {role === 'student' && <Button
              variant="primary"
              size="sm"
              icon="add"
              disabled
              title="Chức năng tạo việc mới sẽ khả dụng ở phân hệ Tasks"
              className="w-full justify-between"
            >
              Tạo việc mới (Sắp có)
            </Button>}
          </div>

          {/* Main Navigation Links */}
          <nav className="p-3 flex flex-col gap-1 flex-1" aria-label="Menu chức năng học tập">
            {role !== 'student' && (
              <>
                <div className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
                  {role === 'lecturer' ? 'Không gian Giảng viên' : role === 'unknown' ? 'Hồ sơ tài khoản' : 'Không gian Quản lý'}
                </div>
                {(role === 'lecturer' ? [
                  { path: '/supervisor/workspace', title: 'Bàn làm việc GVHD', icon: 'supervisor_account' },
                  ...(location.pathname.match(/\/supervisor\/projects\/(\d+)/) ? [
                    { path: `/supervisor/projects/${location.pathname.match(/\/supervisor\/projects\/(\d+)/)![1]}/workspace`, title: 'Không gian đồ án', icon: 'folder_open' },
                    { path: `/supervisor/projects/${location.pathname.match(/\/supervisor\/projects\/(\d+)/)![1]}/meetings`, title: 'Lịch họp & biên bản', icon: 'calendar_month' },
                    { path: `/supervisor/projects/${location.pathname.match(/\/supervisor\/projects\/(\d+)/)![1]}/reports`, title: 'Báo cáo tiến độ', icon: 'assignment' },
                  ] : []),
                  { path: '/profile', title: 'Hồ sơ tài khoản', icon: 'account_circle' },
                ] : role === 'department' || role === 'admin' ? [
                  ...(role === 'admin' ? [{ path: '/admin/access', title: 'Quản trị quyền', icon: 'admin_panel_settings' }] : []),
                  { path: '/department/projects/review', title: 'Thẩm định đề cương', icon: 'fact_check' },
                  { path: '/department/supervisors', title: 'Giám sát GVHD', icon: 'school' },
                  { path: '/department/topics', title: 'Quản lý đề tài', icon: 'lightbulb' },
                  { path: '/academic', title: 'Cấu trúc đào tạo', icon: 'account_balance' },
                  { path: '/profile', title: 'Hồ sơ tài khoản', icon: 'account_circle' },
                ] : [{ path: '/profile', title: 'Hồ sơ tài khoản', icon: 'account_circle' }]).map((item) => (
                  <NavLink key={item.path} to={item.path} onClick={() => { if (window.innerWidth < 1024) handleClose() }}
                    className={({ isActive }) => `flex items-center gap-2.5 px-2.5 py-2 min-h-[40px] rounded-lg text-[13px] font-medium ${isActive ? 'bg-primary-subtle text-primary font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}>
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{item.icon}</span>{item.title}
                  </NavLink>
                ))}
              </>
            )}
            {role === 'student' && <>
            <div className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
              Không gian Nhóm Đồ án
            </div>

            {/* Workspace Routes */}
            {workspaceItems.map((item) =>
              item.status === 'implemented' ? (
                <NavLink
                  key={item.id}
                  to={item.path}
                  end={item.path === '/project/workspace'}
                  onClick={() => {
                    if (window.innerWidth < 1024) handleClose()
                  }}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-2.5 py-2 min-h-[40px] rounded-lg text-[13px] font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-primary-subtle text-primary font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`material-symbols-outlined text-[18px] shrink-0 ${
                        location.pathname === item.path ? 'text-primary' : 'text-slate-400'
                      }`}
                      aria-hidden="true"
                    >
                      {item.icon}
                    </span>
                    <span className="truncate">{item.title}</span>
                  </div>
                  {item.badge && (
                    <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-primary-subtle text-primary font-semibold shrink-0 ml-1">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ) : (
                <div
                  key={item.id}
                  aria-disabled="true"
                  className="flex items-center justify-between px-2.5 py-2 min-h-[40px] rounded-lg text-[13px] text-slate-400 cursor-not-allowed opacity-75"
                  title={`${item.title} — Chức năng đang được phát triển`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="material-symbols-outlined text-[18px] text-slate-300 shrink-0" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span className="truncate">{item.title}</span>
                  </div>
                  <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-semibold shrink-0 ml-1">
                    {item.badge || 'Sắp có'}
                  </span>
                </div>
              )
            )}

            </>}
          </nav>
        </div>

        {/* Bottom Profile Footer (Student Baseline for Batch 0-2) */}
        <div className="p-3 border-t border-hairline bg-slate-50/70 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center font-heading font-bold text-xs text-slate-700 relative shrink-0">
              {profileInitials}
              <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ring-2 ring-white ${session ? 'bg-academic-emerald' : 'bg-slate-300'}`} />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[12px] font-semibold text-slate-900 truncate">
                {profileName}
              </span>
              <span className="font-mono text-[10px] text-slate-500 truncate">
                {profileCode}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            title="Đăng xuất / Chuyển tài khoản"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors shrink-0 flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      </aside>
    </>
  )
}
