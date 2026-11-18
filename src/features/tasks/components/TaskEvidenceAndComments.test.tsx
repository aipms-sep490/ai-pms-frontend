import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { TaskEvidenceAndComments } from './TaskEvidenceAndComments'
import * as api from '../task-evidence-api'
import { HttpError } from '../../../services/http/http-client'

vi.mock('../task-evidence-api', () => ({
  getTaskEvidence: vi.fn(), getTaskComments: vi.fn(), uploadTaskEvidence: vi.fn(),
  downloadTaskEvidence: vi.fn(), addTaskComment: vi.fn(), deleteTaskEvidence: vi.fn(),
}))
vi.mock('../../projects/api/project-governance-api', () => ({ createProjectEvidence: vi.fn() }))
vi.mock('../../../components/ui/DocumentPreviewModal', () => ({
  getFileCategory: (name: string) => name.endsWith('.png') ? 'image' : 'other',
  DocumentPreviewModal: ({ fileName }: { fileName: string }) => <div role="dialog">Xem trước {fileName}</div>,
}))
vi.mock('../../../services/api/upload-policies.api', async original => ({
  ...await original<typeof import('../../../services/api/upload-policies.api')>(),
  getUploadPolicy: vi.fn().mockResolvedValue({ parentType: 'PROJECT_FILE', maxBytes: 20 * 1024 * 1024,
    maxBytesLabel: '20 MiB', allowedMimeTypes: ['image/png', 'image/jpeg', 'application/pdf'],
    allowedExtensions: ['.png', '.jpg', '.jpeg', '.pdf'], maxFilesPerRequest: 1, requiresVersionAnchor: false }),
}))

const empty = { items: [], page: 1, pageSize: 20, totalCount: 0, totalPages: 0 }
const image = { id: 8, parentType: 'TASK', parentId: 5, fileName: 'evidence.png', contentType: 'image/png', sizeBytes: 123,
  uploadedBy: 7, createdAt: '2026-11-17T00:00:00Z' }
const props = { taskId: 5, projectId: 3, majors: [], mentorMajorId: null, canAddEvidence: true }

beforeEach(() => {
  vi.mocked(api.getTaskEvidence).mockReset().mockResolvedValue(empty)
  vi.mocked(api.getTaskComments).mockReset().mockResolvedValue(empty)
  vi.mocked(api.uploadTaskEvidence).mockReset().mockResolvedValue(image)
  vi.mocked(api.deleteTaskEvidence).mockReset().mockResolvedValue(undefined)
})
afterEach(cleanup)

it('shows the server policy, previews an image and reads the uploaded evidence back', async () => {
  vi.mocked(api.getTaskEvidence).mockResolvedValueOnce(empty).mockResolvedValueOnce({ ...empty, items: [image], totalCount: 1, totalPages: 1 })
  render(<TaskEvidenceAndComments {...props} />)
  expect(await screen.findByText(/PNG, JPG, JPEG, PDF · tối đa 20 MiB/)).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Ảnh hoặc tệp minh chứng'), {
    target: { files: [new File(['image'], 'evidence.png', { type: 'image/png' })] },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Xem trước' }))
  expect(screen.getByRole('dialog').textContent).toContain('evidence.png')
  fireEvent.click(screen.getByRole('button', { name: 'Tải lên' }))
  await waitFor(() => expect(api.uploadTaskEvidence).toHaveBeenCalledWith(5, expect.any(File)))
  await waitFor(() => expect(screen.getByText(/evidence.png · 1 KB/)).toBeTruthy())
})

