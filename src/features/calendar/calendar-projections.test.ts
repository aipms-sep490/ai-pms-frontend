import { describe, expect, it } from 'vitest'
import { deliverableProjection, evaluationProjection, finalSubmissionProjection, formatCalendarDate, isHistoricalStatus, meetingProjection, milestoneProjection, progressReportProjection, taskProjection } from './calendar-projections'

describe('calendar projections', () => {
  it('keeps DateOnly values as calendar dates and converts timestamps to Vietnam display time', () => {
    expect(formatCalendarDate('2026-10-04')).toBe('04/10/2026')
    expect(formatCalendarDate('2026-10-03T17:30:00Z')).toContain('04/10/2026')
  })

  it('projects supported dated sources with deep links only', () => {
    expect(taskProjection({ id: 1, title: 'Task', status: 'TODO', dueAt: '2026-10-04T01:00:00Z', startAt: null }, 9)?.deepLink).toBe('/project/tasks/1')
    expect(milestoneProjection({ id: 2, projectId: 9, title: 'Milestone', status: 'PLANNED', startDate: '2026-10-01', dueDate: '2026-10-04' })?.dueAt).toBe('2026-10-04')
    expect(meetingProjection({ id: 3, projectId: 9, title: 'Meeting', agenda: null, meetingNotes: null, startAt: '2026-10-04T01:00:00Z', endAt: null, location: null, onlineUrl: null, status: 'SCHEDULED', createdBy: 1, createdByName: 'A', participantCount: 0, createdAt: '', updatedAt: '' }).deepLink).toBe('/project/meetings/3')
    expect(deliverableProjection({ id: 4, projectId: 9, milestoneId: null, title: 'Delivery', description: null, deliverableType: null, dueAt: '2026-10-04T01:00:00Z', status: 'OPEN', createdBy: 1, latestVersion: 0 })?.deepLink).toBe('/project/deliverables')
    expect(finalSubmissionProjection(9, 'Project', '2026-10-06T01:00:00Z')?.deepLink).toBe('/project/final-submission')
  })

  it('does not turn a report period or an assignment timestamp into a deadline', () => {
    expect(progressReportProjection({ id: 5, projectId: 9, title: 'Report', status: 'SUBMITTED' })).toBeNull()
    expect(evaluationProjection({ id: 6, projectId: 9, evaluatorId: 3, rubricId: 2, projectPeriodId: 1, departmentId: 1, evaluationType: 'LECTURER', status: 'ACTIVE', assignedBy: 1, assignedAt: '2026-10-03T01:00:00Z', revokedAt: null, concurrencyToken: 't', scope: 'COMMON', majorId: null, studentId: null, componentId: null, policyVersionId: null })).toBeNull()
    expect(isHistoricalStatus('ARCHIVED')).toBe(true)
  })
})
