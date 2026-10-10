import { describe, expect, it } from 'vitest'
import { canDrop, countInColumn, moveTask, shiftStatus, type Movable } from './board-dnd'

const order = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE'] as const
const tasks: Movable[] = [
  { id: 1, status: 'TODO' },
  { id: 2, status: 'IN_PROGRESS' },
  { id: 3, status: 'IN_PROGRESS' },
]

describe('board drag-drop logic', () => {
  it('shifts status within bounds and clamps at the ends', () => {
    expect(shiftStatus(order, 'TODO', 1)).toBe('IN_PROGRESS')
    expect(shiftStatus(order, 'TODO', -1)).toBe('TODO')
    expect(shiftStatus(order, 'DONE', 1)).toBe('DONE')
    expect(shiftStatus(order, 'UNKNOWN', 1)).toBe('UNKNOWN')
  })

  it('counts tasks per column', () => {
    expect(countInColumn(tasks, 'IN_PROGRESS')).toBe(2)
    expect(countInColumn(tasks, 'DONE')).toBe(0)
  })

  it('enforces a positive WIP limit but always allows a reorder in place', () => {
    expect(canDrop(tasks, 1, 'IN_PROGRESS', 2)).toBe(false)
    expect(canDrop(tasks, 1, 'IN_PROGRESS', 0)).toBe(true)
    expect(canDrop(tasks, 2, 'IN_PROGRESS', 2)).toBe(true) // already there
    expect(canDrop(tasks, 99, 'TODO', 0)).toBe(false) // missing task
  })

  it('moves a task immutably and returns the same reference when blocked or unchanged', () => {
    const moved = moveTask(tasks, 1, 'BLOCKED', 0)
    expect(moved.find(task => task.id === 1)?.status).toBe('BLOCKED')
    expect(moved).not.toBe(tasks)
    expect(moveTask(tasks, 2, 'IN_PROGRESS', 0)).toBe(tasks) // no-op
    expect(moveTask(tasks, 1, 'IN_PROGRESS', 2)).toBe(tasks) // WIP full
  })
})
