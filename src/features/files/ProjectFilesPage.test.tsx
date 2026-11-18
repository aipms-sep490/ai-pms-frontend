import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const api = vi.hoisted(() => ({ getProjectFiles: vi.fn(), downloadProjectFile: vi.fn(), deleteProjectFile: vi.fn(), uploadProjectFile: vi.fn() }))
vi.mock('./project-files-api', () => api)
vi.mock('../../app/context', () => ({ useStudentJourney: () => ({ journeyState: 'NONE', project: null, team: null }) }))
vi.mock('../auth/context/useAuthSession', () => ({ useAuthSession: () => ({ session: { user: { id: 2, roles: ['DEPARTMENT_STAFF'] } } }) }))

import { ProjectFilesPage } from './ProjectFilesPage'

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('ProjectFilesPage', () => {
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
    expect(screen.queryByRole('heading', { name: 'Đính kèm tệp' })).toBeNull()
    fireEvent.change(screen.getByLabelText('Nguồn tệp'), { target: { value: 'TASK' } })
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng' }))
    await waitFor(() => expect(api.getProjectFiles).toHaveBeenLastCalledWith(9, expect.objectContaining({ parentType: 'TASK', page: 1, pageSize: 20 })))
  })
})
