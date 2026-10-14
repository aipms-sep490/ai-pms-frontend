import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SupervisorRecommendationPanel } from './SupervisorRecommendationPanel'
import { HttpError } from '../../../services/http/http-client'

const mocks = vi.hoisted(() => ({ previewSupervisorRecommendations: vi.fn() }))
vi.mock('../api/supervisor-recommendation-api', async () => {
  const actual = await vi.importActual<typeof import('../api/supervisor-recommendation-api')>('../api/supervisor-recommendation-api')
  return { ...actual, previewSupervisorRecommendations: mocks.previewSupervisorRecommendations }
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
})
