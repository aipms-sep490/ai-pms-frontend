import type { ChatAttachment, ChatMessage, ChatReaction } from './chat-api'

/** Quick emoji set, Messenger-style — kept short so reacting stays one tap. */
export const CHAT_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'] as const

/** 10 MiB, matching the limit used consistently elsewhere in the app (COLD reports). */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
/** BE caps uploads at 10 files per message. */
export const MAX_ATTACHMENTS_PER_MESSAGE = 10

export const isImageAttachment = (file: Pick<ChatAttachment, 'contentType'>) => file.contentType.startsWith('image/')

export function attachmentError(file: Pick<File, 'size'>): string | null {
  if (file.size <= 0) return 'Tệp rỗng, không thể gửi.'
  if (file.size > MAX_ATTACHMENT_BYTES) return 'Tệp vượt quá 10 MiB.'
  return null
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Optimistically toggle the current user's reaction on a message so the UI reacts instantly
 * before the server round-trip confirms. Returns the same reference when nothing changes.
 */
export function toggleReaction(message: ChatMessage, emoji: string): ChatMessage {
  const current = message.reactions ?? []
  const existing = current.find(reaction => reaction.emoji === emoji)
  let next: ChatReaction[]
  if (!existing) {
    next = [...current, { emoji, count: 1, reactedByMe: true }]
  } else if (existing.reactedByMe) {
    const count = existing.count - 1
    next = count > 0 ? current.map(r => (r.emoji === emoji ? { ...r, count, reactedByMe: false } : r)) : current.filter(r => r.emoji !== emoji)
  } else {
    next = current.map(r => (r.emoji === emoji ? { ...r, count: r.count + 1, reactedByMe: true } : r))
  }
  return { ...message, reactions: next }
}

/** Whether the compose box may send: needs either text or at least one attachment. */
export function canSubmitMessage(body: string, attachmentCount: number): boolean {
  return body.trim().length > 0 || attachmentCount > 0
}
