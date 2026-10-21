import type { BadgeTone } from '../../components/ui/status-badge-tone'
import type { ActionAggregatorItem, ActionAggregatorKind } from './action-aggregators-api'
import type { AttentionItem } from './calendar-types'

const kinds: Record<ActionAggregatorKind, { label: string; icon: string }> = {
  TASK: { label: 'Công việc', icon: 'checklist' },
  REVIEW_GATE: { label: 'Cổng thẩm định', icon: 'flag_circle' },
  PROGRESS_REPORT: { label: 'Báo cáo tiến độ', icon: 'assignment' },
  PROGRESS_REVIEW: { label: 'Phản hồi báo cáo', icon: 'rate_review' },
  MEETING_SIGN_OFF: { label: 'Xác nhận biên bản', icon: 'event_note' },
  REVIEWER_ASSIGNMENT: { label: 'Phân công thẩm định', icon: 'assignment_ind' },
  SUPERVISOR_REQUEST: { label: 'Đề nghị hướng dẫn', icon: 'school' },
  APPEAL: { label: 'Phúc khảo', icon: 'feedback' },
}

/** A leading slash alone is insufficient: //host and /\\host are external navigations. */
export function safeInternalDeepLink(link: string | null | undefined): string | null {
  if (!link?.startsWith('/') || link.startsWith('//')) return null
  try {
    const decoded = decodeURIComponent(link)
    const hasControl = [...decoded].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
    if (decoded.startsWith('//') || decoded.includes('\\') || /\s/.test(decoded) || hasControl) return null
    return new URL(link, 'https://ai-pms.invalid').origin === 'https://ai-pms.invalid' ? link : null
  } catch { return null }
}

export function aggregatorAttention(item: ActionAggregatorItem): AttentionItem {
  const meta = Object.hasOwn(kinds, item.kind) ? kinds[item.kind as ActionAggregatorKind] : null
  const tone: BadgeTone = meta ? item.severity === 'HIGH' ? 'warning' : 'neutral' : 'neutral'
  return {
    code: item.kind, source: 'PROJECT', sourceId: item.id, title: item.title,
    description: meta?.label ?? `Mục cần chú ý (${item.kind || 'chưa xác định'})`,
    icon: meta?.icon ?? 'info', tone, severity: item.severity,
    dueAt: item.dueAt ?? undefined, status: item.status,
    presentationPriority: item.severity === 'HIGH' ? 10 : 20,
    deepLink: safeInternalDeepLink(item.deepLink),
  }
}
