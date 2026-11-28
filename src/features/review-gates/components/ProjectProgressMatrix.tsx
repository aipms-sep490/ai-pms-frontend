import { useMemo, useState } from 'react'
import type { GateStatus, ProjectReviewMatrixRow } from '../types/review-gates.types'
import { Table, TableHead } from '../../../components/ui/Table'
import { FilterToolbar, type ActiveFilterChip } from '../../../components/ui/FilterToolbar'
import { Modal } from '../../../components/ui/Modal'
import { Pagination } from '../../../components/ui/Pagination'
import { useClientPagination } from '../../../components/ui/useClientPagination'
import { WorkspaceEmptyState } from '../../../components/ui/WorkspaceState'
import { GateCoordinationDrawer } from './GateCoordinationDrawer'

interface ProjectProgressMatrixProps {
  projects: ProjectReviewMatrixRow[]
  onUpdateDecision: (
    projectId: string,
    gateCode: string,
    newStatus: 'PASSED' | 'REVISION_REQUIRED' | 'IN_REVIEW',
  ) => Promise<void> | void
  onSelectHybridProject?: (projectId: string) => void
  onSelectProject?: (projectId: string) => void
  onRefreshMatrix?: () => Promise<void> | void
}

const statusPillClasses: Record<GateStatus, string> = {
  PASSED: 'bg-status-success-bg text-status-success-text border-status-success-border',
  REVISION_REQUIRED: 'bg-status-error-bg text-status-error-text border-status-error-border font-bold',
  FAILED: 'bg-status-error-bg text-status-error-text border-status-error-border font-bold',
  IN_REVIEW: 'bg-primary-subtle text-primary border-primary/20',
  PLANNED: 'bg-status-warning-bg text-status-warning-text border-status-warning-border',
  LOCKED: 'bg-canvas text-ink-muted border-hairline',
}

const statusLabels: Record<GateStatus, string> = {
  PASSED: 'Đạt',
  REVISION_REQUIRED: 'Cần chỉnh sửa',
  FAILED: 'Không đạt',
  IN_REVIEW: 'Đang xét',
  PLANNED: 'Kế hoạch',
  LOCKED: 'Chưa mở',
}

type MatrixStatusFilter = 'ALL' | 'REVISION_REQUIRED' | 'IN_REVIEW' | 'ALL_PASSED'

