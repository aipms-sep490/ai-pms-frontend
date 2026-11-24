import { useCallback, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useEntranceMotion } from '../../components/ui/useEntranceMotion'
import { Sidebar } from './Sidebar'
import { TopHeader } from './TopHeader'
import { ChatDock } from '../../features/chat/ChatDock'
import { AssistantDock } from '../../features/ai/AssistantDock'
import '../../features/projects/pages/collaboration-workspace.css'
import './app-shell.css'
import '../../components/ui/workspace-page.css'
import '../../components/ui/workspace-polish.css'
import '../../components/ui/workspace-consistency.css'
import '../../components/ui/workspace-experience.css'
import { useAuthSession } from '../../features/auth/context/useAuthSession'
import { TourProvider } from '../../features/onboarding/TourProvider'

export function AppLayout() {
  const location = useLocation()
  const { session } = useAuthSession()
  const isFullPageChat = location.pathname === '/messages' || location.pathname.startsWith('/messages/') || location.pathname === '/academic/assistant'
  const isImmersiveVideoRoom = /^\/(?:project|supervisor\/projects\/\d+|mentor\/projects\/\d+\/majors\/\d+)\/meetings\/\d+\/video(?:\/|$)/.test(location.pathname)
  const entrance = useEntranceMotion<HTMLElement>(location.pathname)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try { return window.localStorage.getItem('aipms.sidebar.collapsed') === '1' } catch { return false }
  })
  const hamburgerTriggerRef = useRef<HTMLButtonElement | null>(null)

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  const toggleSidebarCollapsed = useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev
      try { window.localStorage.setItem('aipms.sidebar.collapsed', next ? '1' : '0') } catch { /* ignore storage errors */ }
      return next
    })
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'b') {
        const target = event.target as HTMLElement | null
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) return
        event.preventDefault()
        toggleSidebarCollapsed()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toggleSidebarCollapsed])

  if (isImmersiveVideoRoom) {
    return (
      <TourProvider>
        <main
          id="main-content"
          tabIndex={-1}
          data-experience="enhanced"
          className="w-full h-dvh min-h-screen overflow-hidden font-sans antialiased"
        >
          <Outlet />
        </main>
      </TourProvider>
    )
  }

  return (
    <TourProvider>
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:font-semibold focus:rounded-lg focus:shadow-md focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-primary"
    >
      Bỏ qua tới nội dung chính
    </a>
    <div className={`min-h-screen bg-canvas text-ink flex font-sans antialiased collaboration-shell ${isSidebarCollapsed ? 'is-sidebar-collapsed' : ''}`}>
      {/* 1. Sidebar Rail & Mobile Drawer */}
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={closeMobileMenu}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapsed}
        triggerRef={hamburgerTriggerRef}
      />

      {/* 2. Main Workspace Canvas */}
      <div className="app-workspace flex-1 flex flex-col min-w-0 min-h-screen bg-canvas">
        {/* Sticky Top Header Bar */}
        <TopHeader
          key={session?.user.id ?? 'anonymous'}
          isMobileMenuOpen={isMobileMenuOpen}
          onToggleMobileMenu={toggleMobileMenu}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebarCollapsed={toggleSidebarCollapsed}
          triggerRef={hamburgerTriggerRef}
        />

        {/* Page Content Outlet */}
        <main
          id="main-content"
          tabIndex={-1}
          ref={entrance}
          data-experience="enhanced"
          className={`app-page-content flex-1 ${isFullPageChat ? 'p-4 md:p-6 is-full-chat w-full' : 'px-4 py-4 sm:px-6 md:py-6 lg:px-8 pb-28 md:pb-28 max-w-[1680px] w-full mx-auto'}`}
        >
          <Outlet />
        </main>
      </div>
      <ChatDock />
      <AssistantDock />
    </div>
    </TourProvider>
  )
}
