import { httpGet } from '../../services/http/http-client'
import type { CapabilityReasonCode, ProjectCapabilities } from './capabilities-types'

// BE-10 endpoint. FE is built ahead of the backend; until it ships this call
// returns 404/501 and consumers keep using the legacy per-resource action endpoints.
export const getMyCapabilities = (projectId: number, signal?: AbortSignal) =>
  httpGet<ProjectCapabilities>(`/projects/${projectId}/my-capabilities`, signal)

const REASON_LABELS: Record<string, string> = {
  NOT_PROJECT_MEMBER: 'Bạn không phải thành viên của đồ án này.',
  STATE_NOT_ALLOWED: 'Trạng thái hiện tại của đồ án không cho phép thao tác này.',
  POLICY_LOCKED: 'Quy định của kỳ đang khoá thao tác này.',
  OUT_OF_SCOPE: 'Thao tác này nằm ngoài phạm vi ngành bạn phụ trách.',
  NOT_ASSIGNED: 'Bạn chưa được phân công cho phần việc này.',
}

/** Human-readable Vietnamese label for a blocked-reason code, with a safe fallback. */
export const describeReason = (code: CapabilityReasonCode): string =>
  REASON_LABELS[code] ?? 'Bạn chưa đủ điều kiện thực hiện thao tác này.'
