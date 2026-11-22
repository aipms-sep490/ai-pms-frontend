import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { TaskCriteriaPanel } from './TaskCriteriaPanel'

const api = vi.hoisted(() => ({
  getTaskCriteria: vi.fn(),
  replaceTaskCriteria: vi.fn(),
  toggleTaskCriterion: vi.fn(),
}))

vi.mock('../task-criteria-api', () => api)
beforeEach(() => { vi.clearAllMocks() })
afterEach(cleanup)

it('renders task criteria checklist, lets assignee toggle and leader edit criteria', async () => {
  api.getTaskCriteria.mockResolvedValue({
    taskId: 8, totalCount: 2, completedCount: 0, canManage: true, canToggle: true,
    items: [
      { id: 1, taskId: 8, title: 'Có script migration idempotent', isCompleted: false, sortOrder: 0, completedAt: null, completedBy: null, completedByName: null },
      { id: 2, taskId: 8, title: 'Đạt 100% unit test', isCompleted: false, sortOrder: 1, completedAt: null, completedBy: null, completedByName: null },
    ],
  })
  api.toggleTaskCriterion.mockResolvedValue({
    taskId: 8, totalCount: 2, completedCount: 1, canManage: true, canToggle: true,
    items: [
      { id: 1, taskId: 8, title: 'Có script migration idempotent', isCompleted: true, sortOrder: 0, completedAt: '2026-11-22T02:00:00Z', completedBy: 2, completedByName: 'Nguyễn Quang Khải' },
      { id: 2, taskId: 8, title: 'Đạt 100% unit test', isCompleted: false, sortOrder: 1, completedAt: null, completedBy: null, completedByName: null },
    ],
  })
  render(<TaskCriteriaPanel taskId={8} />)

  expect(await screen.findByText('Đã đạt 0/2 tiêu chí nghiệm thu')).toBeTruthy()
  fireEvent.click(screen.getByRole('checkbox', { name: 'Có script migration idempotent' }))
  expect(await screen.findByText('Đã đạt 1/2 tiêu chí nghiệm thu')).toBeTruthy()
  expect(screen.getByText('Xác nhận bởi Nguyễn Quang Khải')).toBeTruthy()

  api.replaceTaskCriteria.mockResolvedValue({
    taskId: 8, totalCount: 1, completedCount: 0, canManage: true, canToggle: true,
    items: [{ id: 3, taskId: 8, title: 'Tiêu chí mới', isCompleted: false, sortOrder: 0, completedAt: null, completedBy: null, completedByName: null }],
  })
  fireEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa tiêu chí' }))
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Tiêu chí mới' } })
  fireEvent.click(screen.getByRole('button', { name: 'Lưu tiêu chí' }))
  expect(await screen.findByText('Tiêu chí mới')).toBeTruthy()
})
