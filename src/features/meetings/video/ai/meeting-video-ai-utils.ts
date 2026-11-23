import { HttpError } from '../../../../services/http/http-client'
import type {
  MeetingAiInsight,
  MeetingSpeakerStat,
  MeetingTranscriptSegment,
} from './meeting-video-ai.types'

const vietnamClockFormatter = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

const vietnamDateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export function formatVietnamClock(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '--:--:--'
  return vietnamClockFormatter.format(date)
}

export function formatVietnamDateTime(iso: string | null | undefined): string {
  if (!iso) return 'Chưa xác định'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Chưa xác định'
  return vietnamDateTimeFormatter.format(date)
}

export function speakerInitials(name: string): string {
  const cleaned = name.replace(/\s*\([^)]*\)\s*/g, ' ').trim()
  const parts = (cleaned || name.trim()).split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'TV'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
}

export function meetingAiError(reason: unknown): string {
  if (reason instanceof HttpError) {
    const code = reason.problem?.code
    if (code === 'MEETING_AI_SCHEMA_NOT_READY') {
      return 'Bảng dữ liệu Trợ lý AI Cuộc họp chưa được tạo trên cơ sở dữ liệu. Hãy chạy script migration 20261122_add_meeting_video_ai.sql.'
    }
    if (code === 'MEETING_TRANSCRIPT_EMPTY') {
      return 'Cuộc họp chưa có nội dung lời nói, agenda hoặc ghi chú để AI phân tích. Hãy bật Phụ đề AI (Live) hoặc thêm ghi chú lời nói trước.'
    }
    if (code === 'AI_UNAVAILABLE') {
      return 'Dịch vụ Trợ lý AI hiện chưa được bật hoặc tạm thời không khả dụng.'
    }
    if (code === 'AUDIO_STT_NOT_CONFIGURED') {
      return 'Nhận diện âm thanh máy chủ chưa cấu hình. Bạn hãy dùng chế độ Phụ đề AI trực tiếp trên trình duyệt (Chrome/Edge).'
    }
    if (reason.problem?.detail) return reason.problem.detail
    if (reason.status === 403) return 'Bạn không có quyền sử dụng thao tác này trong cuộc họp.'
    if (reason.status === 409) return 'Trạng thái cuộc họp không cho phép thực hiện thao tác này.'
    if (reason.status === 503) return 'Dịch vụ AI tạm thời quá tải hoặc chưa sẵn sàng. Vui lòng thử lại sau.'
    return reason.message || 'Không thể xử lý yêu cầu AI lúc này.'
  }
  if (reason instanceof Error && reason.message) return reason.message
  return 'Không thể kết nối tới Trợ lý AI cuộc họp. Hãy kiểm tra mạng và thử lại.'
}

export function priorityLabel(priority: string): string {
  switch (priority.toUpperCase()) {
    case 'CRITICAL':
      return 'Khẩn cấp'
    case 'HIGH':
      return 'Cao'
    case 'LOW':
      return 'Thấp'
    default:
      return 'Trung bình'
  }
}

export function agendaStatusLabel(status: string): { text: string; tone: 'success' | 'warning' | 'danger' } {
  switch (status.toUpperCase()) {
    case 'COVERED':
      return { text: 'Đã bàn đủ', tone: 'success' }
    case 'MISSED':
      return { text: 'Chưa bàn', tone: 'danger' }
    default:
      return { text: 'Bàn một phần', tone: 'warning' }
  }
}

export function severityLabel(severity: string): string {
  switch (severity.toUpperCase()) {
    case 'HIGH':
      return 'Quan trọng'
    case 'LOW':
      return 'Thông tin'
    default:
      return 'Cần lưu ý'
  }
}

export function computeLocalSpeakerStats(segments: MeetingTranscriptSegment[]): MeetingSpeakerStat[] {
  if (segments.length === 0) return []
  const map = new Map<string, { speakerUserId: number | null; speakerName: string; segmentCount: number; wordCount: number; highlightCount: number }>()
  for (const seg of segments) {
    const key = seg.speakerUserId ? `u:${seg.speakerUserId}` : `n:${seg.speakerName.toLowerCase()}`
    const words = seg.content.trim().split(/\s+/).filter(Boolean).length
    const prev = map.get(key)
    if (prev) {
      prev.segmentCount += 1
      prev.wordCount += words
      prev.highlightCount += seg.isHighlighted ? 1 : 0
    } else {
      map.set(key, {
        speakerUserId: seg.speakerUserId,
        speakerName: seg.speakerName,
        segmentCount: 1,
        wordCount: words,
        highlightCount: seg.isHighlighted ? 1 : 0,
      })
    }
  }
  const items = [...map.values()]
  const totalWords = Math.max(1, items.reduce((sum, item) => sum + item.wordCount, 0))
  return items
    .sort((a, b) => b.wordCount - a.wordCount || b.segmentCount - a.segmentCount)
    .map((item) => ({
      ...item,
      sharePercent: Math.round((item.wordCount * 1000) / totalWords) / 10,
    }))
}

export function buildTranscriptMarkdown(
  meetingTitle: string,
  segments: MeetingTranscriptSegment[],
  insight: MeetingAiInsight | null,
): string {
  const lines: string[] = [`# Bản ghi & Phân tích AI — ${meetingTitle}`, '']
  if (insight) {
    lines.push('## Tóm tắt AI', '', insight.formattedMinutes || insight.executiveSummary, '')
  }
  lines.push(`## Chi tiết lời nói (${segments.length} lượt)`, '')
  for (const seg of segments) {
    const star = seg.isHighlighted ? ' [★ Quan trọng]' : ''
    lines.push(`- **[${formatVietnamClock(seg.spokenAt)}] ${seg.speakerName}**${star}: ${seg.content}`)
  }
  return lines.join('\n')
}

export function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
