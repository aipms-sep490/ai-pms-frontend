import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TeamEligibilitySummary } from './TeamEligibilitySummary'

const team = (overrides = {}) => ({
  id: 28, academicSemesterId: 7, code: 'SE28', name: 'Team SE28', status: 'FORMING',
  members: [{ userId: 1, fullName: 'Leader', majorId: 10, isLeader: true, isEligibleStudent: true }],
  eligibility: { canRegister: false, rosterLocked: false, policyVersion: 'v1', reasons: ['TOO_FEW_MEMBERS', 'MAJOR_MIN_MEMBERS:10'] },
  academicScope: { projectMode: 'INTERDISCIPLINARY', primaryMajorId: null, leadDepartmentId: 2, concurrencyToken: 'token', requirements: [
    { majorId: 10, minMembers: 2, maxMembers: 3, responsibility: 'Lead' },
    { majorId: 20, minMembers: 1, maxMembers: 2, responsibility: 'Research' },
    { majorId: 30, minMembers: 1, maxMembers: 2, responsibility: 'Build' },
  ] },
  ...overrides,
})

function summary(overrides = {}) {
  const props = { team: team(), canRefresh: true, refreshPending: false, canContinueToRegistration: false, onRefresh: vi.fn().mockResolvedValue(undefined), onContinueToRegistration: vi.fn(), ...overrides }
  return { props, ...render(<TeamEligibilitySummary {...props} />) }
}

describe('TeamEligibilitySummary', () => {
  it('renders INTERDISCIPLINARY requirements without a two-major limit and explains backend failures', () => {
    summary()

    expect(screen.getByText('Major #10')).toBeTruthy()
    expect(screen.getByText('Major #20')).toBeTruthy()
    expect(screen.getByText('Major #30')).toBeTruthy()
    expect(screen.getByText('Chưa đủ thành viên')).toBeTruthy()
    expect(screen.queryByText('Tiếp tục đăng ký đề tài')).toBeNull()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('shows F6 entry only for backend PASS plus allowed project action', () => {
    const { props } = summary({
      team: team({ eligibility: { canRegister: true, rosterLocked: false, policyVersion: 'v1', reasons: [] } }),
      canContinueToRegistration: true,
    })

    fireEvent.click(screen.getByText('Tiếp tục đăng ký đề tài'))
    expect(props.onContinueToRegistration).toHaveBeenCalledOnce()
  })

  it('prevents duplicate refresh click while the backend check is pending', () => {
    const { props } = summary({ refreshPending: true })
    const button = screen.getByText('Đang kiểm tra...') as HTMLButtonElement

    expect(button.disabled).toBe(true)
    expect(props.onRefresh).not.toHaveBeenCalled()
  })
})
