import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { IndividualProcessScoringPanel } from './IndividualProcessScoringPanel'
import * as api from '../../../services/api/evaluations.api'
import { HttpError } from '../../../services/http/http-client'

vi.mock('../../../services/api/evaluations.api', () => ({
  getProjectIndividualProcessScores: vi.fn(),
  saveIndividualProcessScore: vi.fn(),
  finalizeIndividualProcessScore: vi.fn(),
}))

describe('IndividualProcessScoringPanel (POL-03)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('allows primary supervisor to save and finalize G1 individual score and shows cumulative score', async () => {
    vi.mocked(api.getProjectIndividualProcessScores).mockResolvedValue({
      projectId: 10,
      viewerRole: 'PRIMARY_SUPERVISOR',
      canEdit: true,
      gateWeights: [
        { gateNumber: 1, weightPercent: 20 },
        { gateNumber: 2, weightPercent: 35 },
        { gateNumber: 3, weightPercent: 45 },
      ],
      students: [{
        studentId: 101,
        studentName: 'Nguyen Van A',
        majorId: 1,
        cumulativeScore: 8.25,
        isComplete: true,
        gateScores: [{
          id: 501, gateInstanceId: 1, gateNumber: 1, studentId: 101, supervisorAssignmentId: 7,
          score: 7.5, gateWeightPercent: 20, mentorReferenceNotes: 'Tiến độ tốt', comments: 'Ổn',
          status: 'DRAFT', concurrencyToken: 'tok1', updatedAt: '2026-11-22T00:00:00Z', finalizedAt: null,
        }],
      }],
    })
    vi.mocked(api.finalizeIndividualProcessScore).mockResolvedValue({
      id: 501, gateInstanceId: 1, gateNumber: 1, studentId: 101, supervisorAssignmentId: 7,
      score: 7.5, gateWeightPercent: 20, mentorReferenceNotes: 'Tiến độ tốt', comments: 'Ổn',
      status: 'FINALIZED', concurrencyToken: 'tok2', updatedAt: '2026-11-22T00:00:00Z', finalizedAt: '2026-11-22T00:01:00Z',
    })

    render(<IndividualProcessScoringPanel projectId={10} gateInstances={[{ id: 1, gateNumber: 1, title: 'Gate 1' }]} />)

    expect(await screen.findByText('Tích lũy 20%: 8.25/10')).toBeTruthy()
    expect(screen.getByText(/Tiến độ tốt/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Chốt G1' }))
    await waitFor(() => {
      expect(api.finalizeIndividualProcessScore).toHaveBeenCalledWith(10, 1, 101, 'tok1')
    })
  })

  it('hides scores and shows privacy alert when backend returns 403 RESULT_NOT_PUBLISHED', async () => {
    vi.mocked(api.getProjectIndividualProcessScores).mockRejectedValue(
      new HttpError('Hidden', 403, { code: 'RESULT_NOT_PUBLISHED', detail: 'Hidden' }),
    )
    render(<IndividualProcessScoringPanel projectId={10} gateInstances={[{ id: 1, gateNumber: 1, title: 'Gate 1' }]} />)
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Điểm 20% cá nhân quá trình đang được ẩn')
  })
})
