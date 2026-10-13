import { describe, expect, it } from 'vitest'
import { buildReadinessChecklist, describeReadinessReason } from './submission-readiness'

describe('describeReadinessReason', () => {
  it('maps a known static reason code to its Vietnamese label', () => {
    expect(describeReadinessReason('SUPERVISOR_NOT_CONFIRMED')).toEqual({
      code: 'SUPERVISOR_NOT_CONFIRMED',
      severity: 'blocked',
      label: 'Chưa có giảng viên hướng dẫn chính xác nhận lời mời.',
    })
  })

  it('resolves MENTOR_NOT_CONFIRMED:<majorId> using the provided name lookup', () => {
    const item = describeReadinessReason('MENTOR_NOT_CONFIRMED:14', (majorId) => majorId === 14 ? 'An toàn thông tin' : undefined)
    expect(item.severity).toBe('blocked')
    expect(item.label).toBe('Chưa có Mentor xác nhận cho ngành An toàn thông tin.')
  })

  it('falls back to #<majorId> when no name resolver is given', () => {
    expect(describeReadinessReason('MENTOR_NOT_CONFIRMED:14').label).toBe('Chưa có Mentor xác nhận cho ngành #14.')
  })

  it('resolves PROPOSAL_CONTENT_INCOMPLETE:<field> to a field label', () => {
    expect(describeReadinessReason('PROPOSAL_CONTENT_INCOMPLETE:problemStatement').label)
      .toBe('Thiếu nội dung: Bối cảnh / vấn đề cần giải quyết.')
  })

  it('falls back to the raw field name when it is not in the label table', () => {
    expect(describeReadinessReason('PROPOSAL_CONTENT_INCOMPLETE:unknownField').label)
      .toBe('Thiếu nội dung: unknownField.')
  })

  it('falls back to the raw code for an unmapped reason so it never disappears silently', () => {
    expect(describeReadinessReason('SOME_FUTURE_REASON').label).toBe('Điều kiện chưa đáp ứng (SOME_FUTURE_REASON).')
  })
})

describe('buildReadinessChecklist', () => {
  it('maps every reason in order and threads the major-name resolver through', () => {
    const items = buildReadinessChecklist(
      ['SUPERVISOR_NOT_CONFIRMED', 'MENTOR_NOT_CONFIRMED:7'],
      (majorId) => majorId === 7 ? 'Kỹ thuật phần mềm' : undefined,
    )
    expect(items).toHaveLength(2)
    expect(items[0].code).toBe('SUPERVISOR_NOT_CONFIRMED')
    expect(items[1].label).toBe('Chưa có Mentor xác nhận cho ngành Kỹ thuật phần mềm.')
  })

  it('returns an empty list for an empty reason set', () => {
    expect(buildReadinessChecklist([])).toEqual([])
  })
})
