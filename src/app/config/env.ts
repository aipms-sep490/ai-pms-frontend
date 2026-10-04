const rawBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
const apiBaseUrl = rawBaseUrl || '/api/v1'

const rawDataMode = import.meta.env.VITE_DATA_MODE?.trim().toLowerCase()
const dataMode: 'api' | 'mock' = rawDataMode === 'mock' ? 'mock' : 'api'
const aiAdvisoryEnabled = import.meta.env.VITE_ENABLE_AI_ADVISORY?.trim().toLowerCase() === 'true'
/**
 * Deployment/presentation rollout only. It never grants a meeting or media permission;
 * Video capabilities must come from the future video-session endpoint.
 */
const videoMeetingEnabled = import.meta.env.VITE_ENABLE_VIDEO_MEETING?.trim().toLowerCase() === 'true'

export const env = {
  apiBaseUrl: apiBaseUrl.replace(/\/$/, ''),
  dataMode,
  isMockMode: dataMode === 'mock',
  /** AI is an opt-in advisory capability and must never be required for core PMS work. */
  aiAdvisoryEnabled,
  videoMeetingEnabled,
} as const
