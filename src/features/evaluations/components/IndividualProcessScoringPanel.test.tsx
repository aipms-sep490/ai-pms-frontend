import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as evaluationsApi from '../../../services/api/evaluations.api'
import { HttpError } from '../../../services/http/http-client'
import { IndividualProcessScoringPanel } from './IndividualProcessScoringPanel'

vi.mock('../../../services/api/evaluations.api')

const mockGates = [
  { id: 101, gateNumber: 1, title: 'Cổng 1' },
  { id: 102, gateNumber: 2, title: 'Cổng 2' },
  { id: 103, gateNumber: 3, title: 'Cổng 3' },
]

describe('IndividualProcessScoringPanel (TK-W2-10)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  afterEach(() => {
    cleanup()
  })

  it('allows Discipline Mentor to save reference notes even before Primary Supervisor enters a draft score', async () => {
    vi.mocked(evaluationsApi.getProjectIndividualProcessScores).mockResolvedValue({
      projectId: 10,
      viewerRole: 'DISCIPLINE_MENTOR',
      canEdit: false,
      gateWeights: [
        { gateNumber: 1, weightPercent: 30 },
        { gateNumber: 2, weightPercent: 35 },
        { gateNumber: 3, weightPercent: 35 },
      ],
      students: [
        {
          studentId: 501,
          studentName: 'Nguyễn Minh A',
          majorId: 1,
          cumulativeScore: null,
          isComplete: false,
          gateScores: [],
        },
      ],
    })
    vi.mocked(evaluationsApi.saveIndividualProcessMentorNote).mockResolvedValue({
      id: 900,
      gateInstanceId: 101,
      gateNumber: 1,
      studentId: 501,
      supervisorAssignmentId: 77,
      gateWeightPercent: 30,
      score: null,
      comments: null,
      mentorReferenceNotes: 'Phân tích thị trường rõ ràng.',
      status: 'DRAFT',
      finalizedAt: null,
      updatedAt: '2026-11-28T00:00:00Z',
      concurrencyToken: 'tok-1',
    })

    render(<IndividualProcessScoringPanel projectId={10} gateInstances={mockGates} />)

    await screen.findByText('Nhận xét Quá trình Tham khảo (G1–G3 · Mentor chuyên ngành)')
    // Mentor never sees numeric score inputs
    expect(screen.queryByLabelText('Điểm G1 Nguyễn Minh A')).toBeNull()

    const noteArea = screen.getByLabelText('Nhận xét Mentor G1 Nguyễn Minh A')
    fireEvent.change(noteArea, { target: { value: 'Phân tích thị trường rõ ràng.' } })
    fireEvent.click(screen.getAllByRole('button', { name: 'Lưu nhận xét tham khảo' })[0])

    await waitFor(() => {
      expect(evaluationsApi.saveIndividualProcessMentorNote).toHaveBeenCalledWith(10, 101, 501, {
        mentorReferenceNotes: 'Phân tích thị trường rõ ràng.',
        concurrencyToken: null,
      })
    })
    expect(await screen.findByText('Đã lưu nhận xét tham khảo gửi GVHD Chính.')).toBeTruthy()
  })

  it('requires confirmation before Primary Supervisor finalizes a gate score and handles 409 stale concurrency', async () => {
    vi.mocked(evaluationsApi.getProjectIndividualProcessScores).mockResolvedValue({
      projectId: 10,
      viewerRole: 'PRIMARY_SUPERVISOR',
      canEdit: true,
      gateWeights: [
        { gateNumber: 1, weightPercent: 30 },
        { gateNumber: 2, weightPercent: 35 },
        { gateNumber: 3, weightPercent: 35 },
      ],
      students: [
        {
          studentId: 501,
          studentName: 'Nguyễn Minh A',
          majorId: 1,
          cumulativeScore: null,
          isComplete: false,
          gateScores: [
            {
              id: 900,
              gateInstanceId: 101,
              gateNumber: 1,
              studentId: 501,
              supervisorAssignmentId: 77,
              gateWeightPercent: 30,
              score: 8.5,
              comments: 'Hoàn thành tốt',
              mentorReferenceNotes: 'Đóng góp MKT tốt',
              status: 'DRAFT',
              finalizedAt: null,
              updatedAt: '2026-11-28T00:00:00Z',
              concurrencyToken: 'tok-1',
            },
          ],
        },
      ],
    })
    vi.mocked(evaluationsApi.finalizeIndividualProcessScore).mockRejectedValue(
      new HttpError('Bản ghi đã thay đổi bởi phiên khác.', 409, {
        code: 'STALE_CONCURRENCY_TOKEN',
        detail: 'Bản ghi đã thay đổi bởi phiên khác.',
      }),
    )

    render(<IndividualProcessScoringPanel projectId={10} gateInstances={mockGates} />)

    await screen.findByText('Đóng góp MKT tốt')
    fireEvent.click(screen.getByRole('button', { name: 'Chốt G1' }))

    // Confirmation dialog opens before calling API
    const confirmBtn = await screen.findByRole('button', { name: 'Chốt điểm G1' })
    expect(evaluationsApi.finalizeIndividualProcessScore).not.toHaveBeenCalled()

    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(evaluationsApi.finalizeIndividualProcessScore).toHaveBeenCalledWith(10, 101, 501, 'tok-1')
    })
    expect(await screen.findByRole('button', { name: 'Tải lại phiên bản mới nhất' })).toBeTruthy()
  })
})
