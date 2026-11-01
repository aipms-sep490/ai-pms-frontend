import { expect, test } from '@playwright/test'

test('tablet shows server stage, separate weights and collapsed level guide; suggested band does not block 9', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  const assignment = { id: 41, projectId: 9, evaluatorId: 5, rubricId: 7, projectPeriodId: 3, departmentId: 2,
    evaluationType: 'LECTURER', status: 'ACTIVE', assignedBy: 1, assignedAt: '2026-10-02T00:00:00Z', revokedAt: null,
    concurrencyToken: 'assignment-token', scope: 'COMMON', majorId: null, studentId: null, componentId: 11, policyVersionId: 4,
    projectTitle: 'Đồ án liên ngành', componentName: 'Chấm hồ sơ', rubricName: 'Sản phẩm' }
  const draft = { id: 51, assignmentId: 41, projectId: 9, evaluatorId: 5, rubricId: 7, rubricName: 'Sản phẩm', rootRubricId: 7,
    rubricVersion: 2, evaluationType: 'LECTURER', status: 'DRAFT', comments: null, totalScore: null, scoreScale: 10,
    calculationRule: 'WEIGHTED_10', missingCriterionIds: [12], missingRequiredCriterionIds: [12], concurrencyToken: 'draft-token',
    createdAt: '2026-10-02T00:00:00Z', updatedAt: '2026-10-02T00:00:00Z', finalization: null,
    scores: [{ rubricCriterionId: 12, criterionCode: 'COLD-1', name: 'Phân tích', description: 'Căn cứ rõ ràng', weightPercent: 70,
      effectiveWeightPercent: 70, maxScore: 10, sortOrder: 1, isRequired: true, score: null, comments: null,
      evidenceGuidance: 'Báo cáo đã khóa', levels: [{ levelOrder: 1, label: 'Khá', descriptor: 'Phân tích rõ', scoreFrom: 7, scoreTo: 8.9 }] }] }
  let saved: unknown = null
  await page.route('**/api/v1/**', route => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/evaluation-assignments/41')) return route.fulfill({ json: { assignment, canScore: true, legacyReadOnly: false, denialReason: null, stage: 'COLD', componentStudentWeightPercent: 35 } })
    if (url.pathname.endsWith('/evaluation-assignments/41/evidence')) return route.fulfill({ json: { assignmentId: 41, projectId: 9, scope: 'COMMON', majorId: null, studentId: null, finalSubmissionId: 15, submittedAt: null, itemCount: 1, isReadOnly: true, items: [] } })
    if (url.pathname.endsWith('/projects/9/evaluations')) return route.fulfill({ json: { items: [draft], page: 1, pageSize: 100, totalCount: 1 } })
    if (url.pathname.endsWith('/evaluations/51/draft')) { saved = route.request().postDataJSON(); return route.fulfill({ json: { ...draft, totalScore: 9, missingCriterionIds: [], missingRequiredCriterionIds: [], scores: [{ ...draft.scores[0], score: 9 }] } }) }
    return route.fulfill({ status: 404, json: {} })
  })
  await page.goto('/e2e/f9-scoring.html')
  await expect(page.getByText('Chấm hồ sơ đã khóa').first()).toBeVisible()
  await expect(page.getByText(/Trọng số hiệu lực trong bộ tiêu chí: 70%/)).toBeVisible()
  await expect(page.getByText('35%')).toHaveCount(1)
  const details = page.locator('details').filter({ hasText: 'Mức chất lượng và dải điểm gợi ý' })
  await expect(details).not.toHaveAttribute('open', '')
  await details.locator('summary').click()
  await expect(details.getByText('Phân tích rõ')).toBeVisible()
  await page.getByLabel('Điểm Phân tích').fill('9')
  await page.getByRole('button', { name: 'Lưu bản nháp' }).click()
  await expect.poll(() => saved).toMatchObject({ scores: [{ rubricCriterionId: 12, score: 9 }] })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
