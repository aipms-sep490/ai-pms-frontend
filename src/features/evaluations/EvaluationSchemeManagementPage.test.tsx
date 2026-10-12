import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { EvaluationSchemeManagementPage } from './EvaluationSchemeManagementPage'
import { HttpError } from '../../services/http/http-client'

const api = vi.hoisted(() => ({ getProject: vi.fn(), getProjectPeriods: vi.fn(), listRubrics: vi.fn(), getEvaluationSchemes: vi.fn(), createEvaluationScheme: vi.fn(), updateEvaluationScheme: vi.fn(), createEvaluationSchemeVersion: vi.fn() }))
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
  expect(screen.getByRole('note').textContent).toContain('không thay cho phê duyệt học thuật')
})

const officialPolicy = { isDemo: false, approvalStatus: 'APPROVED', approvalReference: 'QD-2026-123', formula: 'COMPONENT_WEIGHTS', calculationVersion: 'DECIMAL_V2', roundingMode: 'AWAY_FROM_ZERO', decimalPlaces: 2 }
it('preserves server stage and evaluator weights when saving unrelated draft fields, without rewriting approval', async () => {
  const component = { ...scheme.components[0], stage: 'COLD', requiredEvaluators: 2, evaluatorWeights: [{ evaluatorId: 7, weightPercent: 75.125 }, { evaluatorId: 8, weightPercent: 24.875 }] }
  const source = { ...scheme, policy: officialPolicy, components: [component] }
  api.getEvaluationSchemes.mockResolvedValue([source])
  api.updateEvaluationScheme.mockResolvedValue({ ...source, concurrencyToken: 'next-token' })
  page(); fireEvent.click(await screen.findByRole('button', { name: /Scheme server/ }))
  fireEvent.change(screen.getByLabelText('Tên phương án đánh giá'), { target: { value: 'Renamed' } })
  fireEvent.submit(screen.getByLabelText('Tên phương án đánh giá').closest('form')!)
  await waitFor(() => expect(api.updateEvaluationScheme).toHaveBeenCalledTimes(1))
  const input = api.updateEvaluationScheme.mock.calls[0][1]
  expect(input.components).toEqual([component])
  expect(input).not.toHaveProperty('policy')
  expect(input.concurrencyToken).toBe('old-token')
  await screen.findByText('Đã lưu thay đổi cho phương án đánh giá bản nháp.')
})

it.each(['COLD', 'DEFENSE', 'ON_GOING', null])('accepts a zero-weight tracking component only for COLD, not %s otherwise', async stage => {
  const source = { ...scheme, components: [scheme.components[0], { ...scheme.components[0], id: 2, name: 'Tracking', projectWeightPercent: 0, studentWeightPercent: 0, stage }] }
  api.getEvaluationSchemes.mockResolvedValue([source])
  api.updateEvaluationScheme.mockResolvedValue(source)
  page(); fireEvent.click(await screen.findByRole('button', { name: /Scheme server/ }))
  fireEvent.submit(screen.getByLabelText('Tên phương án đánh giá').closest('form')!)
  if (stage === 'COLD') {
    await waitFor(() => expect(api.updateEvaluationScheme).toHaveBeenCalledTimes(1))
    expect(api.updateEvaluationScheme.mock.calls[0][1].components[1]).toMatchObject({ stage: 'COLD', projectWeightPercent: 0, studentWeightPercent: 0 })
  } else {
    await screen.findByRole('alert')
    expect(api.updateEvaluationScheme).not.toHaveBeenCalled()
  }
})

it('selects BE successor metadata without inheriting old approval or lock time, leaving the source frozen', async () => {
  const source = { ...scheme, version: 1, status: 'PUBLISHED', policy: officialPolicy, lockedAt: '2026-10-09T00:00:00Z' }
  const successor = { ...source, id: 3, version: 2, status: 'DRAFT', concurrencyToken: 'successor-token', policy: { ...officialPolicy, isDemo: true, approvalStatus: 'DEMO', approvalReference: null }, lockedAt: null }
  api.getEvaluationSchemes.mockResolvedValue([source])
  api.createEvaluationSchemeVersion.mockImplementation(async () => {
    api.getEvaluationSchemes.mockResolvedValue([source, successor])
    return successor
  })
  page(); fireEvent.click(await screen.findByRole('button', { name: /Scheme server/ }))
  expect(screen.getByText('Đã ghi nhận phê duyệt')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Tạo phiên bản' }))
  await screen.findByText('Minh họa — chưa dùng chính thức')
  expect(screen.queryByText('QD-2026-123')).toBeNull()
  expect(screen.getByText('Chưa ghi nhận')).toBeTruthy()
  expect(api.createEvaluationSchemeVersion).toHaveBeenCalledWith(2, 'old-token')
  expect(api.updateEvaluationScheme).not.toHaveBeenCalled()
  fireEvent.click(screen.getAllByRole('button', { name: /Scheme server/ })[0])
  expect(screen.getByText('QD-2026-123')).toBeTruthy()
  expect((screen.getByLabelText('Tên phương án đánh giá') as HTMLInputElement).disabled).toBe(true)
})

it('does not report successful version creation or lose original provenance when BE rejects it', async () => {
  api.getEvaluationSchemes.mockResolvedValue([{ ...scheme, status: 'PUBLISHED', policy: officialPolicy }])
  api.createEvaluationSchemeVersion.mockRejectedValue(new HttpError('Forbidden', 403))
  page(); fireEvent.click(await screen.findByRole('button', { name: /Scheme server/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Tạo phiên bản' }))
  await screen.findByRole('alert')
  expect(screen.getByText('QD-2026-123')).toBeTruthy()
  expect(screen.queryByText(/Đã tạo phiên bản nháp mới/)).toBeNull()
  expect(api.createEvaluationSchemeVersion).toHaveBeenCalledTimes(1)
})
