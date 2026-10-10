import { describe, expect, it } from 'vitest'
import { attachmentError, canSubmitMessage, formatBytes, isImageAttachment, toggleReaction } from './chat-attachments'
import type { ChatMessage } from './chat-api'

const baseMessage = (reactions?: ChatMessage['reactions']): ChatMessage => ({
  id: '1', conversationId: 'c', sequence: '1', senderId: 's', senderName: 'S', clientMessageId: 'x',
  body: 'hi', createdAt: '', editedAt: null, recalledAt: null, concurrencyToken: 't', reply: null,
  canEdit: false, canRecall: false, reactions,
})

describe('chat attachment + reaction helpers', () => {
  it('rejects empty and oversized files, accepts normal ones', () => {
    expect(attachmentError({ size: 0 })).toBeTruthy()
    expect(attachmentError({ size: 11 * 1024 * 1024 })).toContain('10 MiB')
    expect(attachmentError({ size: 2048 })).toBeNull()
  })

  it('detects images by content type', () => {
    expect(isImageAttachment({ contentType: 'image/png' })).toBe(true)
    expect(isImageAttachment({ contentType: 'application/pdf' })).toBe(false)
  })

  it('formats byte sizes', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2 KB')
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.0 MB')
  })

  it('allows sending when there is text OR an attachment', () => {
    expect(canSubmitMessage('', 0)).toBe(false)
    expect(canSubmitMessage('   ', 0)).toBe(false)
    expect(canSubmitMessage('hi', 0)).toBe(true)
    expect(canSubmitMessage('', 1)).toBe(true)
  })

  it('adds a new reaction when the user has none', () => {
    const next = toggleReaction(baseMessage([]), '👍')
    expect(next.reactions).toEqual([{ emoji: '👍', count: 1, mine: true }])
  })

  it('removes the user’s own reaction and drops the emoji when count hits zero', () => {
    const next = toggleReaction(baseMessage([{ emoji: '👍', count: 1, mine: true }]), '👍')
    expect(next.reactions).toEqual([])
  })

  it('keeps others’ count when the user removes theirs', () => {
    const next = toggleReaction(baseMessage([{ emoji: '❤️', count: 3, mine: true }]), '❤️')
    expect(next.reactions).toEqual([{ emoji: '❤️', count: 2, mine: false }])
  })

  it('increments and marks mine when the user joins an existing reaction', () => {
    const next = toggleReaction(baseMessage([{ emoji: '😂', count: 2, mine: false }]), '😂')
    expect(next.reactions).toEqual([{ emoji: '😂', count: 3, mine: true }])
  })

  it('is its own inverse (optimistic revert)', () => {
    const start = baseMessage([{ emoji: '👍', count: 2, mine: false }])
    expect(toggleReaction(toggleReaction(start, '👍'), '👍').reactions).toEqual(start.reactions)
  })
})
