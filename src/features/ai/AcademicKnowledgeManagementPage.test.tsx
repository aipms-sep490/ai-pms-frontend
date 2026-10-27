import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AcademicKnowledgeManagementPage } from './AcademicKnowledgeManagementPage'
import { HttpError } from '../../services/http/http-client'

afterEach(cleanup)
const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), docs: [] as { id: number; title: string; status: string; currentVersion: string; departmentId: number }[] }))
vi.mock('../../services/http/http-client', async importOriginal => ({ ...await importOriginal<typeof import('../../services/http/http-client')>(), httpGet: api.get, httpPost: api.post }))
vi.mock('../auth/context/useAuthSession', () => ({ useAuthSession: () => ({ session: { user: { roles: ['DEPARTMENT_STAFF'] } } }) }))
beforeEach(() => {
  vi.clearAllMocks()
  api.docs = []
  api.get.mockImplementation((url: string) => Promise.resolve(url.includes('/users/me') ? { departmentId: 7 } : url.startsWith('/academic/departments?') ? { items: [{ id: 7, name: 'Khoa IT', isActive: true, organizationId: 1 }], totalCount: 1 } : url.startsWith('/academic/knowledge-documents?') ? { items: api.docs, totalCount: api.docs.length } : { items: [] }))
  api.post.mockResolvedValue({ id: 10 })
})

const doc = (status = 'DRAFT') => ({ id: 10, title: 'Tài liệu kiểm thử', status, currentVersion: '1', departmentId: 7 })
async function ready() {
  render(<AcademicKnowledgeManagementPage />)
  await waitFor(() => expect((screen.getByRole('button', { name: 'Lưu bản nháp' }) as HTMLButtonElement).disabled).toBe(false))
}
function fillDraft() {
  fireEvent.change(screen.getByLabelText('Tên tài liệu'), { target: { value: 'Quy trình kiểm thử' } })
  fireEvent.change(screen.getByLabelText('Nội dung tài liệu'), { target: { value: 'Nội dung kiểm thử' } })
}

it.each([
  ['Công bố bản nháp mới nhất', 'Công bố tài liệu này?'],
  ['Ngừng sử dụng', 'Ngừng sử dụng tài liệu này?'],
])('cancels %s without sending a request', async (button, title) => {
  api.docs = [doc()]
  await ready()
  fireEvent.click(screen.getByRole('button', { name: button }))
  const dialog = await screen.findByRole('dialog', { name: title })
  expect(dialog.textContent).toContain('Tài liệu kiểm thử')
  expect(dialog.textContent).toMatch(/thu hồi|không còn được dùng/)
  expect(api.post).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Hủy' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(api.post).not.toHaveBeenCalled()
})

it.each([
  ['Công bố bản nháp mới nhất', 'Xác nhận công bố', 'publish', 'Đã công bố bản nháp mới nhất.'],
  ['Ngừng sử dụng', 'Xác nhận ngừng sử dụng', 'retire', 'Đã ngừng sử dụng tài liệu.'],
])('waits for the server before confirming %s', async (button, confirm, endpoint, message) => {
  api.docs = [doc()]
  let finish!: (value: object) => void
  api.post.mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
  await ready()
  fireEvent.click(screen.getByRole('button', { name: button }))
  fireEvent.click(await screen.findByRole('button', { name: confirm }))
  await waitFor(() => expect(api.post).toHaveBeenCalledWith(`/academic/knowledge-documents/10/${endpoint}`))
  expect(screen.queryByText(message)).toBeNull()
  expect((screen.getByRole('button', { name: 'Đang xử lý…' }) as HTMLButtonElement).disabled).toBe(true)
  await act(async () => finish({}))
  expect((await screen.findByRole('status')).textContent).toBe(message)
})

it('sends Vietnam midnight for a new version independently of the machine timezone', async () => {
  api.docs = [doc()]
  await ready()
  fireEvent.click(screen.getByRole('button', { name: 'Tạo phiên bản' }))
  fireEvent.change(screen.getByLabelText('Phiên bản'), { target: { value: '2' } })
  fireEvent.change(screen.getByLabelText('Nội dung tài liệu'), { target: { value: 'Nội dung phiên bản 2' } })
  fireEvent.change(screen.getByLabelText('Hiệu lực từ (giờ Việt Nam)'), { target: { value: '2026-10-24T00:00' } })
  fireEvent.change(screen.getByLabelText('Hết hiệu lực (giờ Việt Nam)'), { target: { value: '2026-10-25T00:00' } })
  fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/academic/knowledge-documents/10/versions', expect.objectContaining({ effectiveFrom: '2026-10-23T17:00:00.000Z', effectiveTo: '2026-10-24T17:00:00.000Z' })))
  expect(api.post).toHaveBeenCalledTimes(1)
})

it('keeps an invalid effective range in the form without sending it', async () => {
  await ready(); fillDraft()
  for (const name of ['Hiệu lực từ (giờ Việt Nam)', 'Hết hiệu lực (giờ Việt Nam)']) fireEvent.change(screen.getByLabelText(name), { target: { value: '2026-10-24T00:00' } })
  fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
  expect((await screen.findByRole('alert')).textContent).toContain('Hết hiệu lực phải sau')
  expect(api.post).not.toHaveBeenCalled()
  expect((screen.getByLabelText('Tên tài liệu') as HTMLInputElement).value).toBe('Quy trình kiểm thử')
})

