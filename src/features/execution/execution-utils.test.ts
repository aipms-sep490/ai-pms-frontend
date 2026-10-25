import { describe, expect, it } from 'vitest'
import { HttpError } from '../../services/http/http-client'
import {
  classifyExecutionError,
  dateTimeLabel,
  executionError,
  localDateTime,
  toUtcDateTime,
} from './execution-utils'

describe('execution-utils', () => {
  describe('classifyExecutionError & executionError', () => {
    it('translates UX-04 task BLOCKED validation error into clear Vietnamese reason required guidance', () => {
      const error = new HttpError(
        'One or more validation errors occurred.',
        400,
        {
          status: 400,
          errors: {
            Reason: ['A reason is required when transition status to BLOCKED.'],
          },
          traceId: '00-84c1b12b5e7d58a8f1073cb76632ab51-51b6eb7a7e80a520-00',
        },
      )

      const classified = classifyExecutionError(error)
      expect(classified.message).toBe('Vui lòng nhập lý do hoặc vướng mắc khi chuyển công việc sang trạng thái Bị chặn.')
      expect(classified.isRetryable).toBe(false)
      expect(classified.isBusinessRule).toBe(true)
      expect(classified.message).not.toContain('traceId')
      expect(classified.message).not.toContain('84c1b12b')

      expect(executionError(error)).toBe('Vui lòng nhập lý do hoặc vướng mắc khi chuyển công việc sang trạng thái Bị chặn.')
    })

    it('translates UX-05 missing execution window into clear academic period guidance without retry button', () => {
      const error = new HttpError(
        'Conflict',
        409,
        {
          status: 409,
          detail: 'One active execution window in the current semester is required.',
          code: 'EXECUTION_WINDOW_REQUIRED',
          traceId: '00-50b284e36506d19eec81cb289b4f9c5d-35bd35f3dfd91244-00',
        },
      )

      const classified = classifyExecutionError(error)
      expect(classified.message).toContain('Execution Window')
      expect(classified.message).toContain('liên hệ cán bộ bộ môn')
      expect(classified.isRetryable).toBe(false)
      expect(classified.isBusinessRule).toBe(true)
      expect(classified.message).not.toContain('traceId')
      expect(classified.message).not.toContain('50b284e3')
    })

    it('translates missing execution window from detail when code is missing', () => {
      const error = new HttpError(
        'Conflict',
        409,
        {
          status: 409,
          detail: 'One active execution window in the current semester is required.',
        },
      )

      const classified = classifyExecutionError(error)
      expect(classified.message).toContain('Execution Window')
      expect(classified.isRetryable).toBe(false)
      expect(classified.isBusinessRule).toBe(true)
    })

    it('marks server errors (5xx) as retryable without exposing internal trace details', () => {
      const error = new HttpError(
        'Internal Server Error',
        500,
        {
          status: 500,
          detail: 'NullReferenceException at Service.cs:42',
          traceId: 'secret-trace-id',
        },
      )

      const classified = classifyExecutionError(error)
      expect(classified.message).toBe('Máy chủ đang bận hoặc gặp sự cố tạm thời. Hãy thử lại.')
      expect(classified.isRetryable).toBe(true)
      expect(classified.isBusinessRule).toBe(false)
      expect(classified.message).not.toContain('NullReferenceException')
      expect(classified.message).not.toContain('secret-trace-id')
    })

    it('marks network and unknown errors as retryable with friendly action context', () => {
      const error = new TypeError('Failed to fetch')
      const classified = classifyExecutionError(error, 'cập nhật công việc')

      expect(classified.message).toBe('Chưa thể cập nhật công việc. Hãy kiểm tra kết nối mạng và thử lại.')
      expect(classified.isRetryable).toBe(true)
      expect(classified.isBusinessRule).toBe(false)
    })
  })

  describe('date time helpers', () => {
    it('formats ISO timestamps with Asia/Ho_Chi_Minh timezone', () => {
      expect(dateTimeLabel('2026-10-24T08:30:00Z')).toContain('2026')
      expect(dateTimeLabel(null)).toBe('Chưa xác định')
      expect(dateTimeLabel('invalid')).toBe('Chưa xác định')
    })

    it('converts to and from local ISO strings', () => {
      expect(localDateTime(null)).toBe('')
      expect(toUtcDateTime('2026-10-24T15:30')).toContain('2026-10-24T08:30:00')
    })
  })
})
