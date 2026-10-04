import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MeetingVideoPreflight } from './MeetingVideoPreflight'

const getUserMedia = vi.fn()
const enumerateDevices = vi.fn()
const stream = { getTracks: () => [{ stop: vi.fn() }] } as unknown as MediaStream

afterEach(() => { cleanup(); getUserMedia.mockReset(); enumerateDevices.mockReset(); Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined }) })

describe('MeetingVideoPreflight', () => {
  it('does not request media until the user explicitly starts preview', async () => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia, enumerateDevices } })
    getUserMedia.mockResolvedValue(stream)
    enumerateDevices.mockResolvedValue([])
    const onConnectRequested = vi.fn()
    render(<MeetingVideoPreflight onBack={vi.fn()} onConnectRequested={onConnectRequested} />)
    expect(getUserMedia).not.toHaveBeenCalled()
    expect((screen.getByRole('button', { name: 'Tham gia cuộc họp' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Bật xem trước' }))
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(1))
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true, video: true })
    await screen.findByText(/Thiết bị đã sẵn sàng/)
    fireEvent.click(screen.getByRole('button', { name: 'Tham gia cuộc họp' }))
    expect(onConnectRequested).toHaveBeenCalledWith({ audioEnabled: true, videoEnabled: true, audioInputId: '', videoInputId: '' })
  })

  it('shows a recoverable unsupported-media error without a request', () => {
    render(<MeetingVideoPreflight onBack={vi.fn()} onConnectRequested={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Bật xem trước' }))
    expect(screen.getByRole('alert').textContent).toContain('không hỗ trợ')
    expect(getUserMedia).not.toHaveBeenCalled()
  })
})
