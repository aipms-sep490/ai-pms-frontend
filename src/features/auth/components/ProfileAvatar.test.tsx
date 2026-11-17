import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { HttpError } from '../../../services/http/http-client'
import { ProfileAvatar } from './ProfileAvatar'
import * as api from '../api/auth-api'

vi.mock('../api/auth-api', () => ({ getMyAvatarMetadata: vi.fn(), getMyAvatarBlob: vi.fn(), uploadMyAvatar: vi.fn(), removeMyAvatar: vi.fn() }))
vi.mock('../../../services/api/upload-policies.api', async original => ({
  ...await original<typeof import('../../../services/api/upload-policies.api')>(),
  getUploadPolicy: vi.fn().mockResolvedValue(null),
}))

const empty = { hasAvatar: false, concurrencyToken: null, contentType: null, sizeBytes: null, updatedAt: null }
const saved = { hasAvatar: true, concurrencyToken: 'version-1', contentType: 'image/png', sizeBytes: 9, updatedAt: '2026-11-17T00:00:00Z' }

beforeEach(() => {
  vi.mocked(api.getMyAvatarMetadata).mockReset().mockResolvedValue(empty)
  vi.mocked(api.getMyAvatarBlob).mockReset().mockResolvedValue(new Blob(['image'], { type: 'image/png' }))
  vi.mocked(api.uploadMyAvatar).mockReset()
  vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn().mockReturnValue('blob:portrait'), revokeObjectURL: vi.fn() })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it('previews a selected image and reports success only after avatar readback', async () => {
  vi.mocked(api.getMyAvatarMetadata).mockResolvedValueOnce(empty).mockResolvedValueOnce(saved)
  vi.mocked(api.uploadMyAvatar).mockResolvedValue(saved)
  render(<ProfileAvatar fullName="Nguyễn An" userId={7} />)
  await screen.findByLabelText('Chữ đại diện của Nguyễn An')
  fireEvent.change(screen.getByLabelText('Chọn ảnh đại diện PNG hoặc JPEG'), {
    target: { files: [new File(['png'], 'portrait.png', { type: 'image/png' })] },
  })
  expect(screen.getByText(/portrait.png · Chưa lưu/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Lưu ảnh' }))
  await waitFor(() => expect(api.uploadMyAvatar).toHaveBeenCalledWith(expect.any(File), null))
  expect(await screen.findByText('Ảnh đại diện đã được lưu và tải lại từ hệ thống.')).toBeTruthy()
  expect(api.getMyAvatarBlob).toHaveBeenCalledTimes(1)
})

it('keeps the selected image when the server detects a stale version', async () => {
  vi.mocked(api.getMyAvatarMetadata).mockResolvedValueOnce(saved).mockResolvedValueOnce(saved)
  vi.mocked(api.uploadMyAvatar).mockRejectedValue(new HttpError('Conflict', 409))
  render(<ProfileAvatar fullName="Nguyễn An" userId={7} />)
  await screen.findByLabelText('Ảnh đại diện của Nguyễn An')
  fireEvent.change(screen.getByLabelText('Chọn ảnh đại diện PNG hoặc JPEG'), {
    target: { files: [new File(['png'], 'new.png', { type: 'image/png' })] },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Lưu ảnh' }))
  expect(await screen.findByText(/Ảnh bạn chọn vẫn được giữ/)).toBeTruthy()
  expect(screen.getByText(/new.png · Chưa lưu/)).toBeTruthy()
})
