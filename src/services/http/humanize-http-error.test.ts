import { describe, expect, it } from 'vitest'
import { HttpError } from './http-client'
import { humanizeHttpError } from './humanize-http-error'

describe('humanizeHttpError', () => {
  it('translates browser network errors into natural Vietnamese', () => {
    expect(humanizeHttpError(new TypeError('Failed to fetch'))).toContain('Không thể kết nối tới máy chủ')
    expect(humanizeHttpError(new Error('NetworkError when attempting to fetch resource.'))).toContain('Kết nối mạng bị gián đoạn')
  })

  it('maps raw English ProblemDetails and HTTP status messages without leaking English jargon', () => {
    expect(humanizeHttpError(new HttpError('Request failed with status 500.', 500))).toContain('Hệ thống đang gặp sự cố tạm thời')
    expect(humanizeHttpError(new HttpError('Forbidden', 403))).toContain('không có quyền')
    expect(humanizeHttpError(new HttpError('The record was modified by another user.', 409))).toContain('vừa được cập nhật')
    expect(humanizeHttpError(new HttpError('Administrative accounts without academic department staff authority cannot access this resource.', 403))).toContain('Tài khoản quản trị chưa được gán quyền cán bộ bộ môn')
  })

  it('preserves already-localized Vietnamese messages from backend validation', () => {
    expect(humanizeHttpError(new HttpError('Tên đề tài đã tồn tại trong học kỳ này.', 409))).toBe('Tên đề tài đã tồn tại trong học kỳ này.')
  })

  it('returns the provided fallback for unknown or empty failures', () => {
    expect(humanizeHttpError(null, 'Thử lại sau.')).toBe('Thử lại sau.')
    expect(humanizeHttpError(new Error('Something went wrong internally'), 'Không thể lưu biểu mẫu.')).toBe('Không thể lưu biểu mẫu.')
  })
})
