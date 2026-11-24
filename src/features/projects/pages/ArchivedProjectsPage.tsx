import { displayLabel } from '../../../components/ui/display-label'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getWorkspaceRole } from '../../auth/utils/role-access'
import { useAuthSession } from '../../auth/context/useAuthSession'
import { getPortfolioDashboard, type PortfolioDashboard } from '../../dashboard/api/dashboard-api'
import { HttpError } from '../../../services/http/http-client'
import { BackLink } from '../../../components/ui/BackLink'
import { buttonClassName } from '../../../components/ui/button-styles'
import { Pagination, StatTileRow, StatusBadge, useClientPagination } from '../../../components/ui'

export function ArchivedProjectsPage() {
  const { session } = useAuthSession()
  const scope = getWorkspaceRole(session?.user) === 'admin' ? 'admin' : 'department'
  const [data, setData] = useState<PortfolioDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await getPortfolioDashboard(scope, { status: 'ARCHIVED', page: 1, pageSize: 100 }))
      setError(null)
    } catch (reason) {
      setError(
        reason instanceof HttpError && reason.status === 403
          ? 'Bạn chưa có quyền xem kho lưu trữ này.'
          : 'Không thể tải danh sách lưu trữ. Vui lòng thử lại.'
      )
    } finally {
      setLoading(false)
    }
  }, [scope])

  useEffect(() => {
    void load()
  }, [load])

  const items = useMemo(() => data?.projects.items ?? [], [data])

  const departmentOptions = useMemo(() => {
    const names = new Set<string>()
    for (const project of items) {
      if (project.departmentName) names.add(project.departmentName)
    }
    return [...names].sort((a, b) => a.localeCompare(b, 'vi'))
  }, [items])

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return items.filter((project) => {
      if (departmentFilter && project.departmentName !== departmentFilter) return false
      if (!keyword) return true
      const haystack = [
        project.code,
        project.title,
        project.departmentName ?? '',
        project.supervisor?.name ?? '',
        ...(project.majors ?? []).map((major) => `${major.code} ${major.name}`),
      ].join(' ').toLowerCase()
      return haystack.includes(keyword)
    })
  }, [departmentFilter, items, search])

  const pagination = useClientPagination(filteredItems, 8)
  const distinctMajorsCount = useMemo(() => {
    const codes = new Set<string>()
    for (const project of items) {
      for (const major of project.majors ?? []) codes.add(major.code)
    }
    return codes.size
  }, [items])
  const hasFilters = Boolean(search.trim() || departmentFilter)

  return (
    <div className="workspace-page flex flex-col gap-5 pb-10">
      <header className="workspace-heading">
        <div className="workspace-heading-copy">
          <span className="workspace-kicker">
            {scope === 'admin' ? 'Phạm vi quản trị' : 'Phạm vi bộ môn'}
          </span>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-ink">Kho lưu trữ đồ án</h1>
          <p className="max-w-3xl text-sm leading-6 text-ink-muted">
            Tra cứu các đồ án đã đưa vào kho. Nội dung chỉ được xem và hiển thị theo quyền của tài khoản hiện tại.
          </p>
        </div>
        <BackLink fallback={scope === 'admin' ? '/admin/portfolio' : '/department/portfolio'} className={buttonClassName({ variant: 'secondary', className: 'min-h-11' })}>
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_back</span>Quay lại danh mục
        </BackLink>
      </header>

      {loading && (
        <p role="status" className="rounded-xl border border-hairline bg-card p-5 text-sm text-ink-muted">
          Đang tải kho lưu trữ…
        </p>
      )}

      {error && (
        <section role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-5 text-sm text-status-error-text">
          <p>{error}</p>
          <button type="button" className="mt-2 min-h-11 font-semibold underline underline-offset-4" onClick={() => void load()}>
            Tải lại
          </button>
        </section>
      )}

      {!loading && data && (
        <>
          <StatTileRow
            tiles={[
              {
                icon: 'inventory_2',
                label: 'Đồ án đã lưu trữ',
                value: data.projects.totalCount,
                caption: scope === 'admin' ? 'Toàn phạm vi quản trị' : 'Thuộc phạm vi bộ môn',
                hero: true,
              },
              {
                icon: 'filter_list',
                label: 'Khớp bộ lọc',
                value: filteredItems.length,
                caption: hasFilters ? 'Đang áp dụng tiêu chí tìm kiếm' : 'Hiển thị toàn bộ hồ sơ đã tải',
                tone: 'info',
              },
              {
                icon: 'apartment',
                label: 'Bộ môn',
                value: departmentOptions.length,
                caption: 'Có đồ án trong kho lưu trữ',
                tone: 'neutral',
              },
              {
                icon: 'school',
                label: 'Chuyên ngành',
                value: distinctMajorsCount,
                caption: 'Chuyên ngành xuất hiện trong kho',
                tone: 'success',
              },
            ]}
          />

          <section className="rounded-xl border border-hairline bg-card p-4 shadow-xs" aria-label="Tìm kiếm và lọc kho lưu trữ">
            <div className="flex flex-wrap items-end gap-3">
              <label className="min-w-[240px] flex-1 space-y-1.5 text-xs font-semibold text-ink-soft">
                <span>Tìm kiếm hồ sơ</span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    pagination.setPage(1)
                  }}
                  placeholder="Nhập mã, tên đề tài, GVHD hoặc chuyên ngành..."
                  className="min-h-11 w-full rounded-lg border border-line-strong bg-card px-3.5 py-2 text-sm font-normal text-ink focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </label>

              {departmentOptions.length > 0 && (
                <label className="w-full space-y-1.5 text-xs font-semibold text-ink-soft sm:w-64">
                  <span>Bộ môn</span>
                  <select
                    value={departmentFilter}
                    onChange={(event) => {
                      setDepartmentFilter(event.target.value)
                      pagination.setPage(1)
                    }}
                    className="min-h-11 w-full rounded-lg border border-line-strong bg-card px-3 py-2 text-sm font-normal text-ink focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Tất cả bộ môn</option>
                    {departmentOptions.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </label>
              )}

              {hasFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('')
                    setDepartmentFilter('')
                    pagination.setPage(1)
                  }}
                  className={buttonClassName({ variant: 'secondary', className: 'min-h-11 shrink-0' })}
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-canvas/70 px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold text-ink">Danh sách hồ sơ lưu trữ</h2>
                <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary-subtle px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums text-primary">
                  {filteredItems.length}
                </span>
              </div>
              <p className="text-xs font-medium text-ink-muted">
                {data.projects.totalCount} đồ án đã lưu trữ trong phạm vi hiện tại.
              </p>
            </div>

            {filteredItems.length === 0 ? (
              <div className="p-6">
                <p className="rounded-lg border border-dashed border-hairline bg-canvas p-6 text-center text-sm text-ink-muted">
                  {hasFilters
                    ? 'Không tìm thấy đồ án lưu trữ nào khớp với bộ lọc hiện tại.'
                    : 'Chưa có đồ án nào được chuyển vào kho lưu trữ trong phạm vi của bạn.'}
                </p>
              </div>
            ) : (
              <>
                <ul className="divide-y divide-hairline">
                  {pagination.paginatedItems.map((project) => (
                    <li key={project.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-canvas/60">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md border border-primary/20 bg-primary-subtle px-2 py-0.5 font-mono text-xs font-bold text-primary">
                            {project.code}
                          </span>
                          <StatusBadge status={project.status} tone="neutral" label={displayLabel(project.status)} />
                          {(project.majors ?? []).map((major) => (
                            <span key={major.id} className="rounded-md border border-hairline bg-canvas px-2 py-0.5 text-xs font-medium text-ink-soft">
                              {major.code}
                            </span>
                          ))}
                        </div>
                        <p className="font-semibold text-ink">{project.title}</p>
                        <p className="text-xs text-ink-muted">
                          {project.departmentName ? `Bộ môn: ${project.departmentName}` : 'Chưa có thông tin bộ môn'}
                          {project.supervisor?.name ? ` · GVHD: ${project.supervisor.name}` : ''}
                        </p>
                      </div>
                      <Link to={`/department/projects/${project.id}/archive-view`} className={buttonClassName({ variant: 'secondary', size: 'sm', className: 'min-h-11 shrink-0' })}>
                        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">visibility</span>Xem chi tiết
                      </Link>
                    </li>
                  ))}
                </ul>

                {pagination.showPagination && (
                  <div className="border-t border-hairline bg-canvas/50 px-5 py-3.5">
                    <Pagination
                      page={pagination.page}
                      pages={pagination.totalPages}
                      total={pagination.total}
                      pageSize={pagination.pageSize}
                      pageSizeOptions={[8, 16, 30]}
                      onPage={pagination.setPage}
                      onPageSizeChange={pagination.setPageSize}
                    />
                  </div>
                )}
              </>
            )}
          </section>
        </>
      )}
    </div>
  )
}
