import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SupervisorRecommendationPanel } from './SupervisorRecommendationPanel'
import { HttpError } from '../../../services/http/http-client'

const mocks = vi.hoisted(() => ({
  previewSupervisorRecommendations: vi.fn(),
  createSupervisorRecommendationRun: vi.fn(),
  getSupervisorRecommendationHistory: vi.fn(),
  getSupervisorRecommendationRun: vi.fn(),
}))
vi.mock('../api/supervisor-recommendation-api', async () => {
  const actual = await vi.importActual<typeof import('../api/supervisor-recommendation-api')>('../api/supervisor-recommendation-api')
  return {
    ...actual,
    previewSupervisorRecommendations: mocks.previewSupervisorRecommendations,
    createSupervisorRecommendationRun: mocks.createSupervisorRecommendationRun,
    getSupervisorRecommendationHistory: mocks.getSupervisorRecommendationHistory,
    getSupervisorRecommendationRun: mocks.getSupervisorRecommendationRun,
  }
})

afterEach(() => { cleanup(); vi.resetAllMocks() })

const candidate = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 11, userId: 21, fullName: 'TS. An', departmentId: 1, departmentName: 'CNTT', expertise: [],
  activeProjects: 1, semesterActiveProjects: 1, semesterLimit: 3, remainingSlots: 2, selectionPeriodId: 1,
  ...over,
})

// Mirrors SupervisorRecommendationPreview (SupervisorRecommendationService.cs): a live, unpersisted
// paged read — `candidates.items` is the ranked list for the requested assignmentType/majorId slot.
const preview = (items: Record<string, unknown>[]) => ({
  engineVersion: 'rules-v1', assignmentType: 'PRIMARY', majorId: null, generatedAt: '2026-10-08T03:00:00Z',
  candidates: { items, page: 1, pageSize: 20, totalCount: items.length },
})

const item = (over: Partial<Record<string, unknown>> = {}) => ({
  candidate: candidate(),
  score: 0.92, expertiseStatus: 'MATCHED', matchedExpertise: ['AI', 'ML'],
  reasons: ['ELIGIBLE_AT_GENERATION', 'EXPERTISE_MATCHED', 'CAPACITY_AVAILABLE', 'ADVISORY_ONLY'],
  currentlyEligible: true, currentReasons: [],
  ...over,
})

