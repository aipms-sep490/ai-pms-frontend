import { useEffect, useRef, useState, type FocusEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { env } from '../../app/config/env'
import { useAuthSession } from '../auth/context/useAuthSession'
import { useChat } from './ChatProvider'
import { ChatConversations } from './ChatPage'
import { ChatThread } from './ChatThread'
import { ChatLauncher } from './ChatLauncher'
import { chatConnectionLabel } from './chat-events'
import './chat.css'
import { chatDockExpandedEvent, chatDockStateRequestEvent, floatingPanelEvent } from '../ai/assistant-dock-events'

export type ChatDockView = { type: 'closed' } | { type: 'list' } | { type: 'conversation'; conversationId: string } | { type: 'minimized'; conversationId?: string }
export function ChatDock() {
  const { session } = useAuthSession()
  const { chatDenied } = useChat()
  if (!session || !env.chatEnabled || env.isMockMode || chatDenied) return null
  return <SessionChatDock key={session.user.id} userId={String(session.user.id)} />
}
function SessionChatDock({ userId }: { userId: string }) {
  const { unreadCount, unreadKnown, state, inbox } = useChat()
  const location = useLocation()
  const [view, setView] = useState<ChatDockView>({ type: 'closed' })
  const [wide, setWide] = useState(false)
  const [incomingToast, setIncomingToast] = useState<{ id: string; title: string; snippet: string } | null>(null)
  const prevUnreadRef = useRef(unreadCount)
  const dialog = useRef<HTMLDialogElement>(null), launcher = useRef<HTMLButtonElement>(null)
  const fullPage = location.pathname === '/messages' || location.pathname.startsWith('/messages/')
  const expanded = !fullPage && (view.type === 'list' || view.type === 'conversation')
  const conversationId = view.type === 'conversation' || view.type === 'minimized' ? view.conversationId : undefined
  const finish = (next: ChatDockView) => { setView(next); launcher.current?.focus() }

  useEffect(() => {
    const closeOther = (event: Event) => {
      if ((event as CustomEvent).detail !== 'messages') setView(current => current.type === 'conversation' ? { type: 'minimized', conversationId: current.conversationId } : current.type === 'list' ? { type: 'minimized' } : current)
    }
    window.addEventListener(floatingPanelEvent, closeOther)
    return () => window.removeEventListener(floatingPanelEvent, closeOther)
  }, [])
  useEffect(() => { if (expanded) window.dispatchEvent(new CustomEvent(floatingPanelEvent, { detail: 'messages' })) }, [expanded])
  useEffect(() => {
    const publish = () => window.dispatchEvent(new CustomEvent(chatDockExpandedEvent, { detail: expanded }))
    window.addEventListener(chatDockStateRequestEvent, publish)
    publish()
    return () => {
      window.removeEventListener(chatDockStateRequestEvent, publish)
      window.dispatchEvent(new CustomEvent(chatDockExpandedEvent, { detail: false }))
    }
  }, [expanded])

  useEffect(() => {
    if (unreadCount > prevUnreadRef.current && !expanded) {
      const room = inbox?.items?.find(r => r.unreadCount > 0) || inbox?.items?.[0]
      if (room) {
        setIncomingToast({
          id: room.id,
          title: room.title || 'Tin nhắn mới',
          snippet: room.lastMessage?.body || 'Bạn vừa nhận được một tin nhắn mới.',
        })
        const timer = setTimeout(() => setIncomingToast(null), 6000)
        return () => clearTimeout(timer)
      }
    }
    prevUnreadRef.current = unreadCount
  }, [unreadCount, expanded, inbox?.items])

  useEffect(() => {
    if (expanded) setIncomingToast(null)
  }, [expanded])

  useEffect(() => {
    const panel = dialog.current
    if (!panel) return
    const media = window.matchMedia('(max-width: 700px)')
    const previousOverflow = document.body.style.overflow
    let locked = false
    const sync = () => {
      if (panel.open) panel.close()
      if (locked) { document.body.style.overflow = previousOverflow; locked = false }
      if (expanded) {
        if (media.matches) { document.body.style.overflow = 'hidden'; locked = true; panel.showModal() } else panel.show()
        panel.querySelector<HTMLElement>('[data-chat-list-focus], [data-chat-focus]')?.focus()
      }
    }
    sync(); media.addEventListener('change', sync)
    return () => { media.removeEventListener('change', sync); if (panel.open) panel.close(); if (locked) document.body.style.overflow = previousOverflow }
  }, [expanded])
  useEffect(() => { if (expanded) dialog.current?.querySelector<HTMLElement>('[data-chat-list-focus], [data-chat-focus]')?.focus() }, [view.type, conversationId, expanded])
  useEffect(() => {
    const viewport = window.visualViewport
    const resize = () => { dialog.current?.style.setProperty('--chat-viewport-height', `${viewport?.height ?? window.innerHeight}px`); dialog.current?.style.setProperty('--chat-viewport-offset', `${viewport?.offsetTop ?? 0}px`) }
    resize(); viewport?.addEventListener('resize', resize); viewport?.addEventListener('scroll', resize)
    return () => { viewport?.removeEventListener('resize', resize); viewport?.removeEventListener('scroll', resize) }
  }, [])
  // Desktop remains non-modal; dismiss before keyboard focus moves behind it.
  const blurPanel = (event: FocusEvent<HTMLDialogElement>) => {
    if (expanded && !window.matchMedia('(max-width: 700px)').matches && event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget) && event.relatedTarget !== launcher.current) {
      setView({ type: 'minimized', conversationId })
    }
  }
  return <div className="chat-dock" hidden={fullPage}>
    <dialog id="chat-dock-panel" ref={dialog} className={`chat-dock-panel${wide ? ' is-wide' : ''}`} aria-labelledby="chat-dock-title"
      onBlur={blurPanel} onCancel={event => { event.preventDefault(); finish({ type: 'closed' }) }}
      onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); finish({ type: 'closed' }) } }}>
      <header className="chat-dock-toolbar">
        {view.type === 'conversation'
          ? <Button variant="ghost" icon="arrow_back" aria-label="Về danh sách trò chuyện" data-chat-focus onClick={() => setView({ type: 'list' })} />
          : <span className="chat-dock-brand-icon material-symbols-outlined" aria-hidden="true">forum</span>}
        <div className="chat-dock-heading">
          <div className="chat-dock-title-row">
            <h2 id="chat-dock-title">Tin nhắn</h2>
            <span className={`chat-dock-live-dot ${state === 'connected' ? 'is-connected' : 'is-syncing'}`} aria-hidden="true" />
          </div>
          <p role="status">{chatConnectionLabel(state)}</p>
        </div>
        <button type="button" className="chat-dock-wide-btn" aria-label={wide ? 'Thu gọn khung tin nhắn' : 'Mở rộng khung tin nhắn'} title={wide ? 'Thu gọn khung' : 'Mở rộng khung'} onClick={() => setWide(v => !v)}>
          <span className="material-symbols-outlined" aria-hidden="true">{wide ? 'close_fullscreen' : 'aspect_ratio'}</span>
        </button>
        <Link className="chat-expand" to={conversationId ? `/messages/${conversationId}` : '/messages'} aria-label="Mở trang tin nhắn" title="Mở toàn màn hình" onClick={() => setView({ type: 'closed' })}><span className="material-symbols-outlined" aria-hidden="true">open_in_full</span></Link>
        <Button variant="ghost" icon="remove" aria-label="Thu nhỏ tin nhắn" data-chat-focus={view.type === 'list' ? true : undefined} onClick={() => finish({ type: 'minimized', conversationId })} />
        <Button variant="ghost" icon="close" aria-label="Đóng tin nhắn" onClick={() => finish({ type: 'closed' })} />
      </header>
      {view.type === 'list' && <ChatConversations compact onOpen={room => setView({ type: 'conversation', conversationId: room.id })} />}
      {conversationId && <ChatThread key={conversationId} id={conversationId} userId={userId} active={expanded && view.type === 'conversation'} />}
    </dialog>

    {incomingToast && !expanded && (
      <aside className="chat-incoming-toast" role="status" aria-label="Thông báo tin nhắn mới">
        <button type="button" className="chat-toast-open" aria-label={`Mở tin nhắn từ ${incomingToast.title}`} onClick={() => {
          setView({ type: 'conversation', conversationId: incomingToast.id })
          setIncomingToast(null)
        }}><span className="chat-toast-avatar" aria-hidden="true">
          <span className="material-symbols-outlined text-[18px]">chat</span>
        </span><span className="chat-toast-content">
          <strong className="chat-toast-title">{incomingToast.title}</strong>
          <span className="chat-toast-snippet">{incomingToast.snippet}</span>
        </span></button>
        <button
          type="button"
          className="chat-toast-close"
          aria-label="Đóng thông báo tin nhắn"
          onClick={() => setIncomingToast(null)}
        >
          ✕
        </button>
      </aside>
    )}

    <ChatLauncher count={unreadCount} known={unreadKnown} expanded={expanded} minimized={view.type === 'minimized'} buttonRef={launcher}
      onClick={() => expanded ? finish({ type: 'minimized', conversationId }) : setView(view.type === 'minimized' && view.conversationId ? { type: 'conversation', conversationId: view.conversationId } : { type: 'list' })} />
  </div>
}
