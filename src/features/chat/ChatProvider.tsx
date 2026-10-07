import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { HubConnectionBuilder, HubConnectionState, LogLevel, type HubConnection } from '@microsoft/signalr'
import { env } from '../../app/config/env'
import { useAuthSession } from '../auth/context/useAuthSession'
import { refreshAccessToken } from '../../services/http/http-client'
import { chatApi, type ChatConversation, type ChatPage } from './chat-api'

interface ChatContextValue {
  connection: HubConnection | null; revision: number; state: string
  inbox: ChatPage<ChatConversation>; inboxError: string; refresh: () => void
}
const emptyInbox: ChatPage<ChatConversation> = { items: [], nextCursor: null, hasMore: false }
const ChatContext = createContext<ChatContextValue>({ connection: null, revision: 0, state: 'offline', inbox: emptyInbox, inboxError: '', refresh: () => {} })
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
  const userId = session?.user.id
  const refresh = useCallback(() => setRevision(value => value + 1), [])

  useEffect(() => {
    if (!env.chatEnabled || !userId) return
    let disposed = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let retry: ReturnType<typeof setTimeout> | undefined
    const changed = () => {
      if (timer) return
      timer = setTimeout(() => { timer = undefined; if (!disposed) setRevision(value => value + 1) }, 150)
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
    for (const event of ['MessagesChanged', 'ConversationChanged', 'ReadStateChanged', 'AccessRevoked']) hub.on(event, changed)
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
      void hub.stop(); setConnection(null); setInbox(emptyInbox)
    }
  }, [userId])

  useEffect(() => {
    if (!env.chatEnabled || !userId) return
    const abort = new AbortController()
    void chatApi.inbox(undefined, abort.signal).then(value => { if (!abort.signal.aborted) { setInbox(value); setInboxError('') } })
      .catch(() => { if (!abort.signal.aborted) { setInbox(emptyInbox); setInboxError('Chưa tải được hộp thư. Chat có thể chưa được bật.') } })
    return () => abort.abort()
  }, [userId, revision])
  return <ChatContext.Provider value={{ connection, revision, state, inbox, inboxError, refresh }}>{children}</ChatContext.Provider>
}
