import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { EvaluationSchemePolicySummary } from './EvaluationSchemePolicySummary'
import type { EvaluationScheme, SchemePolicy } from './evaluation-types'

const policy: SchemePolicy = { isDemo: false, approvalStatus: 'APPROVED', approvalReference: 'QD/2026/123', formula: 'COMPONENT_WEIGHTS', calculationVersion: 'DECIMAL_V2', roundingMode: 'AWAY_FROM_ZERO', decimalPlaces: 2 }
const scheme: EvaluationScheme = { id: 1, rootId: 1, version: 1, projectId: 9, projectPeriodId: 4, name: 'Scheme', status: 'PUBLISHED', passThreshold: 5, concurrencyToken: 'token', policyVersionId: 1, students: [], calculationRule: 'RULE', lockedAt: '2026-10-10T00:00:00Z', policy, components: [{ id: 2, name: 'Chung', scope: 'COMMON', majorId: null, rubricId: 8, projectWeightPercent: 100, studentWeightPercent: 100, requiredEvaluators: 2, stage: 'DEFENSE', evaluatorWeights: [{ evaluatorId: 7, weightPercent: 60 }, { evaluatorId: 8, weightPercent: 40 }] }] }
afterEach(cleanup)
it('separates recorded approval from locking, authority and result readiness', () => {
  render(<EvaluationSchemePolicySummary scheme={scheme} />)
  expect(screen.getByText('Đã ghi nhận phê duyệt')).toBeTruthy()
  expect(screen.getByText('QD/2026/123')).toBeTruthy()
  expect(screen.getByText(/quyền và điều kiện công bố kết quả được kiểm tra riêng/)).toBeTruthy()
  expect(screen.getByText('Theo trọng số thành phần')).toBeTruthy()
  expect(screen.getByText('Người chấm #7: 60%')).toBeTruthy()
  expect(screen.getByText(/thiếu điểm không tự chia lại trọng số/)).toBeTruthy()
  expect(screen.getByText('Giai đoạn: Bảo vệ')).toBeTruthy()
  expect(screen.queryByRole('button')).toBeNull()
})
it('keeps a published demonstration illustrative even if it carries an approval reference', () => {
  render(<EvaluationSchemePolicySummary scheme={{ ...scheme, policy: { ...policy, isDemo: true, formula: 'DEMO_50_30_20' } }} />)
  expect(screen.getByText('Minh họa — chưa dùng chính thức')).toBeTruthy()
  expect(screen.getByText('Tỷ lệ 50/30/20 — chỉ minh họa')).toBeTruthy()
  expect(screen.getByText(/Khóa cấu hình minh họa không cho phép công bố điểm chính thức/)).toBeTruthy()
  expect(screen.queryByText('Đã ghi nhận phê duyệt')).toBeNull()
})
it.each([undefined, null])('leaves historical missing policy %s unknown without adding calculator defaults', policy => {
  render(<EvaluationSchemePolicySummary scheme={{ ...scheme, policy, lockedAt: null, components: [{ ...scheme.components[0], stage: null, evaluatorWeights: null }] }} />)
  expect(screen.getByText('Chưa xác định phê duyệt')).toBeTruthy()
  expect(screen.getByText(/không tự gán công thức hoặc tính lại điểm/)).toBeTruthy()
  expect(screen.getByText('Giai đoạn: Chưa xác định')).toBeTruthy()
  expect(screen.getByText(/Trung bình đều theo hệ thống/)).toBeTruthy()
  expect(screen.queryByText('Decimal v2')).toBeNull()
})
it.each([
  { ...policy, approvalReference: '  ' },
  { ...policy, approvalStatus: 'FUTURE_APPROVAL' },
])('does not infer approval from incomplete or unknown provenance %#', policy => {
  render(<EvaluationSchemePolicySummary scheme={{ ...scheme, policy }} />)
  expect(screen.getByText('Chưa xác định phê duyệt')).toBeTruthy()
  expect(screen.queryByText('Đã ghi nhận phê duyệt')).toBeNull()
})
it('renders unknown codes, invalid lock time and empty explicit weight slots without inventing values', () => {
  render(<EvaluationSchemePolicySummary scheme={{ ...scheme, status: 'FUTURE', lockedAt: 'invalid', policy: { ...policy, formula: 'NEW_FORMULA', roundingMode: 'NEW_ROUNDING', calculationVersion: 'NEW_VERSION' }, components: [{ ...scheme.components[0], stage: 'NEW_STAGE', evaluatorWeights: [] }] }} />)
  expect(screen.getByText('NEW_FORMULA')).toBeTruthy()
  expect(screen.getByText('NEW_VERSION')).toBeTruthy()
  expect(screen.getByText(/Chưa xác định trạng thái khóa cấu hình/)).toBeTruthy()
  expect(screen.getByText('Chưa ghi nhận')).toBeTruthy()
  expect(screen.getByText('Giai đoạn: NEW_STAGE')).toBeTruthy()
  expect(screen.getByText(/Danh sách trọng số rỗng/)).toBeTruthy()
  expect(screen.queryByText(/Trung bình đều/)).toBeNull()
})
it('renders approval reference as text instead of interpreting HTML or a link', () => {
  const { container } = render(<EvaluationSchemePolicySummary scheme={{ ...scheme, policy: { ...policy, approvalReference: '<img src=x onerror=alert(1)> https://example.test/approval' } }} />)
  expect(screen.getByText(/<img src=x/)).toBeTruthy()
  expect(container.querySelector('img, a')).toBeNull()
})
