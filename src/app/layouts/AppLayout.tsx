import { useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopHeader } from './TopHeader'

export function AppLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const hamburgerTriggerRef = useRef<HTMLButtonElement | null>(null)

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-canvas text-slate-900 flex font-sans antialiased">
      {/* 1. Sidebar Rail & Mobile Drawer */}
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={closeMobileMenu}
        triggerRef={hamburgerTriggerRef}
      />

      {/* 2. Main Workspace Canvas */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen lg:pl-60 bg-canvas">
        {/* Sticky Top Header Bar */}
        <TopHeader
          isMobileMenuOpen={isMobileMenuOpen}
          onToggleMobileMenu={toggleMobileMenu}
          triggerRef={hamburgerTriggerRef}
        />

        {/* Page Content Outlet */}
        <main className="flex-1 p-4 md:p-6 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
