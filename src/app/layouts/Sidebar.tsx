import { useContext, useEffect, useRef, useCallback, type RefObject } from 'react'
import { NavLink } from 'react-router-dom'
import { getWorkspaceNavigation } from '../router/workspace-route-registry'
import { StudentJourneyContext } from '../context'
import { useAcademicWorkflow } from '../context/useAcademicWorkflow'
import { useWorkspaceAccess } from '../context/workspace-access'
import { useAuthSession } from '../../features/auth/context/useAuthSession'
import { getWorkspaceRole } from '../../features/auth/utils/role-access'
import '../../components/ui/page-loading.css'
import { useChat } from '../../features/chat/ChatProvider'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  triggerRef?: RefObject<HTMLButtonElement | null>
}

export function Sidebar({ isOpen, onClose, triggerRef }: SidebarProps) {
  const { inbox } = useChat()
  const chatUnread = inbox.items.reduce((sum, room) => sum + room.unreadCount, 0)
  const asideRef = useRef<HTMLElement | null>(null)
  const journey = useContext(StudentJourneyContext)
  const { academic } = useAcademicWorkflow()
  const access = useWorkspaceAccess()
  const { logout, session } = useAuthSession()
  const role = getWorkspaceRole(session?.user)
  const { profile, semester, team, project } = journey ?? {}
  const pendingStudent = role === 'student' && access.contextStatus === 'loading'
  const unavailableStudent = role === 'student' && access.contextStatus === 'unavailable'
  const workspaceCode = role === 'student'
    ? project?.code?.trim() || academic?.selectedSemester?.code || (unavailableStudent ? 'Không tải được ngữ cảnh' : 'Ngữ cảnh chưa xác định')
    : 'AI-PMS'
  const teamLabel = role === 'student'
    ? team?.code?.trim() || team?.name?.trim() || (unavailableStudent ? 'Không tải được ngữ cảnh' : 'Chưa có nhóm')
    : role === 'lecturer' ? 'Giảng viên' : role === 'department' ? 'Bộ môn' : role === 'admin' ? 'Quản trị' : 'Tài khoản'
  const profileName = profile?.fullName?.trim() || session?.user.fullName || 'Tài khoản'
  const profileCode = role === 'student' ? profile?.studentCode || 'Tài khoản sinh viên' : session?.user.email || 'Tài khoản'
  const profileInitials = profileName.split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase()

  const navigationItems = getWorkspaceNavigation(access)
  const sectionLabel = role === 'student'
    ? 'Không gian đồ án'
    : role === 'lecturer'
      ? 'Không gian giảng viên'
      : role === 'department'
        ? 'Quản trị học vụ'
        : role === 'admin'
          ? 'Quản trị nền tảng'
          : 'Hồ sơ tài khoản'

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
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden transition-opacity"
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
                    {pendingStudent ? <span className="app-context-skeleton" aria-hidden="true" /> : role === 'student' ? semester?.name || 'Học kỳ chưa xác định' : teamLabel}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Dedicated Close Button for Mobile Drawer */}
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Đóng ngăn điều hướng"
                  className="lg:hidden min-w-[44px] min-h-[44px] rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
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
                  {pendingStudent ? <span className="app-context-skeleton" aria-hidden="true" /> : <>{workspaceCode} / {teamLabel}</>}
                </span>
              </div>
              {!pendingStudent && team && <span className="w-2 h-2 rounded-full bg-academic-emerald shrink-0" title="Đã tải thông tin nhóm" />}
            </div>

          </div>

          {/* Main Navigation Links */}
          <nav className="p-3 flex flex-col gap-1 flex-1" aria-label="Menu chức năng học tập">
            <div className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
              {sectionLabel}
            </div>
            {pendingStudent ? <div className="app-nav-skeleton" aria-label="Đang tải điều hướng" role="status">{[0,1,2,3,4,5].map(item => <span key={item} />)}</div> : unavailableStudent ? (
              <div className="rounded-md border border-status-warning-border bg-status-warning-bg px-2.5 py-2 text-xs leading-5 text-status-warning-text" role="alert">
                Chưa tải được ngữ cảnh đồ án. Hãy thử lại từ trang đang mở.
              </div>
            ) : <>
            {navigationItems.map((item) => (
                <NavLink
                  key={item.id}
                  to={item.path}
                  end={item.path === '/academic'}
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
                      className="material-symbols-outlined text-[18px] shrink-0 text-slate-400"
                      aria-hidden="true"
                    >
                      {item.icon}
                    </span>
                    <span className="truncate">{item.title}</span>
                    {item.id === 'chat' && chatUnread > 0 && <span className="rounded-full bg-primary px-2 text-xs text-white" aria-label="Có tin nhắn chưa đọc">{chatUnread}{inbox.hasMore ? '+' : ''}</span>}
                  </div>
                </NavLink>
              ))}

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
            aria-label="Đăng xuất"
            title="Đăng xuất / Chuyển tài khoản"
            className="min-h-[44px] min-w-[44px] p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors shrink-0 flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">logout</span>
          </button>
        </div>
      </aside>
    </>
  )
}
