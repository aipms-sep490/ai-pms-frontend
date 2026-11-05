import { expect, test } from '@playwright/test'

test('nested rubric shows group and BE effective weight without multiplying it again', async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const leaf = { id: 11, parentId: 1, name: 'Tích hợp', description: null, weightPercent: 50, effectiveWeightPercent: 25,
    maxScore: 10, sortOrder: 0, isRequired: true, children: [] }
  const sibling = { ...leaf, id: 12, name: 'Kiểm thử', sortOrder: 1 }
  const parent = { id: 1, parentId: null, name: 'Chất lượng', description: null, weightPercent: 50, effectiveWeightPercent: 50,
    maxScore: null, sortOrder: 0, isRequired: false, children: [leaf, sibling] }
  const flat = { id: 2, parentId: null, name: 'Trình bày', description: null, weightPercent: 50, effectiveWeightPercent: 50,
    maxScore: 10, sortOrder: 1, isRequired: true, children: [] }
  const rubric = { id: 2, departmentId: 1, academicSemesterId: 1, code: 'RUBRIC', name: 'Bộ tiêu chí công bố', description: null,
    status: 'PUBLISHED', version: 1, concurrencyToken: 'token', canEdit: false, criteria: [parent, flat] }
  await page.route(/\/api\/v1\//, route => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/rubrics')) return route.fulfill({ json: { items: [rubric], totalCount: 1, totalPages: 1 } })
    if (path.endsWith('/rubrics/2')) return route.fulfill({ json: rubric })
    return route.fulfill({ status: 404, json: { title: `Unconfigured controlled route: ${path}` } })
  })
  await page.goto('/e2e/fixtures/f2-rubric.html')
  await expect(page.getByRole('heading', { name: 'Tích hợp' })).toBeVisible()
  await expect(page.getByText('Trong nhóm: 50%').first()).toBeVisible()
  await expect(page.getByText('Tỷ trọng hiệu lực trong bộ tiêu chí: 25%').first()).toBeVisible()
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  }
  await page.screenshot({ path: info.outputPath('rubric-nested.png'), fullPage: true })
  expect(errors).toEqual([])
})