it('blocks an unsupported file before sending and preserves the chosen file', async () => {
  render(<TaskEvidenceAndComments {...props} />)
  await screen.findByText(/PNG, JPG, JPEG, PDF · tối đa 20 MiB/)
  fireEvent.change(screen.getByLabelText('Ảnh hoặc tệp minh chứng'), {
    target: { files: [new File(['text'], 'script.exe', { type: 'application/octet-stream' })] },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Tải lên' }))
  expect((await screen.findByRole('alert')).textContent).toContain('Loại tệp không được chấp nhận')
  expect(screen.getByText('script.exe')).toBeTruthy()
  expect(api.uploadTaskEvidence).not.toHaveBeenCalled()
})

it('requires confirmation with the filename and reads evidence back after deleting', async () => {
  vi.mocked(api.getTaskEvidence).mockResolvedValueOnce({ ...empty, items: [{ ...image, canDelete: true }], totalCount: 1 }).mockResolvedValue(empty)
  render(<TaskEvidenceAndComments {...props} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Xóa tệp evidence.png' }))
  expect(screen.getByRole('dialog').textContent).toContain('evidence.png')
  expect(api.deleteTaskEvidence).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Hủy' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(api.deleteTaskEvidence).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Xóa tệp evidence.png' }))
  fireEvent.click(screen.getByRole('button', { name: 'Xác nhận xóa' }))
  await waitFor(() => expect(api.deleteTaskEvidence).toHaveBeenCalledExactlyOnceWith(8))
  expect(await screen.findByText('Chưa có tệp đính kèm.')).toBeTruthy()
  expect(screen.getByText('Đã xóa tệp evidence.png.')).toBeTruthy()
  expect(api.getTaskEvidence).toHaveBeenCalledTimes(2)
})

it.each([false, undefined])('does not infer deletion permission when server capability is %s', async canDelete => {
  vi.mocked(api.getTaskEvidence).mockResolvedValue({ ...empty, items: [{ ...image, canDelete }], totalCount: 1 })
  render(<TaskEvidenceAndComments {...props} />)
  await screen.findByText(/evidence.png · 1 KB/)
  expect(screen.queryByRole('button', { name: 'Xóa tệp evidence.png' })).toBeNull()
})

it('hides deletion in a read-only task even when an older file response allowed it', async () => {
  vi.mocked(api.getTaskEvidence).mockResolvedValue({ ...empty, items: [{ ...image, canDelete: true }], totalCount: 1 })
  render(<TaskEvidenceAndComments {...props} canAddEvidence={false} />)
  await screen.findByText(/evidence.png · 1 KB/)
  expect(screen.queryByRole('button', { name: 'Xóa tệp evidence.png' })).toBeNull()
})

it('preserves drafts and the file when deletion fails, then refreshes authority on conflict', async () => {
  vi.mocked(api.getTaskEvidence).mockResolvedValueOnce({ ...empty, items: [{ ...image, canDelete: true }], totalCount: 1 })
    .mockResolvedValue({ ...empty, items: [{ ...image, canDelete: false }], totalCount: 1 })
  vi.mocked(api.deleteTaskEvidence).mockRejectedValue(new HttpError('Task locked', 409))
  render(<TaskEvidenceAndComments {...props} />)
  await screen.findByText(/evidence.png · 1 KB/)
  fireEvent.change(screen.getByLabelText('Nội dung'), { target: { value: 'Chưa gửi bình luận' } })
  fireEvent.change(screen.getByLabelText('Ghi chú minh chứng'), { target: { value: 'Bản nháp minh chứng' } })
  fireEvent.click(screen.getByRole('button', { name: 'Xóa tệp evidence.png' }))
  fireEvent.click(screen.getByRole('button', { name: 'Xác nhận xóa' }))
  expect((await screen.findByRole('alert')).textContent).toContain('Tệp hoặc trạng thái công việc đã thay đổi')
  expect((screen.getByLabelText('Nội dung') as HTMLTextAreaElement).value).toBe('Chưa gửi bình luận')
  expect((screen.getByLabelText('Ghi chú minh chứng') as HTMLTextAreaElement).value).toBe('Bản nháp minh chứng')
  expect(screen.getByText(/evidence.png · 1 KB/)).toBeTruthy()
  expect((screen.getByRole('button', { name: 'Xác nhận xóa' }) as HTMLButtonElement).disabled).toBe(true)
  expect(screen.queryByText('Đã xóa tệp evidence.png.')).toBeNull()
})
