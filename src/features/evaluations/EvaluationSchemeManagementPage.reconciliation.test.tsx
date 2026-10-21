import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { HttpError } from '../../services/http/http-client'
import type { EvaluationScheme } from './evaluation-types'
import { EvaluationSchemeManagementPage } from './EvaluationSchemeManagementPage'
import { projectCapabilities } from '../../test/project-capabilities'
const capabilitiesApi = vi.hoisted(() => ({ getMyCapabilities: vi.fn() }))
vi.mock('../capabilities/capabilities-api', async () => ({ ...await vi.importActual<typeof import('../capabilities/capabilities-api')>('../capabilities/capabilities-api'), ...capabilitiesApi }))

const api = vi.hoisted(() => ({
  getProject: vi.fn(), getProjectPeriods: vi.fn(), listRubrics: vi.fn(),
  getEvaluationSchemes: vi.fn(), createEvaluationScheme: vi.fn(), updateEvaluationScheme: vi.fn(),
  publishEvaluationScheme: vi.fn(), createEvaluationSchemeVersion: vi.fn(), deleteEvaluationScheme: vi.fn(),
}))
vi.mock('../../services/api/projects.api', () => ({ getProject: api.getProject }))
vi.mock('../academic/api/governance-api', () => ({ getProjectPeriods: api.getProjectPeriods }))
vi.mock('./rubrics-api', () => ({ listRubrics: api.listRubrics }))
vi.mock('../../services/api/evaluations.api', () => api)
vi.mock('../auth/context/useAuthSession', () => {
  const session = { accessToken: 'test-token', user: { roles: ['DEPARTMENT_STAFF'] } }
  return { useAuthSession: () => ({ session }) }
})

const scheme: EvaluationScheme = {
  id: 31, rootId: 31, version: 1, projectId: 2, projectPeriodId: 7, name: 'Phương án ban đầu',
  status: 'DRAFT', passThreshold: 5, concurrencyToken: 'old-token', policyVersionId: null,
  calculationRule: 'CURRENT_RULE', students: [],
  components: [{ id: 42, name: 'Chất lượng đồ án', scope: 'COMMON', majorId: null, rubricId: 4, projectWeightPercent: 100, studentWeightPercent: 100, requiredEvaluators: 1 }],
}
const latest: EvaluationScheme = { ...scheme, name: 'Phương án trên server', passThreshold: 6, concurrencyToken: 'new-token' }
const conflictError = () => new HttpError('Server changed', 409)
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail })
  return { promise, resolve, reject }
}
function page() {
  return render(<MemoryRouter initialEntries={['/department/projects/2/evaluation-schemes']}>
    <Link to="/department/projects/3/evaluation-schemes">Đổi đồ án</Link>
    <Routes><Route path="/department/projects/:projectId/evaluation-schemes" element={<EvaluationSchemeManagementPage />} /></Routes>
  </MemoryRouter>)
}
async function select() {
  page()
  fireEvent.click(await screen.findByRole('button', { name: /Phương án ban đầu/ }))
}
function edit() {
  fireEvent.change(screen.getByLabelText('Tên phương án đánh giá'), { target: { value: 'Nội dung của tôi' } })
  fireEvent.change(screen.getByLabelText('Ngưỡng đạt (0–10)'), { target: { value: '7' } })
  fireEvent.change(screen.getByLabelText('Tên'), { target: { value: 'Tiêu chí của tôi' } })
}
async function saveConflict(fresh: EvaluationScheme | null = latest) {
  await select(); edit()
  api.getEvaluationSchemes.mockResolvedValue(fresh ? [fresh] : [])
  api.updateEvaluationScheme.mockRejectedValueOnce(conflictError())
  fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
  await screen.findByRole('heading', { name: 'Kiểm tra thay đổi trước khi tiếp tục' })
  await waitFor(() => expect((screen.getByRole('button', { name: fresh ? 'Dùng bản trên hệ thống' : 'Bỏ nội dung và về danh sách' }) as HTMLButtonElement).disabled).toBe(false))
}

beforeEach(() => {
  vi.resetAllMocks()
  capabilitiesApi.getMyCapabilities.mockImplementation(async (id: number) => projectCapabilities(id))
  api.getProject.mockImplementation(async (id: number) => ({ id, majors: [{ majorId: 1, majorCode: 'IT', majorName: 'CNTT' }] }))
  api.getProjectPeriods.mockResolvedValue({ items: [{ id: 7, name: 'Đợt bảo vệ', periodType: 'EVALUATION', status: 'ACTIVE' }], totalCount: 1 })
  api.listRubrics.mockResolvedValue({ items: [{ id: 4, code: 'RUBRIC', version: 1 }], totalCount: 1 })
  api.getEvaluationSchemes.mockResolvedValue([scheme])
  api.updateEvaluationScheme.mockResolvedValue(latest)
})
afterEach(cleanup)

