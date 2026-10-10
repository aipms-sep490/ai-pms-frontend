import { useMemo, useRef, useState, type FormEvent } from 'react'
import { markSeen, sendMessage, toggleReaction, type ChatAttachment, type ChatMessage } from './chat-model'

const EMOJIS = ['👍', '🎉', '❓', '✅']
const PEOPLE = ['Nguyễn An', 'Trần Bình', 'Supervisor fixture']
const nowLabel = () => new Date().toTimeString().slice(0, 5)

const seed: ChatMessage[] = [
  { id: 1, author: 'Supervisor fixture', body: 'Nhớ nộp báo cáo COLD trước hạn nhé.', at: '08:30', attachments: [], reactions: {}, seenBy: ['Supervisor fixture', 'Nguyễn An'] },
  { id: 2, author: 'Nguyễn An', body: 'Vâng ạ, nhóm đang hoàn thiện SRS.', at: '08:32', attachments: [], reactions: { '👍': ['Supervisor fixture'] }, seenBy: ['Nguyễn An'] },
]

/** Conversation fixture: session-memory messages, reactions, attachment metadata, seen state. No SignalR, no upload. */
export function ChatPreview() {
  const [me, setMe] = useState(PEOPLE[0])
  const [messages, setMessages] = useState<ChatMessage[]>(seed)
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState<ChatAttachment[]>([])
  const [typing, setTyping] = useState(false)
  const [error, setError] = useState('')
  const [muteLabel, setMuteLabel] = useState<string | null>(null)
  const [desktop, setDesktop] = useState(false)
  const [sound, setSound] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const unseen = useMemo(() => messages.filter(message => !message.seenBy.includes(me)).length, [messages, me])

  const send = (event: FormEvent) => {
    event.preventDefault()
    try {
      setMessages(sendMessage(messages, me, draft, nowLabel(), pending))
      setDraft('')
      setPending([])
      setTyping(false)
      setError('')
      if (fileInput.current) fileInput.current.value = ''
    } catch (failure) {
      const code = failure instanceof Error ? failure.message : 'CHAT_ERROR'
      setError(code === 'EMPTY_MESSAGE' ? 'Nhập nội dung hoặc đính kèm file trước khi gửi.' : code === 'ATTACHMENT_TOO_LARGE' ? 'File đính kèm vượt 10 MiB trong fixture.' : code)
    }
  }

  const attach = (files: FileList | null) => {
    if (!files) return
    setPending(Array.from(files).map(file => ({ name: file.name, size: file.size })))
  }

  const mute = (option: string) => {
    const labels: Record<string, string> = { '1h': '1 giờ', '8h': '8 giờ', forever: 'đến khi bật lại' }
    setMuteLabel(option === 'none' ? null : labels[option] ?? null)
  }

  return (
    <section className="v5-chat" aria-label="Chat nhóm fixture">
      <div className="v5-controls">
        <label>Gửi với tư cách
          <select value={me} onChange={event => { setMe(event.target.value); setMessages(current => markSeen(current, event.target.value)) }}>
            {PEOPLE.map(person => <option key={person}>{person}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => setMessages(current => markSeen(current, me))}>
          Đánh dấu đã đọc{unseen > 0 ? ` (${unseen})` : ''}
        </button>
        {muteLabel && <span className="v5-chat-muted" role="status">🔕 Đang tắt thông báo ({muteLabel})</span>}
      </div>

      <ol className="v5-chat-thread" aria-label="Dòng tin nhắn">
        {messages.map(message => {
          const mine = message.author === me
          const others = message.seenBy.filter(name => name !== message.author)
          return (
            <li key={message.id} className={mine ? 'v5-chat-row v5-chat-row--mine' : 'v5-chat-row'}>
              <div className="v5-chat-bubble">
                <p className="v5-chat-meta"><strong>{message.author}</strong> <time>{message.at}</time></p>
                {message.body && <p className="v5-chat-body">{message.body}</p>}
                {message.attachments.map((file, index) => (
                  <p key={index} className="v5-chat-file">📎 {file.name} · {(file.size / 1024).toFixed(0)} KB <span>(metadata fixture — chưa tải lên)</span></p>
                ))}
                <div className="v5-chat-reactions">
                  {Object.entries(message.reactions).map(([emoji, users]) => (
                    <button
                      key={emoji}
                      type="button"
                      className={users.includes(me) ? 'v5-chat-reaction v5-chat-reaction--on' : 'v5-chat-reaction'}
                      aria-pressed={users.includes(me)}
                      aria-label={`${emoji} ${users.length}, ${users.join(', ')}`}
                      onClick={() => setMessages(current => toggleReaction(current, message.id, emoji, me))}
                    >
                      {emoji} {users.length}
                    </button>
                  ))}
                  <span className="v5-chat-add" role="group" aria-label={`Thả cảm xúc cho tin của ${message.author}`}>
                    {EMOJIS.map(emoji => (
                      <button key={emoji} type="button" aria-label={`Thả ${emoji}`} onClick={() => setMessages(current => toggleReaction(current, message.id, emoji, me))}>{emoji}</button>
                    ))}
                  </span>
                </div>
                {mine && <p className="v5-chat-seen">{others.length ? `Đã xem: ${others.join(', ')}` : 'Đã gửi'}</p>}
              </div>
            </li>
          )
        })}
      </ol>

      {typing && <p className="v5-chat-typing" role="status">{me} đang nhập… (mô phỏng, không gửi realtime)</p>}
      {error && <p className="v5-error" role="alert">{error}</p>}

      <form className="v5-chat-compose" onSubmit={send}>
        <label>Soạn tin nhắn
          <textarea
            value={draft}
            onChange={event => { setDraft(event.target.value); setTyping(event.target.value.length > 0) }}
            onKeyDown={event => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); send(event as unknown as FormEvent) } }}
            placeholder="Ctrl/Cmd+Enter để gửi"
          />
        </label>
        <label>Đính kèm (metadata)
          <input ref={fileInput} type="file" multiple onChange={event => attach(event.target.files)} />
        </label>
        {pending.length > 0 && <p className="v5-chat-pending">Sắp gửi: {pending.map(file => file.name).join(', ')}</p>}
        <button type="submit">Gửi tin nhắn fixture</button>
      </form>

      <fieldset className="v5-chat-settings">
        <legend>Thông báo (chỉ preview)</legend>
        <label className="v5-check"><input type="checkbox" checked={desktop} onChange={event => setDesktop(event.target.checked)} />Thông báo desktop</label>
        <label className="v5-check"><input type="checkbox" checked={sound} onChange={event => setSound(event.target.checked)} />Âm thanh tin nhắn</label>
        <label>Tắt thông báo hội thoại
          <select defaultValue="none" onChange={event => mute(event.target.value)}>
            <option value="none">Không tắt</option>
            <option value="1h">1 giờ</option>
            <option value="8h">8 giờ</option>
            <option value="forever">Đến khi bật lại</option>
          </select>
        </label>
        <p>Chưa xin quyền Notification của trình duyệt và chưa lưu cài đặt vào chat thật. ChatDock/SignalR hiện có được giữ nguyên.</p>
      </fieldset>
    </section>
  )
}
