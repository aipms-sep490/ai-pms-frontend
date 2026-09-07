import { MultidisciplinaryTag } from '../../../components/ui/MultidisciplinaryTag'
import type { KanbanTask } from '../types/milestone-kanban.types'

interface KanbanCardProps {
  task: KanbanTask
}

export function KanbanCard({ task }: KanbanCardProps) {
  return (
    <article
      aria-label={`Công việc ${task.id}: ${task.title}`}
      title="Kéo thả Kanban sẽ hoạt động khi tích hợp state management & backend"
      className={`p-3.5 rounded-lg bg-white border transition-all duration-150 shadow-2xs select-none ${
        task.isCritical
          ? 'border-red-300 border-l-4 border-l-red-500 bg-red-50/20'
          : 'border-hairline hover:border-slate-300 hover:shadow-xs'
      }`}
    >
      {/* Top row: ID, Major Tag & Critical Badge */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-mono text-xs font-bold text-slate-800">
            {task.id}
          </span>
          <MultidisciplinaryTag major={task.major} />
        </div>

        {task.isCritical && (
          <span className="font-mono text-[9px] font-bold text-red-700 bg-red-100 border border-red-200 px-1.5 py-0.5 rounded whitespace-nowrap">
            ! Đường găng
          </span>
        )}
      </div>

      {/* Task Title */}
      <h3 className="font-sans text-[13px] font-semibold text-slate-900 leading-snug line-clamp-2 break-words mb-2">
        {task.title}
      </h3>

      {/* Bottom row: Assignee, Deadline & Story Points */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px] text-slate-500 font-sans">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-heading font-bold text-[10px] flex items-center justify-center shrink-0">
            {task.assignee.slice(0, 1)}
          </span>
          <span className="truncate text-slate-700 font-medium" title={task.assignee}>
            {task.assignee}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0 font-mono text-[10px]">
          <span className="text-slate-400">Hạn: {task.deadline}</span>
          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-bold">
            {task.storyPoints} SP
          </span>
        </div>
      </div>
    </article>
  )
}
