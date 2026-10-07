import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { HttpError } from '../../services/http/http-client'
import { useChat } from './ChatProvider'
import { chatApi, mergeMessages, type ChatConversation, type ChatMessage, type ChatPerson, type SendMessage } from './chat-api'

export function chatError(e: unknown) {
  if (e instanceof HttpError) {
    if ([401, 403, 404].includes(e.status)) return 'Bạn không còn quyền truy cập cuộc trò chuyện này.'
    if (e.status === 503) return 'Chat hiện chưa được bật hoặc tạm thời không khả dụng.'
    if (e.status === 409) return 'Dữ liệu đã thay đổi. Tải lại và kiểm tra tin nhắn trước khi thử lại.'
    if (e.status === 429) return 'Hãy chờ một lát trước khi thử lại.'
  }
  return 'Chưa hoàn tất yêu cầu. Kiểm tra kết nối và thử lại.'
}
const denied = (e: unknown) => e instanceof HttpError && [401, 403, 404].includes(e.status)
interface Pending { request: SendMessage; sending: boolean; error?: string }
export function ChatThread({ id, userId }: { id: string; userId: string }) {
  const { connection, state, revision, refresh } = useChat()
  const [room, setRoom] = useState<ChatConversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [members, setMembers] = useState<ChatPerson[]>([])
  const [memberCursor, setMemberCursor] = useState<string | null>(null)
  const [cursor, setCursor] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [draft, setDraft] = useState('')
  const [reply, setReply] = useState<ChatMessage | null>(null)
  const [edit, setEdit] = useState<ChatMessage | null>(null)
  const [recall, setRecall] = useState<ChatMessage | null>(null)
  const [pending, setPending] = useState<Pending[]>([])
  const [typing, setTyping] = useState<Record<string, number>>({})
  const [online, setOnline] = useState<string[]>([])
  const view = useRef<HTMLDivElement>(null)
  const bottom = useRef<HTMLDivElement>(null)
  const composer = useRef<HTMLTextAreaElement>(null)
  const readSequence = useRef('0'), reading = useRef(false), lastTyping = useRef(0), live = useRef(true)
  const revoked = useRef(false)
  const clear = () => {
    revoked.current = true; setReady(false); setRoom(null); setMessages([]); setMembers([]); setPending([]); setDraft(''); setReply(null); setEdit(null); setRecall(null); setOnline([]); setTyping({})
    setError('Bạn không còn quyền truy cập cuộc trò chuyện này.')
  }
  useEffect(() => { live.current = true; return () => { live.current = false } }, [])
  useEffect(() => {
    if (revoked.current) return
    const abort = new AbortController()
    setReady(false)
    if (!/^\d+$/.test(id)) { setError('Đường dẫn không hợp lệ.'); return }
    void Promise.all([chatApi.detail(id, abort.signal), chatApi.messages(id, undefined, abort.signal), chatApi.members(id, undefined, abort.signal)])
      .then(([detail, page, people]) => {
        if (abort.signal.aborted || revoked.current) return
        setRoom(detail); setMessages(page.items); setCursor(page.nextCursor); setMembers(people.items); setMemberCursor(people.nextCursor); setReady(true); setError('')
        setPending(old => old.filter(p => !page.items.some(m => m.clientMessageId === p.request.clientMessageId)))
      }).catch(e => { if (!abort.signal.aborted) { if (denied(e)) clear(); else setError(chatError(e)) } })
    return () => abort.abort()
  }, [id, revision, reload])
  useEffect(() => {
    if (!connection || state !== 'connected') { setOnline([]); setTyping({}); return }
    const typed = (e: { conversationId: string; userId: string; isTyping: boolean }) => {
      if (e.conversationId === id && e.userId !== userId) setTyping(old => ({ ...old, [e.userId]: e.isTyping ? Date.now() + 6000 : 0 }))
    }
    const presence = (e: { conversationId: string; onlineUserIds: string[] }) => { if (e.conversationId === id) setOnline(e.onlineUserIds) }
    const revoke = (e: { conversationId: string }) => { if (e.conversationId === id) clear() }
    connection.on('TypingChanged', typed); connection.on('PresenceChanged', presence); connection.on('AccessRevoked', revoke)
    void connection.invoke('WatchConversation', id).catch(() => {})
    const timer = setInterval(() => setTyping(old => Object.fromEntries(Object.entries(old).filter(([, time]) => time > Date.now()))), 1000)
    return () => {
      clearInterval(timer); connection.off('TypingChanged', typed); connection.off('PresenceChanged', presence); connection.off('AccessRevoked', revoke)
      void connection.invoke('UnwatchConversation', id).catch(() => {})
    }
  }, [id, userId, connection, state])
  useEffect(() => {
    const last = messages.at(-1), marker = bottom.current
    if (!ready || !last || !marker || !view.current) return
    const read = () => {
      if (!document.hasFocus() || document.visibilityState !== 'visible' || reading.current || BigInt(last.sequence) <= BigInt(readSequence.current)) return
      const bounds = view.current?.getBoundingClientRect(), rect = marker.getBoundingClientRect()
      if (!bounds || rect.top < bounds.top || rect.bottom > bounds.bottom + 1) return
      reading.current = true
      void chatApi.read(id, last.id).then(() => { readSequence.current = last.sequence; refresh() }).catch(() => {}).finally(() => { reading.current = false })
    }
    const observer = new IntersectionObserver(read, { root: view.current, threshold: 1 })
    observer.observe(marker); window.addEventListener('focus', read); document.addEventListener('visibilitychange', read)
    return () => { observer.disconnect(); window.removeEventListener('focus', read); document.removeEventListener('visibilitychange', read) }
  }, [messages, ready, id, refresh])
  const mutate = async (action: () => Promise<void>) => {
    if (busy || !ready) return
    setBusy(true); setError('')
    try { await action() } catch (e) { if (denied(e)) clear(); else setError(chatError(e)) } finally { if (live.current) setBusy(false) }
  }
  const send = async (item: Pending) => {
    setPending(old => old.map(p => p.request.clientMessageId === item.request.clientMessageId ? { ...p, sending: true } : p))
    try {
      const canonical = await chatApi.send(id, item.request)
      if (!live.current || revoked.current) return
      setMessages(old => mergeMessages(old, [canonical])); setPending(old => old.filter(p => p.request.clientMessageId !== item.request.clientMessageId)); refresh()
    } catch (e) {
      if (!live.current) return
      if (denied(e)) { clear(); return }
      setPending(old => old.map(p => p.request.clientMessageId === item.request.clientMessageId ? { ...p, sending: false, error: chatError(e) } : p))
    }
  }
  const canSend = ready && room?.canSend === true
  const submit = () => {
    if (!canSend || !draft.trim() || draft.length > 4000 || busy) return
    if (edit) { void mutate(async () => { await chatApi.edit(id, edit, draft); setEdit(null); setDraft(''); refresh() }); return }
    const item: Pending = { request: { clientMessageId: crypto.randomUUID(), body: draft, ...(reply ? { replyToMessageId: reply.id } : {}) }, sending: true }
    setPending(old => [...old, item]); setDraft(''); setReply(null); void send(item)
  }
  return <section className="chat-main" aria-label="Nội dung trò chuyện">
    <header className="chat-header"><Link to="/messages">Quay lại</Link><div><h2>{room?.title || 'Cuộc trò chuyện'}</h2><p>{!ready ? 'Đang xác minh quyền và kết nối' : canSend ? 'Trao đổi trong nhóm' : 'Chỉ đọc'}</p></div></header>
    {error && <p role="alert" className="chat-error">{error} <button onClick={() => { revoked.current = false; setReload(n => n + 1) }}>Tải lại</button></p>}
    <details className="chat-members"><summary>Thành viên và trạng thái đã đọc</summary><ul>{members.map(person => <li key={person.userId}>{person.fullName}{online.includes(person.userId) ? ' · Đang kết nối' : ''}{person.userId !== userId && person.lastReadSequence && messages.some(m => m.senderId === userId && BigInt(m.sequence) <= BigInt(person.lastReadSequence!)) ? ' · Đã đọc tin của bạn' : ''}</li>)}</ul>
      {memberCursor && <button disabled={busy} onClick={() => void mutate(async () => { const page = await chatApi.members(id, memberCursor); setMembers(old => [...old, ...page.items]); setMemberCursor(page.nextCursor) })}>Thêm thành viên</button>}</details>
    <div className="chat-history" ref={view} tabIndex={0} aria-label="Lịch sử tin nhắn">
      {cursor && <button disabled={!ready || busy} onClick={() => void mutate(async () => { const page = await chatApi.messages(id, cursor); if (!revoked.current) { setMessages(old => mergeMessages(old, page.items)); setCursor(page.nextCursor) } })}>Xem tin trước</button>}
      {ready && !messages.length && <p>Chưa có tin nhắn. Bắt đầu cuộc trao đổi.</p>}
      {messages.map(message => <article key={message.id} className={message.senderId === userId ? 'own' : ''}><div><strong>{message.senderName}</strong><time dateTime={message.createdAt}>{new Date(message.createdAt.endsWith('Z') ? message.createdAt : message.createdAt + 'Z').toLocaleString('vi-VN')}</time></div>
        {message.reply && <blockquote>{message.reply.unavailable ? 'Tin nhắn gốc không còn khả dụng' : message.reply.body}</blockquote>}
        <p>{message.recalledAt ? 'Tin nhắn đã thu hồi' : message.body}</p>{message.editedAt && !message.recalledAt && <small>Đã chỉnh sửa</small>}
        {canSend && !message.recalledAt && <div className="chat-message-actions"><button onClick={() => { setReply(message); setEdit(null); composer.current?.focus() }}>Trả lời</button>{message.canEdit && <button onClick={() => { setEdit(message); setReply(null); setDraft(message.body || ''); composer.current?.focus() }}>Sửa</button>}{message.canRecall && <button onClick={() => setRecall(message)}>Thu hồi</button>}</div>}
      </article>)}
      {pending.map(item => <article className="own chat-pending" key={item.request.clientMessageId}><p>{item.request.body}</p><small>{item.sending ? 'Đang gửi...' : item.error}</small>{!item.sending && <button disabled={!canSend} onClick={() => void send(item)}>Gửi lại</button>}</article>)}
      <div ref={bottom} style={{ height: 2 }} />
    </div>
    <button className="chat-jump" onClick={() => { if (view.current) view.current.scrollTop = view.current.scrollHeight }}>Tin mới nhất</button>
    <div role="status" className="chat-typing">{Object.keys(typing).length ? 'Có người đang nhập...' : ''}</div>
    {recall && <div className="chat-confirm" role="group" aria-label="Xác nhận thu hồi"><p>Thu hồi tin nhắn này?</p><button disabled={!canSend || busy} onClick={() => void mutate(async () => { await chatApi.recall(id, recall); setRecall(null); refresh() })}>Xác nhận thu hồi</button><button onClick={() => setRecall(null)}>Hủy</button></div>}
    <form className="chat-compose" onSubmit={e => { e.preventDefault(); submit() }}>
      {(reply || edit) && <div className="chat-reply-draft"><span>{edit ? 'Đang sửa tin nhắn' : `Trả lời ${reply?.senderName}`}</span><button type="button" onClick={() => { setReply(null); if (edit) setDraft(''); setEdit(null) }}>Hủy</button></div>}
      <label>Tin nhắn<textarea ref={composer} value={draft} disabled={!canSend} rows={2} maxLength={4000} placeholder={canSend ? 'Viết tin nhắn...' : 'Hiện không thể gửi tin'} onChange={e => { setDraft(e.target.value); if (connection && state === 'connected' && Date.now() - lastTyping.current >= 3000) { lastTyping.current = Date.now(); void connection.invoke('SetTyping', id, true).catch(() => {}) } }} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit() } }} /></label>
      <div className="chat-compose-footer"><small>Shift + Enter để xuống dòng · {draft.length}/4000</small><button type="submit" disabled={!canSend || !draft.trim() || busy}>{edit ? 'Lưu sửa' : 'Gửi'}</button></div>
    </form>
  </section>
}
