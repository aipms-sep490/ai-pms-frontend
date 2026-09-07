import { Badge } from '../../../components/ui/Badge'
import { kanbanColumns } from '../fixtures/milestone-kanban-preview'
import { KanbanCard } from './KanbanCard'
import type { KanbanTask, MilestoneKanbanStatus } from '../types/milestone-kanban.types'

interface KanbanBoardProps {
  groupedTasks: Record<MilestoneKanbanStatus, KanbanTask[]>
  totalMilestoneTasks?: number
  hasDetailTasks?: boolean
}

export function KanbanBoard({
  groupedTasks,
  totalMilestoneTasks = 0,
  hasDetailTasks = true,
}: KanbanBoardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
      {kanbanColumns.map((col) => {
        const tasks = groupedTasks[col.id] || []

        return (
          <section
            key={col.id}
            aria-label={`Cột Kanban: ${col.title}`}
            className="flex flex-col rounded-xl bg-slate-100/70 border border-hairline p-3 min-h-[480px]"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[17px] text-slate-500" aria-hidden="true">
                  {col.icon}
                </span>
                <h2 className="font-heading font-bold text-xs text-slate-800 uppercase tracking-wider">
                  {col.title}
                </h2>
              </div>
              <Badge variant={col.badgeVariant} size="sm">
                {tasks.length}
              </Badge>
            </div>

            {/* Task Cards Column Body */}
            <div className="flex flex-col gap-2.5 flex-1">
              {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-3 text-center border-2 border-dashed border-slate-200 rounded-lg text-slate-400">
                  <span className="material-symbols-outlined text-[24px] mb-1">
                    {hasDetailTasks ? 'inbox' : 'pending'}
                  </span>
                  {hasDetailTasks ? (
                    <span className="text-xs font-sans">Không có tác vụ trong trạng thái này</span>
                  ) : (
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-xs font-medium text-slate-600">
                        Chưa có dữ liệu chi tiết trong fixture
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Chỉ số tổng ({totalMilestoneTasks} tác vụ) là metadata kế hoạch
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                tasks.map((task) => <KanbanCard key={task.id} task={task} />)
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
