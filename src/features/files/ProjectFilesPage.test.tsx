import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { HttpError } from '../../services/http/http-client'

const api = vi.hoisted(() => ({
  getProjectFiles: vi.fn(),
  downloadProjectFile: vi.fn(),
  deleteProjectFile: vi.fn(),
  uploadProjectFile: vi.fn(),
}))
vi.mock('./project-files-api', () => api)

const uploadPoliciesApi = vi.hoisted(() => ({
  getUploadPolicies: vi.fn(),
  getUploadPolicy: vi.fn(),
}))
vi.mock('../../services/api/upload-policies.api', () => uploadPoliciesApi)

const authState = { user: { id: 2, roles: ['DEPARTMENT_STAFF'] } }
vi.mock('../auth/context/useAuthSession', () => ({
  useAuthSession: () => ({ session: { user: authState.user } }),
}))

const journeyState = { journeyState: 'NONE', project: null as any, team: null as any }
vi.mock('../../app/context', () => ({
  useStudentJourney: () => journeyState,
}))

const servicesMock = vi.hoisted(() => ({
  task: { getProjectTimeline: vi.fn().mockResolvedValue({ milestones: [] }) },
}))
vi.mock('../../services/service-gateway', () => ({ services: servicesMock }))
vi.mock('../../services/api/meetings.api', () => ({ getMeetings: vi.fn().mockResolvedValue({ items: [], totalPages: 1 }) }))
vi.mock('../../services/api/deliverables.api', () => ({ getDeliverables: vi.fn().mockResolvedValue({ items: [], totalPages: 1 }) }))
vi.mock('../../services/api/progress-reports.api', () => ({ getProgressReports: vi.fn().mockResolvedValue({ items: [], totalPages: 1 }) }))

import { ProjectFilesPage } from './ProjectFilesPage'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  authState.user = { id: 2, roles: ['DEPARTMENT_STAFF'] }
})

