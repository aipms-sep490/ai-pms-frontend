import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { HubConnectionBuilder, HubConnectionState, LogLevel, type HubConnection } from '@microsoft/signalr'
import { env } from '../../app/config/env'
import { useAuthSession } from '../auth/context/useAuthSession'
import { refreshAccessToken } from '../../services/http/http-client'
import { chatApi, type ChatConversation, type ChatPage } from './chat-api'
import { createChatEventFilter } from './chat-events'
import { totalUnread } from './chat-view'

interface ChatContextValue {
  connection: HubConnection | null; revision: number; state: string
  inbox: ChatPage<ChatConversation>; inboxError: string; inboxLoading: boolean; refresh: (conversationId?: string) => void; changedConversations: ReadonlySet<string> | null; unreadCount: number; unreadKnown: boolean; acknowledgeRead: (id: string, sequence: string) => void
}
const emptyInbox: ChatPage<ChatConversation> = { items: [], nextCursor: null, hasMore: false }
const ChatContext = createContext<ChatContextValue>({ connection: null, revision: 0, state: 'offline', inbox: emptyInbox, inboxError: '', inboxLoading: false, refresh: () => {}, changedConversations: null, unreadCount: 0, unreadKnown: false, acknowledgeRead: () => {} })
export const useChat = () => useContext(ChatContext)

