import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HttpError } from '../../services/http/http-client'
import { ProjectEvidenceLedger } from './ProjectEvidenceLedger'

const api = vi.hoisted(() => ({ getProjectEvidence: vi.fn() }))
vi.mock('../projects/api/project-governance-api', () => api)

const page = {
  items: [{ id: 11, projectId: 9, sourceType: 'TASK', sourceId: 7, majorId: 3, classification: 'PRIMARY', verificationStatus: 'PENDING', submittedBy: 4, submittedAt: '2026-10-01T09:30:00Z', notes: 'Phân tích đã hoàn thành.' }],
  totalCount: 21, page: 1, pageSize: 20, totalPages: 2,
}

function renderLedger() {
  return render(<MemoryRouter><ProjectEvidenceLedger projectId={9} routeBase="/project" /></MemoryRouter>)
}

afterEach(() => { cleanup(); vi.resetAllMocks() })

describe('ProjectEvidenceLedger', () => {
  it('renders server evidence and source deep-links without a privileged create action', async () => {
    api.getProjectEvidence.mockResolvedValue(page)
    renderLedger()
    expect(await screen.findByText('Công việc #7')).toBeTruthy()
    expect(screen.getByText(/Ngành #3/)).toBeTruthy()
    expect(screen.getAllByText('Chờ xác minh').length).toBeGreaterThan(1)
    expect(screen.getByRole('link', { name: 'Mở nguồn' }).getAttribute('href')).toBe('/project/tasks/7')
    expect(screen.queryByRole('button', { name: /ghi nhận evidence|tạo evidence/i })).toBeNull()
  })

  it('passes source, status, major and pagination filters to the real evidence query', async () => {
    api.getProjectEvidence.mockResolvedValue(page)
    renderLedger()
    await screen.findByText('Công việc #7')
    fireEvent.change(screen.getByRole('combobox', { name: 'Nguồn' }), { target: { value: 'MEETING' } })
    await vi.waitFor(() => expect(api.getProjectEvidence).toHaveBeenLastCalledWith(9, expect.objectContaining({ sourceType: 'MEETING', page: 1, pageSize: 20 })))
    fireEvent.change(screen.getByRole('combobox', { name: 'Trạng thái xác minh' }), { target: { value: 'VERIFIED' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Mã ngành' }), { target: { value: '12' } })
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng' }))
    await vi.waitFor(() => expect(api.getProjectEvidence).toHaveBeenLastCalledWith(9, expect.objectContaining({ sourceType: 'MEETING', verificationStatus: 'VERIFIED', majorId: 12, page: 1 })))
    await screen.findByRole('button', { name: 'Trang sau' })
    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }))
    await vi.waitFor(() => expect(api.getProjectEvidence).toHaveBeenLastCalledWith(9, expect.objectContaining({ page: 2 })))
  })

  it('keeps a 403 distinct from empty state and permits a safe retry', async () => {
    api.getProjectEvidence.mockRejectedValueOnce(new HttpError('Forbidden', 403)).mockResolvedValueOnce({ ...page, items: [], totalCount: 0, totalPages: 1 })
    renderLedger()
    expect((await screen.findByRole('alert')).textContent).toContain('Hệ thống không cấp quyền xem minh chứng')
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByText('Chưa có minh chứng phù hợp')).toBeTruthy()
  })
})
