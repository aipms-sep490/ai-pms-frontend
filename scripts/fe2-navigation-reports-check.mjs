import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
page.on('pageerror', e => errors.push(e.message))
const report = { id: 17, projectId: 9, submittedBy: 2, submittedByName: 'Nguyễn Minh Anh', reportType: 'WEEKLY', periodStart: '2026-09-14', periodEnd: '2026-09-20', summary: 'Hoàn thành chức năng đăng ký', completedWork: 'Tích hợp API', plannedWork: 'Kiểm thử', issuesAndRisks: 'Không có', status: 'SUBMITTED', submittedAt: '2026-09-20T08:00:00Z', isLate: false, createdAt: '2026-09-20T08:00:00Z', updatedAt: '2026-09-20T08:00:00Z', concurrencyToken: 'report-token', feedbacks: [] }
await page.route('**/api/v1/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(new URL(route.request().url()).pathname.endsWith('/progress-reports') ? { items: [report], totalCount: 1, page: 1, pageSize: 10, totalPages: 1 } : report) }))
const base = 'http://127.0.0.1:5199/e2e/fixtures/fe2-navigation-reports.html'
const checks = []
try {
  await page.goto(base)
  await page.getByRole('link', { name: 'Mở báo cáo từ thông báo' }).click()
  const row = page.locator('.report-row')
  await row.waitFor()
  assert.equal(await page.getByText('Xem báo cáo', { exact: true }).count(), 0)
  const normal = await row.evaluate(e => getComputedStyle(e).backgroundColor)
  await row.hover()
  await page.waitForFunction(normal => getComputedStyle(document.querySelector('.report-row')).backgroundColor !== normal, normal)
  assert.equal(await row.locator('h3').evaluate(e => getComputedStyle(e).textDecorationLine), 'underline')
  checks.push('Whole row is the only report link; hover highlighted')
  await row.click()
  await page.getByRole('heading', { name: 'Chi tiết báo cáo' }).waitFor()
  await page.getByRole('link', { name: 'Quay lại', exact: true }).click()
  await row.waitFor()
  assert.equal(new URL(page.url()).searchParams.get('status'), 'SUBMITTED')
  checks.push('Detail Back restores the filtered list')
  await page.getByRole('link', { name: 'Quay lại', exact: true }).click()
  await page.getByRole('heading', { name: 'Thông báo', exact: true }).waitFor()
  checks.push('List Back restores actual origin (notifications), not workspace')
  await page.goto(base + '?entry=detail')
  await page.getByRole('heading', { name: 'Chi tiết báo cáo' }).waitFor()
  await page.getByRole('link', { name: 'Quay lại', exact: true }).click()
  await row.waitFor()
  assert.equal(new URL(page.url()).pathname, '/project/reports')
  checks.push('Direct detail link falls back to report list')
  await mkdir('test-results/fe2-navigation-reports', { recursive: true })
  for (const width of [1440, 768, 375]) {
    await page.setViewportSize({ width, height: 900 })
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${width}`)
    await page.keyboard.press('Tab')
    await row.focus()
    assert.equal(await row.locator('h3').evaluate(e => getComputedStyle(e).textDecorationLine), 'underline')
    await page.screenshot({ path: `test-results/fe2-navigation-reports/reports-${width}.png`, fullPage: true })
    checks.push(`Keyboard focus and no overflow at ${width}px`)
  }
  await page.keyboard.press('Enter')
  await page.getByRole('heading', { name: 'Chi tiết báo cáo' }).waitFor()
  checks.push('Keyboard Enter opens the report')
  assert.deepEqual(errors, [])
  await writeFile('test-results/fe2-navigation-reports/evidence.json', JSON.stringify({ kind: 'mocked-api-browser', checks, errors }, null, 2))
  console.log(JSON.stringify({ checks, errors }))
} finally { await browser.close() }


