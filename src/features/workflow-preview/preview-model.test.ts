import { describe, expect, it } from 'vitest'
import { coldCriteria, finalizeScores, approveLeader, uploadReport, submitReport, lockReport, saveWeekly } from './preview-model'

describe('isolated workflow fixture transitions', () => {
  const file = { name: 'report.pdf', size: 100, type: 'application/pdf' }
  it('rejects expired, unsupported and oversized reports', () => {
    expect(() => uploadReport([], 1, file, true)).toThrow('SUBMISSION_DEADLINE_PASSED')
    expect(() => uploadReport([], 1, { ...file, name: 'evil.exe' }, false)).toThrow('FILE_TYPE_NOT_ALLOWED')
    expect(() => uploadReport([], 1, { ...file, size: 11 * 1024 * 1024 }, false)).toThrow('FILE_TOO_LARGE')
  })
  it('versions an editable report and preserves a locked version', () => {
    const first = uploadReport([], 1, file, false)
    const second = uploadReport(first, 1, file, false)
    expect(second[0].version).toBe(2)
    expect(() => lockReport(second, 1)).toThrow('SUBMIT_REQUIRED')
    const locked = lockReport(submitReport(second, 1, false), 1)
    expect(() => uploadReport(locked, 1, file, false)).toThrow('ALREADY_LOCKED')
    expect(locked[0].status).toBe('LOCKED')
  })
  it('does not finalize a missing or out of range criterion as zero', () => {
    expect(() => finalizeScores(coldCriteria, {})).toThrow('SCORES_INCOMPLETE')
    expect(() => finalizeScores(coldCriteria, { 1: '6', 2: '5', 3: '15', 4: '5' })).toThrow('SCORE_OUT_OF_RANGE')
    expect(finalizeScores(coldCriteria, { 1: '0', 2: '5', 3: '15', 4: '5' })).toBe(25)
  })
  it('cannot approve a departed target or a processed request', () => {
    expect(() => approveLeader({ targetId: 2, status: 'PENDING' }, [1])).toThrow('TARGET_NOT_TEAM_MEMBER')
    expect(() => approveLeader({ targetId: 2, status: 'APPROVED' }, [1, 2])).toThrow('ALREADY_PROCESSED')
    expect(approveLeader({ targetId: 2, status: 'PENDING' }, [1, 2])).toBe(2)
  })
  it('requires complete weekly scores on submission and preserves missing draft scores', () => {
    expect(saveWeekly({}, false).total).toBeNull()
    expect(() => saveWeekly({}, true)).toThrow('SCORES_INCOMPLETE')
    expect(saveWeekly({ 1: '8', 2: '8', 3: '8' }, true).total).toBe(8)
  })
})
