import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

if (!process.env.ACADEMIC_TEST_EMAIL || !process.env.ACADEMIC_TEST_PASSWORD || !process.env.ACADEMIC_EVIDENCE_DIR) {
  throw new Error('Set test credentials and evidence directory through process environment.')
}
const output = process.env.ACADEMIC_EVIDENCE_DIR
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ headless: true, channel: process.env.ACADEMIC_BROWSER_CHANNEL || 'msedge' })
try {
  const page = await browser.newPage({ viewport: { width: 1365, height: 900 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('http://localhost:5175/academic/assistant')
  await page.getByLabel('Email', { exact: true }).fill(process.env.ACADEMIC_TEST_EMAIL)
  await page.getByLabel('Mật khẩu', { exact: true }).fill(process.env.ACADEMIC_TEST_PASSWORD)
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await page.waitForURL('**/project/overview', { timeout: 30000 })
  await page.getByLabel('Câu hỏi học vụ').fill('Rubric và scheme khác nhau như thế nào?')
  const responsePromise = page.waitForResponse(response => response.url().endsWith('/academic/assistant/ask'), { timeout: 65000 })
  await page.getByRole('button', { name: 'Gửi', exact: true }).click()
  const response = await responsePromise
  const result = await response.json()
  if (!response.ok() || !result.runId || !result.citations?.length) throw new Error(`Academic response failed: ${response.status()}`)
  await page.getByText('Tài liệu tham chiếu', { exact: true }).waitFor()
  await page.screenshot({ path: join(output, 'academic-desktop.png'), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: join(output, 'academic-mobile.png'), fullPage: true })
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  const evidence = { status: response.status(), generationStatus: result.generationStatus, runId: result.runId, citations: result.citations.map(c => ({ title: c.title, version: c.version })), errors, mobileOverflow: overflow }
  writeFileSync(join(output, 'academic-browser.json'), JSON.stringify(evidence, null, 2))
  console.log(JSON.stringify(evidence))
  if (errors.length || overflow) throw new Error('Browser verification found a rendering error.')
} finally {
  await browser.close()
}
