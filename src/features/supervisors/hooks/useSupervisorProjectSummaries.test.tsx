import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProjectDto } from '../../../types/backend'

const gateway = vi.hoisted(() => ({ task: { getProjectProgressSummary: vi.fn(), getOverdueBlockedTasks: vi.fn() } }))
const meetings = vi.hoisted(() => ({ getMeetings: vi.fn() }))
const reports = vi.hoisted(() => ({ getProgressReports: vi.fn() }))
vi.mock('../../../services/service-gateway', () => ({ services: gateway }))
vi.mock('../../../services/api/meetings.api', () => meetings)
vi.mock('../../../services/api/progress-reports.api', () => reports)
import { useSupervisorProjectSummaries } from './useSupervisorProjectSummaries'

const activeAssignments = [{
  id: 3,
  projectId: 9,
  supervisorProfileId: 4,
  supervisorUserId: 4,
  supervisorName: 'Dr. Mai',
  supervisorRequestId: 8,
  isPrimary: true,
  assignedAt: '2026-09-15',
  endedAt: null,
}]
const activeProjects: Record<number, ProjectDto> = { 9: { id: 9, status: 'ACTIVE' } as ProjectDto }

describe('useSupervisorProjectSummaries', () => {
  beforeEach(() => {
    gateway.task.getProjectProgressSummary.mockReset().mockResolvedValue({ progressPercentage: 40, doneTasks: 2, totalTasks: 5 })
    gateway.task.getOverdueBlockedTasks.mockReset().mockResolvedValue({ overdueTasks: [], blockedTasks: [] })
    reports.getProgressReports.mockReset().mockResolvedValue({ items: [], totalCount: 0, totalPages: 1 })
    meetings.getMeetings.mockReset()
  })

  it('finds the next scheduled meeting across every page supplied by the API', async () => {
    meetings.getMeetings.mockResolvedValueOnce({
      items: [{ startAt: '2026-11-20T09:00:00.000Z' }], totalCount: 2, totalPages: 2,
    }).mockResolvedValueOnce({
      items: [{ startAt: '2026-11-03T09:00:00.000Z' }], totalCount: 2, totalPages: 2,
    })
    const { result } = renderHook(() => useSupervisorProjectSummaries(activeAssignments, activeProjects))
    await waitFor(() => expect(result.current[9]?.meetings).toEqual({
      state: 'ready', data: { count: 2, nextAt: '2026-11-03T09:00:00.000Z' },
    }))
    expect(meetings.getMeetings).toHaveBeenNthCalledWith(2, 9, expect.objectContaining({ status: 'SCHEDULED', page: 2, pageSize: 100 }))
  })
})
