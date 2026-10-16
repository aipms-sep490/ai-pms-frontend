import { useContext } from 'react'
import { Link } from 'react-router-dom'
import { AuthSessionContext } from '../auth/context/auth-session-context'
import { env } from '../../app/config/env'
import type { NotificationItem } from './notifications-api'
import { notificationCopy, notificationTime } from './notification-copy'
import './notifications.css'

export function NotificationRow({ item, busy, onRead, compact = false }: { item: NotificationItem; busy: boolean; onRead: () => void; compact?: boolean }) {
  const copy = notificationCopy(item)
  const auth = useContext(AuthSessionContext)
  const roles = auth?.session?.user.roles ?? []
  const appealProject = env.resultCorrectionEnabled && item.notificationType.startsWith('APPEAL_') && item.relatedEntityType === 'PROJECT' && Number.isSafeInteger(item.relatedEntityId) && (item.relatedEntityId ?? 0) > 0
  const appealLink = appealProject ? roles.includes('STUDENT') ? '/project/result' : roles.some(role => role === 'DEPARTMENT_STAFF' || role === 'LECTURER') ? '/review/projects/' + item.relatedEntityId + '/corrections' : null : null

  let actionLink: { url: string; label: string } | null = null
  if (appealLink) {
    actionLink = { url: appealLink, label: 'Xem yêu cầu phúc khảo' }
  } else if (
    item.notificationType.startsWith('GATE_') ||
    item.notificationType.startsWith('REVIEW_') ||
    item.notificationType.startsWith('DISCIPLINE_') ||
    item.notificationType === 'EVIDENCE_VERIFIED' ||
    item.notificationType === 'DEFENSE_READINESS_CHANGED'
  ) {
    if (roles.includes('STUDENT')) {
      actionLink = { url: '/project/timeline', label: 'Mở tiến trình Review Gate' }
    } else if (roles.includes('LECTURER') && (item.notificationType.includes('ASSIGNED') || item.notificationType.includes('SUBMITTED'))) {
      actionLink = { url: '/review/gate-assignments', label: 'Mở hàng đợi thẩm định' }
    } else if (roles.includes('LECTURER')) {
      actionLink = { url: '/supervision/my-projects', label: 'Mở đồ án theo dõi' }
    } else if (roles.includes('DEPARTMENT_STAFF') || roles.includes('ADMIN')) {
      actionLink = { url: '/department/projects/progress-matrix', label: 'Mở ma trận tiến trình' }
    }
  }

  return <li className={`notification-row ${item.isRead ? '' : 'notification-row--unread'} ${compact ? 'notification-row--compact' : ''}`}>
    <span className={`notification-icon ${copy.icon === 'warning' ? 'notification-icon--warning' : ''} material-symbols-outlined`} aria-hidden="true">{copy.icon}</span>
    <div className="notification-body">
      <div className="notification-meta"><span>{copy.label}</span>{!item.isRead && <span className="notification-unread">Chưa đọc</span>}</div>
      <h2>{copy.title}</h2>
      {copy.content && copy.content.trim() !== copy.title.trim() && <p className="notification-content">{copy.content}</p>}
      <div className="notification-bottom">
        {actionLink && <Link className="notification-read" to={actionLink.url}>{actionLink.label}</Link>}
        <time dateTime={item.createdAt}>{notificationTime(item.createdAt)}</time>
        {!item.isRead && <button type="button" className="notification-read" disabled={busy} onClick={onRead}>Đánh dấu đã đọc</button>}
      </div>
    </div>
  </li>
}

export function NotificationEmpty({ unread = false }: { unread?: boolean }) {
  return <div className="notification-empty"><span className="material-symbols-outlined" aria-hidden="true">{unread ? 'done_all' : 'notifications_none'}</span><h2>{unread ? 'Bạn đã xem hết thông báo' : 'Chưa có thông báo'}</h2><p>{unread ? 'Các thông báo đã đọc vẫn nằm trong mục Tất cả.' : 'Lịch họp, nhận xét và cập nhật đồ án sẽ xuất hiện tại đây.'}</p></div>
}

export function NotificationLoading() {
  return <div className="notification-loading" role="status"><span className="material-symbols-outlined" aria-hidden="true">hourglass_top</span>Đang tải thông báo…</div>
}
