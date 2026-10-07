import { useContext, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { StudentJourneyContext } from '../../app/context/StudentJourneyContext'
import { useAuthSession } from '../auth/context/useAuthSession'
import { env } from '../../app/config/env'
import { getOwnAssignments } from '../../services/api/supervisors.api'
import { useChat } from './ChatProvider'
import { ChatThread, chatError } from './ChatThread'
import { chatApi, type ChatConversation, type ChatPage as Page, type ChatPerson } from './chat-api'
import './chat.css'

const emptyPeople: Page<ChatPerson> = { items: [], nextCursor: null, hasMore: false }
export function ChatPage() {
  const { conversationId } = useParams()
  const { session } = useAuthSession()
  if (!env.chatEnabled) return <p role="status">Tính năng chat chưa được bật.</p>
  return <ChatWorkspace key={session?.user.id} id={conversationId} userId={String(session?.user.id)} />
}
function ChatWorkspace({ id, userId }: { id?: string; userId: string }) {
  const { session } = useAuthSession()
  const { state, inbox, refresh, inboxError } = useChat()
  const journey = useContext(StudentJourneyContext)
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [people, setPeople] = useState(emptyPeople)
  const [extra, setExtra] = useState<ChatConversation[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [projects, setProjects] = useState<number[]>([])
  const [assignmentPage, setAssignmentPage] = useState(1)
  const [moreAssignments, setMoreAssignments] = useState(false)
  useEffect(() => { setExtra([]); setCursor(inbox.nextCursor) }, [inbox])
  useEffect(() => {
    const abort = new AbortController()
    setPeople(emptyPeople)
    const timer = setTimeout(() => {
      void chatApi.recipients(search, undefined, abort.signal).then(page => { if (!abort.signal.aborted) setPeople(page) })
        .catch(e => { if (!abort.signal.aborted) setError(chatError(e)) })
    }, 300)
    return () => { abort.abort(); clearTimeout(timer) }
  }, [search])
  useEffect(() => {
    if (!session?.user.roles.some(role => role.toUpperCase() === 'LECTURER')) return
    let active = true
    void getOwnAssignments({ status: 'ACTIVE', page: assignmentPage, pageSize: 30 }).then(page => {
      if (!active) return
      setProjects(old => [...new Set([...old, ...page.items.filter(a => !a.endedAt).map(a => a.projectId)])])
      setMoreAssignments(page.page < page.totalPages)
    }).catch(() => { if (active) setError('Chưa tải được đồ án được phân công.') })
    return () => { active = false }
  }, [session?.user.id, assignmentPage])
  const perform = async (action: () => Promise<void>) => {
    if (busy) return
    setBusy(true); setError('')
    try { await action() } catch (e) { setError(chatError(e)) } finally { setBusy(false) }
  }
  const open = (room: ChatConversation) => { refresh(); navigate(`/messages/${room.id}`) }
  const group = (kind: 'teams' | 'projects', source: number) => void perform(async () => open(await chatApi.group(kind, String(source))))
  const rooms = [...new Map([...inbox.items, ...extra].map(room => [room.id, room])).values()]
  return <div className="chat-shell">
    <aside className="chat-sidebar" aria-label="Cuộc trò chuyện">
      <header><h1>Tin nhắn</h1><span role="status">{state === 'connected' ? 'Đã kết nối realtime' : 'Đang chờ kết nối realtime'}</span></header>
      <details className="chat-new"><summary>Cuộc trò chuyện mới</summary>
        <div className="chat-groups">
          {journey?.team && <button disabled={busy} onClick={() => group('teams', journey.team!.id)}>Nhóm {journey.team.name}</button>}
          {journey?.project && <button disabled={busy} onClick={() => group('projects', journey.project!.id)}>Đồ án {journey.project.title}</button>}
          {projects.map(project => <button key={project} disabled={busy} onClick={() => group('projects', project)}>Nhóm đồ án #{project}</button>)}
          {moreAssignments && <button onClick={() => setAssignmentPage(n => n + 1)}>Thêm đồ án được phân công</button>}
        </div>
        <label>Tìm người cùng nhóm hoặc hướng dẫn<input value={search} maxLength={100} onChange={e => setSearch(e.target.value)} placeholder="Tên người nhận" /></label>
        <div className="chat-search-results">{people.items.map(person => <button key={person.userId} disabled={busy} onClick={() => void perform(async () => open(await chatApi.direct(person.userId)))}>{person.fullName}</button>)}
          {!people.items.length && <p>Không có người nhận phù hợp.</p>}
          {people.hasMore && <button disabled={busy} onClick={() => void perform(async () => { const page = await chatApi.recipients(search, people.nextCursor!); setPeople({ ...page, items: [...people.items, ...page.items] }) })}>Thêm người nhận</button>}
        </div>
      </details>
      {(error || inboxError) && <p className="chat-error" role="alert">{error || inboxError} <button onClick={refresh}>Tải lại</button></p>}
      <nav className="chat-list" aria-label="Hộp thư">{rooms.map(room => <Link key={room.id} to={`/messages/${room.id}`} className={id === room.id ? 'active' : ''} aria-current={id === room.id ? 'page' : undefined}><strong>{room.title}</strong><small>{room.lastMessage?.recalledAt ? 'Tin nhắn đã thu hồi' : room.lastMessage?.body || 'Bắt đầu trao đổi'}</small>{room.unreadCount > 0 && <b aria-label={`${room.unreadCount} tin chưa đọc`}>{room.unreadCount}</b>}</Link>)}
        {!rooms.length && !inboxError && <p>Chọn “Cuộc trò chuyện mới” để bắt đầu.</p>}
        {cursor && <button disabled={busy} onClick={() => void perform(async () => { const page = await chatApi.inbox(cursor); setExtra(old => [...old, ...page.items]); setCursor(page.nextCursor) })}>Cuộc trò chuyện trước</button>}
      </nav>
    </aside>
    {id ? <ChatThread key={id} id={id} userId={userId} /> : <section className="chat-empty"><span className="material-symbols-outlined" aria-hidden="true">forum</span><h2>Cùng nhau trao đổi</h2><p>Chat riêng và nhóm chính thức của team, đồ án.</p></section>}
  </div>
}
