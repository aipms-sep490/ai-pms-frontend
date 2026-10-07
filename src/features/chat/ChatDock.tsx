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

export type ChatDockView = { type: 'closed' } | { type: 'list' } | { type: 'conversation'; conversationId: string } | { type: 'minimized'; conversationId?: string }
export function ChatDock() {
  const { session } = useAuthSession()
  if (!session || !env.chatEnabled || env.isMockMode) return null
  return <SessionChatDock key={session.user.id} userId={String(session.user.id)} />
}
function SessionChatDock({ userId }: { userId: string }) {
  const { unreadCount, unreadKnown, state } = useChat()
  const location = useLocation()
  const [view, setView] = useState<ChatDockView>({ type: 'closed' })
  const dialog = useRef<HTMLDialogElement>(null), launcher = useRef<HTMLButtonElement>(null)
  const fullPage = location.pathname === '/messages' || location.pathname.startsWith('/messages/')
  const expanded = !fullPage && (view.type === 'list' || view.type === 'conversation')
  const conversationId = view.type === 'conversation' || view.type === 'minimized' ? view.conversationId : undefined
  const finish = (next: ChatDockView) => { setView(next); launcher.current?.focus() }
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
    <dialog id="chat-dock-panel" ref={dialog} className="chat-dock-panel" aria-labelledby="chat-dock-title"
      onBlur={blurPanel} onCancel={event => { event.preventDefault(); finish({ type: 'closed' }) }}
      onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); finish({ type: 'closed' }) } }}>
      <header className="chat-dock-toolbar">
        {view.type === 'conversation' && <Button variant="ghost" icon="arrow_back" aria-label="Về danh sách trò chuyện" data-chat-focus onClick={() => setView({ type: 'list' })} />}
        <div><h2 id="chat-dock-title">Tin nhắn</h2><p role="status">{chatConnectionLabel(state)}</p></div>
        <Link className="chat-expand" to={conversationId ? `/messages/${conversationId}` : '/messages'} aria-label="Mở trang tin nhắn" onClick={() => setView({ type: 'closed' })}><span className="material-symbols-outlined" aria-hidden="true">open_in_full</span></Link>
        <Button variant="ghost" icon="remove" aria-label="Thu nhỏ tin nhắn" data-chat-focus={view.type === 'list' ? true : undefined} onClick={() => finish({ type: 'minimized', conversationId })} />
        <Button variant="ghost" icon="close" aria-label="Đóng tin nhắn" onClick={() => finish({ type: 'closed' })} />
      </header>
      {view.type === 'list' && <ChatConversations onOpen={room => setView({ type: 'conversation', conversationId: room.id })} />}
      {conversationId && <ChatThread key={conversationId} id={conversationId} userId={userId} active={expanded && view.type === 'conversation'} />}
    </dialog>
    <ChatLauncher count={unreadCount} known={unreadKnown} expanded={expanded} minimized={view.type === 'minimized'} buttonRef={launcher}
      onClick={() => expanded ? finish({ type: 'minimized', conversationId }) : setView(view.type === 'minimized' && view.conversationId ? { type: 'conversation', conversationId: view.conversationId } : { type: 'list' })} />
  </div>
}
