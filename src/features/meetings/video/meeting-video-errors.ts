import { HttpError } from '../../../services/http/http-client'

const videoErrorMessages: Record<string, string> = {
  VIDEO_NOT_ENABLED: 'Cuộc họp này chưa bật Video trong AI-PMS.',
  VIDEO_SESSION_NOT_STARTED: 'Người tổ chức chưa mở phòng họp.',
  VIDEO_SESSION_ALREADY_ACTIVE: 'Phòng họp đang hoạt động.',
  VIDEO_SESSION_ENDED: 'Phòng họp đã kết thúc.',
  VIDEO_SESSION_FAILED: 'Không thể khởi tạo phiên Video.',
  PROJECT_NOT_ACTIVE: 'Đồ án chưa ở trạng thái hoạt động.',
  MEETING_NOT_SCHEDULED: 'Cuộc họp chưa ở trạng thái đã lên lịch.',
  MEETING_PARTICIPANT_REQUIRED: 'Bạn phải là người tham gia cuộc họp để sử dụng Video.',
  VIDEO_START_FORBIDDEN: 'Bạn không được phép bắt đầu Video.',
  VIDEO_JOIN_FORBIDDEN: 'Bạn không được phép tham gia Video.',
  VIDEO_END_FORBIDDEN: 'Bạn không được phép kết thúc Video.',
  VIDEO_JOIN_TOO_EARLY: 'Chưa đến thời điểm có thể tham gia Video.',
  VIDEO_JOIN_WINDOW_CLOSED: 'Khoảng thời gian tham gia Video đã kết thúc.',
  VIDEO_PROVIDER_UNAVAILABLE: 'Dịch vụ Video hiện chưa sẵn sàng. Hãy thử lại sau.',
  VIDEO_PROVIDER_TIMEOUT: 'Dịch vụ Video phản hồi quá lâu. Hãy thử lại sau.',
  VIDEO_RECORDING_NOT_ENABLED: 'Cuộc họp này chưa bật ghi hình.',
  VIDEO_RECORDING_FORBIDDEN: 'Bạn không được phép dùng bản ghi Video.',
}

const unknownVideoError = 'Không thể thực hiện thao tác Video. Hãy thử lại hoặc liên hệ quản trị viên.'

/**
 * The server owns Video authorization and timing. This is deliberately a stable-code map;
 * do not expose or parse ProblemDetails.detail as a client-side authorization rule.
 */
export function meetingVideoErrorCode(code?: string | null): string {
  return code ? videoErrorMessages[code] ?? unknownVideoError : unknownVideoError
}

export function meetingVideoError(reason: unknown): string {
  return reason instanceof HttpError ? meetingVideoErrorCode(reason.problem?.code) : unknownVideoError
}

