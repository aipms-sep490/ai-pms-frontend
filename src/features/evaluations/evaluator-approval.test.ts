import { describe, expect, it } from 'vitest'
import { evaluatorApprovalLabel } from './evaluator-approval'

describe('evaluator approval label', () => {
  it('keeps missing approval metadata explicitly unknown', () => {
    expect(evaluatorApprovalLabel({}).tone).toBe('neutral')
  })
  it('describes a demo as not official', () => {
    expect(evaluatorApprovalLabel({ schemeIsDemo: true, schemeApprovalStatus: 'DEMO' }).text).toContain('chưa phải điểm chính thức')
  })
  it('requires a BE reference as well as approved status before showing official', () => {
    expect(evaluatorApprovalLabel({ schemeIsDemo: false, schemeApprovalStatus: 'APPROVED' }).tone).toBe('warning')
    expect(evaluatorApprovalLabel({ schemeIsDemo: false, schemeApprovalStatus: 'APPROVED', schemeApprovalReference: 'QĐ-123' }).tone).toBe('success')
  })
  it('does not trust a contradictory demo and approved payload', () => {
    expect(evaluatorApprovalLabel({ schemeIsDemo: true, schemeApprovalStatus: 'APPROVED', schemeApprovalReference: 'QĐ-123' }).tone).toBe('warning')
  })
})
