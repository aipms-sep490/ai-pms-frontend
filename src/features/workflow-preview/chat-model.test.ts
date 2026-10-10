import { describe, expect, it } from 'vitest'
import { isMuted, markSeen, sendMessage, toggleReaction, type ChatMessage } from './chat-model'

const seed = (): ChatMessage[] => sendMessage([], 'Nguyễn An', 'Chào nhóm', '09:00')

describe('chat fixture model', () => {
  it('rejects an empty message but accepts an attachment-only message', () => {
    expect(() => sendMessage([], 'An', '   ', '09:00')).toThrow('EMPTY_MESSAGE')
    const withFile = sendMessage([], 'An', '', '09:01', [{ name: 'srs.pdf', size: 1024 }])
    expect(withFile[0].attachments[0].name).toBe('srs.pdf')
    expect(withFile[0].seenBy).toContain('An')
  })

  it('rejects an oversized attachment', () => {
    expect(() => sendMessage([], 'An', 'file', '09:02', [{ name: 'big.zip', size: 11 * 1024 * 1024 }])).toThrow('ATTACHMENT_TOO_LARGE')
  })

  it('assigns incrementing ids', () => {
    const one = seed()
    const two = sendMessage(one, 'Trần Bình', 'Ok', '09:05')
    expect(two.map(message => message.id)).toEqual([1, 2])
  })

  it('toggles a reaction on and off and drops empty emoji buckets', () => {
    const messages = seed()
    const reacted = toggleReaction(messages, 1, '👍', 'Bình')
    expect(reacted[0].reactions['👍']).toEqual(['Bình'])
    const removed = toggleReaction(reacted, 1, '👍', 'Bình')
    expect(removed[0].reactions['👍']).toBeUndefined()
  })

  it('marks messages seen without duplicating a reader', () => {
    const messages = seed()
    const seen = markSeen(messages, 'Bình')
    expect(seen[0].seenBy).toContain('Bình')
    expect(markSeen(seen, 'Bình')[0].seenBy.filter(name => name === 'Bình')).toHaveLength(1)
  })

  it('reports mute windows against a reference time', () => {
    expect(isMuted(null, Date.now())).toBe(false)
    expect(isMuted('2026-10-10T10:00:00', Date.parse('2026-10-10T09:00:00'))).toBe(true)
    expect(isMuted('2026-10-10T08:00:00', Date.parse('2026-10-10T09:00:00'))).toBe(false)
  })
})
