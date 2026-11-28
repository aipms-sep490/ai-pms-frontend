import { TOUR_ANCHOR } from '../../features/onboarding/tour-anchors'
import { useCallback, useContext, useEffect, useRef, useState, type RefObject } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getBreadcrumbForPath } from '../router/routes.config'
import { useAcademicWorkflow } from '../context/useAcademicWorkflow'
import { StudentJourneyContext } from '../context/StudentJourneyContext'
import { useWorkspaceAccess } from '../context/workspace-access'
import { getWorkspaceRole } from '../../features/auth/utils/role-access'
import { useAuthSession } from '../../features/auth/context/useAuthSession'
import { getNotifications, getUnreadCount, markAllNotificationsRead, markNotificationRead, type NotificationItem } from '../../features/notifications/notifications-api'
import { emitNotificationsChanged, useNotificationLive } from '../../features/notifications/NotificationLiveContext'
import { NotificationRow, NotificationEmpty, NotificationLoading } from '../../features/notifications/NotificationRow'
import { getActivePrimaryAssignment } from '../../features/projects/utils/project-resolution.utils'
import { QuickNavigation } from '../../components/ui/QuickNavigation'
import { TourLauncher } from '../../features/onboarding/TourLauncher'

interface TopHeaderProps {
  onToggleMobileMenu: () => void
  isMobileMenuOpen: boolean
  isSidebarCollapsed?: boolean
  onToggleSidebarCollapsed?: () => void
  triggerRef?: RefObject<HTMLButtonElement | null>
}

