import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { HttpError } from '../../services/http/http-client'
import { EvaluationWorkspacePage } from './EvaluationWorkspacePage'

const api = vi.hoisted(() => ({ getEvaluationDraft: vi.fn(), saveEvaluationDraft: vi.fn(), finalizeEvaluation: vi.fn() }))
vi.mock('../../services/api/evaluations.api', () => api)
afterEach(cleanup)
const draft = { id: 5, assignmentId: 4, projectId: 9, evaluatorId: 2, rubricId: 3, rubricName: 'Final rubric', rootRubricId: 3, rubricVersion: 1, evaluationType: 'LECTURER', status: 'DRAFT', comments: null, totalScore: null, scoreScale: 10, calculationRule: 'WEIGHTED_10', missingCriterionIds: [12], missingRequiredCriterionIds: [12], concurrencyToken: 'current-token', createdAt: '2026-09-22', updatedAt: '2026-09-22', finalization: null, scores: [{ rubricCriterionId: 12, name: 'Thiết kế', description: null, weightPercent: 100, maxScore: 10, sortOrder: 1, isRequired: true, score: null, comments: null }] }
function page() { return render(<MemoryRouter initialEntries={['/evaluator/evaluations/5']}><Routes><Route path="/evaluator/evaluations/:evaluationId" element={<EvaluationWorkspacePage />} /></Routes></MemoryRouter>) }
beforeEach(() => { vi.clearAllMocks(); api.getEvaluationDraft.mockResolvedValue(draft) })
describe('EvaluationWorkspacePage', () => {
  it('does not allow finalization while Backend reports missing criteria', async () => {
    page(); await screen.findByText('Final rubric · v1')
    expect((screen.getByRole('button', { name: 'Finalize evaluation' }) as HTMLButtonElement).disabled).toBe(true)
    expect(api.finalizeEvaluation).not.toHaveBeenCalled()
  })
  it('saves a complete explicit score-set with the latest concurrency token', async () => {
    api.saveEvaluationDraft.mockResolvedValue({ ...draft, totalScore: 8, missingCriterionIds: [], missingRequiredCriterionIds: [] })
    page(); await screen.findByText('Final rubric · v1')
    fireEvent.change(screen.getByLabelText('Điểm Thiết kế'), { target: { value: '8' } })
    fireEvent.change(screen.getByLabelText('Nhận xét Thiết kế'), { target: { value: 'Rõ ràng' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu draft điểm' }))
    await waitFor(() => expect(api.saveEvaluationDraft).toHaveBeenCalledWith(5, { concurrencyToken: 'current-token', comments: null, scores: [{ rubricCriterionId: 12, score: 8, comments: 'Rõ ràng' }] }))
  })
  it('reloads the protected draft rather than retrying a stale save', async () => {
    api.saveEvaluationDraft.mockRejectedValue(new HttpError('stale', 409)); page(); await screen.findByText('Final rubric · v1')
    fireEvent.click(screen.getByRole('button', { name: 'Lưu draft điểm' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/đã thay đổi/))
    expect(api.saveEvaluationDraft).toHaveBeenCalledOnce(); expect(api.getEvaluationDraft.mock.calls.length).toBeGreaterThan(1)
  })
})