describe('SupervisorRecommendationPanel', () => {
  it('renders ranked suggestions with score, expertise and remaining capacity', async () => {
    mocks.previewSupervisorRecommendations.mockResolvedValue(preview([item()]))
    render(<SupervisorRecommendationPanel projectId={9} />)
    expect(await screen.findByText('TS. An')).toBeTruthy()
    expect(screen.getByText('Phù hợp 92%')).toBeTruthy()
    expect(screen.getByText('AI')).toBeTruthy()
    expect(screen.getByText('Còn nhận 2 nhóm')).toBeTruthy()
  })

  it('requests the slot being filled (assignmentType + majorId), not always PRIMARY', async () => {
    mocks.previewSupervisorRecommendations.mockResolvedValue(preview([]))
    render(<SupervisorRecommendationPanel projectId={9} assignmentType="DISCIPLINE_MENTOR" majorId={7} />)
    await screen.findByText('Chưa có gợi ý nào cho vị trí này.')
    expect(mocks.previewSupervisorRecommendations).toHaveBeenCalledWith(9, { assignmentType: 'DISCIPLINE_MENTOR', majorId: 7 }, expect.anything())
  })

  it('distinguishes UNKNOWN expertise from NO_MATCH when there is nothing matched', async () => {
    mocks.previewSupervisorRecommendations.mockResolvedValue(preview([
      item({ candidate: candidate({ id: 12, fullName: 'TS. Bình' }), expertiseStatus: 'UNKNOWN', matchedExpertise: [] }),
    ]))
    render(<SupervisorRecommendationPanel projectId={9} />)
    expect(await screen.findByText('Giảng viên chưa khai báo chuyên môn.')).toBeTruthy()
  })

  it('picks a selectable suggestion by candidate id and blocks one that is not a candidate', async () => {
    mocks.previewSupervisorRecommendations.mockResolvedValue(preview([
      item(),
      item({ candidate: candidate({ id: 12, fullName: 'TS. Bình' }) }),
    ]))
    const onPick = vi.fn()
    render(<SupervisorRecommendationPanel projectId={9} candidateIds={new Set([11])} onPick={onPick} />)
    await screen.findByText('TS. An')
    fireEvent.click(screen.getByRole('button', { name: 'Chọn giảng viên này' }))
    expect(onPick).toHaveBeenCalledWith(11)
    expect(screen.getByText('Giảng viên này hiện không nằm trong danh sách có thể mời.')).toBeTruthy()
  })

  it('shows an empty state for a successful response with no items (not an error)', async () => {
    mocks.previewSupervisorRecommendations.mockResolvedValue(preview([]))
    render(<SupervisorRecommendationPanel projectId={9} />)
    expect(await screen.findByText('Chưa có gợi ý nào cho vị trí này.')).toBeTruthy()
  })

  it('shows a distinct message when access is denied', async () => {
    mocks.previewSupervisorRecommendations.mockRejectedValue(new HttpError('forbidden', 403))
    render(<SupervisorRecommendationPanel projectId={9} />)
    expect((await screen.findByRole('alert')).textContent).toContain('chưa có quyền')
  })

  it('shows a generic error with retry on an unexpected failure (e.g. 404 feature disabled)', async () => {
    mocks.previewSupervisorRecommendations.mockRejectedValue(new HttpError('disabled', 404))
    render(<SupervisorRecommendationPanel projectId={9} />)
    expect((await screen.findByRole('alert')).textContent).toContain('Chưa tải được')
  })

  it('displays warning when candidate is currently not eligible', async () => {
    mocks.previewSupervisorRecommendations.mockResolvedValue(preview([
      item({ currentlyEligible: false, currentReasons: ['CAPACITY_EXCEEDED'] }),
    ]))
    render(<SupervisorRecommendationPanel projectId={9} />)
    expect(await screen.findByText(/Giảng viên này hiện không còn đủ điều kiện/)).toBeTruthy()
    expect(screen.getByText(/CAPACITY_EXCEEDED/)).toBeTruthy()
  })

  it('allows saving current recommendation run and viewing history runs', async () => {
    const { waitFor } = await import('@testing-library/react')
    mocks.previewSupervisorRecommendations.mockResolvedValue(preview([item()]))
    mocks.createSupervisorRecommendationRun.mockResolvedValue({
      id: 88, projectId: 9, createdBy: 1, createdAt: '2026-10-15T10:00:00Z', engineVersion: 'rules-v1',
      assignmentType: 'PRIMARY', majorId: null, search: null, page: 1, pageSize: 20, totalCount: 1,
      items: [item({ candidate: candidate({ id: 11, fullName: 'TS. An' }) })],
    })
    mocks.getSupervisorRecommendationHistory.mockResolvedValue({
      items: [{ id: 88, createdAt: '2026-10-15T10:00:00Z', createdBy: 1, assignmentType: 'PRIMARY', majorId: null, engineVersion: 'rules-v1', itemCount: 1, totalCount: 1 }],
      page: 1, pageSize: 20, totalCount: 1, totalPages: 1,
    })
    mocks.getSupervisorRecommendationRun.mockResolvedValue({
      id: 88, projectId: 9, createdBy: 1, createdAt: '2026-10-15T10:00:00Z', engineVersion: 'rules-v1',
      assignmentType: 'PRIMARY', majorId: null, search: null, page: 1, pageSize: 20, totalCount: 1,
      items: [item({ candidate: candidate({ id: 11, fullName: 'TS. An (từ Run 88)' }) })],
    })

    render(<SupervisorRecommendationPanel projectId={9} />)
    await screen.findByText('TS. An')

    // Click "Lưu run hiện tại"
    fireEvent.click(screen.getByRole('button', { name: 'Lưu run hiện tại' }))
    await waitFor(() => {
      expect(mocks.createSupervisorRecommendationRun).toHaveBeenCalledWith(9, { assignmentType: 'PRIMARY', majorId: undefined })
    })
    expect(await screen.findByText(/Đã lưu phiên gợi ý #88/)).toBeTruthy()

    // Click "Lịch sử gợi ý"
    fireEvent.click(screen.getByRole('button', { name: 'Lịch sử gợi ý' }))
    await waitFor(() => {
      expect(mocks.getSupervisorRecommendationHistory).toHaveBeenCalledWith(9, 1, 20)
    })
    expect(await screen.findByText(/Lịch sử các phiên gợi ý đã lưu/)).toBeTruthy()

    // Click "Xem" for run 88
    fireEvent.click(screen.getByRole('button', { name: /Xem \(1 GV\)/ }))
    await waitFor(() => {
      expect(mocks.getSupervisorRecommendationRun).toHaveBeenCalledWith(9, 88)
    })
    expect(await screen.findByText('TS. An (từ Run 88)')).toBeTruthy()
    expect(screen.getByText(/Đang xem kết quả lịch sử/)).toBeTruthy()
  })
})
