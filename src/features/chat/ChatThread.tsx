import { getUploadPolicy, validateUploadFile } from '../../services/api/upload-policies.api'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BackLink } from '../../components/ui/BackLink'
import { HttpError } from '../../services/http/http-client'
import { useChat } from './ChatProvider'
import { chatApi, mergeMessages, type ChatAiAssistResult, type ChatAiSuggestedMeeting, type ChatAiSummary, type ChatConversation, type ChatMessage, type ChatPerson, type SendMessage } from './chat-api'
import { chatDay, chatTime, utcDate } from './chat-view'
import { ChatMessageContent } from './ChatMessageContent'
import { ChatAttachments } from './ChatAttachments'
import { ChatReactionBar } from './ChatReactionBar'
import { ChatMessageMenu } from './ChatMessageMenu'
import { attachmentError, canSubmitMessage, formatBytes, MAX_ATTACHMENTS_PER_MESSAGE, toggleReaction } from './chat-attachments'
import { chatConnectionLabel } from './chat-events'
import { env } from '../../app/config/env'
import { Modal } from '../../components/ui/Modal'

const initials = (name: string) => name.trim().split(/\s+/).slice(-2).map(part => part[0]?.toUpperCase() ?? '').join('') || '?'

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
  const navigate = useNavigate()
  const location = useLocation()
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
  const [isFollowing, setIsFollowing] = useState(true)
  const [aiSummary, setAiSummary] = useState<ChatAiSummary | null>(null)
  const [aiPanelOpen, setAiPanelOpen] = useState(false)
  const [aiTab, setAiTab] = useState<'SUMMARY' | 'ASK' | 'REPLY'>('SUMMARY')
  const [aiMessageCount, setAiMessageCount] = useState(40)
  const [aiQuery, setAiQuery] = useState('')
  const [aiAssist, setAiAssist] = useState<ChatAiAssistResult | null>(null)
  const [quickReplies, setQuickReplies] = useState<string[]>([])
  const [quickRepliesLabel, setQuickRepliesLabel] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState('')
  const [copiedSummary, setCopiedSummary] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [readersFor, setReadersFor] = useState<ChatMessage | null>(null)
  const clear = () => {
    revoked.current = true; setReady(false); setRoom(null); setMessages([]); setMembers([]); setPending([]); setDraft(''); setReply(null); setEdit(null); setRecall(null); setReadersFor(null); setOnline([]); setTyping({}); setAiSummary(null); setAiPanelOpen(false); setAiAssist(null); setQuickReplies([]); setAiError('')
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
    if (!input) return
    input.style.height = 'auto'
    const nextHeight = Math.min(input.scrollHeight, 120)
    input.style.height = draft ? `${nextHeight}px` : ''
    input.style.overflowY = draft && input.scrollHeight > 120 ? 'auto' : 'hidden'
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
    const already = message.reactions?.find(r => r.emoji === emoji)?.reactedByMe ?? false
    const flip = () => setMessages(old => old.map(m => m.id === message.id ? toggleReaction(m, emoji) : m))
    flip()
    void (already ? chatApi.unreact(id, message.id, emoji) : chatApi.react(id, message.id, emoji))
      .then(canonical => { if (!live.current || revoked.current) return; setMessages(old => mergeMessages(old, [canonical]).slice(-500)) })
      .catch(e => { if (!live.current) return; if (denied(e)) { clear(); return } flip(); setError(chatError(e)) })
  }
  const addFiles = async (incoming: FileList | null) => {
    if (!incoming) return
    const accepted: File[] = []
    const picked = Array.from(incoming)
    const policy = await getUploadPolicy('CHAT_ATTACHMENT').catch(() => null)
    if (!live.current || revoked.current) return
    for (const file of picked) { const problem = attachmentError(file) ?? validateUploadFile(file, policy); if (problem) { setFileError(`${file.name}: ${problem}`); continue } accepted.push(file) }
    if (accepted.length) { setFiles(old => [...old, ...accepted].slice(0, MAX_ATTACHMENTS_PER_MESSAGE)); setFileError('') }
    if (fileInput.current) fileInput.current.value = ''
  }
  const sendWithAttachments = async (text: string, chosen: File[], replyTo: ChatMessage | null) => {
    setBusy(true); setError('')
    following.current = true; setNewMessages(0)
    try {
      const uploaded = await Promise.all(chosen.map(file => chatApi.uploadAttachment(id, file)))
      if (!live.current || revoked.current) return
      const canonical = await chatApi.send(id, { clientMessageId: crypto.randomUUID(), body: text.trim() ? text : null, ...(replyTo ? { replyToMessageId: replyTo.id } : {}), attachmentIds: uploaded.map(a => a.id) })
      if (!live.current || revoked.current) return
      setMessages(old => mergeMessages(old, [canonical]).slice(-500)); refresh(id)
    } catch (e) {
      if (!live.current) return
      if (denied(e)) { clear(); return }
      setError(chatError(e)); setDraft(text); setFiles(chosen); setReply(replyTo)
    } finally { if (live.current) setBusy(false) }
  }
  const isMuted = !!room?.mutedUntil && Date.parse(room.mutedUntil) > (room ? Date.now() : 0)
  const [mutePending, setMutePending] = useState(false)
  const setMute = (mutedUntil: string | null) => {
    setMutePending(true)
    chatApi.mute(id, mutedUntil)
      .then(updated => { if (!live.current || revoked.current) return; setRoom(updated) })
      .catch(e => { if (!live.current) return; if (denied(e)) { clear(); return } setError(chatError(e)) })
      .finally(() => { if (live.current) setMutePending(false) })
  }
  const submit = () => {
    if (!canSend || busy || draft.length > 4000) return
    if (edit) { if (!draft.trim()) return; void mutate(async () => { await chatApi.edit(id, edit, draft); setEdit(null); setDraft(''); refresh(id) }); return }
    if (!canSubmitMessage(draft, files.length)) return
    if (files.length) { const text = draft, chosen = files, replyTo = reply; setDraft(''); setReply(null); setFiles([]); clearTimeout(typingStop.current); if (connection && state === 'connected') void connection.invoke('SetTyping', id, false).catch(() => {}); void sendWithAttachments(text, chosen, replyTo); return }
    const item: Pending = { request: { clientMessageId: crypto.randomUUID(), body: draft, ...(reply ? { replyToMessageId: reply.id } : {}) }, sending: true }
    following.current = true; setNewMessages(0); if (historyWindows.current[0]) { historyWindows.current = [undefined]; setReload(n => n + 1) } setPending(old => [...old, item]); clearTimeout(typingStop.current); if (connection && state === 'connected') void connection.invoke('SetTyping', id, false).catch(() => {}); setDraft(''); setReply(null); void send(item)
  }
  const summarizeChat = async (customCount?: number) => {
    if (aiBusy || !ready) return
    setQuickReplies([])
    setAiPanelOpen(true); setAiTab('SUMMARY'); setAiBusy(true); setAiError('')
    try {
      const result = customCount ? await chatApi.aiSummary(id, customCount) : await chatApi.aiSummary(id)
      setAiSummary(result)
    }
    catch { setAiError('Chưa thể phân tích cuộc trò chuyện. Hãy thử lại sau.') }
    finally { setAiBusy(false) }
  }
  const runChatAssist = async (mode: 'SUGGEST_REPLIES' | 'POLISH_DRAFT' | 'ASK_THREAD', explicitQuery?: string) => {
    if (aiBusy || !ready) return
    const q = (explicitQuery ?? aiQuery).trim()
    if (mode === 'ASK_THREAD' && !q) { setAiError('Nhập câu hỏi cần tìm trên lịch sử cuộc trò chuyện.'); return }
    if (mode === 'POLISH_DRAFT' && !draft.trim()) { setAiError('Nhập nội dung bản nháp trước khi nhờ AI viết lại.'); return }
    setAiBusy(true); setAiError('')
    try {
      const res = await chatApi.aiAssist(id, {
        mode,
        ...(mode === 'ASK_THREAD' ? { query: q } : {}),
        ...(mode === 'POLISH_DRAFT' ? { draftText: draft.trim() } : {}),
        messageCount: aiMessageCount,
      })
      setAiAssist(res)
      if (mode === 'SUGGEST_REPLIES' && res.suggestions.length) {
        if (!aiPanelOpen || aiTab !== 'REPLY') {
          setAiPanelOpen(false); setAiSummary(null)
          setQuickReplies(res.suggestions); setQuickRepliesLabel('AI gợi ý trả lời nhanh')
        }
      } else if (mode === 'POLISH_DRAFT' && res.suggestions.length) {
        if (!aiPanelOpen || aiTab !== 'REPLY') {
          setAiPanelOpen(false); setAiSummary(null)
          setQuickReplies(res.suggestions); setQuickRepliesLabel('Chọn phiên bản viết lại từ AI')
        }
      } else if (mode === 'ASK_THREAD') {
        setQuickReplies([])
        setAiPanelOpen(true); setAiTab('ASK')
      }
    } catch {
      setAiError('Chưa thể nhận phản hồi AI lúc này. Hãy thử lại sau.')
    } finally { setAiBusy(false) }
  }
  const applySuggestion = (text: string) => {
    setDraft(text)
    setQuickReplies([])
    composer.current?.focus()
  }
  const copySummaryText = async () => {
    if (!aiSummary) return
    const lines = [
      `Tóm tắt cuộc trò chuyện (${room?.title || 'Chat'}):`,
      aiSummary.summary,
      ...(aiSummary.decisions.length ? ['', 'Quyết định:', ...aiSummary.decisions.map(d => `- ${d}`)] : []),
      ...(aiSummary.blockers?.length ? ['', 'Vướng mắc:', ...aiSummary.blockers.map(b => `- ${b}`)] : []),
      ...(aiSummary.openQuestions.length ? ['', 'Cần làm rõ:', ...aiSummary.openQuestions.map(q => `- ${q}`)] : []),
      ...(aiSummary.actionItems.length ? ['', 'Việc cần làm:', ...aiSummary.actionItems.map(a => `- ${a.title}${a.ownerName ? ` (${a.ownerName})` : ''}`)] : []),
    ]
    try {
      await navigator.clipboard?.writeText(lines.join('\n'))
      setCopiedSummary(true)
      window.setTimeout(() => setCopiedSummary(false), 1800)
    } catch { /* ignore */ }
  }
  const projectRouteBase = () => {
    const supervisor = location.pathname.match(/^\/supervisor\/projects\/\d+/)
    const mentor = location.pathname.match(/^\/mentor\/projects\/\d+\/majors\/\d+/)
    return supervisor ? supervisor[0] : mentor ? mentor[0] : '/project'
  }
  const handleActionItem = (item: ChatAiSummary['actionItems'][number]) => {
    const projectId = Number(room?.projectId)
    if (!Number.isSafeInteger(projectId) || projectId <= 0) return
    navigate(`${projectRouteBase()}/tasks`, { state: { assistantDraft: {
      projectId, kind: 'TASK', title: item.title,
      description: 'Bản nháp được trích từ cuộc trò chuyện. Kiểm tra lại trước khi lưu.',
      task: { dueAt: item.dueAt ?? null, priority: null, milestoneTitle: '', assigneeNames: item.ownerName ? [item.ownerName] : [], primaryMajorName: '' },
    } } })
  }
  const handleSuggestedMeeting = (meeting: ChatAiSuggestedMeeting) => {
    const projectId = Number(room?.projectId)
    if (!Number.isSafeInteger(projectId) || projectId <= 0) return
    navigate(`${projectRouteBase()}/meetings/new`, { state: { assistantDraft: {
      projectId, kind: 'MEETING', title: meeting.title,
      description: [meeting.description, meeting.suggestedTimeNote ? `Ghi chú thời gian từ chat: ${meeting.suggestedTimeNote}` : ''].filter(Boolean).join('\n'),
    } } })
  }
  const canCreateTaskDraft = !!room?.projectId && !location.pathname.startsWith('/department/')
  const openSourceMessage = (messageId: string) => {
    const target = [...(view.current?.querySelectorAll<HTMLElement>('[data-message-id]') ?? [])].find(element => element.dataset.messageId === messageId)
    if (target) { target.scrollIntoView({ block: 'center', behavior: 'smooth' }); target.focus() }
  }
  const closeAiStudio = () => { setAiSummary(null); setAiPanelOpen(false); setAiAssist(null) }
  const aiStudioOpen = aiPanelOpen || !!aiSummary
  const readers = (message: ChatMessage) => members.filter(person => person.userId !== userId && person.lastReadSequence && BigInt(person.lastReadSequence) >= BigInt(message.sequence))
  return <section className="chat-main" aria-label="Nội dung trò chuyện" hidden={!active}>
    <header className="chat-header"><BackLink fallback="/messages" className="chat-thread-back"><span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>Quay lại</BackLink><div><h2 title={room?.title}>{room?.title || 'Cuộc trò chuyện'}{isMuted && <span className="chat-muted-badge" aria-label="Đã tắt thông báo"> 🔇</span>}</h2><p>{!ready ? 'Đang xác minh quyền và kết nối' : canSend ? room?.kind === 'DIRECT' ? 'Trao đổi riêng' : room?.kind === 'TEAM' ? `Nhóm sinh viên · ${members.length} thành viên` : `Nhóm đồ án · ${members.length} thành viên` : 'Chỉ đọc · không thể gửi, sửa hoặc thu hồi'}</p><p className="chat-mobile-connection" role="status">{chatConnectionLabel(state)}</p></div>
      <button type="button" className={`chat-ai-summary-button${aiStudioOpen && !aiBusy ? ' is-open' : ''}`} disabled={!ready || aiBusy} onClick={() => aiStudioOpen ? closeAiStudio() : void summarizeChat()} title={aiStudioOpen ? 'Đóng bảng phân tích AI' : 'Tóm tắt, hỏi đáp đoạn chat và trích việc cần làm'}><span className="material-symbols-outlined" aria-hidden="true">{aiStudioOpen && !aiBusy ? 'close' : 'auto_awesome'}</span>{aiBusy ? 'Đang phân tích…' : aiStudioOpen ? 'Đóng AI' : 'Hỏi AI'}</button>
    </header>
    <details className="chat-info">
      <summary>
        <span className="chat-info-summary-label">
          <span className="material-symbols-outlined" aria-hidden="true">info</span>
          <span>Thông tin cuộc trò chuyện</span>
        </span>
        <span className="chat-info-summary-meta">
          {members.length > 0 && <span>{online.length > 0 ? `${online.length} trực tuyến · ` : ''}{members.length} thành viên</span>}
          <span className="material-symbols-outlined chat-info-chevron" aria-hidden="true">expand_more</span>
        </span>
      </summary>
      <div className="chat-info-content">
        {ready && room && <div className="chat-info-card">
          <div className="chat-mute-control">
            <span className="chat-mute-label">
              <span className="material-symbols-outlined" aria-hidden="true">{isMuted ? 'notifications_off' : 'notifications_active'}</span>
              <label htmlFor={`chat-mute-${id}`}>Thông báo</label>
            </span>
            <select id={`chat-mute-${id}`} value={isMuted ? 'muted' : 'on'} disabled={mutePending} onChange={e => { if (e.target.value === 'muted') return; setMute(e.target.value === 'on' ? null : new Date(Date.now() + Number(e.target.value) * 3_600_000).toISOString()) }}>
              <option value="on">Đang nhận</option>
              {isMuted && <option value="muted">Đang tắt đến {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(room.mutedUntil!))}</option>}
              <option value="1">Tắt 1 giờ</option>
              <option value="8">Tắt 8 giờ</option>
              <option value="24">Tắt 1 ngày</option>
              <option value="168">Tắt 1 tuần</option>
            </select>
          </div>
        </div>}
        <div className="chat-members chat-info-card">
          <div className="chat-members-head">
            <h3>Thành viên ({members.length})</h3>
            {online.length > 0 && <span className="chat-online-count">{online.length} đang kết nối</span>}
          </div>
          <ul className="chat-member-rows">{members.map(person => {
            const isOnline = online.includes(person.userId)
            const hasRead = person.userId !== userId && !!person.lastReadSequence && messages.some(m => m.senderId === userId && BigInt(m.sequence) <= BigInt(person.lastReadSequence!))
            return <li key={person.userId} className="chat-member-row">
              <span className={`chat-member-avatar${isOnline ? ' is-online' : ''}`} aria-hidden="true">{initials(person.fullName)}</span>
              <div className="chat-member-meta">
                <div className="chat-member-name-row">
                  <span className="chat-member-name">{person.fullName}</span>
                  {person.userId === userId && <span className="chat-member-self">Bạn</span>}
                </div>
                <div className="chat-member-badges">
                  <span className={`chat-member-badge${isOnline ? ' is-online' : ''}`}>{isOnline ? 'Đang kết nối' : 'Ngoại tuyến'}</span>
                  {hasRead && <span className="chat-member-badge is-read">Đã đọc tin của bạn</span>}
                </div>
              </div>
            </li>
          })}</ul>
          {memberCursor && <button type="button" className="chat-members-more" disabled={busy} onClick={() => void mutate(async () => { const page = await chatApi.members(id, memberCursor); if (!live.current || revoked.current) return; setMembers(old => [...old, ...page.items]); setMemberCursor(page.nextCursor) })}>Xem thêm thành viên</button>}
        </div>
      </div>
    </details>
    {aiError && <p role="alert" className="chat-error">{aiError}</p>}
    {aiStudioOpen && <aside className="chat-ai-summary" aria-label="Tóm tắt cuộc trò chuyện">
      <div className="chat-ai-studio-head">
        <div className="chat-ai-summary-heading">
          <span className="chat-ai-studio-title"><span className="material-symbols-outlined" aria-hidden="true">auto_awesome</span><strong>{aiTab === 'SUMMARY' ? 'Tóm tắt AI' : aiTab === 'ASK' ? 'Hỏi đáp đoạn chat' : 'Gợi ý & Viết lại AI'}</strong></span>
          <div className="chat-ai-summary-controls">
            <select aria-label="Số tin nhắn phân tích" value={aiMessageCount} disabled={aiBusy} onChange={e => setAiMessageCount(Number(e.target.value))}>
              <option value={20}>20 tin</option>
              <option value={40}>40 tin</option>
              <option value={80}>80 tin</option>
            </select>
            <button type="button" className="chat-ai-close-btn" onClick={closeAiStudio} aria-label="Đóng tóm tắt" title="Đóng bảng AI">×</button>
          </div>
        </div>
        <div className="chat-ai-tabs" role="tablist" aria-label="Công cụ AI trong phòng chat">
          <button type="button" role="tab" aria-selected={aiTab === 'SUMMARY'} onClick={() => setAiTab('SUMMARY')}>Tóm tắt & Việc</button>
          <button type="button" role="tab" aria-selected={aiTab === 'ASK'} onClick={() => setAiTab('ASK')}>Hỏi đoạn chat</button>
          <button type="button" role="tab" aria-selected={aiTab === 'REPLY'} onClick={() => setAiTab('REPLY')}>Gợi ý & Viết lại</button>
        </div>
      </div>
      <div className="chat-ai-studio-body">
        <p role="note" className="chat-ai-note">Phản hồi chỉ có giá trị tham khảo/tư vấn, không thay thế quyết định học vụ</p>
        {aiTab === 'SUMMARY' && (
          <div className="chat-ai-tab-body">
            {aiBusy && !aiSummary && <p role="status" className="chat-ai-loading">Đang phân tích {aiMessageCount} tin nhắn gần nhất…</p>}
            {aiSummary && <>
              <p className="chat-ai-summary-text">{aiSummary.summary}</p>
              {!!aiSummary.decisions.length && <div className="chat-ai-block"><h3>Quyết định đã chốt</h3><ul>{aiSummary.decisions.map((item, i) => <li key={i}>{item}</li>)}</ul></div>}
              {!!aiSummary.blockers?.length && <div className="chat-ai-block is-warning"><h3>Vướng mắc cần gỡ</h3><ul>{aiSummary.blockers.map((item, i) => <li key={i}>{item}</li>)}</ul></div>}
              {!!aiSummary.openQuestions.length && <div className="chat-ai-block"><h3>Cần làm rõ</h3><ul>{aiSummary.openQuestions.map((item, i) => <li key={i}>{item}</li>)}</ul></div>}
              {!!aiSummary.actionItems.length && <div className="chat-ai-block"><h3>Việc cần làm</h3><ul>{aiSummary.actionItems.map((item, i) => <li key={i}><strong>{item.title}</strong>{item.ownerName ? ` · ${item.ownerName}` : ''}{item.dueAt ? ` · hạn ${new Intl.DateTimeFormat('vi-VN').format(new Date(item.dueAt))}` : ''}<span className="chat-ai-action-links">{item.sourceMessageId && <button type="button" className="chat-ai-action-button" onClick={() => openSourceMessage(item.sourceMessageId!)}>Xem tin gốc</button>}{canCreateTaskDraft && <button type="button" className="chat-ai-action-button" onClick={() => handleActionItem(item)}>Dùng làm bản nháp</button>}</span></li>)}</ul></div>}
              {aiSummary.suggestedMeeting && <div className="chat-ai-meeting-card">
                <div><strong>Gợi ý lịch họp: {aiSummary.suggestedMeeting.title}</strong>{aiSummary.suggestedMeeting.suggestedTimeNote && <small>{aiSummary.suggestedMeeting.suggestedTimeNote}</small>}{aiSummary.suggestedMeeting.description && <p>{aiSummary.suggestedMeeting.description}</p>}</div>
                <span className="chat-ai-action-links">{aiSummary.suggestedMeeting.sourceMessageId && <button type="button" className="chat-ai-action-button" onClick={() => openSourceMessage(aiSummary.suggestedMeeting!.sourceMessageId!)}>Xem tin gốc</button>}{canCreateTaskDraft && <button type="button" className="chat-ai-action-button" onClick={() => handleSuggestedMeeting(aiSummary.suggestedMeeting!)}>Mở tạo lịch họp</button>}</span>
              </div>}
              <div className="chat-ai-footer-bar">
                <button type="button" className="chat-ai-mini-btn" disabled={aiBusy} onClick={() => void summarizeChat(aiMessageCount)}>Phân tích lại</button>
                <button type="button" className="chat-ai-mini-btn" onClick={() => void copySummaryText()}>{copiedSummary ? 'Đã sao chép' : 'Sao chép biên bản'}</button>
                <button type="button" className="chat-ai-mini-btn" onClick={closeAiStudio}>Đóng</button>
              </div>
              <small>Kết quả chỉ mang tính gợi ý. {aiSummary.generationStatus ? `Trạng thái: ${aiSummary.generationStatus === 'COMPLETED' ? 'Hoàn tất' : aiSummary.generationStatus}. ` : ''} {aiSummary.generatedAt ? `Phân tích lúc ${new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(aiSummary.generatedAt))}. ` : ''}Kiểm tra lại trước khi tạo công việc chính thức.</small>
            </>}
            {!aiBusy && !aiSummary && <button type="button" className="chat-ai-primary-btn" onClick={() => void summarizeChat(aiMessageCount)}>Bắt đầu tóm tắt {aiMessageCount} tin gần nhất</button>}
          </div>
        )}
        {aiTab === 'ASK' && (
          <div className="chat-ai-tab-body">
            <div className="chat-ai-ask-chips">
              {['Nhóm đã chốt những gì?', 'Ai đang phụ trách việc nào?', 'Đang có lỗi hoặc vướng mắc gì?'].map(sample => (
                <button key={sample} type="button" disabled={aiBusy} onClick={() => { setAiQuery(sample); void runChatAssist('ASK_THREAD', sample) }}>{sample}</button>
              ))}
            </div>
            <div className="chat-ai-ask-row">
              <input aria-label="Hỏi AI về cuộc trò chuyện" value={aiQuery} maxLength={500} placeholder="Hỏi về quyết định, người phụ trách, tệp đã gửi…" onChange={e => setAiQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void runChatAssist('ASK_THREAD') } }} />
              <button type="button" className="chat-ai-primary-btn" disabled={aiBusy || !aiQuery.trim()} onClick={() => void runChatAssist('ASK_THREAD')}>{aiBusy ? 'Đang tìm…' : 'Hỏi'}</button>
            </div>
            {aiAssist?.mode === 'ASK_THREAD' && <div className="chat-ai-answer-box">
              <p>{aiAssist.answer}</p>
              {!!aiAssist.references.length && <div className="chat-ai-refs"><strong>Trích dẫn từ cuộc trò chuyện</strong><ul>{aiAssist.references.map((ref, i) => <li key={i}><span><b>{ref.senderName}:</b> {ref.excerpt}</span><button type="button" className="chat-ai-action-button" onClick={() => openSourceMessage(ref.messageId)}>Xem tin gốc</button></li>)}</ul></div>}
              {!!aiAssist.suggestions.length && <div className="chat-ai-suggestion-list">{aiAssist.suggestions.map((s, i) => <button key={i} type="button" onClick={() => applySuggestion(s)}>{s}</button>)}</div>}
            </div>}
          </div>
        )}
        {aiTab === 'REPLY' && (
          <div className="chat-ai-tab-body">
            <div className="chat-ai-reply-actions">
              <button type="button" className="chat-ai-primary-btn" disabled={aiBusy || !messages.length} onClick={() => void runChatAssist('SUGGEST_REPLIES')}>Gợi ý 3 câu trả lời nhanh</button>
              <button type="button" className="chat-ai-mini-btn" disabled={aiBusy || !draft.trim()} onClick={() => void runChatAssist('POLISH_DRAFT')}>Viết lại bản nháp lịch sự</button>
            </div>
            {!aiAssist && !!aiSummary?.smartReplies?.length && <div className="chat-ai-answer-box">
              <p className="chat-ai-assist-note">Gợi ý phản hồi nhanh từ lần tóm tắt gần nhất:</p>
              <div className="chat-ai-suggestion-list">{aiSummary.smartReplies.map((s, i) => <button key={i} type="button" onClick={() => applySuggestion(s)} title="Bấm để chèn vào ô soạn tin">{s}</button>)}</div>
            </div>}
            {aiAssist && (aiAssist.mode === 'SUGGEST_REPLIES' || aiAssist.mode === 'POLISH_DRAFT') && <div className="chat-ai-answer-box">
              {aiAssist.answer && <p className="chat-ai-assist-note">{aiAssist.answer}</p>}
              <div className="chat-ai-suggestion-list">{aiAssist.suggestions.map((s, i) => <button key={i} type="button" onClick={() => applySuggestion(s)} title="Bấm để chèn vào ô soạn tin">{s}</button>)}</div>
            </div>}
          </div>
        )}
      </div>
    </aside>}
    {error && <p role="alert" className="chat-error">{error} <button onClick={() => { revoked.current = false; setReload(n => n + 1) }}>Tải lại</button></p>}
    <div className="chat-history" ref={view} onScroll={() => { const history = view.current; if (history) { following.current = history.scrollHeight - history.scrollTop - history.clientHeight < 64; if (following.current) { setNewMessages(0); setIsFollowing(true); } else { setIsFollowing(false); } } }} tabIndex={0} aria-label="Lịch sử tin nhắn" aria-busy={!ready}>
      {!ready && !error && <p role="status">Đang tải cuộc trò chuyện…</p>}
      {cursor && <button disabled={!ready || busy} onClick={() => void mutate(async () => { const history = view.current; const page = await chatApi.messages(id, cursor); if (!revoked.current && live.current) { historyWindows.current = [...historyWindows.current, cursor].slice(-10); following.current = false; if (history) { const anchor = [...history.querySelectorAll<HTMLElement>('[data-message-id]')].find(element => element.getBoundingClientRect().bottom > history.getBoundingClientRect().top); restoreScroll.current = { height: history.scrollHeight, top: history.scrollTop, anchorId: anchor?.dataset.messageId, anchorTop: anchor?.getBoundingClientRect().top } } setMessages(old => mergeMessages(old, page.items).slice(0, 500)); setCursor(page.nextCursor) } })}>Xem tin trước</button>}
      {ready && !messages.length && <p>Chưa có tin nhắn. Bắt đầu cuộc trao đổi.</p>}
      {messages.map((message, index) => <div className="chat-message-group" key={message.id}>
        {(!index || chatDay(messages[index - 1].createdAt) !== chatDay(message.createdAt)) && <p className="chat-date">{chatDay(message.createdAt)}</p>}
        <article data-message-id={message.id} className={message.senderId === userId ? 'own' : ''}>{message.senderId !== userId && (!index || messages[index - 1].senderId !== message.senderId || chatDay(messages[index - 1].createdAt) !== chatDay(message.createdAt)) && <span className="chat-sender-avatar" aria-hidden="true">{initials(message.senderName)}</span>}<div className="chat-message-meta">{(!index || messages[index - 1].senderId !== message.senderId || chatDay(messages[index - 1].createdAt) !== chatDay(message.createdAt)) && <strong>{message.senderName}</strong>}<time dateTime={utcDate(message.createdAt).toISOString()}>{chatTime(message.createdAt)}</time></div>
        {message.reply && <blockquote><button type="button" disabled={message.reply.unavailable} onClick={() => { const target = [...(view.current?.querySelectorAll<HTMLElement>('[data-message-id]') ?? [])].find(element => element.dataset.messageId === message.reply?.id); if (target) { target.scrollIntoView({ block: 'center', behavior: 'auto' }); target.focus() } }}>{message.reply.unavailable ? 'Tin nhắn gốc không còn khả dụng' : message.reply.body}</button></blockquote>}
        <div className="chat-bubble-row">
          <div className="chat-bubble-col">
            <p className="chat-message-bubble">{message.recalledAt ? 'Tin nhắn đã thu hồi' : <ChatMessageContent body={message.body || ''} />}</p>
            {!message.recalledAt && message.attachments?.length ? <ChatAttachments attachments={message.attachments} conversationId={id} messageId={message.id} /> : null}
          </div>
          {!message.recalledAt && canSend && <div className="chat-message-inline-menu">
            <ChatMessageMenu
              onReply={() => { setReply(message); setEdit(null); composer.current?.focus() }}
              onReact={canAttach ? emoji => reactTo(message, emoji) : undefined}
              onEdit={message.canEdit ? () => { setEdit(message); setReply(null); setDraft(message.body || ''); composer.current?.focus() } : undefined}
              onRecall={message.canRecall ? () => setRecall(message) : undefined}
            />
          </div>}
        </div>
        {!message.recalledAt && (message.reactions?.length ?? 0) > 0 && <div className="chat-message-actions">
          <ChatReactionBar reactions={message.reactions ?? []} canReact={canAttach} showPicker={false} onToggle={emoji => reactTo(message, emoji)} />
        </div>}
        {message.senderId === userId && !message.recalledAt && <div className="chat-delivery">{readers(message).length ? <button type="button" className="chat-seen-button" onClick={() => setReadersFor(message)} aria-label={`Xem người đã đọc tin nhắn lúc ${chatTime(message.createdAt)}`}><span>Đã xem</span><span className="chat-seen-avatars" aria-hidden="true">{readers(message).slice(0, 3).map(person => <span key={person.userId} className="chat-seen-avatar">{initials(person.fullName)}</span>)}{readers(message).length > 3 && <span className="chat-seen-more">+{readers(message).length - 3}</span>}</span></button> : <small>Đã gửi</small>}</div>}{message.editedAt && !message.recalledAt && <small className="chat-edited-note">Đã chỉnh sửa</small>}
      </article></div>)}
      {pending.map(item => <article className="own chat-pending" key={item.request.clientMessageId}><p>{item.request.body}</p><small>{item.sending ? 'Đang gửi...' : item.error}</small>{!item.sending && <button disabled={!canSend} onClick={() => void send(item)}>Gửi lại</button>}</article>)}
      <div ref={bottom} style={{ height: 2 }} />
    </div>
    <button className={`chat-jump ${isFollowing && !newMessages ? 'is-hidden' : ''}`} onClick={() => { following.current = true; setIsFollowing(true); setNewMessages(0); if (historyWindows.current.length > 1 || historyWindows.current[0]) { historyWindows.current = [undefined]; setReload(n => n + 1) } if (view.current) view.current.scrollTop = view.current.scrollHeight }}>{newMessages ? `${newMessages} tin mới ↓` : 'Tin mới nhất'}</button>
    <div role="status" className="chat-typing">{Object.keys(typing).length ? `${members.find(person => person.userId === Object.keys(typing)[0])?.fullName || 'Có người'}${Object.keys(typing).length > 1 ? ` và ${Object.keys(typing).length - 1} người khác` : ''} đang nhập…` : ''}</div>
    {ready && !canSend && <p className="chat-readonly" role="status">Cuộc trò chuyện chỉ đọc theo trạng thái và quyền do hệ thống xác nhận.</p>}
    {recall && <div className="chat-confirm" role="group" aria-label="Xác nhận thu hồi"><p>Thu hồi tin nhắn này?</p><button disabled={!canSend || busy} onClick={() => void mutate(async () => { await chatApi.recall(id, recall); setRecall(null); refresh(id) })}>Xác nhận thu hồi</button><button onClick={() => setRecall(null)}>Hủy</button></div>}
    <form
      className={`chat-compose${dragging ? ' is-dragging' : ''}`}
      onSubmit={e => { e.preventDefault(); submit() }}
      onDragOver={e => { if (canAttach && !edit) { e.preventDefault(); setDragging(true) } }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false) }}
      onDrop={e => { e.preventDefault(); setDragging(false); if (canAttach && !edit && e.dataTransfer.files.length) void addFiles(e.dataTransfer.files) }}
    >
      {canSend && !edit && <div className="chat-ai-quickbar" aria-label="Hỗ trợ AI nhanh khi soạn tin">
        <button type="button" disabled={aiBusy || !messages.length} onClick={() => void runChatAssist('SUGGEST_REPLIES')}><span className="material-symbols-outlined" aria-hidden="true">bolt</span>Gợi ý trả lời</button>
        {draft.trim().length >= 5 && <button type="button" disabled={aiBusy} onClick={() => void runChatAssist('POLISH_DRAFT')}><span className="material-symbols-outlined" aria-hidden="true">auto_fix_high</span>Viết lịch sự</button>}
        <button type="button" disabled={aiBusy || !messages.length} onClick={() => { setQuickReplies([]); setAiPanelOpen(true); setAiTab('ASK') }}><span className="material-symbols-outlined" aria-hidden="true">manage_search</span>Hỏi đoạn chat</button>
      </div>}
      {quickReplies.length > 0 && canSend && <div className="chat-quick-replies" aria-label="Câu trả lời gợi ý từ AI">
        <div className="chat-quick-replies-head"><span>{quickRepliesLabel || 'Gợi ý từ AI'}</span><button type="button" aria-label="Ẩn gợi ý trả lời" onClick={() => setQuickReplies([])}>×</button></div>
        <div className="chat-quick-replies-list">{quickReplies.map((text, index) => <button key={index} type="button" onClick={() => applySuggestion(text)}>{text}</button>)}</div>
      </div>}
      {(reply || edit) && <div className="chat-reply-draft"><span>{edit ? 'Đang sửa tin nhắn' : `Trả lời ${reply?.senderName}: ${(reply?.body || '').slice(0, 120)}`}</span><button type="button" onClick={() => { setReply(null); if (edit) setDraft(''); setEdit(null) }}>Hủy</button></div>}
      {canAttach && files.length > 0 && <ul className="chat-compose-files">{files.map((file, index) => <li key={`${file.name}-${index}`}><span>{file.name} · {formatBytes(file.size)}</span><button type="button" aria-label={`Bỏ tệp ${file.name}`} onClick={() => setFiles(old => old.filter((_, i) => i !== index))}>✕</button></li>)}</ul>}
      {fileError && <p className="chat-error" role="alert">{fileError}</p>}
      <div className="chat-compose-row">{canAttach && !edit ? <button type="button" className="chat-attach-button" aria-label="Đính kèm tệp hoặc ảnh" disabled={busy} onClick={() => fileInput.current?.click()}><span className="material-symbols-outlined" aria-hidden="true">add_circle</span></button> : null}{canAttach && !edit ? <input ref={fileInput} type="file" multiple hidden onChange={e => addFiles(e.target.files)} /> : null}<label className="chat-compose-field"><span className="sr-only">Tin nhắn</span><textarea ref={composer} value={draft} aria-label="Tin nhắn" disabled={!canSend} rows={1} maxLength={4000} placeholder={canSend ? 'Nhập tin nhắn… (Ctrl+V dán ảnh)' : 'Hiện không thể gửi tin'} onPaste={e => { if (canAttach && !edit && e.clipboardData.files.length) { e.preventDefault(); void addFiles(e.clipboardData.files) } }} onChange={e => { setDraft(e.target.value); clearTimeout(typingStop.current); if (connection && state === 'connected') typingStop.current = setTimeout(() => { void connection.invoke('SetTyping', id, false).catch(() => {}) }, 2500); if (connection && state === 'connected' && Date.now() - lastTyping.current >= 3000) { lastTyping.current = Date.now(); void connection.invoke('SetTyping', id, true).catch(() => {}) } }} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit() } }} /></label><button className="chat-send-button" type="submit" disabled={!canSend || busy || (edit ? !draft.trim() : !canSubmitMessage(draft, files.length))} aria-label={edit ? 'Lưu sửa' : 'Gửi'}><span className="material-symbols-outlined" aria-hidden="true">send</span></button></div>
      <small className="chat-compose-hint">Shift + Enter để xuống dòng · {draft.length}/4000</small>
    </form>
    <Modal open={readersFor !== null} title="Người đã xem tin nhắn" description={readersFor ? `Tin gửi lúc ${chatTime(readersFor.createdAt)}. Chỉ hiển thị thành viên đã tải từ hệ thống.` : undefined} onClose={() => setReadersFor(null)}>
      <ul className="chat-reader-list">{readersFor && readers(readersFor).map(person => <li key={person.userId}><span className="chat-reader-avatar" aria-hidden="true">{initials(person.fullName)}</span><span>{person.fullName}</span></li>)}</ul>
      {memberCursor && <p className="chat-reader-note">Danh sách thành viên còn trang tiếp theo; mở mục Thành viên để tải thêm.</p>}
    </Modal>
  </section>
}
