import { useState } from 'react'
import { Badge } from '../../../components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card'
import { MultidisciplinaryTag } from '../../../components/ui/MultidisciplinaryTag'
import type { TaskItem, TaskFilter } from '../types/dashboard.types'
import { filterTasks, getTaskFilterCounts } from '../utils/filter-tasks'

interface TaskListProps {
  tasks: TaskItem[]
}

export function TaskList({ tasks }: TaskListProps) {
  const [filter, setFilter] = useState<TaskFilter>('all')

  const counts = getTaskFilterCounts(tasks)
  const displayedTasks = filterTasks(tasks, filter)

  return (
    <Card>
      <CardHeader className="py-3 px-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">
            task_alt
          </span>
          <CardTitle className="text-sm">Công việc Cột mốc M3 (Sprint 2)</CardTitle>
          <Badge variant="neutral" size="sm">
            {tasks.length} tác vụ
          </Badge>
        </div>

        {/* Filter Tabs with accessible aria-pressed and scrollable on small viewports */}
        <div
          role="group"
          aria-label="Lọc công việc theo trạng thái"
          className="flex items-center gap-1 bg-slate-100 p-1 rounded-md text-xs font-medium overflow-x-auto no-scrollbar max-w-full"
        >
          <button
            type="button"
            onClick={() => setFilter('all')}
            aria-pressed={filter === 'all'}
            className={`px-2.5 py-1.5 min-h-[36px] sm:min-h-0 rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              filter === 'all'
                ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Tất cả ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setFilter('in_progress')}
            aria-pressed={filter === 'in_progress'}
            className={`px-2.5 py-1.5 min-h-[36px] sm:min-h-0 rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              filter === 'in_progress'
                ? 'bg-white text-primary font-semibold shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Đang làm ({counts.inProgress})
          </button>
          <button
            type="button"
            onClick={() => setFilter('overdue')}
            aria-pressed={filter === 'overdue'}
            className={`px-2.5 py-1.5 min-h-[36px] sm:min-h-0 rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              filter === 'overdue'
                ? 'bg-white text-status-error-text font-semibold shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Quá hạn ({counts.overdue})
          </button>
          <button
            type="button"
            onClick={() => setFilter('done')}
            aria-pressed={filter === 'done'}
            className={`px-2.5 py-1.5 min-h-[36px] sm:min-h-0 rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              filter === 'done'
                ? 'bg-white text-status-success-text font-semibold shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Đã xong ({counts.done})
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-0 divide-y divide-slate-100">
        {displayedTasks.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Không có công việc nào trong danh mục này.
          </div>
        ) : (
          displayedTasks.map((task) => (
            <div
              key={task.id}
              className={`p-3.5 px-4 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors ${
                task.isCritical ? 'bg-red-50/40 border-l-4 border-l-red-500' : ''
              }`}
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <input
                  type="checkbox"
                  checked={task.status === 'done'}
                  disabled
                  aria-label={`Trạng thái công việc ${task.id}: ${
                    task.status === 'done' ? 'Đã hoàn thành' : 'Chưa hoàn thành'
                  }`}
                  className="mt-0.5 rounded border-slate-300 text-primary focus:ring-primary cursor-not-allowed"
                />
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-slate-700 whitespace-nowrap">
                      {task.id}
                    </span>
                    <MultidisciplinaryTag major={task.major} />
                    {task.isCritical && (
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-800 border border-red-200 whitespace-nowrap">
                        ! Đường găng nghẽn
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] font-medium text-slate-900 leading-snug line-clamp-2 break-words">
                    {task.title}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 font-sans">
                    <span className="truncate">Phụ trách: {task.assignee}</span>
                    <span aria-hidden="true">•</span>
                    <span
                      className={`font-mono ${
                        task.status === 'overdue' ? 'text-status-error-text font-semibold' : 'text-slate-500'
                      }`}
                    >
                      Hạn: {task.deadline}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Progress */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="hidden sm:flex flex-col items-end gap-1 w-20">
                  <span className="font-mono text-xs font-bold text-slate-700">
                    {task.progress}%
                  </span>
                  <div
                    role="progressbar"
                    aria-label={`Tiến độ ${task.id}`}
                    aria-valuenow={task.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden"
                  >
                    <div
                      className={`h-full rounded-full ${
                        task.status === 'done'
                          ? 'bg-academic-emerald'
                          : task.status === 'overdue'
                          ? 'bg-academic-coral'
                          : 'bg-primary'
                      }`}
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                </div>

                <span
                  className="p-1 text-slate-400"
                  title="Chi tiết công việc sẽ khả dụng ở phân hệ Tasks"
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
