import { expect, test } from '@playwright/test'

test('current rubric publish path stays usable without BE-08 and tablet layout fits', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  let rubric = { id: 1, departmentId: 1, academicSemesterId: 1, code: 'R-1', name: 'Phiếu COLD', description: null,
    status: 'DRAFT', version: 1, concurrencyToken: 'token', canEdit: true, criteria: [{ id: 11,
      name: 'Phân tích', description: null, weightPercent: 100, maxScore: 10, sortOrder: 0, isRequired: true, levels: [], children: [] }] }
  let submitted = false
  await page.route('**/api/v1/rubrics**', route => {
    const request = route.request(), url = new URL(request.url())
    if (request.method() === 'GET' && url.pathname.endsWith('/rubrics')) return route.fulfill({ json: { items: [rubric], page: 1, pageSize: 20, totalCount: 1 } })
    if (request.method() === 'GET' && url.pathname.endsWith('/rubrics/1')) return route.fulfill({ json: rubric })
    if (request.method() === 'PUT' && url.pathname.endsWith('/rubrics/1')) { const body = request.postDataJSON(); rubric = { ...rubric, ...body, criteria: body.criteria.map((item: object, index: number) => ({ ...item, id: index + 11 })) }; return route.fulfill({ json: rubric }) }
    if (request.method() === 'POST' && url.pathname.endsWith('/publish')) { submitted = true; rubric = { ...rubric, status: 'PUBLISHED', canEdit: false }; return route.fulfill({ json: rubric }) }
    return route.fulfill({ status: 404, json: {} })
  })
  await page.goto('/e2e/f8-builder.html')
  await expect(page.getByLabel('Tên tiêu chí')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Công bố' })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Gửi duyệt' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Thêm mức vào bản nháp' })).toHaveCount(0)
  await expect(page.getByLabel('Phạm vi')).toHaveCount(0)
  await page.getByRole('button', { name: 'Xem trước phiếu chấm' }).click()
  await expect(page.getByRole('region', { name: 'Phiếu chấm xem trước' })).toBeVisible()
  await page.getByRole('button', { name: 'Công bố' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Công bố' }).click()
  await expect.poll(() => submitted).toBe(true)
  await expect(page.getByRole('button', { name: 'Ngừng dùng' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
