import { useContext, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { StudentJourneyContext } from '../../app/context/StudentJourneyContext'
import { useAuthSession } from '../auth/context/useAuthSession'
import { getHomePath } from '../auth/utils/role-access'
import { BackLink } from '../../components/ui/BackLink'
import { env } from '../../app/config/env'
import { getOwnAssignments } from '../../services/api/supervisors.api'
import { useChat } from './ChatProvider'
import { ChatThread, chatError } from './ChatThread'
import { chatApi, type ChatConversation, type ChatPage as Page, type ChatPerson } from './chat-api'
import './chat.css'
import { chatConnectionLabel } from './chat-events'
import { chatTime } from './chat-view'

const emptyPeople: Page<ChatPerson> = { items: [], nextCursor: null, hasMore: false }
export function ChatPage() {
  const { conversationId } = useParams()
  const { session } = useAuthSession()
  const { chatDenied, refresh } = useChat()
  if (!env.chatEnabled) return <p role="status">Tính năng chat chưa được bật.</p>
  if (env.isMockMode) return <p role="status">Chat realtime cần phiên đăng nhập API thật. Chế độ mock không kết nối hoặc gửi tin đến BE.</p>
  if (chatDenied) return <section className="chat-unavailable" role="alert">
    <BackLink fallback={session ? getHomePath(session.user) : '/profile'} className="chat-page-back"><span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>Quay lại không gian làm việc</BackLink>
    <h1>Tin nhắn chưa khả dụng</h1>
    <p>Tài khoản hiện chưa được máy chủ cấp quyền sử dụng chat. Hãy kiểm tra lại sau khi quyền hoặc hồ sơ được cập nhật.</p>
    <button type="button" onClick={() => refresh()}>Kiểm tra lại quyền chat</button>
  </section>
  return <ChatWorkspace key={session?.user.id} id={conversationId} userId={String(session?.user.id)} homePath={session ? getHomePath(session.user) : '/profile'} />
}
function ChatWorkspace({ id, userId, homePath }: { id?: string; userId: string; homePath: string }) {
  const navigate = useNavigate()
  return <div className="chat-shell">
    <ChatConversations id={id} backTo={homePath} onOpen={room => navigate(`/messages/${room.id}`)} />
    {id ? <ChatThread key={id} id={id} userId={userId} /> : <section className="chat-empty"><span className="material-symbols-outlined" aria-hidden="true">forum</span><h2>Cùng nhau trao đổi</h2><p>Chat riêng và nhóm chính thức của team, đồ án.</p></section>}
  </div>
}
export function ChatConversations({ id, onOpen, backTo, compact = false }: { id?: string; onOpen: (room: ChatConversation) => void; backTo?: string; compact?: boolean }) {
  const { session } = useAuthSession()
  const { state, inbox, refresh, inboxError, inboxLoading } = useChat()
  const journey = useContext(StudentJourneyContext)
  const [search, setSearch] = useState('')
  const [people, setPeople] = useState(emptyPeople)
  const [peopleLoading, setPeopleLoading] = useState(true)
  const [peopleError, setPeopleError] = useState('')
  const [peopleRetry, setPeopleRetry] = useState(0)
  const [visibleCount, setVisibleCount] = useState(30)
  const [filter, setFilter] = useState('')
  const [debouncedFilter, setDebouncedFilter] = useState('')
  const [roomTab, setRoomTab] = useState<'ALL' | 'UNREAD' | 'GROUP' | 'DIRECT'>('ALL')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [projects, setProjects] = useState<number[]>([])
  const [assignmentPage, setAssignmentPage] = useState(1)
  const [moreAssignments, setMoreAssignments] = useState(false)
  const isLecturer = session?.user.roles.some(role => role.toUpperCase() === 'LECTURER') === true
  useEffect(() => { const timer = setTimeout(() => { setDebouncedFilter(filter); setVisibleCount(30) }, 250); return () => clearTimeout(timer) }, [filter])
  useEffect(() => {
    const abort = new AbortController()
    setPeople(emptyPeople)
    setPeopleLoading(true); setPeopleError('')
    const timer = setTimeout(() => {
      void chatApi.recipients(search, undefined, abort.signal).then(page => { if (!abort.signal.aborted) setPeople(page) })
        .catch(e => { if (!abort.signal.aborted) setPeopleError(chatError(e)) })
        .finally(() => { if (!abort.signal.aborted) setPeopleLoading(false) })
    }, 300)
    return () => { abort.abort(); clearTimeout(timer) }
  }, [search, peopleRetry])
  useEffect(() => {
    if (!isLecturer) return
    let active = true
    void getOwnAssignments({ status: 'ACTIVE', page: assignmentPage, pageSize: 30 }).then(page => {
      if (!active) return
      setProjects(old => [...new Set([...old, ...page.items.filter(a => !a.endedAt && (a.assignmentType === 'PRIMARY' || a.assignmentType === 'DISCIPLINE_MENTOR')).map(a => a.projectId)])])
      setMoreAssignments(page.page < page.totalPages)
    }).catch(() => { if (active) setError('Chưa tải được đồ án được phân công.') })
    return () => { active = false }
  }, [session?.user.id, isLecturer, assignmentPage])
  const perform = async (action: () => Promise<void>) => {
    if (busy) return
    setBusy(true); setError('')
    try { await action() } catch (e) { setError(chatError(e)) } finally { setBusy(false) }
  }
  const open = (room: ChatConversation) => { refresh(); onOpen(room) }
  const group = (kind: 'teams' | 'projects', source: number) => void perform(async () => open(await chatApi.group(kind, String(source))))
  const unreadRoomsCount = inbox.items.filter(room => room.unreadCount > 0).length
  const rooms = inbox.items.filter(room => {
    if (!room.title.toLocaleLowerCase('vi-VN').includes(debouncedFilter.toLocaleLowerCase('vi-VN'))) return false
    if (roomTab === 'UNREAD') return room.unreadCount > 0
    if (roomTab === 'GROUP') return room.kind === 'PROJECT' || room.kind === 'TEAM'
    if (roomTab === 'DIRECT') return room.kind === 'DIRECT'
    return true
  })
  return <aside className={`chat-sidebar${compact ? ' is-compact' : ''}`} aria-label="Cuộc trò chuyện">
      {!compact && <header className="chat-sidebar-header">
        {backTo && <BackLink fallback={backTo} className="chat-page-back"><span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>Quay lại không gian làm việc</BackLink>}
        <div className="flex items-center justify-between">
          <h1>Tin nhắn</h1>
          <span className={`chat-status-pill ${state === 'connected' ? 'is-connected' : 'is-syncing'}`} title={chatConnectionLabel(state)}>
            <span className="chat-status-dot" aria-hidden="true" />
            {state === 'connected' ? 'Trực tuyến' : 'Đang kết nối'}
          </span>
        </div>
      </header>}
      <div className="chat-sidebar-controls">
        <div className="chat-search-wrap">
          <span className="material-symbols-outlined" aria-hidden="true">search</span>
          <input data-chat-list-focus aria-label="Tìm cuộc trò chuyện" type="search" value={filter} maxLength={100} onChange={e => setFilter(e.target.value)} placeholder="Tìm cuộc trò chuyện…" />
        </div>
        <div className="chat-room-tabs" role="tablist" aria-label="Lọc cuộc trò chuyện">
          <button type="button" role="tab" aria-selected={roomTab === 'ALL'} onClick={() => setRoomTab('ALL')}>Tất cả</button>
          <button type="button" role="tab" aria-selected={roomTab === 'UNREAD'} onClick={() => setRoomTab('UNREAD')}>Chưa đọc{unreadRoomsCount > 0 ? ` (${unreadRoomsCount})` : ''}</button>
          <button type="button" role="tab" aria-selected={roomTab === 'GROUP'} onClick={() => setRoomTab('GROUP')}>Nhóm & Đồ án</button>
          <button type="button" role="tab" aria-selected={roomTab === 'DIRECT'} onClick={() => setRoomTab('DIRECT')}>Cá nhân</button>
        </div>
        <details className="chat-new"><summary><span className="material-symbols-outlined" aria-hidden="true">edit_square</span><span>Cuộc trò chuyện mới</span><span className="material-symbols-outlined chat-new-chevron" aria-hidden="true">expand_more</span></summary>
          <div className="chat-new-body">
            {(journey?.team || journey?.project || projects.length > 0) && <div className="chat-groups">
              {journey?.team && <button disabled={busy} onClick={() => group('teams', journey.team!.id)}><span className="material-symbols-outlined" aria-hidden="true">groups</span>Nhóm {journey.team.name}</button>}
              {journey?.project && <button disabled={busy} onClick={() => group('projects', journey.project!.id)}><span className="material-symbols-outlined" aria-hidden="true">folder_open</span>Đồ án {journey.project.title}</button>}
              {projects.map(project => <button key={project} disabled={busy} onClick={() => group('projects', project)}><span className="material-symbols-outlined" aria-hidden="true">folder_open</span>Nhóm đồ án #{project}</button>)}
              {moreAssignments && <button onClick={() => setAssignmentPage(n => n + 1)}>Thêm đồ án được phân công</button>}
            </div>}
            <label>Tìm người nhận trong đồ án<input value={search} maxLength={100} onChange={e => setSearch(e.target.value)} placeholder="Nhập tên người nhận…" /></label>
            <div className="chat-search-results">{people.items.map(person => <button key={person.userId} disabled={busy} onClick={() => void perform(async () => open(await chatApi.direct(person.userId)))}><span className="chat-person-dot" aria-hidden="true">{person.fullName.trim().split(/\s+/).slice(-2).map(p => p[0]).join('')}</span><span>{person.fullName}</span></button>)}
              {peopleLoading && <p role="status">Đang tìm người nhận…</p>}
              {peopleError && <p role="alert">{peopleError} <button onClick={() => setPeopleRetry(n => n + 1)}>Tìm lại</button></p>}
              {!peopleLoading && !peopleError && !people.items.length && <p>Không có người nhận phù hợp.</p>}
              {people.hasMore && <button disabled={busy} onClick={() => void perform(async () => { const page = await chatApi.recipients(search, people.nextCursor!); setPeople({ ...page, items: [...people.items, ...page.items] }) })}>Thêm người nhận</button>}
            </div>
          </div>
        </details>
      </div>
      {(error || inboxError) && <p className="chat-error" role="alert">{error || inboxError} <button onClick={() => refresh()}>Tải lại</button></p>}
      <nav className="chat-list" aria-label="Hộp thư">{rooms.slice(0, visibleCount).map(room => {
        const kindClass = room.kind === 'PROJECT' ? 'is-project' : room.kind === 'TEAM' ? 'is-team' : 'is-direct'
        return <button type="button" key={room.id} onClick={() => onOpen(room)} className={`${id === room.id ? 'active' : ''}${room.unreadCount > 0 ? ' is-unread' : ''}`.trim()} aria-current={id === room.id ? 'true' : undefined}>
          <span className={`chat-avatar ${kindClass}`} aria-hidden="true">{room.kind === 'DIRECT' ? room.title.trim().split(/\s+/).slice(-2).map(part => part[0]).join('') : <span className="material-symbols-outlined">{room.kind === 'PROJECT' ? 'folder_shared' : 'groups'}</span>}</span>
          <span className="chat-conversation-info">
            <span className="chat-conversation-top">
              <strong>{room.title}{room.mutedUntil && Date.parse(room.mutedUntil) > Date.now() && <span aria-label="Đã tắt thông báo"> 🔇</span>}</strong>
              <time className="chat-room-time">{chatTime(room.updatedAt)}</time>
            </span>
            <span className="chat-conversation-bottom">
              <small className="chat-room-preview">{room.lastMessage?.recalledAt ? 'Tin nhắn đã thu hồi' : room.lastMessage?.body || (room.lastMessage?.attachments?.length ? '📎 Đã gửi tệp đính kèm' : 'Bắt đầu trao đổi')}</small>
              <span className="chat-room-kind">{room.kind === 'TEAM' ? 'Nhóm' : room.kind === 'PROJECT' ? 'Đồ án' : 'Riêng'}</span>
            </span>
          </span>
          {room.unreadCount > 0 && <b aria-label={`${room.unreadCount} tin chưa đọc`}>{room.unreadCount > 99 ? '99+' : room.unreadCount}</b>}
        </button>
      })}
        {inboxLoading && <p role="status">Đang đồng bộ hộp thư…</p>}
        {!inboxLoading && !rooms.length && !inboxError && <p className="chat-list-empty">{debouncedFilter || roomTab !== 'ALL' ? 'Không có cuộc trò chuyện phù hợp bộ lọc hiện tại.' : 'Chọn “Cuộc trò chuyện mới” để bắt đầu.'}</p>}
        {visibleCount < rooms.length && <button onClick={() => setVisibleCount(n => n + 30)}>Cuộc trò chuyện trước</button>}
      </nav>
    </aside>
}
