import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthSessionContext } from '../auth/context/auth-session-context'
import { getNotifications, getUnreadCount, markNotificationRead, type NotificationItem } from './notifications-api'
import { notificationCopy } from './notification-copy'
import { resolveNotificationLink } from './notification-link-resolver'
import './notifications.css'

const CHANNEL_NAME = 'aipms-notifications'
const ACTIVE_POLL_MS = 10_000
const LIVE_VIEW_POLL_MS = 5_000
const TOAST_DURATION_MS = 6_500

export function emitNotificationsChanged() {
  window.dispatchEvent(new Event('ai-pms:notifications-changed'))
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(CHANNEL_NAME)
      channel.postMessage({ type: 'changed', at: Date.now() })
      channel.close()
    }
  } catch {
    /* ignore environments where BroadcastChannel is unavailable */
  }
}

export interface NotificationLiveValue {
  unreadCount: number | null
  unreadStale: boolean
  syncVersion: number
  lastSyncedAt: number | null
  refreshUnread: () => Promise<number | null>
  registerLiveView: () => () => void
}

const NotificationLiveContext = createContext<NotificationLiveValue | null>(null)

export function useNotificationLive(): NotificationLiveValue | null {
  return useContext(NotificationLiveContext)
}

export function NotificationLiveProvider({ children }: { children: ReactNode }) {
  const auth = useContext(AuthSessionContext)
  const location = useLocation()
  const navigate = useNavigate()
  const userId = auth?.session?.user.id ?? null
  const roles = useMemo(() => auth?.session?.user.roles ?? [], [auth?.session?.user.roles])

  const [unreadCount, setUnreadCount] = useState<number | null>(null)
  const [unreadStale, setUnreadStale] = useState(false)
  const [syncVersion, setSyncVersion] = useState(0)
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  const [liveViewCount, setLiveViewCount] = useState(0)
  const [toastItem, setToastItem] = useState<NotificationItem | null>(null)

  const prevCountRef = useRef<number | null>(null)
  const lastToastedIdRef = useRef<number | null>(null)
  const toastTimerRef = useRef<number | null>(null)
  const inFlightRef = useRef<Promise<number | null> | null>(null)
  const mountedPathRef = useRef(location.pathname)
  const mountedUserRef = useRef<number | null>(userId)

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current)
      toastTimerRef.current = null
    }
    setToastItem(null)
  }, [])

  const showLiveToast = useCallback((item: NotificationItem) => {
    if (lastToastedIdRef.current === item.id) return
    lastToastedIdRef.current = item.id
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current)
    setToastItem(item)
    toastTimerRef.current = window.setTimeout(() => {
      setToastItem(null)
      toastTimerRef.current = null
    }, TOAST_DURATION_MS)
  }, [])

  const refreshUnread = useCallback(async (opts?: { silentToast?: boolean }): Promise<number | null> => {
    if (!userId) return null
    if (inFlightRef.current) return inFlightRef.current
    const activeUser = userId
    const promise = getUnreadCount()
      .then((count) => {
        if (mountedUserRef.current !== activeUser) return null
        const prev = prevCountRef.current
        prevCountRef.current = count
        setUnreadCount(count)
        setUnreadStale(false)
        setLastSyncedAt(Date.now())
        if (prev !== null && prev !== count) {
          setSyncVersion((v) => v + 1)
        }
        // Only trigger a live toast when genuinely new unread notifications arrive after initial baseline
        if (!opts?.silentToast && prev !== null && count > prev && document.visibilityState === 'visible') {
          void getNotifications(1, false, 1)
            .then((page) => {
              const newest = page.items[0]
              if (newest && !newest.isRead && mountedUserRef.current === activeUser) {
                showLiveToast(newest)
              }
            })
            .catch(() => {})
        }
        return count
      })
      .catch(() => {
        if (mountedUserRef.current === activeUser) setUnreadStale(true)
        return null
      })
      .finally(() => {
        inFlightRef.current = null
      })
    inFlightRef.current = promise
    return promise
  }, [showLiveToast, userId])

  // Reset baseline cleanly on user switch / sign-out
  useEffect(() => {
    mountedUserRef.current = userId
    prevCountRef.current = null
    lastToastedIdRef.current = null
    inFlightRef.current = null
    dismissToast()
    if (!userId) {
      setUnreadCount(null)
      setUnreadStale(false)
      setLastSyncedAt(null)
      return
    }
    void refreshUnread({ silentToast: true })
  }, [dismissToast, refreshUnread, userId])

  // Adaptive realtime polling (5s when notification UI open, 10s when tab active, paused when hidden)
  useEffect(() => {
    if (!userId) return
    const intervalMs = liveViewCount > 0 ? LIVE_VIEW_POLL_MS : ACTIVE_POLL_MS
    const pollIfVisible = () => {
      if (document.visibilityState === 'visible') void refreshUnread()
    }
    const timer = window.setInterval(pollIfVisible, intervalMs)
    return () => window.clearInterval(timer)
  }, [liveViewCount, refreshUnread, userId])

  // Instant sync on window focus, visibility return, network online, custom event, and cross-tab BroadcastChannel
  useEffect(() => {
    if (!userId) return
    const onLocalChange = () => {
      void refreshUnread({ silentToast: true })
    }
    const onVisibleOrFocus = () => {
      if (document.visibilityState === 'visible') void refreshUnread()
    }
    const onOnline = () => {
      void refreshUnread()
    }

    window.addEventListener('ai-pms:notifications-changed', onLocalChange)
    window.addEventListener('focus', onVisibleOrFocus)
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onVisibleOrFocus)

    let channel: BroadcastChannel | null = null
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel(CHANNEL_NAME)
        channel.onmessage = () => {
          void refreshUnread({ silentToast: true })
          setSyncVersion((v) => v + 1)
        }
      }
    } catch {
      channel = null
    }

    return () => {
      window.removeEventListener('ai-pms:notifications-changed', onLocalChange)
      window.removeEventListener('focus', onVisibleOrFocus)
      window.removeEventListener('online', onOnline)
      document.removeEventListener('visibilitychange', onVisibleOrFocus)
      if (channel) {
        try { channel.close() } catch { /* ignore */ }
      }
    }
  }, [refreshUnread, userId])

  // Sync automatically on route transitions (after initial mount)
  useEffect(() => {
    if (mountedPathRef.current === location.pathname) return
    mountedPathRef.current = location.pathname
    if (userId) void refreshUnread()
  }, [location.pathname, refreshUnread, userId])

  const registerLiveView = useCallback(() => {
    setLiveViewCount((c) => c + 1)
    return () => {
      setLiveViewCount((c) => Math.max(0, c - 1))
    }
  }, [])

  const value = useMemo<NotificationLiveValue>(
    () => ({
      unreadCount,
      unreadStale,
      syncVersion,
      lastSyncedAt,
      refreshUnread: () => refreshUnread({ silentToast: true }),
      registerLiveView,
    }),
    [lastSyncedAt, refreshUnread, registerLiveView, syncVersion, unreadCount, unreadStale],
  )

  const toastCopy = toastItem ? notificationCopy(toastItem) : null
  const toastLink = toastItem ? resolveNotificationLink(toastItem, roles) : null

  const openToastItem = async () => {
    if (!toastItem) return
    const target = toastItem
    dismissToast()
    if (!target.isRead) {
      try {
        await markNotificationRead(target.id)
        emitNotificationsChanged()
      } catch {
        /* ignore */
      }
    }
    if (toastLink) navigate(toastLink.url)
    else navigate('/notifications')
  }

  return (
    <NotificationLiveContext.Provider value={value}>
      {children}
      {toastItem && toastCopy && (
        <aside
          aria-live="polite"
          aria-label="Thông báo mới đến"
          className="notification-live-toast"
        >
          <span className="notification-live-toast__icon material-symbols-outlined" aria-hidden="true">
            {toastCopy.icon}
          </span>
          <div className="notification-live-toast__body">
            <div className="notification-live-toast__meta">
              <span className="notification-live-toast__tag">{toastCopy.label}</span>
              <span className="notification-live-toast__live-dot" aria-hidden="true" />
              <span className="notification-live-toast__time">Vừa đến</span>
            </div>
            <p className="notification-live-toast__title">{toastCopy.title}</p>
            <div className="notification-live-toast__actions">
              {toastLink ? (
                <Link
                  to={toastLink.url}
                  onClick={(e) => { e.preventDefault(); void openToastItem() }}
                  className="notification-live-toast__cta"
                >
                  {toastLink.label} →
                </Link>
              ) : (
                <button type="button" onClick={() => void openToastItem()} className="notification-live-toast__cta">
                  Mở thông báo →
                </button>
              )}
            </div>
          </div>
          <button
            type="button"
            className="notification-live-toast__close"
            aria-label="Đóng thông báo nổi"
            onClick={dismissToast}
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">close</span>
          </button>
        </aside>
      )}
    </NotificationLiveContext.Provider>
  )
}