export function chatHubUrl(base: string): string {
  return new URL(base.replace(/\/api(?:\/v1)?\/?$/, '') + '/hubs/chat', window.location.origin).toString()
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const { session } = useAuthSession()
  const sessionRef = useRef(session)
  sessionRef.current = session
  const [connection, setConnection] = useState<HubConnection | null>(null)
  const [state, setState] = useState('offline')
  const [revision, setRevision] = useState(0)
  const [inbox, setInbox] = useState(emptyInbox)
  const [inboxError, setInboxError] = useState('')
  const [inboxLoading, setInboxLoading] = useState(false)
  const userId = session?.user.id
  const [inboxOwner, setInboxOwner] = useState<number | undefined>()
  const reloadInbox = useRef<() => void>(() => {})
  const previousRevision = useRef(revision)
  const acknowledgeRead = useCallback((id: string, sequence: string) => {
    setInbox(old => ({ ...old, items: old.items.map(room => room.id === id && BigInt(sequence) >= BigInt(room.sequence) ? { ...room, unreadCount: 0 } : room) }))
  }, [])
  const [changedConversations, setChangedConversations] = useState<ReadonlySet<string> | null>(null)
  const refresh = useCallback((conversationId?: string) => { setChangedConversations(conversationId ? new Set([conversationId]) : null); setRevision(value => value + 1) }, [])

  useEffect(() => {
    if (!env.chatEnabled || env.isMockMode || !userId) return
    let disposed = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let retry: ReturnType<typeof setTimeout> | undefined
    const changedIds = new Set<string>()
    let catchUpAll = false
    const changed = (id?: string) => {
      if (id) changedIds.add(id); else catchUpAll = true
      if (timer) return
      timer = setTimeout(() => {
        timer = undefined
        if (!disposed) { setChangedConversations(catchUpAll ? null : new Set(changedIds)); setRevision(value => value + 1) }
        changedIds.clear(); catchUpAll = false
      }, 150)
    }
    const hub = new HubConnectionBuilder().withUrl(chatHubUrl(env.apiBaseUrl), {
      accessTokenFactory: async () => {
        const current = sessionRef.current
        if (!current) throw new Error('Session expired')
        if (Date.parse(current.expiresAtUtc) > Date.now() + 30_000) return current.accessToken
        const token = await refreshAccessToken()
        if (!token) throw new Error('Session expired')
        return token
      },
    }).configureLogging(LogLevel.None).withAutomaticReconnect([0, 2000, 5000, 10000, 30000]).build()
    const accept = createChatEventFilter()
    for (const event of ['MessagesChanged', 'ConversationChanged', 'ReadStateChanged']) hub.on(event, (payload: unknown) => { if (accept(payload)) changed((payload as {conversationId:string}).conversationId) })
    // Revocation must bypass version filtering, including the minimal Ping envelope.
    hub.on('AccessRevoked', (payload: {conversationId?: string}) => changed(payload.conversationId))
    hub.onreconnecting(() => { if (!disposed) setState('reconnecting') })
    hub.onreconnected(() => { if (!disposed) { setState('connected'); changed() } })
    const start = async () => {
      if (disposed) return
      setState('connecting')
      try { await hub.start(); if (!disposed) { setState('connected'); changed() } else { await hub.stop() } }
      catch { if (!disposed) { setState('offline'); retry = setTimeout(() => void start(), 15000) } }
    }
    hub.onclose(() => { if (!disposed) { setState('offline'); retry = setTimeout(() => void start(), 15000) } })
    setConnection(hub)
    void start()
    const heartbeat = setInterval(() => {
      if (hub.state === HubConnectionState.Connected) void hub.invoke('Ping').catch(() => {})
    }, 20000)
    const catchUp = () => { if (document.visibilityState === 'visible') changed() }
    const catchUpTimer = setInterval(catchUp, 30000)
    document.addEventListener('visibilitychange', catchUp)
    return () => {
      disposed = true; clearInterval(heartbeat); clearInterval(catchUpTimer); clearTimeout(timer); clearTimeout(retry)
      document.removeEventListener('visibilitychange', catchUp)
      void hub.stop(); setConnection(null); setState('offline'); setInbox(emptyInbox); setInboxError(''); setInboxLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!env.chatEnabled || env.isMockMode || !userId) return
    const abort = new AbortController()
    let running = false, queued = false
    const load = async () => {
      if (running) { queued = true; return }
      running = true
      do {
        queued = false; setInboxLoading(true)
        try {
          // There is no total-unread endpoint. Traverse authorized summary pages;
          // never present a first-page subtotal as a global count.
          const rooms = new Map<string, ChatConversation>(), cursors = new Set<string>()
          let cursor: string | undefined
          do {
            const page = await chatApi.inbox(cursor, abort.signal)
            for (const room of page.items) {
              const old = rooms.get(room.id)
              if (!old || BigInt(room.version) >= BigInt(old.version)) rooms.set(room.id, room)
            }
            if (!page.hasMore) break
            if (!page.nextCursor || cursors.has(page.nextCursor)) throw new Error('Invalid chat cursor')
            cursors.add(page.nextCursor); cursor = page.nextCursor
          } while (!abort.signal.aborted)
          if (abort.signal.aborted) return
          setInbox({ items: [...rooms.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), nextCursor: null, hasMore: false })
          setInboxOwner(userId); setInboxError('')
        } catch {
          if (!abort.signal.aborted) { setInbox(emptyInbox); setInboxOwner(undefined); setInboxError('Chưa tải được hộp thư. Chat có thể chưa được bật.') }
        } finally { if (!abort.signal.aborted) setInboxLoading(false) }
      } while (queued && !abort.signal.aborted)
      running = false
    }
    reloadInbox.current = () => { void load() }
    void load()
    return () => { abort.abort(); reloadInbox.current = () => {}; setInboxOwner(undefined) }
  }, [userId])
  useEffect(() => {
    if (previousRevision.current === revision) return
    previousRevision.current = revision; reloadInbox.current()
  }, [revision])
  const visibleInbox = inboxOwner === userId && userId ? inbox : emptyInbox
  return <ChatContext.Provider value={{ connection, revision, state, inbox: visibleInbox, inboxError, inboxLoading, refresh, changedConversations, unreadCount: totalUnread(visibleInbox.items), unreadKnown: inboxOwner === userId && !!userId, acknowledgeRead }}>{children}</ChatContext.Provider>
}
