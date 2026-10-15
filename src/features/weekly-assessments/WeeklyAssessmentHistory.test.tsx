import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { WeeklyAssessmentHistory } from './WeeklyAssessmentHistory'
const api = vi.hoisted(() => ({ getWeeklyAssessmentHistory: vi.fn() }))
vi.mock('../../services/api/weekly.api', () => api)
const row = { id: 1, projectId: 9, studentId: 12, weekNumber: 2, version: 1, status: 'SUBMITTED', rubricName: 'Theo dõi', rubricVersion: 1, totalScore: 0, scores: [{ rubricCriterionId: 1, name: 'Đóng góp', score: 0, maxScore: 10 }], startDate: '2026-10-01', endDate: '2026-10-07', submittedAt: '2026-10-08T00:00:00Z' }
beforeEach(() => vi.resetAllMocks())
afterEach(cleanup)
describe('Private weekly history', () => {
  it('preserves zero as a real score and reads only the requested student', async () => {
    api.getWeeklyAssessmentHistory.mockResolvedValue({ items: [row], totalCount: 1 })
    render(<WeeklyAssessmentHistory projectId={9} studentId={12} studentOnly />)
    await screen.findByText('Đóng góp')
    expect(screen.queryByText('Chưa chấm')).toBeNull()
    expect(api.getWeeklyAssessmentHistory).toHaveBeenCalledWith(9, { studentId: 12, weekNumber: undefined }, 1, 10, expect.any(AbortSignal))
  })
  it.each([{ ...row, studentId: 13 }, { ...row, status: 'DRAFT' }])('fails closed on an unexpected private response', async item => {
    api.getWeeklyAssessmentHistory.mockResolvedValue({ items: [item], totalCount: 1 })
    render(<WeeklyAssessmentHistory projectId={9} studentId={12} studentOnly />)
    await screen.findByRole('alert'); expect(screen.queryByText('Đóng góp')).toBeNull()
  })
  it('uses server paging for version history', async () => {
    api.getWeeklyAssessmentHistory.mockResolvedValue({ items: [row], totalCount: 11 })
    render(<WeeklyAssessmentHistory projectId={9} studentId={12} studentOnly />)
    fireEvent.click(await screen.findByRole('button', { name: 'Tiếp' }))
    await waitFor(() => expect(api.getWeeklyAssessmentHistory).toHaveBeenLastCalledWith(9, { studentId: 12, weekNumber: undefined }, 2, 10, expect.any(AbortSignal)))
  })
})
