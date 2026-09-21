import { describe, expect, it } from 'vitest'
import { getMockQualification, isMockStudentQualificationEligible } from './qualification.mock'

describe('qualification mock parity', () => {
  it('keeps verified, pending, rejected, and expired seed qualifications distinct', () => {
    expect(getMockQualification(1)?.verificationStatus).toBe('VERIFIED')
    expect(isMockStudentQualificationEligible(1)).toBe(true)

    expect(getMockQualification(5)?.verificationStatus).toBe('PENDING_VERIFICATION')
    expect(isMockStudentQualificationEligible(5)).toBe(false)

    expect(getMockQualification(7)?.verificationStatus).toBe('REJECTED')
    expect(isMockStudentQualificationEligible(7)).toBe(false)

    expect(getMockQualification(8)?.expiresAt).toBe('2025-12-31T00:00:00Z')
    expect(isMockStudentQualificationEligible(8, new Date('2026-09-22T00:00:00Z'))).toBe(false)
  })
})
