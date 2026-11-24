import { useState } from 'react'
import { Badge } from '../../../components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card'
import { MultidisciplinaryTag } from '../../../components/ui/MultidisciplinaryTag'
import { Pagination } from '../../../components/ui/Pagination'
import { useClientPagination } from '../../../components/ui/useClientPagination'
import type { TaskItem, TaskFilter } from '../types/dashboard.types'
import { filterTasks, getTaskFilterCounts } from '../utils/filter-tasks'

interface TaskListProps {
  tasks: TaskItem[]
}

export function TaskList({ tasks }: TaskListProps) {
  const [filter, setFilter] = useState<TaskFilter>('all')

  const counts = getTaskFilterCounts(tasks)
  const displayedTasks = filterTasks(tasks, filter)
  const pagination = useClientPagination(displayedTasks, 8)

  return (
    <Card>
      <CardHeader className="bg-canvas/70 border-b border-hairline py-3.5 px-5 flex-wrap gap-2">
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
          className="flex items-center gap-1 bg-canvas border border-hairline p-1 rounded-md text-xs font-medium overflow-x-auto no-scrollbar max-w-full"
        >
          <button
            type="button"
            onClick={() => setFilter('all')}
            aria-pressed={filter === 'all'}
            className={`px-2.5 py-1.5 min-h-[36px] sm:min-h-0 rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              filter === 'all'
                ? 'bg-card text-ink font-semibold shadow-2xs'
                : 'text-ink-muted hover:text-ink-soft'
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
                ? 'bg-card text-primary font-semibold shadow-2xs'
                : 'text-ink-muted hover:text-ink-soft'
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
                ? 'bg-card text-status-error-text font-semibold shadow-2xs'
                : 'text-ink-muted hover:text-ink-soft'
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
                ? 'bg-card text-status-success-text font-semibold shadow-2xs'
                : 'text-ink-muted hover:text-ink-soft'
            }`}
          >
            Đã xong ({counts.done})
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-0 divide-y divide-hairline">
        {displayedTasks.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-muted">
            Không có công việc nào trong danh mục này.
          </div>
        ) : (
          pagination.paginatedItems.map((task) => (
            <div
              key={task.id}
              className={`p-3.5 px-4 flex items-center justify-between gap-3 hover:bg-canvas transition-colors ${
                task.isCritical ? 'bg-status-error-bg border-l-4 border-l-status-error-border' : ''
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
                  className="mt-0.5 rounded border-line-strong text-primary focus:ring-primary cursor-not-allowed"
                />
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-ink-soft whitespace-nowrap">
                      {task.id}
                    </span>
                    <MultidisciplinaryTag major={task.major} />
                    {task.isCritical && (
                      <span className="inline-flex items-center gap-1 font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-status-error-bg text-status-error-text border border-status-error-border whitespace-nowrap">
                        ! Đường găng nghẽn
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] font-medium text-ink leading-snug line-clamp-2 break-words">
                    {task.title}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-ink-muted font-sans">
                    <span className="truncate">Phụ trách: {task.assignee}</span>
                    <span aria-hidden="true">•</span>
                    <span
                      className={`font-mono ${
                        task.status === 'overdue' ? 'text-status-error-text font-semibold' : 'text-ink-muted'
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
                  <span className="font-mono text-xs font-bold text-ink-soft">
                    {task.progress}%
                  </span>
                  <div
                    role="progressbar"
                    aria-label={`Tiến độ ${task.id}`}
                    aria-valuenow={task.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="w-full bg-canvas border border-hairline h-1.5 rounded-full overflow-hidden"
                  >
                    <div
                      className={`h-full rounded-full ${
                        task.status === 'done'
                          ? 'bg-status-success-text'
                          : task.status === 'overdue'
                          ? 'bg-status-error-text'
                          : 'bg-primary'
                      }`}
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                </div>

                <span
                  className="p-1 text-ink-muted"
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
      {pagination.showPagination && (
        <div className="border-t border-hairline px-4 py-3">
          <Pagination
            page={pagination.page}
            pages={pagination.totalPages}
            total={pagination.total}
            pageSize={pagination.pageSize}
            pageSizeOptions={[8, 16, 30]}
            onPage={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
          />
        </div>
      )}
    </Card>
  )
}
