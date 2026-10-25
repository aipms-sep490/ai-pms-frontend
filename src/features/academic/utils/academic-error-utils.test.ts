import { describe, expect, it } from 'vitest'
import { HttpError } from '../../../services/http/http-client'
import { classifyAcademicError } from './academic-error-utils'

describe('classifyAcademicError (UX-01 / ADM-29)', () => {
  it('identifies 409 phase window overlap error with descriptive Vietnamese copy', () => {
    const error = new HttpError('Conflict', 409, {
      title: 'Conflict',
      status: 409,
      detail: "Project Period window overlaps with an existing 'REGISTRATION' period in this semester.",
    })
    const msg = classifyAcademicError(error)
    expect(msg).toContain('trùng lặp với một giai đoạn khác cùng loại')
  })

  it('identifies 409 activation overlap error with descriptive Vietnamese copy', () => {
    const error = new HttpError('Conflict', 409, {
      title: 'Conflict',
      status: 409,
      detail: "Cannot activate project period: it overlaps with another active 'REGISTRATION' period in this semester.",
    })
    const msg = classifyAcademicError(error)
    expect(msg).toContain('trùng lặp với một giai đoạn khác cùng loại')
  })

  it('identifies 409 code PERIOD_OVERLAP', () => {
    const error = new HttpError('Conflict', 409, {
      code: 'PERIOD_OVERLAP',
      status: 409,
    })
    const msg = classifyAcademicError(error)
    expect(msg).toContain('trùng lặp với một giai đoạn khác cùng loại')
  })

  it('identifies 409 closed semester or period', () => {
    const error = new HttpError('Conflict', 409, {
      detail: 'Cannot add project periods to a closed or archived semester.',
      status: 409,
    })
    const msg = classifyAcademicError(error)
    expect(msg).toContain('đã đóng hoặc được lưu trữ')
  })

  it('handles 403 forbidden without exposing technical details', () => {
    const error = new HttpError('Forbidden', 403)
    const msg = classifyAcademicError(error)
    expect(msg).toBe('Bạn chưa có quyền quản trị hoặc thay đổi cấu hình học vụ này.')
  })

  it('handles 400 date range validation error gracefully in Vietnamese', () => {
    const error = new HttpError('Bad Request', 400, {
      detail: 'Start date must be before end date',
      status: 400,
    })
    const msg = classifyAcademicError(error)
    expect(msg).toContain('Ngày bắt đầu phải diễn ra trước ngày kết thúc')
  })

  it('falls back to safe Vietnamese message on 500 server error', () => {
    const error = new HttpError('Internal Server Error', 500)
    const msg = classifyAcademicError(error)
    expect(msg).toBe('Máy chủ đang gặp sự cố khi xử lý cấu hình học vụ. Vui lòng thử lại sau giây lát.')
  })
})
