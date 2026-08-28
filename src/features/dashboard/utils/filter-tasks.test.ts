import { describe, it, expect } from 'vitest'
import { filterTasks, getTaskFilterCounts } from './filter-tasks'
import type { TaskItem } from '../types/dashboard.types'

const mockTasks: TaskItem[] = [
  {
    id: 'SEP-1',
    title: 'Task 1',
    major: 'SE',
    assignee: 'Alice',
    deadline: '10/09/2026',
    progress: 100,
    status: 'done',
  },
  {
    id: 'SEP-2',
    title: 'Task 2',
    major: 'UI/UX',
    assignee: 'Bob',
    deadline: '12/09/2026',
    progress: 50,
    status: 'in_progress',
  },
  {
    id: 'SEP-3',
    title: 'Task 3',
    major: 'AI',
    assignee: 'Charlie',
    deadline: '08/09/2026',
    progress: 30,
    status: 'overdue',
    isCritical: true,
  },
]

describe('filterTasks utility', () => {
  it('returns all tasks when filter is "all"', () => {
    const result = filterTasks(mockTasks, 'all')
    expect(result).toHaveLength(3)
    expect(result).toEqual(mockTasks)
  })

  it('filters only in_progress tasks', () => {
    const result = filterTasks(mockTasks, 'in_progress')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('SEP-2')
  })

  it('filters only overdue tasks', () => {
    const result = filterTasks(mockTasks, 'overdue')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('SEP-3')
  })

  it('filters only done tasks', () => {
    const result = filterTasks(mockTasks, 'done')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('SEP-1')
  })

  it('handles empty task list gracefully', () => {
    const result = filterTasks([], 'done')
    expect(result).toEqual([])
  })

  it('handles non-array inputs safely', () => {
    // @ts-expect-error testing boundary condition
    expect(filterTasks(null, 'all')).toEqual([])
    // @ts-expect-error testing boundary condition
    expect(filterTasks(undefined, 'all')).toEqual([])
  })
})

describe('getTaskFilterCounts utility', () => {
  it('calculates counts correctly across statuses', () => {
    const counts = getTaskFilterCounts(mockTasks)
    expect(counts).toEqual({
      all: 3,
      inProgress: 1,
      overdue: 1,
      done: 1,
    })
  })

  it('handles empty list counts', () => {
    const counts = getTaskFilterCounts([])
    expect(counts).toEqual({
      all: 0,
      inProgress: 0,
      overdue: 0,
      done: 0,
    })
  })
})
