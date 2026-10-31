import { expect, test } from '@playwright/test'

test('five BE configured levels, draft save, approval submission and tablet layout', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  let rubric = { id: 1, departmentId: 1, academicSemesterId: 1, code: 'R-1', name: 'Phiếu COLD', description: null,
    status: 'DRAFT', version: 1, concurrencyToken: 'token', canEdit: true, requiredLevelCount: 5, criteria: [{ id: 11,
      name: 'Phân tích', description: null, weightPercent: 100, maxScore: 10, sortOrder: 0, isRequired: true, levels: [], children: [] }] }
  let submitted = false
  await page.route('**/api/v1/rubrics**', route => {
    const request = route.request(), url = new URL(request.url())
    if (request.method() === 'GET' && url.pathname.endsWith('/rubrics')) return route.fulfill({ json: { items: [rubric], page: 1, pageSize: 20, totalCount: 1 } })
    if (request.method() === 'GET' && url.pathname.endsWith('/rubrics/1')) return route.fulfill({ json: rubric })
    if (request.method() === 'PUT' && url.pathname.endsWith('/rubrics/1')) { const body = request.postDataJSON(); rubric = { ...rubric, ...body, criteria: body.criteria.map((item: object, index: number) => ({ ...item, id: index + 11 })) }; return route.fulfill({ json: rubric }) }
    if (request.method() === 'POST' && url.pathname.endsWith('/submit-for-approval')) { submitted = true; rubric = { ...rubric, status: 'PENDING_APPROVAL', canEdit: false }; return route.fulfill({ json: rubric }) }
    return route.fulfill({ status: 404, json: {} })
  })
  await page.goto('/e2e/f8-builder.html')
  await expect(page.getByLabel('Tên tiêu chí')).toBeVisible()
  await expect(page.getByText(/Tiêu chí còn thiếu mức/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Gửi duyệt' })).toBeDisabled()
  for (let index = 0; index < 5; index++) await page.getByRole('button', { name: 'Thêm mức vào bản nháp' }).click()
  const descriptors = page.getByRole('textbox', { name: 'Mô tả' })
  await expect(descriptors).toHaveCount(7)
  for (let index = 0; index < 5; index++) await descriptors.nth(index + 2).fill(`Mô tả mức ${index + 1}`)
  await page.getByRole('button', { name: 'Xem trước phiếu chấm' }).click()
  await expect(page.getByRole('region', { name: 'Phiếu chấm xem trước' })).toBeVisible()
  await page.getByRole('button', { name: 'Lưu bản nháp' }).click()
  await expect(page.getByRole('button', { name: 'Gửi duyệt' })).toBeEnabled()
  await page.getByRole('button', { name: 'Gửi duyệt' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Gửi duyệt' }).click()
  await expect.poll(() => submitted).toBe(true)
  await expect(page.getByText(/Đang chờ phê duyệt/)).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
