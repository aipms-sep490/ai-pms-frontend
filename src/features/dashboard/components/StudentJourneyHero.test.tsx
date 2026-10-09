import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { StudentJourneyHero } from './StudentJourneyHero'

vi.mock('../../../app/context', () => ({
  useStudentJourney: () => ({
    journeyState: 'ACTIVE', assignments: [], project: { title: 'Đồ án thử nghiệm' },
    team: null, semester: null, period: null, profile: null, error: null,
  }),
}))

function Location() { return <output data-testid="location">{useLocation().pathname}</output> }

describe('StudentJourneyHero', () => {
  it('opens the real milestone list without a hardcoded milestone identifier', () => {
    render(<MemoryRouter><StudentJourneyHero /><Location /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: /Xem mốc và công việc/ }))
    expect(screen.getByTestId('location').textContent).toBe('/project/milestones')
  })
})
