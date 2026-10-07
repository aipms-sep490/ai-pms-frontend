import { useContext, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { StudentJourneyContext } from '../../app/context/StudentJourneyContext'
import { useAuthSession } from '../auth/context/useAuthSession'
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
  if (!env.chatEnabled) return <p role="status">Tính năng chat chưa được bật.</p>
  if (env.isMockMode) return <p role="status">Chat realtime cần phiên đăng nhập API thật. Chế độ mock không kết nối hoặc gửi tin đến BE.</p>
  return <ChatWorkspace key={session?.user.id} id={conversationId} userId={String(session?.user.id)} />
}
function ChatWorkspace({ id, userId }: { id?: string; userId: string }) {
  const navigate = useNavigate()
  return <div className="chat-shell">
    <ChatConversations id={id} onOpen={room => navigate(`/messages/${room.id}`)} />
    {id ? <ChatThread key={id} id={id} userId={userId} /> : <section className="chat-empty"><span className="material-symbols-outlined" aria-hidden="true">forum</span><h2>Cùng nhau trao đổi</h2><p>Chat riêng và nhóm chính thức của team, đồ án.</p></section>}
  </div>
}
export function ChatConversations({ id, onOpen }: { id?: string; onOpen: (room: ChatConversation) => void }) {
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
  const rooms = inbox.items.filter(room => room.title.toLocaleLowerCase('vi-VN').includes(debouncedFilter.toLocaleLowerCase('vi-VN')))
  return <aside className="chat-sidebar" aria-label="Cuộc trò chuyện">
      <header><h1>Tin nhắn</h1><span role="status">{chatConnectionLabel(state)}</span><p className="chat-scope-note">Trao đổi với thành viên cùng team và người hướng dẫn được phân công trong đồ án.</p></header>
      <details className="chat-new"><summary>Cuộc trò chuyện mới</summary>
        <div className="chat-groups">
          {journey?.team && <button disabled={busy} onClick={() => group('teams', journey.team!.id)}>Nhóm {journey.team.name}</button>}
          {journey?.project && <button disabled={busy} onClick={() => group('projects', journey.project!.id)}>Đồ án {journey.project.title}</button>}
          {projects.map(project => <button key={project} disabled={busy} onClick={() => group('projects', project)}>Nhóm đồ án #{project}</button>)}
          {moreAssignments && <button onClick={() => setAssignmentPage(n => n + 1)}>Thêm đồ án được phân công</button>}
        </div>
        <label>Tìm người cùng nhóm hoặc hướng dẫn<input value={search} maxLength={100} onChange={e => setSearch(e.target.value)} placeholder="Tên người nhận" /></label>
        <div className="chat-search-results">{people.items.map(person => <button key={person.userId} disabled={busy} onClick={() => void perform(async () => open(await chatApi.direct(person.userId)))}>{person.fullName}</button>)}
          {peopleLoading && <p role="status">Đang tìm người nhận được phép…</p>}
          {peopleError && <p role="alert">{peopleError} <button onClick={() => setPeopleRetry(n => n + 1)}>Tìm lại</button></p>}
          {!peopleLoading && !peopleError && !people.items.length && <p>Không có người nhận phù hợp.</p>}
          {people.hasMore && <button disabled={busy} onClick={() => void perform(async () => { const page = await chatApi.recipients(search, people.nextCursor!); setPeople({ ...page, items: [...people.items, ...page.items] }) })}>Thêm người nhận</button>}
        </div>
      </details>
      {(error || inboxError) && <p className="chat-error" role="alert">{error || inboxError} <button onClick={() => refresh()}>Tải lại</button></p>}
      <label className="chat-filter">Tìm cuộc trò chuyện<input data-chat-list-focus value={filter} maxLength={100} onChange={e => setFilter(e.target.value)} placeholder="Tên cuộc trò chuyện" /></label>
      <nav className="chat-list" aria-label="Hộp thư">{rooms.slice(0, visibleCount).map(room => <button type="button" key={room.id} onClick={() => onOpen(room)} className={id === room.id ? 'active' : ''} aria-current={id === room.id ? 'true' : undefined}>
        <span className="chat-avatar" aria-hidden="true">{room.kind === 'DIRECT' ? room.title.trim().split(/\s+/).slice(-2).map(part => part[0]).join('') : <span className="material-symbols-outlined">groups</span>}</span>
        <span className="chat-conversation-info"><strong>{room.title}</strong><small>{room.kind === 'TEAM' ? 'Nhóm sinh viên' : room.kind === 'PROJECT' ? 'Nhóm đồ án' : 'Trao đổi riêng'} · {chatTime(room.updatedAt)}</small><small>{room.lastMessage?.recalledAt ? 'Tin nhắn đã thu hồi' : room.lastMessage?.body || 'Bắt đầu trao đổi'}</small></span>
        {room.unreadCount > 0 && <b aria-label={`${room.unreadCount} tin chưa đọc`}>{room.unreadCount > 99 ? '99+' : room.unreadCount}</b>}
      </button>)}
        {inboxLoading && <p role="status">Đang đồng bộ hộp thư…</p>}
        {!inboxLoading && !rooms.length && !inboxError && <p>Chọn “Cuộc trò chuyện mới” để bắt đầu.</p>}
        {visibleCount < rooms.length && <button onClick={() => setVisibleCount(n => n + 30)}>Cuộc trò chuyện trước</button>}
      </nav>
    </aside>
}
