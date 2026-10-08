import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { HttpError } from '../../services/http/http-client'
import { EvaluationWorkspacePage } from './EvaluationWorkspacePage'
const api = vi.hoisted(() => ({ getEvaluationDraft: vi.fn() }))
vi.mock('../../services/api/evaluations.api', () => api)
afterEach(cleanup)
beforeEach(() => vi.clearAllMocks())
function page(id = '5') { render(<MemoryRouter initialEntries={['/evaluator/evaluations/' + id]}><Routes><Route path="/evaluator/evaluations/:evaluationId" element={<EvaluationWorkspacePage />} /><Route path="/evaluator/assignments/:assignmentId" element={<p>Guarded assignment</p>} /></Routes></MemoryRouter>) }
it('resolves a saved evaluation URL to the canonical assignment route', async () => {
  api.getEvaluationDraft.mockResolvedValue({ assignmentId: 4 }); page()
  expect(await screen.findByText('Guarded assignment')).toBeTruthy()
  expect(api.getEvaluationDraft).toHaveBeenCalledWith(5, expect.any(AbortSignal))
})
it('keeps denied evaluations denied without exposing an alternative scoring form', async () => {
  api.getEvaluationDraft.mockRejectedValue(new HttpError('denied', 403)); page()
  expect(await screen.findByRole('alert')).toBeTruthy()
  expect(screen.queryByText('Guarded assignment')).toBeNull()
  expect(screen.getByRole('link', { name: 'Về danh sách phân công' }).getAttribute('href')).toBe('/evaluator/workspace')
})
it('rejects invalid URLs without making an API request', () => {
  page('oops'); expect(screen.getByRole('alert').textContent).toContain('Mã đánh giá không hợp lệ')
  expect(api.getEvaluationDraft).not.toHaveBeenCalled()
})
it('does not invent an assignment when the response has no valid reference', async () => {
  api.getEvaluationDraft.mockResolvedValue({ assignmentId: null }); page()
  expect((await screen.findByRole('alert')).textContent).toContain('chưa có phân công hợp lệ')
})
