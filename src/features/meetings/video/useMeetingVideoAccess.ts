import { useCallback, useEffect, useState } from 'react'
import { env } from '../../../app/config/env'
import { getMeetingVideoSession } from './meeting-video-api'
import { meetingVideoError } from './meeting-video-errors'
import type { MeetingVideoResource } from './meeting-video.types'

type VideoMeetingIdentity = { id: number; videoChannel?: string } | null | undefined

export type MeetingVideoAccessState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; resource: MeetingVideoResource }
  | { status: 'error'; message: string }

/**
 * Reads the canonical Video resource only for an explicitly configured in-app meeting.
 * Capability flags returned by that resource are the only authority exposed to the UI.
 */
export function useMeetingVideoAccess(meeting: VideoMeetingIdentity) {
  const enabled = env.videoMeetingEnabled && meeting?.videoChannel === 'IN_APP_VIDEO'
  const meetingId = meeting?.id
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState<MeetingVideoAccessState>({ status: 'idle' })

  const refresh = useCallback(() => {
    if (enabled && Number.isSafeInteger(meetingId) && (meetingId as number) > 0) {
      setRevision((value) => value + 1)
    }
  }, [enabled, meetingId])

  useEffect(() => {
    if (!enabled || !Number.isSafeInteger(meetingId) || (meetingId as number) < 1) {
      setState({ status: 'idle' })
      return
    }

    const controller = new AbortController()
    setState({ status: 'loading' })
    getMeetingVideoSession(meetingId as number, controller.signal)
      .then((resource) => {
        if (!controller.signal.aborted) setState({ status: 'ready', resource })
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setState({ status: 'error', message: meetingVideoError(reason) })
      })
    return () => controller.abort()
  }, [enabled, meetingId, revision])

  return { state, refresh, enabled }
}
