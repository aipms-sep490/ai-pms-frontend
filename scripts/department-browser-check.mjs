import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
const require = createRequire(import.meta.url)
// Reuse an installed Playwright runtime without adding a product dependency.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '@playwright/test')
const base = process.env.DEPART_BROWSER_URL || 'http://127.0.0.1:5187'
const output = new URL('../test-results/department/', import.meta.url)
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
await context.tracing.start({ screenshots: true, snapshots: true })
await context.addInitScript(() => { window.__AIPMS_DEPART_FIXTURE__ = true })
const page = await context.newPage()
const errors = [], unknown = [], writes = [], checks = []
page.on('pageerror', error => errors.push(error.message))
let conflict = false, forbidden = false, published = false
const response = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
const paged = (items, page = 1, count = items.length, size = 20) => ({ items, page, pageSize: size, totalCount: count, totalPages: Math.max(1, Math.ceil(count / size)) })
const user = { id: 5, email: 'department@example.test', fullName: 'Cán bộ bộ môn thử nghiệm', roles: ['DEPARTMENT_STAFF'] }
const semester = { id: 3, organizationId: 1, code: 'FA26', name: 'Học kỳ Thu 2026', status: 'ACTIVE', startDate: '2026-09-01', endDate: '2026-12-31', isCurrent: true }
const workflow = { asOfUtc: '2026-10-07T00:00:00Z', user: { ...user, status: 'ACTIVE', effectiveRoles: user.roles, grantedPermissions: [], requiresTokenRefresh: false }, academic: { organization: { id: 1, code: 'TEST', name: 'Cơ sở thử nghiệm', isActive: true }, department: { id: 2, code: 'SE', name: 'Bộ môn Kỹ thuật phần mềm', isActive: true }, major: null, hasActiveDepartmentScope: true, hasEligibleStudentProfile: false, issues: [] }, currentSemesters: [semester], selectedSemester: semester, semesterSelectionIssues: [], periods: [], currentTeam: null, actions: [{ code: 'manage_academic_structure', allowed: true, reasons: [] }] }
await page.route('**/api/v1/**', async route => {
  const request = route.request(), url = new URL(request.url()), path = url.pathname.replace('/api/v1', '')
  const pageNumber = Number(url.searchParams.get('page') ?? 1)
  if (request.method() !== 'GET') {
    if (path === '/auth/google/challenge') return response(route, { title: 'Google login disabled in fixture' }, 503)
    if (path === '/auth/login') return response(route, { user, accessToken: 'synthetic-access', tokenType: 'Bearer', expiresAtUtc: '2099-01-01T00:00:00Z', refreshToken: 'synthetic-refresh', refreshTokenExpiresAtUtc: '2099-01-02T00:00:00Z' })
    writes.push({ path, method: request.method(), body: request.postDataJSON() })
    if (conflict) return response(route, { title: 'Conflict', detail: 'The reviewed version changed.' }, 409)
    if (path === '/projects/9/result') { published = true; return response(route, result) }
    if (path.includes('/student-qualifications/')) return response(route, {})
    unknown.push(path); return response(route, { title: 'Unexpected write' }, 501)
  }
  if (path === '/student-qualifications/verification-queue') return response(route, paged([{ id: pageNumber === 1 ? 12 : 32, userId: 12, fullName: pageNumber === 1 ? 'Mai Anh' : 'Sinh viên trang hai', studentCode: 'SE012', trainingStatus: 'TRAINING_COMPLETED', concurrencyToken: conflict ? 'fresh-evidence-token' : 'reviewed-evidence-token', verificationStatus: 'PENDING_VERIFICATION', certificateFileId: 5, certificateNumber: 'CERT-012', issuedAt: '2026-09-01T00:00:00Z', expiresAt: '2027-09-01T00:00:00Z' }], pageNumber, 41))
  if (path === '/projects/review-queue') return response(route, paged([], 1, 0, 5))
  if (path === '/dashboards/department') return response(route, { asOfUtc: '2026-10-07T00:00:00Z', departmentId: 2, summary: { totalProjects: 6, projectStates: [], majors: [], supervisors: [], riskLevels: [] }, projects: paged(pageNumber === 1 ? [{ id: 9, code: 'P09', title: 'Đồ án ứng dụng quản trị học vụ', status: 'ACTIVE', pendingProgressReviews: 1, analysis: { progressSummary: { blockedTasks: 0, overdueTasks: 2 } } }] : [], pageNumber, 6, 5) })
  if (path === '/supervisors') return response(route, paged([], 1, 0, 5))
  if (path === '/projects/9/actions') return response(route, { actions: [{ code: 'archive_project', allowed: true, reasons: [] }] })
  if (path === '/projects/9') return response(route, { id: 9, status: 'COMPLETED', concurrencyToken: 'synthetic-archive-token' })
  if (path === '/student-qualifications/12/certificate') return response(route, { qualificationId: 12, fileId: 5, fileName: 'Certificate.pdf', contentType: 'application/pdf', sizeBytes: 2048, checksumSha256: null })
  if (path === '/student-qualifications/12/certificate/download') return route.fulfill({ contentType: 'application/pdf', body: '%PDF-1.4 synthetic download fixture' })
  if (path === '/projects/9/supervisor-assignments') return response(route, paged([
    { id: 4, projectId: 9, supervisorProfileId: 8, supervisorName: 'Mentor khoa tham gia', isPrimary: false, endedAt: null, allowedActions: [{ code: 'REPLACE', allowed: true }, { code: 'END', allowed: true }], reasons: [] },
    { id: 6, projectId: 9, supervisorProfileId: 7, supervisorName: 'Primary khoa khác', isPrimary: true, endedAt: null, allowedActions: [{ code: 'REPLACE', allowed: false }, { code: 'END', allowed: false }], reasons: ['OUTSIDE_ASSIGNMENT_SCOPE'] }
  ]))
  if (path === '/supervisor-assignments/4') return response(route, { id: 4, endedAt: null, allowedActions: [{ code: 'REPLACE', allowed: true }, { code: 'END', allowed: true }] })
  if (path === '/supervisor-assignments/4/replacement-candidates') return response(route, paged([{ candidate: { id: pageNumber === 1 ? 9 : 10, fullName: pageNumber === 1 ? 'Ứng viên mentor' : 'Ứng viên trang hai', departmentName: 'IT', remainingSlots: 2, activeProjects: 1, semesterActiveProjects: 1, semesterLimit: 3 }, assignmentType: 'DISCIPLINE_MENTOR', majorId: 3, responsibleDepartmentId: 2, eligible: true, reasons: [], expertiseMatch: 'MATCHED' }], pageNumber, 21))
  if (path === '/dashboards/portfolio/export') return route.fulfill({ contentType: url.searchParams.get('format') === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', body: 'synthetic transport fixture' })
  if (path === '/evaluation-schemes') return response(route, [{ id: 1, status: 'PUBLISHED', students: [{ studentId: 12, departmentId: 2, majorId: 3 }, { studentId: 13, departmentId: 8, majorId: 4 }] }])
  if (path === '/projects/9/result') return published ? response(route, result) : response(route, { title: 'Not found', detail: 'ProjectResult does not exist.' }, 404)
  if (path.endsWith('/result/preview')) return forbidden ? response(route, { title: 'Forbidden', detail: 'Cross-department publication requires administrator.' }, 403) : response(route, { projectId: 9, canPublish: true, totalScore: 8, passThreshold: 5, outcome: 'PASS', confirmationToken: 'synthetic-preview-token', blockers: [], contributions: [] })
  if (/\/students\/\d+\/result$/.test(path)) return response(route, { title: 'Not found', detail: 'StudentResult does not exist.' }, 404)
  if (path === '/academic/semesters' || path === '/academic/project-periods') return response(route, paged([]))
  if (path === '/auth/me/context') return response(route, workflow)
  if (path === '/auth/me') return response(route, user)
  if (path === '/notifications/unread-count') return response(route, { count: 0 })
  unknown.push(path); return response(route, { title: 'Unmapped fixture endpoint' }, 501)
})
const result = { projectId: 9, totalScore: 8, passThreshold: 5, outcome: 'PASS', calculationRule: 'synthetic-server-rule', publishedAt: '2026-10-07T00:00:00Z' }
const goto = view => page.goto(`${base}/e2e/department.html?view=${view}`)
const visible = async (role, name) => page.getByRole(role, { name, exact: true }).waitFor()
try {
  await goto('qualifications'); await visible('heading', 'Mai Anh')
  await page.getByRole('button', { name: 'Trang sau', exact: true }).click(); await visible('heading', 'Sinh viên trang hai')
  await page.getByRole('textbox', { name: 'Tìm sinh viên' }).fill('Mai'); await visible('heading', 'Mai Anh')
  assert.ok((await page.getByRole('navigation', { name: 'Phân trang hồ sơ xác minh' }).innerText()).includes('Trang 1'))
  await page.getByRole('button', { name: 'Xác minh', exact: true }).focus(); await page.keyboard.press('Enter'); await visible('dialog', 'Xác minh điều kiện tham gia')
  await page.keyboard.press('Escape'); assert.equal(writes.length, 0)
  checks.push('pagination-filter-reset-keyboard-cancel')
  conflict = true
  await page.getByRole('button', { name: 'Xác minh', exact: true }).click(); await page.getByRole('button', { name: 'Xác nhận đủ điều kiện' }).click()
  await page.getByRole('alert').waitFor(); assert.equal(writes.length, 1); assert.ok((await page.getByRole('alert').innerText()).includes('thay đổi'))
  checks.push('qualification-conflict-no-replay'); conflict = false
  assert.equal(writes[0].body.expectedConcurrencyToken, 'reviewed-evidence-token')
  await page.getByRole('button', { name: 'Xem chứng chỉ', exact: true }).click()
  await visible('dialog', 'Chứng chỉ của sinh viên')
  const certificateDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Tải chứng chỉ', exact: true }).click()
  assert.equal((await certificateDownload).suggestedFilename(), 'Certificate.pdf')
  await page.getByRole('button', { name: 'Đóng hộp thoại', exact: true }).click()
  checks.push('qualification-displayed-token-protected-certificate-download')
  for (const view of ['qualifications', 'workspace', 'result']) {
    await goto(view); await page.getByRole('heading', { level: 1 }).waitFor()
    if (view === 'qualifications') await visible('heading', 'Mai Anh')
    if (view === 'result') await visible('region', 'Bản xem trước kết quả')
    if (view === 'workspace') await visible('heading', 'P09 · Đồ án ứng dụng quản trị học vụ')
    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 })
      await page.evaluate(() => document.fonts.ready)
      const size = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: window.innerWidth }))
      assert.ok(size.content <= size.viewport, `${view} overflow at ${width}: ${JSON.stringify(size)}`)
      await page.screenshot({ path: new URL(`${view}-${width}.png`, output).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true })
      checks.push(`${view}-responsive-${width}`)
    }
  }
  await goto('workspace'); await visible('heading', 'P09 · Đồ án ứng dụng quản trị học vụ')
  assert.ok((await page.getByText('Tín hiệu từ các đồ án', { exact: false }).innerText()).includes('không phải tổng số'))
  await page.getByRole('navigation', { name: 'Phân trang tín hiệu đồ án' }).getByRole('button', { name: 'Trang sau' }).click()
  await page.getByText('Chưa có dữ liệu trong phạm vi bộ môn hiện tại.', { exact: true }).first().waitFor()
  checks.push('workspace-page-bounded-attention')
  await goto('result'); await visible('region', 'Bản xem trước kết quả')
  assert.equal(await page.getByRole('button', { name: 'Lưu cách tính điểm' }).count(), 0)
  assert.equal(await page.getByRole('option', { name: 'Sinh viên #13' }).count(), 0)
  await page.getByRole('checkbox').check(); await page.getByRole('button', { name: 'Công bố kết quả đồ án', exact: true }).click()
  await page.getByRole('button', { name: 'Xác nhận công bố' }).click(); await visible('region', 'Kết quả đồ án đã công bố')
  assert.equal(writes.at(-1).body.confirmationToken, 'synthetic-preview-token'); checks.push('scoped-publication-current-token')
  published = false; forbidden = true
  await goto('result'); await page.getByRole('alert').waitFor(); await visible('heading', 'Kết quả từng sinh viên')
  checks.push('forbidden-project-independent-student')
  await page.goto(`${base}/e2e/department.html?view=result&inactive=true`)
  await visible('heading', 'Phạm vi bộ môn không hợp lệ hoặc đã hết hiệu lực.'); assert.equal(await page.getByRole('heading', { name: 'Công bố kết quả đồ án' }).count(), 0)
  checks.push('direct-resource-inactive-scope')
  await page.goto(`${base}/login`)
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(user.email)
  await page.getByLabel('Mật khẩu', { exact: true }).fill('synthetic-only')
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await page.goto(`${base}/department/workspace`)
  await visible('heading', 'Điều hành học vụ bộ môn')
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.evaluate(() => document.fonts.ready)
    const size = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: window.innerWidth }))
    assert.ok(size.content <= size.viewport, `App shell overflow at ${width}`)
    await page.screenshot({ path: new URL(`app-workspace-${width}.png`, output).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true })
    checks.push(`app-shell-responsive-${width}`)
  }
  await page.getByRole('link', { name: 'Điều kiện sinh viên', exact: true }).first().click()
  await visible('heading', 'Xác minh điều kiện tham gia đồ án')
  checks.push('actual-router-sidebar-qualification')
  await goto('portfolio'); await visible('button', 'Lưu trữ')
  const previousWrites = writes.length
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.getByRole('button', { name: 'Lưu trữ', exact: true }).focus(); await page.keyboard.press('Enter')
    await visible('dialog', 'Lưu trữ đồ án?')
    assert.ok((await page.getByRole('dialog').innerText()).includes('P09'))
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await page.screenshot({ path: new URL(`archive-dialog-${width}.png`, output).pathname.replace(/^\/(\w:)/, '$1'), animations: 'disabled' })
    await page.keyboard.press('Escape')
    await page.getByRole('dialog').waitFor({ state: 'hidden' })
    assert.equal(writes.length, previousWrites)
    checks.push(`archive-dialog-keyboard-cancel-responsive-${width}`)
  }
  conflict = true
  await page.getByRole('button', { name: 'Lưu trữ', exact: true }).click()
  await page.getByRole('button', { name: 'Xác nhận lưu trữ', exact: true }).click()
  await page.getByText('Đồ án đã thay đổi. Danh sách đã được tải lại; hãy kiểm tra trước khi lưu trữ.', { exact: true }).waitFor()
  assert.equal(writes.length, previousWrites + 1)
  assert.deepEqual(writes.at(-1).body, { concurrencyToken: 'synthetic-archive-token', reason: null })
  checks.push('archive-conflict-no-replay-current-project-token')
  conflict = false
  for (const format of ['xlsx', 'pdf']) {
    await page.getByLabel('Định dạng xuất', { exact: true }).selectOption(format)
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: `Xuất ${format.toUpperCase()}`, exact: true }).click()
    assert.ok((await download).suggestedFilename().endsWith(`.${format}`))
    checks.push(`authorized-${format}-transport-download`)
  }
  await goto('assignments'); await visible('button', 'Chọn người thay thế')
  assert.equal(await page.getByRole('button', { name: 'Chọn người thay thế' }).count(), 1)
  await page.getByText('Phân công này nằm ngoài phạm vi khoa được phép xử lý.', { exact: true }).waitFor()
  checks.push('assignment-denial-vietnamese-server-scope')
  await page.getByRole('button', { name: 'Chọn người thay thế' }).click()
  await page.getByLabel('Giảng viên thay thế', { exact: true }).selectOption('9')
  await page.getByText('Chuyên môn phù hợp ngành phụ trách', { exact: false }).waitFor()
  await page.getByRole('button', { name: 'Ứng viên trang sau' }).click()
  await page.getByRole('option', { name: 'Ứng viên trang hai · IT' }).waitFor({ state: 'attached' })
  await page.getByLabel('Giảng viên thay thế', { exact: true }).selectOption('10')
  checks.push('participating-mentor-capabilities-scoped-candidates-pagination')
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await page.screenshot({ path: new URL(`assignment-candidates-${width}.png`, output).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true, animations: 'disabled' })
    checks.push(`assignment-responsive-${width}`)
  }
  conflict = true
  const beforeReplacement = writes.length
  await page.getByRole('button', { name: 'Thay giảng viên', exact: true }).click()
  await page.getByLabel('Lý do thay đổi', { exact: true }).fill('Đổi mentor theo chuyên môn')
  await page.getByRole('dialog').getByRole('button', { name: 'Thay giảng viên', exact: true }).click()
  await page.getByRole('alert').waitFor()
  assert.equal(writes.length, beforeReplacement + 1)
  assert.equal(writes.at(-1).path, '/supervisor-assignments/4/replace')
  assert.deepEqual(writes.at(-1).body, { supervisorProfileId: 10, reason: 'Đổi mentor theo chuyên môn' })
  checks.push('mentor-replacement-conflict-no-replay')
  await goto('overview')
  await visible('heading', 'Phạm vi học thuật và điều kiện đánh giá')
  await page.getByText('Kết quả xuyên khoa cần quản trị viên công bố.', { exact: true }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Công bố kết quả', exact: true }).count(), 0)
  assert.equal(await page.getByRole('link', { name: 'Xem preview và kết quả' }).getAttribute('href'), '/department/projects/9/result')
  checks.push('governance-overview-frozen-participating-scope-server-readiness')
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await page.screenshot({ path: new URL(`governance-overview-${width}.png`, output).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true, animations: 'disabled' })
    checks.push(`governance-overview-responsive-${width}`)
  }
  const lockedContext = await browser.newContext()
  const lockedPage = await lockedContext.newPage()
  const unexpectedLiveRequests = []
  await lockedContext.route('**/api/v1/**', async route => {
    unexpectedLiveRequests.push(route.request().url())
    await route.abort()
  })
  await lockedPage.goto(`${base}/e2e/department.html?view=assignments`)
  await lockedPage.getByRole('heading', { name: 'Fixture DEPART đã khóa' }).waitFor()
  assert.deepEqual(unexpectedLiveRequests, [])
  checks.push('direct-fixture-entry-locked-no-business-api')
  await lockedContext.close()
  assert.deepEqual(errors, []); assert.deepEqual(unknown, [])
  await writeFile(new URL('browser-results.json', output), JSON.stringify({ mode: 'MOCKED_COMPONENT_AND_APP_BROWSER', realBackend: false, checks, errors, unknownEndpoints: unknown, writes, passed: true }, null, 2))
  console.log(JSON.stringify({ passed: true, checks: checks.length, mode: 'MOCKED_COMPONENT_AND_APP_BROWSER', output: output.pathname }))
} catch (error) {
  await page.screenshot({ path: new URL('failure.png', output).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true })
  await writeFile(new URL('browser-results.json', output), JSON.stringify({ passed: false, error: String(error), checks, errors, unknownEndpoints: unknown }, null, 2))
  throw error
} finally {
  await context.tracing.stop({ path: new URL('trace.zip', output).pathname.replace(/^\/(\w:)/, '$1') })
  await browser.close()
}
