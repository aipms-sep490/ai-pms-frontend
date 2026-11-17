import { useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useEntranceMotion } from '../../components/ui/useEntranceMotion'
import { Sidebar } from './Sidebar'
import { TopHeader } from './TopHeader'
import { ChatDock } from '../../features/chat/ChatDock'
import { AssistantDock } from '../../features/ai/AssistantDock'
import '../../features/projects/pages/collaboration-workspace.css'
import '../../components/ui/workspace-page.css'
import '../../components/ui/workspace-polish.css'
import '../../components/ui/workspace-consistency.css'
import '../../components/ui/workspace-experience.css'
import { isDeferredDepartmentPath } from '../../components/ui/workspace-experience'
import { useAuthSession } from '../../features/auth/context/useAuthSession'
import { getWorkspaceRole } from '../../features/auth/utils/role-access'
import { TourProvider } from '../../features/onboarding/TourProvider'

export function AppLayout() {
  const location = useLocation()
  const { session } = useAuthSession()
  const enhanced = getWorkspaceRole(session?.user)!=='department'&&!isDeferredDepartmentPath(location.pathname)
  const entrance = useEntranceMotion<HTMLElement>(location.pathname)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const hamburgerTriggerRef = useRef<HTMLButtonElement | null>(null)

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <TourProvider>
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:font-semibold focus:rounded-lg focus:shadow-md focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-primary"
    >
      Bỏ qua tới nội dung chính
    </a>
    <div className="min-h-screen bg-canvas text-ink flex font-sans antialiased collaboration-shell">
      {/* 1. Sidebar Rail & Mobile Drawer */}
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={closeMobileMenu}
        triggerRef={hamburgerTriggerRef}
      />

      {/* 2. Main Workspace Canvas */}
      <div className="app-workspace flex-1 flex flex-col min-w-0 min-h-screen lg:pl-60 bg-canvas">
        {/* Sticky Top Header Bar */}
        <TopHeader
          key={session?.user.id ?? 'anonymous'}
          isMobileMenuOpen={isMobileMenuOpen}
          onToggleMobileMenu={toggleMobileMenu}
          triggerRef={hamburgerTriggerRef}
        />

        {/* Page Content Outlet */}
        <main id="main-content" tabIndex={-1} ref={entrance} data-experience={enhanced?'enhanced':undefined} className="app-page-content flex-1 p-4 md:p-6 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
      <ChatDock />
      <AssistantDock />
    </div>
    </TourProvider>
  )
}
