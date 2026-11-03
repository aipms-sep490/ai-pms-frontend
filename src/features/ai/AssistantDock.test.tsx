import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AssistantDock } from './AssistantDock'
import { floatingPanelEvent } from './assistant-dock-events'
const state = vi.hoisted(() => ({ session: { user: { id: 1, roles: ['STUDENT'] } } as { user: { id: number; roles: string[] } } | null, enabled: true, riskEnabled: true }))
vi.mock('../../app/config/env', () => ({ env: { get academicAiAssistantEnabled() { return state.enabled }, get aiProgressRiskEnabled() { return state.riskEnabled }, isMockMode: false } }))
vi.mock('../auth/context/useAuthSession', () => ({ useAuthSession: () => ({ session: state.session }) }))
vi.mock('./components/AcademicAssistantPanel', () => ({ AcademicAssistantPanel: ({ projectId }: { projectId?: number }) => <label>Draft {projectId ?? 'general'}<textarea /></label> }))
vi.mock('./components/ProjectProgressAnalysisPanel', () => ({ ProjectProgressAnalysisPanel: ({ projectId }: { projectId: number }) => <section aria-label={`Risk ${projectId}`}>Project risk {projectId}</section> }))
beforeEach(() => {
  state.enabled = true; state.riskEnabled = true; state.session = { user: { id: 1, roles: ['STUDENT'] } }
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

function ProjectNavigation() {
  const navigate = useNavigate()
  return <button onClick={() => navigate('/supervisor/projects/42/ai')}>Other project</button>
}

it('opens risk on demand, keeps chat drafts and clears the previous project on navigation', () => {
  render(<MemoryRouter initialEntries={['/supervisor/projects/9/ai']}><ProjectNavigation /><AssistantDock /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'Mở trợ lý AI' }))
  expect(screen.queryByLabelText('Risk 9')).toBeNull()
  fireEvent.change(screen.getByLabelText('Draft 9'), { target: { value: 'Keep this draft' } })
  fireEvent.click(screen.getByRole('button', { name: 'Rủi ro & tiến độ' }))
  expect(screen.getByRole('region', { name: 'Risk 9' })).toBeTruthy()
  expect(screen.queryByRole('textbox')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Trò chuyện' }))
  expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('Keep this draft')
  fireEvent.click(screen.getByRole('button', { name: 'Rủi ro & tiến độ' }))
  fireEvent.click(screen.getByRole('button', { name: 'Other project' }))
  expect(screen.queryByLabelText('Risk 9')).toBeNull()
  expect(screen.getByLabelText('Draft 42')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Rủi ro & tiến độ' }))
  expect(screen.getByRole('region', { name: 'Risk 42' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Cuộc trò chuyện mới' }))
  expect(screen.getByRole('textbox')).toBeTruthy()
})

it('hides risk without project context or when its feature flag is off', () => {
  const view = render(tree())
  fireEvent.click(screen.getByRole('button', { name: 'Mở trợ lý AI' }))
  expect(screen.queryByRole('button', { name: 'Rủi ro & tiến độ' })).toBeNull()
  view.unmount()
  state.riskEnabled = false
  render(<MemoryRouter initialEntries={['/department/projects/9/risk']}><AssistantDock /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'Mở trợ lý AI' }))
  expect(screen.queryByRole('button', { name: 'Rủi ro & tiến độ' })).toBeNull()
})
