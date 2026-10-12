import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

const output = new URL('../test-results/fe2-03b/', import.meta.url)
await mkdir(output, { recursive: true })
const base = process.env.FE2_03B_BROWSER_URL || 'http://127.0.0.1:5194'
const user = { id: 7, email: 'reader@fixture.test', fullName: 'Người đọc fixture', roles: ['ADMIN'] }
const paged = items => ({ items, page: 1, pageSize: 100, totalCount: items.length, totalPages: 1 })
const policy = { isDemo: false, approvalStatus: 'APPROVED', approvalReference: 'Quyết định ' + 'QD/2026/'.repeat(40), formula: 'COMPONENT_WEIGHTS', calculationVersion: 'DECIMAL_V2', roundingMode: 'AWAY_FROM_ZERO', decimalPlaces: 2 }
const component = { id: 1, name: 'Thành phần bảo vệ chung', scope: 'COMMON', majorId: null, rubricId: 8, projectWeightPercent: 100, studentWeightPercent: 100, requiredEvaluators: 2, stage: 'DEFENSE', evaluatorWeights: [{ evaluatorId: 7, weightPercent: 75.125 }, { evaluatorId: 8, weightPercent: 24.875 }] }
const common = { rootId: 2, version: 1, projectId: 9, projectPeriodId: 4, status: 'PUBLISHED', passThreshold: 6.5, concurrencyToken: 'fixture-token', policyVersionId: 1, calculationRule: 'SERVER_RULE', components: [component], students: [], lockedAt: '2026-10-09T00:00:00Z' }
const schemes = [
  { ...common, id: 2, name: 'Chính sách có phê duyệt', policy },
  { ...common, id: 3, name: 'Cấu hình minh họa đã khóa', policy: { ...policy, isDemo: true, approvalStatus: 'DEMO', approvalReference: null, formula: 'DEMO_50_30_20' } },
  { ...common, id: 4, name: 'Dữ liệu lịch sử chưa rõ', policy: null, lockedAt: null, components: [{ ...component, stage: null, evaluatorWeights: null }] },
  { ...common, id: 5, name: 'Mã cấu hình mới chưa rõ', status: 'NEW_STATE', lockedAt: 'invalid', policy: { ...policy, approvalStatus: 'NEW_APPROVAL', formula: 'NEW_FORMULA', calculationVersion: 'NEW_VERSION' }, components: [{ ...component, stage: 'NEW_STAGE', evaluatorWeights: [] }] },
  { ...common, id: 6, name: 'COLD chỉ theo dõi', status: 'DRAFT', lockedAt: null, policy: { ...policy, isDemo: true, approvalStatus: 'DEMO', approvalReference: null }, components: [component, { ...component, id: 2, name: 'Theo dõi báo cáo COLD', stage: 'COLD', projectWeightPercent: 0, studentWeightPercent: 0, evaluatorWeights: null }] },
]
const checks = [], errors = [], unmapped = [], writes = [], policyWrites = []
const browser = await chromium.launch({ headless: true })
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  await context.addInitScript(user => localStorage.setItem('ai-pms.auth-session', JSON.stringify({ user, accessToken: 'synthetic-fixture', refreshToken: 'synthetic-refresh', tokenType: 'Bearer', expiresAtUtc: '2099-01-01T00:00:00Z', refreshTokenExpiresAtUtc: '2099-01-02T00:00:00Z' })), user)
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/api/v1/**', route => {
    const request = route.request(), path = new URL(request.url()).pathname.replace('/api/v1', '')
    const respond = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (request.method() !== 'GET') { writes.push(`${request.method()} ${path}`); return respond({ title: 'Read-only fixture' }, 403) }
    if (path === '/auth/me') return respond(user)
    if (path === '/auth/me/context') return respond({ asOfUtc: '2026-10-12T00:00:00Z', user: { ...user, status: 'ACTIVE', effectiveRoles: user.roles, grantedPermissions: [], requiresTokenRefresh: false }, academic: { organization: null, department: null, major: null, hasActiveDepartmentScope: false, hasEligibleStudentProfile: false, issues: [] }, currentSemesters: [], selectedSemester: null, semesterSelectionIssues: [], periods: [], currentTeam: null, actions: [] })
    if (path === '/notifications/unread-count') return respond({ count: 0 })
    if (path === '/projects/9') return respond({ id: 9, code: 'P9', title: 'Đồ án fixture', status: 'FINAL_SUBMISSION', majors: [{ majorId: 3, majorCode: 'SE', majorName: 'Kỹ thuật phần mềm' }] })
    if (path === '/evaluation-schemes') return respond(schemes)
    if (path === '/academic/project-periods') return respond(paged([{ id: 4, name: 'Đợt đánh giá', periodType: 'EVALUATION', status: 'ACTIVE' }]))
    if (path === '/rubrics') return respond(paged([{ id: 8, code: 'SE', name: 'Bộ tiêu chí', version: 1, status: 'PUBLISHED' }]))
    unmapped.push(`${request.method()} ${path}`); return respond({ title: 'Unmapped fixture' }, 501)
  })
  await page.goto(`${base}/admin/projects/9/evaluation-schemes`)
  for (const [index, scheme] of schemes.entries()) {
    // Exercise native keyboard activation on the first selection.
    const selector = page.getByRole('button', { name: new RegExp(scheme.name) })
    if (index === 0) { await selector.focus(); await page.keyboard.press('Enter') } else await selector.click()
    const summary = page.getByRole('region', { name: 'Thông tin chính sách đánh giá' })
    await summary.waitFor()
    if (index === 0) {
      await summary.getByText('Đã ghi nhận phê duyệt', { exact: true }).waitFor()
      await summary.getByText('Người chấm #7: 75.125%', { exact: true }).waitFor()
    }
    if (index === 1 || index === 4) await summary.getByText('Minh họa — chưa dùng chính thức', { exact: true }).waitFor()
    if (index === 2) await summary.getByText('Giai đoạn: Chưa xác định', { exact: true }).waitFor()
    if (index === 3) await summary.getByText(/Danh sách trọng số rỗng/).waitFor()
    if (index === 4) await summary.getByText('Giai đoạn: Đánh giá COLD', { exact: true }).waitFor()
    assert.equal(await summary.getByRole('button').count(), 0)
    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 })
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow: ${scheme.id}/${width}`)
      if (width === 375 || width === 1440) await page.screenshot({ path: fileURLToPath(new URL(`policy-${scheme.id}-${width}.png`, output)), fullPage: true, animations: 'disabled' })
      checks.push({ schemeId: scheme.id, width, overflow: false })
    }
  }
  assert.deepEqual(errors, []); assert.deepEqual(unmapped, []); assert.deepEqual(writes, [])
  const staff = { ...user, roles: ['DEPARTMENT_STAFF'] }
  const staffContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  await staffContext.addInitScript(user => localStorage.setItem('ai-pms.auth-session', JSON.stringify({ user, accessToken: 'synthetic-staff-fixture', refreshToken: 'synthetic-refresh', tokenType: 'Bearer', expiresAtUtc: '2099-01-01T00:00:00Z', refreshTokenExpiresAtUtc: '2099-01-02T00:00:00Z' })), staff)
  const staffPage = await staffContext.newPage()
  staffPage.on('pageerror', error => errors.push(error.message))
  let forbidden = false
  let periodDraft = { id: 2, projectPeriodId: 4, version: 2, status: 'DRAFT', effectiveFrom: '2026-10-01T00:00:00Z', effectiveTo: '2099-12-01T00:00:00Z', concurrencyToken: 'old-token', policy: { allowedProjectModes: 'SINGLE_MAJOR', allowedProposalSources: 'STUDENT_PROPOSAL', minTeamSize: 2, maxTeamSize: 4, minDistinctMajors: 1, maxProjectsPerSupervisor: 5 } }
  const effective = { ...periodDraft, id: 1, version: 1, status: 'PUBLISHED', concurrencyToken: 'locked-token' }
  await staffPage.route('**/api/v1/**', route => {
    const request = route.request(), path = new URL(request.url()).pathname.replace('/api/v1', '')
    const respond = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (path === '/auth/me') return respond(staff)
    if (path === '/auth/me/context') return respond({ asOfUtc: '2026-10-12T00:00:00Z', user: { ...staff, status: 'ACTIVE', effectiveRoles: staff.roles, grantedPermissions: [], requiresTokenRefresh: false }, academic: { organization: { id: 1, name: 'Fixture' }, department: { id: 2, organizationId: 1, name: 'Bộ môn fixture', status: 'ACTIVE' }, major: null, hasActiveDepartmentScope: true, hasEligibleStudentProfile: false, issues: [] }, currentSemesters: [], selectedSemester: null, semesterSelectionIssues: [], periods: [], currentTeam: null, actions: [] })
    if (path === '/notifications/unread-count') return respond({ count: 0 })
    if (path === '/academic/project-periods/4/qualification-policy') return respond({ projectPeriodId: 4, requireStudentQualification: false, qualificationType: 'CERTIFICATE', requireCertificate: false, checkExpiration: false })
    if (path === '/project-periods/4/policy-versions') return forbidden ? respond({ title: 'Forbidden' }, 403) : respond([periodDraft, effective])
    if (path === '/project-periods/4/effective-policy') return forbidden ? respond({ title: 'Forbidden' }, 403) : respond(effective)
    if (path === '/project-periods/4/policy' && request.method() === 'PUT') {
      policyWrites.push(request.postDataJSON())
      if (policyWrites.length === 1) periodDraft = { ...periodDraft, concurrencyToken: 'fresh-token', policy: { ...periodDraft.policy, maxTeamSize: 5 } }
      else forbidden = true
      return respond({ title: 'Conflict' }, 409)
    }
    unmapped.push(`${request.method()} ${path}`); return respond({ title: 'Unmapped fixture' }, 501)
  })
  await staffPage.goto(`${base}/academic/project-periods/4/policy`)
  await staffPage.getByRole('button', { name: /Phiên bản 2/ }).click()
  assert(await staffPage.getByRole('button', { name: 'Tạo bản kế tiếp', exact: true }).isDisabled())
  await staffPage.getByLabel('Thành viên tối đa').fill('6')
  await staffPage.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click()
  await staffPage.getByRole('alert').filter({ hasText: 'Chính sách vừa được thay đổi' }).waitFor()
  assert.equal(await staffPage.getByLabel('Thành viên tối đa').inputValue(), '6')
  assert(await staffPage.getByLabel('Thành viên tối đa').isDisabled())
  assert(await staffPage.getByRole('button', { name: 'Công bố ngay', exact: true }).isDisabled())
  for (const width of [375, 768, 1024, 1440]) {
    await staffPage.setViewportSize({ width, height: 1000 })
    assert(await staffPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `period policy overflow: ${width}`)
    if (width === 375 || width === 1440) await staffPage.screenshot({ path: fileURLToPath(new URL(`period-conflict-${width}.png`, output)), fullPage: true, animations: 'disabled' })
    checks.push({ case: 'period-policy-409-lock', width, overflow: false })
  }
  assert.equal(policyWrites.length, 1)
  await staffPage.getByRole('button', { name: /Phiên bản 2/ }).click()
  assert.equal(await staffPage.getByLabel('Thành viên tối đa').inputValue(), '5')
  await staffPage.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click()
  await staffPage.getByText('Chưa có phiên bản chính sách.', { exact: true }).waitFor()
  assert(await staffPage.getByLabel('Thành viên tối đa').isDisabled())
  assert.equal(policyWrites.length, 2)
  assert.equal(policyWrites[0].concurrencyToken, 'old-token')
  assert.equal(policyWrites[1].concurrencyToken, 'fresh-token')
  assert.deepEqual(errors, []); assert.deepEqual(unmapped, [])
} finally {
  await writeFile(new URL('browser-evidence.json', output), JSON.stringify({ kind: 'production-router-api-fixture', liveBackendVerified: false, checks, errors, unmapped, readOnlySchemeWrites: writes, policyWrites }, null, 2))
  await browser.close()
}
console.log(JSON.stringify({ passed: checks.length, cases: schemes.length + 2, errors, unmapped, readOnlySchemeWrites: writes, policyWrites: policyWrites.length, liveBackendVerified: false }))
