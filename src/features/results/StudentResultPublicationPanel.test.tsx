import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StudentResultPublicationPanel } from './StudentResultPublicationPanel'
const api = vi.hoisted(() => ({ getStudentResult: vi.fn(), getStudentResultPreview: vi.fn(), publishStudentResult: vi.fn(), getEvaluationSchemes: vi.fn() }))
vi.mock('../../services/api/project-results.api', () => api)
vi.mock('../../services/api/evaluations.api', () => api)
beforeEach(() => { api.getEvaluationSchemes.mockResolvedValue([{ status: 'PUBLISHED', students: [{ studentId: 9 }, { studentId: 10 }] }]); api.getStudentResult.mockResolvedValue(null); api.getStudentResultPreview.mockResolvedValue({ canPublish: true, confirmationToken: 'preview-9', blockers: [], totalScore: 8, passThreshold: 5, outcome: 'PASS' }); api.publishStudentResult.mockResolvedValue({ totalScore: 8, outcome: 'PASS' }) })
afterEach(() => { cleanup(); vi.clearAllMocks() })
async function preview() { fireEvent.change(await screen.findByRole('combobox'), { target: { value: '9' } }); await screen.findByRole('option', { name: 'Sinh viên #9' }); fireEvent.click(screen.getByRole('button', { name: 'Xem trước kết quả' })); return screen.findByRole('button', { name: 'Công bố kết quả sinh viên' }) }
it('publishes the server preview token only after confirmation', async () => {
  render(<StudentResultPublicationPanel projectId={2} />)
  await screen.findByRole('option', { name: 'Sinh viên #9' })
  fireEvent.click(await preview())
  expect(api.publishStudentResult).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Công bố kết quả' }))
  await waitFor(() => expect(api.publishStudentResult).toHaveBeenCalledWith(2, 9, 'preview-9'))
})
it('clears the preview when another student is selected', async () => {
  render(<StudentResultPublicationPanel projectId={2} />)
  await screen.findByRole('option', { name: 'Sinh viên #9' }); await preview()
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '10' } })
  expect(screen.queryByRole('button', { name: 'Công bố kết quả sinh viên' })).toBeNull()
  expect(api.publishStudentResult).not.toHaveBeenCalled()
})
