import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChatProvider, useChat } from './ChatProvider'
import { HttpError } from '../../services/http/http-client'

const mocks = vi.hoisted(() => ({
  mockMode: false,
  session: { user: { id: 1 }, accessToken: 'test-only', expiresAtUtc: '2099-01-01T00:00:00Z' } as { user: { id: number }; accessToken: string; expiresAtUtc: string } | null,
  reconnected: () => {}, inbox: vi.fn(), start: vi.fn(), stop: vi.fn(), invoke: vi.fn(), withUrl: vi.fn(),
}))
vi.mock('../../app/config/env', () => ({ env: { chatEnabled: true, get isMockMode() { return mocks.mockMode }, apiBaseUrl: '/api/v1' } }))
vi.mock('../auth/context/useAuthSession', () => ({ useAuthSession: () => ({ session: mocks.session }) }))
vi.mock('./chat-api', () => ({ chatApi: { inbox: mocks.inbox } }))
vi.mock('@microsoft/signalr', () => ({
  HubConnectionState: { Connected: 'Connected' }, LogLevel: { None: 6 },
  HubConnectionBuilder: class {
    withUrl(...args: unknown[]) { mocks.withUrl(...args); return this }
    configureLogging() { return this }
    withAutomaticReconnect() { return this }
    build() { return { on() {}, onreconnecting() {}, onreconnected(callback:()=>void) {mocks.reconnected=callback}, onclose() {}, start: mocks.start, stop: mocks.stop, invoke: mocks.invoke, state: 'Connected' } }
  },
}))
function Probe() {
  const { inbox, state, unreadCount, unreadKnown, inboxError, refresh } = useChat()
  return <><p>{state} / {inbox.items.map(item => item.title).join(',')}</p><output>{unreadKnown ? unreadCount : 'unknown'}</output><p>{inboxError}</p><button onClick={() => refresh()}>Retry inbox</button></>
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.mockMode = false
  mocks.session = { user: { id: 1 }, accessToken: 'test-only', expiresAtUtc: '2099-01-01T00:00:00Z' }
  mocks.inbox.mockResolvedValue({ items: [{ id: '9', title: 'Private fixture room', version: '1', sequence: '0', unreadCount: 0, updatedAt: '2026-10-07T00:00:00Z' }], nextCursor: null, hasMore: false })
  mocks.start.mockResolvedValue(undefined); mocks.stop.mockResolvedValue(undefined)
})
afterEach(cleanup)
describe('chat session boundaries', () => {
  it('stops background catch-up after a denial and restores chat after an explicit successful retry', async () => {
    mocks.inbox.mockRejectedValue(new HttpError('Account cannot use chat', 403))
    render(<ChatProvider><Probe /></ChatProvider>)
    await screen.findByText(/Tài khoản chưa được phép sử dụng chat/)
    await waitFor(() => expect(mocks.stop).toHaveBeenCalledTimes(1))
    const previous = mocks.inbox.mock.calls.length
    fireEvent(document, new Event('visibilitychange'))
    mocks.reconnected()
    await new Promise(resolve => setTimeout(resolve, 200))
    expect(mocks.inbox).toHaveBeenCalledTimes(previous)
    expect(screen.getByRole('status').textContent).toBe('unknown')

    fireEvent.click(screen.getByRole('button', { name: 'Retry inbox' }))
    await waitFor(() => expect(mocks.inbox).toHaveBeenCalledTimes(previous + 1))
    expect(mocks.start).toHaveBeenCalledTimes(1)
    mocks.inbox.mockResolvedValue({ items: [], nextCursor: null, hasMore: false })
    fireEvent.click(screen.getByRole('button', { name: 'Retry inbox' }))
    await waitFor(() => expect(mocks.start).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('0'))
    expect(screen.queryByText(/Tài khoản chưa được phép sử dụng chat/)).toBeNull()
  })
  it('reconciles authoritative unread summaries after a hub reconnect', async () => {
    render(<ChatProvider><Probe /></ChatProvider>)
    await screen.findByText('connected / Private fixture room')
    await new Promise(resolve=>setTimeout(resolve,200))
    const previous=mocks.inbox.mock.calls.length
    mocks.reconnected()
    await waitFor(()=>expect(mocks.inbox.mock.calls.length).toBeGreaterThan(previous))
    expect(screen.getByRole('status').textContent).toBe('0')
  })
  it('counts all authorized inbox pages and deduplicates rooms by server version', async () => {
    const room = {id:'9',title:'Room',version:'1',sequence:'1',unreadCount:2,updatedAt:'2026-10-07T00:00:00Z'}
    mocks.inbox.mockImplementation((cursor?:string) => Promise.resolve(cursor ? {items:[{...room,version:'2',unreadCount:3},{...room,id:'10',unreadCount:4}],nextCursor:null,hasMore:false} : {items:[room],nextCursor:'next',hasMore:true}))
    render(<ChatProvider><Probe /></ChatProvider>)
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('7'))
    expect(mocks.inbox).toHaveBeenCalledWith('next',expect.any(AbortSignal))
  })
  it('never contacts the chat API or hub in runtime mock mode', () => {
    mocks.mockMode = true
    render(<ChatProvider><Probe /></ChatProvider>)
    expect(mocks.inbox).not.toHaveBeenCalled()
    expect(mocks.withUrl).not.toHaveBeenCalled()
  })
  it('stops the hub and clears the inbox when the session is removed', async () => {
    const { rerender } = render(<ChatProvider><Probe /></ChatProvider>)
    await screen.findByText('connected / Private fixture room')
    mocks.session = null
    rerender(<ChatProvider><Probe /></ChatProvider>)
    await waitFor(() => expect(mocks.stop).toHaveBeenCalledTimes(1))
    expect(screen.queryByText(/Private fixture room/)).toBeNull()
    expect(screen.getByText('offline /')).toBeTruthy()
  })
})
