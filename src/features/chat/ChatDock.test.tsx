import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChatDock } from './ChatDock'
const mocks = vi.hoisted(() => ({ count: 0, session: {user:{id:1}} as {user:{id:number}} | null }))
vi.mock('../../app/config/env', () => ({ env: {chatEnabled:true,isMockMode:false} }))
vi.mock('../auth/context/useAuthSession', () => ({useAuthSession: () => ({session:mocks.session})}))
vi.mock('./ChatProvider', () => ({useChat: () => ({unreadCount:mocks.count,unreadKnown:true,state:'connected'})}))
vi.mock('./ChatPage', () => ({ChatConversations: ({onOpen}: {onOpen:(room:{id:string})=>void}) => <button onClick={()=>onOpen({id:'9'})}>Phòng được phép</button>}))
vi.mock('./ChatThread', () => ({ChatThread: ({active,userId}: {active:boolean;userId:string}) => <label hidden={!active}>Bản nháp {userId}<input /></label>}))
beforeEach(() => {
  mocks.count=0; mocks.session={user:{id:1}}
  vi.stubGlobal('matchMedia', () => ({matches:false,addEventListener(){},removeEventListener(){}}))
  Object.defineProperty(HTMLDialogElement.prototype, 'show', {configurable:true,value(){this.setAttribute('open','')}})
})
afterEach(() => {cleanup();vi.unstubAllGlobals()})
const tree = () => <MemoryRouter initialEntries={['/profile']}><ChatDock /></MemoryRouter>
describe('floating chat session and UI state', () => {
  it.each([0,1,99,100])('uses independent authoritative unread count %s', count => {
    mocks.count=count;render(tree())
    const launcher=screen.getByRole('button',{name: count ? `Mở tin nhắn, ${count} tin chưa đọc` : 'Mở tin nhắn'})
    expect(launcher.querySelector('.chat-launcher-badge')?.textContent ?? null).toBe(count===0?null:count>99?'99+':String(count))
  })
  it('opens without navigation, minimizes without losing draft, restores focus and closes', () => {
    render(tree());fireEvent.click(screen.getByRole('button',{name:'Mở tin nhắn'}))
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.click(screen.getByRole('button',{name:'Phòng được phép'}))
    fireEvent.change(screen.getByLabelText('Bản nháp 1'),{target:{value:'Giữ nội dung'}})
    fireEvent.click(screen.getByRole('button',{name:'Thu nhỏ tin nhắn'}))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button',{name:'Mở lại tin nhắn'}))
    fireEvent.click(screen.getByRole('button',{name:'Mở lại tin nhắn'}))
    expect((screen.getByLabelText('Bản nháp 1') as HTMLInputElement).value).toBe('Giữ nội dung')
    fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape'})
    expect(screen.queryByRole('dialog')).toBeNull()
  })
  it('disposes a previous users conversation and drafts on account change/logout', () => {
    const mounted=render(tree());fireEvent.click(screen.getByRole('button',{name:'Mở tin nhắn'}));fireEvent.click(screen.getByRole('button',{name:'Phòng được phép'}))
    mocks.session={user:{id:2}};mounted.rerender(tree())
    expect(screen.queryByLabelText('Bản nháp 1')).toBeNull();expect(screen.queryByRole('dialog')).toBeNull()
    mocks.session=null;mounted.rerender(tree());expect(screen.queryByRole('button')).toBeNull()
  })
})
