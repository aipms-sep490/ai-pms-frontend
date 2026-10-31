import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StudentJourneyHero } from './StudentJourneyHero'

const state = vi.hoisted(() => ({ error: null as string | null, refresh: vi.fn() }))

vi.mock('../../../app/context', () => ({
  useStudentJourney: () => ({
    journeyState: 'ACTIVE', assignments: [], project: { title: 'Đồ án thử nghiệm' },
    team: null, semester: null, period: null, profile: null, error: state.error, refreshAll: state.refresh,
  }),
}))

afterEach(() => { cleanup(); vi.resetAllMocks(); state.error = null })

function Location() { return <output data-testid="location">{useLocation().pathname}</output> }

describe('StudentJourneyHero', () => {
  it('opens the real milestone list without a hardcoded milestone identifier', () => {
    render(<MemoryRouter><StudentJourneyHero /><Location /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: /Xem mốc và công việc/ }))
    expect(screen.getByTestId('location').textContent).toBe('/project/milestones')
  })

  it('keeps the permission guidance intact and retries only on an explicit click', () => {
    state.error = 'Bạn chưa được phép xem thông tin nhóm hoặc đồ án. Hãy kiểm tra hồ sơ học vụ hoặc liên hệ cán bộ bộ môn.'
    render(<MemoryRouter><StudentJourneyHero /></MemoryRouter>)
    expect(screen.getByText(state.error)).toBeDefined()
    expect(screen.queryByText(/kiểm tra kết nối/)).toBeNull()
    expect(state.refresh).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /Thử tải lại/ }))
    expect(state.refresh).toHaveBeenCalledTimes(1)
  })
})
