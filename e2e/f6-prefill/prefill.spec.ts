import { expect, test } from '@playwright/test'

test('new report shows optional project suggestions and can discard them', async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/e2e/fe1-preview.html?view=report')
  const summary = page.getByLabel('Tóm tắt tiến độ')
  await expect(summary).toHaveValue('Tiến độ từ dữ liệu dự án')
  await expect(page.getByRole('note')).toContainText('hãy kiểm tra và sửa')
  await page.locator('#report-cycle-select').selectOption('101')
  await expect(page.getByLabel('Công việc đã hoàn thành')).toHaveValue('Đã hoàn tất tác vụ')
  await summary.fill('Tôi đã kiểm tra lại')
  await page.getByRole('button', { name: 'Bỏ gợi ý, nhập lại từ đầu' }).click()
  await expect(summary).toHaveValue('Tôi đã kiểm tra lại')
  await expect(page.getByLabel('Công việc đã hoàn thành')).toHaveValue('')
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  }
  await page.screenshot({ path: info.outputPath('report-prefill.png'), fullPage: true })
  expect(errors).toEqual([])
})
