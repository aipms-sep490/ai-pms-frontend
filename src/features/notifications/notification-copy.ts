import type { NotificationItem } from './notifications-api'

const copyByType: Record<string, { title: string; content: string; label: string; icon: string }> = {
  TEAM_INVITATION_SENT: {
    title: 'Bạn nhận được lời mời tham gia nhóm',
    content: 'Có lời mời tham gia nhóm mới. Hãy kiểm tra danh sách lời mời để xem và phản hồi.',
    label: 'Lời mời tham gia nhóm',
    icon: 'group_add',
  },
  TEAM_INVITATION_ACCEPTED: {
    title: 'Lời mời tham gia nhóm đã được chấp nhận',
    content: 'Một lời mời tham gia nhóm đã được chấp nhận. Hãy kiểm tra danh sách thành viên hiện tại.',
    label: 'Lời mời tham gia nhóm',
    icon: 'group_add',
  },
  TEAM_INVITATION_REJECTED: {
    title: 'Lời mời tham gia nhóm đã bị từ chối',
    content: 'Một lời mời tham gia nhóm đã bị từ chối. Hãy kiểm tra lại tình trạng lời mời của nhóm.',
    label: 'Lời mời tham gia nhóm',
    icon: 'group',
  },
  TEAM_INVITATION_CANCELLED: {
    title: 'Lời mời tham gia nhóm đã được hủy',
    content: 'Một lời mời tham gia nhóm đã được hủy. Hãy kiểm tra danh sách lời mời hiện tại.',
    label: 'Lời mời tham gia nhóm',
    icon: 'group',
  },
  SUPERVISOR_REQUEST_SENT: {
    title: 'Có đề nghị hướng dẫn đồ án mới',
    content: 'Một nhóm đã gửi đề nghị hướng dẫn. Hãy xem hồ sơ đề nghị để kiểm tra và phản hồi.',
    label: 'Đề nghị hướng dẫn',
    icon: 'school',
  },
  SUPERVISOR_REQUEST_ACCEPTED: {
    title: 'Đề nghị hướng dẫn đã được chấp nhận',
    content: 'Đề nghị hướng dẫn của nhóm đã được chấp nhận. Hãy kiểm tra thông tin hướng dẫn hiện tại.',
    label: 'Đề nghị hướng dẫn',
    icon: 'school',
  },
  SUPERVISOR_REQUEST_REJECTED: {
    title: 'Đề nghị hướng dẫn đã bị từ chối',
    content: 'Đề nghị hướng dẫn của nhóm đã bị từ chối. Hãy xem tình trạng đề nghị để chuẩn bị bước tiếp theo.',
    label: 'Đề nghị hướng dẫn',
    icon: 'school',
  },
  SUPERVISOR_REQUEST_CANCELLED: {
    title: 'Đề nghị hướng dẫn đã được hủy',
    content: 'Một đề nghị hướng dẫn đã được hủy. Hãy kiểm tra danh sách đề nghị hiện tại.',
    label: 'Đề nghị hướng dẫn',
    icon: 'school',
  },
  TEAM_LEADER_CHANGE_REQUESTED: {
    title: 'Có đề nghị thay đổi trưởng nhóm',
    content: 'Một nhóm đã gửi đề nghị thay đổi trưởng nhóm. Hãy kiểm tra hồ sơ đề nghị trong phạm vi được phân công.',
    label: 'Thay đổi trưởng nhóm',
    icon: 'manage_accounts',
  },
  TEAM_LEADER_CHANGE_APPROVED: {
    title: 'Đề nghị thay đổi trưởng nhóm đã được duyệt',
    content: 'Đề nghị thay đổi trưởng nhóm đã được chấp thuận. Hãy kiểm tra thông tin thành viên và vai trò hiện tại.',
    label: 'Thay đổi trưởng nhóm',
    icon: 'manage_accounts',
  },
  TEAM_LEADER_CHANGE_REJECTED: {
    title: 'Đề nghị thay đổi trưởng nhóm đã bị từ chối',
    content: 'Đề nghị thay đổi trưởng nhóm chưa được chấp thuận. Hãy xem lại hồ sơ đề nghị.',
    label: 'Thay đổi trưởng nhóm',
    icon: 'manage_accounts',
  },
  FINAL_SUBMISSION_LOCKED: {
    title: 'Hồ sơ bàn giao cuối kỳ đã được khóa',
    content: 'Hồ sơ bàn giao cuối kỳ của một đồ án đã được khóa. Hãy kiểm tra phiên bản hồ sơ được lưu trong hệ thống.',
    label: 'Bàn giao cuối kỳ',
    icon: 'lock',
  },
  EVALUATION_FINALIZED: {
    title: 'Một lượt đánh giá đã được hoàn tất',
    content: 'Một lượt đánh giá đã được chốt. Hãy kiểm tra hồ sơ đánh giá trong phạm vi được cấp quyền.',
    label: 'Đánh giá đồ án',
    icon: 'fact_check',
  },
  PROJECT_RESULT_PUBLISHED: {
    title: 'Kết quả đồ án đã được công bố',
    content: 'Kết quả đồ án đã được công bố. Hãy mở hồ sơ kết quả để xem phiên bản và nội dung được phép hiển thị.',
    label: 'Kết quả đồ án',
    icon: 'grading',
  },
  STUDENT_RESULT_PUBLISHED: {
    title: 'Kết quả cá nhân đã được công bố',
    content: 'Kết quả đánh giá cá nhân đã được công bố. Hãy kiểm tra hồ sơ kết quả của bạn.',
    label: 'Kết quả cá nhân',
    icon: 'grading',
  },
  PROJECT_APPROVED: {
    title: 'Đề cương đồ án đã được phê duyệt',
    content: 'Đề cương đồ án đã được phê duyệt. Hãy kiểm tra trạng thái hồ sơ và các bước tiếp theo của nhóm.',
    label: 'Thẩm định đề cương',
    icon: 'task_alt',
  },
  PROJECT_REJECTED: {
    title: 'Đề cương đồ án chưa được chấp thuận',
    content: 'Đề cương đồ án chưa được chấp thuận. Hãy xem kết quả thẩm định và hướng dẫn trong hồ sơ.',
    label: 'Thẩm định đề cương',
    icon: 'rate_review',
  },
  PROJECT_REVISION_REQUESTED: {
    title: 'Đề cương đồ án cần chỉnh sửa',
    content: 'Đề cương đồ án có yêu cầu chỉnh sửa. Hãy kiểm tra nhận xét và cập nhật nội dung theo hướng dẫn.',
    label: 'Thẩm định đề cương',
    icon: 'edit_note',
  },
  EVALUATOR_ASSIGNED: {
    title: 'Bạn được phân công đánh giá đồ án',
    content: 'Có phân công đánh giá mới. Hãy kiểm tra giai đoạn, phạm vi và tiêu chí của lượt đánh giá được giao.',
    label: 'Phân công đánh giá',
    icon: 'assignment_ind',
  },
  SUPERVISOR_REPLACED: {
    title: 'Phân công giảng viên hướng dẫn đã thay đổi',
    content: 'Phân công giảng viên hướng dẫn của đồ án đã được cập nhật. Hãy kiểm tra thông tin phân công hiện tại.',
    label: 'Phân công hướng dẫn',
    icon: 'school',
  },
  PROGRESS_REPORT_SUBMITTED: {
    title: 'Nhóm đã nộp báo cáo tiến độ',
    content: 'Có báo cáo tiến độ mới được nộp. Hãy kiểm tra báo cáo trong phạm vi hướng dẫn được giao.',
    label: 'Báo cáo tiến độ',
    icon: 'description',
  },
  TASK_DEADLINE_REMINDER: {
    title: 'Công việc sắp đến hạn',
    content: 'Một công việc sắp đến hạn hoàn thành. Hãy kiểm tra thời hạn và phần việc được giao.',
    label: 'Nhắc hạn công việc',
    icon: 'alarm',
  },
  TASK_OVERDUE: {
    title: 'Công việc đã quá hạn',
    content: 'Một công việc đã quá hạn. Hãy kiểm tra tiến độ và trao đổi về cách xử lý phần việc còn lại.',
    label: 'Cảnh báo quá hạn',
    icon: 'warning',
  },
  DELIVERABLE_DEADLINE_REMINDER: {
    title: 'Hạng mục sắp đến hạn nộp',
    content: 'Một hạng mục sắp đến hạn nộp. Hãy kiểm tra yêu cầu và chuẩn bị phiên bản cần bàn giao.',
    label: 'Nhắc hạn hạng mục',
    icon: 'alarm',
  },
  DELIVERABLE_OVERDUE: {
    title: 'Hạng mục đã quá hạn nộp',
    content: 'Một hạng mục đã quá hạn nộp. Hãy kiểm tra hồ sơ và trao đổi về bước xử lý tiếp theo.',
    label: 'Cảnh báo quá hạn',
    icon: 'warning',
  },
  FINAL_SUBMISSION_DEADLINE_REMINDER: {
    title: 'Sắp đến hạn bàn giao cuối kỳ',
    content: 'Hồ sơ bàn giao cuối kỳ sắp đến hạn. Hãy kiểm tra yêu cầu và thời gian nhận hồ sơ của kỳ đồ án.',
    label: 'Nhắc hạn bàn giao',
    icon: 'alarm',
  },
  FINAL_SUBMISSION_OVERDUE: {
    title: 'Hồ sơ bàn giao cuối kỳ đã quá hạn',
    content: 'Đồ án đã quá hạn bàn giao cuối kỳ. Hãy kiểm tra trạng thái hồ sơ và hướng dẫn xử lý trong phạm vi được cấp quyền.',
    label: 'Cảnh báo quá hạn',
    icon: 'warning',
  },
  PROJECT_RISK_CRITICAL: {
    title: 'Đồ án có tín hiệu rủi ro nghiêm trọng',
    content: 'Hệ thống ghi nhận tín hiệu rủi ro nghiêm trọng về tiến độ. Hãy kiểm tra các yếu tố rủi ro và trao đổi với giảng viên hướng dẫn.',
    label: 'Cảnh báo tiến độ',
    icon: 'warning',
  },
  DELIVERABLE_SUBMITTED: {
    title: 'Có phiên bản hạng mục mới được nộp',
    content: 'Nhóm đã nộp một phiên bản hạng mục. Hãy kiểm tra tài liệu và yêu cầu phản hồi được phân công.',
    label: 'Hạng mục đã nộp',
    icon: 'inventory_2',
  },
  MEETING_START_REMINDER: {
    title: 'Cuộc họp sắp bắt đầu',
    content: 'Một cuộc họp bạn được mời sắp bắt đầu. Hãy kiểm tra thời gian và thông tin tham dự.',
    label: 'Nhắc lịch họp',
    icon: 'event',
  },
  DEFENSE_SCHEDULED: {
    title: 'Đồ án đã có lịch bảo vệ',
    content: 'Lịch bảo vệ của đồ án đã được tạo. Hãy kiểm tra thời gian và thông tin của buổi bảo vệ.',
    label: 'Lịch bảo vệ',
    icon: 'school',
  },
  DEFENSE_CANCELLED: {
    title: 'Lịch bảo vệ đã được hủy',
    content: 'Một lịch bảo vệ đã được hủy. Hãy kiểm tra lịch hiện tại trước khi chuẩn bị tham dự.',
    label: 'Lịch bảo vệ',
    icon: 'event_busy',
  },
  MEETING_ACTION_ASSIGNED: {
    title: 'Bạn được giao việc sau cuộc họp',
    content: 'Một việc sau cuộc họp đã được giao cho bạn. Hãy kiểm tra nội dung và thời hạn trong hồ sơ cuộc họp.',
    label: 'Công việc sau cuộc họp',
    icon: 'assignment',
  },
  INDUSTRY_INVITATION: {
    title: 'Bạn nhận được lời mời tham gia với vai trò chuyên gia',
    content: 'Có lời mời tham gia tư vấn chuyên môn. Hãy kiểm tra thông tin lời mời và hướng dẫn đăng ký được gửi cho bạn.',
    label: 'Lời mời chuyên gia',
    icon: 'work',
  },
  APPEAL_REQUESTED: {
    title: 'Có yêu cầu phúc khảo mới',
    content: 'Một yêu cầu phúc khảo đã được gửi. Hãy kiểm tra hồ sơ trong phạm vi được cấp quyền.',
    label: 'Yêu cầu phúc khảo',
    icon: 'rate_review',
  },
  APPEAL_REVIEWER_ASSIGNED: {
    title: 'Bạn được phân công xem xét phúc khảo',
    content: 'Có phân công xem xét yêu cầu phúc khảo. Hãy kiểm tra phạm vi và nội dung của hồ sơ được giao.',
    label: 'Phân công phúc khảo',
    icon: 'assignment_ind',
  },
  APPEAL_REVIEWED: {
    title: 'Yêu cầu phúc khảo đã có nhận xét',
    content: 'Việc xem xét yêu cầu phúc khảo đã có cập nhật. Hãy kiểm tra nhận xét trong hồ sơ được cấp quyền.',
    label: 'Xem xét phúc khảo',
    icon: 'rate_review',
  },
  APPEAL_DECIDED: {
    title: 'Đã có quyết định về yêu cầu phúc khảo',
    content: 'Quyết định về yêu cầu phúc khảo đã được ghi nhận. Hãy xem hồ sơ để biết nội dung và phiên bản kết quả liên quan.',
    label: 'Quyết định phúc khảo',
    icon: 'gavel',
  },
  REVIEW_GATE_UPDATED: {
    title: 'Hồ sơ thẩm định tiến trình có cập nhật',
    content: 'Hồ sơ thẩm định tiến trình đã có thay đổi. Hãy kiểm tra minh chứng, phản hồi và trạng thái hiện tại.',
    label: 'Thẩm định tiến trình',
    icon: 'fact_check',
  },
  PROJECT_RISK_MEDIUM: {
    title: 'Rủi ro tiến độ ở mức trung bình',
    content: 'Đồ án đang có tín hiệu rủi ro mức trung bình. Hãy kiểm tra công việc quá hạn, phần việc bị vướng và báo cáo gần nhất.',
    label: 'Cảnh báo tiến độ',
    icon: 'warning',
  },
  PROJECT_RISK_HIGH: {
    title: 'Đồ án cần được chú ý',
    content: 'Đồ án đang có tín hiệu rủi ro cao. Nhóm nên rà soát tiến độ và trao đổi sớm với giảng viên hướng dẫn.',
    label: 'Cảnh báo tiến độ',
    icon: 'warning',
  },
  SUPERVISOR_FEEDBACK_ADDED: {
    title: 'Giảng viên đã gửi nhận xét',
    content: 'Giảng viên hướng dẫn vừa bổ sung phản hồi cho nội dung thực hiện của nhóm.',
    label: 'Nhận xét mới',
    icon: 'rate_review',
  },
  PROJECT_UPDATED: {
    title: 'Hồ sơ đồ án vừa được cập nhật',
    content: 'Thông tin hoặc trạng thái của đồ án đã thay đổi. Hãy mở hồ sơ để kiểm tra nội dung mới.',
    label: 'Cập nhật đồ án',
    icon: 'folder_open',
  },
  MEETING_SCHEDULED: {
    title: 'Có lịch họp mới',
    content: 'Một cuộc họp mới đã được lên lịch. Hãy kiểm tra thời gian và nội dung chuẩn bị.',
    label: 'Lịch họp',
    icon: 'event',
  },
  DELIVERABLE_FEEDBACK_ADDED: {
    title: 'Hạng mục đã có phản hồi',
    content: 'Giảng viên vừa gửi nhận xét cho một phiên bản đã nộp.',
    label: 'Phản hồi hạng mục',
    icon: 'inventory_2',
  },
  REVIEW_POLICY_PUBLISHED: {
    title: 'Chính sách thẩm định tiến trình đã ban hành',
    content: 'Chính sách và các đợt thẩm định tiến trình của kỳ đồ án đã được công bố chính thức.',
    label: 'Chính sách tiến trình',
    icon: 'policy',
  },
  REVIEW_DEADLINE_APPROACHING: {
    title: 'Sắp đến hạn nộp hồ sơ thẩm định',
    content: 'Đợt thẩm định sắp đóng nhận minh chứng. Nhóm vui lòng kiểm tra và hoàn thiện hồ sơ đúng hạn.',
    label: 'Nhắc nhở hạn nộp',
    icon: 'alarm',
  },
  GATE_REVIEW_ASSIGNED: {
    title: 'Có phân công thẩm định tiến trình mới',
    content: 'Bạn đã được phân công thẩm định minh chứng cho đồ án trong đợt thẩm định hiện tại.',
    label: 'Phân công thẩm định',
    icon: 'assignment_ind',
  },
  GATE_REVIEW_SUBMITTED: {
    title: 'Đồ án đã nộp hồ sơ thẩm định',
    content: 'Trưởng nhóm đã nộp trọn bộ minh chứng học thuật cho đợt thẩm định. Mời hội đồng tiến hành xem xét.',
    label: 'Hồ sơ thẩm định mới',
    icon: 'task',
  },
  GATE_REVISION_SUBMITTED: {
    title: 'Bản sửa đổi minh chứng mới đã nộp',
    content: 'Sinh viên đã cập nhật phiên bản minh chứng mới theo yêu cầu chỉnh sửa của giảng viên thẩm định.',
    label: 'Bản sửa đổi mới',
    icon: 'update',
  },
  GATE_REVISION_REQUIRED: {
    title: 'Hồ sơ thẩm định cần chỉnh sửa',
    content: 'Giảng viên thẩm định yêu cầu chỉnh sửa hoặc bổ sung minh chứng trước khi xét duyệt đạt đợt thẩm định.',
    label: 'Yêu cầu sửa đổi',
    icon: 'error_outline',
  },
  EVIDENCE_VERIFIED: {
    title: 'Minh chứng đã được xác minh',
    content: 'Giảng viên thẩm định đã ghi nhận kết quả xác minh cho một tài liệu minh chứng của nhóm.',
    label: 'Xác minh minh chứng',
    icon: 'verified',
  },
  GATE_DECISION_RECORDED: {
    title: 'Có quyết định thẩm định tiến trình',
    content: 'Quyết định thẩm định chính thức đã được công bố. Mời mở hồ sơ tiến trình để xem chi tiết.',
    label: 'Kết quả thẩm định',
    icon: 'gavel',
  },
  DISCIPLINE_REVIEW_PENDING: {
    title: 'Đồ án liên ngành cần xác nhận chuyên môn',
    content: 'Một đồ án liên ngành đang chờ bộ môn của bạn xác nhận minh chứng thuộc phạm vi ngành phụ trách.',
    label: 'Thẩm định liên ngành',
    icon: 'hub',
  },
  DISCIPLINE_DECISION_RECORDED: {
    title: 'Đã có quyết định ngành cho đồ án liên ngành',
    content: 'Bộ môn liên ngành đã hoàn tất thẩm định phạm vi chuyên môn của đợt thẩm định.',
    label: 'Quyết định liên ngành',
    icon: 'diversity_3',
  },
  DEFENSE_READINESS_CHANGED: {
    title: 'Cập nhật điều kiện tham gia bảo vệ',
    content: 'Trạng thái xét điều kiện bảo vệ của đồ án đã có sự thay đổi.',
    label: 'Điều kiện bảo vệ',
    icon: 'school',
  },
}

export function notificationCopy(item: NotificationItem) {
  // The current DTO has no structured name parameters; backend prose is not display copy.
  if (Object.hasOwn(copyByType, item.notificationType)) return copyByType[item.notificationType]

  const type = /^[A-Z][A-Z0-9_]{0,79}$/.test(item.notificationType) ? item.notificationType : 'INVALID_NOTIFICATION_TYPE'
  console.warn('[notifications] Unsupported notification type:', type)
  return {
    title: 'Có cập nhật mới trên hệ thống',
    content: 'Hãy kiểm tra thông tin mới trong phạm vi bạn được cấp quyền.',
    label: 'Thông báo hệ thống',
    icon: 'notifications',
  }
}

export function notificationTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Thời gian chưa xác định'
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}
