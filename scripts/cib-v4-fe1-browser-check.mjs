import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

const base = process.env.FE1_BROWSER_URL || 'http://127.0.0.1:5189'
const output = new URL('../test-results/cib-v4-fe1/', import.meta.url)
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
await context.tracing.start({ screenshots: true, snapshots: true })
const page = await context.newPage()
const checks = [], errors = [], unknown = [], writes = []
let uploadStatus = 200, taskStatus = 200, resultStatus = 200, qualification = null
page.on('pageerror', error => errors.push(error.message))
page.on('console', message => { if (message.type() === 'error' && !message.text().includes('Failed to load resource')) errors.push(message.text()) })
const respond = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
const paged = items => ({ items, page: 1, pageSize: 20, totalCount: items.length, totalPages: 1 })
await page.route('**/api/v1/**', async route => {
  const request = route.request(), url = new URL(request.url()), path = url.pathname.replace('/api/v1', '')
  if (request.method() === 'POST') {
    if (path === '/student-qualifications/me/certificate') {
      writes.push({ path, type: request.headers()['content-type'], body: request.postData() })
      if (uploadStatus !== 200) return respond(route, { title: 'Rejected fixture request' }, uploadStatus)
      qualification = { id: 12, verificationStatus: 'PENDING_VERIFICATION', trainingStatus: 'TRAINING_COMPLETED', certificateNumber: 'C-12' }
      return respond(route, qualification)
    }
    if (path === '/tasks') {
      writes.push({ path, body: request.postDataJSON() })
      return respond(route, taskStatus === 200 ? { id: 20 } : { title: 'Conflict fixture' }, taskStatus)
    }
  }
  if (path === '/student-qualifications/me') return qualification ? respond(route, qualification) : route.fulfill({ status: 204 })
  if (path === '/projects/9/major-requirements') return respond(route, { concurrencyToken: 'scope', requirements: (page.url().includes('mode=single') ? [3] : [3, 12]).map(majorId => ({ majorId })) })
  if (path === '/projects/9/evidence') return respond(route, paged([{ id: 10, projectId: 9, sourceType: 'TASK', sourceId: 20, majorId: Number(url.searchParams.get('majorId') || 3), classification: 'PRIMARY', verificationStatus: 'PENDING', submittedBy: 7, submittedAt: '2026-10-01T08:00:00Z', notes: 'Minh chứng từ công việc trong phạm vi đồ án.' }]))
  const student = path.match(/^\/projects\/9\/students\/(7|8)\/result$/)
  if (student) return respond(route, resultStatus === 200 ? { id: 3, projectId: 9, studentId: Number(student[1]), majorId: 3, schemeId: 2, totalScore: student[1] === '7' ? 8.25 : 7.5, passThreshold: 5, outcome: 'PASSED', publishedAt: '2026-10-01T12:00:00Z', calculationRule: 'SERVER_FIXTURE', snapshotJson: '{}' } : { title: 'Result unavailable' }, resultStatus)
  unknown.push(`${request.method()} ${path}`); return respond(route, { title: 'Unmapped fixture API' }, 501)
})
const open = view => page.goto(`${base}/e2e/fixtures/cib-v4-fe1.html?${view}`)
const visible = (role, name) => page.getByRole(role, { name, exact: true }).waitFor()
async function screenshot(name) { await page.screenshot({ path: new URL(`${name}.png`, output).pathname.replace(/^\/([A-Z]:)/, '$1'), fullPage: true }) }
async function narrow(name) {
  await page.setViewportSize({ width: 375, height: 812 })
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow ${name}`)
  await screenshot(`${name}-375`); await page.setViewportSize({ width: 1440, height: 1000 })
  checks.push(`${name}: no horizontal overflow at 375px`)
}
try {
  await open('view=qualification')
  await visible('button', 'Nộp chứng nhận')
  await page.getByLabel('Tệp chứng nhận').setInputFiles({ name: 'certificate.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 fixture') })
  await page.getByRole('checkbox', { name: /Tôi đã hoàn thành/ }).check()
  uploadStatus = 422; await page.getByRole('button', { name: 'Nộp chứng nhận' }).click()
  await page.getByRole('alert').filter({ hasText: 'không chấp nhận' }).waitFor()
  assert(await page.getByLabel('Tệp chứng nhận').evaluate(input => input.files[0].name === 'certificate.pdf'))
  assert(await page.locator('#certificate-error').evaluate(element => element === document.activeElement))
  uploadStatus = 200; await page.getByRole('button', { name: 'Nộp chứng nhận' }).click()
  await page.getByText('Chờ xác minh', { exact: true }).waitFor()
  assert((await page.getByTestId('refresh-count').textContent()).endsWith('1'))
  const uploads = writes.filter(item => item.path.includes('certificate'))
  assert.equal(uploads.length, 2); assert(uploads[1].type.startsWith('multipart/form-data; boundary=')); assert(uploads[1].body.includes('name="TrainingStatus"')); assert(!uploads[1].body.includes('ProjectId'))
  checks.push('qualification: 422 retains file, focused error; multipart upload returns pending; refresh once; no JSON double-submit')
  await screenshot('qualification-desktop'); await narrow('qualification')
  for (const mode of ['single', 'interdisciplinary']) {
    await open(`view=task&mode=${mode}`)
    await visible('combobox', 'Ngành chính')
    await page.getByLabel('Tên công việc').fill('Phát triển giao diện')
    await page.getByLabel('Mốc đồ án').selectOption('2')
    await page.getByLabel('Ngành chính').selectOption('3')
    if (mode !== 'single') await page.getByRole('checkbox', { name: 'Thiết kế đồ họa', exact: true }).check()
    taskStatus = 409; await page.getByRole('button', { name: 'Tạo công việc', exact: true }).click()
    await page.getByRole('alert').filter({ hasText: 'đã thay đổi' }).waitFor()
    assert.equal(await page.getByLabel('Tên công việc').inputValue(), 'Phát triển giao diện')
    await screenshot(`task-${mode}-desktop`); await narrow(`task-${mode}`)
    taskStatus = 200; await page.getByRole('button', { name: 'Tạo công việc', exact: true }).focus(); await page.keyboard.press('Enter')
    await page.getByText('Đã tạo công việc.', { exact: true }).waitFor()
    const body = writes.filter(item => item.path === '/tasks').at(-1).body
    assert.equal(body.disciplines.filter(item => item.role === 'PRIMARY').length, 1)
    assert.equal(body.disciplines.length, mode === 'single' ? 1 : 2)
    checks.push(`${mode}: atomic task+disciplines, 409 preserves draft, explicit keyboard retry`)
  }
  await open('view=evidence&actor=mentor')
  await page.getByText('Công việc #20', { exact: true }).waitFor()
  assert(await page.getByRole('combobox', { name: 'Ngành', exact: true }).isDisabled())
  const filtered = page.waitForRequest(request => request.url().includes('/evidence?') && request.url().includes('majorId=3'))
  await page.getByRole('button', { name: 'Xóa lọc' }).click(); await filtered
  assert.equal(await page.getByRole('link', { name: 'Mở nguồn' }).getAttribute('href'), '/project/tasks/20')
  await screenshot('mentor-evidence-desktop'); await narrow('mentor-evidence')
  checks.push('mentor: scoped major cannot be cleared; source link reuses task workspace')
  resultStatus = 403; await open('view=result')
  await page.getByRole('alert').filter({ hasText: 'chưa có quyền' }).waitFor()
  assert.equal(await page.getByText('Kết quả chưa được công bố', { exact: true }).count(), 0)
  resultStatus = 200; await page.getByRole('button', { name: 'Tải lại', exact: true }).click()
  await page.getByText('8.25', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Đổi sinh viên fixture' }).click()
  await page.getByText('7.5', { exact: true }).waitFor()
  assert.equal(await page.getByText('8.25', { exact: true }).count(), 0)
  await screenshot('own-result-desktop'); await narrow('own-result')
  await page.getByRole('button', { name: 'Bỏ context fixture' }).click()
  await page.getByText('Không tìm thấy đồ án hoặc hồ sơ sinh viên hiện tại.').waitFor()
  assert.equal(await page.getByText('7.5', { exact: true }).count(), 0)
  resultStatus = 404; await open('view=result'); await page.getByText('Kết quả chưa được công bố', { exact: true }).waitFor()
  checks.push('own result: 403 distinct from unpublished, retry, same-major students receive distinct server scores, missing context clears result, 404 remains unpublished')
  assert.deepEqual(unknown, []); assert.deepEqual(errors, [])
} finally {
  await context.tracing.stop({ path: new URL('browser-trace.zip', output).pathname.replace(/^\/([A-Z]:)/, '$1') })
  await writeFile(new URL('browser-evidence.json', output), JSON.stringify({ kind: 'component-api-fixture', checks, errors, unknown, mutations: writes.map(item => ({ path: item.path, type: item.type, body: typeof item.body === 'string' ? 'multipart omitted' : item.body })), liveBackendVerified: false }, null, 2))
  await browser.close()
}
console.log(JSON.stringify({ passed: checks.length, kind: 'component-api-fixture', errors, unknown }))
