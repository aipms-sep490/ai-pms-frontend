import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { SelfAvatarImage, avatarChangedEvent } from './SelfAvatarImage'
import * as api from '../api/auth-api'

vi.mock('../api/auth-api', () => ({ getMyAvatarMetadata: vi.fn(), getMyAvatarBlob: vi.fn() }))

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it('shows the current private image and refreshes when the profile changes', async () => {
  vi.mocked(api.getMyAvatarMetadata).mockReset().mockResolvedValue({ hasAvatar: true, concurrencyToken: '1', contentType: 'image/png', sizeBytes: 8, updatedAt: null })
  vi.mocked(api.getMyAvatarBlob).mockReset().mockResolvedValue(new Blob(['image'], { type: 'image/png' }))
  const createObjectURL = vi.fn().mockReturnValueOnce('blob:first').mockReturnValueOnce('blob:second')
  const revokeObjectURL = vi.fn()
  vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })
  const view = render(<SelfAvatarImage userId={1} initials="NA" />)
  await waitFor(() => expect(view.container.querySelector('img')?.getAttribute('src')).toBe('blob:first'))
  window.dispatchEvent(new Event(avatarChangedEvent))
  await waitFor(() => expect(view.container.querySelector('img')?.getAttribute('src')).toBe('blob:second'))
  expect(revokeObjectURL).toHaveBeenCalledWith('blob:first')
  view.unmount()
  expect(revokeObjectURL).toHaveBeenCalledWith('blob:second')
})
