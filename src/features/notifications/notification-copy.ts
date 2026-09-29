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
