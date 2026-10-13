import { describe, expect, it } from 'vitest'
import { formatCount, formatNumber, formatPercent, formatScore } from './format'

describe('format', () => {
  it('renders missing values as an em dash, never as 0', () => {
    expect(formatNumber(null)).toBe('—')
    expect(formatNumber(undefined)).toBe('—')
    expect(formatNumber(Number.NaN)).toBe('—')
    expect(formatScore(null)).toBe('—')
    expect(formatPercent(undefined)).toBe('—')
    expect(formatCount(null)).toBe('—')
  })

  it('formats a score up to 2 decimals without padding', () => {
    expect(formatScore(8)).toBe('8')
    expect(formatScore(7.5)).toBe('7,5')
    expect(formatScore(7.456)).toBe('7,46')
  })

  it('formats a percent value that is already a percentage number', () => {
    expect(formatPercent(50)).toBe('50%')
    expect(formatPercent(33.33)).toBe('33,3%')
    expect(formatPercent(0)).toBe('0%')
  })

  it('formats a plain integer count', () => {
    expect(formatCount(8)).toBe('8')
    expect(formatCount(0)).toBe('0')
  })

  it('distinguishes a real zero from a missing value', () => {
    expect(formatScore(0)).toBe('0')
    expect(formatScore(0)).not.toBe('—')
  })
})
