import { describe, expect, it } from 'vitest'
import { createChatEventFilter } from './chat-events'
import { mergeMessages, type ChatMessage } from './chat-api'

describe('chat event recovery', () => {
  it('ignores duplicate/late envelopes without losing bigint precision or mixing rooms', () => {
    const accept = createChatEventFilter()
    const event = { schemaVersion: 1, eventId: 'event-a', conversationId: '1', version: '9007199254740993' }
    expect(accept(event)).toBe(true)
    expect(accept(event)).toBe(false)
    expect(accept({ ...event, eventId: 'event-b', version: '9007199254740992' })).toBe(false)
    expect(accept({ ...event, eventId: 'event-c', version: '9007199254740994' })).toBe(true)
    expect(accept({ ...event, eventId: 'event-d', conversationId: '2', version: '1' })).toBe(true)
    expect(accept({ ...event, schemaVersion: 2 })).toBe(false)
    expect(accept({ ...event, version: 'invalid' })).toBe(false)
  })
  it('replaces a canonical message by ID and orders sequences above Number.MAX_SAFE_INTEGER', () => {
    const row = (id: string, sequence: string, body: string) => ({ id, sequence, body } as ChatMessage)
    const result = mergeMessages([row('1', '9007199254740993', 'old')], [row('2', '9007199254740992', 'earlier'), row('1', '9007199254740993', 'edited')])
    expect(result.map(m => m.id)).toEqual(['2', '1'])
    expect(result[1].body).toBe('edited')
  })
})
