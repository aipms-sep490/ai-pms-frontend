import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '../../../services/http/http-client'
import { SupervisorProfilePage } from './SupervisorProfilePage'

const auth = vi.hoisted(() => ({ useAuthSession: vi.fn() }))
const api = vi.hoisted(() => ({ list: vi.fn(), updateOwnProfile: vi.fn(), replaceExpertise: vi.fn() }))
vi.mock('../../auth/context/useAuthSession', () => auth)
vi.mock('../api/supervisor-api', () => api)

const profile = { id: 8, userId: 12, fullName: 'Lecturer One', departmentId: 3, departmentName: 'Computing', bio: 'Existing bio', isAvailable: true, expertise: [{ name: 'AI', proficiencyLevel: 'ADVANCED' }] }

describe('SupervisorProfilePage', () => {
  beforeEach(() => {
    auth.useAuthSession.mockReturnValue({ session: { accessToken: 'token', user: { id: 12, fullName: 'Lecturer One', email: 'lecturer@example.test', roles: ['LECTURER'] } } })
    api.list.mockResolvedValue({ items: [profile], page: 1, pageSize: 100, totalCount: 1 })
    api.updateOwnProfile.mockResolvedValue(profile)
    api.replaceExpertise.mockResolvedValue(profile)
  })
  afterEach(() => { cleanup(); vi.clearAllMocks() })

  it('hydrates the authenticated lecturer profile and saves backend-authorized edits', async () => {
    render(<SupervisorProfilePage />, { wrapper: MemoryRouter })
    await screen.findByText('Computing · Profile #8')
    fireEvent.change(screen.getByLabelText('Giới thiệu chuyên môn'), { target: { value: 'Updated bio' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ giảng viên' }))
    await waitFor(() => expect(api.updateOwnProfile).toHaveBeenCalledWith(12, { bio: 'Updated bio', isAvailable: true }, 'token'))
    expect(api.replaceExpertise).toHaveBeenCalledWith(8, [{ name: 'AI', proficiencyLevel: 'ADVANCED' }], 'token')
  })

  it('explains that the first save provisions a profile only for the authenticated user', async () => {
    api.list.mockResolvedValue({ items: [], page: 1, pageSize: 100, totalCount: 0 })
    render(<SupervisorProfilePage />, { wrapper: MemoryRouter })
    expect(await screen.findByText(/Lần lưu đầu tiên sẽ tạo hồ sơ/)).toBeTruthy()
  })

  it('announces an authorization failure from the backend', async () => {
    api.list.mockRejectedValue(new HttpError('forbidden', 403))
    render(<SupervisorProfilePage />, { wrapper: MemoryRouter })
    expect((await screen.findByRole('alert')).textContent).toContain('Hệ thống từ chối quyền cập nhật hồ sơ giảng viên')
  })
})
