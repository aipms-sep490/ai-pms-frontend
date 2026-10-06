import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProfileVerificationsPage } from './ProfileVerificationsPage'

const api = vi.hoisted(() => ({ getAcademicProfiles: vi.fn(), verifyAcademicProfile: vi.fn(), rejectAcademicProfile: vi.fn(), academicProfileStatus: (s: string) => s }))
vi.mock('../api/profile-verification-api', () => api)
beforeEach(() => { api.getAcademicProfiles.mockResolvedValue({ items: [{ userId: 9, fullName: 'Nguyễn An', status: 'PENDING', departmentId: 2, majorId: 3 }], totalCount: 1, totalPages: 1 }); api.verifyAcademicProfile.mockResolvedValue({}); api.rejectAcademicProfile.mockResolvedValue({}) })
afterEach(() => { cleanup(); vi.clearAllMocks() })
it('does not verify a profile until confirmation', async () => {
  render(<MemoryRouter><ProfileVerificationsPage /></MemoryRouter>)
  fireEvent.click(await screen.findByRole('button', { name: 'Xác minh' }))
  expect(api.verifyAcademicProfile).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Hủy' }))
  expect(api.verifyAcademicProfile).not.toHaveBeenCalled()
})
it('requires a supplement reason and sends it for the selected user', async () => {
  render(<MemoryRouter><ProfileVerificationsPage /></MemoryRouter>)
  fireEvent.click(await screen.findByRole('button', { name: 'Yêu cầu bổ sung' }))
  const confirm = screen.getByRole('button', { name: 'Gửi yêu cầu' })
  expect((confirm as HTMLButtonElement).disabled).toBe(true)
  fireEvent.change(screen.getByLabelText('Nội dung cần bổ sung'), { target: { value: 'Bổ sung chuyên ngành' } })
  fireEvent.click(confirm)
  await waitFor(() => expect(api.rejectAcademicProfile).toHaveBeenCalledWith(9, 'Bổ sung chuyên ngành'))
})
