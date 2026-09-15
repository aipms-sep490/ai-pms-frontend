import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { OverviewPage } from './OverviewPage'

const journey = vi.hoisted(() => ({ useStudentJourney: vi.fn() }))
const navigate = vi.hoisted(() => vi.fn())
vi.mock('../context', () => journey)
vi.mock('../../features/dashboard/components', () => ({ StudentJourneyHero: () => <div>Journey hero</div> }))
vi.mock('react-router-dom', async () => ({ ...(await vi.importActual<typeof import('react-router-dom')>('react-router-dom')), useNavigate: () => navigate }))

const baseJourney = {
  error: null, isLoading: false, project: null, team: null, assignments: [], semester: null,
}

afterEach(() => { vi.clearAllMocks() })

describe('OverviewPage', () => {
  it('uses the central resolver for the next pre-ACTIVE action', () => {
    journey.useStudentJourney.mockReturnValue({ ...baseJourney, journeyState: 'REVISION_REQUIRED' })
    render(<MemoryRouter><OverviewPage /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục/ }))
    expect(navigate).toHaveBeenCalledWith('/project/edit')
  })

  it('offers the ACTIVE workspace instead of a milestone route after Backend-derived handoff', () => {
    journey.useStudentJourney.mockReturnValue({
      ...baseJourney,
      journeyState: 'ACTIVE',
      project: { id: 9, title: 'AI-PMS', code: 'PRJ-9', status: 'Active' },
      team: { name: 'SE-9', code: 'SE9', members: [] },
      assignments: [{ id: 3, projectId: 9, isPrimary: true, supervisorName: 'Dr. Mai' }],
    })
    render(<MemoryRouter><OverviewPage /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Mở không gian đồ án' }))
    expect(navigate).toHaveBeenCalledWith('/project/workspace')
    expect(navigate).not.toHaveBeenCalledWith('/project/milestones/M3')
  })
})
