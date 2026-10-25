import { describe, expect, it } from 'vitest'
import { HttpError } from '../../services/http/http-client'
import { executionError } from './execution-utils'

describe('executionError', () => {
  it('keeps unknown backend code, detail, and trace ID out of user-facing text', () => {
    const error = new HttpError('Internal English detail', 409, { code: 'UNRECOGNIZED', detail: 'Internal English detail', traceId: 'secret-trace' })
    const message = executionError(error)
    expect(message).toContain('Thông tin đã thay đổi')
    expect(message).not.toMatch(/UNRECOGNIZED|Internal English detail|secret-trace/)
  })

  it('uses safe status fallbacks when no problem body is available', () => {
    expect(executionError(new HttpError('expired', 401))).toContain('Phiên đăng nhập')
    expect(executionError(new HttpError('denied', 403))).toContain('chưa có quyền')
    expect(executionError(new HttpError('invalid', 422))).toContain('Thông tin chưa hợp lệ')
    expect(executionError(new Error('network'), 'lưu thay đổi')).toBe('Chưa thể lưu thay đổi. Hãy thử lại.')
  })
})
