import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StudentResultPublicationPanel } from './StudentResultPublicationPanel'
import { HttpError } from '../../services/http/http-client'
const namesApi = vi.hoisted(() => ({ getReviewDetail: vi.fn() }))
vi.mock('../projects/api/project-review-api', () => namesApi)
vi.mock('../auth/context/useAuthSession', () => ({ useAuthSession: () => ({ session: { accessToken: 'fixture-token' } }) }))
const api = vi.hoisted(() => ({ getStudentResult: vi.fn(), getStudentResultPreview: vi.fn(), publishStudentResult: vi.fn(), getEvaluationSchemes: vi.fn() }))
vi.mock('../../services/api/project-results.api', () => api)
vi.mock('../../services/api/evaluations.api', () => api)
beforeEach(() => { api.getEvaluationSchemes.mockResolvedValue([{ status: 'PUBLISHED', students: [{ studentId: 9 }, { studentId: 10 }] }]); api.getStudentResult.mockResolvedValue(null); api.getStudentResultPreview.mockResolvedValue({ canPublish: true, confirmationToken: 'preview-9', blockers: [], totalScore: 8, passThreshold: 5, outcome: 'PASS' }); api.publishStudentResult.mockResolvedValue({ totalScore: 8, outcome: 'PASS' }) })
beforeEach(() => { namesApi.getReviewDetail.mockResolvedValue({ latestSubmission: { evidence: { members: [] } } }) })
afterEach(() => { cleanup(); vi.clearAllMocks() })
async function preview() { fireEvent.change(await screen.findByRole('combobox'), { target: { value: '9' } }); await screen.findByRole('option', { name: /Nguyễn An/ }); fireEvent.click(screen.getByRole('button', { name: 'Xem trước kết quả' })); return screen.findByRole('button', { name: 'Công bố kết quả sinh viên' }) }
it('publishes the server preview token only after confirmation', async () => {
  render(<StudentResultPublicationPanel projectId={2} studentNames={{ 9: 'Nguyễn An', 10: 'Trần Bình' }} />)
  await screen.findByRole('option', { name: /Nguyễn An/ })
  fireEvent.click(await preview())
  expect(api.publishStudentResult).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Công bố kết quả' }))
  await waitFor(() => expect(api.publishStudentResult).toHaveBeenCalledWith(2, 9, 'preview-9'))
})
it('clears the preview when another student is selected', async () => {
  render(<StudentResultPublicationPanel projectId={2} studentNames={{ 9: 'Nguyễn An', 10: 'Trần Bình' }} />)
  await screen.findByRole('option', { name: /Nguyễn An/ }); await preview()
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '10' } })
  expect(screen.queryByRole('button', { name: 'Công bố kết quả sinh viên' })).toBeNull()
  expect(api.publishStudentResult).not.toHaveBeenCalled()
})

it('waits for frozen names and keeps duplicate names distinguishable by ID', async () => {
  let finish!: (value: unknown) => void
  namesApi.getReviewDetail.mockReturnValue(new Promise(resolve => { finish = resolve }))
  render(<StudentResultPublicationPanel projectId={2} />)
  await screen.findByRole('option', { name: 'Sinh viên #9' })
  expect((screen.getByRole('combobox') as HTMLSelectElement).disabled).toBe(true)
  expect(screen.getByText(/Đang tải tên sinh viên/)).toBeDefined()
  await act(async () => finish({ latestSubmission: { evidence: { members: [{ userId: 9, fullName: 'Trùng Tên' }, { userId: 10, fullName: 'Trùng Tên' }] } } }))
  expect((screen.getByRole('combobox') as HTMLSelectElement).disabled).toBe(false)
  expect(screen.getByRole('option', { name: 'Sinh viên #9 · Trùng Tên' })).toBeDefined()
  expect(screen.getByRole('option', { name: 'Sinh viên #10 · Trùng Tên' })).toBeDefined()
  expect(namesApi.getReviewDetail).toHaveBeenCalledWith(2, 'fixture-token')
})

it('reports a denied name read, permits unique-ID selection and retries only the labels', async () => {
  namesApi.getReviewDetail.mockRejectedValueOnce(new HttpError('PRIVATE', 403, { detail: 'PRIVATE_TRACE' })).mockResolvedValueOnce({ latestSubmission: { evidence: { members: [{ userId: 9, fullName: 'Đã tải tên' }] } } })
  render(<StudentResultPublicationPanel projectId={2} />)
  expect((await screen.findByRole('alert')).textContent).toContain('chưa được cấp quyền')
  expect(screen.queryByText(/PRIVATE/)).toBeNull()
  expect((screen.getByRole('combobox') as HTMLSelectElement).disabled).toBe(false)
  expect(screen.getByRole('option', { name: 'Sinh viên #9' })).toBeDefined()
  expect(screen.getByRole('option', { name: 'Sinh viên #10' })).toBeDefined()
  fireEvent.click(screen.getByRole('button', { name: 'Thử tải lại tên sinh viên' }))
  await screen.findByRole('option', { name: 'Sinh viên #9 · Đã tải tên' })
  expect(namesApi.getReviewDetail).toHaveBeenCalledTimes(2)
  expect(api.getEvaluationSchemes).toHaveBeenCalledTimes(1)
  expect(api.publishStudentResult).not.toHaveBeenCalled()
})

it('ignores a previous project name response after the target project changes', async () => {
  let old!: (value: unknown) => void
  namesApi.getReviewDetail.mockImplementation((id: number) => id === 2 ? new Promise(resolve => { old = resolve }) : Promise.resolve({ latestSubmission: { evidence: { members: [{ userId: 9, fullName: 'Tên đồ án mới' }] } } }))
  const view = render(<StudentResultPublicationPanel projectId={2} />)
  view.rerender(<StudentResultPublicationPanel projectId={3} />)
  await screen.findByRole('option', { name: 'Sinh viên #9 · Tên đồ án mới' })
  await act(async () => old({ latestSubmission: { evidence: { members: [{ userId: 9, fullName: 'Tên đồ án cũ' }] } } }))
  expect(screen.queryByRole('option', { name: /Tên đồ án cũ/ })).toBeNull()
  expect(screen.getByRole('option', { name: /Tên đồ án mới/ })).toBeDefined()
})
