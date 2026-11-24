import { TOUR_ANCHOR } from '../../features/onboarding/tour-anchors'
import { useContext, useEffect, useRef, useCallback, useState, useMemo, type RefObject } from 'react'
import { matchPath, NavLink, useLocation } from 'react-router-dom'
import { getWorkspaceNavigation } from '../router/workspace-route-registry'
import { StudentJourneyContext } from '../context'
import { useAcademicWorkflow } from '../context/useAcademicWorkflow'
import { useWorkspaceAccess } from '../context/workspace-access'
import { useAuthSession } from '../../features/auth/context/useAuthSession'
import { getWorkspaceRole } from '../../features/auth/utils/role-access'
import '../../components/ui/page-loading.css'
import { useChat } from '../../features/chat/ChatProvider'
import { BrandLogo } from '../../components/ui/BrandLogo'
import { getInitials } from '../../components/ui/initials'
import { SelfAvatarImage } from '../../features/auth/components/SelfAvatarImage'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  triggerRef?: RefObject<HTMLButtonElement | null>
}

function isWorkspaceSubrouteActive(itemPath: string, pathname: string): boolean {
  if (itemPath === '/supervisor/workspace') return pathname.startsWith('/supervisor/projects/')
  if (itemPath === '/mentor/workspace') return pathname.startsWith('/mentor/projects/')
  if (itemPath === '/evaluator/workspace') return pathname.startsWith('/evaluator/')
  if (itemPath === '/admin/portfolio') return pathname.startsWith('/admin/projects/')
  if (itemPath === '/department/portfolio') return /^\/department\/projects\/(?!review|archived|progress-matrix)/.test(pathname)
  return false
}

