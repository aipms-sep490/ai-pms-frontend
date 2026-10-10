/** Pure chat fixture state. Messages live in session memory only; no SignalR, no upload, no persistence. */
export interface ChatAttachment { name: string; size: number }
export interface ChatMessage {
  id: number
  author: string
  body: string
  /** 'HH:mm' local label for display only. */
  at: string
  attachments: ChatAttachment[]
  reactions: Record<string, string[]>
  seenBy: string[]
}

export const chatError = (code: string) => new Error(code)
const MAX_ATTACHMENT = 10 * 1024 * 1024

export function nextId(messages: ChatMessage[]): number {
  return messages.reduce((max, message) => Math.max(max, message.id), 0) + 1
}

export function validateAttachments(attachments: ChatAttachment[]): ChatAttachment[] {
  for (const file of attachments) {
    if (file.size <= 0 || file.size > MAX_ATTACHMENT) throw chatError('ATTACHMENT_TOO_LARGE')
  }
  return attachments
}

export function sendMessage(
  messages: ChatMessage[],
  author: string,
  body: string,
  at: string,
  attachments: ChatAttachment[] = [],
): ChatMessage[] {
  const trimmed = body.trim()
  if (!trimmed && attachments.length === 0) throw chatError('EMPTY_MESSAGE')
  validateAttachments(attachments)
  const message: ChatMessage = {
    id: nextId(messages),
    author,
    body: trimmed,
    at,
    attachments,
    reactions: {},
    seenBy: [author],
  }
  return [...messages, message]
}

export function toggleReaction(messages: ChatMessage[], id: number, emoji: string, user: string): ChatMessage[] {
  return messages.map(message => {
    if (message.id !== id) return message
    const current = message.reactions[emoji] ?? []
    const nextUsers = current.includes(user) ? current.filter(name => name !== user) : [...current, user]
    const reactions = { ...message.reactions }
    if (nextUsers.length) reactions[emoji] = nextUsers
    else delete reactions[emoji]
    return { ...message, reactions }
  })
}

/** Mark every message as seen by `user`; used when the reader opens or focuses the thread. */
export function markSeen(messages: ChatMessage[], user: string): ChatMessage[] {
  return messages.map(message =>
    message.seenBy.includes(user) ? message : { ...message, seenBy: [...message.seenBy, user] },
  )
}

/** Session-local mute: compares an ISO expiry to now. 'forever' is modelled as a far-future expiry by the caller. */
export function isMuted(muteUntil: string | null, now: number): boolean {
  if (!muteUntil) return false
  return new Date(muteUntil).getTime() > now
}
