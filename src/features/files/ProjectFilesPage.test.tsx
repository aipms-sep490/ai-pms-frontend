import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const api = vi.hoisted(() => ({ getProjectFiles: vi.fn(), downloadProjectFile: vi.fn(), saveProjectFile: vi.fn(), deleteProjectFile: vi.fn(), uploadProjectFile: vi.fn() }))
const auth = vi.hoisted(() => ({ roles: ['DEPARTMENT_STAFF'] }))
vi.mock('./project-files-api', () => api)
vi.mock('../../app/context', () => ({ useStudentJourney: () => ({ journeyState: 'NONE', project: null, team: null }) }))
vi.mock('../auth/context/useAuthSession', () => ({ useAuthSession: () => ({ session: { user: { id: 2, roles: auth.roles } } }) }))
vi.mock('../../services/service-gateway', () => ({ services: { task: { getProjectTimeline: vi.fn().mockResolvedValue({ milestones: [{ title: 'Mốc 1', tasks: [{ id: 42, title: 'Báo cáo' }] }] }) } } }))
vi.mock('../../services/api/meetings.api', () => ({ getMeetings: vi.fn().mockResolvedValue({ items: [], totalPages: 0 }) }))
vi.mock('../../services/api/progress-reports.api', () => ({ getProgressReports: vi.fn().mockResolvedValue({ items: [], totalPages: 0 }) }))
vi.mock('../../services/api/upload-policies.api', async original => ({ ...await original<typeof import('../../services/api/upload-policies.api')>(), getUploadPolicy: vi.fn().mockResolvedValue({ parentType: 'PROJECT_FILE', maxBytes: 500 * 1024 * 1024, maxBytesLabel: '500 MiB', allowedMimeTypes: ['application/pdf'], allowedExtensions: ['.pdf'], maxFilesPerRequest: 1, requiresVersionAnchor: false, chunkSizeBytes: 4 * 1024 * 1024, singleRequestMaxBytes: 20 * 1024 * 1024 }) }))

import { ProjectFilesPage } from './ProjectFilesPage'

afterEach(() => { cleanup(); vi.clearAllMocks(); api.uploadProjectFile.mockReset(); auth.roles = ['DEPARTMENT_STAFF']; localStorage.clear() })

