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
        <nav aria-label="Các nghiệp vụ của đồ án" className="mb-5 space-y-2.5 rounded-xl border border-hairline bg-card p-3.5 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
              <span className="rounded-md bg-primary-subtle px-2 py-0.5 font-mono text-xs font-bold text-primary">#{projectId}</span>
              Đồ án #{projectId}
            </span>
            <Link to="/department/portfolio" className="inline-flex min-h-11 items-center rounded-lg px-2.5 font-semibold text-primary underline-offset-4 transition-colors hover:bg-primary-subtle hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              Danh mục đồ án
            </Link>
          </div>

          {/* Mobile compact select */}
          <label className="block space-y-1.5 md:hidden">
            <span className="text-sm font-semibold text-ink-soft">Chọn nghiệp vụ của đồ án</span>
            <select
              className="min-h-11 w-full rounded-lg border border-hairline bg-canvas px-3 text-sm font-normal text-ink transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              value={selected}
              onChange={event => navigate(event.target.value)}
            >
              <option value="" disabled>Chọn nghiệp vụ</option>
              {allLinks.map(([title, to]) => (
                <option key={to} value={to}>{title}</option>
              ))}
            </select>
          </label>

          <div className="hidden flex-wrap items-center gap-1.5 md:flex">
            {primaryLinks.map(([title, to]) => (
              <NavLink
                key={to}
                to={to}
                end
                className={({ isActive }) =>
                  `inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-lg border px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    isActive ? 'border-primary/20 bg-primary-subtle text-primary' : 'border-transparent text-ink-soft hover:bg-primary-subtle hover:text-primary'
                  }`
                }
              >
                {title}
              </NavLink>
            ))}

            {/* Secondary dropdown */}
            <div className="relative shrink-0" ref={dropdownRef} onKeyDown={event => {
              if (event.key === 'Escape') {
                setMoreOpen(false)
                dropdownRef.current?.querySelector('button')?.focus()
              }
            }}>
              <button
                type="button"
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                onClick={() => setMoreOpen(prev => !prev)}
                className={`inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  activeSecondary || moreOpen
                    ? 'border-primary/20 bg-primary-subtle text-primary'
                    : 'border-transparent text-ink-soft hover:bg-primary-subtle hover:text-primary'
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
                  className="absolute right-0 top-full z-30 mt-1 min-w-[14rem] rounded-xl border border-hairline bg-card p-1.5 shadow-lg"
                >
                  {secondaryLinks.map(([title, to]) => (
                    <NavLink
                      key={to}
                      to={to}
                      end
                      role="menuitem"
                      onClick={() => setMoreOpen(false)}
                      className={({ isActive }) =>
                        `flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary ${
                          isActive
                            ? 'bg-primary-subtle text-primary'
                            : 'text-ink-soft hover:bg-primary-subtle hover:text-primary'
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
