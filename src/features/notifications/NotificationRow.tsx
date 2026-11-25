import { useContext, useRef, type MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthSessionContext } from '../auth/context/auth-session-context'
import type { NotificationItem } from './notifications-api'
import { notificationCopy, notificationTime } from './notification-copy'
import { resolveNotificationLink } from './notification-link-resolver'
import './notifications.css'

type NotificationTone = 'meeting' | 'evaluation' | 'warning' | 'success' | 'project'

function toneForNotification(item: NotificationItem, icon: string): NotificationTone {
  const key = `${item.notificationType} ${item.relatedEntityType ?? ''}`.toUpperCase()
  if (icon === 'warning' || /REJECT|CANCEL|OVERDUE|RISK|BLOCK|CONFLICT|FAIL|REVOKE/.test(key)) return 'warning'
  if (/APPROV|ACCEPT|PASS|COMPLETE|PUBLISH|VERIF/.test(key)) return 'success'
  if (/MEETING|SCHEDULE|CALL|ROOM/.test(key)) return 'meeting'
  if (/EVALUATION|RUBRIC|GATE|REVIEW|APPEAL|DEFENSE|RESULT|SCORE|COLD|REPORT/.test(key)) return 'evaluation'
  return 'project'
}

export function notificationRelativeTime(iso: string): string {
  const timestamp = Date.parse(iso)
  if (Number.isNaN(timestamp)) return notificationTime(iso)
  const diffSec = Math.floor((Date.now() - timestamp) / 1000)
  if (diffSec < 0) return notificationTime(iso)
  if (diffSec < 60) return 'Vừa xong'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} phút trước`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour} giờ trước`
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay === 1) return 'Hôm qua'
  if (diffDay < 7) return `${diffDay} ngày trước`
  return notificationTime(iso)
}

interface ParsedNotificationBody {
  lead: string
  bullets: string[]
  compactText: string
}

function parseNotificationBody(raw: string): ParsedNotificationBody {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^•?\s*Tham gia:\s*Nhấn\s*"?Xem cuộc họp"?/i.test(line))

  if (lines.length <= 1) {
    const single = lines[0]?.replace(/^[•-]\s*/, '') ?? ''
    return { lead: single, bullets: [], compactText: single }
  }

  const leadParts: string[] = []
  const bullets: string[] = []
  for (const line of lines) {
    if (/^[•-]\s*/.test(line)) {
      bullets.push(line.replace(/^[•-]\s*/, '').trim())
    } else if (bullets.length === 0) {
      leadParts.push(line)
    } else {
      bullets.push(line)
    }
  }

  const lead = leadParts.join(' ').trim()
  const compactParts = [lead, ...bullets.slice(0, 2)].filter(Boolean)
  return {
    lead,
    bullets,
    compactText: compactParts.join(' · '),
  }
}