export function TopHeader({
  onToggleMobileMenu,
  isMobileMenuOpen,
  isSidebarCollapsed = false,
  onToggleSidebarCollapsed,
  triggerRef,
}: TopHeaderProps) {
  const location = useLocation()
  const { academic } = useAcademicWorkflow()
  const journey = useContext(StudentJourneyContext)
  const workspaceAccess = useWorkspaceAccess()
  const selectedSemester = academic?.selectedSemester
  const { session } = useAuthSession()
  const live = useNotificationLive()
  const [fallbackUnreadCount, setFallbackUnreadCount] = useState<number | null>(null)
  const [fallbackUnreadStale, setFallbackUnreadStale] = useState(false)
  const unreadCount = live ? live.unreadCount : fallbackUnreadCount
  const unreadStale = live ? live.unreadStale : fallbackUnreadStale
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [preview, setPreview] = useState<NotificationItem[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [previewFilter, setPreviewFilter] = useState<'all' | 'unread'>('unread')
  const [previewBusy, setPreviewBusy] = useState(false)
  const previewRequest = useRef(0)
  const previewMutation = useRef<Promise<void>>(Promise.resolve())
  const lastSyncRef = useRef(live?.syncVersion ?? 0)
  const notificationRef = useRef<HTMLDivElement | null>(null)
  const notificationTriggerRef = useRef<HTMLButtonElement | null>(null)
  const userId = session?.user.id

  // Fallback polling only if TopHeader is rendered outside NotificationLiveProvider
  useEffect(() => {
    if (live || !userId) return
    let active = true
    const refresh = () => {
      void getUnreadCount()
        .then(count => { if (active) { setFallbackUnreadCount(count); setFallbackUnreadStale(false) } })
        .catch(() => { if (active) setFallbackUnreadStale(true) })
    }
    refresh()
    const refreshWhenVisible = () => { if (document.visibilityState === 'visible') refresh() }
    const timer = window.setInterval(refreshWhenVisible, 10_000)
    window.addEventListener('ai-pms:notifications-changed', refresh)
    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      active = false
      window.clearInterval(timer)
      window.removeEventListener('ai-pms:notifications-changed', refresh)
      window.removeEventListener('focus', refreshWhenVisible)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [live, userId])

  const loadPreview = useCallback(async (filter = previewFilter, opts?: { silent?: boolean }) => {
    const id = ++previewRequest.current
    if (!opts?.silent) setPreviewLoading(true)
    setPreviewError('')
    try {
      const result = await getNotifications(1, filter === 'unread' ? false : undefined)
      if (id === previewRequest.current) setPreview(result.items.slice(0, 8))
    } catch {
      if (id === previewRequest.current && !opts?.silent) {
        setPreviewError('Không thể tải thông báo. Hãy thử lại.')
        setPreview([])
      }
    } finally {
      if (id === previewRequest.current && !opts?.silent) setPreviewLoading(false)
    }
  }, [previewFilter])

  // Switch live polling to fast 5s cadence while popover is open
  useEffect(() => {
    if (!notificationOpen || !live) return
    return live.registerLiveView()
  }, [live, notificationOpen])

  // Silently sync open popover list whenever live sync detects a new/changed notification
  useEffect(() => {
    const version = live?.syncVersion ?? 0
    if (version === lastSyncRef.current) return
    lastSyncRef.current = version
    if (notificationOpen && !previewBusy) {
      void loadPreview(previewFilter, { silent: true })
    }
  }, [live?.syncVersion, loadPreview, notificationOpen, previewBusy, previewFilter])

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

  const toggleNotifications = () => {
    if (!notificationOpen) void loadPreview(previewFilter)
    setNotificationOpen(!notificationOpen)
  }
  const readPreview = (item: NotificationItem) => {
    const pending = previewMutation.current.catch(() => {}).then(async () => {
      setPreviewBusy(true)
      try {
        await markNotificationRead(item.id)
        await loadPreview(previewFilter, { silent: true })
        emitNotificationsChanged()
      } catch (reason) { setPreviewError('Chưa đánh dấu được thông báo. Hãy thử lại.'); throw reason }
      finally { setPreviewBusy(false) }
    })
    previewMutation.current = pending
    return pending
  }
  const readAllPreview = () => {
    const pending = previewMutation.current.catch(() => {}).then(async () => {
      setPreviewBusy(true)
      try {
        await markAllNotificationsRead()
        await loadPreview(previewFilter, { silent: true })
        emitNotificationsChanged()
      } catch (reason) { setPreviewError('Chưa đánh dấu tất cả là đã đọc. Hãy thử lại.'); throw reason }
      finally { setPreviewBusy(false) }
    })
    previewMutation.current = pending
    return pending
  }
  const role = getWorkspaceRole(session?.user)
  const pendingStudent = role === 'student' && workspaceAccess.contextStatus === 'loading'
  const unavailableStudent = role === 'student' && workspaceAccess.contextStatus === 'unavailable'
  const semesterLabel = role === 'student' ? journey?.semester?.name || 'Học kỳ chưa xác định' : role === 'lecturer' ? 'Giảng viên' : role === 'department' ? 'Bộ môn' : role === 'admin' ? 'Quản trị' : 'Tài khoản'
  const teamLabel = role === 'student'
    ? journey?.team?.code || journey?.team?.name || (unavailableStudent ? 'Ngữ cảnh chưa tải được' : 'Chưa có nhóm')
    : session?.user.fullName || 'Tài khoản'
  const hasPrimarySupervisor = Boolean(getActivePrimaryAssignment(journey?.assignments ?? []))
  const stateLabel = {
    NO_TEAM: 'Chưa có nhóm',
    TEAM_FORMING: 'Đang kiện toàn',
    TEAM_ELIGIBLE: 'Sẵn sàng đăng ký',
    PROJECT_PENDING: 'Đang thẩm định',
    REVISION_REQUIRED: 'Cần chỉnh sửa',
    PROJECT_REJECTED: 'Không được chấp thuận',
    SUPERVISOR_PENDING: hasPrimarySupervisor ? 'Chờ ký Cam kết nhóm' : 'Chờ chốt GVHD',
    ACTIVE: 'Đang thực hiện',
    FINAL_SUBMISSION: 'Đang bàn giao',
    COMPLETED: 'Đã hoàn thành',
  }[journey?.journeyState ?? 'NO_TEAM']

  return (
    <header className="app-top-header sticky top-0 h-14 bg-card border-b border-hairline z-30 px-3 sm:px-4 md:px-6 flex items-center justify-between gap-4">
      {/* Left: Mobile hamburger, desktop sidebar toggle & Breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
        <button
          ref={triggerRef}
          type="button"
          onClick={onToggleMobileMenu}
          aria-label={isMobileMenuOpen ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'}
          aria-expanded={isMobileMenuOpen}
          aria-controls="main-sidebar"
          className="lg:hidden min-w-[44px] min-h-[44px] -ml-2 text-ink-muted hover:text-ink rounded-md hover:bg-canvas flex items-center justify-center transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[22px] shrink-0" aria-hidden="true">
            {isMobileMenuOpen ? 'close' : 'menu'}
          </span>
        </button>

        {onToggleSidebarCollapsed && (
          <>
            <button
              type="button"
              onClick={onToggleSidebarCollapsed}
              aria-label={isSidebarCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
              aria-expanded={!isSidebarCollapsed}
              aria-controls="main-sidebar"
              title={isSidebarCollapsed ? 'Mở rộng thanh điều hướng (Ctrl+B)' : 'Thu gọn thanh điều hướng (Ctrl+B)'}
              className="hidden lg:inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-primary-subtle hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary shrink-0"
            >
              <span className="material-symbols-outlined text-[19px]" aria-hidden="true">
                {isSidebarCollapsed ? 'left_panel_open' : 'left_panel_close'}
              </span>
            </button>
            <span aria-hidden="true" className="hidden lg:block h-4 w-px bg-hairline shrink-0" />
          </>
        )}

        <nav
          aria-label="Đường dẫn điều hướng breadcrumb"
          data-tour={TOUR_ANCHOR.breadcrumb}
          className="flex items-center gap-1.5 sm:gap-2 text-xs text-ink-muted font-sans truncate"
        >
          <span className="font-semibold text-ink-soft shrink-0">{selectedSemester?.code ?? 'AIPMS'}</span>
          {!pendingStudent && teamLabel.trim() ? (
            <>
              <span aria-hidden="true" className="text-line-strong hidden sm:inline shrink-0">/</span>
              <span className="text-ink-muted font-medium hidden sm:inline shrink-0">{teamLabel}</span>
            </>
          ) : null}
          <span aria-hidden="true" className="text-line-strong shrink-0">/</span>
          <span className="text-primary font-semibold truncate max-w-[200px] sm:max-w-xs md:max-w-none">
            {getBreadcrumbForPath(location.pathname)}
          </span>
        </nav>
      </div>

      {/* Right: Controls & Badges */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {unavailableStudent ? <span className="hidden md:inline text-xs text-status-warning-text" role="alert">Ngữ cảnh đồ án chưa tải được</span> : null}
        {selectedSemester && role === 'student' && !pendingStudent ? (
          <span className="hidden 2xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-subtle text-primary border border-hairline text-xs font-mono font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />
            {selectedSemester.name} • {stateLabel}
          </span>
        ) : null}
        {role !== 'student' ? <span className="hidden 2xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-subtle text-primary border border-hairline text-xs font-mono font-medium"><span className="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />{selectedSemester ? `${selectedSemester.name} • ${semesterLabel}` : semesterLabel}</span> : null}
        <QuickNavigation access={workspaceAccess} />
        <TourLauncher />
        <div className="relative" ref={notificationRef}>
          <button
            ref={notificationTriggerRef}
            type="button"
            data-tour={TOUR_ANCHOR.notifications}
            onClick={toggleNotifications}
            aria-expanded={notificationOpen}
            aria-controls="notification-preview"
            aria-label={unreadCount === null ? 'Mở thông báo học vụ' : `Mở thông báo học vụ, ${unreadCount} chưa đọc${unreadStale ? ', đang chờ đồng bộ' : ''}`}
            className="relative flex h-10 w-10 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-primary-subtle hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span className="material-symbols-outlined text-[20px] shrink-0" aria-hidden="true">notifications</span>
            {unreadCount !== null && unreadCount > 0 && <span aria-hidden="true" className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger-strong px-1 text-center text-xs font-bold leading-none text-white ring-2 ring-card">{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </button>
          {notificationOpen && (
            <section id="notification-preview" aria-label="Thông báo mới" className="notification-popover">
              <div className="notification-popover-header">
                <div className="notification-popover-title-wrap">
                  <h2>Thông báo</h2>
                  {unreadCount !== null && unreadCount > 0 && (
                    <span className="notification-popover-count">{unreadCount > 99 ? '99+' : unreadCount}</span>
                  )}
                  <span
                    className={`notification-live-badge ${unreadStale ? 'notification-live-badge--stale' : ''}`}
                    title={unreadStale ? 'Đang chờ kết nối lại để đồng bộ tự động' : 'Tự động đồng bộ mỗi 5 giây khi mở'}
                  >
                    <span className="notification-live-dot" aria-hidden="true" />
                    <span>{unreadStale ? 'Chờ đồng bộ' : 'Trực tiếp'}</span>
                  </span>
                </div>
                <div className="notification-popover-actions">
                  <button
                    type="button"
                    className="notification-icon-btn"
                    aria-label="Làm mới"
                    title="Làm mới ngay"
                    disabled={previewLoading || previewBusy}
                    onClick={() => { emitNotificationsChanged(); void loadPreview(previewFilter) }}
                  >
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">refresh</span>
                  </button>
                  <button
                    type="button"
                    className="notification-icon-btn"
                    aria-label="Đóng bảng thông báo"
                    title="Đóng (Esc)"
                    onClick={() => { setNotificationOpen(false); notificationTriggerRef.current?.focus() }}
                  >
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">close</span>
                  </button>
                </div>
              </div>
              <div className="notification-toolbar">
                <div className="notification-tabs" role="group" aria-label="Lọc thông báo nhanh">
                  {(['unread', 'all'] as const).map(value => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={previewFilter === value}
                      disabled={previewBusy}
                      onClick={() => { setPreviewFilter(value); void loadPreview(value) }}
                    >
                      {value === 'unread' ? 'Chưa đọc' : 'Tất cả'}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="notification-action"
                  disabled={previewLoading || previewBusy || (unreadCount ?? 0) === 0}
                  onClick={() => void readAllPreview().catch(() => {})}
                >
                  <span className="material-symbols-outlined text-[15px]" aria-hidden="true">done_all</span>
                  <span>Đọc hết</span>
                </button>
              </div>
              {previewError && (
                <p role="alert" className="notification-error">
                  <span>{previewError}</span>
                  <button type="button" disabled={previewLoading || previewBusy} onClick={() => void loadPreview(previewFilter)}>Tải lại</button>
                </p>
              )}
              <div className="notification-popover-scroll">
                {previewLoading ? (
                  <NotificationLoading />
                ) : preview.length ? (
                  <ul className="notification-list">
                    {preview.map(item => (
                      <NotificationRow
                        key={item.id}
                        item={item}
                        busy={previewBusy}
                        compact
                        headingLevel="h3"
                        onRead={() => readPreview(item)}
                        onNavigate={() => setNotificationOpen(false)}
                      />
                    ))}
                  </ul>
                ) : !previewError ? (
                  <NotificationEmpty unread={previewFilter === 'unread'} />
                ) : null}
              </div>
              <Link to="/notifications" onClick={() => setNotificationOpen(false)} className="notification-popover-footer">
                <span>Xem tất cả</span>
                <span aria-hidden="true">→</span>
              </Link>
            </section>
          )}
        </div>
        <span className="sr-only" role="status" aria-atomic="true">{unreadCount === null ? '' : unreadCount === 0 ? 'Không có thông báo chưa đọc.' : `${unreadCount} thông báo chưa đọc.`}</span>
      </div>
    </header>
  )
}

