import { describe, expect, it } from 'vitest'
import type { TeamMemberDto, TimelineTaskDto } from '../../../types/backend'
import { dateLabel, isOverdue, summarizeMembers, utcTimestamp } from './collaboration-workspace'

const members: TeamMemberDto[] = Array.from({ length: 5 }, (_, index) => ({
  userId: index + 1, fullName: `Thành viên ${index + 1}`, isLeader: index === 0, isEligibleStudent: true,
}))
const task = (id: number, status: string, assignees = [1], dueAt: string | null = null): TimelineTaskDto => ({
  id, status, title: `Việc ${id}`, dueAt, assignees: assignees.map(userId => ({ userId, fullName: `Thành viên ${userId}` })), dependencies: [],
})

describe('collaboration progress definitions', () => {
  it('keeps five real members, includes shared and cancelled tasks, and never invents progress for unassigned members', () => {
    const tasks = [task(1, 'DONE', [1, 2]), task(2, 'CANCELLED'), task(3, 'BLOCKED', [1], '2026-09-25T23:00:00'),
      ...Array.from({ length: 101 }, (_, index) => task(index + 4, 'DONE'))]
    const rows = summarizeMembers(members, tasks, Date.parse('2026-09-26T00:00:00Z'))
    expect(rows).toHaveLength(5)
    expect(rows[0]).toMatchObject({ assigned: 104, completed: 102, progress: 102 / 104 * 100, blocked: 1, overdue: 1 })
    expect(rows[0].currentTask?.id).toBe(3)
    expect(rows[1]).toMatchObject({ assigned: 1, completed: 1, progress: 100 })
    expect(rows[4]).toMatchObject({ assigned: 0, progress: null, blocked: 0, overdue: 0 })
  })
  it('interprets offsetless SQL datetimes as UTC and preserves calendar dates in Vietnam', () => {
    expect(utcTimestamp('2026-09-25T18:00:00')).toBe(Date.parse('2026-09-25T18:00:00Z'))
    expect(dateLabel('2026-09-25T18:00:00')).toBe('26/09')
    expect(dateLabel('2026-09-25')).toBe('25/09')
    expect(isOverdue(task(1, 'TODO', [1], '2026-09-25T18:00:00'), Date.parse('2026-09-25T17:00:00Z'))).toBe(false)
    expect(isOverdue(task(1, 'CANCELLED', [1], '2020-01-01T00:00:00'), Date.now())).toBe(false)
    expect(isOverdue(task(1, 'DONE', [1], '2020-01-01T00:00:00'), Date.now())).toBe(false)
  })
})
