import type { TaskItem, TaskFilter } from '../types/dashboard.types'

/**
 * Pure function to filter tasks by status.
 * Handles boundary conditions gracefully (empty list, unknown filter).
 */
export function filterTasks(tasks: TaskItem[], filter: TaskFilter): TaskItem[] {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return []
  }

  switch (filter) {
    case 'in_progress':
      return tasks.filter((task) => task.status === 'in_progress')
    case 'overdue':
      return tasks.filter((task) => task.status === 'overdue')
    case 'done':
      return tasks.filter((task) => task.status === 'done')
    case 'all':
    default:
      return tasks
  }
}

/**
 * Computes count statistics for each filter tab.
 */
export function getTaskFilterCounts(tasks: TaskItem[]) {
  const all = tasks.length
  let inProgress = 0
  let overdue = 0
  let done = 0

  for (const task of tasks) {
    if (task.status === 'in_progress') inProgress++
    else if (task.status === 'overdue') overdue++
    else if (task.status === 'done') done++
  }

  return { all, inProgress, overdue, done }
}
