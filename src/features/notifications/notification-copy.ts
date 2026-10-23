import type { NotificationItem } from './notifications-api'

const copyByType: Record<string, { title: string; content: string; label: string; icon: string }> = {
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
  const stockMessage = /^(Project progress risk is (medium|high)\.?|Your supervisor added feedback to project work\.?|A new meeting has been scheduled\.?)$/i
  if (known && stockMessage.test(item.title.trim())) return { ...known, content: stockMessage.test(item.content.trim()) ? known.content : item.content }
  return {
    title: item.title,
    content: item.content,
    label: known?.label ?? 'Thông báo hệ thống',
    icon: known?.icon ?? 'notifications',
  }
}

export function notificationTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Thời gian chưa xác định'
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}
