import { describe, expect, it } from 'vitest'
import { getAvatarTone, getInitials } from './initials'

describe('getInitials', () => {
  it('strips parenthetical tags like (Flow IT) and (Flow MKT)', () => {
    expect(getInitials('Lê Hoàng Long (Flow IT)')).toBe('LL')
    expect(getInitials('Phạm Thùy Linh (Flow MKT)')).toBe('PL')
  })

  it('handles Vietnamese names with diacritics and đ properly', () => {
    expect(getInitials('Nguyễn Đức Minh')).toBe('NM')
    expect(getInitials('đỗ văn thành')).toBe('ĐT')
    expect(getInitials('Trần Ánh Dương')).toBe('TD')
  })

  it('ignores bracketed prefixes and trailing numbers when alphabetic words exist', () => {
    expect(getInitials('[TEST] Lecturer IT 2')).toBe('LI')
    expect(getInitials('TEST Lecturer IT 2')).toBe('TI')
  })

  it('handles single-word names and empty values', () => {
    expect(getInitials('Admin')).toBe('AD')
    expect(getInitials('A')).toBe('A')
    expect(getInitials('')).toBe('?')
    expect(getInitials(null, 'TK')).toBe('TK')
  })
})

describe('getAvatarTone', () => {
  it('returns deterministic semantic tones for the same seed', () => {
    const first = getAvatarTone('Lê Hoàng Long')
    const second = getAvatarTone('lê hoàng long')
    expect(first).toBe(second)
    expect(['primary', 'se', 'success', 'uiux', 'warning']).toContain(first)
  })
})
