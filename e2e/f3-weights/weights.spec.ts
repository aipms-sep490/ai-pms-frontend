import { expect, test } from '@playwright/test'

test('draft rubric identifies invalid nested group while root remains valid', async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const child = (id: number, name: string, sortOrder: number) => ({ id, name, description: null, weightPercent: 40,
    maxScore: 10, sortOrder, isRequired: true, children: [] })
  const parent = { id: 1, name: 'Chất lượng', description: null, weightPercent: 100, maxScore: null,
    sortOrder: 0, isRequired: false, children: [child(11, 'Tích hợp', 0), child(12, 'Trình bày', 1)] }
  const rubric = { id: 2, departmentId: 1, academicSemesterId: 1, code: 'RUBRIC', name: 'Bộ tiêu chí nháp', description: null,
    status: 'DRAFT', version: 1, concurrencyToken: 'token', canEdit: true, criteria: [parent] }
  await page.route(/\/api\/v1\//, route => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/rubrics')) return route.fulfill({ json: { items: [rubric], totalCount: 1, totalPages: 1 } })
    if (path.endsWith('/rubrics/2')) return route.fulfill({ json: rubric })
    return route.fulfill({ status: 404, json: { title: `Unconfigured controlled route: ${path}` } })
  })
  await page.goto('/e2e/fixtures/f3-weights.html')
  await expect(page.getByText('Nhóm con của Chất lượng: 80.00% — còn thiếu 20.00%')).toBeVisible()
  await expect(page.getByText('Nhóm con của tiêu chí này cần kiểm tra.')).toBeVisible()
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  }
  await page.screenshot({ path: info.outputPath('rubric-weight-groups.png'), fullPage: true })
  expect(errors).toEqual([])
})