export function NotificationRow({
  item,
  busy,
  onRead,
  onNavigate,
  compact = false,
  headingLevel = 'h2',
}: {
  item: NotificationItem
  busy: boolean
  onRead: () => void | Promise<void>
  onNavigate?: () => void
  compact?: boolean
  headingLevel?: 'h2' | 'h3'
}) {
  const copy = notificationCopy(item)
  const tone = toneForNotification(item, copy.icon)
  const auth = useContext(AuthSessionContext)
  const roles = auth?.session?.user.roles ?? []
  const actionLink = resolveNotificationLink(item, roles)
  const navigate = useNavigate()
  const opening = useRef(false)

  const read = async () => {
    try {
      await onRead()
    } catch {
      console.warn('[notifications] Could not mark notification as read.')
    }
  }

  const open = async (event: MouseEvent<HTMLAnchorElement>) => {
    if (!actionLink) return
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      if (!item.isRead) void read()
      return
    }
    event.preventDefault()
    if (opening.current) return
    opening.current = true
    if (!item.isRead) await read()
    onNavigate?.()
    navigate(actionLink.url)
    opening.current = false
  }

  const hasContent = Boolean(copy.content && copy.content.trim() !== copy.title.trim())
  const parsed = hasContent ? parseNotificationBody(copy.content) : null
  const fullTimestamp = notificationTime(item.createdAt)
  const displayTimestamp = notificationRelativeTime(item.createdAt)

  return (
    <li className={`notification-row ${item.isRead ? 'notification-row--read' : 'notification-row--unread'} ${compact ? 'notification-row--compact' : ''}`}>
      <span className={`notification-icon notification-icon--${tone} material-symbols-outlined`} aria-hidden="true">
        {copy.icon}
      </span>

      <div className="notification-body">
        <div className="notification-meta">
          <span
            aria-label={`Loại thông báo: ${copy.label}`}
            className={`notification-type-chip notification-type-chip--${tone}`}
          >
            <span>{copy.label}</span>
          </span>
          <div className="notification-meta-right">
            <time dateTime={item.createdAt} title={fullTimestamp} className="notification-time">
              {displayTimestamp}
            </time>
            {!item.isRead && (
              <span className="notification-unread-dot" title="Chưa đọc" aria-label="Chưa đọc" />
            )}
          </div>
        </div>

        {headingLevel === 'h3' ? (
          <h3 className="notification-title">{copy.title}</h3>
        ) : (
          <h2 className="notification-title">{copy.title}</h2>
        )}

        {parsed && (
          compact ? (
            <p className="notification-content notification-content--compact" title={parsed.compactText}>
              {parsed.compactText}
            </p>
          ) : (
            <div className="notification-content">
              {parsed.lead && <p className="notification-lead">{parsed.lead}</p>}
              {parsed.bullets.length > 0 && (
                <ul className="notification-meta-list">
                  {parsed.bullets.map((line, index) => (
                    <li key={index}>{line}</li>
                  ))}
                </ul>
              )}
            </div>
          )
        )}

        {(actionLink || !item.isRead) && (
          <div className="notification-bottom">
            {actionLink ? (
              <Link className="notification-link" to={actionLink.url} onClick={open}>
                <span>{actionLink.label}</span>
                <span className="material-symbols-outlined notification-link__arrow" aria-hidden="true">arrow_forward</span>
              </Link>
            ) : <span />}

            {!item.isRead && (
              compact ? (
                <button
                  type="button"
                  className="notification-mark-icon"
                  aria-label="Đánh dấu đã đọc"
                  title="Đánh dấu đã đọc"
                  disabled={busy}
                  onClick={() => void read()}
                >
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">done</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="notification-read"
                  disabled={busy}
                  onClick={() => void read()}
                >
                  <span className="material-symbols-outlined text-[15px]" aria-hidden="true">done</span>
                  <span>Đánh dấu đã đọc</span>
                </button>
              )
            )}
          </div>
        )}
      </div>
    </li>
  )
}

export function NotificationEmpty({ unread = false }: { unread?: boolean }) {
  return (
    <div className="notification-empty">
      <span className="material-symbols-outlined" aria-hidden="true">
        {unread ? 'done_all' : 'notifications_none'}
      </span>
      <h2>{unread ? 'Bạn đã xem hết thông báo' : 'Chưa có thông báo'}</h2>
      <p>
        {unread
          ? 'Các thông báo đã đọc vẫn nằm trong mục Tất cả.'
          : 'Lịch họp, nhận xét và cập nhật đồ án sẽ xuất hiện tại đây.'}
      </p>
    </div>
  )
}

export function NotificationLoading() {
  return (
    <div className="notification-loading-skeleton" role="status" aria-label="Đang tải thông báo">
      {[0, 1, 2].map((i) => (
        <div key={i} className="notification-skeleton-row">
          <span className="notification-skeleton-avatar mk-skeleton" aria-hidden="true" />
          <div className="notification-skeleton-lines">
            <span className="mk-skeleton w-24 h-3 rounded-full" />
            <span className="mk-skeleton w-3/4 h-3.5 rounded" />
            <span className="mk-skeleton w-5/6 h-3 rounded" />
          </div>
        </div>
      ))}
      <span className="sr-only">Đang tải thông báo…</span>
    </div>
  )
}
