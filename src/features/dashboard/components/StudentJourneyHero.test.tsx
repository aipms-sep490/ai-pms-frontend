import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StudentJourneyHero } from './StudentJourneyHero'

const state = vi.hoisted(() => ({ journeyState: 'ACTIVE' as string, error: null as string | null, refresh: vi.fn() }))

vi.mock('../../../app/context', () => ({
  useStudentJourney: () => ({
    journeyState: state.journeyState, assignments: [], project: { title: 'Đồ án thử nghiệm' },
    team: null, semester: null, period: null, profile: null, error: state.error, refreshAll: state.refresh,
  }),
}))

afterEach(() => { cleanup(); vi.resetAllMocks(); state.error = null; state.journeyState = 'ACTIVE' })

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

  it('shows distinct badges and routes for FINAL_SUBMISSION and COMPLETED instead of ACTIVE', () => {
    state.journeyState = 'FINAL_SUBMISSION'
    const view = render(<MemoryRouter><StudentJourneyHero /><Location /></MemoryRouter>)
    expect(screen.getByText('Giai đoạn Bàn giao cuối kỳ')).toBeTruthy()
    expect(screen.queryByText(/Đang hoạt động/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Mở bàn giao cuối kỳ/ }))
    expect(screen.getByTestId('location').textContent).toBe('/project/final-submission')

    state.journeyState = 'COMPLETED'
    view.rerender(<MemoryRouter><StudentJourneyHero /><Location /></MemoryRouter>)
    expect(screen.getByText('Đã hoàn thành đồ án')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Xem kết quả đồ án/ }))
    expect(screen.getByTestId('location').textContent).toBe('/project/result')
  })
})
