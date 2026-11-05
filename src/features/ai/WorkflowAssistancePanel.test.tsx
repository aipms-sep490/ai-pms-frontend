import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { WorkflowAssistancePanel } from './components/WorkflowAssistancePanel'
import { getWorkflowAssistance, type WorkflowAssistance } from './workflow-assistance-api'
vi.mock('./workflow-assistance-api', async original => ({ ...await original<typeof import('./workflow-assistance-api')>(), getWorkflowAssistance: vi.fn() }))
const get = vi.mocked(getWorkflowAssistance)
const result: WorkflowAssistance = { projectId: 9, mode: 'NEXT_STEPS', generatedAt: '2026-11-03T05:00:00Z', status: 'CHECKED', summary: 'Current project only', items: [{ code: 'TASK', status: 'REVIEW', title: 'Test API', detail: 'Overdue', source: 'Task', owner: 'Hung', target: 'tasks', resourceId: 42 }], limitations: ['Snapshot only'] }
beforeEach(() => { vi.resetAllMocks(); get.mockResolvedValue(result) })
afterEach(cleanup)

it('shows sources, date, owner and safe navigation without mutating data', async () => {
  const navigate = vi.fn(), use = vi.fn()
  render(<WorkflowAssistancePanel projectId={9} routeBase="/project" onNavigate={navigate} onUseDraft={use} />)
  expect(await screen.findByText('Test API')).toBeTruthy()
  expect(screen.getByText(/Hung/)).toBeTruthy()
  expect(screen.getByText('Snapshot only')).toBeTruthy()
  expect(use).not.toHaveBeenCalled(); expect(navigate).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Mở trang liên quan' }))
  expect(navigate).toHaveBeenCalledWith('/project/tasks/42')
})

it('requires meeting selection then opens an editable proposal only on click', async () => {
  const use = vi.fn()
  get.mockImplementation(async (projectId, mode, meetingId) => ({ ...result, projectId, mode, items: [], meetings: [{ id: 7, title: 'API review', startAt: result.generatedAt }], draft: meetingId ? { kind: 'WORK_PLAN', title: 'Plan', description: '', tasks: [{ kind: 'TASK', title: 'Review tests', description: 'Confirm work' }] } : null }))
  render(<WorkflowAssistancePanel projectId={9} onNavigate={vi.fn()} onUseDraft={use} />)
  await screen.findByText(result.summary)
  fireEvent.change(screen.getByLabelText('Nhu cầu hỗ trợ'), { target: { value: 'MEETING_FOLLOWUP' } })
  const select = await screen.findByLabelText('Cuộc họp cần theo dõi')
  expect(use).not.toHaveBeenCalled()
  fireEvent.change(select, { target: { value: '7' } })
  fireEvent.click(await screen.findByRole('button', { name: 'Dùng bản nháp · mở biểu mẫu' }))
  expect(use).toHaveBeenCalledWith(expect.objectContaining({ kind: 'TASK', title: 'Review tests' }))
})

it('clears old project results and ignores a delayed response after changing project', async () => {
  let resolve!: (value: WorkflowAssistance) => void
  get.mockImplementation(id => id === 9 ? new Promise(r => { resolve = r }) : Promise.resolve({ ...result, projectId: 10, items: [], summary: 'New project' }))
  const view = render(<WorkflowAssistancePanel projectId={9} onNavigate={vi.fn()} />)
  view.rerender(<WorkflowAssistancePanel projectId={10} onNavigate={vi.fn()} />)
  await screen.findByText('New project')
  await act(async () => resolve(result))
  expect(screen.queryByText('Test API')).toBeNull()
  expect(screen.queryByText(result.summary)).toBeNull()
})

it('does not present readiness on failure and retries once when requested', async () => {
  get.mockRejectedValueOnce(new Error('offline'))
  render(<WorkflowAssistancePanel projectId={9} onNavigate={vi.fn()} />)
  await screen.findByRole('alert')
  expect(screen.queryByText('Đủ điều kiện hiện tại')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra lại' }))
  await waitFor(() => expect(get).toHaveBeenCalledTimes(2))
  expect(await screen.findByText(result.summary)).toBeTruthy()
})