export function Sidebar({ isOpen, onClose, triggerRef }: SidebarProps) {
  const { unreadCount: chatUnread } = useChat()
  const location = useLocation()
  const asideRef = useRef<HTMLElement | null>(null)
  const journey = useContext(StudentJourneyContext)
  const { academic } = useAcademicWorkflow()
  const access = useWorkspaceAccess()
  const { logout, session } = useAuthSession()
  const role = getWorkspaceRole(session?.user)
  const { profile, semester, team, project } = journey ?? {}
  const pendingStudent = role === 'student' && access.contextStatus === 'loading'
  const unavailableStudent = role === 'student' && access.contextStatus === 'unavailable'
  const teamLabel = role === 'student'
    ? team?.code?.trim() || team?.name?.trim() || (unavailableStudent ? 'Không tải được ngữ cảnh' : 'Chưa có nhóm')
    : role === 'lecturer' ? 'Giảng viên' : role === 'department' ? 'Bộ môn' : role === 'admin' ? 'Quản trị' : 'Tài khoản'
  const brandSubtitle = role === 'student'
    ? semester?.name || academic?.selectedSemester?.name || 'Học kỳ chưa xác định'
    : academic?.selectedSemester?.name || teamLabel
  const workspaceCode = role === 'student'
    ? project?.code?.trim() || academic?.selectedSemester?.code || (unavailableStudent ? 'Không tải được ngữ cảnh' : 'Ngữ cảnh chưa xác định')
    : academic?.selectedSemester?.code || academic?.organization?.code || 'AIPMS'
  const badgeScopeLabel = role === 'student'
    ? teamLabel
    : academic?.departments[0]?.code ? `${teamLabel} · ${academic.departments[0].code}` : teamLabel
  const hasReadyContext = role === 'student' ? Boolean(team) : Boolean(academic?.selectedSemester || session)
  const profileName = profile?.fullName?.trim() || session?.user.fullName || 'Tài khoản'
  const profileCode = role === 'student' ? profile?.studentCode || 'Tài khoản sinh viên' : session?.user.email || 'Tài khoản'
  const profileInitials = getInitials(profileName, 'TK')

  const sectionOrder = ['student', 'lecturer', 'administration', 'governance', 'account']
  const navigationItems = [...getWorkspaceNavigation(access)].sort((a, b) => sectionOrder.indexOf(a.section) - sectionOrder.indexOf(b.section))
  const sectionLabels: Record<string, string> = { student: 'Đồ án của nhóm', lecturer: 'Hướng dẫn và đánh giá', governance: 'Quản lý học vụ', administration: 'Quản trị hệ thống', account: 'Tài khoản và lịch' }
  const sectionLabel = role === 'student'
    ? 'Hành trình đồ án'
    : role === 'lecturer'
      ? 'Không gian giảng viên'
      : role === 'department'
        ? 'Quản trị học vụ'
        : role === 'admin'
          ? 'Quản trị nền tảng'
          : 'Hồ sơ tài khoản'

  // Grouped navigation is shared by role-specific workspaces. Student groups
  // remain limited to the project journey; department groups describe
  // academic governance without changing route authorization.
  const navigationGroups = useMemo(() => {
    const groupedSection = role === 'student' ? 'student' : role === 'department' ? 'governance' : null
    const groupedItems = navigationItems.filter((item) => item.group && item.section === groupedSection)
    if (groupedItems.length === 0) return null
    const groupsMap = new Map<string, { group: string; order: number; items: typeof navigationItems }>()
    for (const item of groupedItems) {
      if (!item.group) continue
      const existing = groupsMap.get(item.group)
      if (existing) {
        existing.items.push(item)
      } else {
        groupsMap.set(item.group, {
          group: item.group,
          order: item.groupOrder ?? 99,
          items: [item],
        })
      }
    }
    return Array.from(groupsMap.values()).sort((a, b) => a.order - b.order)
  }, [navigationItems, role])
  const groupedIds = new Set(navigationGroups?.flatMap(({ items }) => items.map((item) => item.id)))
  const remainingItems = navigationItems.filter((item) => !groupedIds.has(item.id))
  const activeNavigationGroup = navigationGroups?.find(({ items }) =>
    items.some(item => matchPath({ path: item.path, end: item.path === '/academic' }, location.pathname)),
  )?.group

  // Accordion collapsed state for student groups (default expanded, auto-expand active)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const groupReveal = useRef({ pathname: location.pathname, done: false })

  const toggleGroup = useCallback((groupName: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }))
  }, [])

  // Navigation reveals its group; manual toggles on the same route stay respected.
  useEffect(() => {
    if (groupReveal.current.pathname !== location.pathname) {
      groupReveal.current = { pathname: location.pathname, done: false }
    }
    if (activeNavigationGroup && !groupReveal.current.done) {
      groupReveal.current.done = true
      setCollapsedGroups(prev => prev[activeNavigationGroup] ? { ...prev, [activeNavigationGroup]: false } : prev)
    }
  }, [location.pathname, activeNavigationGroup])

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
          className="fixed inset-0 bg-brand-navy/45 z-(--z-index-backdrop) lg:hidden transition-opacity"
        />
      )}

      {/* Aside Rail / Mobile Drawer */}
      <aside
        ref={asideRef}
        id="main-sidebar"
        role={isOpen ? 'dialog' : undefined}
        aria-modal={isOpen ? true : undefined}
        aria-label="Menu điều hướng chính"
        data-tour={TOUR_ANCHOR.sidebar}
        className={`fixed left-0 top-0 bottom-0 w-[276px] max-w-[calc(100vw-48px)] bg-card border-r border-hairline z-(--z-index-drawer) flex flex-col justify-between select-none sidebar-rail ${
          isOpen ? 'drawer-open' : ''
        }`}
      >
        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
          {/* Top Brand & Academic Header */}
          <div className="p-4 pb-3 border-b border-hairline flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex flex-col min-w-0">
                  <BrandLogo />
                  <span
                    className="font-mono text-xs text-ink-muted leading-tight truncate"
                    title={pendingStudent ? undefined : brandSubtitle}
                  >
                    {pendingStudent ? <span className="app-context-skeleton" aria-hidden="true" /> : brandSubtitle}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Dedicated Close Button for Mobile Drawer */}
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Đóng ngăn điều hướng"
                  className="lg:hidden min-w-[44px] min-h-[44px] rounded-md text-ink-muted hover:text-ink hover:bg-canvas flex items-center justify-center transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                    close
                  </span>
                </button>
              </div>
            </div>

            {/* Academic Context Badge */}
            <div className="px-2.5 py-1.5 rounded-lg bg-canvas border border-hairline flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="material-symbols-outlined text-[14px] text-academic-emerald shrink-0" aria-hidden="true">
                  verified
                </span>
                <span className="font-mono text-xs font-semibold text-ink-soft truncate">
                  {pendingStudent ? <span className="app-context-skeleton" aria-hidden="true" /> : <>{workspaceCode} / {badgeScopeLabel}</>}
                </span>
              </div>
              {!pendingStudent && hasReadyContext && <span className="w-2 h-2 rounded-full bg-academic-emerald shrink-0" title={role === 'student' ? 'Đã tải thông tin nhóm' : 'Đã đồng bộ ngữ cảnh học vụ'} />}
            </div>

          </div>

          {/* Main Navigation Links */}
          <nav className="p-3 pb-4 flex flex-col gap-1 flex-1" aria-label="Menu chức năng">
            <div className="px-2 py-1 text-xs font-mono font-semibold uppercase tracking-wider text-ink-muted">
              {sectionLabel}
            </div>
            {pendingStudent ? <div className="app-nav-skeleton" aria-label="Đang tải điều hướng" role="status">{[0,1,2,3,4,5].map(item => <span key={item} />)}</div> : unavailableStudent ? (
              <div className="rounded-md border border-status-warning-border bg-status-warning-bg px-2.5 py-2 text-xs leading-5 text-status-warning-text" role="alert">
                Chưa tải được ngữ cảnh đồ án. Hãy thử lại từ trang đang mở.
              </div>
            ) : navigationGroups && navigationGroups.length > 0 ? (
              <div className="flex flex-col gap-2">
                {navigationGroups.map(({ group, items }, groupIndex) => {
                  const isCollapsed = Boolean(collapsedGroups[group])
                  const hasActive = activeNavigationGroup === group || items.some(item => isWorkspaceSubrouteActive(item.path, location.pathname))
                  const groupId = `workspace-nav-group-${groupIndex}`

                  return (
                    <div key={group} className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => toggleGroup(group)}
                        aria-expanded={!isCollapsed}
                        aria-controls={groupId}
                        className={`flex items-center justify-between gap-1.5 px-2 py-1.5 min-h-[44px] rounded-lg text-xs font-bold transition-colors cursor-pointer select-none ${
                          hasActive ? 'text-primary bg-primary-subtle/70' : 'text-ink-soft hover:text-ink hover:bg-canvas'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="truncate whitespace-nowrap text-left text-xs leading-4 uppercase tracking-normal"
                            title={`${groupIndex + 1}. ${group.replace(/^\d+\.\s*/, '')}`}
                          >
                            {`${groupIndex + 1}. ${group.replace(/^\d+\.\s*/, '')}`}
                          </span>
                          <span className="shrink-0 rounded-full bg-canvas border border-hairline px-1.5 py-0.5 text-xs font-semibold text-ink-soft">
                            {items.length}
                          </span>
                        </div>
                        <span
                          className={`material-symbols-outlined text-[18px] text-ink-muted transition-transform duration-200 motion-reduce:transition-none shrink-0 ${
                            isCollapsed ? '' : 'rotate-180'
                          }`}
                          aria-hidden="true"
                        >
                          expand_more
                        </span>
                      </button>

                      {!isCollapsed && (
                        <div id={groupId} className="flex flex-col gap-0.5 mt-0.5 pl-1.5 border-l-2 border-hairline ml-2">
                          {items.map((item, itemIndex) => (
                            <NavLink
                              key={item.id}
                              to={item.path}
                              data-tour={groupIndex === 0 && itemIndex === 0 ? TOUR_ANCHOR.sidebarPrimary : undefined}
                              end={item.path === '/academic'}
                              onClick={() => {
                                if (window.innerWidth < 1024) handleClose()
                              }}
                              className={({ isActive }) => {
                                const active = isActive || isWorkspaceSubrouteActive(item.path, location.pathname)
                                return `group flex items-center justify-between px-2.5 py-2 min-h-[40px] rounded-lg text-xs font-medium transition-all duration-150 motion-reduce:transition-none ${
                                  active
                                    ? 'bg-primary-subtle text-primary font-semibold shadow-xs'
                                    : 'text-ink-muted hover:text-ink hover:bg-canvas'
                                }`
                              }}
                            >
                              {({ isActive }) => {
                                const active = isActive || isWorkspaceSubrouteActive(item.path, location.pathname)
                                return (
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span
                                      className={`material-symbols-outlined text-[18px] shrink-0 ${active ? 'text-primary' : 'text-ink-muted'}`}
                                      aria-hidden="true"
                                    >
                                      {item.icon}
                                    </span>
                                    <span className="truncate" title={item.title}>{item.title}</span>
                                    {item.id === 'chat' && chatUnread > 0 && (
                                      <span className="shrink-0 rounded-full bg-primary px-2 text-xs text-white" aria-label={`${chatUnread} tin nhắn chưa đọc`}>
                                        {chatUnread > 99 ? '99+' : chatUnread}
                                      </span>
                                    )}
                                  </div>
                                )
                              }}
                            </NavLink>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Ungrouped routes remain visible for dual-role identities and shared account section. */}
                {Array.from(new Set(remainingItems.map((item) => item.section))).map((section) => {
                  const items = remainingItems.filter((item) => item.section === section)
                  return <div key={section} className="mt-2 pt-2 border-t border-hairline flex flex-col gap-0.5">
                    <div className="flex items-center justify-between px-2 py-1 text-xs font-bold text-ink-soft">
                      <span>{section === 'account' ? 'Tài khoản và lịch' : sectionLabels[section]}</span>
                      <span className="shrink-0 rounded-full bg-canvas border border-hairline px-1.5 py-0.5 text-xs font-semibold text-ink-soft">{items.length}</span>
                    </div>
                    <div className="flex flex-col gap-0.5 pl-1.5 border-l-2 border-hairline ml-2">
                      {items.map((item) => (
                        <NavLink key={item.id} to={item.path} end={item.path === '/academic'} onClick={() => { if (window.innerWidth < 1024) handleClose() }} className={({ isActive }) => {
                          const active = isActive || isWorkspaceSubrouteActive(item.path, location.pathname)
                          return `flex items-center justify-between px-2.5 py-2 min-h-[40px] rounded-lg text-xs font-medium transition-all duration-150 motion-reduce:transition-none ${active ? 'bg-primary-subtle text-primary font-semibold shadow-xs' : 'text-ink-muted hover:text-ink hover:bg-canvas'}`
                        }}>
                          {({ isActive }) => {
                            const active = isActive || isWorkspaceSubrouteActive(item.path, location.pathname)
                            return (
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className={`material-symbols-outlined text-[18px] shrink-0 ${active ? 'text-primary' : 'text-ink-muted'}`} aria-hidden="true">{item.icon}</span>
                                <span className="truncate" title={item.title}>{item.title}</span>
                              </div>
                            )
                          }}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                })}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {Array.from(new Set(navigationItems.map((item) => item.section))).map((section, sectionIdx) => {
                  const items = navigationItems.filter((item) => item.section === section)
                  return (
                    <div key={section} className={`flex flex-col gap-0.5 ${sectionIdx > 0 ? 'mt-1 pt-2 border-t border-hairline' : ''}`}>
                      <div className="flex items-center justify-between px-2 py-1.5 text-xs font-bold text-ink-soft">
                        <span>{sectionLabels[section]}</span>
                        <span className="shrink-0 rounded-full bg-canvas border border-hairline px-1.5 py-0.5 text-xs font-semibold text-ink-soft">{items.length}</span>
                      </div>
                      <div className="flex flex-col gap-0.5 pl-1.5 border-l-2 border-hairline ml-2">
                        {items.map((item, itemIdx) => (
                          <NavLink
                            key={item.id}
                            to={item.path}
                            data-tour={sectionIdx === 0 && itemIdx === 0 ? TOUR_ANCHOR.sidebarPrimary : undefined}
                            end={item.path === '/academic'}
                            onClick={() => {
                              if (window.innerWidth < 1024) handleClose()
                            }}
                            className={({ isActive }) => {
                              const active = isActive || isWorkspaceSubrouteActive(item.path, location.pathname)
                              return `flex items-center justify-between px-2.5 py-2 min-h-[40px] rounded-lg text-xs font-medium transition-all duration-150 motion-reduce:transition-none ${
                                active
                                  ? 'bg-primary-subtle text-primary font-semibold shadow-xs'
                                  : 'text-ink-muted hover:text-ink hover:bg-canvas'
                              }`
                            }}
                          >
                            {({ isActive }) => {
                              const active = isActive || isWorkspaceSubrouteActive(item.path, location.pathname)
                              return (
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span
                                    className={`material-symbols-outlined text-[18px] shrink-0 ${active ? 'text-primary' : 'text-ink-muted'}`}
                                    aria-hidden="true"
                                  >
                                    {item.icon}
                                  </span>
                                  <span className="truncate" title={item.title}>{item.title}</span>
                                  {item.id === 'chat' && chatUnread > 0 && <span className="shrink-0 rounded-full bg-primary px-2 text-xs text-white" aria-label={`${chatUnread} tin nhắn chưa đọc`}>{chatUnread > 99 ? '99+' : chatUnread}</span>}
                                </div>
                              )
                            }}
                          </NavLink>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </nav>
        </div>

        {/* Bottom Profile Footer (Student Baseline for Batch 0-2) */}
        <div data-tour={TOUR_ANCHOR.profile} className="p-3 border-t border-hairline bg-card flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-full bg-canvas border border-line-strong flex items-center justify-center font-heading font-bold text-xs text-ink-soft relative shrink-0">
              <SelfAvatarImage key={session?.user.id} userId={session?.user.id} initials={profileInitials} />
              <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ring-2 ring-card ${session ? 'bg-academic-emerald' : 'bg-line-strong'}`} />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[12px] font-semibold text-ink truncate" title={profileName}>
                {profileName}
              </span>
              <span className="font-mono text-xs text-ink-muted truncate" title={profileCode}>
                {profileCode}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            aria-label="Đăng xuất"
            title="Đăng xuất / Chuyển tài khoản"
            className="min-h-[44px] min-w-[44px] p-1.5 text-ink-soft hover:text-ink hover:bg-canvas rounded-md transition-colors shrink-0 flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">logout</span>
          </button>
        </div>
      </aside>
    </>
  )
}
