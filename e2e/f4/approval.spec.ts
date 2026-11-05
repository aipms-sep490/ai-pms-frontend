import { expect, test } from '@playwright/test'

const assignment = { id: 41, projectId: 9, evaluatorId: 5, rubricId: 7, projectPeriodId: 3, departmentId: 2,
  evaluationType: 'LECTURER', status: 'ACTIVE', assignedBy: 1, assignedAt: '2026-10-02T00:00:00Z', revokedAt: null,
  concurrencyToken: 'assignment-token', scope: 'COMMON', majorId: null, studentId: null, componentId: 11, policyVersionId: 4 }
const draft = { id: 51, assignmentId: 41, projectId: 9, evaluatorId: 5, rubricId: 7, rubricName: 'Sản phẩm', rootRubricId: 7,
  rubricVersion: 2, evaluationType: 'LECTURER', status: 'FINALIZED', comments: null, totalScore: 8, scoreScale: 10,
  calculationRule: 'WEIGHTED_10', missingCriterionIds: [], missingRequiredCriterionIds: [], concurrencyToken: 'draft-token',
  createdAt: '2026-10-02T00:00:00Z', updatedAt: '2026-10-02T00:00:00Z', finalization: { finalizedBy: 5, finalizedAt: '2026-10-02T01:00:00Z', evidence: { finalSubmissionId: 15, artifactCount: 1, fileCount: 1 } },
  scores: [{ rubricCriterionId: 12, name: 'Phân tích', description: null, weightPercent: 100, maxScore: 10, sortOrder: 1, isRequired: true, score: 8, comments: null }] }

for (const scenario of [
  { name: 'demo', fields: { schemeIsDemo: true, schemeApprovalStatus: 'PENDING', schemeApprovalReference: null }, expected: 'chưa phải điểm chính thức' },
  { name: 'approved', fields: { schemeIsDemo: false, schemeApprovalStatus: 'APPROVED', schemeApprovalReference: 'QD-24' }, expected: 'phiếu chấm chính thức' },
  { name: 'missing reference', fields: { schemeIsDemo: false, schemeApprovalStatus: 'APPROVED', schemeApprovalReference: null }, expected: 'Chưa thể xác nhận' },
  { name: 'unknown legacy', fields: {}, expected: 'Chưa xác định trạng thái phê duyệt' },
]) test(`finalized evaluator page labels ${scenario.name} from BE metadata`, async ({ page }) => {
  await page.route('**/api/v1/**', route => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/evaluation-assignments/41')) return route.fulfill({ json: { assignment, canScore: true, legacyReadOnly: false, denialReason: null, ...scenario.fields } })
    if (url.pathname.endsWith('/evaluation-assignments/41/evidence')) return route.fulfill({ json: { assignmentId: 41, projectId: 9, scope: 'COMMON', majorId: null, studentId: null, finalSubmissionId: 15, submittedAt: null, itemCount: 1, isReadOnly: true, items: [] } })
    if (url.pathname.endsWith('/projects/9/evaluations')) return route.fulfill({ json: { items: [draft], page: 1, pageSize: 100, totalCount: 1 } })
    return route.fulfill({ status: 404, json: {} })
  })
  await page.goto('/e2e/f4-approval.html')
  await expect(page.getByRole('status').filter({ hasText: scenario.expected })).toBeVisible()
  await expect(page.getByText(/Đánh giá đã chốt/)).toBeVisible()
})
