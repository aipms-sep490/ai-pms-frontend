import { useContext, useEffect, useRef, useState, type RefObject } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getBreadcrumbForPath } from '../router/routes.config'
import { useAcademicWorkflow } from '../context/useAcademicWorkflow'
import { StudentJourneyContext } from '../context/StudentJourneyContext'
import { useWorkspaceAccess } from '../context/workspace-access'
import { getWorkspaceRole } from '../../features/auth/utils/role-access'
import { useAuthSession } from '../../features/auth/context/useAuthSession'
import { getNotifications, getUnreadCount, markNotificationRead, type NotificationItem } from '../../features/notifications/notifications-api'
import { NotificationRow, NotificationEmpty, NotificationLoading } from '../../features/notifications/NotificationRow'
import { QuickNavigation } from '../../components/ui/QuickNavigation'

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
  const workspaceAccess = useWorkspaceAccess()
  const selectedSemester = academic?.selectedSemester
  const { session } = useAuthSession()
  const [unreadCount, setUnreadCount] = useState<number | null>(null)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [preview, setPreview] = useState<NotificationItem[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [previewFilter, setPreviewFilter] = useState<'all' | 'unread'>('unread')
  const [previewBusy, setPreviewBusy] = useState(false)
  const previewRequest = useRef(0)
  const previewMutation = useRef(false)
  const notificationRef = useRef<HTMLDivElement | null>(null)
  const notificationTriggerRef = useRef<HTMLButtonElement | null>(null)
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
  useEffect(() => {
    if (!notificationOpen) return
    const closeOutside = (event: MouseEvent) => {
      if (!notificationRef.current?.contains(event.target as Node)) setNotificationOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setNotificationOpen(false); notificationTriggerRef.current?.focus() } }
    document.addEventListener('mousedown', closeOutside)
    window.addEventListener('keydown', closeOnEscape)
    return () => { document.removeEventListener('mousedown', closeOutside); window.removeEventListener('keydown', closeOnEscape) }
  }, [notificationOpen])
  const loadPreview = async (filter = previewFilter) => {
    const id = ++previewRequest.current
    setPreviewLoading(true)
    setPreviewError('')
    try { const result = await getNotifications(1, filter === 'unread' ? false : undefined); if (id === previewRequest.current) setPreview(result.items.slice(0, 5)) }
    catch { if (id === previewRequest.current) { setPreviewError('Không thể tải thông báo. Hãy thử lại.'); setPreview([]) } }
    finally { if (id === previewRequest.current) setPreviewLoading(false) }
  }
  const toggleNotifications = () => {
    if (!notificationOpen) void loadPreview()
    setNotificationOpen(!notificationOpen)
  }
  const readPreview = async (item: NotificationItem) => {
    if (previewMutation.current) return
    previewMutation.current = true
    setPreviewBusy(true)
    try {
      await markNotificationRead(item.id)
      await loadPreview()
      window.dispatchEvent(new Event('ai-pms:notifications-changed'))
    } catch { setPreviewError('Chưa đánh dấu được thông báo. Hãy thử lại.'); }
    finally { previewMutation.current = false; setPreviewBusy(false) }
  }
  const role = getWorkspaceRole(session?.user)
  const pendingStudent = role === 'student' && workspaceAccess.contextStatus === 'loading'
  const unavailableStudent = role === 'student' && workspaceAccess.contextStatus === 'unavailable'
  const semesterLabel = role === 'student' ? journey?.semester?.name || 'Học kỳ chưa xác định' : role === 'lecturer' ? 'Giảng viên' : role === 'department' ? 'Bộ môn' : role === 'admin' ? 'Quản trị' : 'Tài khoản'
  const teamLabel = role === 'student'
    ? journey?.team?.code || journey?.team?.name || (unavailableStudent ? 'Ngữ cảnh chưa tải được' : 'Chưa có nhóm')
    : session?.user.fullName || 'Tài khoản'
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
          <span className="text-primary font-semibold truncate max-w-[200px] sm:max-w-xs md:max-w-none">
            {getBreadcrumbForPath(location.pathname)}
          </span>
        </nav>
      </div>

      {/* Right: Controls & Badges */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {unavailableStudent ? <span className="hidden md:inline text-xs text-status-warning-text" role="alert">Ngữ cảnh đồ án chưa tải được</span> : null}
        {selectedSemester && role === 'student' && !pendingStudent ? (
          <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-subtle text-primary border border-hairline text-[11px] font-mono font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />
            {selectedSemester.name} • {stateLabel}
          </span>
        ) : null}
        {role !== 'student' ? <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-subtle text-primary border border-hairline text-[11px] font-mono font-medium"><span className="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />{semesterLabel}</span> : null}
        <QuickNavigation access={workspaceAccess} />
        <div className="relative" ref={notificationRef}>
          <button
            ref={notificationTriggerRef}
            type="button"
            onClick={toggleNotifications}
            aria-expanded={notificationOpen}
            aria-controls="notification-preview"
            aria-label={unreadCount === null ? 'Mở thông báo học vụ' : `Mở thông báo học vụ, ${unreadCount} chưa đọc`}
            className="relative flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-[#edf3f0] hover:text-[#0f5b4e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f5b4e]"
          >
            <span className="material-symbols-outlined text-[20px] shrink-0" aria-hidden="true">notifications</span>
            {unreadCount !== null && unreadCount > 0 && <span aria-hidden="true" className="absolute right-0 top-0 rounded-full bg-rose-600 px-1.5 text-[10px] font-bold text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </button>
          {notificationOpen && <section id="notification-preview" aria-label="Thông báo mới" className="notification-popover">
            <div className="notification-popover-header"><div><h2>Thông báo</h2><p>{unreadCount === null ? 'Cập nhật dành cho bạn' : unreadCount > 0 ? unreadCount + ' thông báo chưa đọc' : 'Bạn đã đọc hết thông báo mới'}</p></div><button type="button" className="notification-close" aria-label="Đóng bảng thông báo" onClick={() => { setNotificationOpen(false); notificationTriggerRef.current?.focus() }}><span className="material-symbols-outlined" aria-hidden="true">close</span></button></div>
            <div className="notification-toolbar"><div className="notification-tabs" role="group" aria-label="Lọc thông báo nhanh">{(['unread', 'all'] as const).map(value => <button key={value} type="button" aria-pressed={previewFilter === value} disabled={previewBusy} onClick={() => { setPreviewFilter(value); void loadPreview(value) }}>{value === 'unread' ? 'Chưa đọc' : 'Tất cả'}</button>)}</div><button type="button" className="notification-action" disabled={previewLoading || previewBusy} onClick={() => void loadPreview()}>Làm mới</button></div>
            {previewError && <p role="alert" className="notification-error">{previewError}<button type="button" disabled={previewLoading || previewBusy} onClick={() => void loadPreview()}>Tải lại</button></p>}
            <div className="notification-popover-scroll">{previewLoading ? <NotificationLoading /> : preview.length ? <ul className="notification-list">{preview.map(item => <NotificationRow key={item.id} item={item} busy={previewBusy} compact onRead={() => void readPreview(item)} />)}</ul> : !previewError ? <NotificationEmpty unread={previewFilter === 'unread'} /> : null}</div>
            <Link to="/notifications" onClick={() => setNotificationOpen(false)} className="notification-popover-footer">Xem tất cả<span aria-hidden="true">→</span></Link>
          </section>}
        </div>
        <span className="sr-only" role="status" aria-atomic="true">{unreadCount === null ? '' : unreadCount === 0 ? 'Không có thông báo chưa đọc.' : `${unreadCount} thông báo chưa đọc.`}</span>
      </div>
    </header>
  )
}

