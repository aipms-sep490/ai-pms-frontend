import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useTeamEligibility } from './useTeamEligibility'

const team = (overrides = {}) => ({
  id: 28, academicSemesterId: 7, code: 'HYB28', name: 'Hybrid Team', status: 'FORMING',
  members: [
    { userId: 1, fullName: 'Leader', majorId: 10, isLeader: true, isEligibleStudent: true },
    { userId: 2, fullName: 'Member', majorId: 20, isLeader: false, isEligibleStudent: true },
  ],
  eligibility: { canRegister: false, rosterLocked: false, registrationPeriodId: 3, policyVersion: 'v2', reasons: ['MAJOR_MIN_MEMBERS:20'] },
  academicScope: { projectMode: 'INTERDISCIPLINARY', primaryMajorId: null, leadDepartmentId: 2, concurrencyToken: 'token', requirements: [
    { majorId: 10, minMembers: 1, maxMembers: 3, responsibility: 'Lead' },
    { majorId: 20, minMembers: 2, maxMembers: 3, responsibility: 'Build' },
    { majorId: 30, minMembers: 1, maxMembers: 2, responsibility: 'Research' },
  ] },
  ...overrides,
})

describe('useTeamEligibility', () => {
  it('presents PASS only from backend canRegister and retains policy evidence', () => {
    const { result } = renderHook(() => useTeamEligibility(team({
      eligibility: { canRegister: true, rosterLocked: false, registrationPeriodId: 3, policyVersion: 'v2', reasons: [] },
    })))

    expect(result.current).toMatchObject({ status: 'PASS', policyVersion: 'v2', registrationPeriodId: 3 })
  })

  it('maps dynamic backend quota issues for three requirements without a local eligibility decision', () => {
    const { result } = renderHook(() => useTeamEligibility(team()))

    expect(result.current?.status).toBe('FAIL')
    expect(result.current?.requirements).toHaveLength(3)
    expect(result.current?.requirements.find((item) => item.majorId === 20)?.status).toBe('FAIL')
    expect(result.current?.requirements.find((item) => item.majorId === 10)?.status).toBe('NO_BACKEND_VIOLATION')
    expect(result.current?.issues[0]).toMatchObject({ majorId: 20, code: 'MAJOR_MIN_MEMBERS:20' })
  })

  it('keeps unknown backend issue codes visible without exposing an arbitrary backend message', () => {
    const { result } = renderHook(() => useTeamEligibility(team({
      eligibility: { canRegister: false, rosterLocked: false, reasons: ['FUTURE_POLICY_REASON'] },
    })))

    expect(result.current?.issues[0]).toMatchObject({ code: 'FUTURE_POLICY_REASON', title: 'Backend báo một điều kiện chưa đạt' })
  })
})
