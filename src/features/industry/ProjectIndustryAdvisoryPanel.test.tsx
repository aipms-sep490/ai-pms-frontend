import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ProjectIndustryAdvisoryPanel } from './ProjectIndustryAdvisoryPanel'
import type { IndustryAssignment } from './industry-api'

const api = vi.hoisted(() => ({
  getProjectIndustryAssignments: vi.fn(),
  assignIndustryExpert: vi.fn(),
  revokeIndustryAssignment: vi.fn(),
  getIndustrySharedFiles: vi.fn(),
  shareIndustryFile: vi.fn(),
  revokeIndustrySharedFile: vi.fn(),
}))
vi.mock('./industry-api', () => api)

const assignment: IndustryAssignment = {
  id: 1,
  projectId: 9,
  projectCode: 'SE-09',
  projectTitle: 'AI-PMS Web',
  expertId: 15,
  scope: 'COMMON',
  majorId: null,
  startsAt: '2026-10-01T00:00:00Z',
  endsAt: '2026-12-31T23:59:59Z',
  status: 'ACTIVE',
  concurrencyToken: 'token-1',
  allowedActions: ['SHARE_FILE', 'FEEDBACK'],
  advisoryOnly: true,
}

beforeEach(() => {
  vi.resetAllMocks()
  api.getProjectIndustryAssignments.mockResolvedValue({ items: [assignment], page: 1, pageSize: 20, totalCount: 1, totalPages: 1 })
  api.getIndustrySharedFiles.mockResolvedValue({ items: [], page: 1, pageSize: 20, totalCount: 0, totalPages: 0 })
})
afterEach(cleanup)

describe('ProjectIndustryAdvisoryPanel', () => {
  it('renders existing industry assignments for the project', async () => {
    render(<ProjectIndustryAdvisoryPanel projectId={9} />)
    expect(await screen.findByText('Chuyên gia #15')).toBeTruthy()
    expect(screen.getByText(/Phạm vi: COMMON/)).toBeTruthy()
    expect(screen.getByText('Quản lý file chia sẻ')).toBeTruthy()
  })

  it('allows assigning a new expert to project with COMMON scope', async () => {
    api.assignIndustryExpert.mockResolvedValue({ ...assignment, id: 2, expertId: 20 })
    render(<ProjectIndustryAdvisoryPanel projectId={9} />)

    fireEvent.change(screen.getByPlaceholderText('vd: 15'), { target: { value: '20' } })
    fireEvent.change(screen.getByLabelText('Bắt đầu'), { target: { value: '2026-11-01T08:00' } })
    fireEvent.change(screen.getByLabelText('Kết thúc'), { target: { value: '2026-12-31T17:00' } })

    fireEvent.click(screen.getByRole('button', { name: 'Phân công cố vấn' }))

    await waitFor(() => {
      expect(api.assignIndustryExpert).toHaveBeenCalledWith(9, {
        expertId: 20,
        scope: 'COMMON',
        majorId: null,
        startsAt: new Date('2026-11-01T08:00').toISOString(),
        endsAt: new Date('2026-12-31T17:00').toISOString(),
      })
    })
    expect(await screen.findByText('Đã phân công chuyên gia #20 vào đồ án.')).toBeTruthy()
  })

  it('allows revoking an active assignment with concurrency token', async () => {
    api.revokeIndustryAssignment.mockResolvedValue({ ...assignment, status: 'REVOKED' })
    render(<ProjectIndustryAdvisoryPanel projectId={9} />)

    await screen.findByText('Chuyên gia #15')
    fireEvent.click(screen.getByRole('button', { name: 'Thu hồi phân công' }))

    await waitFor(() => {
      expect(api.revokeIndustryAssignment).toHaveBeenCalledWith(1, 'token-1')
    })
  })

  it('allows sharing a deliverable file version with an assigned expert', async () => {
    api.shareIndustryFile.mockResolvedValue({
      id: 50,
      fileId: 501,
      deliverableVersionId: 101,
      fileName: 'architecture.pdf',
      contentType: 'application/pdf',
      sizeBytes: 20480,
      sha256: 'abc...',
      downloadUrl: '/download',
    })
    render(<ProjectIndustryAdvisoryPanel projectId={9} />)

    await screen.findByText('Chuyên gia #15')
    fireEvent.click(screen.getByRole('button', { name: 'Quản lý file chia sẻ' }))

    expect(await screen.findByText(/Quản lý file chia sẻ — Chuyên gia #15/)).toBeTruthy()

    fireEvent.change(screen.getByPlaceholderText('vd: 101'), { target: { value: '101' } })
    fireEvent.change(screen.getByPlaceholderText('vd: 501'), { target: { value: '501' } })
    fireEvent.click(screen.getByRole('button', { name: 'Chia sẻ file này' }))

    await waitFor(() => {
      expect(api.shareIndustryFile).toHaveBeenCalledWith(1, {
        concurrencyToken: 'token-1',
        deliverableVersionId: 101,
        fileId: 501,
      })
    })
  })
})
