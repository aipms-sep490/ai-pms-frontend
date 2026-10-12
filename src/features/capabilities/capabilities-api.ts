import { httpGet } from '../../services/http/http-client'
import type { CapabilityReasonCode, ProjectCapabilities } from './capabilities-types'

/** Current merged contract. Invalid/foreign payloads cannot supply authority. */
export async function getMyCapabilities(projectId: number, signal?: AbortSignal) {
  const result = await httpGet<ProjectCapabilities>(`/projects/${projectId}/my-capabilities`, signal)
  if (!result || result.projectId !== projectId || !Array.isArray(result.actions)
    || result.actions.some(action => !action || typeof action.code !== 'string' || typeof action.allowed !== 'boolean'
      || !Array.isArray(action.reasons) || action.reasons.some(reason => typeof reason !== 'string'))
    || new Set(result.actions.map(action => action.code)).size !== result.actions.length) {
    throw new Error('Project capability contract mismatch')
  }
  return result
}

const REASON_LABELS: Record<string, string> = {
  NOT_PROJECT_MEMBER: 'Bạn không phải thành viên của đồ án này.',
  STATE_NOT_ALLOWED: 'Trạng thái hiện tại của đồ án không cho phép thao tác này.',
  POLICY_LOCKED: 'Quy định của kỳ đang khoá thao tác này.',
  OUT_OF_SCOPE: 'Thao tác này nằm ngoài phạm vi ngành bạn phụ trách.',
  NOT_ASSIGNED: 'Bạn chưa được phân công cho phần việc này.',
  LEAD_DEPARTMENT_REQUIRED: 'Chỉ khoa chủ trì được quản lý toàn bộ phương án đánh giá.',
  LEAD_DEPARTMENT_REQUIRED_FOR_PUBLICATION: 'Chỉ khoa chủ trì được công bố kết quả học thuật.',
  ACADEMIC_COMPONENT_SCOPE_REQUIRED: 'Bạn chưa có quyền quản lý thành phần đánh giá trong phạm vi này.',
  ACADEMIC_SCOPE_UNKNOWN_OR_INACTIVE: 'Phạm vi học thuật chưa xác minh hoặc không còn hiệu lực.',
  PROJECT_NOT_FINAL_SUBMISSION: 'Đồ án chưa đến trạng thái đánh giá hồ sơ bàn giao.',
  FINAL_PACKAGE_REQUIRED: 'Cần hồ sơ bàn giao đã khóa trước khi đánh giá.',
  EVALUATION_WINDOW_CLOSED: 'Đợt đánh giá chưa mở hoặc đã kết thúc.',
  PUBLISHED_SCHEME_REQUIRED: 'Cần phương án đánh giá đã công bố đúng đợt.',
  RESULT_NOT_READY: 'Kết quả chưa đủ điều kiện công bố.',
  DEMO_SCHEME_NOT_OFFICIAL: 'Phương án minh họa không được công bố kết quả chính thức.',
}

/** Human-readable Vietnamese label for a blocked-reason code, with a safe fallback. */
export const describeReason = (code: CapabilityReasonCode): string =>
  REASON_LABELS[code] ?? 'Bạn chưa đủ điều kiện thực hiện thao tác này.'
