import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

const output = new URL('../test-results/fe2-01b/', import.meta.url)
await mkdir(output, { recursive: true })
const base = process.env.FE2_BROWSER_URL || 'http://127.0.0.1:5193'
const browser = await chromium.launch({ headless: true })
const checks = [], unknown = [], errors = [], writes = [], viewports = []
const user = { id: 7, email: 'admin@fixture.test', fullName: 'Quản trị fixture', roles: ['ADMIN'] }
const semester = { id: 1, organizationId: 1, code: 'FA26', name: 'Thu 2026', status: 'ACTIVE', isCurrent: true, startDate: '2026-09-01', endDate: '2026-12-31' }
const paged = items => ({ items, page: 1, pageSize: 100, totalCount: items.length, totalPages: 1 })
const workflow = { asOfUtc: '2026-10-12T00:00:00Z', user: { ...user, status: 'ACTIVE', effectiveRoles: user.roles, grantedPermissions: [], requiresTokenRefresh: false }, academic: { organization: null, department: null, major: null, hasActiveDepartmentScope: false, hasEligibleStudentProfile: false, issues: [] }, currentSemesters: [semester], selectedSemester: semester, semesterSelectionIssues: [], periods: [], currentTeam: null, actions: [] }
const project = { id: 9, teamId: 2, code: 'P-9', title: 'Đồ án liên ngành fixture', status: 'FINAL_SUBMISSION', majors: [{ majorId: 3, majorCode: 'IT', majorName: 'Kỹ thuật phần mềm' }, { majorId: 12, majorCode: 'GD', majorName: 'Thiết kế' }] }
let mode = 'denied', published = null
let scheme = { id: 2, rootId: 2, version: 1, projectId: 9, projectPeriodId: 4, name: 'Scheme fixture', status: 'DRAFT', passThreshold: 6.5, concurrencyToken: 'old-token', policyVersionId: 1, calculationRule: 'SERVER_FIXTURE', components: [{ id: 1, name: 'Common', scope: 'COMMON', majorId: null, rubricId: 8, projectWeightPercent: 100, studentWeightPercent: 100, requiredEvaluators: 1 }], students: [{ studentId: 21, majorId: 3, departmentId: 2 }] }
const caps = () => ({ projectId: 9, projectStatus: 'FINAL_SUBMISSION', concurrencyToken: 'project-token', academicScopeProvenance: 'FROZEN_REGISTRATION_SNAPSHOT', leadDepartmentId: 2, managedDepartmentIds: mode === 'denied' ? [] : [2], registrationSnapshotId: 3, schemeId: 2, schemeConcurrencyToken: scheme.concurrencyToken, policyVersionId: 1, actions: ['manage_evaluation_scheme', 'manage_evaluators', 'publish_project_result'].map(code => ({ code, allowed: mode === 'lead' || (mode === 'participant' && code === 'manage_evaluators'), reasons: mode === 'lead' || (mode === 'participant' && code === 'manage_evaluators') ? [] : [code === 'manage_evaluators' ? 'ACADEMIC_COMPONENT_SCOPE_REQUIRED' : code === 'publish_project_result' ? 'LEAD_DEPARTMENT_REQUIRED_FOR_PUBLICATION' : 'LEAD_DEPARTMENT_REQUIRED'] })) })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
await context.addInitScript(user => localStorage.setItem('ai-pms.auth-session', JSON.stringify({ user, accessToken: 'synthetic-fixture', refreshToken: 'synthetic-refresh', tokenType: 'Bearer', expiresAtUtc: '2099-01-01T00:00:00Z', refreshTokenExpiresAtUtc: '2099-01-02T00:00:00Z' })), user)
const page = await context.newPage()
page.setDefaultTimeout(10000)
page.on('pageerror', error => errors.push(error.message))
const respond = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
await page.route('**/api/v1/**', async route => {
  const request = route.request(), path = new URL(request.url()).pathname.replace('/api/v1', '')
  if (path === '/auth/me') return respond(route, user)
  if (path === '/auth/me/context') return respond(route, workflow)
  if (path === '/notifications/unread-count') return respond(route, { count: 0 })
  if (path === '/projects/9/my-capabilities') return mode === 'error' ? respond(route, { title: 'Unavailable' }, 503) : respond(route, caps())
  if (path === '/projects/9') return respond(route, project)
  if (path === '/academic/project-periods') return respond(route, paged([{ id: 4, name: 'Đợt đánh giá fixture', periodType: 'EVALUATION', status: 'ACTIVE', academicSemesterId: 1 }]))
  if (path === '/rubrics') return respond(route, paged([{ id: 8, code: 'IT', name: 'Rubric fixture', version: 1, status: 'PUBLISHED', criteria: [] }]))
  if (path === '/evaluation-schemes') return respond(route, [scheme])
  if (path === '/evaluation-schemes/2' && request.method() === 'PUT') {
    writes.push({ path, body: request.postDataJSON() })
    scheme = { ...scheme, name: 'Fresh server fixture', concurrencyToken: 'fresh-token' }; mode = 'denied'
    return respond(route, { title: 'Conflict' }, 409)
  }
  if (path === '/projects/9/evaluation-assignments') return respond(route, paged([{ id: 8, projectId: 9, evaluatorId: 6, projectPeriodId: 4, rubricId: 8, departmentId: 2, evaluationType: 'LECTURER', status: 'ACTIVE', assignedAt: '2026-10-09', concurrencyToken: 'assignment-token', componentId: 1 }]))
  if (path === '/projects/9/eligible-evaluators') return respond(route, paged([{ userId: 6, displayName: 'Người chấm fixture', departmentId: 2, departmentName: 'Khoa fixture', evaluationTypes: ['LECTURER'] }]))
  if (path === '/projects/9/result' && request.method() === 'GET') return published ? respond(route, published) : route.fulfill({ status: 204 })
  // Deliberately permit this preview in denied cases to prove that FE cannot use canPublish alone.
  if (path === '/projects/9/result/preview') return respond(route, { canPublish: true, totalScore: 8.25, passThreshold: 6.5, outcome: 'PASS', blockers: [], confirmationToken: 'preview-token' })
  if (path === '/projects/9/result' && request.method() === 'POST') {
    const body = request.postDataJSON(); assert.equal(mode, 'lead'); assert.equal(body.confirmationToken, 'preview-token')
    writes.push({ path, body }); published = { totalScore: 8.25, passThreshold: 6.5, outcome: 'PASS', publishedAt: '2026-10-12T00:00:00Z', calculationRule: 'SERVER_FIXTURE' }
    return respond(route, published, 201)
  }
  unknown.push(`${request.method()} ${path}`); return respond(route, { title: 'Unmapped fixture route' }, 501)
})
async function capture(name) {
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow ${name} ${width}`)
    viewports.push({ name, width, horizontalOverflow: false })
    if (width === 375 || width === 1440) await page.screenshot({ path: fileURLToPath(new URL(`${name}-${width}.png`, output)), fullPage: true, animations: 'disabled' })
  }
}
try {
  await page.goto(`${base}/admin/projects/9/evaluation-schemes`)
  const item = page.getByRole('button', { name: /Scheme fixture/ })
  await item.focus(); await page.keyboard.press('Enter')
  assert(await page.getByLabel('Tên phương án đánh giá').isDisabled())
  assert.equal(await page.getByRole('button', { name: 'Tạo bản nháp', exact: true }).count(), 0)
  await capture('admin-scheme-readonly')
  checks.push('Admin-only scheme is keyboard-readable with no mutation controls')
  await page.goto(`${base}/admin/projects/9/evaluators`)
  await page.getByText('#8 · giảng viên #6').waitFor()
  assert.equal(await page.getByRole('heading', { name: 'Phân công mới' }).count(), 0)
  assert.equal(await page.getByRole('button', { name: 'Thu hồi', exact: true }).count(), 0)
  await capture('admin-assignments-readonly')
  checks.push('Admin-only assignment list stays readable without assign/revoke controls')
  await page.goto(`${base}/admin/projects/9/result`)
  await page.getByRole('region', { name: 'Bản xem trước kết quả' }).waitFor()
  assert.equal(await page.getByRole('checkbox').count(), 0)
  assert.equal(await page.getByRole('button', { name: 'Công bố kết quả đồ án', exact: true }).count(), 0)
  assert.equal(writes.length, 0)
  await capture('admin-result-readonly')
  checks.push('Positive result preview cannot grant publication without a BE capability; zero writes')
  mode = 'error'
  await page.getByRole('button', { name: 'Tải lại quyền thao tác' }).click()
  await page.getByText(/Chưa xác minh được thao tác khả dụng/).waitFor()
  assert.equal(await page.getByRole('checkbox').count(), 0)
  await capture('capability-failure')
  mode = 'lead'
  await page.getByRole('button', { name: 'Tải lại quyền thao tác' }).click()
  await page.getByRole('checkbox').waitFor()
  checks.push('Failed capability refresh removes authority and explicit retry restores server-granted authority')
  await page.goto(`${base}/admin/projects/9/evaluation-schemes`)
  await page.getByRole('button', { name: /Scheme fixture/ }).click()
  await page.getByLabel('Tên phương án đánh giá').fill('Local unsaved fixture')
  await page.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click()
  await page.getByRole('alert').waitFor()
  assert.equal(await page.getByLabel('Tên phương án đánh giá').inputValue(), 'Local unsaved fixture')
  assert(await page.getByLabel('Tên phương án đánh giá').isDisabled())
  assert.equal(writes.length, 1)
  await capture('draft-retained-revoked')
  checks.push('409 plus revoked capabilities preserves draft, locks further edits and never replays a write')
  mode = 'participant'; scheme = { ...scheme, status: 'PUBLISHED' }
  await page.goto(`${base}/admin/projects/9/evaluators`)
  await page.getByRole('heading', { name: 'Phân công mới' }).waitFor()
  await page.locator('#evaluation-period').selectOption('4')
  await page.locator('#scheme-component').selectOption('1')
  await page.locator('#evaluator-id option[value="6"]').waitFor({ state: 'attached' })
  await capture('scoped-assignments')
  checks.push('Scoped evaluator capability opens assignment UI independently of scheme/publication capability')
  mode = 'lead'
  await page.goto(`${base}/admin/projects/9/result`)
  await page.getByRole('checkbox').check()
  const publish = page.getByRole('button', { name: 'Công bố kết quả đồ án', exact: true })
  await publish.focus()
  await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab')
  assert(await publish.evaluate(element => element.matches(':focus-visible') && getComputedStyle(element).outlineStyle !== 'none'))
  await page.keyboard.press('Enter')
  await page.getByRole('dialog').getByRole('button', { name: 'Hủy', exact: true }).click()
  assert.equal(writes.length, 1)
  await publish.click()
  await page.getByRole('dialog').getByRole('button', { name: 'Xác nhận công bố', exact: true }).click()
  await page.getByRole('region', { name: 'Kết quả đồ án đã công bố' }).waitFor()
  await capture('server-authorized-publication')
  assert.equal(writes.length, 2)
  checks.push('Server-authorized actor can publish on Admin navigation; keyboard focus/cancel/token validation pass')
  assert.deepEqual(unknown, []); assert.deepEqual(errors, [])
} finally {
  await writeFile(new URL('browser-evidence.json', output), JSON.stringify({ kind: 'production-router-api-fixture', liveBackendVerified: false, checks, viewports, unknown, errors, writes }, null, 2))
  await browser.close()
}
console.log(JSON.stringify({ passed: checks.length, viewports: viewports.length, unknown, errors, liveBackendVerified: false }))
