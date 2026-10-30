import { describe, expect, it } from 'vitest'
import { workflowErrorFromCode } from './execution-error-codes'

describe('workflowErrorFromCode', () => {
  it.each([
    ['EXECUTION_WINDOW_REQUIRED', 'Đồ án chưa có kỳ thực hiện đang mở nên chưa nộp được hạng mục. Liên hệ bộ môn để mở kỳ.', false, undefined],
    ['PROJECT_NOT_ACTIVE', 'Đồ án chưa ở trạng thái đang thực hiện.', false, undefined],
    ['DELIVERABLE_LOCKED', 'Hạng mục đã được chấp nhận hoặc khóa.', false, undefined],
    ['DELIVERABLE_DEADLINE_PASSED', 'Đã qua hạn nộp của hạng mục.', false, undefined],
    ['STALE_LATEST_VERSION', 'Hạng mục đã có phiên bản mới hơn.', true, 'reload'],
    ['NOT_LATEST_PENDING_VERSION', 'Chỉ phiên bản đang chờ mới nhất mới được đánh giá.', true, 'reload'],
    ['MILESTONE_NOT_IN_PROJECT', 'Mốc tiến độ đã chọn không thuộc đồ án này.', false, undefined],
    ['DELIVERABLE_HAS_SUBMITTED_HISTORY', 'Hạng mục đã có lịch sử nộp, không thể xóa.', false, undefined],
    ['REPORT_NOT_EDITABLE', 'Báo cáo đã nộp hoặc được nhận xét, không thể sửa.', false, undefined],
    ['REPORT_ALREADY_SUBMITTED', 'Báo cáo đã được nộp.', false, undefined],
    ['STALE_CONCURRENCY_TOKEN', 'Báo cáo đã thay đổi. Tải lại trạng thái và đối chiếu trước khi lưu tiếp.', true, 'reload'],
  ] as const)('maps verified code %s without exposing backend detail', (code, phrase, retryable, nextAction) => {
    const result = workflowErrorFromCode(code)
    expect(result?.message).toContain(phrase)
    expect(result?.retryable).toBe(retryable)
    expect(result?.nextAction).toBe(nextAction)
  })

  it.each([
    'REPORT_CYCLE_REQUIRED',
    'REPORT_DEADLINE_PASSED',
    'REPORT_ALREADY_EXISTS_FOR_CYCLE',
    'REPORT_ALREADY_EXISTS_FOR_PERIOD',
    'REPORT_FEEDBACK_ON_DRAFT_NOT_ALLOWED',
    'UNRECOGNIZED_CODE',
  ])('keeps code %s on the safe generic path until its response is verified', code => {
    expect(workflowErrorFromCode(code)).toBeUndefined()
  })
})
