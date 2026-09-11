import type {
  KanbanTask,
  KanbanMajorFilter,
  MilestoneKanbanStatus,
} from '../types/milestone-kanban.types'

/**
 * Filters a list of Kanban tasks by multidisciplinary major tag and search query.
 */
export function filterKanbanTasks(
  tasks: readonly KanbanTask[],
  major: KanbanMajorFilter,
  searchQuery = ''
): KanbanTask[] {
  const normalizedQuery = searchQuery.trim().toLowerCase()

  return tasks.filter((task) => {
    const matchesMajor = major === 'all' || task.major === major
    const matchesQuery =
      normalizedQuery === '' ||
      task.id.toLowerCase().includes(normalizedQuery) ||
      task.title.toLowerCase().includes(normalizedQuery) ||
      task.assignee.toLowerCase().includes(normalizedQuery)

    return matchesMajor && matchesQuery
  })
}

/**
 * Groups tasks into the 4 standard Kanban columns.
 */
export function groupTasksByStatus(
  tasks: readonly KanbanTask[]
): Record<MilestoneKanbanStatus, KanbanTask[]> {
  const groups: Record<MilestoneKanbanStatus, KanbanTask[]> = {
    todo: [],
    in_progress: [],
    review: [],
    done: [],
  }

  for (const task of tasks) {
    if (groups[task.status]) {
      groups[task.status].push(task)
    }
  }

  return groups
}
