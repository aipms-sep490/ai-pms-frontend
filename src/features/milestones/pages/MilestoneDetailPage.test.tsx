import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { MilestoneDetailPage } from './MilestoneDetailPage'

const journey = vi.hoisted(() => ({ useStudentJourney: vi.fn() }))
const api = vi.hoisted(() => ({
  getProjectMilestones: vi.fn(), getProjectMilestoneProgress: vi.fn(), createMilestone: vi.fn(),
  updateMilestone: vi.fn(), deleteMilestone: vi.fn(), reorderMilestones: vi.fn(),
}))
vi.mock('../../../app/context', () => journey)
vi.mock('../../../services/service-gateway', () => ({ services: { milestone: api } }))

const project = { id: 9 }
function renderPage(path = '/project/milestones/3') {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/project/milestones/:milestoneId?" element={<MilestoneDetailPage />} /></Routes></MemoryRouter>)
}

afterEach(() => { vi.clearAllMocks() })
describe('MilestoneDetailPage', () => {
  it('renders the Backend milestone list and computed progress, not preview data', async () => {
    journey.useStudentJourney.mockReturnValue({ project })
    api.getProjectMilestones.mockResolvedValue([{ id: 3, projectId: 9, title: 'Backend M3', status: 'IN_PROGRESS', sortOrder: 0 }])
    api.getProjectMilestoneProgress.mockResolvedValue([{ milestoneId: 3, milestoneTitle: 'Backend M3', totalTasks: 4, doneTasks: 2, progressPercentage: 50 }])
    renderPage()
    expect(await screen.findByText('Backend M3 · 50%')).toBeTruthy()
    expect(screen.queryByText(/Kiến trúc hệ thống & UI Prototype/)).toBeNull()
  })

  it('shows a valid empty state and never creates a default milestone', async () => {
    journey.useStudentJourney.mockReturnValue({ project })
    api.getProjectMilestones.mockResolvedValue([]); api.getProjectMilestoneProgress.mockResolvedValue([])
    renderPage('/project/milestones')
    expect(await screen.findByText(/không tạo milestone mặc định/)).toBeTruthy()
    await waitFor(() => expect(api.createMilestone).not.toHaveBeenCalled())
  })
})