describe('EvaluationSchemeManagementPage concurrency reconciliation', () => {
  it('blocks a submitted form for a frozen scheme even when academic management is allowed', async () => {
    api.getEvaluationSchemes.mockResolvedValue([{ ...scheme, status: 'PUBLISHED' }])
    await select()
    fireEvent.submit(screen.getByLabelText('Tên phương án đánh giá').closest('form')!)
    expect(api.updateEvaluationScheme).not.toHaveBeenCalled()
    expect(api.createEvaluationScheme).not.toHaveBeenCalled()
  })
  it('does not let a 409 keep-draft choice restore revoked academic authority', async () => {
    await select(); edit()
    capabilitiesApi.getMyCapabilities.mockResolvedValue(projectCapabilities(2, false))
    api.getEvaluationSchemes.mockResolvedValue([latest])
    api.updateEvaluationScheme.mockRejectedValueOnce(conflictError())
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
    await screen.findByRole('region', { name: 'Kiểm tra thay đổi trước khi tiếp tục' })
    // Wait for the denied capability response, not the temporary unknown/loading state.
    await screen.findByRole('button', { name: 'Tải lại quyền thao tác' })
    await waitFor(() => expect((screen.getByRole('button', { name: 'Dùng bản trên hệ thống' }) as HTMLButtonElement).disabled).toBe(false))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Giữ nội dung để tiếp tục sửa' })).toBeNull())
    expect((screen.getByLabelText('Tên phương án đánh giá') as HTMLInputElement).value).toBe('Nội dung của tôi')
    expect((screen.getByLabelText('Tên phương án đánh giá') as HTMLInputElement).disabled).toBe(true)
    fireEvent.submit(screen.getByLabelText('Tên phương án đánh giá').closest('form')!)
    expect(api.updateEvaluationScheme).toHaveBeenCalledTimes(1)
  })
  it('retains the complete local draft and blocks commands after 409 without replaying', async () => {
    await saveConflict()
    expect((screen.getByLabelText('Tên phương án đánh giá') as HTMLInputElement).value).toBe('Nội dung của tôi')
    expect((screen.getByLabelText('Ngưỡng đạt (0–10)') as HTMLInputElement).value).toBe('7')
    expect((screen.getByLabelText('Tên') as HTMLInputElement).value).toBe('Tiêu chí của tôi')
    const comparison = screen.getByRole('region', { name: 'Kiểm tra thay đổi trước khi tiếp tục' })
    expect(within(comparison).getByText('Tiêu chí của tôi')).toBeDefined()
    expect(within(comparison).getByRole('heading', { name: /Phương án trên server/ })).toBeDefined()
    for (const label of ['Lưu bản nháp', 'Công bố phương án', 'Xóa bản nháp', 'Thêm thành phần']) {
      expect((screen.getByRole('button', { name: label }) as HTMLButtonElement).disabled).toBe(true)
      fireEvent.click(screen.getByRole('button', { name: label }))
    }
    expect(api.updateEvaluationScheme).toHaveBeenCalledTimes(1)
    expect(api.publishEvaluationScheme).not.toHaveBeenCalled()
    expect(api.deleteEvaluationScheme).not.toHaveBeenCalled()
  })

  it('keeps edits only after explicit choice and uses the refreshed token for the next save', async () => {
    await saveConflict()
    fireEvent.click(screen.getByRole('button', { name: 'Giữ nội dung để tiếp tục sửa' }))
    expect(api.updateEvaluationScheme).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
    await waitFor(() => expect(api.updateEvaluationScheme).toHaveBeenCalledTimes(2))
    expect(api.updateEvaluationScheme).toHaveBeenLastCalledWith(31, expect.objectContaining({
      concurrencyToken: 'new-token', name: 'Nội dung của tôi', passThreshold: 7,
      components: [expect.objectContaining({ name: 'Tiêu chí của tôi' })],
    }))
  })

  it('replaces edits only when the user chooses the server version', async () => {
    await saveConflict()
    fireEvent.click(screen.getByRole('button', { name: 'Dùng bản trên hệ thống' }))
    expect((screen.getByLabelText('Tên phương án đánh giá') as HTMLInputElement).value).toBe(latest.name)
    expect((screen.getByLabelText('Ngưỡng đạt (0–10)') as HTMLInputElement).value).toBe('6')
    expect(screen.queryByRole('heading', { name: 'Kiểm tra thay đổi trước khi tiếp tục' })).toBeNull()
    expect(api.updateEvaluationScheme).toHaveBeenCalledTimes(1)
  })

  it('does not offer to overwrite a scheme published by another user', async () => {
    await saveConflict({ ...latest, status: 'PUBLISHED', policyVersionId: 8 })
    expect(screen.queryByRole('button', { name: 'Giữ nội dung để tiếp tục sửa' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Dùng bản trên hệ thống' }))
    expect(screen.queryByRole('button', { name: 'Lưu bản nháp' })).toBeNull()
    expect((screen.getByLabelText('Tên phương án đánh giá') as HTMLInputElement).disabled).toBe(true)
    api.createEvaluationSchemeVersion.mockResolvedValue({ ...latest, id: 32, version: 2 })
    fireEvent.click(screen.getByRole('button', { name: 'Tạo phiên bản' }))
    await waitFor(() => expect(api.createEvaluationSchemeVersion).toHaveBeenCalledWith(31, 'new-token'))
  })

  it('preserves the removed draft for inspection and clears selection only by user choice', async () => {
    await saveConflict(null)
    expect((screen.getByLabelText('Tên phương án đánh giá') as HTMLInputElement).value).toBe('Nội dung của tôi')
    expect(screen.queryByRole('button', { name: 'Giữ nội dung để tiếp tục sửa' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ nội dung và về danh sách' }))
    expect(screen.queryByLabelText('Tên phương án đánh giá')).toBeNull()
    expect(api.createEvaluationScheme).not.toHaveBeenCalled()
  })

  it('keeps commands locked when reconciliation reload fails, and allows an explicit retry', async () => {
    await select(); edit()
    api.updateEvaluationScheme.mockRejectedValueOnce(conflictError())
    api.getEvaluationSchemes.mockRejectedValueOnce(new HttpError('Unavailable', 503))
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
    await screen.findByText('Chưa xác minh được bản hiện tại. Tải lại để tiếp tục.')
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Không thể tải'))
    const saveButton = screen.queryByRole('button', { name: 'Lưu bản nháp' }) as HTMLButtonElement | null
    expect(saveButton === null || saveButton.disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Bỏ nội dung và về danh sách' }) as HTMLButtonElement).disabled).toBe(true)
    api.getEvaluationSchemes.mockResolvedValue([latest])
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại bản hiện tại' }))
    await screen.findByRole('button', { name: 'Giữ nội dung để tiếp tục sửa' })
    expect(api.updateEvaluationScheme).toHaveBeenCalledTimes(1)
    expect((screen.getByLabelText('Tên phương án đánh giá') as HTMLInputElement).value).toBe('Nội dung của tôi')
  })

  it('uses the most recently reloaded token, including repeated conflicts', async () => {
    await saveConflict()
    api.getEvaluationSchemes.mockResolvedValue([{ ...latest, concurrencyToken: 'third-token' }])
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại bản hiện tại' }))
    await waitFor(() => expect((screen.getByRole('button', { name: 'Giữ nội dung để tiếp tục sửa' }) as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: 'Giữ nội dung để tiếp tục sửa' }))
    api.updateEvaluationScheme.mockRejectedValueOnce(conflictError())
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
    await screen.findByRole('heading', { name: 'Kiểm tra thay đổi trước khi tiếp tục' })
    expect(api.updateEvaluationScheme).toHaveBeenLastCalledWith(31, expect.objectContaining({ concurrencyToken: 'third-token' }))
    expect(api.updateEvaluationScheme).toHaveBeenCalledTimes(2)
  })

  it('does not lose selection or edits when delete encounters 409', async () => {
    await select(); edit()
    api.getEvaluationSchemes.mockResolvedValue([latest])
    api.deleteEvaluationScheme.mockRejectedValueOnce(conflictError())
    fireEvent.click(screen.getByRole('button', { name: 'Xóa bản nháp' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xóa bản nháp' }))
    await screen.findByRole('heading', { name: 'Kiểm tra thay đổi trước khi tiếp tục' })
    expect((screen.getByLabelText('Tên phương án đánh giá') as HTMLInputElement).value).toBe('Nội dung của tôi')
    expect(api.deleteEvaluationScheme).toHaveBeenCalledTimes(1)
  })

  it('requires a new confirmation and token after publish conflict', async () => {
    await select()
    api.getEvaluationSchemes.mockResolvedValue([latest])
    api.publishEvaluationScheme.mockRejectedValueOnce(conflictError())
    fireEvent.click(screen.getByRole('button', { name: 'Công bố phương án' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Công bố phương án' }))
    await screen.findByRole('button', { name: 'Giữ nội dung để tiếp tục sửa' })
    await waitFor(() => expect((screen.getByRole('button', { name: 'Dùng bản trên hệ thống' }) as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: 'Dùng bản trên hệ thống' }))
    expect(api.publishEvaluationScheme).toHaveBeenCalledTimes(1)
    api.publishEvaluationScheme.mockResolvedValue({ ...latest, status: 'PUBLISHED' })
    fireEvent.click(screen.getByRole('button', { name: 'Công bố phương án' }))
    expect(api.publishEvaluationScheme).toHaveBeenCalledTimes(1)
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Công bố phương án' }))
    await waitFor(() => expect(api.publishEvaluationScheme).toHaveBeenLastCalledWith(31, 'new-token'))
  })

  it('reconciles a create-version conflict without replaying it', async () => {
    api.getEvaluationSchemes.mockResolvedValue([{ ...scheme, status: 'PUBLISHED' }])
    await select()
    api.getEvaluationSchemes.mockResolvedValue([{ ...latest, status: 'RETIRED' }])
    api.createEvaluationSchemeVersion.mockRejectedValueOnce(conflictError())
    fireEvent.click(screen.getByRole('button', { name: 'Tạo phiên bản' }))
    await screen.findByRole('heading', { name: 'Kiểm tra thay đổi trước khi tiếp tục' })
    expect(api.createEvaluationSchemeVersion).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Giữ nội dung để tiếp tục sửa' })).toBeNull()
  })

  it('locks selection and draft creation while a mutation is pending and sends one write', async () => {
    await select()
    const request = deferred<EvaluationScheme>()
    api.updateEvaluationScheme.mockReturnValueOnce(request.promise)
    fireEvent.submit(screen.getByLabelText('Tên phương án đánh giá').closest('form')!)
    fireEvent.submit(screen.getByLabelText('Tên phương án đánh giá').closest('form')!)
    expect(api.updateEvaluationScheme).toHaveBeenCalledTimes(1)
    expect((screen.getByRole('button', { name: 'Tạo bản nháp' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: /Phương án ban đầu.*thành phần/ }) as HTMLButtonElement).disabled).toBe(true)
    await act(async () => request.resolve(latest))
  })

  it('does not mix selection or a late save response into a different project route', async () => {
    await select(); edit()
    const request = deferred<EvaluationScheme>()
    api.updateEvaluationScheme.mockReturnValueOnce(request.promise)
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
    api.getEvaluationSchemes.mockResolvedValue([{ ...latest, projectId: 3 }])
    fireEvent.click(screen.getByRole('link', { name: 'Đổi đồ án' }))
    await screen.findByRole('button', { name: /Phương án trên server/ })
    await act(async () => request.resolve(scheme))
    expect(screen.queryByLabelText('Tên phương án đánh giá')).toBeNull()
    expect(screen.queryByText('Đã lưu thay đổi cho phương án đánh giá bản nháp.')).toBeNull()
  })

  it('cancels an outstanding confirmation when the project route changes', async () => {
    await select()
    fireEvent.click(screen.getByRole('button', { name: 'Công bố phương án' }))
    fireEvent.click(screen.getByRole('link', { name: 'Đổi đồ án' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(api.publishEvaluationScheme).not.toHaveBeenCalled()
  })

  it('clears a successfully deleted selection', async () => {
    await select()
    api.getEvaluationSchemes.mockResolvedValue([])
    api.deleteEvaluationScheme.mockResolvedValue(undefined)
    fireEvent.click(screen.getByRole('button', { name: 'Xóa bản nháp' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xóa bản nháp' }))
    await screen.findByText('Đã xóa phương án đánh giá bản nháp.')
    expect(screen.queryByLabelText('Tên phương án đánh giá')).toBeNull()
  })

  it.each([400, 403, 500])('keeps edits and reports HTTP %s without a false conflict or success', async status => {
    await select(); edit()
    api.updateEvaluationScheme.mockRejectedValueOnce(new HttpError('Failed', status))
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
    await screen.findByRole('alert')
    expect(screen.queryByRole('heading', { name: 'Kiểm tra thay đổi trước khi tiếp tục' })).toBeNull()
    expect((screen.getByLabelText('Tên phương án đánh giá') as HTMLInputElement).value).toBe('Nội dung của tôi')
    expect(screen.queryByText('Đã lưu thay đổi cho phương án đánh giá bản nháp.')).toBeNull()
  })
})
