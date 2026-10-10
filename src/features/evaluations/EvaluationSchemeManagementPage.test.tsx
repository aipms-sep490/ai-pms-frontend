import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { EvaluationSchemeManagementPage } from './EvaluationSchemeManagementPage'
import { HttpError } from '../../services/http/http-client'

const api = vi.hoisted(() => ({ getProject: vi.fn(), getProjectPeriods: vi.fn(), listRubrics: vi.fn(), getEvaluationSchemes: vi.fn(), createEvaluationScheme: vi.fn(), updateEvaluationScheme: vi.fn() }))
const auth = vi.hoisted(() => ({ session: { accessToken: 'fixture', user: { roles: ['ADMIN'] } } }))
vi.mock('../auth/context/useAuthSession', () => ({ useAuthSession: () => auth }))
vi.mock('../../services/api/projects.api', () => ({ getProject: api.getProject }))
vi.mock('../academic/api/governance-api', () => ({ getProjectPeriods: api.getProjectPeriods }))
vi.mock('./rubrics-api', () => ({ listRubrics: api.listRubrics }))
vi.mock('../../services/api/evaluations.api', () => api)
const scheme = { id: 2, projectId: 9, projectPeriodId: 4, name: 'Scheme server', status: 'DRAFT', passThreshold: 6.5, concurrencyToken: 'old-token', components: [{ id: 1, name: 'Common', scope: 'COMMON', majorId: null, rubricId: 8, projectWeightPercent: 100, studentWeightPercent: 100, requiredEvaluators: 1 }] }
beforeEach(() => {
  api.getProject.mockResolvedValue({ id: 9, majors: [{ majorId: 3, majorCode: 'SE' }] })
  api.getProjectPeriods.mockResolvedValue({ items: [{ id: 4, name: 'Period', periodType: 'EVALUATION', status: 'ACTIVE' }], page: 1, totalPages: 1 })
  api.listRubrics.mockResolvedValue({ items: [{ id: 8, code: 'IT', version: 1 }], page: 1, totalPages: 1 })
  api.getEvaluationSchemes.mockResolvedValue([scheme])
})
afterEach(() => { cleanup(); vi.resetAllMocks() })
function page() { render(<MemoryRouter initialEntries={['/admin/projects/9/evaluation-schemes']}><Routes><Route path="/admin/projects/:projectId/evaluation-schemes" element={<EvaluationSchemeManagementPage />} /></Routes></MemoryRouter>) }
it('requires explicit draft threshold and weights rather than proposed academic defaults', async () => {
  page(); await screen.findByRole('button', { name: /Scheme server/ })
  fireEvent.click(screen.getAllByRole('button', { name: 'Tạo bản nháp' })[0])
  expect((screen.getByLabelText('Ngưỡng đạt (0–10)') as HTMLInputElement).value).toBe('')
  expect((screen.getByLabelText('Trọng số điểm đồ án (%)') as HTMLInputElement).value).toBe('0')
  expect(screen.getByRole('link', { name: 'Phân công người chấm' }).getAttribute('href')).toBe('/admin/projects/9/evaluators')
  fireEvent.submit(screen.getByLabelText('Tên phương án đánh giá').closest('form')!)
  await screen.findByRole('alert')
  expect(api.createEvaluationScheme).not.toHaveBeenCalled()
})
it('preserves the local draft but blocks stale writes until a fresh server version is selected', async () => {
  page(); fireEvent.click(await screen.findByRole('button', { name: /Scheme server/ }))
  fireEvent.change(screen.getByLabelText('Tên phương án đánh giá'), { target: { value: 'My draft' } })
  api.updateEvaluationScheme.mockRejectedValue(new HttpError('Conflict', 409))
  api.getEvaluationSchemes.mockResolvedValue([{ ...scheme, name: 'Fresh server', concurrencyToken: 'fresh-token' }])
  fireEvent.submit(screen.getByLabelText('Tên phương án đánh giá').closest('form')!)
  await screen.findByRole('alert')
  expect((screen.getByLabelText('Tên phương án đánh giá') as HTMLInputElement).value).toBe('My draft')
  expect((screen.getByLabelText('Tên phương án đánh giá') as HTMLInputElement).disabled).toBe(true)
  expect(api.updateEvaluationScheme).toHaveBeenCalledTimes(1)
  fireEvent.click(await screen.findByRole('button', { name: /Fresh server/ }))
  await waitFor(() => expect((screen.getByLabelText('Tên phương án đánh giá') as HTMLInputElement).disabled).toBe(false))
  fireEvent.submit(screen.getByLabelText('Tên phương án đánh giá').closest('form')!)
  await waitFor(() => expect(api.updateEvaluationScheme).toHaveBeenLastCalledWith(2, expect.objectContaining({ concurrencyToken: 'fresh-token', passThreshold: 6.5 })))
})

it('does not retain editable authority when reload is forbidden', async () => {
  page(); fireEvent.click(await screen.findByRole('button', { name: /Scheme server/ }))
  api.updateEvaluationScheme.mockRejectedValue(new HttpError('Conflict', 409))
  api.getEvaluationSchemes.mockRejectedValue(new HttpError('Forbidden', 403))
  fireEvent.submit(screen.getByLabelText('Tên phương án đánh giá').closest('form')!)
  await screen.findByRole('alert')
  expect((screen.getByLabelText('Tên phương án đánh giá') as HTMLInputElement).disabled).toBe(true)
  expect(screen.queryByRole('button', { name: /Scheme server/ })).toBeNull()
  expect(api.updateEvaluationScheme).toHaveBeenCalledTimes(1)
})

it('loads published values without making the frozen scheme editable', async () => {
  api.getEvaluationSchemes.mockResolvedValue([{ ...scheme, status: 'PUBLISHED' }])
  page(); fireEvent.click(await screen.findByRole('button', { name: /Scheme server/ }))
  expect((screen.getByLabelText('Ngưỡng đạt (0–10)') as HTMLInputElement).value).toBe('6.5')
  expect((screen.getByLabelText('Ngưỡng đạt (0–10)') as HTMLInputElement).disabled).toBe(true)
  expect(screen.queryByRole('button', { name: 'Lưu bản nháp' })).toBeNull()
})

it('flags a PROPOSED scheme as not-yet-approved so it is not mistaken for official grading', async () => {
  api.getEvaluationSchemes.mockResolvedValue([{ ...scheme, status: 'PROPOSED' }])
  page(); fireEvent.click(await screen.findByRole('button', { name: /Scheme server/ }))
  expect(screen.getByText('Đề xuất — chưa duyệt')).toBeTruthy()
  expect(screen.getByRole('note').textContent).toContain('chưa được bộ môn phê duyệt')
})
