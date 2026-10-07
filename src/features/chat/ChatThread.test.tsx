import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChatThread } from './ChatThread'
import { HttpError } from '../../services/http/http-client'

const mocks = vi.hoisted(() => ({
  detail: vi.fn(), messages: vi.fn(), members: vi.fn(), send: vi.fn(), read: vi.fn(),
  revision: 0, changedConversations: null as Set<string> | null, refresh: vi.fn(), on: vi.fn(), off: vi.fn(), invoke: vi.fn(),
}))
vi.mock('./chat-api', async importOriginal => ({ ...(await importOriginal<object>()), chatApi: mocks }))
vi.mock('./ChatProvider', () => ({ useChat: () => ({ connection: mocks, state: 'connected', revision: mocks.revision, changedConversations:mocks.changedConversations, refresh: mocks.refresh }) }))
const message = { id: '1', conversationId: '9', sequence: '1', senderId: '2', senderName: 'Người hướng dẫn', clientMessageId: 'first', body: '<script>alert(1)</script>', createdAt: '2026-10-07T01:00:00Z', recalledAt: null, editedAt: null, reply: null, concurrencyToken: 'token', canEdit: true, canRecall: true }
const room = { sequence: '1', id: '9', title: 'Đồ án kiểm thử', kind: 'PROJECT', status: 'OPEN', canSend: true }
beforeEach(() => {
  vi.resetAllMocks()
  mocks.revision = 0
  mocks.changedConversations = null
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} })
  mocks.detail.mockResolvedValue(room)
  mocks.messages.mockResolvedValue({ items: [message], nextCursor: null, hasMore: false })
  mocks.members.mockResolvedValue({ items: [], nextCursor: null, hasMore: false })
  mocks.invoke.mockResolvedValue(undefined)
  mocks.read.mockResolvedValue(undefined)
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const mount = () => render(<MemoryRouter><ChatThread id="9" userId="3" /></MemoryRouter>)
describe('chat business and failure boundaries', () => {
  it('bounds long history to 500 messages and returns to the newest page after sliding the window', async () => {
    mocks.messages.mockImplementation((_id: string, before?: string) => {
      const page = before ? Number(before) : 0
      return Promise.resolve({ items: Array.from({ length: 50 }, (_, index) => {
        const sequence = String(600 - page * 50 - index)
        return { ...message, id: sequence, sequence, body: `History ${sequence}` }
      }), nextCursor: page < 11 ? String(page + 1) : null, hasMore: page < 11 })
    })
    const mounted = mount(); await screen.findByText('History 600')
    const olderButton = screen.getByRole('button', { name: 'Xem tin trước' }) as HTMLButtonElement
    for (let page = 1; page <= 10; page++) {
      fireEvent.click(olderButton)
      await waitFor(() => {
        expect(mounted.container.querySelector(`[data-message-id="${600 - page * 50}"]`)).toBeTruthy()
        expect(olderButton.disabled).toBe(false)
      })
    }
    expect(document.querySelectorAll('[data-message-id]')).toHaveLength(500)
    expect(mounted.container.querySelector('[data-message-id="600"]')).toBeNull()
    fireEvent.click(mounted.container.querySelector('.chat-jump')!)
    await waitFor(() => expect(mounted.container.querySelector('[data-message-id="600"]')).toBeTruthy())
    expect(document.querySelectorAll('[data-message-id]')).toHaveLength(50)
  }, 20_000)
  it('repairs already loaded history pages without resetting the oldest cursor on realtime updates', async () => {
    mocks.messages.mockImplementation((_id:string,before?:string)=>Promise.resolve(before ? {items:[message],nextCursor:null,hasMore:false} : {items:[{...message,id:'2',sequence:'2',body:'Mới nhất'}],nextCursor:'older',hasMore:true}))
    const mounted=mount();await screen.findByText('Mới nhất')
    fireEvent.click(screen.getByRole('button',{name:'Xem tin trước'}));await screen.findByText(message.body)
    mocks.revision=1;mounted.rerender(<MemoryRouter><ChatThread id="9" userId="3" /></MemoryRouter>)
    await waitFor(()=>expect(mocks.messages.mock.calls.filter(call=>call[1]==='older')).toHaveLength(2))
    expect(screen.getByText(message.body)).toBeTruthy();expect(screen.queryByRole('button',{name:'Xem tin trước'})).toBeNull()
  })
  it('does not refetch an unrelated conversation after a scoped realtime event', async () => {
    const mounted=mount();await screen.findByText(message.body)
    mocks.revision=1;mocks.changedConversations=new Set(['10'])
    mounted.rerender(<MemoryRouter><ChatThread id="9" userId="3" /></MemoryRouter>)
    expect(mocks.detail).toHaveBeenCalledTimes(1)
  })
  it('keeps historical scroll position and exposes an incoming-message indicator', async () => {
    const rendered=mount();await screen.findByText(message.body)
    const history=screen.getByLabelText('Lịch sử tin nhắn')
    Object.defineProperties(history,{scrollHeight:{configurable:true,value:400},clientHeight:{configurable:true,value:100}})
    history.scrollTop=0;fireEvent.scroll(history)
    mocks.messages.mockResolvedValue({items:[message,{...message,id:'2',sequence:'2',body:'Tin mới'}],nextCursor:null,hasMore:false})
    mocks.revision=1;rendered.rerender(<MemoryRouter><ChatThread id="9" userId="3" /></MemoryRouter>)
    await screen.findByText('Tin mới');await screen.findByRole('button',{name:'1 tin mới ↓'})
    expect(history.scrollTop).toBe(0)
    fireEvent.click(screen.getByRole('button',{name:'1 tin mới ↓'}));expect(history.scrollTop).toBe(400)
  })
  it('does not fetch or mark a hidden minimized conversation as read', () => {
    render(<MemoryRouter><ChatThread id="9" userId="3" active={false} /></MemoryRouter>)
    expect(mocks.detail).not.toHaveBeenCalled();expect(mocks.read).not.toHaveBeenCalled()
    expect(mocks.invoke).not.toHaveBeenCalledWith('WatchConversation','9')
  })
  it('coalesces realtime changes without cancelling the current authorized history read', async () => {
    let resolveHistory!: (value: {items: typeof message[]; nextCursor: null; hasMore: boolean}) => void
    mocks.messages.mockImplementationOnce(() => new Promise(resolve => { resolveHistory = resolve }))
    const rendered = mount()
    await waitFor(() => expect(mocks.messages).toHaveBeenCalledTimes(1))
    const signal = mocks.detail.mock.calls[0][1] as AbortSignal
    mocks.revision = 1
    rendered.rerender(<MemoryRouter><ChatThread id="9" userId="3" /></MemoryRouter>)
    mocks.revision = 2
    rendered.rerender(<MemoryRouter><ChatThread id="9" userId="3" /></MemoryRouter>)
    expect(signal.aborted).toBe(false)
    expect(mocks.detail).toHaveBeenCalledTimes(1)
    await act(async () => resolveHistory({items:[message],nextCursor:null,hasMore:false}))
    await waitFor(() => expect(mocks.detail).toHaveBeenCalledTimes(2))
    await screen.findByText(message.body)
    expect(signal.aborted).toBe(false)
  })
  it('retries a lost response using the identical UUID/body/reply and renders plain text safely', async () => {
    mocks.send.mockRejectedValueOnce(new Error('lost response')).mockResolvedValueOnce({ ...message, id: '2', senderId: '3', sequence: '2' })
    mount()
    await screen.findByText(message.body)
    expect(document.querySelector('script')).toBeNull()
    fireEvent.change(screen.getByLabelText('Tin nhắn'), { target: { value: 'Nội dung giữ nguyên' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Gửi lại' }))
    await waitFor(() => expect(mocks.send).toHaveBeenCalledTimes(2))
    expect(mocks.send.mock.calls[0]).toEqual(mocks.send.mock.calls[1])
    expect(mocks.send.mock.calls[0][1].clientMessageId).toMatch(/^[0-9a-f-]{36}$/)
  })
  it('disables all mutations in a read-only room even with stale cached capabilities', async () => {
    mocks.detail.mockResolvedValue({ ...room, status: 'READ_ONLY', canSend: true })
    mount()
    await screen.findByText(message.body)
    expect((screen.getByLabelText('Tin nhắn') as HTMLTextAreaElement).disabled).toBe(true)
    expect(screen.queryByRole('button', { name: 'Sửa' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Thu hồi' })).toBeNull()
    expect(mocks.send).not.toHaveBeenCalled()
  })
  it('clears protected messages and drafts immediately on access revocation', async () => {
    mount()
    await screen.findByText(message.body)
    fireEvent.change(screen.getByLabelText('Tin nhắn'), { target: { value: 'Bản nháp riêng' } })
    const revoke = mocks.on.mock.calls.find(([event]) => event === 'AccessRevoked')![1]
    act(() => revoke({ conversationId: '9', schemaVersion: 1 }))
    expect(screen.queryByText(message.body)).toBeNull()
    expect((screen.getByLabelText('Tin nhắn') as HTMLTextAreaElement).value).toBe('')
    expect((screen.getByLabelText('Tin nhắn') as HTMLTextAreaElement).disabled).toBe(true)
  })
  it('does not retain content when authorized REST returns a hidden resource', async () => {
    mocks.detail.mockRejectedValue(new HttpError('hidden', 404))
    mount()
    await screen.findByRole('alert')
    expect(screen.queryByText(message.body)).toBeNull()
    expect(mocks.read).not.toHaveBeenCalled()
  })
})
