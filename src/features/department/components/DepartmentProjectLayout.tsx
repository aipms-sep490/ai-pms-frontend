import { useState, useRef, useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'

/** Navigation discovers existing resource pages; each endpoint still authorizes access. */
export function DepartmentProjectLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const match = /^\/department\/projects\/(?:review\/)?([1-9]\d*)(?:\/|$)/.exec(pathname)
  const projectId = match?.[1]

  const primaryLinks = projectId ? [
    ['Thẩm định', `/department/projects/review/${projectId}`],
    ['Điều phối và hướng dẫn', `/department/projects/${projectId}/governance`],
    ['Phương án đánh giá', `/department/projects/${projectId}/evaluation-schemes`],
    ['Phân công người chấm', `/department/projects/${projectId}/evaluators`],
    ['Kết quả', `/department/projects/${projectId}/result`],
  ] : []

  const secondaryLinks = projectId ? [
    ['Yêu cầu bàn giao', `/department/projects/${projectId}/final-requirements`],
    ['Hồ sơ bàn giao', `/department/projects/${projectId}/final-submission`],
    ['Kho tệp', `/department/projects/${projectId}/files`],
    ['Đóng góp', `/department/projects/${projectId}/contributions`],
  ] : []

  const allLinks = [...primaryLinks, ...secondaryLinks]
  const currentPath = pathname.replace(/\/evaluations$/, '/evaluators')
  const selected = allLinks.find(([, to]) => to === currentPath)?.[1] ?? ''
  const activeSecondary = secondaryLinks.find(([, to]) => to === currentPath)

  const [moreOpen, setMoreOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMoreOpen(false)
      }
    }
    if (moreOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [moreOpen])

  return (
    <>
      {projectId && (
        <nav aria-label="Các nghiệp vụ của đồ án" className="mb-5 space-y-2 rounded-lg border border-hairline bg-card p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-semibold text-ink-soft">Đồ án #{projectId}</span>
            <Link to="/department/portfolio" className="inline-flex min-h-11 items-center font-semibold text-primary underline">
              Danh mục đồ án
            </Link>
          </div>

          {/* Mobile compact select */}
          <label className="block space-y-2 md:hidden">
            <span className="text-sm font-semibold text-ink-soft">Chọn nghiệp vụ của đồ án</span>
            <select
              className="min-h-11 w-full rounded-lg border border-hairline bg-card px-3 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              value={selected}
              onChange={event => navigate(event.target.value)}
            >
              <option value="" disabled>Chọn nghiệp vụ</option>
              {allLinks.map(([title, to]) => (
                <option key={to} value={to}>{title}</option>
              ))}
            </select>
          </label>

          {/* Desktop primary tabs + secondary dropdown - zero wrap at 1280px / 1440px */}
          <div className="hidden flex-nowrap items-center gap-1.5 overflow-x-auto md:flex">
            {primaryLinks.map(([title, to]) => (
              <NavLink
                key={to}
                to={to}
                end
                className={({ isActive }) =>
                  `inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-lg px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                    isActive ? 'bg-primary-subtle text-primary' : 'text-ink-muted hover:bg-primary-subtle hover:text-ink'
                  }`
                }
              >
                {title}
              </NavLink>
            ))}

            {/* Secondary dropdown */}
            <div className="relative shrink-0" ref={dropdownRef}>
              <button
                type="button"
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                onClick={() => setMoreOpen(prev => !prev)}
                className={`inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                  activeSecondary
                    ? 'bg-primary-subtle text-primary'
                    : 'text-ink-muted hover:bg-primary-subtle hover:text-ink'
                }`}
              >
                <span>{activeSecondary ? activeSecondary[0] : 'Thao tác khác'}</span>
                <span className="material-symbols-outlined text-base" aria-hidden="true">
                  {moreOpen ? 'arrow_drop_up' : 'arrow_drop_down'}
                </span>
              </button>

              {moreOpen && (
                <div
                  role="menu"
                  aria-label="Thao tác khác của đồ án"
                  className="absolute right-0 top-full z-30 mt-1 min-w-[14rem] rounded-lg border border-hairline bg-card p-1.5 shadow-lg"
                >
                  {secondaryLinks.map(([title, to]) => (
                    <NavLink
                      key={to}
                      to={to}
                      end
                      role="menuitem"
                      onClick={() => setMoreOpen(false)}
                      className={({ isActive }) =>
                        `flex min-h-10 items-center rounded-md px-3 text-sm font-semibold transition-colors ${
                          isActive
                            ? 'bg-primary-subtle text-primary'
                            : 'text-ink-soft hover:bg-primary-subtle hover:text-ink'
                        }`
                      }
                    >
                      {title}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          </div>
        </nav>
      )}
      <Outlet />
    </>
  )
}
