import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { TaskEvidenceAndComments } from './TaskEvidenceAndComments'
import * as api from '../task-evidence-api'

vi.mock('../task-evidence-api', () => ({
  getTaskEvidence: vi.fn(), getTaskComments: vi.fn(), uploadTaskEvidence: vi.fn(),
  downloadTaskEvidence: vi.fn(), addTaskComment: vi.fn(),
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
