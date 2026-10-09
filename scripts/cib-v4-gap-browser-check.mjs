import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
const output = new URL('../test-results/cib-v4-gap/', import.meta.url)
await mkdir(output, { recursive: true })
const base = process.env.CIB_GAP_BROWSER_URL || 'http://127.0.0.1:5191'
const browser = await chromium.launch({ headless: true })
const checks = [], unknown = [], errors = [], writes = []
const user = { id: 7, email: 'admin@fixture.test', fullName: 'Quản trị fixture', roles: ['ADMIN'] }
const semester = { id: 1, organizationId: 1, code: 'FA26', name: 'Thu 2026', status: 'ACTIVE', isCurrent: true, startDate: '2026-09-01', endDate: '2026-12-31' }
const paged = items => ({ items, page: 1, pageSize: 100, totalCount: items.length, totalPages: 1 })
const workflow = person => ({ asOfUtc: '2026-10-09T00:00:00Z', user: { ...person, status: 'ACTIVE', effectiveRoles: person.roles, grantedPermissions: [], requiresTokenRefresh: false }, academic: { organization: null, department: null, major: null, hasActiveDepartmentScope: false, hasEligibleStudentProfile: false, issues: [] }, currentSemesters: [semester], selectedSemester: semester, semesterSelectionIssues: [], periods: [], currentTeam: null, actions: [] })
const project = { id: 9, teamId: 2, code: 'P-9', title: 'Đồ án liên ngành fixture', status: 'FINAL_SUBMISSION', majors: [{ majorId: 3, majorCode: 'IT', majorName: 'Kỹ thuật phần mềm' }, { majorId: 12, majorCode: 'GD', majorName: 'Thiết kế' }] }
let scheme = { id: 2, rootId: 2, version: 1, projectId: 9, projectPeriodId: 4, name: 'Scheme fixture', status: 'DRAFT', passThreshold: 6.5, concurrencyToken: 'old-token', policyVersionId: 1, calculationRule: 'SERVER_FIXTURE', components: [{ id: 1, name: 'Common', scope: 'COMMON', majorId: null, rubricId: 8, projectWeightPercent: 100, studentWeightPercent: 100, requiredEvaluators: 1 }], students: [{ studentId: 21, majorId: 3, departmentId: 2 }, { studentId: 22, majorId: 12, departmentId: 4 }] }
let published = null, forbidden = false
async function newContext(person) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  await context.addInitScript(user => localStorage.setItem('ai-pms.auth-session', JSON.stringify({ user, accessToken: 'synthetic-fixture', refreshToken: 'synthetic-refresh', tokenType: 'Bearer', expiresAtUtc: '2099-01-01T00:00:00Z', refreshTokenExpiresAtUtc: '2099-01-02T00:00:00Z' })), person)
  return context
}
const context = await newContext(user), page = await context.newPage()
page.setDefaultTimeout(10000)
page.on('pageerror', error => errors.push(error.message))
const respond = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
await page.route('**/api/v1/**', async route => {
  const request = route.request(), path = new URL(request.url()).pathname.replace('/api/v1', '')
  if (path === '/auth/me') return respond(route, user)
  if (path === '/auth/me/context') return respond(route, workflow(user))
  if (path === '/notifications/unread-count') return respond(route, { count: 0 })
  if (path === '/dashboards/admin') return respond(route, { asOfUtc: '2026-10-09', departmentId: null, summary: { totalProjects: 1, projectStates: [{ status: 'FINAL_SUBMISSION', count: 1 }], majors: [], supervisors: [], riskLevels: [] }, projects: paged([{ ...project, semesterId: 1, pendingProgressReviews: 0, analysis: null, departmentName: null, majors: [] }]) })
  if (path === '/projects/9') return respond(route, project)
  if (path === '/academic/project-periods') return respond(route, paged([{ id: 4, name: 'Đợt đánh giá fixture', periodType: 'EVALUATION', status: 'ACTIVE', academicSemesterId: 1 }]))
  if (path === '/rubrics') return respond(route, paged([{ id: 8, code: 'IT', name: 'Rubric fixture', version: 1, status: 'PUBLISHED', criteria: [] }]))
  if (path === '/evaluation-schemes') return forbidden ? respond(route, { title: 'Forbidden' }, 403) : respond(route, [scheme])
  if (path === '/evaluation-schemes/2' && request.method() === 'PUT') { writes.push({ path, body: request.postDataJSON() }); scheme = { ...scheme, name: 'Fresh server fixture', concurrencyToken: 'fresh-token' }; return respond(route, { title: 'Conflict' }, 409) }
  if (path === '/projects/9/evaluation-assignments') return respond(route, paged([]))
  if (path === '/projects/9/final-submission') return respond(route, { id: 41, projectId: 9, projectPeriodId: 4, status: 'SUBMITTED', submittedAt: '2026-10-09T00:00:00Z', submittedBy: 21, deadline: '2026-10-10T00:00:00Z', notes: 'Locked package fixture', isLocked: true, items: [] })
  if (path === '/projects/9/result' && request.method() === 'GET') return published ? respond(route, published) : route.fulfill({ status: 204 })
  if (path === '/projects/9/result/preview') return respond(route, { canPublish: true, totalScore: 8.25, passThreshold: 6.5, outcome: 'PASS', blockers: [], confirmationToken: 'preview-token' })
  if (path === '/projects/9/result' && request.method() === 'POST') { const body = request.postDataJSON(); writes.push({ path, body }); assert.equal(body.confirmationToken, 'preview-token'); published = { totalScore: 8.25, passThreshold: 6.5, outcome: 'PASS', publishedAt: '2026-10-09T00:00:00Z', calculationRule: 'SERVER_FIXTURE' }; return respond(route, published, 201) }
  unknown.push(`${request.method()} ${path}`); return respond(route, { title: 'Unmapped route fixture' }, 501)
})
async function capture(name) {
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow ${name} ${width}`)
    if (width === 375 || width === 1440) await page.screenshot({ path: new URL(`${name}-${width}.png`, output).pathname.replace(/^\/([A-Z]:)/, '$1'), fullPage: true, animations: 'disabled' })
  }
}
try {
  await page.goto(`${base}/admin/portfolio`)
  await page.getByRole('link', { name: 'Phương án đánh giá', exact: true }).waitFor()
  assert.equal(await page.getByRole('link', { name: 'Thẩm định', exact: true }).count(), 0)
  await capture('portfolio')
  checks.push('Admin portfolio discovers scheme/result without department-review or archive actions')
  await page.getByRole('link', { name: 'Phương án đánh giá', exact: true }).click()
  await page.getByRole('button', { name: /Scheme fixture/ }).waitFor()
  await page.getByRole('button', { name: 'Tạo bản nháp', exact: true }).first().click()
  assert.equal(await page.getByLabel('Ngưỡng đạt (0–10)').inputValue(), '')
  assert.equal(await page.getByLabel('Trọng số điểm đồ án (%)').inputValue(), '0')
  await capture('scheme-draft')
  checks.push('Admin without department reaches scheme; new draft has no proposed threshold or weights')
  await page.getByRole('button', { name: /Scheme fixture/ }).click()
  await page.getByLabel('Tên phương án đánh giá').fill('Local draft fixture')
  await page.getByRole('button', { name: 'Lưu bản nháp' }).click()
  await page.getByRole('alert').waitFor()
  assert.equal(await page.getByLabel('Tên phương án đánh giá').inputValue(), 'Local draft fixture')
  assert(await page.getByLabel('Tên phương án đánh giá').isDisabled())
  assert.equal(writes.filter(write => write.path === '/evaluation-schemes/2').length, 1)
  await page.getByRole('button', { name: /Fresh server fixture/ }).click()
  assert.equal(await page.getByLabel('Tên phương án đánh giá').inputValue(), 'Fresh server fixture')
  checks.push('409 retains local draft, locks stale mutation, reloads a fresh selected version without replay')
  scheme.status = 'PUBLISHED'
  await page.goto(`${base}/admin/projects/9/evaluators`)
  await page.getByRole('heading', { name: 'Phân công người chấm', exact: true }).waitFor()
  await page.getByRole('link', { name: 'Phương án đánh giá', exact: true }).last().waitFor()
  await capture('assignments')
  checks.push('Admin assignment page loads with scoped scheme navigation')
  await page.goto(`${base}/admin/projects/9/final-submission`)
  await page.getByRole('heading', { name: 'Gói đã khóa và nộp', exact: true }).waitFor()
  await capture('locked-submission')
  checks.push('Admin locked package viewer retains admin portfolio return path')
  await page.goto(`${base}/admin/projects/9/result`)
  await page.getByRole('region', { name: 'Bản xem trước kết quả' }).waitFor()
  await page.getByLabel('Sinh viên', { exact: true }).locator('option[value="22"]').waitFor({ state: 'attached' })
  assert.equal(await page.getByLabel('Sinh viên', { exact: true }).locator('option').count(), 3)
  await capture('result-preview')
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Công bố kết quả đồ án', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Xác nhận công bố' }).click()
  await page.getByRole('region', { name: 'Kết quả đồ án đã công bố' }).waitFor()
  checks.push('Cross-department Admin uses BE preview token and retains both department student targets')
  forbidden = true
  await page.goto(`${base}/admin/projects/9/evaluation-schemes`)
  await page.getByRole('alert').waitFor()
  assert.equal(await page.getByRole('button', { name: /Fresh server fixture/ }).count(), 0)
  checks.push('Backend 403 stays an explicit error and never falls back to fixture success')
  for (const roles of [['DEPARTMENT_STAFF'], ['LECTURER'], ['STUDENT']]) {
    const deniedContext = await newContext({ ...user, roles }), deniedPage = await deniedContext.newPage()
    const resourceReads = []
    await deniedPage.route('**/api/v1/**', route => {
      const path = new URL(route.request().url()).pathname.replace('/api/v1', '')
      if (path === '/auth/me') return respond(route, { ...user, roles })
      if (path === '/auth/me/context') return respond(route, workflow({ ...user, roles }))
      if (path === '/notifications/unread-count') return respond(route, { count: 0 })
      if (path.includes('evaluation-schemes') || path.includes('/result')) resourceReads.push(path)
      return respond(route, { title: 'Outside identity fixture scope' }, 403)
    })
    await deniedPage.goto(`${base}/admin/projects/9/result`)
    await deniedPage.waitForURL(url => !url.pathname.startsWith('/admin/'))
    assert.deepEqual(resourceReads, [])
    await deniedContext.close()
    checks.push(`${roles[0]} direct Admin result URL is denied before resource API access`)
  }
  assert.deepEqual(unknown, []); assert.deepEqual(errors, [])
} finally {
  await writeFile(new URL('browser-evidence.json', output), JSON.stringify({ kind: 'production-router-api-fixture', liveBackendVerified: false, checks, unknown, errors, writes }, null, 2))
  await browser.close()
}
console.log(JSON.stringify({ passed: checks.length, unknown, errors, liveBackendVerified: false }))
