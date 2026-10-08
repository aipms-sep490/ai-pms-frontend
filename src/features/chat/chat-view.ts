import type { ChatConversation } from './chat-api'

export const unreadLabel = (count: number) => count > 99 ? '99+' : String(count)
export const totalUnread = (rooms: ChatConversation[]) => rooms.reduce((sum, room) => sum + Math.max(0, room.unreadCount || 0), 0)
export const utcDate = (value: string) => new Date(/(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : value + 'Z')
export const chatTime = (value: string) => new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(utcDate(value))
export function chatDay(value: string) {
  const date = utcDate(value), now = new Date(), yesterday = new Date()
  yesterday.setDate(now.getDate() - 1)
  if (date.toDateString() === now.toDateString()) return 'Hôm nay'
  if (date.toDateString() === yesterday.toDateString()) return 'Hôm qua'
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}
