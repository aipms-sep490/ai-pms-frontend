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
      <div className="p-12 text-center border border-hairline rounded-lg bg-card">
        <span className="material-symbols-outlined text-4xl text-ink-muted mb-2">
          filter_alt_off
        </span>
        <h3 className="text-sm font-semibold text-ink-soft">
          Không tìm thấy công việc phù hợp
        </h3>
        <p className="mt-1 text-xs text-ink-muted max-w-sm mx-auto">
          Không có tác vụ nào thỏa mãn điều kiện lọc đường găng hoặc từ khóa tìm kiếm đã chọn. Vui lòng thử bỏ bộ lọc.
        </p>
      </div>
    )
  }

  const isMilestonesView = viewMode === 'milestones'
  const totalTasksCount = groups.reduce((sum, g) => sum + g.tasks.length, 0)

  return (
    <div className="border border-hairline rounded-xl bg-card shadow-xs overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-canvas/70 border-b border-hairline px-5 py-3.5">
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-bold text-ink">{isMilestonesView ? 'Tiến độ theo cột mốc' : 'Biểu đồ Gantt 15 tuần'}</h2>
          <span className="rounded-full border border-hairline bg-card px-2 py-0.5 text-xs font-semibold text-ink-soft tabular-nums">{groups.length} nhóm · {totalTasksCount} tác vụ</span>
        </div>
        <span className="text-xs text-ink-muted">Nhấn vào từng nhóm WBS để mở rộng tác vụ</span>
      </div>
      {/* Scrollable Container with Sticky Left Column */}
      <div
        className="w-full overflow-x-auto focus-visible:outline-none [scrollbar-color:var(--color-line-strong)_var(--color-canvas)] [scrollbar-width:thin]"
        tabIndex={0}
        aria-label={isMilestonesView ? 'Bảng tiến độ theo 6 Cột mốc' : 'Bảng tiến độ Gantt 15 tuần'}
      >
        <div className="min-w-[1070px] xl:min-w-[1210px] 2xl:min-w-[1270px]">
          {/* Header Row */}
          <div className="flex border-b border-hairline bg-canvas text-xs font-semibold text-ink-soft">
            {/* Sticky Left WBS Columns */}
            <div className="sticky left-0 z-30 flex w-[320px] shrink-0 items-center border-r border-hairline bg-canvas px-2 py-2.5 xl:w-[460px] xl:px-3 2xl:w-[520px]">
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
                      className={`py-2 px-1 text-center font-mono text-xs border-r border-hairline last:border-r-0 transition-colors ${
                        isCurrent
                          ? 'bg-status-error-bg/70 text-status-error-text font-bold border-b-2 border-b-status-error-text'
                          : 'text-ink-muted'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>{w.label}</span>
                      </div>
                      <div className="text-xs font-normal mt-0.5">
                        {isCurrent ? (
                          <span className="px-1 py-0.2 rounded bg-status-error-bg text-status-error-text font-bold text-xs">
                            Hiện tại
                          </span>
                        ) : (
                          <span className="text-ink-muted">{w.dateRange}</span>
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
                      className={`py-2 px-2 text-center font-mono text-xs border-r border-hairline last:border-r-0 transition-colors ${
                        isCurrent
                          ? 'bg-status-error-bg/70 text-status-error-text font-bold border-b-2 border-b-status-error-text'
                          : 'text-ink-muted'
                      }`}
                    >
                      <div className="font-bold">{m.label}</div>
                      <div className="text-xs font-sans font-medium text-ink-soft truncate" title={m.title}>
                        {m.title}
                      </div>
                      <div className="text-xs font-normal text-ink-muted mt-0.5">
                        {isCurrent ? (
                          <span className="font-bold text-status-error-text">Hiện tại (67%)</span>
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
              <div key={group.id} className="border-b border-hairline last:border-b-0">
                {/* Group Header Row (44px height) */}
                <div
                  onClick={() => onToggleGroup(group.id)}
                  className="flex h-11 bg-canvas/80 hover:bg-canvas text-xs font-semibold text-ink cursor-pointer select-none transition-colors"
                >
                  {/* Sticky Left Group Info */}
                  <div className="sticky left-0 z-20 flex w-[320px] shrink-0 items-center border-r border-hairline bg-canvas px-2 py-1.5 xl:w-[460px] xl:px-3 2xl:w-[520px]">
                    <div className="flex min-w-0 flex-1 items-center gap-1 truncate lg:gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onToggleGroup(group.id)
                        }}
                        aria-label={isExpanded ? `Thu gọn nhóm ${group.name}` : `Mở rộng nhóm ${group.name}`}
                        className="w-5 h-5 rounded hover:bg-hairline text-ink-muted flex items-center justify-center shrink-0 transition-colors"
                      >
                        <span className="material-symbols-outlined text-base">
                          {isExpanded ? 'keyboard_arrow_down' : 'keyboard_arrow_right'}
                        </span>
                      </button>
                      <span className="font-mono text-ink-muted text-xs font-bold">
                        {group.wbsCode}
                      </span>
                      <span className="truncate text-xs font-semibold text-ink xl:text-[13px]" title={group.name}>
                        {group.name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded border border-hairline text-xs font-mono font-bold bg-canvas text-ink-soft shrink-0">
                        {group.milestoneId}
                      </span>
                    </div>

                    <div className="hidden w-[64px] shrink-0 text-center text-xs text-ink-muted xl:block 2xl:w-[72px]">
                      —
                    </div>

                    <div className="w-[90px] shrink-0 text-xs text-ink-muted 2xl:w-[110px]">
                      {group.tasks.length} tác vụ
                    </div>

                    <div className="w-[52px] shrink-0 pr-2 text-right font-mono text-xs font-bold text-ink-soft 2xl:w-[58px] 2xl:pr-3">
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
                        className="absolute top-0 bottom-0 pointer-events-none z-20 border-r-2 border-status-error-text/80"
                        style={{
                          gridColumnStart: currentWeek,
                          gridColumnEnd: currentWeek + 1,
                          right: 0,
                        }}
                      />

                      {/* Summary group bar across weeks */}
                      <div
                        className="relative z-10 h-3.5 rounded-full border border-hairline bg-hairline overflow-hidden mx-1.5 shadow-xs"
                        style={{
                          gridColumnStart: group.startWeek,
                          gridColumnEnd: group.startWeek + group.durationWeeks,
                        }}
                        title={`${group.name}: ${group.progress}% hoàn thành`}
                      >
                        <div
                          className={`h-full transition-all duration-300 ${
                            group.progress === 100
                              ? 'bg-status-success-text'
                              : 'bg-primary'
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
                        className="absolute top-0 bottom-0 pointer-events-none z-20 border-r-2 border-status-error-text/80"
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
                                ? 'border-status-error-border bg-status-error-bg text-status-error-text'
                                : group.progress === 100
                                ? 'border-status-success-border bg-status-success-bg text-status-success-text'
                                : 'border-primary/25 bg-primary-subtle text-primary'
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
                                  ? 'bg-status-success-text'
                                  : group.isCritical
                                  ? 'bg-status-error-text'
                                  : 'bg-primary'
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
                        className="flex h-10 border-t border-hairline hover:bg-canvas/90 text-xs transition-colors"
                      >
                        {/* Sticky Left Task Info */}
                        <div className="sticky left-0 z-10 flex w-[320px] shrink-0 items-center border-r border-hairline bg-card px-2 py-1 xl:w-[460px] xl:px-3 2xl:w-[520px]">
                          <div className="flex min-w-0 flex-1 items-center gap-1 truncate pl-2 lg:gap-1.5 lg:pl-6">
                            <span className="font-mono text-xs font-bold text-ink-muted shrink-0">
                              {task.id}
                            </span>
                            <span
                              className="truncate text-xs font-medium text-ink-soft xl:text-[13px]"
                              title={task.name}
                            >
                              {task.name}
                            </span>
                            {isCritical && (
                              <span
                                className="px-1.5 py-0.5 rounded text-xs font-bold bg-status-error-bg text-status-error-text shrink-0"
                                title="Nhiệm vụ trên đường găng"
                              >
                                ! Găng
                              </span>
                            )}
                          </div>

                          <div className="hidden w-[64px] shrink-0 text-center xl:block 2xl:w-[72px]">
                            <MultidisciplinaryTag major={task.major} />
                          </div>

                          <div className="w-[90px] shrink-0 truncate text-xs text-ink-muted 2xl:w-[110px]">
                            <div
                              className="flex items-center gap-1.5 truncate"
                              title={`${task.assignee} (${task.assigneeRole})`}
                            >
                              <span className="w-5 h-5 rounded-full bg-canvas border border-hairline text-xs font-bold text-ink-soft flex items-center justify-center shrink-0">
                                {initials}
                              </span>
                              <span className="truncate">{shortName}</span>
                            </div>
                          </div>

                          <div className="w-[52px] shrink-0 pr-2 text-right font-mono text-xs font-semibold text-ink-soft 2xl:w-[58px] 2xl:pr-3">
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
                            className="absolute top-0 bottom-0 pointer-events-none z-20 border-r-2 border-status-error-text/80"
                            style={{
                              gridColumnStart: currentWeek,
                              gridColumnEnd: currentWeek + 1,
                              right: 0,
                            }}
                          />

                          {/* Task duration bar */}
                          <div
                            className={`relative z-10 h-6.5 rounded-md px-2 flex items-center justify-between text-xs font-mono shadow-xs overflow-hidden mx-1 border transition-all ${
                              isCritical
                                ? 'border-status-error-border bg-status-error-bg text-status-error-text font-bold ring-1 ring-status-error-border'
                                : task.progress === 100
                                ? 'border-status-success-border bg-status-success-bg text-status-success-text font-semibold'
                                : task.progress > 0
                                ? 'border-primary/25 bg-primary-subtle text-primary font-semibold'
                                : 'border-line-strong bg-canvas text-ink-muted'
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
                                  ? 'bg-status-error-border/50'
                                  : task.progress === 100
                                  ? 'bg-status-success-bg'
                                  : task.progress > 0
                                  ? 'bg-primary/15'
                                  : 'bg-hairline'
                              }`}
                              style={{ width: `${task.progress}%` }}
                            />

                            {/* Task label */}
                            <span className="relative z-10 font-bold truncate">
                              {task.id}
                            </span>
                            <span className="relative z-10 text-xs opacity-90 shrink-0">
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

      <div className="border-t border-hairline bg-card px-3 py-1.5 text-right text-xs text-ink-muted lg:hidden">
        Giữ Shift và cuộn, hoặc kéo thanh phía dưới để xem các tuần tiếp theo →
      </div>

      {/* Legend Footer */}
      <div className="p-3 border-t border-hairline bg-canvas flex flex-wrap items-center justify-between gap-3 text-xs text-ink-muted">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-semibold text-ink-soft">Chú thích:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-primary shrink-0" />
            <span>Đang thực hiện</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-status-success-text shrink-0" />
            <span>Đã hoàn thành</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-line-strong shrink-0" />
            <span>Sắp tới</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-status-error-text shrink-0" />
            <span className="text-status-error-text font-semibold">Đường găng (Critical Path)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-3 border-r-2 border-status-error-text shrink-0" />
            <span className="text-status-error-text font-semibold">
              {isMilestonesView ? 'Mốc hiện tại (M3)' : 'Tuần hiện tại (T6)'}
            </span>
          </div>
        </div>

        <div className="text-xs text-ink-muted font-mono">
          {isMilestonesView
            ? 'Trục 6 Cột mốc: M1 (15/08) → M6 (30/11/2026)'
            : 'Trục 15 tuần: W01 (18/08) → W15 (30/11/2026)'}
        </div>
      </div>
    </div>
  )
}

