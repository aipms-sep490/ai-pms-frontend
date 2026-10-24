import { chromium } from '@playwright/test'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const { ACADEMIC_TEST_EMAIL: email, ACADEMIC_TEST_PASSWORD: password, ACADEMIC_EVIDENCE_DIR: output } = process.env
if (!email || !password || !output) throw new Error('Set test credentials and evidence directory through environment.')
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ headless: true, channel: 'msedge' })
const results = []
try {
  const fixture = await browser.newPage({ viewport: { width: 180, height: 100 } })
  await fixture.setContent('<html><body style="margin:0;background:#ff0000"></body></html>')
  const image = await fixture.screenshot()
  await fixture.setContent('<h1>StudySpace memo</h1><p>Project code: AURORA-731. The prototype review is the next action.</p>')
  const pdf = await fixture.pdf()
  await fixture.close()
  const page = await browser.newPage({ viewport: { width: 1365, height: 900 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('http://localhost:5175/academic/assistant')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password)
  const login = page.waitForResponse(r => r.url().endsWith('/auth/login'))
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  const session = await (await login).json()
  await page.waitForURL('**/academic/assistant')
  const cases = [
    { name: 'red.png', mimeType: 'image/png', buffer: image, query: 'Ảnh đính kèm có màu chủ đạo gì?', expected: /đỏ/i },
    { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('Project code: AURORA-731. Next action: prototype review.'), query: 'Mã dự án trong tệp này là gì?', expected: /AURORA-731/ },
    { name: 'memo.pdf', mimeType: 'application/pdf', buffer: pdf, query: 'Mã dự án trong PDF là gì?', expected: /AURORA-731/ },
    { name: 'memo.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: readFileSync(join(output, 'memo.docx')), query: 'Mã dự án trong tài liệu này là gì?', expected: /ORBIT-642/ },
  ]
  for (const item of cases) {
    await page.getByLabel('Đính kèm ảnh hoặc tài liệu').setInputFiles({ name: item.name, mimeType: item.mimeType, buffer: item.buffer })
    await page.getByLabel('Câu hỏi học vụ').fill(item.query)
    const responsePromise = page.waitForResponse(r => r.url().endsWith('/assistant/ask-with-files'), { timeout: 65000 })
    await page.getByRole('button', { name: 'Hỏi trợ lý học vụ', exact: true }).click()
    const response = await responsePromise
    const result = await response.json()
    results.push({ file: item.name, status: response.status(), answer: result.answer, type: result.answerType, runId: result.runId })
    if (!response.ok() || result.answerType !== 'ATTACHMENT' || !item.expected.test(result.answer)) throw new Error(`Unexpected upload response: ${item.name}`)
    await page.getByText(result.answer, { exact: true }).waitFor()
    const downloading = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Tải TXT', exact: true }).click()
    const download = await downloading
    const target = join(output, `${item.name}.answer.txt`)
    await download.saveAs(target)
    if (!readFileSync(target, 'utf8').includes(result.answer)) throw new Error('Downloaded answer mismatch')
    if (item.name === 'red.png') {
      await page.screenshot({ path: join(output, 'files-desktop.png'), fullPage: true })
      await page.setViewportSize({ width: 390, height: 844 })
      await page.screenshot({ path: join(output, 'files-mobile.png'), fullPage: true })
      if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) throw new Error('Mobile overflow')
      await page.setViewportSize({ width: 1365, height: 900 })
    }
    await page.getByRole('button', { name: `Bỏ ${item.name}`, exact: true }).click()
  }
  const invalid = await page.request.post('http://localhost:5175/api/v1/academic/assistant/ask-with-files', {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    multipart: { query: 'Read file', scope: 'ACADEMIC', files: { name: 'fake.png', mimeType: 'image/png', buffer: Buffer.from('not an image') } },
  })
  if (invalid.status() !== 400) throw new Error('Spoofed image was not rejected')
  results.push({ check: 'spoofed-image', status: invalid.status() })
  if (errors.length) throw new Error('Browser errors: ' + errors.join(', '))
} finally {
  writeFileSync(join(output, 'files-checks.json'), JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results))
  await browser.close()
}
