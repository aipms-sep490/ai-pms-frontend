import { describe, expect, it } from 'vitest'
import { HttpError } from '../../services/http/http-client'
import { deliverableError, needsAuthoritativeRefresh } from './deliverable-errors'

describe('deliverableError', () => {
  it('explains the verified missing execution window without offering a retry', () => {
    const result = deliverableError(new HttpError('private English detail', 409, {
      code: 'EXECUTION_WINDOW_REQUIRED', detail: 'private English detail', traceId: 'private trace',
    }))
    expect(result).toEqual({
      message: 'Đồ án chưa có kỳ thực hiện đang mở nên chưa nộp được hạng mục. Liên hệ bộ môn để mở kỳ.',
      retryable: false,
    })
    expect(JSON.stringify(result)).not.toMatch(/private English detail|private trace|EXECUTION_WINDOW_REQUIRED/)
    expect(needsAuthoritativeRefresh(new HttpError('window', 409, { code: 'EXECUTION_WINDOW_REQUIRED' }))).toBe(false)
  })

  it('distinguishes a verified stale version and asks for authoritative reload', () => {
    const error = new HttpError('private', 409, { code: 'STALE_LATEST_VERSION' })
    expect(deliverableError(error)).toMatchObject({ retryable: true, nextAction: 'reload' })
    expect(needsAuthoritativeRefresh(error)).toBe(true)
  })

  it('keeps unknown codes and missing problem bodies generic without leaking them', () => {
    for (const error of [
      new HttpError('English', 409, { code: 'UNRECOGNIZED_CODE', detail: 'English', traceId: 'secret' }),
      new HttpError('English', 409),
    ]) {
      const result = deliverableError(error)
      expect(result.retryable).toBe(false)
      expect(result.message).toContain('Chưa thể xác nhận')
      expect(JSON.stringify(result)).not.toMatch(/English|UNRECOGNIZED_CODE|secret/)
    }
  })

  it('allows an explicit read retry for transient failures and denies it for permission failures', () => {
    expect(deliverableError(new HttpError('server trace', 503, { traceId: 'private' }))).toMatchObject({ retryable: true, nextAction: 'retry' })
    expect(deliverableError(new Error('offline'))).toMatchObject({ retryable: true, nextAction: 'retry' })
    expect(deliverableError(new HttpError('denied', 403))).toMatchObject({ retryable: false })
  })

  it('converts known validation field keys into safe Vietnamese field errors', () => {
    const result = deliverableError(new HttpError('private', 422, {
      errors: { 'request.File': ['English file detail'], note: ['English note detail'], privateField: ['secret'] },
      traceId: 'private trace',
    }))
    expect(result.fieldErrors).toEqual({ file: 'Kiểm tra tệp đã chọn.', note: 'Kiểm tra ghi chú phiên bản.' })
    expect(JSON.stringify(result)).not.toMatch(/English|privateField|secret|private trace/)
  })
})
