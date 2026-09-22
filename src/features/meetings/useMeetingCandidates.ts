import { useEffect, useState } from 'react'
import { getMeetingCandidates } from '../../services/api/meetings.api'
import type { MeetingCandidate } from './meeting-types'
import { meetingError } from './meeting-utils'

export function useMeetingCandidates(projectId: number, teamId: number, enabled: boolean) {
  const [data, setData] = useState<MeetingCandidate[]>([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    setLoading(true); setError(''); setNotice(''); setData([])
    getMeetingCandidates(projectId, teamId, controller.signal)
      .then((result) => { if (!controller.signal.aborted) { setData(result.candidates); setNotice(result.notice ?? '') } })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(meetingError(reason)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [projectId, teamId, enabled, revision])
  return { data, loading, error, notice, retry: () => setRevision((value) => value + 1) }
}