it.each([
  [403, undefined, 'phạm vi bộ môn'],
  [409, undefined, 'Trạng thái tài liệu'],
  [404, undefined, 'Không tìm thấy tài liệu'],
  [401, undefined, 'Phiên đăng nhập đã hết hạn'],
  [409, 'AI_KNOWLEDGE_DISABLED', 'Trợ lý AI học vụ đang tắt'],
])('localizes status %s / code %s without raw prose or a mutation retry', async (status, code, message) => {
  api.post.mockRejectedValueOnce(new HttpError('PRIVATE_BACKEND_DETAIL /internal/example', status as number, { code: code as string | undefined, detail: 'PRIVATE_BACKEND_DETAIL', traceId: 'PRIVATE_TRACE' }))
  await ready(); fillDraft()
  fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
  expect((await screen.findByRole('alert')).textContent).toContain(message)
  expect(document.body.textContent).not.toMatch(/PRIVATE_|internal/)
  expect(screen.queryByRole('button', { name: /Thử tải/ })).toBeNull()
  expect((screen.getByLabelText('Tên tài liệu') as HTMLInputElement).value).toBe('Quy trình kiểm thử')
})

it('shows draft prerequisites for an uncoded publish conflict without guessing its exact cause', async () => {
  api.docs = [doc('PUBLISHED')]
  api.post.mockRejectedValueOnce(new HttpError('A draft knowledge version is required before publishing.', 409))
  await ready()
  fireEvent.click(screen.getByRole('button', { name: 'Công bố bản nháp mới nhất' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Xác nhận công bố' }))
  expect((await screen.findByRole('alert')).textContent).toMatch(/Cần có bản nháp.*ngừng sử dụng/)
  expect(document.body.textContent).not.toContain('A draft knowledge')
  expect(api.post).toHaveBeenCalledTimes(1)
})

it('maps allowlisted validation fields without rendering backend field text', async () => {
  api.post.mockRejectedValueOnce(new HttpError('PRIVATE_DETAIL', 422, { errors: { Title: ['PRIVATE_FIELD_MESSAGE'], 'request.EffectiveTo': ['PRIVATE_FIELD_MESSAGE'], InternalPath: ['PRIVATE_FIELD_MESSAGE'] }, traceId: 'PRIVATE_TRACE' }))
  await ready(); fillDraft()
  fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
  await screen.findByRole('alert')
  expect(screen.getByLabelText('Tên tài liệu').getAttribute('aria-invalid')).toBe('true')
  expect(screen.getByText('Kiểm tra thời điểm hết hiệu lực.')).toBeTruthy()
  expect(document.body.textContent).not.toContain('PRIVATE_')
})

it('offers a read retry after a server failure and never replays a mutation', async () => {
  api.post.mockRejectedValueOnce(new HttpError('SERVER_PRIVATE_DETAIL', 503))
  await ready(); fillDraft()
  fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Thử tải lại danh sách' }))
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
  expect(api.post).toHaveBeenCalledTimes(1)
  expect((screen.getByLabelText('Nội dung tài liệu') as HTMLTextAreaElement).value).toBe('Nội dung kiểm thử')
})

it('loads publication history and normalizes bare and explicit UTC timestamps', async () => {
  api.docs = [doc('PUBLISHED')]
  const normalGet = api.get.getMockImplementation()!
  api.get.mockImplementation((url: string) => url.endsWith('/history') ? Promise.resolve([{ id: 1, version: '1', status: 'RETIRED', chunkCount: 1, publishedAt: '2026-10-24T00:21:00' }, { id: 2, version: '2', status: 'PUBLISHED', chunkCount: 1, publishedAt: '2026-10-24T00:21:00Z' }]) : normalGet(url))
  await ready()
  fireEvent.click(screen.getByRole('button', { name: 'Lịch sử' }))
  await screen.findByRole('heading', { name: 'Lịch sử · Tài liệu kiểm thử' })
  expect(screen.getAllByText(/Công bố 07:21 24\/10\/2026 \(giờ Việt Nam\)/)).toHaveLength(2)
})

it('reindexes published documents without a publication confirmation', async () => {
  api.docs = [doc('PUBLISHED')]
  await ready()
  fireEvent.click(screen.getByRole('button', { name: 'Lập chỉ mục lại' }))
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/academic/knowledge-documents/10/reindex'))
  expect((await screen.findByRole('status')).textContent).toContain('Đã kiểm tra lại chỉ mục')
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('keeps a denied initial read closed and does not display a false empty state', async () => {
  api.get.mockRejectedValue(new HttpError('Department staff may manage only their own department.', 403))
  render(<AcademicKnowledgeManagementPage />)
  expect((await screen.findByRole('alert')).textContent).toContain('phạm vi bộ môn')
  expect((screen.getByRole('button', { name: 'Lưu bản nháp' }) as HTMLButtonElement).disabled).toBe(true)
  expect(screen.queryByText('Chưa có tài liệu.')).toBeNull()
  expect(api.post).not.toHaveBeenCalled()
})

it.each(['RETIRED', 'FUTURE_STATUS'])('does not offer publication/version mutations for %s', async status => {
  api.docs = [doc(status)]
  await ready()
  expect(screen.getByRole('button', { name: 'Lịch sử' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Công bố bản nháp mới nhất' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Tạo phiên bản' })).toBeNull()
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
