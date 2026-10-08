import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '@playwright/test')
const base = process.env.DEPART_BROWSER_URL || 'http://localhost:5187'
const email = process.env.AIPMS_TEST_EMAIL || 'sep490.coordinator@fpt.edu.vn'
const password = process.env.AIPMS_TEST_PASSWORD
if (!password) throw new Error('AIPMS_TEST_PASSWORD must be provided through the process environment.')
const output = new URL('../test-results/department/live-playwright/', import.meta.url)
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await context.newPage()
// Do not record traces/HAR/storage state: those can contain live authentication data.
const errors = [], blockedWrites = [], checks = [], responses = []
let step = 'login'
let projectId = Number(process.env.DEPART_TEST_PROJECT_ID || '1')
page.on('pageerror', error => errors.push(error.name))
page.on('response', response => {
  const url = new URL(response.url())
  if (url.pathname.startsWith('/api/v1/') && response.request().method() === 'GET') {
    responses.push({ path: url.pathname, status: response.status() })
  }
})
await page.route('**/api/v1/**', async route => {
  const request = route.request(), path = new URL(request.url()).pathname
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method()) && !path.startsWith('/api/v1/auth/')) {
    blockedWrites.push({ path, method: request.method() })
    return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ title: 'Read-only browser check blocks domain writes.' }) })
  }
  return route.continue()
})
const routes = [
  ['/department/workspace', 'Điều hành học vụ bộ môn'],
  ['/department/student-qualifications', 'Xác minh điều kiện tham gia đồ án'],
  ['/department/projects/review', 'Danh sách đề cương chờ xử lý'],
  ['/department/portfolio', 'Danh mục đồ án'],
  ['/department/supervisors', 'Giảng viên hướng dẫn'],
  ['/department/topics', 'Quản lý đề tài'],
  ['/department/projects/archived', 'Kho lưu trữ đồ án'],
  ['/academic/governance', 'Học kỳ và giai đoạn đồ án'],
  [`/department/projects/${projectId}/governance`, 'Điều phối đồ án'],
  [`/department/projects/${projectId}/evaluation-schemes`, 'Phương án đánh giá'],
  [`/department/projects/${projectId}/evaluators`, 'Phân công người chấm'],
  [`/department/projects/${projectId}/final-requirements`, 'Yêu cầu bàn giao'],
  [`/department/projects/${projectId}/final-submission`, 'Gói bàn giao cuối'],
  [`/department/projects/${projectId}/files`, 'Kho tệp đồ án'],
  [`/department/projects/${projectId}/contributions`, 'Đóng góp của thành viên'],
  [`/department/projects/${projectId}/result`, 'Công bố kết quả đồ án'],
]
async function ready(heading) {
  await page.getByRole('heading', { name: heading, exact: true, level: 1 }).waitFor()
  await page.waitForFunction(() => !/Đang tải|Đang kiểm tra/.test(document.querySelector('main')?.innerText || ''), null, { timeout: 15000 })
  await page.evaluate(() => document.fonts.ready)
}
try {
  await page.goto(`${base}/login`)
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email)
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password)
  const loginResponse = page.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/auth/login')
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  assert.equal((await loginResponse).status(), 200, 'Application login must succeed.')
  await ready('Điều hành học vụ bộ môn')
  const actor = await page.evaluate(async () => {
    const session = JSON.parse(localStorage.getItem('ai-pms.auth-session') || '{}')
    const r = await fetch('/api/v1/auth/me/context', { headers: { Authorization: `Bearer ${session.accessToken}` } })
    const body = await r.json()
    return { status: r.status, roles: body.user?.roles, departmentId: body.academic?.department?.id, activeScope: body.academic?.hasActiveDepartmentScope }
  })
  assert.equal(actor.status, 200)
  assert.ok(actor.roles.includes('DEPARTMENT_STAFF') && !actor.roles.includes('ADMIN') && actor.activeScope)
  checks.push({ name: 'actual-depart-login-and-scope', actor, passed: true })
  const available = await page.evaluate(async () => { const session = JSON.parse(localStorage.getItem('ai-pms.auth-session') || '{}'); const response = await fetch('/api/v1/dashboards/department?page=1&pageSize=20', { headers: { Authorization: `Bearer ${session.accessToken}` } }); const data = await response.json(); return data.projects?.items?.map(item => item.id) || [] })
  if (!process.env.DEPART_TEST_PROJECT_ID) projectId = available[0]
  assert.ok(Number.isSafeInteger(projectId) && projectId > 0, 'No accessible project fixture available; configure DEPART_TEST_PROJECT_ID.')
  for (const route of routes) route[0] = route[0].replace(/projects\/\d+\//, `projects/${projectId}/`)
  for (const [path, heading] of routes) {
    step = path
    await page.goto(base + path)
    await ready(heading)
    assert.equal(new URL(page.url()).pathname, path)
    assert.equal(await page.getByRole('alert').count(), 0, `Unexpected alert on ${path}`)
    checks.push({ name: 'live-route', path, heading, passed: true })
  }
  step = 'live-governance-overview'
  await page.goto(`${base}/department/projects/${projectId}/governance`)
  await ready('Điều phối đồ án')
  await page.getByRole('heading', { name: 'Phạm vi học thuật và điều kiện đánh giá', exact: true }).waitFor()
  for (const title of ['Bàn giao cuối kỳ', 'Đánh giá đồ án', 'Công bố kết quả']) await page.getByRole('heading', { name: title, exact: true }).waitFor()
  assert.equal(await page.getByRole('link', { name: 'Xem preview và kết quả', exact: true }).getAttribute('href'), `/department/projects/${projectId}/result`)
  checks.push({ name: 'live-governance-overview-and-project-next-steps', passed: true })
  step = 'live-portfolio-exports'
  await page.goto(`${base}/department/portfolio`)
  await ready('Danh mục đồ án')
  for (const format of ['csv', 'xlsx', 'pdf']) {
    await page.getByLabel('Định dạng xuất', { exact: true }).selectOption(format)
    const pendingDownload = page.waitForEvent('download')
    await page.getByRole('button', { name: `Xuất ${format.toUpperCase()}`, exact: true }).click()
    const download = await pendingDownload
    assert.equal(await download.failure(), null)
    assert.ok(download.suggestedFilename().endsWith(`.${format}`))
    const bytes = await readFile(await download.path())
    assert.ok(bytes.length > 0)
    if (format === 'pdf') assert.equal(bytes.subarray(0, 5).toString(), '%PDF-')
    if (format === 'xlsx') {
      assert.equal(bytes.subarray(0, 2).toString(), 'PK')
      assert.ok(bytes.includes(Buffer.from('xl/workbook.xml')))
      assert.ok(bytes.includes(Buffer.from('[Content_Types].xml')))
    }
    if (format === 'csv') assert.ok(bytes.toString('utf8').includes(','))
    await download.delete()
    checks.push({ name: 'live-export-download-header', format, bytes: bytes.length, passed: true })
  }
  const responsive = routes.filter(([path]) => ['/department/workspace', '/department/student-qualifications', '/department/portfolio', `/department/projects/${projectId}/governance`, `/department/projects/${projectId}/result`].includes(path))
  for (const [path, heading] of responsive) {
    step = path
    await page.goto(base + path)
    await ready(heading)
    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 })
      const size = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }))
      assert.equal(size.viewport, width)
      assert.ok(size.content <= width, `Horizontal overflow at ${path} ${width}`)
      const name = path.split('/').filter(Boolean).join('-')
      await page.screenshot({ path: new URL(`${name}-${width}.png`, output).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true, animations: 'disabled' })
      checks.push({ name: 'live-responsive', path, width, ...size, passed: true })
    }
  }
  step = 'preconditions'
  await page.goto(`${base}/academic/governance`)
  await ready('Học kỳ và giai đoạn đồ án')
  await page.getByText('Bạn đang ở chế độ chỉ xem.', { exact: true }).waitFor()
  checks.push({ name: 'depart-academic-structure-read-only', passed: true })
  await page.goto(`${base}/department/projects/${projectId}/result`)
  await ready('Công bố kết quả đồ án')
  assert.equal(await page.getByRole('button', { name: 'Lưu cách tính điểm' }).count(), 0)
  await page.getByText('A published scoped evaluation scheme is required. Legacy results remain read-only.', { exact: true }).waitFor()
  checks.push({ name: 'real-scheme-precondition-no-legacy-form', passed: true })
  await page.goto(`${base}/department/workspace`)
  await ready('Điều hành học vụ bộ môn')
  await page.getByRole('link', { name: 'Điều kiện sinh viên', exact: true }).first().click()
  await ready('Xác minh điều kiện tham gia đồ án')
  checks.push({ name: 'live-sidebar-navigation', passed: true })
  step = 'compact-project-navigation'
  await page.setViewportSize({ width: 375, height: 1000 })
  await page.goto(`${base}/department/projects/${projectId}/governance`)
  await ready('Điều phối đồ án')
  const navigation = page.getByRole('combobox', { name: 'Chọn nghiệp vụ của đồ án' })
  await navigation.selectOption(`/department/projects/${projectId}/result`)
  await ready('Công bố kết quả đồ án')
  assert.equal(new URL(page.url()).pathname, `/department/projects/${projectId}/result`)
  await page.goBack()
  await ready('Điều phối đồ án')
  assert.equal(await navigation.inputValue(), `/department/projects/${projectId}/governance`)
  checks.push({ name: 'compact-selector-preserves-project-and-back', passed: true })
  await page.goto(`${base}/department/workspace`)
  await ready('Điều hành học vụ bộ môn')
  const guide = page.getByText('Hướng dẫn vận hành DEPART theo vòng đời đồ án', { exact: true })
  await guide.focus(); await page.keyboard.press('Enter')
  await page.getByRole('link', { name: 'Kiểm tra khoa và chuyên ngành', exact: true }).waitFor()
  checks.push({ name: 'workflow-guide-keyboard-disclosure', passed: true })
  step = 'topic-draft-form-read-only'
  await page.goto(`${base}/department/topics`)
  await ready('Quản lý đề tài')
  step = 'topic-open-disclosure'
  await page.locator('summary').filter({ hasText: 'Tạo đề tài mới' }).click()
  step = 'topic-catalog-options'
  await page.getByLabel('Kỳ đăng ký', { exact: true }).waitFor()
  await page.waitForFunction(() => document.querySelector('select') && !document.querySelector('main')?.innerText.includes('Đang tải kỳ đăng ký'))
  const period = page.getByLabel('Kỳ đăng ký', { exact: true })
  assert.ok(await period.locator('option').count() > 1)
  step = 'topic-field-errors-no-domain-write'
  await page.getByRole('button', { name: 'Tạo bản nháp', exact: true }).click()
  const summary = page.getByRole('alert').filter({ hasText: 'Kiểm tra các trường sau trước khi lưu' })
  await summary.waitFor()
  await summary.getByRole('link', { name: 'Nhập tên đề tài.', exact: true }).click()
  assert.equal(await page.getByLabel('Tên đề tài', { exact: true }).evaluate(element => element === document.activeElement && element.getAttribute('aria-invalid') === 'true'), true)
  checks.push({ name: 'topic-inline-errors-focus-link-no-domain-write', passed: true })
  await period.selectOption(await period.locator('option').nth(1).getAttribute('value'))
  step = 'topic-proposal-fields'
  await page.getByLabel('Mã đề tài', { exact: true }).fill('READ-ONLY-PREVIEW')
  await page.getByLabel('Tên đề tài', { exact: true }).fill('Form kiểm chứng DEPART — không gửi')
  await page.getByLabel('Bối cảnh và vấn đề', { exact: true }).fill('Nội dung kiểm tra giao diện')
  await page.getByLabel('Hình thức đồ án', { exact: true }).selectOption('INTERDISCIPLINARY')
  for (let index = 1; index <= 2; index++) {
    step = `topic-major-requirement-${index}`
    await page.getByRole('button', { name: 'Thêm ngành yêu cầu', exact: true }).click()
    const major = page.getByLabel(`Ngành yêu cầu ${index}`, { exact: true })
    assert.ok(await major.locator('option').count() > index)
    await major.selectOption(await major.locator('option').nth(index).getAttribute('value'))
    await page.getByLabel(`Trách nhiệm ${index}`, { exact: true }).fill(`Trách nhiệm ngành ${index}`)
  }
  for (const width of [375, 768, 1024, 1440]) {
    step = `topic-responsive-${width}`
    await page.setViewportSize({ width, height: 1000 })
    const size = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }))
    assert.equal(size.viewport, width); assert.ok(size.content <= width)
    await page.screenshot({ path: new URL(`topic-form-${width}.png`, output).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true, animations: 'disabled' })
    checks.push({ name: 'topic-form-live-responsive-no-submit', width, ...size, passed: true })
  }
  assert.deepEqual(errors, [])
  assert.deepEqual(blockedWrites, [])
  const evidence = { date: new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()), projectId, mode: 'LIVE_READ_ONLY_PLAYWRIGHT', realBackend: true, email, domainMutations: 0, passed: true, checks, responses, errors, blockedWrites }
  await writeFile(new URL('results.json', output), JSON.stringify(evidence, null, 2))
  console.log(JSON.stringify({ mode: evidence.mode, passed: true, checks: checks.length, domainMutations: 0 }))
} catch (error) {
  // Raw Playwright errors can include entered values. Keep the report sanitized.
  await writeFile(new URL('results.json', output), JSON.stringify({ mode: 'LIVE_READ_ONLY_PLAYWRIGHT', passed: false, step, errorType: error.name, checks, responses, errors, blockedWrites }, null, 2))
  if (step.startsWith('topic-')) await page.screenshot({ path: new URL('failure.png', output).pathname.replace(/^\/(\w:)/, '$1'), animations: 'disabled' })
  console.error(JSON.stringify({ passed: false, step, errorType: error.name }))
  process.exitCode = 1
} finally {
  await context.close()
  await browser.close()
}
