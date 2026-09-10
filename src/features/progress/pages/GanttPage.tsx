import { useState, useMemo } from 'react'
import type { MajorType } from '../../../components/ui/MultidisciplinaryTag'
import type { GanttViewMode, GanttFilterState } from '../types/gantt.types'
import {
  wbsGroupsPreview,
  ganttTelemetryPreview,
} from '../fixtures/gantt-preview'
import { filterWbsGroups } from '../utils/filter-gantt-tasks'
import { GanttHeader } from '../components/GanttHeader'
import { GanttChart } from '../components/GanttChart'

const MAJOR_FILTERS: readonly { id: 'all' | MajorType; label: string; tag?: MajorType }[] = [
  { id: 'all', label: 'Tất cả chuyên ngành' },
  { id: 'SE', label: 'Kỹ thuật Phần mềm [SE]', tag: 'SE' },
  { id: 'UI/UX', label: 'Thiết kế UI/UX [UI/UX]', tag: 'UI/UX' },
  { id: 'AI', label: 'Trí tuệ Nhân tạo [AI]', tag: 'AI' },
  { id: 'QA', label: 'Đảm bảo Chất lượng [QA]', tag: 'QA' },
]

export function GanttPage() {
  const [viewMode, setViewMode] = useState<GanttViewMode>('weeks')
  const [onlyCritical, setOnlyCritical] = useState<boolean>(false)
  const [majorFilter, setMajorFilter] = useState<'all' | MajorType>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Default: Only active milestone group M3 ('wbs-3') is open!
  const [userExpandedGroupIds, setUserExpandedGroupIds] = useState<Set<string>>(
    () => new Set(['wbs-3'])
  )

  const filterState: GanttFilterState = useMemo(
    () => ({
      onlyCritical,
      majorFilter,
      searchQuery,
    }),
    [onlyCritical, majorFilter, searchQuery]
  )

  const filteredGroups = useMemo(
    () => filterWbsGroups(wbsGroupsPreview, filterState),
    [filterState]
  )

  // Auto-expand all matching groups when search or filter is active
  const isFiltering = Boolean(
    searchQuery.trim() !== '' || onlyCritical || majorFilter !== 'all'
  )

  const effectiveExpandedGroupIds = useMemo(() => {
    if (isFiltering) {
      return new Set(filteredGroups.map((g) => g.id))
    }
    return userExpandedGroupIds
  }, [isFiltering, filteredGroups, userExpandedGroupIds])

  const handleToggleGroup = (groupId: string) => {
    setUserExpandedGroupIds((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }

  const handleExpandAll = () => {
    setUserExpandedGroupIds(new Set(wbsGroupsPreview.map((g) => g.id)))
  }

  const handleCollapseAll = () => {
    setUserExpandedGroupIds(new Set())
  }

  return (
    <div className="space-y-4">
      {/* Gantt Header & Compact Telemetry Summary */}
      <GanttHeader
        telemetry={ganttTelemetryPreview}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Integrated Filter Toolbar Directly Above Chart */}
      <div className="p-3 rounded-lg border border-slate-200 bg-white shadow-xs space-y-2.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo mã tác vụ, tên hoặc người phụ trách..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Critical Path Toggle & Expand All Quick Action */}
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-xs font-semibold text-rose-700">
              <input
                type="checkbox"
                checked={onlyCritical}
                onChange={(e) => setOnlyCritical(e.target.checked)}
                className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
              />
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-rose-600">
                  priority_high
                </span>
                Chỉ xem đường găng (Critical Path)
              </span>
            </label>

            <div className="h-4 w-px bg-slate-200" />

            <div className="flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={handleExpandAll}
                className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
              >
                Mở rộng tất cả
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={handleCollapseAll}
                className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
              >
                Thu gọn tất cả
              </button>
            </div>
          </div>
        </div>

        {/* Major Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <span className="text-xs font-medium text-slate-500 mr-1">
            Lọc theo ngành:
          </span>
          {MAJOR_FILTERS.map((item) => {
            const isActive = majorFilter === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setMajorFilter(item.id)}
                aria-label={item.label}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Gantt Chart Table & Timeline */}
      <GanttChart
        groups={filteredGroups}
        currentWeek={ganttTelemetryPreview.currentWeek}
        viewMode={viewMode}
        expandedGroupIds={effectiveExpandedGroupIds}
        onToggleGroup={handleToggleGroup}
      />
    </div>
  )
}
export default GanttPage

