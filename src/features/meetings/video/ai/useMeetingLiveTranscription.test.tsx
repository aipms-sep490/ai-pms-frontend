import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { RoomEvent } from 'livekit-client'

const api = vi.hoisted(() => ({
  appendMeetingTranscript: vi.fn(),
}))

vi.mock('./meeting-video-ai-api', () => api)
import { AI_CAPTION_TOPIC, useMeetingLiveTranscription } from './useMeetingLiveTranscription'

class FakeSpeechRecognition extends EventTarget {
  static latest: FakeSpeechRecognition | null = null
  lang = 'vi-VN'
  continuous = false
  interimResults = false
  maxAlternatives = 1
  onstart: (() => void) | null = null
  onend: (() => void) | null = null
  onerror: ((ev: { error: string }) => void) | null = null
  onresult: ((ev: { resultIndex: number; results: Array<{ isFinal: boolean; length: number; 0: { transcript: string; confidence: number } }> }) => void) | null = null
  started = false
  stopped = false

  constructor() {
    super()
    FakeSpeechRecognition.latest = this
  }

  start() {
    this.started = true
    this.onstart?.()
  }

  stop() {
    this.stopped = true
  }

  abort() {
    this.stopped = true
  }
}

function createFakeRoom(micEnabled = true) {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>()
  const publishData = vi.fn().mockResolvedValue(undefined)
  const room = {
    localParticipant: {
      isMicrophoneEnabled: micEnabled,
      publishData,
    },
    on: (event: string, handler: (...args: unknown[]) => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set())
      listeners.get(event)!.add(handler)
    },
    off: (event: string, handler: (...args: unknown[]) => void) => {
      listeners.get(event)?.delete(handler)
    },
    emit: (event: string, ...args: unknown[]) => {
      listeners.get(event)?.forEach((fn) => fn(...args))
    },
  }
  return { room, publishData }
}

afterEach(() => {
  vi.clearAllMocks()
  FakeSpeechRecognition.latest = null
  delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition
})

