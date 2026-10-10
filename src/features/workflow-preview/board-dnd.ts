/** Pure board move logic for the task fixture. Column order is supplied by the caller. */
export interface Movable { id: number; status: string }

export function shiftStatus(order: readonly string[], current: string, direction: -1 | 1): string {
  const index = order.indexOf(current)
  if (index < 0) return current
  const next = index + direction
  if (next < 0 || next >= order.length) return current
  return order[next]
}

export function countInColumn<T extends Movable>(tasks: T[], status: string): number {
  return tasks.reduce((total, task) => (task.status === status ? total + 1 : total), 0)
}

/**
 * True when a task may enter `status`. A positive `wipLimit` blocks a column that is already full,
 * unless the task is already in that column (a reorder, not a new arrival).
 */
export function canDrop<T extends Movable>(tasks: T[], id: number, status: string, wipLimit: number): boolean {
  const moving = tasks.find(task => task.id === id)
  if (!moving) return false
  if (moving.status === status) return true
  if (wipLimit <= 0) return true
  return countInColumn(tasks, status) < wipLimit
}

/** Move a task to `status`, preserving order. Returns the same array reference when nothing changes. */
export function moveTask<T extends Movable>(tasks: T[], id: number, status: string, wipLimit: number): T[] {
  if (!canDrop(tasks, id, status, wipLimit)) return tasks
  const moving = tasks.find(task => task.id === id)
  if (!moving || moving.status === status) return tasks
  return tasks.map(task => (task.id === id ? { ...task, status } : task))
}
