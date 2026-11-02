import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { DeliverableAiReviewModal } from './DeliverableAiReviewModal'

const api = vi.hoisted(() => ({
  getDeliverableReviewOptions: vi.fn(),
  getDeliverableAiReviews: vi.fn(),
  reviewDeliverableVersionWithAi: vi.fn(),
}))
vi.mock('../../services/api/deliverables.api', () => api)

const options = { scope: 'MAJOR_SPECIFIC', rubrics: [{ id: 12, title: 'Rubric IT', version: 1, assignedToProject: true }], checklists: [] }
const result = {
  runId: 901, projectId: 7, deliverableVersionId: 22, status: 'COMPLETED', readiness: 'PARTIAL', readinessPercent: 50,
  summary: 'Còn thiếu minh chứng kiểm thử.', criteria: [{ criterionId: 1, criterionName: 'Kiến trúc', status: 'PARTIAL', findings: ['Thiếu mô tả deployment.'], missingEvidence: ['Sơ đồ deployment'], suggestions: ['Bổ sung sơ đồ deployment.'] }],
  citations: [{ title: 'Rubric IT', version: 'v1', section: 'Kiến trúc' }], insufficientEvidence: false, limitationNote: 'Tham khảo', generationStatus: 'COMPLETED',
}

beforeEach(() => {
  vi.resetAllMocks()
  api.getDeliverableReviewOptions.mockResolvedValue(options)
  api.getDeliverableAiReviews.mockResolvedValue({ items: [], totalCount: 0 })
  api.reviewDeliverableVersionWithAi.mockResolvedValue(result)
})
afterEach(cleanup)

describe('DeliverableAiReviewModal', () => {
  it('shows criteria and citations without raw identifiers', async () => {
    render(<DeliverableAiReviewModal projectId={7} versionId={22} versionNumber={1} onClose={vi.fn()} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Bắt đầu kiểm tra' }))
    await screen.findByText('Còn thiếu minh chứng kiểm thử.')
    expect(screen.getByText('Kiến trúc')).toBeTruthy()
    expect(screen.getByText('Rubric IT · v1 · Kiến trúc')).toBeTruthy()
    expect(screen.queryByText(/901|deliverableVersionId|criterionId/)).toBeNull()
  })

  it('locks duplicate review requests while the first request is pending', async () => {
    let resolve: (value: typeof result) => void = () => undefined
    api.reviewDeliverableVersionWithAi.mockReturnValue(new Promise<typeof result>(r => { resolve = r }))
    render(<DeliverableAiReviewModal projectId={7} versionId={22} versionNumber={1} onClose={vi.fn()} />)
    const button = await screen.findByRole('button', { name: 'Bắt đầu kiểm tra' })
    fireEvent.click(button); fireEvent.click(button)
    expect(api.reviewDeliverableVersionWithAi).toHaveBeenCalledTimes(1)
    resolve(result)
    await waitFor(() => expect(screen.getByText('Còn thiếu minh chứng kiểm thử.')).toBeTruthy())
  })
})