describe('ProjectFilesPage', () => {
  it('shows acknowledged progress, retains the selected parent and file after pause, and refreshes only after completion', async () => {
    auth.roles = ['LECTURER']
    api.getProjectFiles.mockResolvedValue({ items: [], page: 1, pageSize: 20, totalCount: 0 })
    const session = { sessionId: 'a'.repeat(32), parentType: 'TASK', parentId: 42, fileName: 'large.pdf', totalBytes: 6, nextOffset: 2, chunkSizeBytes: 2, expiresAt: '2099-01-01T00:00:00Z', state: 'UPLOADING', file: null, error: null }
    api.uploadProjectFile.mockImplementationOnce((_type, _id, _file, options) => {
      options.onProgress(session)
      return new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('paused', 'AbortError'))))
    }).mockResolvedValueOnce({ id: 8 })
    render(<MemoryRouter initialEntries={['/lecturer/projects/9/files']}><Routes><Route path="/lecturer/projects/:projectId/files" element={<ProjectFilesPage />} /></Routes></MemoryRouter>)
    fireEvent.click((await screen.findAllByRole('button', { name: /Đính kèm tệp/ }))[0])
    await screen.findByRole('option', { name: 'Mốc 1 · Báo cáo' })
    fireEvent.change(screen.getByLabelText('Hạng mục'), { target: { value: '42' } })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['123456'], 'large.pdf', { type: 'application/pdf' })
    fireEvent.change(input, { target: { files: [file] } })
    fireEvent.submit(input.closest('form')!)
    const progress = await screen.findByRole('progressbar', { name: 'Tiến độ gửi tệp' })
    expect(progress.getAttribute('value')).toBe('2')
    expect(api.getProjectFiles).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Tạm dừng tải' }))
    await screen.findByText(/Đã tạm dừng. Chọn lại đúng tệp/)
    expect((screen.getByLabelText('Hạng mục') as HTMLSelectElement).value).toBe('42')
    expect(input.files?.[0]).toBe(file)
    expect(screen.getByRole('button', { name: 'Tiếp tục tải' })).toBeTruthy()
    fireEvent.submit(input.closest('form')!)
    await screen.findByText('Đã tải tệp lên. Danh sách đang được cập nhật.')
    expect(api.getProjectFiles).toHaveBeenCalledTimes(2)
  })

  it('keeps the draft when background processing fails and does not announce success', async () => {
    auth.roles = ['LECTURER']
    api.getProjectFiles.mockResolvedValue({ items: [], page: 1, pageSize: 20, totalCount: 0 })
    api.uploadProjectFile.mockRejectedValueOnce(new Error('Không đủ dung lượng lưu trữ.'))
    render(<MemoryRouter initialEntries={['/lecturer/projects/9/files']}><Routes><Route path="/lecturer/projects/:projectId/files" element={<ProjectFilesPage />} /></Routes></MemoryRouter>)
    fireEvent.click((await screen.findAllByRole('button', { name: /Đính kèm tệp/ }))[0])
    await screen.findByRole('option', { name: 'Mốc 1 · Báo cáo' })
    fireEvent.change(screen.getByLabelText('Hạng mục'), { target: { value: '42' } })
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [new File(['pdf'], 'report.pdf', { type: 'application/pdf' })] } })
    fireEvent.submit(document.querySelector('input[type="file"]')!.closest('form')!)
    expect(await screen.findByText('Không đủ dung lượng lưu trữ.')).toBeTruthy()
    expect(screen.getByText('report.pdf')).toBeTruthy()
    expect((screen.getByLabelText('Hạng mục') as HTMLSelectElement).value).toBe('42')
    expect(screen.queryByText('Đã tải tệp lên. Danh sách đang được cập nhật.')).toBeNull()
    expect(api.getProjectFiles).toHaveBeenCalledTimes(1)
  })
  it.each([false, undefined])('does not offer deletion to the uploader when server capability is %s', async canDelete => {
    api.getProjectFiles.mockResolvedValue({ items: [{ id: 4, parentType: 'TASK', parentId: 8, fileName: 'accepted.pdf', contentType: 'application/pdf', sizeBytes: 2048, uploadedBy: 2, createdAt: '2026-09-27T00:00:00Z', canDelete }], page: 1, pageSize: 20, totalCount: 1 })
    render(<MemoryRouter initialEntries={['/department/projects/9/files']}><Routes><Route path="/department/projects/:projectId/files" element={<ProjectFilesPage />} /></Routes></MemoryRouter>)
    await screen.findByText('accepted.pdf')
    expect(screen.queryByRole('button', { name: 'Xóa' })).toBeNull()
  })

  it('uses the server delete capability and confirms before deleting and refreshing the list', async () => {
    api.getProjectFiles.mockResolvedValueOnce({ items: [{ id: 4, parentType: 'TASK', parentId: 8, fileName: 'editable.pdf', contentType: 'application/pdf', sizeBytes: 2048, uploadedBy: 7, createdAt: '2026-09-27T00:00:00Z', canDelete: true }], page: 1, pageSize: 20, totalCount: 1 })
      .mockResolvedValue({ items: [], page: 1, pageSize: 20, totalCount: 0 })
    api.deleteProjectFile.mockResolvedValue(undefined)
    render(<MemoryRouter initialEntries={['/department/projects/9/files']}><Routes><Route path="/department/projects/:projectId/files" element={<ProjectFilesPage />} /></Routes></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: 'Xóa' }))
    expect(screen.getByRole('dialog').textContent).toContain('editable.pdf')
    expect(api.deleteProjectFile).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận xóa' }))
    await waitFor(() => expect(api.deleteProjectFile).toHaveBeenCalledExactlyOnceWith(4))
    expect(await screen.findByText(/Chưa có tệp phù hợp/)).toBeTruthy()
    expect(api.getProjectFiles).toHaveBeenCalledTimes(2)
  })

  it('loads a scoped department repository and applies file filters without exposing upload controls', async () => {
    api.getProjectFiles.mockResolvedValue({ items: [{ id: 4, parentType: 'TASK', parentId: 8, fileName: 'minutes.pdf', contentType: 'application/pdf', sizeBytes: 2048, uploadedBy: 7, createdAt: '2026-09-27T00:00:00Z' }], page: 1, pageSize: 20, totalCount: 1 })
    render(<MemoryRouter initialEntries={['/department/projects/9/files']}><Routes><Route path="/department/projects/:projectId/files" element={<ProjectFilesPage />} /></Routes></MemoryRouter>)

    expect(await screen.findByText('minutes.pdf')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Đính kèm tệp/ })).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'Công việc' }))
    await waitFor(() => expect(api.getProjectFiles).toHaveBeenLastCalledWith(9, expect.objectContaining({ parentType: 'TASK', page: 1, pageSize: 20 })))
  })
})
