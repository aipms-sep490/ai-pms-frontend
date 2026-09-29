import type { NotificationItem } from './notifications-api'
import { notificationCopy, notificationTime } from './notification-copy'
import './notifications.css'

export function NotificationRow({ item, busy, onRead, compact = false }: { item: NotificationItem; busy: boolean; onRead: () => void; compact?: boolean }) {
  const copy = notificationCopy(item)
  return <li className={`notification-row ${item.isRead ? '' : 'notification-row--unread'} ${compact ? 'notification-row--compact' : ''}`}>
    <span className={`notification-icon ${copy.icon === 'warning' ? 'notification-icon--warning' : ''} material-symbols-outlined`} aria-hidden="true">{copy.icon}</span>
    <div className="notification-body">
      <div className="notification-meta"><span>{copy.label}</span>{!item.isRead && <span className="notification-unread">Chưa đọc</span>}</div>
      <h2>{copy.title}</h2>
      {copy.content && copy.content.trim() !== copy.title.trim() && <p className="notification-content">{copy.content}</p>}
      <div className="notification-bottom"><time dateTime={item.createdAt}>{notificationTime(item.createdAt)}</time>{!item.isRead && <button type="button" className="notification-read" disabled={busy} onClick={onRead}>Đánh dấu đã đọc</button>}</div>
    </div>
  </li>
}

export function NotificationEmpty({ unread = false }: { unread?: boolean }) {
  return <div className="notification-empty"><span className="material-symbols-outlined" aria-hidden="true">{unread ? 'done_all' : 'notifications_none'}</span><h2>{unread ? 'Bạn đã xem hết thông báo' : 'Chưa có thông báo'}</h2><p>{unread ? 'Các thông báo đã đọc vẫn nằm trong mục Tất cả.' : 'Lịch họp, nhận xét và cập nhật đồ án sẽ xuất hiện tại đây.'}</p></div>
}

export function NotificationLoading() {
  return <div className="notification-loading" role="status"><span className="material-symbols-outlined" aria-hidden="true">hourglass_top</span>Đang tải thông báo…</div>
}
