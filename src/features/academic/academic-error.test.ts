import { describe, expect, it } from 'vitest'
import { HttpError } from '../../services/http/http-client'
import { academicError } from './academic-error'

describe('academic error guidance', () => {
  it('does not classify uncoded conflicts by backend English prose', () => {
    const overlap = academicError(new HttpError('internal', 409, {
      detail: "Project Period window overlaps with an existing 'REGISTRATION' period in this semester.",
      traceId: 'PRIVATE_TRACE',
    }), 'governance')
    const duplicate = academicError(new HttpError('internal', 409, { detail: 'A code already exists.' }), 'governance')
    expect(overlap).toEqual(duplicate)
    expect(overlap.message).toContain('kiểm tra mã, khoảng thời gian')
    expect(overlap.action).toBeUndefined()
    expect(JSON.stringify(overlap)).not.toMatch(/PRIVATE|internal|overlaps|REGISTRATION/)
  })

  it('offers reconciliation for a known stale version without echoing backend content', () => {
    expect(academicError(new HttpError('internal', 409, { code: 'STALE_CONCURRENCY_TOKEN' }), 'policy'))
      .toMatchObject({ message: expect.stringContaining('Dữ liệu đã thay đổi'), action: 'reload' })
  })

  it('maps only allowlisted field names, never server field messages or unknown keys', () => {
    const error = academicError(new HttpError('internal', 422, {
      errors: { Code: ['PRIVATE_FIELD_MESSAGE'], 'Policy.MaxTeamSize': ['PRIVATE_LIMIT'], '$.EndAt': ['PRIVATE_DATE'], secret: ['PRIVATE_SECRET'] },
      detail: 'PRIVATE_DETAIL', traceId: 'PRIVATE_TRACE', code: 'UNKNOWN_CODE',
    }), 'policy')
    expect(Object.keys(error.fields ?? {})).toEqual(['code', 'maxTeamSize', 'endAt'])
    expect(error.action).toBeUndefined()
    expect(JSON.stringify(error)).not.toContain('PRIVATE')
  })

  it.each([400, 403, 422])('does not suggest retry for a domain or permission rejection %s', status => {
    expect(academicError(new HttpError('internal', status), 'governance').action).toBeUndefined()
  })

  it.each([new TypeError('PRIVATE_NETWORK'), new HttpError('PRIVATE_SERVER', 503)])('offers retry for an unavailable service', reason => {
    const error = academicError(reason, 'governance')
    expect(error.action).toBe('retry')
    expect(error.message).not.toContain('PRIVATE')
  })
})
