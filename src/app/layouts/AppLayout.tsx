import { NavLink, Outlet } from 'react-router-dom'
import { APP_DESCRIPTION, APP_NAME } from '../../constants/app.constants'
import './app-layout.css'

const navigation = [
  { to: '/', label: 'Architecture', end: true },
  { to: '/projects/lifecycle', label: 'Project lifecycle' },
]

export function AppLayout() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">AI</span>
          <span>
            <strong>{APP_NAME}</strong>
            <small>Project Management</small>
          </span>
        </div>

        <nav className="main-navigation" aria-label="Main navigation">
          <p className="navigation-label">Foundation</p>
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              <span className="nav-dot" aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-note">
          <span className="status-dot" aria-hidden="true" />
          <span>
            <strong>Sprint 0</strong>
            <small>Architecture baseline</small>
          </span>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <p>{APP_DESCRIPTION}</p>
          <span className="version-badge">v0.1 foundation</span>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
