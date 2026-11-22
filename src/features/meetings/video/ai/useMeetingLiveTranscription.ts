import { useCallback, useEffect, useRef, useState } from 'react'
import { RoomEvent, Track, type Participant, type Room } from 'livekit-client'
import { appendMeetingTranscript } from './meeting-video-ai-api'
import type {
  LiveCaptionLine,
  LiveKitAiDataPacket,
  MeetingTranscriptSegment,
} from './meeting-video-ai.types'

interface SpeechRecognitionAlternativeLike {
  transcript: string
  confidence: number
}

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean
  readonly length: number
  [index: number]: SpeechRecognitionAlternativeLike
}

interface SpeechRecognitionResultListLike {
  readonly length: number
  [index: number]: SpeechRecognitionResultLike
}

interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number
  readonly results: SpeechRecognitionResultListLike
}

interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string
  readonly message?: string
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null
}

function createClientSegmentId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '')
  }
  return `seg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export const AI_CAPTION_TOPIC = 'aipms-ai-caption'

export type TranscriptionState =
  | 'idle'
  | 'listening'
  | 'paused-muted'
  | 'unsupported'
  | 'error'

export interface UseMeetingLiveTranscriptionOptions {
  meetingId: number
  room: Room | null
  localSpeakerName: string
  language: string
  enabled: boolean
  onSegmentPersisted?: (segment: MeetingTranscriptSegment) => void
  onRemoteCaptionFinal?: (line: LiveCaptionLine) => void
  onRemoteInsightUpdated?: (insightId: number, insightType: string) => void
  onRemoteTranscriptSync?: () => void
}

export interface UseMeetingLiveTranscriptionResult {
  supported: boolean
  status: TranscriptionState
  error: string
  liveCaptions: LiveCaptionLine[]
  activeSpeakers: string[]
  clearError: () => void
  broadcastInsightUpdated: (insightId: number, insightType: string) => void
  broadcastTranscriptSync: (segmentId?: number) => void
}

const CAPTION_TTL_MS = 15_000
const MAX_VISIBLE_CAPTIONS = 3

export function useMeetingLiveTranscription({
  meetingId,
  room,
  localSpeakerName,
  language,
  enabled,
  onSegmentPersisted,
  onRemoteCaptionFinal,
  onRemoteInsightUpdated,
  onRemoteTranscriptSync,
}: UseMeetingLiveTranscriptionOptions): UseMeetingLiveTranscriptionResult {
  const supported = getSpeechRecognitionCtor() !== null
  const [runtimeState, setRuntimeState] = useState<'idle' | 'listening' | 'error'>('idle')
  const [error, setError] = useState('')
  const [liveCaptions, setLiveCaptions] = useState<LiveCaptionLine[]>([])
  const [activeSpeakers, setActiveSpeakers] = useState<string[]>([])
  const [roomMicEnabled, setRoomMicEnabled] = useState<boolean>(() =>
    room ? Boolean(room.localParticipant?.isMicrophoneEnabled) : true,
  )
  const micEnabled = room ? roomMicEnabled : true

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const restartTimerRef = useRef<number | null>(null)
  const lastInterimSentAtRef = useRef(0)
  const currentDraftIdRef = useRef<string>(createClientSegmentId())
  const enabledRef = useRef(enabled)
  const micEnabledRef = useRef(micEnabled)
  const mountedRef = useRef(true)

  const callbacksRef = useRef({
    onSegmentPersisted,
    onRemoteCaptionFinal,
    onRemoteInsightUpdated,
    onRemoteTranscriptSync,
  })

  useEffect(() => {
    callbacksRef.current = {
      onSegmentPersisted,
      onRemoteCaptionFinal,
      onRemoteInsightUpdated,
      onRemoteTranscriptSync,
    }
    enabledRef.current = enabled
    micEnabledRef.current = micEnabled
  }, [
    enabled,
    micEnabled,
    onRemoteCaptionFinal,
    onRemoteInsightUpdated,
    onRemoteTranscriptSync,
    onSegmentPersisted,
  ])

  const status: TranscriptionState = !supported
    ? 'unsupported'
    : !enabled
    ? 'idle'
    : !micEnabled
    ? 'paused-muted'
    : runtimeState

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const upsertCaption = useCallback((line: LiveCaptionLine) => {
    setLiveCaptions((prev) => {
      const idx = prev.findIndex(
        (item) => item.clientSegmentId === line.clientSegmentId || item.key === line.key,
      )
      const next = idx >= 0
        ? prev.map((item, i) => (i === idx ? { ...item, ...line } : item))
        : [...prev, line]
      return next.slice(-MAX_VISIBLE_CAPTIONS)
    })
  }, [])

  // Periodically prune stale finalized captions from overlay while keeping transcript panel intact.
  useEffect(() => {
    if (liveCaptions.length === 0) return
    const timer = window.setInterval(() => {
      const cutoff = Date.now() - CAPTION_TTL_MS
      setLiveCaptions((prev) =>
        prev.filter((line) => !line.isFinal || new Date(line.spokenAt).getTime() >= cutoff),
      )
    }, 2500)
    return () => window.clearInterval(timer)
  }, [liveCaptions.length])

  const publishPacket = useCallback(
    (packet: LiveKitAiDataPacket, reliable: boolean) => {
      if (!room?.localParticipant || typeof room.localParticipant.publishData !== 'function') return
      try {
        const encoded = new TextEncoder().encode(JSON.stringify(packet))
        void room.localParticipant.publishData(encoded, {
          reliable,
          topic: AI_CAPTION_TOPIC,
        })
      } catch {
        // Non-fatal: DataChannel broadcast must never interrupt audio/video media.
      }
    },
    [room],
  )

  const broadcastInsightUpdated = useCallback(
    (insightId: number, insightType: string) => {
      publishPacket({ type: 'ai-insight-updated', insightId, insightType }, true)
    },
    [publishPacket],
  )

  const broadcastTranscriptSync = useCallback(
    (segmentId?: number) => {
      publishPacket({ type: 'transcript-sync', segmentId }, true)
    },
    [publishPacket],
  )

  // Track LiveKit microphone mute/unmute, active speakers, and DataChannel AI packets.
  useEffect(() => {
    if (!room || typeof room.on !== 'function') {
      return
    }

    const syncMic = () => {
      setRoomMicEnabled(Boolean(room.localParticipant?.isMicrophoneEnabled))
    }

    const handleTrackChange = (pub?: { source?: Track.Source }) => {
      if (!pub || pub.source === Track.Source.Microphone) syncMic()
    }

    const handleActiveSpeakers = (speakers: Participant[]) => {
      setActiveSpeakers(
        speakers
          .map((p) => p.name || p.identity)
          .filter((name): name is string => Boolean(name)),
      )
    }

    const handleDataReceived = (
      payload: Uint8Array,
      participant?: Participant,
      _kind?: unknown,
      topic?: string,
    ) => {
      if (topic && topic !== AI_CAPTION_TOPIC) return
      try {
        const text = new TextDecoder().decode(payload)
        const packet = JSON.parse(text) as LiveKitAiDataPacket
        if (!packet || typeof packet !== 'object') return

        if (packet.type === 'caption-interim' || packet.type === 'caption-final') {
          const speaker = packet.speakerName || participant?.name || 'Thành viên'
          const line: LiveCaptionLine = {
            key: packet.clientSegmentId,
            clientSegmentId: packet.clientSegmentId,
            speakerName: speaker,
            text: packet.text,
            isFinal: packet.type === 'caption-final',
            language: packet.language || 'vi-VN',
            spokenAt: packet.spokenAt || new Date().toISOString(),
            persistedId: packet.type === 'caption-final' ? packet.persistedId : undefined,
          }
          upsertCaption(line)
          if (packet.type === 'caption-final') {
            callbacksRef.current.onRemoteCaptionFinal?.(line)
          }
        } else if (packet.type === 'ai-insight-updated') {
          callbacksRef.current.onRemoteInsightUpdated?.(packet.insightId, packet.insightType)
        } else if (packet.type === 'transcript-sync') {
          callbacksRef.current.onRemoteTranscriptSync?.()
        }
      } catch {
        // Ignore malformed packets from unrelated data topics.
      }
    }

    if (RoomEvent.TrackMuted) room.on(RoomEvent.TrackMuted, handleTrackChange)
    if (RoomEvent.TrackUnmuted) room.on(RoomEvent.TrackUnmuted, handleTrackChange)
    if (RoomEvent.LocalTrackPublished) room.on(RoomEvent.LocalTrackPublished, handleTrackChange)
    if (RoomEvent.LocalTrackUnpublished) room.on(RoomEvent.LocalTrackUnpublished, handleTrackChange)
    if (RoomEvent.ActiveSpeakersChanged) room.on(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakers)
    if (RoomEvent.DataReceived) room.on(RoomEvent.DataReceived, handleDataReceived)

    return () => {
      if (typeof room.off !== 'function') return
      if (RoomEvent.TrackMuted) room.off(RoomEvent.TrackMuted, handleTrackChange)
      if (RoomEvent.TrackUnmuted) room.off(RoomEvent.TrackUnmuted, handleTrackChange)
      if (RoomEvent.LocalTrackPublished) room.off(RoomEvent.LocalTrackPublished, handleTrackChange)
      if (RoomEvent.LocalTrackUnpublished) room.off(RoomEvent.LocalTrackUnpublished, handleTrackChange)
      if (RoomEvent.ActiveSpeakersChanged) room.off(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakers)
      if (RoomEvent.DataReceived) room.off(RoomEvent.DataReceived, handleDataReceived)
    }
  }, [room, upsertCaption])

  // Manage browser Web Speech API lifecycle.
  useEffect(() => {
    const clearPendingRestart = () => {
      if (restartTimerRef.current !== null) {
        window.clearTimeout(restartTimerRef.current)
        restartTimerRef.current = null
      }
    }

    const stopRecognition = () => {
      clearPendingRestart()
      const current = recognitionRef.current
      recognitionRef.current = null
      if (current) {
        current.onstart = null
        current.onend = null
        current.onerror = null
        current.onresult = null
        try {
          current.stop()
        } catch {
          try {
            current.abort()
          } catch {
            // ignore
          }
        }
      }
    }

    if (!supported || !enabled || !micEnabled) {
      stopRecognition()
      return
    }

    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) return

    let cancelled = false
    let fatalError = false

    const startInstance = () => {
      if (cancelled || fatalError || !enabledRef.current || !micEnabledRef.current) return
      stopRecognition()

      const recognition = new Ctor()
      recognition.lang = language || 'vi-VN'
      recognition.continuous = true
      recognition.interimResults = true
      recognition.maxAlternatives = 1

      recognition.onstart = () => {
        if (cancelled) return
        setRuntimeState('listening')
        setError('')
      }

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        if (cancelled) return
        let interimCombined = ''
        const finalParts: string[] = []

        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i]
          const transcript = result?.[0]?.transcript?.trim() ?? ''
          if (!transcript) continue
          if (result.isFinal) {
            finalParts.push(transcript)
          } else {
            interimCombined += (interimCombined ? ' ' : '') + transcript
          }
        }

        const nowIso = new Date().toISOString()

        if (interimCombined) {
          const draftId = currentDraftIdRef.current
          upsertCaption({
            key: draftId,
            clientSegmentId: draftId,
            speakerName: localSpeakerName,
            text: interimCombined,
            isFinal: false,
            language,
            spokenAt: nowIso,
          })

          const nowMs = Date.now()
          if (nowMs - lastInterimSentAtRef.current >= 220) {
            lastInterimSentAtRef.current = nowMs
            publishPacket(
              {
                type: 'caption-interim',
                clientSegmentId: draftId,
                speakerName: localSpeakerName,
                text: interimCombined,
                language,
                spokenAt: nowIso,
              },
              false,
            )
          }
        }

        if (finalParts.length > 0) {
          const finalText = finalParts.join(' ').trim()
          const clientSegmentId = currentDraftIdRef.current
          currentDraftIdRef.current = createClientSegmentId()

          upsertCaption({
            key: clientSegmentId,
            clientSegmentId,
            speakerName: localSpeakerName,
            text: finalText,
            isFinal: true,
            language,
            spokenAt: nowIso,
          })

          publishPacket(
            {
              type: 'caption-final',
              clientSegmentId,
              speakerName: localSpeakerName,
              text: finalText,
              language,
              spokenAt: nowIso,
            },
            true,
          )

          void appendMeetingTranscript(meetingId, {
            content: finalText,
            language,
            source: 'WEB_SPEECH',
            isHighlighted: false,
            clientSegmentId,
            spokenAt: nowIso,
          })
            .then((saved) => {
              if (!mountedRef.current) return
              upsertCaption({
                key: clientSegmentId,
                clientSegmentId,
                speakerName: saved.speakerName,
                text: saved.content,
                isFinal: true,
                language: saved.language,
                spokenAt: saved.spokenAt,
                persistedId: saved.id,
              })
              callbacksRef.current.onSegmentPersisted?.(saved)
              publishPacket({ type: 'transcript-sync', segmentId: saved.id }, true)
            })
            .catch(() => {
              // Keep live caption visible even if a single transient persistence call fails.
            })
        }
      }

      recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
        if (cancelled) return
        if (event.error === 'no-speech' || event.error === 'aborted') {
          return
        }
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          fatalError = true
          setRuntimeState('error')
          setError('Trình duyệt chưa cấp quyền nhận diện giọng nói. Hãy bật quyền Micrô (HTTPS) hoặc dùng ô ghi chú nhanh bên dưới.')
          return
        }
        if (event.error === 'audio-capture') {
          fatalError = true
          setRuntimeState('error')
          setError('Không tìm thấy tín hiệu micrô để nhận diện lời nói.')
          return
        }
        if (event.error === 'network') {
          setError('Dịch vụ nhận diện giọng nói trình duyệt đang gián đoạn mạng, hệ thống sẽ tự thử kết nối lại…')
        }
      }

      recognition.onend = () => {
        if (cancelled || fatalError || !enabledRef.current || !micEnabledRef.current) return
        clearPendingRestart()
        restartTimerRef.current = window.setTimeout(() => {
          if (!cancelled && enabledRef.current && micEnabledRef.current) {
            startInstance()
          }
        }, 300)
      }

      recognitionRef.current = recognition
      try {
        recognition.start()
      } catch {
        // Retry once cleanly if browser speech service is still tearing down the previous instance.
        clearPendingRestart()
        restartTimerRef.current = window.setTimeout(() => {
          if (!cancelled && enabledRef.current && micEnabledRef.current) {
            startInstance()
          }
        }, 500)
      }
    }

    startInstance()

    return () => {
      cancelled = true
      stopRecognition()
    }
  }, [enabled, language, localSpeakerName, meetingId, micEnabled, publishPacket, supported, upsertCaption])

  return {
    supported,
    status,
    error,
    liveCaptions,
    activeSpeakers,
    clearError: () => setError(''),
    broadcastInsightUpdated,
    broadcastTranscriptSync,
  }
}
