import { expect, test } from '@playwright/test'

test('scheme stage selection uses the live component UI and preserves the server payload', async ({ page }, info) => {
  const errors: string[] = []
  const writes: Array<Record<string, unknown>> = []
  page.on('pageerror', error => errors.push(error.message))
  const component = { id: 42, name: 'Hồ sơ chung', scope: 'COMMON', majorId: null, rubricId: 4,
    projectWeightPercent: 100, studentWeightPercent: 100, requiredEvaluators: 1, stage: null }
  let scheme = { id: 31, rootId: 31, version: 1, projectId: 2, projectPeriodId: 7,
    name: 'Phương án kỳ này', status: 'DRAFT', passThreshold: 5, concurrencyToken: 'token-1',
    policyVersionId: null, calculationRule: 'COMPONENT_WEIGHTS', students: [], components: [component] }
  await page.route(/\/api\/v1\//, async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const json = (value: unknown) => route.fulfill({ json: value })
    if (path.endsWith('/projects/2/my-capabilities')) return json({ projectId: 2, projectStatus: 'FINAL_SUBMISSION',
      actions: [{ code: 'manage_evaluation_scheme', allowed: true, reasons: [] }] })
    if (path.endsWith('/projects/2')) return json({ id: 2, title: 'Đồ án liên ngành', majors: [{ majorId: 1, majorCode: 'IT', majorName: 'CNTT' }] })
    if (path.endsWith('/evaluation-schemes') && request.method() === 'GET') return json([scheme])
    if (path.endsWith('/evaluation-schemes/31') && request.method() === 'PUT') {
      const input = request.postDataJSON() as Record<string, unknown>
      writes.push(input)
      scheme = { ...scheme, name: String(input.name), components: input.components as typeof scheme.components, concurrencyToken: 'token-2' }
      return json(scheme)
    }
    if (path.includes('project-periods')) return json({ items: [{ id: 7, name: 'Kỳ đánh giá', periodType: 'EVALUATION', status: 'ACTIVE' }], totalCount: 1, totalPages: 1 })
    if (path.endsWith('/rubrics')) return json({ items: [{ id: 4, code: 'CMN-COLD', version: 1 }], totalCount: 1, totalPages: 1 })
    return route.fulfill({ status: 404, json: { title: `Unconfigured controlled route: ${path}` } })
  })
  await page.goto('/e2e/fixtures/fe2-scheme-conflict.html')
  await page.getByRole('button', { name: /Phương án kỳ này/ }).click()
  const stage = page.getByLabel('Giai đoạn thành phần 1')
  await expect(stage).toHaveValue('')
  await stage.selectOption('COLD')
  await expect(page.getByText('Chấm hồ sơ đã khóa: 100%')).toBeVisible()
  await page.getByRole('button', { name: 'Lưu bản nháp' }).click()
  await expect.poll(() => writes.length).toBe(1)
  expect((writes[0].components as Array<{ stage: string }>)[0].stage).toBe('COLD')
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  }
  await page.screenshot({ path: info.outputPath('scheme-stage.png'), fullPage: true })
  expect(errors).toEqual([])
})
