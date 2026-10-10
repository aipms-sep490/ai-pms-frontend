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
/** Checkpoint / Review Gate (G1–G6) rollout. Enable only after the matching
 * backend endpoints (BE-12) are deployed; the screen reads gate status only. */
const gatesEnabled = import.meta.env.VITE_ENABLE_GATES?.trim().toLowerCase() === 'true'
/** Working Agreement (BE-16) rollout. Post-MVP by default; enable only after the
 * matching backend endpoints ship. The screen reads the agreement and records
 * per-member acceptance. */
const workingAgreementEnabled = import.meta.env.VITE_ENABLE_WORKING_AGREEMENT?.trim().toLowerCase() === 'true'
/** Unified project capabilities map (BE-10). Off until the FE finishes migrating
 * off the per-resource action endpoints; the legacy endpoints stay in the meantime. */
const unifiedCapabilitiesEnabled = import.meta.env.VITE_ENABLE_UNIFIED_CAPABILITIES?.trim().toLowerCase() === 'true'
/** Task filter by major / discipline role (BE-07). Off until the backend accepts
 * `majorId` + `disciplineRole`; only meaningful for interdisciplinary projects. */
const taskMajorFilterEnabled = import.meta.env.VITE_ENABLE_TASK_MAJOR_FILTER?.trim().toLowerCase() === 'true'
/** Saved AI analysis run history (BE-15). Enable only after the `/ai/runs`
 * endpoints ship; the panel is read-only. */
const aiRunHistoryEnabled = import.meta.env.VITE_ENABLE_AI_RUN_HISTORY?.trim().toLowerCase() === 'true'
/** Supervisor recommendation ranking (BE-18, P2). Advisory only; never creates a
 * request or assignment. Enable only after the recommendation endpoints ship. */
const supervisorRecommendationEnabled = import.meta.env.VITE_ENABLE_SUPERVISOR_RECOMMENDATION?.trim().toLowerCase() === 'true'
/** Defense schedule / committee screen (BE-14). Enable only after the
 * defense-session endpoints ship; the screen is read-only for students. */
const defenseScheduleEnabled = import.meta.env.VITE_ENABLE_DEFENSE?.trim().toLowerCase() === 'true'
/** Peer evaluation (BE-19b). Evidence only, never a score. Enable after endpoints ship. */
const peerEvaluationEnabled = import.meta.env.VITE_ENABLE_PEER_EVAL?.trim().toLowerCase() === 'true'
/** Result correction / appeal requests (BE-19b). A correction creates a new result
 * version. Enable after the correction endpoints ship. */
const resultCorrectionEnabled = import.meta.env.VITE_ENABLE_RESULT_CORRECTION?.trim().toLowerCase() === 'true'
/** Lead Department publishes cross-department results (BE-03). When on, the Admin
 * route no longer offers the publish CTA. Enable only after BE-03 merges; until
 * then Admin keeps publishing per the current backend. */
const leadDepartmentPublishEnabled = import.meta.env.VITE_ENABLE_LEAD_PUBLISH?.trim().toLowerCase() === 'true'
/** RBAC matrix editing (BE-11). MVP keeps the Admin permission matrix READ-ONLY;
 * turn this on only once editing the system matrix is designed and seeded. */
const rbacWriteEnabled = import.meta.env.VITE_ENABLE_RBAC_WRITE?.trim().toLowerCase() === 'true'

export const env = {
  apiBaseUrl: apiBaseUrl.replace(/\/$/, ''),
  dataMode,
  isMockMode: dataMode === 'mock',
  /** AI is an opt-in advisory capability and must never be required for core PMS work. */
  aiAdvisoryEnabled,
  videoMeetingEnabled,
  gatesEnabled,
  workingAgreementEnabled,
  unifiedCapabilitiesEnabled,
  taskMajorFilterEnabled,
  aiRunHistoryEnabled,
  supervisorRecommendationEnabled,
  defenseScheduleEnabled,
  peerEvaluationEnabled,
  resultCorrectionEnabled,
  leadDepartmentPublishEnabled,
  rbacWriteEnabled,
  chatEnabled: import.meta.env.VITE_ENABLE_CHAT?.trim().toLowerCase() === 'true',
} as const
