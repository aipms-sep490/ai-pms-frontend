import { describe, expect, it } from 'vitest'
import { evaluatorApprovalLabel } from './evaluator-approval'

describe('evaluator approval label', () => {
  it('keeps missing approval metadata explicitly unknown', () => {
    expect(evaluatorApprovalLabel({}).tone).toBe('neutral')
  })
  it('describes a demo as not official', () => {
    expect(evaluatorApprovalLabel({ isDemo: true, approvalStatus: 'DEMO' }).text).toContain('chưa phải điểm chính thức')
  })
  it('uses validated non-demo approval without requiring a field absent from BE-09', () => {
    expect(evaluatorApprovalLabel({ isDemo: false, approvalStatus: 'APPROVED' }).tone).toBe('success')
  })
  it('does not trust a contradictory demo and approved payload', () => {
    expect(evaluatorApprovalLabel({ isDemo: true, approvalStatus: 'APPROVED' }).tone).toBe('warning')
  })
  it('does not call a non-demo scheme official without approved status', () => {
    expect(evaluatorApprovalLabel({ isDemo: false, approvalStatus: 'DEMO' }).tone).toBe('neutral')
  })
})
