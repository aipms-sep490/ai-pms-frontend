import type { NotificationItem } from './notifications-api'

const copyByType: Record<string, { title: string; content: string; label: string; icon: string }> = {
  // --- Team Invitation Types (UX-03, UC-104, UC-106) ---
  TEAM_INVITATION_SENT: {
    title: 'Bạn nhận được lời mời tham gia nhóm',
    content: 'Nhóm sinh viên đã gửi lời mời bạn tham gia nhóm đồ án. Hãy kiểm tra và phản hồi lời mời.',
    label: 'Lời mời nhóm',
    icon: 'group_add',
  },
  TEAM_INVITATION_ACCEPTED: {
    title: 'Lời mời tham gia nhóm đã được chấp nhận',
    content: 'Sinh viên đã đồng ý tham gia nhóm đồ án của bạn.',
    label: 'Lời mời nhóm',
    icon: 'how_to_reg',
  },
  TEAM_INVITATION_REJECTED: {
    title: 'Lời mời tham gia nhóm bị từ chối',
    content: 'Sinh viên đã từ chối lời mời tham gia nhóm đồ án.',
    label: 'Lời mời nhóm',
    icon: 'person_remove',
  },
  TEAM_INVITATION_CANCELLED: {
    title: 'Lời mời tham gia nhóm đã bị hủy',
    content: 'Lời mời tham gia nhóm đồ án đã được thu hồi hoặc hủy bỏ.',
    label: 'Lời mời nhóm',
    icon: 'cancel',
  },

  // --- Supervisor Request & Assignment Types ---
  SUPERVISOR_REQUEST_SENT: {
    title: 'Bạn nhận được yêu cầu hướng dẫn đồ án',
    content: 'Một nhóm sinh viên đã gửi yêu cầu mời bạn làm giảng viên hướng dẫn cho đề tài.',
    label: 'Yêu cầu hướng dẫn',
    icon: 'assignment_ind',
  },
  SUPERVISOR_REQUEST_ACCEPTED: {
    title: 'Yêu cầu hướng dẫn đồ án đã được chấp nhận',
    content: 'Giảng viên đã đồng ý hướng dẫn đồ án của nhóm bạn.',
    label: 'Hướng dẫn đồ án',
    icon: 'verified',
  },
  SUPERVISOR_REQUEST_REJECTED: {
    title: 'Yêu cầu hướng dẫn đồ án bị từ chối',
    content: 'Giảng viên đã từ chối yêu cầu hướng dẫn đồ án của nhóm.',
    label: 'Hướng dẫn đồ án',
    icon: 'person_off',
  },
  SUPERVISOR_REQUEST_CANCELLED: {
    title: 'Yêu cầu hướng dẫn đồ án đã bị hủy',
    content: 'Yêu cầu mời giảng viên hướng dẫn đồ án đã được thu hồi.',
    label: 'Hướng dẫn đồ án',
    icon: 'cancel',
  },
  SUPERVISOR_REPLACED: {
    title: 'Thay đổi giảng viên hướng dẫn đồ án',
    content: 'Phân công giảng viên hướng dẫn cho đồ án của bạn đã được cập nhật thay thế.',
    label: 'Phân công GVHD',
    icon: 'sync_alt',
  },

  // --- Team Leader Change Request Types ---
  TEAM_LEADER_CHANGE_REQUESTED: {
    title: 'Có yêu cầu thay đổi trưởng nhóm',
    content: 'Một yêu cầu chuyển giao vai trò trưởng nhóm đã được gửi và đang chờ xem xét.',
    label: 'Trưởng nhóm',
    icon: 'manage_accounts',
  },
  TEAM_LEADER_CHANGE_APPROVED: {
    title: 'Yêu cầu đổi trưởng nhóm đã được phê duyệt',
    content: 'Việc chuyển giao vai trò trưởng nhóm đồ án đã hoàn tất thành công.',
    label: 'Trưởng nhóm',
    icon: 'check_circle',
  },
  TEAM_LEADER_CHANGE_REJECTED: {
    title: 'Yêu cầu đổi trưởng nhóm bị từ chối',
    content: 'Yêu cầu chuyển giao vai trò trưởng nhóm đồ án không được chấp thuận.',
    label: 'Trưởng nhóm',
    icon: 'cancel',
  },

  // --- Project Proposal & Evaluation Types ---
  PROJECT_APPROVED: {
    title: 'Đề cương đồ án đã được phê duyệt',
    content: 'Đề cương đồ án của nhóm đã được hội đồng chuyên môn thông qua chính thức.',
    label: 'Phê duyệt đề cương',
    icon: 'task_alt',
  },
  PROJECT_REJECTED: {
    title: 'Đề cương đồ án không được thông qua',
    content: 'Đề cương đồ án chưa đạt yêu cầu phê duyệt của bộ môn.',
    label: 'Từ chối đề cương',
    icon: 'highlight_off',
  },
  PROJECT_REVISION_REQUESTED: {
    title: 'Đề cương đồ án cần chỉnh sửa',
    content: 'Hội đồng yêu cầu nhóm chỉnh sửa và bổ sung đề cương đồ án trước khi xét duyệt lại.',
    label: 'Yêu cầu chỉnh sửa',
    icon: 'edit_note',
  },
  FINAL_SUBMISSION_LOCKED: {
    title: 'Đồ án đã nộp bản hoàn thiện cuối kỳ',
    content: 'Gói nộp bản hoàn thiện cuối kỳ của đồ án đã được gửi và khóa để phục vụ chấm điểm.',
    label: 'Nộp bản cuối',
    icon: 'lock',
  },
  EVALUATION_FINALIZED: {
    title: 'Cán bộ chấm điểm đã hoàn tất đánh giá',
    content: 'Một thành viên hội đồng đã hoàn tất biểu mẫu đánh giá đồ án.',
    label: 'Đánh giá đồ án',
    icon: 'fact_check',
  },
  EVALUATOR_ASSIGNED: {
    title: 'Bạn được phân công đánh giá đồ án',
    content: 'Bạn đã được phân công chấm điểm / đánh giá một đồ án trong học kỳ hiện tại.',
    label: 'Phân công chấm điểm',
    icon: 'assignment_turned-in',
  },
  PROJECT_RESULT_PUBLISHED: {
    title: 'Kết quả chung cuộc đồ án đã công bố',
    content: 'Điểm số và kết quả chung cuộc của đồ án đã được công bố chính thức.',
    label: 'Kết quả đồ án',
    icon: 'military_tech',
  },
  STUDENT_RESULT_PUBLISHED: {
    title: 'Kết quả đánh giá cá nhân đã công bố',
    content: 'Điểm số và đánh giá cá nhân của bạn trong đồ án đã được công bố.',
    label: 'Kết quả cá nhân',
    icon: 'grade',
  },
  PROGRESS_REPORT_SUBMITTED: {
    title: 'Báo cáo tiến độ đồ án đã được nộp',
    content: 'Nhóm sinh viên đã nộp báo cáo tiến độ định kỳ. Mời giảng viên kiểm tra và cho ý kiến.',
    label: 'Báo cáo tiến độ',
    icon: 'assignment',
  },

  // --- Scheduled Deadline Reminders ---
  TASK_DEADLINE_REMINDER: {
    title: 'Công việc sắp đến hạn hoàn thành',
    content: 'Một công việc trong đồ án của bạn sắp đến thời hạn hoàn thành.',
    label: 'Nhắc nhở công việc',
    icon: 'schedule',
  },
  TASK_OVERDUE: {
    title: 'Công việc đã quá thời hạn',
    content: 'Một công việc trong đồ án đã quá hạn quy định. Hãy rà soát và cập nhật tiến độ.',
    label: 'Công việc quá hạn',
    icon: 'warning',
  },
  DELIVERABLE_DEADLINE_REMINDER: {
    title: 'Sản phẩm bàn giao sắp đến hạn nộp',
    content: 'Hạng mục bàn giao của đồ án sắp đến hạn nộp. Hãy kiểm tra và hoàn tất tải lên.',
    label: 'Nhắc nhở bàn giao',
    icon: 'alarm',
  },
  DELIVERABLE_OVERDUE: {
    title: 'Sản phẩm bàn giao đã quá hạn nộp',
    content: 'Hạng mục bàn giao của đồ án đã quá thời hạn quy định.',
    label: 'Bàn giao quá hạn',
    icon: 'error',
  },
  FINAL_SUBMISSION_DEADLINE_REMINDER: {
    title: 'Sắp đến hạn nộp bản hoàn thiện cuối kỳ',
    content: 'Thời hạn nộp bản hoàn thiện cuối kỳ của đồ án sắp kết thúc. Nhóm vui lòng nộp đúng hạn.',
    label: 'Nhắc nộp bản cuối',
    icon: 'notification_important',
  },
  FINAL_SUBMISSION_OVERDUE: {
    title: 'Đã quá hạn nộp bản hoàn thiện cuối kỳ',
    content: 'Thời hạn nộp bản hoàn thiện cuối kỳ của đồ án đã kết thúc.',
    label: 'Nộp bản cuối quá hạn',
    icon: 'error',
  },

  // --- Existing Progress, Meeting, and Review Gate Types ---
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
    title: 'Chính sách Review Gate đã ban hành',
    content: 'Chính sách và các đợt thẩm định tiến trình (Review Gates) của kỳ đồ án đã được công bố chính thức.',
    label: 'Chính sách tiến trình',
    icon: 'policy',
  },
  REVIEW_DEADLINE_APPROACHING: {
    title: 'Sắp đến hạn nộp hồ sơ thẩm định',
    content: 'Đợt Review Gate sắp đóng nhận minh chứng. Nhóm vui lòng kiểm tra và hoàn thiện hồ sơ đúng hạn.',
    label: 'Nhắc nhở hạn nộp',
    icon: 'alarm',
  },
  GATE_REVIEW_ASSIGNED: {
    title: 'Phân công thẩm định Review Gate mới',
    content: 'Bạn đã được phân công thẩm định minh chứng cho đồ án trong đợt Review Gate hiện tại.',
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
    content: 'Giảng viên thẩm định yêu cầu chỉnh sửa hoặc bổ sung minh chứng trước khi xét duyệt đạt Gate.',
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
    title: 'Có quyết định thẩm định Review Gate',
    content: 'Quyết định thẩm định chính thức cho đợt Review Gate đã được công bố. Mời mở timeline để xem chi tiết.',
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
    content: 'Bộ môn liên ngành đã hoàn tất thẩm định phạm vi chuyên môn của đợt Gate.',
    label: 'Quyết định liên ngành',
    icon: 'diversity_3',
  },
  DEFENSE_READINESS_CHANGED: {
    title: 'Cập nhật điều kiện tham gia bảo vệ',
    content: 'Trạng thái xét điều kiện bảo vệ (Defense Readiness) của đồ án đã có sự thay đổi.',
    label: 'Điều kiện bảo vệ',
    icon: 'school',
  },
}

export function notificationCopy(item: NotificationItem) {
  const known = copyByType[item.notificationType]
  const isEnglish = /^[A-Za-z0-9\s.,'-]+$/.test(item.title.trim())

  if (known) {
    return {
      title: isEnglish ? known.title : item.title,
      content: isEnglish ? known.content : item.content,
      label: known.label,
      icon: known.icon,
    }
  }

  // Fallback for unmapped / unexpected notification types:
  // Must be neutral Vietnamese, NEVER expose raw English item.title to users
  if (typeof console !== 'undefined' && console.warn) {
    console.warn(`[Notification] Unmapped notification type: ${item.notificationType}`)
  }

  return {
    title: isEnglish ? 'Thông báo từ hệ thống' : item.title,
    content: isEnglish ? 'Bạn có thông báo mới từ hệ thống quản lý đồ án.' : item.content,
    label: 'Thông báo hệ thống',
    icon: 'notifications',
  }
}

export function notificationTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Thời gian chưa xác định'
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}
