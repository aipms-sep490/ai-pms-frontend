import type { GanttTelemetry, GanttViewMode } from '../types/gantt.types'

interface GanttHeaderProps {
  telemetry: GanttTelemetry
  viewMode: GanttViewMode
  onViewModeChange: (mode: GanttViewMode) => void
}

export function GanttHeader({
  telemetry,
  viewMode,
  onViewModeChange,
}: GanttHeaderProps) {
  return (
    <div className="space-y-3">
      {/* Title & Primary Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="material-symbols-outlined text-blue-600 text-2xl">
              calendar_month
            </span>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Biểu đồ Gantt Đa ngành & Phân tích Đường găng
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
              Dữ liệu mô phỏng
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Tiến độ tổng thể 15 tuần học kỳ Fall 2026 • Theo dõi đường găng (Critical Path Method — CPM)
          </p>
        </div>

        {/* View Mode & Export Controls */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
            <button
              type="button"
              onClick={() => onViewModeChange('weeks')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                viewMode === 'weeks'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Xem theo tuần (15T)
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('milestones')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                viewMode === 'milestones'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Xem theo mốc (M1–M6)
            </button>
          </div>

          <button
            type="button"
            disabled
            title="Chức năng xuất dữ liệu tiến độ sang Microsoft Project / CSV đang được phát triển"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-400 border border-slate-200 rounded-lg bg-slate-50 cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            Xuất MS Project / CSV
          </button>
        </div>
      </div>

      {/* Compact Single-Row Summary Strip */}
      <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Metric 1: Current Week / Milestone */}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          <span className="font-semibold text-slate-900">
            Tuần T{telemetry.currentWeek}
          </span>
          <span className="text-slate-500">(08/09 - 14/09)</span>
          <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-blue-100/80 text-blue-800">
            Mốc M3 • Đang diễn ra
          </span>
        </div>

        <div className="hidden lg:block h-4 w-px bg-slate-200" />

        {/* Metric 2: WBS Tasks */}
        <div className="flex items-center gap-1.5 text-slate-600">
          <span className="font-bold text-slate-900">{telemetry.totalTasks}</span>
          <span>công việc:</span>
          <span className="text-slate-500">
            {telemetry.completedTasksCount} hoàn thành • {telemetry.inProgressTasksCount} đang làm • {telemetry.upcomingTasksCount} sắp tới
          </span>
        </div>

        <div className="hidden lg:block h-4 w-px bg-slate-200" />

        {/* Metric 3: Critical Path Length */}
        <div className="flex items-center gap-1.5 text-rose-700">
          <span className="material-symbols-outlined text-sm text-rose-600">priority_high</span>
          <span className="font-semibold">Đường găng:</span>
          <span className="font-bold font-mono text-rose-800">{telemetry.criticalPathDays} ngày</span>
          <span className="text-rose-600/80 font-medium">({telemetry.criticalTasksCount} tác vụ găng)</span>
        </div>

        <div className="hidden lg:block h-4 w-px bg-slate-200" />

        {/* Metric 4: Average Progress */}
        <div className="flex items-center gap-2">
          <span className="text-slate-600">Tiến độ WBS:</span>
          <div className="w-16 bg-slate-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${telemetry.overallProgress}%` }}
            />
          </div>
          <span className="font-bold font-mono text-slate-900">{telemetry.overallProgress}%</span>
        </div>
      </div>

      {/* Critical Path Warning Callout (Single non-duplicated alert) */}
      <div className="px-3.5 py-2 rounded-lg border border-amber-300 bg-amber-50/90 text-amber-900 flex items-center gap-2 text-xs">
        <span className="material-symbols-outlined text-amber-600 text-base shrink-0">
          warning
        </span>
        <div className="truncate">
          <strong>Cảnh báo đường găng:</strong> Nhiệm vụ{' '}
          <span className="font-mono font-bold text-amber-950">SEP-108</span> đang chậm 2 ngày trên chuỗi{' '}
          <span className="font-mono font-bold text-amber-950">{telemetry.bottleneckChain.join(' → ')}</span>, có nguy cơ làm lùi hạn nộp Cột mốc M3 (18/09/2026).
        </div>
      </div>
    </div>
  )
}