describe('useMeetingLiveTranscription', () => {
  it('captures speech, publishes LiveKit captions, persists final utterance, and handles remote packets', async () => {
    ;(window as unknown as Record<string, unknown>).webkitSpeechRecognition = FakeSpeechRecognition
    api.appendMeetingTranscript.mockResolvedValue({
      id: 77,
      meetingId: 50,
      meetingVideoSessionId: 1,
      speakerUserId: 1,
      speakerName: 'Nguyễn Minh Khang',
      language: 'vi-VN',
      source: 'WEB_SPEECH',
      content: 'Mình bắt đầu review tiến độ tuần này nhé.',
      isHighlighted: false,
      clientSegmentId: 'seg',
      spokenAt: '2026-11-22T10:00:00Z',
      createdBy: 1,
    })

    const { room, publishData } = createFakeRoom(true)
    const onSegmentPersisted = vi.fn()
    const onRemoteInsightUpdated = vi.fn()

    const { result } = renderHook(() =>
      useMeetingLiveTranscription({
        meetingId: 50,
        room: room as never,
        localSpeakerName: 'Nguyễn Minh Khang',
        language: 'vi-VN',
        enabled: true,
        onSegmentPersisted,
        onRemoteInsightUpdated,
      }),
    )

    expect(result.current.supported).toBe(true)
    expect(result.current.status).toBe('listening')
    expect(FakeSpeechRecognition.latest?.started).toBe(true)

    // Emit final speech result
    act(() => {
      FakeSpeechRecognition.latest?.onresult?.({
        resultIndex: 0,
        results: [{ isFinal: true, length: 1, 0: { transcript: 'Mình bắt đầu review tiến độ tuần này nhé.', confidence: 0.95 } }],
      })
    })

    expect(result.current.liveCaptions).toHaveLength(1)
    expect(result.current.liveCaptions[0].text).toBe('Mình bắt đầu review tiến độ tuần này nhé.')
    expect(publishData).toHaveBeenCalled()
    await waitFor(() => expect(api.appendMeetingTranscript).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(onSegmentPersisted).toHaveBeenCalledTimes(1))

    // Simulate incoming remote DataChannel caption & AI insight broadcast
    act(() => {
      const captionBytes = new TextEncoder().encode(
        JSON.stringify({
          type: 'caption-final',
          clientSegmentId: 'remote-1',
          speakerName: 'Trần Thu Hà',
          text: 'Em đã đẩy PR mới lên rồi ạ.',
          language: 'vi-VN',
          spokenAt: new Date().toISOString(),
        }),
      )
      room.emit(RoomEvent.DataReceived, captionBytes, { name: 'Trần Thu Hà' }, undefined, AI_CAPTION_TOPIC)

      const insightBytes = new TextEncoder().encode(
        JSON.stringify({
          type: 'ai-insight-updated',
          insightId: 99,
          insightType: 'FULL_MINUTES',
        }),
      )
      room.emit(RoomEvent.DataReceived, insightBytes, { name: 'Trần Thu Hà' }, undefined, AI_CAPTION_TOPIC)
    })

    expect(result.current.liveCaptions.some((c) => c.speakerName === 'Trần Thu Hà')).toBe(true)
    expect(onRemoteInsightUpdated).toHaveBeenCalledWith(99, 'FULL_MINUTES')
  })

  it('pauses recognition while microphone is muted', () => {
    ;(window as unknown as Record<string, unknown>).webkitSpeechRecognition = FakeSpeechRecognition
    const { room } = createFakeRoom(false)

    const { result } = renderHook(() =>
      useMeetingLiveTranscription({
        meetingId: 50,
        room: room as never,
        localSpeakerName: 'Nguyễn Minh Khang',
        language: 'vi-VN',
        enabled: true,
      }),
    )

    expect(result.current.status).toBe('paused-muted')
    expect(FakeSpeechRecognition.latest).toBeNull()
  })

  it('coalesces rapid short fragments into one sentence and suppresses immediate duplicates', async () => {
    ;(window as unknown as Record<string, unknown>).webkitSpeechRecognition = FakeSpeechRecognition
    api.appendMeetingTranscript.mockImplementation(async (_meetingId: number, payload: { content: string }) => ({
      id: 88,
      meetingId: 50,
      meetingVideoSessionId: 1,
      speakerUserId: 1,
      speakerName: 'Nguyễn Minh Khang',
      language: 'vi-VN',
      source: 'WEB_SPEECH',
      content: payload.content,
      isHighlighted: false,
      clientSegmentId: 'coalesced-1',
      spokenAt: '2026-11-22T10:01:00Z',
      createdBy: 1,
    }))

    const { room } = createFakeRoom(true)
    renderHook(() =>
      useMeetingLiveTranscription({
        meetingId: 50,
        room: room as never,
        localSpeakerName: 'Nguyễn Minh Khang',
        language: 'vi-VN',
        enabled: true,
      }),
    )

    // Two rapid short chunks should coalesce into one single persisted sentence
    act(() => {
      FakeSpeechRecognition.latest?.onresult?.({
        resultIndex: 0,
        results: [{ isFinal: true, length: 1, 0: { transcript: 'phần API thanh toán', confidence: 0.9 } }],
      })
      FakeSpeechRecognition.latest?.onresult?.({
        resultIndex: 0,
        results: [{ isFinal: true, length: 1, 0: { transcript: 'sẽ hoàn thành vào chiều thứ Sáu.', confidence: 0.92 } }],
      })
    })

    await waitFor(() => expect(api.appendMeetingTranscript).toHaveBeenCalledTimes(1))
    expect(api.appendMeetingTranscript).toHaveBeenCalledWith(
      50,
      expect.objectContaining({
        content: 'Phần API thanh toán sẽ hoàn thành vào chiều thứ Sáu.',
      }),
    )

    // Immediate duplicate from browser speech restart should be ignored
    act(() => {
      FakeSpeechRecognition.latest?.onresult?.({
        resultIndex: 0,
        results: [
          {
            isFinal: true,
            length: 1,
            0: { transcript: 'Phần API thanh toán sẽ hoàn thành vào chiều thứ Sáu.', confidence: 0.92 },
          },
        ],
      })
    })
    expect(api.appendMeetingTranscript).toHaveBeenCalledTimes(1)
  })
})
