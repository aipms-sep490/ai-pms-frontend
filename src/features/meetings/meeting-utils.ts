import { HttpError } from '../../services/http/http-client'
import type { ExecutionAccess } from '../execution/context/ExecutionAccessContext'
import type { MeetingDetail } from './meeting-types'

// FE writes UTC instants. SQL datetime2 drops DateTime.Kind, so zone-less API values are read as UTC.
export function meetingDate(value: string): Date {
  return new Date(/[zZ]$|[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}Z`)
}
export function formatMeetingTime(value: string): string {
  const date = meetingDate(value)
  return Number.isNaN(date.getTime()) ? 'Chưa rõ thời gian' : new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short',
  }).format(date)
}
export function toMeetingInput(value: string | null): string {
  if (!value) return ''
  const date = meetingDate(value)
  if (Number.isNaN(date.getTime())) return ''
  const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date)
  const part = (name: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === name)?.value
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`
}
export function toMeetingUtc(value: string): string {
  return new Date(`${value}:00+07:00`).toISOString()
}
export function safeMeetingUrl(value: string | null): string | null {
  if (!value?.trim()) return null
  try {
    const url = new URL(value.trim())
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null
  } catch { return null }
}
export function canManageMeeting(access: ExecutionAccess, meeting: MeetingDetail): boolean {
  return access.canManageStructure || access.currentUserId === meeting.createdBy
}
export function meetingError(reason: unknown): string {
  if (reason instanceof HttpError) {
    if (reason.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    if (reason.status === 403) return 'Bạn không còn quyền thực hiện thao tác này. Tải lại để kiểm tra phân công hiện tại.'
    if (reason.status === 404) return 'Không tìm thấy cuộc họp hoặc người tham gia. Vui lòng tải lại.'
    if (reason.status === 409) return 'Cuộc họp hoặc danh sách người tham gia đã thay đổi. Tải lại dữ liệu rồi kiểm tra trước khi thao tác tiếp.'
    if (reason.status === 400 || reason.status === 422) return 'Thông tin chưa hợp lệ. Kiểm tra tiêu đề, thời gian, người tham gia và trạng thái đồ án.'
  }
  return 'Không xác nhận được kết quả từ máy chủ. Kiểm tra kết nối và tải lại trước khi thực hiện tiếp.'
}
export function mustRefreshAfterError(reason: unknown): boolean {
  return !(reason instanceof HttpError && [400, 422].includes(reason.status))
}