describe('ProjectFilesPage', () => {
  it('loads a scoped department repository and applies file filters without exposing upload controls', async () => {
    uploadPoliciesApi.getUploadPolicies.mockResolvedValue([])
    api.getProjectFiles.mockResolvedValue({
      items: [{ id: 4, parentType: 'TASK', parentId: 8, fileName: 'minutes.pdf', contentType: 'application/pdf', sizeBytes: 2048, uploadedBy: 7, createdAt: '2026-09-27T00:00:00Z' }],
      page: 1, pageSize: 20, totalCount: 1,
    })
    render(
      <MemoryRouter initialEntries={['/department/projects/9/files']}>
        <Routes><Route path="/department/projects/:projectId/files" element={<ProjectFilesPage />} /></Routes>
      </MemoryRouter>
    )

    expect(await screen.findByText('minutes.pdf')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Đính kèm tệp' })).toBeNull()
    fireEvent.change(screen.getByLabelText('Nguồn tệp'), { target: { value: 'TASK' } })
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng' }))
    await waitFor(() => expect(api.getProjectFiles).toHaveBeenLastCalledWith(9, expect.objectContaining({ parentType: 'TASK', page: 1, pageSize: 20 })))
  })

  it('displays effective upload policy limit and allowed extensions when user can upload', async () => {
    authState.user = { id: 5, roles: ['LECTURER'] }
    uploadPoliciesApi.getUploadPolicies.mockResolvedValue([
      { parentType: 'TASK', maxBytes: 20971520, maxBytesLabel: '20 MB', allowedMimeTypes: ['application/pdf'], allowedExtensions: ['.pdf'], maxFilesPerRequest: 1, requiresVersionAnchor: false },
    ])
    servicesMock.task.getProjectTimeline.mockResolvedValue({
      milestones: [{ id: 1, title: 'Sprint 1', tasks: [{ id: 10, title: 'SRS Draft' }] }],
    })
    api.getProjectFiles.mockResolvedValue({ items: [], page: 1, pageSize: 20, totalCount: 0 })

    render(
      <MemoryRouter initialEntries={['/lecturer/projects/9/files']}>
        <Routes><Route path="/lecturer/projects/:projectId/files" element={<ProjectFilesPage />} /></Routes>
      </MemoryRouter>
    )

    expect(await screen.findByRole('heading', { name: 'Đính kèm tệp' })).toBeTruthy()
    expect(screen.getByText(/Giới hạn tối đa:/)).toBeTruthy()
    expect(screen.getByText('20 MB')).toBeTruthy()
    expect(uploadPoliciesApi.getUploadPolicies).toHaveBeenCalled()
  })

  it('blocks files exceeding policy maxBytes client-side before network call', async () => {
    authState.user = { id: 5, roles: ['LECTURER'] }
    uploadPoliciesApi.getUploadPolicies.mockResolvedValue([
      { parentType: 'TASK', maxBytes: 20971520, maxBytesLabel: '20 MB', allowedMimeTypes: [], allowedExtensions: [], maxFilesPerRequest: 1, requiresVersionAnchor: false },
    ])
    servicesMock.task.getProjectTimeline.mockResolvedValue({
      milestones: [{ id: 1, title: 'Sprint 1', tasks: [{ id: 10, title: 'SRS Draft' }] }],
    })
    api.getProjectFiles.mockResolvedValue({ items: [], page: 1, pageSize: 20, totalCount: 0 })

    const { container } = render(
      <MemoryRouter initialEntries={['/lecturer/projects/9/files']}>
        <Routes><Route path="/lecturer/projects/:projectId/files" element={<ProjectFilesPage />} /></Routes>
      </MemoryRouter>
    )

    expect(await screen.findByRole('heading', { name: 'Đính kèm tệp' })).toBeTruthy()
    await screen.findByRole('option', { name: 'Sprint 1 · SRS Draft' })

    fireEvent.change(screen.getByLabelText('Hạng mục'), { target: { value: '10' } })

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const oversizedFile = new File(['x'.repeat(100)], 'huge.zip', { type: 'application/zip' })
    Object.defineProperty(oversizedFile, 'size', { value: 25 * 1024 * 1024 })
    Object.defineProperty(fileInput, 'files', { value: [oversizedFile], configurable: true })

    fireEvent.change(fileInput)
    fireEvent.submit(fileInput.closest('form')!)

    expect(await screen.findByText('Tệp vượt quá dung lượng tối đa cho phép (20 MB).')).toBeTruthy()
    expect(api.uploadProjectFile).not.toHaveBeenCalled()
  })

  it('renders clear Vietnamese error message when server responds with 413 Payload Too Large', async () => {
    authState.user = { id: 5, roles: ['LECTURER'] }
    uploadPoliciesApi.getUploadPolicies.mockResolvedValue([])
    servicesMock.task.getProjectTimeline.mockResolvedValue({
      milestones: [{ id: 1, title: 'Sprint 1', tasks: [{ id: 10, title: 'SRS Draft' }] }],
    })
    api.getProjectFiles.mockResolvedValue({ items: [], page: 1, pageSize: 20, totalCount: 0 })
    api.uploadProjectFile.mockRejectedValue(new HttpError('UPLOAD_TOO_LARGE', 413, { detail: 'Upload too large' }))

    const { container } = render(
      <MemoryRouter initialEntries={['/lecturer/projects/9/files']}>
        <Routes><Route path="/lecturer/projects/:projectId/files" element={<ProjectFilesPage />} /></Routes>
      </MemoryRouter>
    )

    expect(await screen.findByRole('heading', { name: 'Đính kèm tệp' })).toBeTruthy()
    await screen.findByRole('option', { name: 'Sprint 1 · SRS Draft' })

    fireEvent.change(screen.getByLabelText('Hạng mục'), { target: { value: '10' } })

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const validFile = new File(['valid'], 'sample.pdf', { type: 'application/pdf' })
    Object.defineProperty(validFile, 'size', { value: 1024 })
    Object.defineProperty(fileInput, 'files', { value: [validFile], configurable: true })

    fireEvent.change(fileInput)
    fireEvent.submit(fileInput.closest('form')!)

    expect(await screen.findByText('Tệp vượt quá dung lượng tối đa cho phép (20 MB).')).toBeTruthy()
  })
})
