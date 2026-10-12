import type { SprintDto, TaskDto } from '../../types/backend'

/** Story-point scale (Fibonacci) offered as quick-pick chips. */
export const STORY_POINTS = [1, 2, 3, 5, 8, 13] as const

/** A task counts as "done" for sprint completion once it reaches DONE or CANCELLED. */
const isClosed = (task: Pick<TaskDto, 'status'>) => task.status === 'DONE' || task.status === 'CANCELLED'

export const activeSprint = (sprints: SprintDto[]): SprintDto | null => sprints.find(s => s.status === 'ACTIVE') ?? null

export function tasksInSprint(tasks: TaskDto[], sprintId: number): TaskDto[] {
  return tasks.filter(task => task.sprintId === sprintId)
}

export function backlogTasks(tasks: TaskDto[]): TaskDto[] {
  return tasks.filter(task => task.sprintId === null || task.sprintId === undefined)
}

export function pendingTasksInSprint(tasks: TaskDto[], sprintId: number): TaskDto[] {
  return tasksInSprint(tasks, sprintId).filter(task => !isClosed(task))
}

/** Point totals for a sprint: committed total and the done portion (for a burndown-style summary). */
export function sprintPoints(tasks: TaskDto[], sprintId: number): { total: number; done: number; count: number } {
  const members = tasksInSprint(tasks, sprintId)
  let total = 0, done = 0
  for (const task of members) {
    const points = task.storyPoints ?? 0
    total += points
    if (task.status === 'DONE') done += points
  }
  return { total, done, count: members.length }
}

/** Distinct, trimmed labels across the project's tasks — powers the label filter chips. */
export function collectLabels(tasks: TaskDto[]): string[] {
  const set = new Set<string>()
  for (const task of tasks) for (const label of task.labels ?? []) { const clean = label.trim(); if (clean) set.add(clean) }
  return [...set].sort((a, b) => a.localeCompare(b))
}

/** Normalize a free-text label input ("a, b , a") into a clean, de-duplicated list. */
export function parseLabels(input: string): string[] {
  const set = new Set<string>()
  for (const part of input.split(',')) { const clean = part.trim(); if (clean) set.add(clean) }
  return [...set]
}
