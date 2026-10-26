import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const base = process.env.FE_STAGING_URL || 'http://localhost:5175'
const output = process.env.ACADEMIC_EVIDENCE_DIR
if (!output || !process.env.ACADEMIC_TEST_EMAIL || !process.env.ACADEMIC_TEST_PASSWORD) throw new Error('Supply dedicated test credentials and evidence directory.')
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${base}/profile`)
  await page.getByLabel('Email', { exact: true }).fill(process.env.ACADEMIC_TEST_EMAIL)
  await page.getByLabel('Mật khẩu', { exact: true }).fill(process.env.ACADEMIC_TEST_PASSWORD)
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await page.waitForURL('**/profile')
  await page.getByRole('button', { name: 'Mở trợ lý AI', exact: true }).click()
  const panel = page.getByRole('dialog', { name: 'Trợ lý AI', exact: true })
  await panel.getByLabel('Chế độ trợ lý').selectOption('WEEKLY_REPORT')
  await panel.getByLabel('Câu hỏi học vụ').fill('Soạn báo cáo tuần kiểm thử: hoàn thành kiểm thử đăng nhập; đang sửa lỗi hiển thị tên ngành; tuần tới viết báo cáo kiểm thử. Chưa đặt ngày họp.')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ animations: 'disabled', path: join(output, 'mode-mobile.png') })
  if (await panel.evaluate(el => el.scrollWidth > el.clientWidth)) throw new Error('Mobile overflow')
  await panel.getByRole('button', { name: 'Gửi', exact: true }).click()
  await panel.locator('.assistant-answer-body').first().waitFor({ timeout: 90000 })
  await panel.locator('.assistant-export summary').first().click()
  const downloads = []
  for (const [name, extension] of [['Word', 'docx'], ['Excel', 'xlsx'], ['PDF', 'pdf']]) {
    const [download] = await Promise.all([page.waitForEvent('download'), panel.getByRole('button', { name: `Tải ${name}`, exact: true }).click()])
    await download.saveAs(join(output, `browser-weekly.${extension}`))
    if (await download.failure()) throw new Error(`Download failed: ${extension}`)
    downloads.push(extension)
  }
  await page.screenshot({ animations: 'disabled', path: join(output, 'answer-mobile.png') })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.screenshot({ animations: 'disabled', path: join(output, 'answer-desktop.png') })
  await panel.getByRole('button', { name: 'Lịch sử hội thoại', exact: true }).click()
  await panel.locator('.assistant-saved-history > div > button:first-child').first().click()
  await panel.locator('.assistant-answer-body').first().waitFor()
  if (errors.length) throw new Error('Browser errors')
  const result = { base, downloads, mobileOverflow: false, historyRestored: true, errors }
  writeFileSync(join(output, 'checks.json'), JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result))
} finally { await browser.close() }
