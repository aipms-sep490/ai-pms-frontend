import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { Card, CardContent } from '../../../components/ui/Card'
import type { MilestoneDetail } from '../types/milestone-kanban.types'

interface MilestoneHeaderProps {
  milestone: MilestoneDetail
  activeMilestoneId: string
  onSelectMilestone: (id: string) => void
}

const milestoneKeys = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'] as const

export function MilestoneHeader({
  milestone,
  activeMilestoneId,
  onSelectMilestone,
}: MilestoneHeaderProps) {
  return (
    <Card className="border-hairline bg-white shadow-xs">
      <CardContent className="p-4 md:p-5 flex flex-col gap-4">
        {/* Top bar: Milestone Switcher & Action CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-hairline">
          {/* Milestone Selector Tabs */}
          <div
            role="tablist"
            aria-label="Chọn cột mốc xem trước"
            className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg overflow-x-auto no-scrollbar"
          >
            {milestoneKeys.map((key) => {
              const isSelected = key === activeMilestoneId
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => onSelectMilestone(key)}
                  className={`px-3 py-1 text-xs font-mono font-bold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {key}
                </button>
              )
            })}
          </div>

          <Button
            variant="primary"
            size="sm"
            icon="add"
            disabled
            title="Chức năng tạo task sẽ khả dụng khi kết nối API Tasks"
            className="shrink-0"
          >
            Tạo công việc mới (Sắp có)
          </Button>
        </div>

        {/* Milestone Metadata & Progress */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-primary bg-primary-subtle border border-hairline px-2 py-0.5 rounded">
                {milestone.id} • {milestone.phase}
              </span>
              <Badge
                variant={
                  milestone.status === 'completed'
                    ? 'success'
                    : milestone.status === 'active'
                    ? 'info'
                    : 'neutral'
                }
                size="sm"
                dot
              >
                {milestone.status === 'completed'
                  ? 'Đã nghiệm thu'
                  : milestone.status === 'active'
                  ? 'Đang thực hiện'
                  : 'Sắp diễn ra'}
              </Badge>
              <span className="font-mono text-xs text-slate-500">
                {milestone.startDate} – {milestone.endDate}
              </span>
            </div>

            <h1 className="font-heading text-xl md:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
              Cột mốc {milestone.id}: {milestone.name}
            </h1>
            <p className="text-xs md:text-sm text-slate-600 font-sans leading-relaxed">
              {milestone.description}
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="flex flex-col gap-1.5 w-full lg:w-56 shrink-0 p-3 rounded-lg bg-slate-50 border border-hairline">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono font-semibold text-slate-700">Tiến độ tổng thể</span>
              <span className="font-mono font-bold text-primary text-sm">
                {milestone.progress}%
              </span>
            </div>
            <div
              role="progressbar"
              aria-label={`Tiến độ cột mốc ${milestone.id}`}
              aria-valuenow={milestone.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              className="w-full bg-slate-200 h-2 rounded-full overflow-hidden"
            >
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  milestone.progress === 100
                    ? 'bg-academic-emerald'
                    : milestone.progress > 0
                    ? 'bg-primary'
                    : 'bg-slate-300'
                }`}
                style={{ width: `${milestone.progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between font-mono text-[10px] text-slate-500">
              <span>Hoàn thành: {milestone.completedTasks} / {milestone.totalTasks} tác vụ</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
