import { describe, expect, it } from 'vitest'
import { HttpError } from '../../services/http/http-client'
import { reportError } from './report-errors'

describe('reportError temporary BE prose mapping', () => {
  it.each([
    [409, 'A progress report has already been created for this reporting cycle.', 'Kỳ báo cáo này đã có báo cáo.'],
    [409, 'Progress report must be linked to a reporting cycle before submission.', 'cần được gắn với một kỳ báo cáo'],
    [409, 'Submission deadline has passed for this reporting cycle.', 'Đã quá hạn nộp'],
  ])('maps BE response %i %s to an actionable Vietnamese message', (status, detail, expected) => {
    expect(reportError(new HttpError(detail, status, { detail }))).toContain(expected)
  })

  it('maps the BE report-type validation message from problem.errors', () => {
    const reason = new HttpError('Validation failed', 400, {
      detail: 'Validation failed.',
      errors: { reportType: ["Report type does not match the cycle's report type 'WEEKLY'."] },
    })
    expect(reportError(reason)).toContain('không khớp với kỳ báo cáo')
  })

  it('keeps unknown conflicts generic rather than inferring their business cause', () => {
    expect(reportError(new HttpError('New BE message', 409, { detail: 'New BE message' }))).toContain('Dữ liệu đã thay đổi')
  })
})
