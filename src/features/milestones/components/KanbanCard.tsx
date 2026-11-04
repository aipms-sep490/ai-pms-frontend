import { MultidisciplinaryTag } from '../../../components/ui/MultidisciplinaryTag'
import type { KanbanTask } from '../types/milestone-kanban.types'

interface KanbanCardProps {
  task: KanbanTask
}

export function KanbanCard({ task }: KanbanCardProps) {
  return (
    <article
      aria-label={`Công việc ${task.id}: ${task.title}`}
      title="Kéo thả Kanban sẽ hoạt động khi tích hợp state management & hệ thống"
      className={`p-3.5 rounded-lg bg-card border transition-all duration-150 shadow-2xs select-none ${
        task.isCritical
          ? 'border-status-error-border border-l-4 border-l-status-error-text bg-status-error-bg/40'
          : 'border-hairline hover:border-line-strong hover:shadow-xs'
      }`}
    >
      {/* Top row: ID, Major Tag & Critical Badge */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-mono text-xs font-bold text-ink-soft">
            {task.id}
          </span>
          <MultidisciplinaryTag major={task.major} />
        </div>

        {task.isCritical && (
          <span className="font-mono text-xs font-bold text-status-error-text bg-status-error-bg border border-status-error-border px-1.5 py-0.5 rounded whitespace-nowrap">
            ! Đường găng
          </span>
        )}
      </div>

      {/* Task Title */}
      <h3 className="font-sans text-[13px] font-semibold text-ink leading-snug line-clamp-2 break-words mb-2">
        {task.title}
      </h3>

      {/* Bottom row: Assignee, Deadline & Story Points */}
      <div className="flex flex-col gap-1.5 border-t border-hairline pt-2 text-xs text-ink-muted font-sans">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <span className="w-5 h-5 rounded-full border border-primary/20 bg-primary-subtle text-primary font-heading font-bold text-xs flex items-center justify-center shrink-0">
            {task.assignee.slice(0, 1)}
          </span>
          <span className="min-w-0 flex-1 truncate text-ink-soft font-medium" title={task.assignee}>
            {task.assignee}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 font-mono text-xs">
          <span className="text-ink-muted">Hạn: {task.deadline}</span>
          <span className="px-1.5 py-0.2 rounded bg-canvas text-ink-muted font-bold">
            {task.storyPoints} SP
          </span>
        </div>
      </div>
    </article>
  )
}
