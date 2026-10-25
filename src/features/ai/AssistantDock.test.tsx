import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AssistantDock } from './AssistantDock'
import { floatingPanelEvent } from './assistant-dock-events'
const state = vi.hoisted(() => ({ session: { user: { id: 1, roles: ['STUDENT'] } } as { user: { id: number; roles: string[] } } | null, enabled: true }))
vi.mock('../../app/config/env', () => ({ env: { get academicAiAssistantEnabled() { return state.enabled }, isMockMode: false } }))
vi.mock('../auth/context/useAuthSession', () => ({ useAuthSession: () => ({ session: state.session }) }))
vi.mock('./components/AcademicAssistantPanel', () => ({ AcademicAssistantPanel: ({ projectId }: { projectId?: number }) => <label>Draft {projectId ?? 'general'}<textarea /></label> }))
beforeEach(() => {
  state.enabled = true; state.session = { user: { id: 1, roles: ['STUDENT'] } }
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
  Object.defineProperty(HTMLDialogElement.prototype, 'show', { configurable: true, value() { this.setAttribute('open', '') } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value() { this.removeAttribute('open') } })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const tree = () => <MemoryRouter initialEntries={['/profile']}><AssistantDock /></MemoryRouter>
it('opens in place, keeps draft when minimized, restores focus and resets on user switch', () => {
  const view = render(tree())
  fireEvent.click(screen.getByRole('button', { name: 'Mở trợ lý AI' }))
  expect(screen.getByRole('dialog', { name: 'Trợ lý AI' })).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Draft general'), { target: { value: 'My draft' } })
  fireEvent.click(screen.getByRole('button', { name: 'Đóng trợ lý AI' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Mở trợ lý AI' }))
  fireEvent.click(screen.getByRole('button', { name: 'Mở trợ lý AI' }))
  expect((screen.getByLabelText('Draft general') as HTMLTextAreaElement).value).toBe('My draft')
  state.session = { user: { id: 2, roles: ['STUDENT'] } }; view.rerender(tree())
  expect(screen.queryByLabelText('Draft general')).toBeNull()
  expect(screen.queryByRole('dialog')).toBeNull()
})
it('minimizes when messages open', () => {
  render(tree()); fireEvent.click(screen.getByRole('button', { name: 'Mở trợ lý AI' }))
  fireEvent(window, new CustomEvent(floatingPanelEvent, { detail: 'messages' }))
  expect(screen.queryByRole('dialog')).toBeNull()
})
it.each(['ADMIN', 'LECTURER', 'DEPARTMENT_STAFF'])('is available to academic role %s', role => {
  state.session = { user: { id: 1, roles: [role] } }; render(tree())
  expect(screen.getByRole('button', { name: 'Mở trợ lý AI' })).toBeTruthy()
})
it('is absent for logged out, industry-only and disabled sessions', () => {
  state.session = null; const view = render(tree()); expect(screen.queryByRole('button')).toBeNull()
  state.session = { user: { id: 1, roles: [] } }; view.rerender(tree()); expect(screen.queryByRole('button')).toBeNull()
  state.session = { user: { id: 1, roles: ['STUDENT'] } }; state.enabled = false; view.rerender(tree()); expect(screen.queryByRole('button')).toBeNull()
})
