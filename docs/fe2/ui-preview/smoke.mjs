// node docs/fe2/ui-preview/smoke.mjs (requires the existing Playwright Chrome runtime)
import { chromium, expect } from '@playwright/test'
import assert from 'node:assert/strict'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  page.setDefaultTimeout(5000)
  const errors = [], external = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('request', request => { if (/^https?:/.test(request.url())) external.push(request.url()) })
  await page.goto(new URL('../FE2_SELF_TEST_GUIDE_2026-10-15.html', import.meta.url).href)
  const nav = page.locator('.viewer-nav>button')
  async function select(index) { await nav.nth(index).click(); await expect(nav.nth(index)).toHaveClass('selected'); await expect(page.locator('.viewer-screen')).toContainText(/.+/); await expect(page.locator('.viewer-screen [role=status]').filter({ hasText: /Đang tải|Đang xác minh/ })).toHaveCount(0) }
  for (let i = 0; i < 13; i++) {
    await select(i)
    await expect(page.locator('.viewer-screen')).not.toContainText('Chưa mở được bản xem')
    assert.deepEqual(await page.evaluate(() => window.__fe2Preview.unhandled), [], 'unhandled fixture on sheet ' + (i + 1))
  }
  await select(1)
  await expect(page.getByAltText('Báo cáo Software Requirement')).toBeVisible()
  await page.getByLabel('Điểm Phân tích yêu cầu', { exact: true }).fill('9')
  await page.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click()
  await expect(page.getByText('Đã lưu bản nháp theo dữ liệu máy chủ.')).toBeVisible()
  await page.getByRole('button', { name: 'Yêu cầu chốt đánh giá', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'Yêu cầu chốt đánh giá', exact: true }).click()
  await expect(page.getByText('Máy chủ đã chốt đánh giá.')).toBeVisible()
  await select(4)
  await page.getByRole('combobox', { name: 'Đợt phúc khảo', exact: true }).selectOption('5')
  await page.getByRole('combobox', { name: 'Thành phần kết quả', exact: true }).selectOption('11')
  await page.getByLabel('Lý do phúc khảo', { exact: true }).fill('Đối chiếu báo cáo đã khóa.')
  await page.getByRole('button', { name: 'Gửi yêu cầu phúc khảo', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Yêu cầu #8', exact: true })).toBeVisible()
  await select(7)
  await page.getByRole('button', { name: 'Đọc hồ sơ review đã khóa', exact: true }).click()
  await page.getByLabel('Điểm đính chính Phân tích yêu cầu', { exact: true }).fill('9')
  await page.getByLabel('Lý do tiêu chí Phân tích yêu cầu', { exact: true }).fill('Có đủ minh chứng trong báo cáo.')
  await page.getByLabel('Lý do review / quyết định', { exact: true }).fill('Đã đối chiếu hồ sơ.')
  await page.getByRole('combobox', { name: 'Đề nghị', exact: true }).selectOption('AMEND')
  await page.getByRole('button', { name: 'Lưu đề nghị review', exact: true }).click()
  await expect(page.getByText('Đề nghị: AMEND · Đã đối chiếu hồ sơ.')).toBeVisible()
  await select(8)
  await page.getByLabel('Lý do review / quyết định', { exact: true }).fill('Chấp nhận sau khi đối chiếu.')
  await page.getByRole('button', { name: 'Xem trước kết quả ảnh hưởng', exact: true }).click()
  await page.getByRole('button', { name: 'Chấp nhận và công bố revision', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Xác nhận quyết định', exact: true }).click()
  await expect(page.getByText('Trạng thái: ACCEPTED', { exact: true })).toBeVisible()
  await select(9)
  await page.getByRole('button', { name: /^v1 ·/ }).click()
  await expect(page.getByText('Phiên bản đã chọn: v1 · 7.8 · PASS')).toBeVisible()
  await select(12)
  await page.locator('.viewer-tools select').selectOption('staff')
  await expect(page.getByLabel('Loại chứng nhận', { exact: true })).toBeDisabled()
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 })
    for (let i = 0; i < 13; i++) {
      await select(i)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true, 'horizontal overflow: ' + width + ' / sheet ' + (i + 1))
    }
  }
  assert.deepEqual(errors, [])
  assert.deepEqual(external, [])
  console.log('PASS: 13 screens, scoring/save/finalize, student appeal, reviewer, decision, exact history, staff read-only, desktop/mobile, zero external requests.')
} finally { await browser.close() }
