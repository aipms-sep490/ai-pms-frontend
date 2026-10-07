import { httpGet, httpPost, httpPut, httpPatch } from '../../services/http/http-client'

export interface ChatPage<T> { items: T[]; nextCursor: string | null; hasMore: boolean }
export interface ChatPerson { userId: string; fullName: string; lastReadSequence: string | null }
export interface ChatMessage {
  id: string; conversationId: string; sequence: string; senderId: string; senderName: string
  clientMessageId: string; body: string | null; createdAt: string; editedAt: string | null
  recalledAt: string | null; concurrencyToken: string
  reply: { id: string; body: string | null; unavailable: boolean } | null
  canEdit: boolean; canRecall: boolean
}
export interface ChatConversation {
  id: string; kind: string; title: string; status: string; teamId: string | null; projectId: string | null
  sequence: string; version: string; updatedAt: string; unreadCount: number
  lastMessage: ChatMessage | null; canSend: boolean
}
export interface SendMessage { clientMessageId: string; body: string; replyToMessageId?: string }
const root = '/v1/chat'
const query = (values: Record<string, string | undefined>) => {
  const p = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) if (value) p.set(key, value)
  return `?${p.toString()}`
}
export const chatApi = {
  inbox: (cursor?: string, signal?: AbortSignal) => httpGet<ChatPage<ChatConversation>>(`${root}/conversations${query({ cursor })}`, signal),
  recipients: (search: string, cursor?: string, signal?: AbortSignal) => httpGet<ChatPage<ChatPerson>>(`${root}/recipients${query({ search, cursor })}`, signal),
  direct: (recipientUserId: string) => httpPost<ChatConversation>(`${root}/conversations/direct`, { recipientUserId }),
  group: (kind: 'teams' | 'projects', id: string) => httpPost<ChatConversation>(`${root}/${kind}/${encodeURIComponent(id)}/conversation`),
  detail: (id: string, signal?: AbortSignal) => httpGet<ChatConversation>(`${root}/conversations/${id}`, signal),
  members: (id: string, cursor?: string, signal?: AbortSignal) => httpGet<ChatPage<ChatPerson>>(`${root}/conversations/${id}/members${query({ cursor })}`, signal),
  messages: (id: string, before?: string, signal?: AbortSignal) => httpGet<ChatPage<ChatMessage>>(`${root}/conversations/${id}/messages${query({ before })}`, signal),
  send: (id: string, body: SendMessage) => httpPost<ChatMessage>(`${root}/conversations/${id}/messages`, body),
  edit: (id: string, message: ChatMessage, body: string) => httpPatch<ChatMessage>(`${root}/conversations/${id}/messages/${message.id}`, { body, concurrencyToken: message.concurrencyToken }),
  recall: (id: string, message: ChatMessage) => httpPost<ChatMessage>(`${root}/conversations/${id}/messages/${message.id}/recall`, { concurrencyToken: message.concurrencyToken }),
  read: (id: string, messageId: string) => httpPut<void>(`${root}/conversations/${id}/read`, { messageId }),
}

export function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const rows = new Map(current.map(message => [message.id, message]))
  for (const message of incoming) rows.set(message.id, message)
  return [...rows.values()].sort((a, b) => BigInt(a.sequence) < BigInt(b.sequence) ? -1 : BigInt(a.sequence) > BigInt(b.sequence) ? 1 : 0)
}
