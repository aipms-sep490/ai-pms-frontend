import { describe, expect, it } from 'vitest'
import { toTemplateRequest, validateGateWeights } from './review-gates-contract'
import type { ReviewGate, ReviewGateTemplate } from '../types/review-gates.types'

const gates = (weights: Array<number | undefined>) => weights.map((weight, i) => ({
  id: String(i), code: `R${i + 1}`, title: 'Review', objective: '', required: true,
  blockNextGate: true, start: null, end: null, reviewerPolicy: 'Assigned Reviewer',
  reviewScope: 'COMMON', requirements: [], weight,
})) as ReviewGate[]

describe('gate weights match SaveTemplate', () => {
  it.each([[undefined, undefined], [20, 20, 35, 25], [0, 100], [33.3, 33.3, 33.4]])('accepts all unset or all totaling 100: %j', (...weights) => {
    expect(validateGateWeights(gates(weights))).toBeNull()
  })
  it.each([[20, undefined], [20, 70], [-1, 101], [101, 0], [NaN, 100], [Infinity, 0]])('rejects incomplete, invalid or incorrect totals: %j', (...weights) => {
    expect(validateGateWeights(gates(weights))).toMatch(/Tổng hiện tại/)
  })
  it('sends explicit weights including zero and preserves unset as null', () => {
    const template = { code: 'T', name: 'Template', gates: gates([0, 100]) } as ReviewGateTemplate
    expect(toTemplateRequest(template).gates.map(g => g.weight)).toEqual([0, 100])
    expect(toTemplateRequest({ ...template, gates: gates([undefined]) }).gates[0].weight).toBeNull()
  })
  it('refuses an invalid payload before transport', () => {
    expect(() => toTemplateRequest({ gates: gates([10, undefined]) } as ReviewGateTemplate)).toThrow(/Tổng hiện tại/)
  })
})
