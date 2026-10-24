import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AcademicKnowledgeManagementPage } from './AcademicKnowledgeManagementPage'

afterEach(cleanup)
const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('../../services/http/http-client', () => ({ httpGet: api.get, httpPost: api.post, HttpError: class extends Error {} }))
vi.mock('../auth/context/useAuthSession', () => ({ useAuthSession: () => ({ session: { user: { roles: ['DEPARTMENT_STAFF'] } } }) }))
beforeEach(() => {
  vi.clearAllMocks()
  api.get.mockImplementation((url: string) => Promise.resolve(url.includes('/users/me') ? { departmentId: 7 } : url === '/academic/departments' ? [{ id: 7, name: 'Khoa IT', isActive: true, organizationId: 1 }] : { items: [] }))
  api.post.mockResolvedValue({ id: 10 })
})
it('sends the staff department and saves a draft without publishing automatically', async () => {
  render(<AcademicKnowledgeManagementPage />)
  await waitFor(() => expect((screen.getByRole('button', { name: 'Lưu bản nháp' }) as HTMLButtonElement).disabled).toBe(false))
  fireEvent.change(screen.getByLabelText('Tên tài liệu'), { target: { value: 'Quy trình IT' } })
  fireEvent.change(screen.getByLabelText('Nội dung tài liệu'), { target: { value: 'Nội dung đã kiểm tra' } })
  fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
  await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1))
  expect(api.post).toHaveBeenCalledWith('/academic/knowledge-documents', expect.objectContaining({ departmentId: 7, chunks: null }))
  expect((await screen.findByRole('status')).textContent).toContain('Đã lưu bản nháp')
})
