import type { WbsGroup, GanttTask, GanttViewMode } from '../types/gantt.types'
import { GANTT_WEEKS, GANTT_MILESTONES } from '../fixtures/gantt-preview'
import { MultidisciplinaryTag } from '../../../components/ui/MultidisciplinaryTag'

interface GanttChartProps {
  groups: readonly WbsGroup[]
  currentWeek?: number
  viewMode?: GanttViewMode
  expandedGroupIds: Set<string>
  onToggleGroup: (groupId: string) => void
}

function getAssigneeDetails(fullName: string) {
  const parts = fullName.trim().split(/\s+/)
  const initials = parts.length > 0 ? parts[parts.length - 1].charAt(0).toUpperCase() : '?'
  const shortName =
    parts.length > 2
      ? `${parts[0].charAt(0)}. ${parts.slice(1).join(' ')}`
      : fullName
  return { initials, shortName }
}

export function GanttChart({
  groups,
  currentWeek = 6,
  viewMode = 'weeks',
  expandedGroupIds,
  onToggleGroup,
}: GanttChartProps) {
  if (groups.length === 0) {
    return (
      <div className="p-12 text-center border border-slate-200 rounded-lg bg-white">
        <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">
          filter_alt_off
        </span>
        <h3 className="text-sm font-semibold text-slate-800">
          Không tìm thấy công việc phù hợp
        </h3>
        <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
          Không có tác vụ nào thỏa mãn điều kiện lọc đường găng hoặc từ khóa tìm kiếm đã chọn. Vui lòng thử bỏ bộ lọc.
        </p>
      </div>
    )
  }

  const isMilestonesView = viewMode === 'milestones'

  return (
    <div className="border border-slate-200 rounded-lg bg-white shadow-xs overflow-hidden">
      {/* Scrollable Container with Sticky Left Column */}
      <div
        className="w-full overflow-x-auto focus-visible:outline-none [scrollbar-color:theme(colors.slate.300)_theme(colors.slate.100)] [scrollbar-width:thin]"
        tabIndex={0}
        aria-label={isMilestonesView ? 'Bảng tiến độ theo 6 Cột mốc' : 'Bảng tiến độ Gantt 15 tuần'}
      >
        <div className="min-w-[1070px] xl:min-w-[1210px] 2xl:min-w-[1270px]">
          {/* Header Row */}
          <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700">
            {/* Sticky Left WBS Columns */}
            <div className="sticky left-0 z-30 flex w-[320px] shrink-0 items-center border-r border-slate-200 bg-slate-50 px-2 py-2.5 xl:w-[460px] xl:px-3 2xl:w-[520px]">
              <div className="min-w-0 flex-1 font-bold">Cây phân rã công việc (WBS)</div>
              <div className="hidden w-[64px] shrink-0 text-center xl:block 2xl:w-[72px]">Ngành</div>
              <div className="w-[90px] shrink-0 2xl:w-[110px]">Phụ trách</div>
              <div className="w-[52px] shrink-0 text-right pr-2 2xl:w-[58px] 2xl:pr-3">Tiến độ</div>
            </div>

            {/* Right Timeline Header (15 Weeks vs 6 Milestones) */}
            {!isMilestonesView ? (
              <div
                className="flex-1 min-w-[750px] relative"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(15, minmax(50px, 1fr))',
                }}
              >
                {GANTT_WEEKS.map((w) => {
                  const isCurrent = w.weekNumber === currentWeek
                  return (
                    <div
                      key={w.weekNumber}
                      className={`py-2 px-1 text-center font-mono text-xs border-r border-slate-200 last:border-r-0 transition-colors ${
                        isCurrent
                          ? 'bg-red-50/70 text-red-600 font-bold border-b-2 border-b-red-500'
                          : 'text-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>{w.label}</span>
                      </div>
                      <div className="text-[11px] font-normal mt-0.5">
                        {isCurrent ? (
                          <span className="px-1 py-0.2 rounded bg-red-100 text-red-700 font-bold text-[11px]">
                            Hiện tại
                          </span>
                        ) : (
                          <span className="text-slate-400">{w.dateRange}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div
                className="flex-1 min-w-[780px]"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, minmax(130px, 1fr))',
                }}
              >
                {GANTT_MILESTONES.map((m) => {
                  const isCurrent = m.id === 'M3'
                  return (
                    <div
                      key={m.id}
                      className={`py-2 px-2 text-center font-mono text-xs border-r border-slate-200 last:border-r-0 transition-colors ${
                        isCurrent
                          ? 'bg-red-50/70 text-red-600 font-bold border-b-2 border-b-red-500'
                          : 'text-slate-600'
                      }`}
                    >
                      <div className="font-bold">{m.label}</div>
                      <div className="text-xs font-sans font-medium text-slate-800 truncate" title={m.title}>
                        {m.title}
                      </div>
                      <div className="text-[11px] font-normal text-slate-500 mt-0.5">
                        {isCurrent ? (
                          <span className="font-bold text-red-600">Hiện tại (67%)</span>
                        ) : (
                          m.dateRange
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Groups and Tasks Rows */}
          {groups.map((group) => {
            const isExpanded = expandedGroupIds.has(group.id)

            return (
              <div key={group.id} className="border-b border-slate-200 last:border-b-0">
                {/* Group Header Row (44px height) */}
                <div
                  onClick={() => onToggleGroup(group.id)}
                  className="flex h-11 bg-slate-100/80 hover:bg-slate-100 text-xs font-semibold text-slate-900 cursor-pointer select-none transition-colors"
                >
                  {/* Sticky Left Group Info */}
                  <div className="sticky left-0 z-20 flex w-[320px] shrink-0 items-center border-r border-slate-200 bg-slate-100 px-2 py-1.5 xl:w-[460px] xl:px-3 2xl:w-[520px]">
                    <div className="flex min-w-0 flex-1 items-center gap-1 truncate lg:gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onToggleGroup(group.id)
                        }}
                        aria-label={isExpanded ? `Thu gọn nhóm ${group.name}` : `Mở rộng nhóm ${group.name}`}
                        className="w-5 h-5 rounded hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 transition-colors"
                      >
                        <span className="material-symbols-outlined text-base">
                          {isExpanded ? 'keyboard_arrow_down' : 'keyboard_arrow_right'}
                        </span>
                      </button>
                      <span className="font-mono text-slate-600 text-xs font-bold">
                        {group.wbsCode}
                      </span>
                      <span className="truncate text-xs font-semibold text-slate-900 xl:text-[13px]" title={group.name}>
                        {group.name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-200 text-slate-700 shrink-0">
                        {group.milestoneId}
                      </span>
                    </div>

                    <div className="hidden w-[64px] shrink-0 text-center text-xs text-slate-500 xl:block 2xl:w-[72px]">
                      —
                    </div>

                    <div className="w-[90px] shrink-0 text-xs text-slate-600 2xl:w-[110px]">
                      {group.tasks.length} tác vụ
                    </div>

                    <div className="w-[52px] shrink-0 pr-2 text-right font-mono text-xs font-bold text-slate-800 2xl:w-[58px] 2xl:pr-3">
                      {group.progress}%
                    </div>
                  </div>

                  {/* Right Group Bar on Timeline */}
                  {!isMilestonesView ? (
                    <div
                      className="flex-1 min-w-[750px] relative flex items-center py-1.5"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(15, minmax(50px, 1fr))',
                      }}
                    >
                      {/* Current week 2px vertical red guideline */}
                      <div
                        className="absolute top-0 bottom-0 pointer-events-none z-20 border-r-2 border-red-500/80"
                        style={{
                          gridColumnStart: currentWeek,
                          gridColumnEnd: currentWeek + 1,
                          right: 0,
                        }}
                      />

                      {/* Summary group bar across weeks */}
                      <div
                        className="relative z-10 h-3.5 rounded-full bg-slate-700 overflow-hidden mx-1.5 shadow-xs"
                        style={{
                          gridColumnStart: group.startWeek,
                          gridColumnEnd: group.startWeek + group.durationWeeks,
                        }}
                        title={`${group.name}: ${group.progress}% hoàn thành`}
                      >
                        <div
                          className={`h-full transition-all duration-300 ${
                            group.progress === 100
                              ? 'bg-emerald-500'
                              : 'bg-blue-600'
                          }`}
                          style={{ width: `${group.progress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div
                      className="flex-1 min-w-[780px] relative flex items-center py-1.5"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(6, minmax(130px, 1fr))',
                      }}
                    >
                      {/* Current milestone M3 vertical guideline */}
                      <div
                        className="absolute top-0 bottom-0 pointer-events-none z-20 border-r-2 border-red-500/80"
                        style={{
                          gridColumnStart: 3,
                          gridColumnEnd: 4,
                          right: 0,
                        }}
                      />

                      {/* Milestone Group bar placed in its milestone column */}
                      {(() => {
                        const milestoneIndex = GANTT_MILESTONES.findIndex((m) => m.id === group.milestoneId) + 1
                        const colStart = milestoneIndex > 0 ? milestoneIndex : 1
                        return (
                          <div
                            className={`relative z-10 h-7 rounded-md px-2.5 flex items-center justify-between text-xs font-mono shadow-xs overflow-hidden mx-1.5 border transition-all ${
                              group.isCritical
                                ? 'border-rose-400 bg-rose-50 text-rose-900'
                                : group.progress === 100
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                                : 'border-blue-300 bg-blue-50 text-blue-900'
                            }`}
                            style={{
                              gridColumnStart: colStart,
                              gridColumnEnd: colStart + 1,
                            }}
                            title={`${group.name}: ${group.progress}% hoàn thành`}
                          >
                            <div
                              className={`absolute top-0 left-0 bottom-0 opacity-20 pointer-events-none ${
                                group.progress === 100
                                  ? 'bg-emerald-600'
                                  : group.isCritical
                                  ? 'bg-rose-600'
                                  : 'bg-blue-600'
                              }`}
                              style={{ width: `${group.progress}%` }}
                            />
                            <span className="relative z-10 font-bold truncate">
                              {group.milestoneId}
                            </span>
                            <span className="relative z-10 font-bold">
                              {group.progress}%
                            </span>
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>

                {/* Task Rows (Only rendered when group is expanded!) */}
                {!isMilestonesView &&
                  isExpanded &&
                  group.tasks.map((task: GanttTask) => {
                    const isCritical = task.isCritical
                    const { initials, shortName } = getAssigneeDetails(task.assignee)

                    return (
                      <div
                        key={task.id}
                        className="flex h-10 border-t border-slate-100 hover:bg-slate-50/90 text-xs transition-colors"
                      >
                        {/* Sticky Left Task Info */}
                        <div className="sticky left-0 z-10 flex w-[320px] shrink-0 items-center border-r border-slate-200 bg-white px-2 py-1 xl:w-[460px] xl:px-3 2xl:w-[520px]">
                          <div className="flex min-w-0 flex-1 items-center gap-1 truncate pl-2 lg:gap-1.5 lg:pl-6">
                            <span className="font-mono text-xs font-bold text-slate-600 shrink-0">
                              {task.id}
                            </span>
                            <span
                              className="truncate text-xs font-medium text-slate-800 xl:text-[13px]"
                              title={task.name}
                            >
                              {task.name}
                            </span>
                            {isCritical && (
                              <span
                                className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700 shrink-0"
                                title="Nhiệm vụ trên đường găng"
                              >
                                ! Găng
                              </span>
                            )}
                          </div>

                          <div className="hidden w-[64px] shrink-0 text-center xl:block 2xl:w-[72px]">
                            <MultidisciplinaryTag major={task.major} />
                          </div>

                          <div className="w-[90px] shrink-0 truncate text-xs text-slate-600 2xl:w-[110px]">
                            <div
                              className="flex items-center gap-1.5 truncate"
                              title={`${task.assignee} (${task.assigneeRole})`}
                            >
                              <span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700 flex items-center justify-center shrink-0">
                                {initials}
                              </span>
                              <span className="truncate">{shortName}</span>
                            </div>
                          </div>

                          <div className="w-[52px] shrink-0 pr-2 text-right font-mono text-xs font-semibold text-slate-700 2xl:w-[58px] 2xl:pr-3">
                            {task.progress}%
                          </div>
                        </div>

                        {/* Right Task Gantt Bar */}
                        <div
                          className="flex-1 min-w-[750px] relative flex items-center py-1.5"
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(15, minmax(50px, 1fr))',
                          }}
                        >
                          {/* Current week 2px vertical red guideline */}
                          <div
                            className="absolute top-0 bottom-0 pointer-events-none z-20 border-r-2 border-red-500/80"
                            style={{
                              gridColumnStart: currentWeek,
                              gridColumnEnd: currentWeek + 1,
                              right: 0,
                            }}
                          />

                          {/* Task duration bar */}
                          <div
                            className={`relative z-10 h-6.5 rounded-md px-2 flex items-center justify-between text-[11px] font-mono shadow-xs overflow-hidden mx-1 border transition-all ${
                              isCritical
                                ? 'border-rose-500 bg-rose-50 text-rose-950 font-bold ring-1 ring-rose-300/50'
                                : task.progress === 100
                                ? 'border-emerald-400 bg-emerald-50 text-emerald-950 font-semibold'
                                : task.progress > 0
                                ? 'border-blue-400 bg-blue-50 text-blue-950 font-semibold'
                                : 'border-slate-300 bg-slate-100 text-slate-600'
                            }`}
                            style={{
                              gridColumnStart: task.startWeek,
                              gridColumnEnd: task.startWeek + task.durationWeeks,
                            }}
                            title={`${task.id}: ${task.name} • Tiến độ: ${task.progress}% • Tuần ${task.startWeek} -> ${task.startWeek + task.durationWeeks - 1}`}
                          >
                            {/* Progress fill background */}
                            <div
                              className={`absolute top-0 left-0 bottom-0 pointer-events-none ${
                                isCritical
                                  ? 'bg-rose-500/25'
                                  : task.progress === 100
                                  ? 'bg-emerald-500/25'
                                  : task.progress > 0
                                  ? 'bg-blue-500/25'
                                  : 'bg-slate-300/25'
                              }`}
                              style={{ width: `${task.progress}%` }}
                            />

                            {/* Task label */}
                            <span className="relative z-10 font-bold truncate">
                              {task.id}
                            </span>
                            <span className="relative z-10 text-[11px] opacity-90 shrink-0">
                              {task.progress}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )
          })}
        </div>
      </div>

      <div className="border-t border-slate-100 bg-white px-3 py-1.5 text-right text-[11px] text-slate-500 lg:hidden">
        Giữ Shift và cuộn, hoặc kéo thanh phía dưới để xem các tuần tiếp theo →
      </div>

      {/* Legend Footer */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-semibold text-slate-700">Chú thích:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-500 shrink-0" />
            <span>Đang thực hiện</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500 shrink-0" />
            <span>Đã hoàn thành</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-300 shrink-0" />
            <span>Sắp tới</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-600 shrink-0" />
            <span className="text-rose-600 font-semibold">Đường găng (Critical Path)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-3 border-r-2 border-red-500 shrink-0" />
            <span className="text-red-600 font-semibold">
              {isMilestonesView ? 'Mốc hiện tại (M3)' : 'Tuần hiện tại (T6)'}
            </span>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          {isMilestonesView
            ? 'Trục 6 Cột mốc: M1 (15/08) → M6 (30/11/2026)'
            : 'Trục 15 tuần: W01 (18/08) → W15 (30/11/2026)'}
        </div>
      </div>
    </div>
  )
}