export function ProjectProgressMatrix({
  projects,
  onSelectHybridProject,
  onSelectProject,
  onRefreshMatrix,
}: ProjectProgressMatrixProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<MatrixStatusFilter>('ALL')
  const [filterMode, setFilterMode] = useState<string>('ALL')
  const [inspectingProject, setInspectingProject] = useState<ProjectReviewMatrixRow | null>(null)

  const revisionCount = useMemo(
    () => projects.filter(p => Object.values(p.gateStatuses).includes('REVISION_REQUIRED')).length,
    [projects],
  )
  const inReviewCount = useMemo(
    () => projects.filter(p => Object.values(p.gateStatuses).includes('IN_REVIEW')).length,
    [projects],
  )
  const allPassedCount = useMemo(
    () => projects.filter(p => {
      const values = Object.values(p.gateStatuses)
      return values.length > 0 && values.every(s => s === 'PASSED')
    }).length,
    [projects],
  )

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase()
    return projects.filter(p => {
      if (filterMode !== 'ALL' && p.mode !== filterMode) return false
      if (statusFilter === 'REVISION_REQUIRED' && !Object.values(p.gateStatuses).includes('REVISION_REQUIRED')) return false
      if (statusFilter === 'IN_REVIEW' && !Object.values(p.gateStatuses).includes('IN_REVIEW')) return false
      if (statusFilter === 'ALL_PASSED') {
        const vals = Object.values(p.gateStatuses)
        if (!vals.length || !vals.every(s => s === 'PASSED')) return false
      }
      if (q && !`${p.projectCode ?? ''} ${p.projectName} ${p.major}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [projects, filterMode, statusFilter, search])

  const matrixPager = useClientPagination(filteredProjects, 10)

  const hasActiveFilters = Boolean(search.trim() || statusFilter !== 'ALL' || filterMode !== 'ALL')
  const activeChips: ActiveFilterChip[] = []
  if (statusFilter !== 'ALL') {
    const statusChipLabel: Record<Exclude<MatrixStatusFilter, 'ALL'>, string> = {
      REVISION_REQUIRED: 'Cần chỉnh sửa',
      IN_REVIEW: 'Đang thẩm định',
      ALL_PASSED: 'Đạt toàn bộ cổng',
    }
    activeChips.push({ id: 'status', label: 'Trạng thái', value: statusChipLabel[statusFilter] })
  }
  if (filterMode !== 'ALL') {
    activeChips.push({ id: 'mode', label: 'Chế độ', value: filterMode === 'SINGLE_MAJOR' ? 'Đơn ngành' : 'Liên ngành' })
  }

  const allGateCodes = Array.from(
    new Set(projects.flatMap(p => Object.keys(p.gateStatuses))),
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  const displayGateCodes = allGateCodes.length > 0 ? allGateCodes : ['R1', 'R2', 'R3', 'R4']

  return (
    <div className="space-y-5">
      {/* KPI Cards Bar */}
      <div className="grid grid-cols-2 items-stretch gap-4 sm:grid-cols-4">
        <div className="flex h-full flex-col justify-between rounded-xl border border-hairline bg-card p-4 shadow-2xs">
          <span className="text-xs font-semibold text-ink-muted">Tổng số đồ án</span>
          <p className="mt-1 text-2xl font-black text-ink">{projects.length}</p>
        </div>
        <div className="flex h-full flex-col justify-between rounded-xl border border-hairline border-l-4 border-l-status-error-text bg-card p-4 shadow-2xs">
          <span className="text-xs font-semibold text-status-error-text">Cần chỉnh sửa thẩm định</span>
          <p className="mt-1 text-2xl font-black text-status-error-text">{revisionCount}</p>
        </div>
        <div className="flex h-full flex-col justify-between rounded-xl border border-hairline border-l-4 border-l-primary bg-card p-4 shadow-2xs">
          <span className="text-xs font-semibold text-primary">Đang thẩm định</span>
          <p className="mt-1 text-2xl font-black text-primary">{inReviewCount}</p>
        </div>
        <div className="flex h-full flex-col justify-between rounded-xl border border-hairline bg-card p-4 shadow-2xs">
          <span className="text-xs font-semibold text-ink-muted">Đồ án liên ngành</span>
          <p className="mt-1 text-2xl font-black text-primary">
            {projects.filter(p => p.mode === 'INTERDISCIPLINARY').length}
          </p>
        </div>
      </div>

      {/* Matrix Table Section */}
      <div className="rounded-xl border border-hairline bg-card shadow-xs">
        <div className="border-b border-hairline p-4 space-y-3">
          <div>
            <h3 className="text-sm font-bold text-ink">Ma trận tiến trình các đồ án</h3>
            <p className="text-xs text-ink-muted">
              Nhấp vào từng đồ án để xem quyết định thẩm định và nguyên nhân bị chặn.
            </p>
          </div>
          <FilterToolbar
            embedded
            search={search}
            onSearchChange={setSearch}
            searchLabel="Tìm đồ án trong ma trận"
            searchPlaceholder="Tìm theo mã, tên đồ án hoặc chuyên ngành..."
            debounceMs={0}
            tabs={[
              { value: 'ALL', label: 'Tất cả', count: projects.length },
              { value: 'REVISION_REQUIRED', label: 'Cần chỉnh sửa', count: revisionCount },
              { value: 'IN_REVIEW', label: 'Đang thẩm định', count: inReviewCount },
              { value: 'ALL_PASSED', label: 'Đạt tất cả cổng', count: allPassedCount },
            ]}
            activeTab={statusFilter}
            onTabChange={v => setStatusFilter(v as MatrixStatusFilter)}
            tabsLabel="Lọc ma trận theo trạng thái cổng"
            controls={
              <label htmlFor="matrix-mode-select" className="ft-select-wrap">
                <span className="sr-only">Chế độ đồ án</span>
                <select
                  id="matrix-mode-select"
                  value={filterMode}
                  onChange={e => setFilterMode(e.target.value)}
                  className="ft-select"
                >
                  <option value="ALL">Tất cả chế độ</option>
                  <option value="SINGLE_MAJOR">Đơn ngành</option>
                  <option value="INTERDISCIPLINARY">Liên ngành</option>
                </select>
              </label>
            }
            activeChips={activeChips}
            onRemoveChip={id => {
              if (id === 'status') setStatusFilter('ALL')
              if (id === 'mode') setFilterMode('ALL')
            }}
            onClearAll={() => {
              setSearch('')
              setStatusFilter('ALL')
              setFilterMode('ALL')
            }}
            hasActiveFilters={hasActiveFilters}
            resultSummary={`Hiển thị ${filteredProjects.length}/${projects.length} đồ án`}
            pagination={matrixPager.showPagination ? { page: matrixPager.page, pages: matrixPager.pages, total: matrixPager.total, pageSize: matrixPager.pageSize, onPage: matrixPager.setPage } : undefined}
          />
        </div>

        {filteredProjects.length === 0 ? (
          <div className="p-6">
            <WorkspaceEmptyState
              title={hasActiveFilters ? 'Không tìm thấy đồ án khớp bộ lọc' : 'Chưa có đồ án trong ma trận tiến độ'}
              message={hasActiveFilters ? 'Thử thay đổi từ khóa hoặc xóa bộ lọc hiện tại.' : 'Các đồ án đang triển khai sẽ xuất hiện tại đây khi cổng kiểm duyệt được kích hoạt.'}
            />
          </div>
        ) : (
        <div className="overflow-x-auto">
          <Table className="w-full min-w-[780px] text-left text-xs">
            <TableHead className="font-semibold uppercase tracking-wider text-ink">
              <tr>
                <th className="px-4 py-3">Mã / Tên đồ án</th>
                <th className="px-4 py-3">Chuyên ngành / Hình thức</th>
                {displayGateCodes.map(code => (
                  <th key={code} className="px-3 py-3 text-center whitespace-nowrap">{code}</th>
                ))}
                <th className="px-4 py-3 whitespace-nowrap">Tiến độ công việc*</th>
              </tr>
            </TableHead>
            <tbody className="divide-y divide-hairline text-ink-soft">
              {matrixPager.paginatedItems.map(proj => {
                const projectDisplayCode = proj.projectCode ?? proj.projectId
                return (
                  <tr
                    key={proj.projectId}
                    onClick={() => {
                      setInspectingProject(proj)
                      if (onSelectProject) onSelectProject(proj.projectId)
                    }}
                    className="cursor-pointer transition-colors hover:bg-canvas"
                  >
                    <td className="px-4 py-3.5">
                      <button type="button" aria-label={`Xem ma trận đồ án ${proj.projectName}`} className="block min-h-10 text-left focus-visible:rounded focus-visible:outline-2 focus-visible:outline-primary">
                        <strong className="block font-bold text-primary">{projectDisplayCode}</strong>
                        <span className="text-xs font-medium text-ink-soft">{proj.projectName}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="block font-semibold text-ink">{proj.major}</span>
                      <span className="text-xs font-bold uppercase text-ink-muted">
                        {proj.mode === 'SINGLE_MAJOR' ? 'Đơn ngành' : 'Liên ngành'}
                      </span>
                    </td>
                    {displayGateCodes.map(code => {
                      const st = proj.gateStatuses[code]
                      return (
                        <td key={code} className="px-3 py-3.5 text-center">
                          {st ? (
                            <span
                              className={`inline-block whitespace-nowrap rounded-full border border-l-4 px-2.5 py-0.5 text-xs font-bold ${
                                statusPillClasses[st] || 'border-hairline bg-canvas text-ink-muted'
                              }`}
                            >
                              {statusLabels[st] ?? 'Chưa xác định'}
                            </span>
                          ) : (
                            <span className="text-ink-muted" title="Không có cổng trong bản ghi ma trận">—</span>
                          )}
                        </td>
                      )
                    })}
                    <td className="min-w-[140px] px-4 py-3.5">
                      {proj.hasTasks === false ? <span className="text-xs text-ink-muted">Chưa có công việc</span> : <div className="flex items-center gap-2">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-hairline">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${proj.taskProgress}%` }}
                          />
                        </div>
                        <span className="shrink-0 text-xs font-bold tabular-nums text-ink-soft">{new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(proj.taskProgress)}%</span>
                      </div>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        </div>
        )}
        {matrixPager.showPagination && (
          <div className="border-t border-hairline px-4 py-3">
            <Pagination
              page={matrixPager.page}
              pages={matrixPager.pages}
              total={matrixPager.total}
              pageSize={matrixPager.pageSize}
              onPage={matrixPager.setPage}
              onPageSizeChange={matrixPager.setPageSize}
            />
          </div>
        )}
        <p className="border-t border-hairline p-3 text-xs text-ink-muted">
          * Tiến độ công việc (%) là số liệu quản lý nội bộ; không thay thế quyết định thẩm định chính thức của người chấm.
        </p>
      </div>

      {/* Inspecting Project Drawer */}
      {inspectingProject && (
        <Modal
          open
          drawer
          title={inspectingProject.projectName}
          onClose={() => setInspectingProject(null)}
        >
          <div className="space-y-4 text-xs">
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-primary">
              {inspectingProject.projectCode ?? inspectingProject.projectId} · {inspectingProject.major}
            </p>
            <div>
              <h4 className="font-bold text-ink-soft">Trạng thái các đợt cổng kiểm duyệt</h4>
              <div className="mt-2 space-y-1.5">
                {Object.entries(inspectingProject.gateStatuses).map(([code, st]) => (
                  <div
                    key={code}
                    className="flex items-center justify-between rounded-lg border border-hairline bg-canvas p-2.5"
                  >
                    <span className="font-bold text-ink">{code}</span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-bold ${
                        statusPillClasses[st]
                      }`}
                    >
                      {statusLabels[st]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Blockers Explanation */}
            {inspectingProject.blockingReasons && (
              <div className="rounded-lg border border-status-warning-border bg-status-warning-bg p-3.5 text-status-warning-text">
                <strong className="block font-bold">Lý do chưa đạt / Kiến nghị của Reviewer:</strong>
                {Object.entries(inspectingProject.blockingReasons).map(([code, reasons]) => (
                  <ul key={code} className="mt-1 list-disc pl-4 space-y-1 text-xs text-status-warning-text">
                    {reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                ))}
              </div>
            )}

            {/* Governance Coordination Drawer (TK-W2-08): Reviewer Assignment, 2-Dept Consensus & Lead Override */}
            <div className="rounded-lg border border-hairline bg-canvas p-3.5 space-y-2">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-ink-muted">visibility</span>
                <strong className="block text-xs font-bold text-ink">
                  Giám sát &amp; Điều phối Tiến trình Thẩm định
                </strong>
              </div>
              <p className="text-xs text-ink-soft">
                Khoa phân công 2 phản biện cố định, theo dõi đồng thuận liên ngành và thực hiện Hòa giải/Mở lại cổng (chỉ Khoa Chủ trì) ngay bên dưới.
              </p>
            </div>
            <GateCoordinationDrawer project={inspectingProject} onChanged={onRefreshMatrix} />

            {inspectingProject.mode === 'INTERDISCIPLINARY' && onSelectHybridProject && (
              <button
                type="button"
                onClick={() => {
                  onSelectHybridProject(inspectingProject.projectId)
                  setInspectingProject(null)
                }}
                className="w-full rounded-lg border border-primary/30 bg-primary-subtle py-2 text-xs font-bold text-primary hover:bg-primary/20"
              >
                Mở bảng kiểm duyệt liên ngành →
              </button>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
