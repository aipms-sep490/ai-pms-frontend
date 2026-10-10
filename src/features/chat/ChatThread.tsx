import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { HttpError } from '../../services/http/http-client'
import { useChat } from './ChatProvider'
import { chatApi, mergeMessages, type ChatConversation, type ChatMessage, type ChatPerson, type SendMessage } from './chat-api'
import { chatDay, chatTime, utcDate } from './chat-view'
import { ChatMessageContent } from './ChatMessageContent'
import { ChatAttachments } from './ChatAttachments'
import { ChatReactionBar } from './ChatReactionBar'
import { attachmentError, canSubmitMessage, formatBytes, toggleReaction } from './chat-attachments'
import { chatConnectionLabel } from './chat-events'
import { env } from '../../app/config/env'

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
export function ChatThread({ id, userId, active = true }: { id: string; userId: string; active?: boolean }) {
  const { connection, state, revision, refresh, acknowledgeRead, changedConversations } = useChat()
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
  const [files, setFiles] = useState<File[]>([])
  const [fileError, setFileError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const [typing, setTyping] = useState<Record<string, number>>({})
  const [online, setOnline] = useState<string[]>([])
  const view = useRef<HTMLDivElement>(null)
  const bottom = useRef<HTMLDivElement>(null)
  const composer = useRef<HTMLTextAreaElement>(null)
  const readSequence = useRef('0'), reading = useRef(false), lastTyping = useRef(0), live = useRef(true)
  const revoked = useRef(false)
  const following = useRef(true), newest = useRef('0')
  const historyWindows = useRef<(string | undefined)[]>([undefined])
  const serverSequence = useRef('0')
  const restoreScroll = useRef<{ height: number; top: number; anchorId?: string; anchorTop?: number } | null>(null)
  const typingStop = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [newMessages, setNewMessages] = useState(0)
  const clear = () => {
    revoked.current = true; setReady(false); setRoom(null); setMessages([]); setMembers([]); setPending([]); setDraft(''); setReply(null); setEdit(null); setRecall(null); setOnline([]); setTyping({})
    setError('Bạn không còn quyền truy cập cuộc trò chuyện này.')
  }
  useEffect(() => { live.current = true; return () => { live.current = false } }, [])
  const reloadRoom = useRef<() => void>(() => {})
  const previousRevision = useRef(revision)
  useEffect(() => {
    if (revoked.current || !active) return
    const abort = new AbortController()
    let running = false, queued = false
    setReady(false)
    if (!/^\d+$/.test(id)) { setError('Đường dẫn không hợp lệ.'); return }
    const load = async () => {
      if (abort.signal.aborted || revoked.current) return
      if (running) { queued = true; return }
      running = true
      do {
        queued = false
        try {
          // BE serializes scope checks. Coalesce invalidations instead of aborting
          // in-flight transactions and starting three competing requests again.
          const detail = await chatApi.detail(id, abort.signal)
          const windows = [...historyWindows.current]
          let page = await chatApi.messages(id, windows[0], abort.signal)
          let loaded = page.items
          const freshWindows = [windows[0]]
          for (let index = 1; index < windows.length && page.nextCursor; index++) { const before = page.nextCursor; freshWindows.push(before); page = await chatApi.messages(id, before, abort.signal); loaded = mergeMessages(loaded, page.items) }
          if (windows.length !== historyWindows.current.length || windows.some((before, index) => before !== historyWindows.current[index])) { queued = true; continue }
          if (abort.signal.aborted || revoked.current) return
          if (windows[0] && BigInt(detail.sequence) > BigInt(serverSequence.current)) setNewMessages(old => old + Number(BigInt(detail.sequence) - BigInt(serverSequence.current)))
          serverSequence.current = detail.sequence
          historyWindows.current = freshWindows
          setRoom(detail); setMessages(loaded.slice(-500)); setCursor(page.nextCursor); setReady(true); setError('')
          setPending(old => old.filter(p => !loaded.some(m => m.clientMessageId === p.request.clientMessageId)))
          const people = await chatApi.members(id, undefined, abort.signal)
          if (abort.signal.aborted || revoked.current) return
          setMembers(people.items); setMemberCursor(people.nextCursor)
        } catch (e) {
          if (!abort.signal.aborted) { if (denied(e)) clear(); else { setReady(false); setError(chatError(e)) } }
          break
        }
      } while (queued && !abort.signal.aborted && !revoked.current)
      running = false
    }
    reloadRoom.current = () => { void load() }
    void load()
    return () => { abort.abort(); reloadRoom.current = () => {} }
  }, [id, reload, active])
  useEffect(() => {
    if (previousRevision.current === revision) return
    previousRevision.current = revision
    if (!changedConversations || changedConversations.has(id)) reloadRoom.current()
  }, [revision, changedConversations, id])
  useEffect(() => {
    if (!active || !connection || state !== 'connected') { setOnline([]); setTyping({}); return }
    const typed = (e: { conversationId: string; userId: string; isTyping: boolean }) => {
      if (e.conversationId === id && e.userId !== userId) setTyping(old => ({ ...old, [e.userId]: e.isTyping ? Date.now() + 6000 : 0 }))
    }
    const presence = (e: { conversationId: string; onlineUserIds: string[] }) => { if (e.conversationId === id) setOnline(e.onlineUserIds) }
    connection.on('TypingChanged', typed); connection.on('PresenceChanged', presence)
    void connection.invoke('WatchConversation', id).catch(() => {})
    const timer = setInterval(() => setTyping(old => Object.fromEntries(Object.entries(old).filter(([, time]) => time > Date.now()))), 1000)
    return () => {
      clearInterval(timer); clearTimeout(typingStop.current); void connection.invoke('SetTyping', id, false).catch(() => {}); connection.off('TypingChanged', typed); connection.off('PresenceChanged', presence)
      void connection.invoke('UnwatchConversation', id).catch(() => {})
    }
  }, [id, userId, connection, state, active])
  useEffect(() => {
    if (!connection) return
    const revoke = (event: {conversationId: string}) => { if (event.conversationId === id) clear() }
    connection.on('AccessRevoked', revoke)
    return () => connection.off('AccessRevoked', revoke)
  }, [connection, id])
  useLayoutEffect(() => {
    const history = view.current
    if (!history || !active) return
    const last = messages.at(-1)?.sequence || '0'
    if (restoreScroll.current) {
      const saved = restoreScroll.current
      const anchor = [...history.querySelectorAll<HTMLElement>('[data-message-id]')].find(element => element.dataset.messageId === saved.anchorId)
      history.scrollTop = saved.top + (anchor && saved.anchorTop !== undefined ? anchor.getBoundingClientRect().top - saved.anchorTop : history.scrollHeight - saved.height)
      restoreScroll.current = null
    } else if (following.current && !historyWindows.current[0]) {
      history.scrollTop = history.scrollHeight; setNewMessages(0)
    } else if (BigInt(last) > BigInt(newest.current)) {
      const count = messages.filter(m => BigInt(m.sequence) > BigInt(newest.current) && m.senderId !== userId).length
      setNewMessages(old => old + count)
    }
    newest.current = last
  }, [messages, pending, active, userId])
  useEffect(() => {
    const input = composer.current
    if (input) { input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 128)}px` }
  }, [draft])
  useEffect(() => {
    const last = messages.at(-1), marker = bottom.current
    if (!active || !ready || !last || !marker || !view.current) return
    const read = () => {
      if (!active || !document.hasFocus() || document.visibilityState !== 'visible' || reading.current || BigInt(last.sequence) <= BigInt(readSequence.current)) return
      const bounds = view.current?.getBoundingClientRect(), rect = marker.getBoundingClientRect()
      if (!bounds || rect.top < bounds.top || rect.bottom > bounds.bottom + 1) return
      reading.current = true
      void chatApi.read(id, last.id).then(() => { readSequence.current = last.sequence; acknowledgeRead?.(id, last.sequence); refresh(id) }).catch(() => {}).finally(() => { reading.current = false })
    }
    const observer = new IntersectionObserver(read, { root: view.current, threshold: 1 })
    observer.observe(marker); window.addEventListener('focus', read); document.addEventListener('visibilitychange', read)
    return () => { observer.disconnect(); window.removeEventListener('focus', read); document.removeEventListener('visibilitychange', read) }
  }, [messages, ready, id, refresh, active, acknowledgeRead])
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
      setMessages(old => mergeMessages(old, [canonical]).slice(-500)); setPending(old => old.filter(p => p.request.clientMessageId !== item.request.clientMessageId)); refresh(id)
    } catch (e) {
      if (!live.current) return
      if (denied(e)) { clear(); return }
      setPending(old => old.map(p => p.request.clientMessageId === item.request.clientMessageId ? { ...p, sending: false, error: chatError(e) } : p))
    }
  }
  const canSend = active && ready && room?.status === 'OPEN' && room.canSend === true
  const canAttach = canSend && env.chatAttachmentsEnabled
  const reactTo = (message: ChatMessage, emoji: string) => {
    if (!canAttach) return
    const mine = message.reactions?.find(r => r.emoji === emoji)?.mine ?? false
    const flip = () => setMessages(old => old.map(m => m.id === message.id ? toggleReaction(m, emoji) : m))
    flip()
    void (mine ? chatApi.unreact(id, message.id, emoji) : chatApi.react(id, message.id, emoji)).catch(e => { if (!live.current) return; if (denied(e)) { clear(); return } flip(); setError(chatError(e)) })
  }
  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return
    const accepted: File[] = []
    for (const file of Array.from(incoming)) { const problem = attachmentError(file); if (problem) { setFileError(`${file.name}: ${problem}`); continue } accepted.push(file) }
    if (accepted.length) { setFiles(old => [...old, ...accepted].slice(0, 10)); setFileError('') }
    if (fileInput.current) fileInput.current.value = ''
  }
  const sendWithAttachments = async (text: string, chosen: File[], replyTo: ChatMessage | null) => {
    setBusy(true); setError('')
    following.current = true; setNewMessages(0)
    try {
      const uploaded = await Promise.all(chosen.map(file => chatApi.uploadAttachment(id, file)))
      if (!live.current || revoked.current) return
      const canonical = await chatApi.send(id, { clientMessageId: crypto.randomUUID(), body: text, ...(replyTo ? { replyToMessageId: replyTo.id } : {}), attachmentFileIds: uploaded.map(a => a.id) })
      if (!live.current || revoked.current) return
      setMessages(old => mergeMessages(old, [canonical]).slice(-500)); refresh(id)
    } catch (e) {
      if (!live.current) return
      if (denied(e)) { clear(); return }
      setError(chatError(e)); setDraft(text); setFiles(chosen); setReply(replyTo)
    } finally { if (live.current) setBusy(false) }
  }
  const submit = () => {
    if (!canSend || busy || draft.length > 4000) return
    if (edit) { if (!draft.trim()) return; void mutate(async () => { await chatApi.edit(id, edit, draft); setEdit(null); setDraft(''); refresh(id) }); return }
    if (!canSubmitMessage(draft, files.length)) return
    if (files.length) { const text = draft, chosen = files, replyTo = reply; setDraft(''); setReply(null); setFiles([]); clearTimeout(typingStop.current); if (connection && state === 'connected') void connection.invoke('SetTyping', id, false).catch(() => {}); void sendWithAttachments(text, chosen, replyTo); return }
    const item: Pending = { request: { clientMessageId: crypto.randomUUID(), body: draft, ...(reply ? { replyToMessageId: reply.id } : {}) }, sending: true }
    following.current = true; setNewMessages(0); if (historyWindows.current[0]) { historyWindows.current = [undefined]; setReload(n => n + 1) } setPending(old => [...old, item]); clearTimeout(typingStop.current); if (connection && state === 'connected') void connection.invoke('SetTyping', id, false).catch(() => {}); setDraft(''); setReply(null); void send(item)
  }
  return <section className="chat-main" aria-label="Nội dung trò chuyện" hidden={!active}>
    <header className="chat-header"><Link to="/messages">Quay lại</Link><div><h2>{room?.title || 'Cuộc trò chuyện'}</h2><p>{!ready ? 'Đang xác minh quyền và kết nối' : canSend ? room?.kind === 'DIRECT' ? 'Trao đổi riêng trong phạm vi được phép' : room?.kind === 'TEAM' ? 'Nhóm sinh viên trong team' : 'Sinh viên và người hướng dẫn đồ án' : 'Chỉ đọc · không thể gửi, sửa hoặc thu hồi'}</p><p className="chat-mobile-connection" role="status">{chatConnectionLabel(state)}</p></div></header>
    {error && <p role="alert" className="chat-error">{error} <button onClick={() => { revoked.current = false; setReload(n => n + 1) }}>Tải lại</button></p>}
    <details className="chat-members"><summary>Thành viên và trạng thái đã đọc</summary><ul>{members.map(person => <li key={person.userId}>{person.fullName}{online.includes(person.userId) ? ' · Đang kết nối' : ''}{person.userId !== userId && person.lastReadSequence && messages.some(m => m.senderId === userId && BigInt(m.sequence) <= BigInt(person.lastReadSequence!)) ? ' · Đã đọc tin của bạn' : ''}</li>)}</ul>
      {memberCursor && <button disabled={busy} onClick={() => void mutate(async () => { const page = await chatApi.members(id, memberCursor); if (!live.current || revoked.current) return; setMembers(old => [...old, ...page.items]); setMemberCursor(page.nextCursor) })}>Xem thêm thành viên</button>}</details>
    <div className="chat-history" ref={view} onScroll={() => { const history = view.current; if (history) { following.current = history.scrollHeight - history.scrollTop - history.clientHeight < 64; if (following.current) setNewMessages(0) } }} tabIndex={0} aria-label="Lịch sử tin nhắn" aria-busy={!ready}>
      {!ready && !error && <p role="status">Đang tải cuộc trò chuyện…</p>}
      {cursor && <button disabled={!ready || busy} onClick={() => void mutate(async () => { const history = view.current; const page = await chatApi.messages(id, cursor); if (!revoked.current && live.current) { historyWindows.current = [...historyWindows.current, cursor].slice(-10); following.current = false; if (history) { const anchor = [...history.querySelectorAll<HTMLElement>('[data-message-id]')].find(element => element.getBoundingClientRect().bottom > history.getBoundingClientRect().top); restoreScroll.current = { height: history.scrollHeight, top: history.scrollTop, anchorId: anchor?.dataset.messageId, anchorTop: anchor?.getBoundingClientRect().top } } setMessages(old => mergeMessages(old, page.items).slice(0, 500)); setCursor(page.nextCursor) } })}>Xem tin trước</button>}
      {ready && !messages.length && <p>Chưa có tin nhắn. Bắt đầu cuộc trao đổi.</p>}
      {messages.map((message, index) => <div className="chat-message-group" key={message.id}>
        {(!index || chatDay(messages[index - 1].createdAt) !== chatDay(message.createdAt)) && <p className="chat-date">{chatDay(message.createdAt)}</p>}
        <article data-message-id={message.id} className={message.senderId === userId ? 'own' : ''}><div>{(!index || messages[index - 1].senderId !== message.senderId || chatDay(messages[index - 1].createdAt) !== chatDay(message.createdAt)) && <strong>{message.senderName}</strong>}<time dateTime={utcDate(message.createdAt).toISOString()}>{chatTime(message.createdAt)}</time></div>
        {message.reply && <blockquote><button type="button" disabled={message.reply.unavailable} onClick={() => { const target = [...(view.current?.querySelectorAll<HTMLElement>('[data-message-id]') ?? [])].find(element => element.dataset.messageId === message.reply?.id); if (target) { target.scrollIntoView({ block: 'center', behavior: 'auto' }); target.focus() } }}>{message.reply.unavailable ? 'Tin nhắn gốc không còn khả dụng' : message.reply.body}</button></blockquote>}
        <p>{message.recalledAt ? 'Tin nhắn đã thu hồi' : <ChatMessageContent body={message.body || ''} />}</p>{!message.recalledAt && message.attachments?.length ? <ChatAttachments attachments={message.attachments} /> : null}<small className="chat-delivery">{message.senderId === userId && !message.recalledAt ? members.some(person => person.userId !== userId && person.lastReadSequence && BigInt(person.lastReadSequence) >= BigInt(message.sequence)) ? 'Đã đọc' : 'Đã gửi' : ''}</small>{message.editedAt && !message.recalledAt && <small>Đã chỉnh sửa</small>}
        {!message.recalledAt && <ChatReactionBar reactions={message.reactions ?? []} canReact={canAttach} onToggle={emoji => reactTo(message, emoji)} />}
        {canSend && !message.recalledAt && <div className="chat-message-actions"><button onClick={() => { setReply(message); setEdit(null); composer.current?.focus() }}>Trả lời</button>{message.canEdit && <button onClick={() => { setEdit(message); setReply(null); setDraft(message.body || ''); composer.current?.focus() }}>Sửa</button>}{message.canRecall && <button onClick={() => setRecall(message)}>Thu hồi</button>}</div>}
      </article></div>)}
      {pending.map(item => <article className="own chat-pending" key={item.request.clientMessageId}><p>{item.request.body}</p><small>{item.sending ? 'Đang gửi...' : item.error}</small>{!item.sending && <button disabled={!canSend} onClick={() => void send(item)}>Gửi lại</button>}</article>)}
      <div ref={bottom} style={{ height: 2 }} />
    </div>
    <button className="chat-jump" onClick={() => { following.current = true; setNewMessages(0); if (historyWindows.current.length > 1 || historyWindows.current[0]) { historyWindows.current = [undefined]; setReload(n => n + 1) } if (view.current) view.current.scrollTop = view.current.scrollHeight }}>{newMessages ? `${newMessages} tin mới ↓` : 'Tin mới nhất'}</button>
    <div role="status" className="chat-typing">{Object.keys(typing).length ? `${members.find(person => person.userId === Object.keys(typing)[0])?.fullName || 'Có người'}${Object.keys(typing).length > 1 ? ` và ${Object.keys(typing).length - 1} người khác` : ''} đang nhập…` : ''}</div>
    {ready && !canSend && <p className="chat-readonly" role="status">Cuộc trò chuyện chỉ đọc theo trạng thái và quyền do hệ thống xác nhận.</p>}
    {recall && <div className="chat-confirm" role="group" aria-label="Xác nhận thu hồi"><p>Thu hồi tin nhắn này?</p><button disabled={!canSend || busy} onClick={() => void mutate(async () => { await chatApi.recall(id, recall); setRecall(null); refresh(id) })}>Xác nhận thu hồi</button><button onClick={() => setRecall(null)}>Hủy</button></div>}
    <form className="chat-compose" onSubmit={e => { e.preventDefault(); submit() }}>
      {(reply || edit) && <div className="chat-reply-draft"><span>{edit ? 'Đang sửa tin nhắn' : `Trả lời ${reply?.senderName}: ${(reply?.body || '').slice(0, 120)}`}</span><button type="button" onClick={() => { setReply(null); if (edit) setDraft(''); setEdit(null) }}>Hủy</button></div>}
      {canAttach && files.length > 0 && <ul className="chat-compose-files">{files.map((file, index) => <li key={`${file.name}-${index}`}><span>{file.name} · {formatBytes(file.size)}</span><button type="button" aria-label={`Bỏ tệp ${file.name}`} onClick={() => setFiles(old => old.filter((_, i) => i !== index))}>✕</button></li>)}</ul>}
      {fileError && <p className="chat-error" role="alert">{fileError}</p>}
      <label>Tin nhắn<textarea ref={composer} value={draft} disabled={!canSend} rows={2} maxLength={4000} placeholder={canSend ? 'Viết tin nhắn...' : 'Hiện không thể gửi tin'} onChange={e => { setDraft(e.target.value); clearTimeout(typingStop.current); if (connection && state === 'connected') typingStop.current = setTimeout(() => { void connection.invoke('SetTyping', id, false).catch(() => {}) }, 2500); if (connection && state === 'connected' && Date.now() - lastTyping.current >= 3000) { lastTyping.current = Date.now(); void connection.invoke('SetTyping', id, true).catch(() => {}) } }} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit() } }} /></label>
      <div className="chat-compose-footer">{canAttach && !edit ? <button type="button" className="chat-attach-button" aria-label="Đính kèm tệp hoặc ảnh" disabled={busy} onClick={() => fileInput.current?.click()}><span className="material-symbols-outlined" aria-hidden="true">attach_file</span></button> : null}{canAttach && !edit ? <input ref={fileInput} type="file" multiple hidden onChange={e => addFiles(e.target.files)} /> : null}<small>Shift + Enter để xuống dòng · {draft.length}/4000</small><button type="submit" disabled={!canSend || busy || (edit ? !draft.trim() : !canSubmitMessage(draft, files.length))}>{edit ? 'Lưu sửa' : 'Gửi'}</button></div>
    </form>
  </section>
}
