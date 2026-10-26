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
  const dialog = page.getByRole('dialog', { name: 'Trợ lý AI', exact: true })
  await dialog.getByText('Bạn muốn hỏi gì hôm nay?').waitFor()
  await page.screenshot({ animations: 'disabled', path: join(output, 'welcome-desktop.png') })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ animations: 'disabled', path: join(output, 'welcome-mobile.png') })
  const overflow = await dialog.evaluate(el => el.scrollWidth > el.clientWidth)
  const sendVisible = await dialog.getByRole('button', { name: 'Gửi', exact: true }).isVisible()
  await dialog.getByLabel('Câu hỏi học vụ').fill('Bản nháp để kiểm tra giao diện')
  await page.getByRole('button', { name: 'Đóng trợ lý AI', exact: true }).click()
  await page.getByRole('button', { name: 'Mở trợ lý AI', exact: true }).click()
  if (await dialog.getByLabel('Câu hỏi học vụ').inputValue() !== 'Bản nháp để kiểm tra giao diện') throw new Error('Draft was lost')
  await dialog.getByRole('button', { name: 'Lịch sử hội thoại', exact: true }).click()
  const entries = dialog.locator('.assistant-saved-history > div > button:first-child')
  await page.waitForFunction(() => !document.querySelector('.assistant-saved-history [role=status]'))
  const hasHistory = await entries.count() > 0
  if (hasHistory) {
    await entries.first().click()
    await dialog.locator('.assistant-answer-body').first().waitFor()
    await page.screenshot({ animations: 'disabled', path: join(output, 'answer-mobile.png') })
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.screenshot({ animations: 'disabled', path: join(output, 'answer-desktop.png') })
  }
  if (overflow || !sendVisible || errors.length) throw new Error('UI validation failed')
  const result = { base, overflow, sendVisible, hasHistory, errors }
  writeFileSync(join(output, 'checks.json'), JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result))
} finally { await browser.close() }
