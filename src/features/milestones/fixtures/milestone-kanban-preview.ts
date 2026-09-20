import type { KanbanColumnConfig } from '../types/milestone-kanban.types'

/** Static column presentation only; milestone and task records come from Backend APIs. */
export const kanbanColumns: readonly KanbanColumnConfig[] = [
  {
    id: 'todo',
    title: 'Cần làm',
    description: 'Tác vụ đã lên kế hoạch cho Sprint 2',
    icon: 'pending_actions',
    badgeVariant: 'neutral',
  },
  {
    id: 'in_progress',
    title: 'Đang thực hiện',
    description: 'Đang xử lý, có cảnh báo đường găng',
    icon: 'hourglass_top',
    badgeVariant: 'info',
  },
  {
    id: 'review',
    title: 'Chờ duyệt / QA',
    description: 'Chờ GVHD hoặc QA kiểm tra chéo',
    icon: 'rate_review',
    badgeVariant: 'warning',
  },
  {
    id: 'done',
    title: 'Đã hoàn thành',
    description: 'Đạt định nghĩa hoàn thành (DoD)',
    icon: 'task_alt',
    badgeVariant: 'success',
  },
]
