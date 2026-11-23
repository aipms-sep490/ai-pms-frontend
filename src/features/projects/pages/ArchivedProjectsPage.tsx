import { displayLabel } from '../../../components/ui/display-label'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getWorkspaceRole } from '../../auth/utils/role-access'
import { useAuthSession } from '../../auth/context/useAuthSession'
import { getPortfolioDashboard, type PortfolioDashboard } from '../../dashboard/api/dashboard-api'
import { HttpError } from '../../../services/http/http-client'
import { Button } from '../../../components/ui/Button'
import { FilterToolbar } from '../../../components/ui/FilterToolbar'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { buttonClassName } from '../../../components/ui/button-styles'

type SortKey = 'code' | 'title'

export function ArchivedProjectsPage() {
  const { session } = useAuthSession()
  const scope = getWorkspaceRole(session?.user) === 'admin' ? 'admin' : 'department'
  const [data, setData] = useState<PortfolioDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState<SortKey>('code')

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

  const departments = useMemo(() => {
    const names = new Set<string>()
    for (const p of data?.projects.items ?? []) {
      if (p.departmentName) names.add(p.departmentName)
    }
    return [...names].sort((a, b) => a.localeCompare(b, 'vi'))
  }, [data?.projects.items])

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = (data?.projects.items ?? []).filter((p) => {
      if (deptFilter !== 'ALL' && p.departmentName !== deptFilter) return false
      if (!q) return true
      return p.code.toLowerCase().includes(q)
        || p.title.toLowerCase().includes(q)
        || (p.supervisor?.name ?? '').toLowerCase().includes(q)
    })
    return [...list].sort((a, b) => sortBy === 'title' ? a.title.localeCompare(b.title, 'vi') : a.code.localeCompare(b.code, 'vi'))
  }, [data?.projects.items, deptFilter, search, sortBy])

  const activeChips = [
    ...(search.trim() ? [{ id: 'search', label: 'Từ khóa', value: search.trim() }] : []),
    ...(deptFilter !== 'ALL' ? [{ id: 'dept', label: 'Bộ môn', value: deptFilter }] : []),
  ]

  const clearFilters = () => { setSearch(''); setDeptFilter('ALL'); setSortBy('code') }

  return (
    <WorkspacePage
      size="wide"
      className="space-y-5 pb-12"
      eyebrow={scope === 'admin' ? 'Phạm vi quản trị' : 'Phạm vi bộ môn'}
      title="Kho lưu trữ đồ án"
      description="Tra cứu các đồ án đã đưa vào kho. Nội dung chỉ được xem và hiển thị theo quyền của tài khoản hiện tại."
      backTo={scope === 'admin' ? '/admin/portfolio' : '/department/portfolio'}
      backLabel="Quay lại danh mục"
      action={<Button variant="secondary" icon="refresh" disabled={loading} onClick={() => void load()}>Tải lại</Button>}
    >
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
        <section className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs">
          <div className="border-b border-hairline px-5 py-4">
            <p className="text-sm font-semibold text-ink-soft">{data.projects.totalCount} đồ án đã lưu trữ trong phạm vi hiện tại.</p>
          </div>
          {data.projects.items.length > 0 && (
            <FilterToolbar
              embedded
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Tìm mã đồ án, tên đề tài hoặc GVHD…"
              searchLabel="Tìm đồ án lưu trữ"
              controls={
                departments.length > 1 ? (
                  <label className="ft-select-wrap">
                    <span className="sr-only">Bộ môn</span>
                    <select aria-label="Bộ môn" value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="ft-select">
                      <option value="ALL">Tất cả bộ môn</option>
                      {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </label>
                ) : undefined
              }
              sort={{
                value: sortBy,
                onChange: (val) => setSortBy(val as SortKey),
                options: [
                  { value: 'code', label: 'Mã đồ án A–Z' },
                  { value: 'title', label: 'Tên đề tài A–Z' },
                ],
              }}
              activeChips={activeChips}
              onRemoveChip={(id) => { if (id === 'search') setSearch(''); if (id === 'dept') setDeptFilter('ALL') }}
              onClearAll={clearFilters}
              hasActiveFilters={activeChips.length > 0}
              resultSummary={activeChips.length > 0 ? `Hiển thị ${filteredItems.length} / ${data.projects.items.length} đồ án` : undefined}
            />
          )}
          <div className="p-5">
            {data.projects.items.length === 0 ? (
              <p className="rounded-lg border border-dashed border-hairline bg-canvas p-6 text-center text-sm text-ink-muted">
                Chưa có đồ án nào được chuyển vào kho lưu trữ trong phạm vi của bạn.
              </p>
            ) : filteredItems.length === 0 ? (
              <div className="rounded-lg border border-dashed border-hairline bg-canvas p-6 text-center text-sm text-ink-muted">
                <p>Không có đồ án lưu trữ nào khớp bộ lọc.</p>
                <Button variant="secondary" className="mt-3" onClick={clearFilters}>Xóa bộ lọc</Button>
              </div>
            ) : (
              <ul className="divide-y divide-hairline">
                {filteredItems.map((project) => (
                  <li key={project.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-ink">{project.code} · {project.title}</p>
                        <StatusBadge tone="neutral" label={displayLabel(project.status)} />
                      </div>
                      <p className="mt-1 text-xs text-ink-muted">
                        {[project.departmentName, project.supervisor?.name ? `GVHD: ${project.supervisor.name}` : null].filter(Boolean).join(' · ') || 'Hồ sơ lưu trữ chỉ xem'}
                      </p>
                    </div>
                    <Link to={`/department/projects/${project.id}/archive-view`} className={buttonClassName({ variant: 'secondary', size: 'sm', className: 'min-h-11' })}>
                      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">visibility</span>Xem chi tiết
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </WorkspacePage>
  )
}
