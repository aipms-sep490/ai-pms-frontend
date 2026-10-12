import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom'
import { ExecutionAccessProvider } from '../execution/context/ExecutionAccessProvider'
import type { ExecutionAccess } from '../execution/context/ExecutionAccessContext'
import { HttpError } from '../../services/http/http-client'
import { ColdChecklistPage } from './ColdChecklistPage'
import type { ColdChecklist, ColdSubmission } from '../../services/api/cold.api'

const api = vi.hoisted(() => ({
  getColdChecklist: vi.fn(), saveColdDraft: vi.fn(), uploadColdSubmissionFile: vi.fn(),
  removeColdSubmissionFile: vi.fn(), submitColdSubmission: vi.fn(), downloadColdSubmissionFile: vi.fn(),
}))
vi.mock('../../services/api/cold.api', () => api)

const draftSubmission: ColdSubmission = {
  id: 501, checklistItemId: 1, projectId: 9, reportType: 'SOFTWARE_REQUIREMENT', scope: 'MAJOR_SPECIFIC', majorId: 12, studentId: null,
  version: 1, status: 'DRAFT', note: 'Ghi chú ban đầu', createdBy: 2, createdAt: '2026-10-01T00:00:00Z', submittedAt: null, lockedAt: null,
  concurrencyToken: 'sub-token-1', files: [],
}

function checklistWith(items: ColdChecklist['items'], blockers: string[] = []): ColdChecklist {
  return { id: 1, projectId: 9, projectPeriodId: 3, deadline: '2026-12-10T16:59:59Z', status: 'OPEN', concurrencyToken: 'pkg-token', lockedAt: null, canLock: false, blockers, items }
}

function mount(checklist: ColdChecklist) {
  api.getColdChecklist.mockResolvedValue(checklist)
  const access: ExecutionAccess = { project: { id: 9, title: 'Quản lý đồ án', status: 'ACTIVE' } as ExecutionAccess['project'], actor: 'student', canManageStructure: true, currentUserId: 2, routeBase: '/project' }
  const router = createMemoryRouter([{ element: <ExecutionAccessProvider value={access}><Outlet /></ExecutionAccessProvider>, children: [
    { path: '/project/cold-reports', element: <ColdChecklistPage /> },
  ] }], { initialEntries: ['/project/cold-reports'] })
  return render(<RouterProvider router={router} />)
}

beforeEach(() => vi.resetAllMocks())
afterEach(cleanup)

describe('COLD checklist page', () => {
  it('renders required items with their latest status and the package deadline', async () => {
    mount(checklistWith([{ id: 1, templateId: 5, templateVersion: 1, reportType: 'SOFTWARE_REQUIREMENT', name: 'Software Requirement', required: true, scope: 'MAJOR_SPECIFIC', majorId: 12, studentId: null, latest: draftSubmission, canWrite: true }]))
    expect(await screen.findByText('Software Requirement')).toBeTruthy()
    expect(screen.getByText('Bản nháp')).toBeTruthy()
    expect(screen.getByText(/Hạn nộp/)).toBeTruthy()
  })

  it('lets a writable student with no prior version create the first draft', async () => {
    api.saveColdDraft.mockResolvedValue(draftSubmission)
    mount(checklistWith([{ id: 1, templateId: 5, templateVersion: 1, reportType: 'SOFTWARE_REQUIREMENT', name: 'Software Requirement', required: true, scope: 'MAJOR_SPECIFIC', majorId: 12, studentId: null, latest: null, canWrite: true }]))
    await screen.findByText('Chưa có bản nào')
    fireEvent.click(screen.getByRole('button', { name: 'Tạo bản nháp' }))
    await waitFor(() => expect(api.saveColdDraft).toHaveBeenCalledWith(1, { expectedLatestVersion: 0 }))
    expect(await screen.findByText('Bản nháp')).toBeTruthy()
  })

  it('saves the note with the current version and concurrency token', async () => {
    api.saveColdDraft.mockResolvedValue({ ...draftSubmission, note: 'Đã cập nhật' })
    mount(checklistWith([{ id: 1, templateId: 5, templateVersion: 1, reportType: 'SOFTWARE_REQUIREMENT', name: 'Software Requirement', required: true, scope: 'MAJOR_SPECIFIC', majorId: 12, studentId: null, latest: draftSubmission, canWrite: true }]))
    const note = await screen.findByLabelText('Ghi chú') as HTMLTextAreaElement
    fireEvent.change(note, { target: { value: 'Đã cập nhật' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu ghi chú' }))
    await waitFor(() => expect(api.saveColdDraft).toHaveBeenCalledWith(1, { expectedLatestVersion: 1, note: 'Đã cập nhật', concurrencyToken: 'sub-token-1' }))
  })

  it('disables submit until at least one file is attached', async () => {
    mount(checklistWith([{ id: 1, templateId: 5, templateVersion: 1, reportType: 'SOFTWARE_REQUIREMENT', name: 'Software Requirement', required: true, scope: 'MAJOR_SPECIFIC', majorId: 12, studentId: null, latest: draftSubmission, canWrite: true }]))
    const submit = await screen.findByRole('button', { name: 'Nộp báo cáo' }) as HTMLButtonElement
    expect(submit.disabled).toBe(true)
  })

  it('hides write controls for a read-only actor and shows the download action instead', async () => {
    const withFile: ColdSubmission = { ...draftSubmission, status: 'SUBMITTED', submittedAt: '2026-10-02T00:00:00Z', files: [{ id: 9, fileName: 'srs.pdf', contentType: 'application/pdf', sizeBytes: 2048, sha256: 'abc', downloadUrl: '' }] }
    mount(checklistWith([{ id: 1, templateId: 5, templateVersion: 1, reportType: 'SOFTWARE_REQUIREMENT', name: 'Software Requirement', required: true, scope: 'MAJOR_SPECIFIC', majorId: 12, studentId: null, latest: withFile, canWrite: false }]))
    await screen.findByText('srs.pdf')
    expect(screen.queryByLabelText('Ghi chú')).toBeNull()
    expect(screen.getByRole('button', { name: 'Tải xuống' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Nộp lại (tạo phiên bản mới)' })).toBeNull()
  })

  it('reloads the checklist instead of replaying the mutation on a 409 conflict', async () => {
    api.saveColdDraft.mockRejectedValue(new HttpError('stale', 409))
    mount(checklistWith([{ id: 1, templateId: 5, templateVersion: 1, reportType: 'SOFTWARE_REQUIREMENT', name: 'Software Requirement', required: true, scope: 'MAJOR_SPECIFIC', majorId: 12, studentId: null, latest: draftSubmission, canWrite: true }]))
    await screen.findByLabelText('Ghi chú')
    fireEvent.click(screen.getByRole('button', { name: 'Lưu ghi chú' }))
    await screen.findByRole('alert')
    await waitFor(() => expect(api.getColdChecklist).toHaveBeenCalledTimes(2))
  })

  it('surfaces lock blockers without hiding the item list', async () => {
    mount(checklistWith([{ id: 1, templateId: 5, templateVersion: 1, reportType: 'SOFTWARE_REQUIREMENT', name: 'Software Requirement', required: true, scope: 'MAJOR_SPECIFIC', majorId: 12, studentId: null, latest: draftSubmission, canWrite: true }], ['Còn báo cáo bắt buộc chưa nộp']))
    expect(await screen.findByText('Còn báo cáo bắt buộc chưa nộp')).toBeTruthy()
    expect(screen.getByText('Software Requirement')).toBeTruthy()
  })
})
