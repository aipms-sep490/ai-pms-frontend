import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { HttpError } from '../../../services/http/http-client'

const api = vi.hoisted(() => ({ getUser: vi.fn(), updateAcademicProfile: vi.fn() }))
const auth = vi.hoisted(() => ({ useAuthSession: vi.fn() }))
const workspace = vi.hoisted(() => ({ useAdminWorkspace: vi.fn() }))
vi.mock('../api/admin-api', () => api)
vi.mock('../../academic/api/academic-api', () => ({ getAcademicHierarchy: vi.fn().mockResolvedValue([{ departments: [{ department: { id: 2, name: 'Bộ môn cũ', isActive: true }, majors: [] }, { department: { id: 3, name: 'Software Engineering', isActive: true }, majors: [{ id: 12, name: 'AI', code: 'AI', isActive: true }] }] }]) }))
vi.mock('../../auth/context/useAuthSession', () => auth)
vi.mock('../hooks/useAdminWorkspace', () => workspace)

import { AdminUserDetailPage } from './AdminUserDetailPage'

const user = { id: 7, fullName: 'Nguyễn Minh', email: 'minh@example.test', studentCode: null, employeeCode: 'GV07', status: 'ACTIVE' as const, departmentId: 2, majorId: null, phone: null, title: null, accessFailedCount: 0, lockoutEndAt: null, roles: ['LECTURER', 'EVALUATOR'], concurrencyToken: 'user-token' }
const renderPage = () => render(<MemoryRouter initialEntries={['/admin/access/users/7']}><Routes><Route path="/admin/access/users/:userId" element={<AdminUserDetailPage />} /></Routes></MemoryRouter>)

beforeEach(() => {
  vi.clearAllMocks()
  auth.useAuthSession.mockReturnValue({ session: { accessToken: 'admin-token' } })
  workspace.useAdminWorkspace.mockReturnValue({ activate: vi.fn(), deactivate: vi.fn(), block: vi.fn(), unblock: vi.fn() })
  api.getUser.mockResolvedValue(user)
})
afterEach(cleanup)

describe('AdminUserDetailPage academic profile contract', () => {
  it('uses the server concurrency token and replaces only the returned academic scope', async () => {
    api.updateAcademicProfile.mockResolvedValue({ userId: 7, fullName: 'Nguyễn Minh', email: 'minh@example.test', studentCode: null, departmentId: 3, departmentName: 'Software Engineering', majorId: 12, majorName: 'AI', status: 'PENDING', reviewedBy: null, reviewedAt: null, rejectionReason: null, concurrencyToken: 'fresh-token' })
    renderPage()
    await screen.findByText('Nguyễn Minh')
    await waitFor(() => expect((screen.getByLabelText('Bộ môn') as HTMLSelectElement).disabled).toBe(false))
    fireEvent.change(screen.getByLabelText('Bộ môn'), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText('Chuyên ngành'), { target: { value: '12' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cập nhật phạm vi học thuật' }))
    await waitFor(() => expect(api.updateAcademicProfile).toHaveBeenCalledWith(7, { departmentId: 3, majorId: 12, concurrencyToken: 'user-token' }, 'admin-token'))
    expect((await screen.findAllByText('Software Engineering')).length).toBeGreaterThan(0)
    expect(screen.getByText('Chờ xử lý')).toBeTruthy()
  })

  it('preserves the entered scope and reloads the authoritative snapshot on 409', async () => {
    api.getUser.mockResolvedValueOnce(user).mockResolvedValueOnce({ ...user, concurrencyToken: 'fresh-token' })
    api.updateAcademicProfile.mockRejectedValue(new HttpError('stale', 409))
    renderPage()
    await screen.findByText('Nguyễn Minh')
    await waitFor(() => expect((screen.getByLabelText('Bộ môn') as HTMLSelectElement).disabled).toBe(false))
    const department = screen.getByLabelText('Bộ môn') as HTMLSelectElement
    fireEvent.change(department, { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cập nhật phạm vi học thuật' }))
    expect(await screen.findByText(/dữ liệu bạn nhập được giữ/)).toBeTruthy()
    expect(department.value).toBe('3')
    expect(api.getUser).toHaveBeenCalledTimes(2)
  })
})
