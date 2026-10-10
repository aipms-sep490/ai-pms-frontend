import { describe, expect, it } from 'vitest'
import { activeSprint, backlogTasks, canCompleteSprint, canStartSprint, collectLabels, parseLabels, pendingTasksInSprint, sprintPoints, tasksInSprint } from './sprint-model'
import type { SprintDto, TaskDto } from '../../types/backend'

const sprint = (id: number, status: string): SprintDto => ({ id, projectId: 1, name: `S${id}`, status })
const task = (id: number, over: Partial<TaskDto>): TaskDto => ({ id, milestoneId: 1, title: `T${id}`, status: 'TODO', createdBy: 1, createdByFullName: 'x', createdAt: '', updatedAt: '', assignees: [], dependencies: [], ...over })

describe('sprint model', () => {
  it('finds the single active sprint', () => {
    expect(activeSprint([sprint(1, 'PLANNING'), sprint(2, 'ACTIVE')])?.id).toBe(2)
    expect(activeSprint([sprint(1, 'PLANNING')])).toBeNull()
  })

  it('allows starting a planning sprint only when none is active', () => {
    const sprints = [sprint(1, 'PLANNING'), sprint(2, 'PLANNING')]
    expect(canStartSprint(sprints, 1)).toBe(true)
    expect(canStartSprint([sprint(1, 'PLANNING'), sprint(2, 'ACTIVE')], 1)).toBe(false)
    expect(canStartSprint(sprints, 99)).toBe(false)
  })

  it('splits tasks into sprint members and backlog', () => {
    const tasks = [task(1, { sprintId: 5 }), task(2, { sprintId: null }), task(3, {})]
    expect(tasksInSprint(tasks, 5).map(t => t.id)).toEqual([1])
    expect(backlogTasks(tasks).map(t => t.id)).toEqual([2, 3])
  })

  it('blocks completing a sprint until every task is done or cancelled', () => {
    const open = [task(1, { sprintId: 5, status: 'IN_PROGRESS' })]
    const closed = [task(1, { sprintId: 5, status: 'DONE' }), task(2, { sprintId: 5, status: 'CANCELLED' })]
    expect(pendingTasksInSprint(open, 5)).toHaveLength(1)
    expect(canCompleteSprint(sprint(5, 'ACTIVE'), open)).toBe(false)
    expect(canCompleteSprint(sprint(5, 'ACTIVE'), closed)).toBe(true)
    expect(canCompleteSprint(sprint(5, 'PLANNING'), closed)).toBe(false)
  })

  it('sums committed and done story points', () => {
    const tasks = [task(1, { sprintId: 5, storyPoints: 5, status: 'DONE' }), task(2, { sprintId: 5, storyPoints: 3, status: 'TODO' }), task(3, { sprintId: 5, status: 'DONE' })]
    expect(sprintPoints(tasks, 5)).toEqual({ total: 8, done: 5, count: 3 })
  })

  it('collects and parses labels cleanly', () => {
    const tasks = [task(1, { labels: ['ui', 'bug'] }), task(2, { labels: ['bug', ' '] }), task(3, {})]
    expect(collectLabels(tasks)).toEqual(['bug', 'ui'])
    expect(parseLabels('ui, bug , ui,  ')).toEqual(['ui', 'bug'])
  })
})
