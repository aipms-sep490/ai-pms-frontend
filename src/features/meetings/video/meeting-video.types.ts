import type { MeetingStatus } from '../meeting-types'

/** Provider-independent frozen Video Meeting contract. Keep provider SDK types inside a later adapter. */
export type MeetingDeliveryMode = 'ONSITE' | 'REMOTE' | 'HYBRID'
export type MeetingVideoChannel = 'NONE' | 'EXTERNAL_LINK' | 'IN_APP_VIDEO'
export type MeetingVideoSessionStatus = 'CREATED' | 'LIVE' | 'ENDED' | 'FAILED'

export interface MeetingVideoCapabilities {
  canStart: boolean
  canJoin: boolean
  canEnd: boolean
  /** Reserved for the later Recording phase; no recording endpoint is introduced in Phase A. */
  canRecord: boolean
}

export interface MeetingVideoJoinWindow {
  /** UTC ISO-8601, nullable when the policy has no lower bound. */
  availableFrom: string | null
  /** UTC ISO-8601, nullable when the policy has no upper bound. */
  availableUntil: string | null
}

export interface MeetingVideoSession {
  id: number
  status: MeetingVideoSessionStatus
  /** UTC ISO-8601, nullable while the session is CREATED. */
  startedAt: string | null
  /** UTC ISO-8601, nullable until the session reaches a terminal state. */
  endedAt: string | null
  /** Nullable when provider data is unavailable or unreliable. */
  activeParticipantCount: number | null
}

/**
 * Canonical safe resource returned by the session/start/end read model. It contains no
 * provider secret, room key, or join credential, and capabilities stay Backend-owned.
 */
export interface MeetingVideoResource {
  meetingId: number
  meetingStatus: MeetingStatus
  meetingDeliveryMode: MeetingDeliveryMode
  videoChannel: MeetingVideoChannel
  session: MeetingVideoSession | null
  capabilities: MeetingVideoCapabilities
  joinWindow: MeetingVideoJoinWindow | null
  /** Stable ProblemDetails-style codes; non-null and empty when no safe reason applies. */
  denialReasons: string[]
}

/** Backward-friendly name used by screens that call the session resource metadata "video". */
export type MeetingVideoMetadata = MeetingVideoResource

export interface MeetingVideoJoinCapabilities {
  publishAudio: boolean
  publishVideo: boolean
  screenShare: boolean
  moderator: boolean
}

/** The token is response-scoped: keep it in memory only; never persist or add it to a URL. */
export interface MeetingVideoJoinResponse {
  provider: string
  serverUrl: string
  participantIdentity: string
  participantName: string
  accessToken: string
  /** UTC ISO-8601 short-lived credential expiry. */
  expiresAt: string
  capabilities: MeetingVideoJoinCapabilities
}

export interface MeetingVideoParticipantPresence {
  userId: number
  /** UTC ISO-8601 when provider evidence has a first connection; nullable when unavailable. */
  firstJoinedAt: string | null
  /** UTC ISO-8601 after a leave; null while the provider still reports the participant connected. */
  lastLeftAt: string | null
  totalConnectedSeconds: number
  connectionCount: number
}

export interface MeetingVideoPresenceSummary {
  meetingId: number
  participants: MeetingVideoParticipantPresence[]
}

/** Browser correlation only. It must never be treated as identity or a requested provider grant. */
