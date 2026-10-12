import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { ChatAttachments } from './ChatAttachments'
import type { ChatAttachment } from './chat-api'

const api = vi.hoisted(() => ({ downloadAttachment: vi.fn() }))
vi.mock('./chat-api', () => ({ chatApi: api }))

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:preview', revokeObjectURL: () => {} })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

const file = (over: Partial<ChatAttachment>): ChatAttachment => ({ id: '1', fileName: 'f', contentType: 'application/pdf', sizeBytes: 2048, sha256: 'abc', ...over })

describe('ChatAttachments', () => {
  it('renders a download card for a non-image file without fetching on mount', () => {
    render(<ChatAttachments attachments={[file({ fileName: 'report.pdf' })]} conversationId="c1" messageId="m1" />)
    expect(screen.getByText('report.pdf')).toBeTruthy()
    expect(screen.getByText('2 KB')).toBeTruthy()
    expect(api.downloadAttachment).not.toHaveBeenCalled()
  })

  it('fetches and shows an image thumbnail for an image attachment, scoped to the conversation+message', async () => {
    api.downloadAttachment.mockResolvedValue(new Blob(['x'], { type: 'image/png' }))
    render(<ChatAttachments attachments={[file({ id: '9', fileName: 'shot.png', contentType: 'image/png' })]} conversationId="c1" messageId="m1" />)
    await waitFor(() => expect(screen.getByRole('img', { name: 'shot.png' })).toBeTruthy())
    expect(api.downloadAttachment).toHaveBeenCalledWith('c1', 'm1', '9', expect.any(AbortSignal))
  })

  it('falls back to a download card when the image fails to load', async () => {
    api.downloadAttachment.mockRejectedValue(new Error('boom'))
    render(<ChatAttachments attachments={[file({ fileName: 'broken.png', contentType: 'image/png' })]} conversationId="c1" messageId="m1" />)
    await waitFor(() => expect(screen.getByText('broken.png')).toBeTruthy())
  })

  it('renders nothing when there are no attachments', () => {
    const { container } = render(<ChatAttachments attachments={[]} conversationId="c1" messageId="m1" />)
    expect(container.firstChild).toBeNull()
  })
})
