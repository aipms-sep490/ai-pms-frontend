import { expect, test } from '@playwright/test'

test('skip persists the current step, manual replay resumes, and missing target has fallback', async ({ page }, info) => {
  const errors: string[] = []
  const mutations: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('request', request => { if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) mutations.push(request.url()) })
  await page.goto('/e2e/fixtures/f10-tour.html')
  await expect(page.getByRole('dialog')).toBeVisible()
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Tiếp theo' }).click()
  await expect(page.getByText('Nút tìm nhanh không hiển thị tại đây. Dùng Ctrl + K để tìm chức năng.')).toBeVisible()
  await page.getByRole('button', { name: 'Bỏ qua', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: /Mở hướng dẫn sinh viên/i }).click()
  await expect(page.getByText('Tìm nhanh mọi chức năng')).toBeVisible()
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  }
  await page.screenshot({ path: info.outputPath('tour-fallback.png'), fullPage: true })
  expect(errors).toEqual([])
  expect(mutations).toEqual([])
})
