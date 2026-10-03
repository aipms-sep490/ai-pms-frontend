import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const gateway = vi.hoisted(() => ({ milestone: { getProjectMilestones: vi.fn() } }))
const meetings = vi.hoisted(() => ({ getMeetings: vi.fn() }))
const deliverables = vi.hoisted(() => ({ getDeliverables: vi.fn() }))
const finalSubmission = vi.hoisted(() => ({ getFinalChecklist: vi.fn() }))
const reports = vi.hoisted(() => ({ getProgressReports: vi.fn() }))
const evaluations = vi.hoisted(() => ({ getMyEvaluationAssignments: vi.fn() }))
vi.mock('../../../services/service-gateway', () => ({ services: gateway }))
vi.mock('../../../services/api/meetings.api', () => meetings)
vi.mock('../../../services/api/deliverables.api', () => deliverables)
vi.mock('../../final-submission/final-submission-api', () => finalSubmission)
vi.mock('../../../services/api/progress-reports.api', () => reports)
vi.mock('../../../services/api/evaluations.api', () => evaluations)
import { useSupervisorOperationalSummary } from './useSupervisorOperationalSummary'

describe('useSupervisorOperationalSummary', () => {
  beforeEach(() => {
    gateway.milestone.getProjectMilestones.mockReset().mockResolvedValue([{ id: 4, title: 'Kiểm thử', status: 'IN_PROGRESS' }])
    meetings.getMeetings.mockReset().mockResolvedValue({ items: [{ id: 31, title: 'Rà soát', startAt: '2026-10-10T02:00:00Z' }], totalCount: 1, totalPages: 1 })
    deliverables.getDeliverables.mockReset().mockResolvedValue({ items: [], totalCount: 3, totalPages: 3 })
    finalSubmission.getFinalChecklist.mockReset().mockResolvedValue({ projectId: 9, projectPeriodId: 3, deadline: null, draftConcurrencyToken: null, requirementsConcurrencyToken: null, canSubmit: false, blockers: ['MISSING_REQUIRED_VERSION'], items: [] })
    reports.getProgressReports.mockReset().mockResolvedValue({ items: [], totalCount: 2, totalPages: 2 })
    evaluations.getMyEvaluationAssignments.mockReset().mockResolvedValue({ items: [], totalCount: 0, totalPages: 1 })
  })

  it('renders attention from independent Backend resources and uses the explicit SUBMITTED report count', async () => {
    const { result } = renderHook(() => useSupervisorOperationalSummary(9))
    await waitFor(() => expect(result.current.pendingReports).toEqual({ state: 'ready', data: { count: 2 } }))
    expect(result.current.milestone).toEqual({ state: 'ready', data: { count: 1, current: expect.objectContaining({ id: 4 }) } })
    expect(result.current.meeting).toEqual({ state: 'ready', data: { count: 1, next: expect.objectContaining({ id: 31 }) } })
    expect(reports.getProgressReports).toHaveBeenCalledWith(9, { status: 'SUBMITTED', page: 1, pageSize: 1 })
  })

  it('exposes an Evaluation entry only when a later page contains an ACTIVE assignment for this project', async () => {
    evaluations.getMyEvaluationAssignments.mockReset()
      .mockResolvedValueOnce({ items: [], totalCount: 101, totalPages: 2 })
      .mockResolvedValueOnce({ items: [{ id: 7, projectId: 9, status: 'ACTIVE' }], totalCount: 101, totalPages: 2 })
    const { result } = renderHook(() => useSupervisorOperationalSummary(9))
    await waitFor(() => expect(result.current.evaluator).toEqual({ state: 'ready', data: true }))
    expect(evaluations.getMyEvaluationAssignments).toHaveBeenNthCalledWith(2, 2, 100)
  })

  it('keeps other resources ready when final readiness is forbidden', async () => {
    finalSubmission.getFinalChecklist.mockRejectedValue(new Error('forbidden'))
    const { result } = renderHook(() => useSupervisorOperationalSummary(9))
    await waitFor(() => expect(result.current.finalChecklist.state).toBe('error'))
    expect(result.current.meeting.state).toBe('ready')
    expect(result.current.deliverables).toEqual({ state: 'ready', data: { count: 3 } })
  })
})
