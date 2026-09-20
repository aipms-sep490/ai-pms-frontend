import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ExecutionAccessProvider } from '../../execution/context/ExecutionAccessProvider'
import { MilestoneDetailPage } from './MilestoneDetailPage'

const api = vi.hoisted(() => ({ getProjectMilestones: vi.fn(), getProjectMilestoneProgress: vi.fn(), createMilestone: vi.fn(), updateMilestone: vi.fn(), deleteMilestone: vi.fn(), reorderMilestones: vi.fn() }))
vi.mock('../../../services/service-gateway', () => ({ services: { milestone: api } }))

function renderPage(canManageStructure: boolean, path = '/project/milestones/3') {
  return render(<MemoryRouter initialEntries={[path]}><ExecutionAccessProvider value={{ project: { id: 9 } as never, actor: 'student', currentUserId: 2, canManageStructure, routeBase: '/project' }}><Routes><Route path="/project/milestones/:milestoneId?" element={<MilestoneDetailPage />} /></Routes></ExecutionAccessProvider></MemoryRouter>)
}

afterEach(() => { vi.clearAllMocks() })
describe('MilestoneDetailPage', () => {
  it('renders the Backend milestone list and computed progress, not preview data', async () => {
    api.getProjectMilestones.mockResolvedValue([{ id: 3, projectId: 9, title: 'Backend M3', status: 'IN_PROGRESS', sortOrder: 0 }]); api.getProjectMilestoneProgress.mockResolvedValue([{ milestoneId: 3, milestoneTitle: 'Backend M3', totalTasks: 4, doneTasks: 2, progressPercentage: 50 }])
    renderPage(false)
    expect(await screen.findByText('Backend M3 · 50%')).toBeTruthy(); expect(screen.queryByText(/Kiến trúc hệ thống & UI Prototype/)).toBeNull()
  })
  it('hides leader-only milestone mutations from an ordinary student member', async () => {
    api.getProjectMilestones.mockResolvedValue([{ id: 3, projectId: 9, title: 'Backend M3', status: 'IN_PROGRESS', sortOrder: 0 }]); api.getProjectMilestoneProgress.mockResolvedValue([])
    renderPage(false)
    await screen.findByText('Backend M3 · 0%')
    expect(screen.queryByRole('button', { name: 'Tạo' })).toBeNull(); expect(screen.queryByRole('button', { name: 'Lưu milestone' })).toBeNull(); expect(screen.queryByRole('button', { name: 'Xóa' })).toBeNull(); expect(screen.queryByRole('button', { name: /Lưu thứ tự/ })).toBeNull()
  })
  it('shows milestone mutations to the student leader', async () => {
    api.getProjectMilestones.mockResolvedValue([{ id: 3, projectId: 9, title: 'Backend M3', status: 'IN_PROGRESS', sortOrder: 0 }]); api.getProjectMilestoneProgress.mockResolvedValue([])
    renderPage(true)
    expect(await screen.findByRole('button', { name: 'Tạo' })).toBeTruthy(); expect(screen.getByRole('button', { name: 'Lưu milestone' })).toBeTruthy(); expect(screen.getByRole('button', { name: 'Xóa' })).toBeTruthy()
  })
  it('shows a valid empty state and never creates a default milestone', async () => {
    api.getProjectMilestones.mockResolvedValue([]); api.getProjectMilestoneProgress.mockResolvedValue([])
    renderPage(false, '/project/milestones')
    expect(await screen.findByText(/không tạo milestone mặc định/)).toBeTruthy(); await waitFor(() => expect(api.createMilestone).not.toHaveBeenCalled())
  })
})
