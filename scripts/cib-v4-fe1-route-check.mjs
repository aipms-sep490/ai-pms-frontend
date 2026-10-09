import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
const output = new URL('../test-results/cib-v4-fe1/', import.meta.url)
await mkdir(output, { recursive: true })
const base = process.env.FE1_BROWSER_URL || 'http://127.0.0.1:5189'
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const user = { id: 7, email: 'student@fixture.test', fullName: 'Mai Anh', roles: ['STUDENT'] }
await context.addInitScript(user => localStorage.setItem('ai-pms.auth-session', JSON.stringify({ user, accessToken: 'synthetic-fixture', refreshToken: 'synthetic-refresh', tokenType: 'Bearer', expiresAtUtc: '2099-01-01T00:00:00Z', refreshTokenExpiresAtUtc: '2099-01-02T00:00:00Z' })), user)
const page = await context.newPage(), unknown = [], errors = [], writes = [], checks = []
page.on('pageerror', error => errors.push(error.message))
let active = false, archived = false, qualification = null
const semester = { id: 1, organizationId: 1, code: 'FA26', name: 'Thu 2026', status: 'ACTIVE', isCurrent: true, startDate: '2026-09-01', endDate: '2026-12-31' }
const scope = { projectMode: 'INTERDISCIPLINARY', leadDepartmentId: 2, concurrencyToken: 'scope', requirements: [3, 12].map(majorId => ({ majorId, minMembers: 1, maxMembers: 5, responsibility: 'Phát triển' })) }
const team = () => ({ id: 2, academicSemesterId: 1, code: 'T-2', name: 'Nhóm fixture', status: active ? 'LOCKED' : 'FORMING', academicScope: scope, members: [{ userId: 7, fullName: 'Mai Anh', majorId: 3, organizationId: 1, isEligibleStudent: true, isLeader: true }], eligibility: { canRegister: false, rosterLocked: active, reasons: ['TOO_FEW_MEMBERS'] } })
const project = () => ({ id: 9, teamId: 2, teamName: 'Nhóm fixture', code: 'P-9', title: 'Đồ án fixture liên ngành', status: archived ? 'ARCHIVED' : 'ACTIVE', registeredAt: '2026-09-01', createdBy: 7, createdByName: 'Mai Anh', createdAt: '2026-09-01', updatedAt: '2026-09-01', concurrencyToken: 'project', academicScope: scope, academicScopeProvenance: 'FROZEN_REGISTRATION_SNAPSHOT', majors: [{ id: 1, majorId: 3, majorCode: 'SE', majorName: 'Kỹ thuật phần mềm' }, { id: 2, majorId: 12, majorCode: 'GD', majorName: 'Thiết kế đồ họa' }], tags: [] })
const workflow = () => ({ asOfUtc: '2026-10-09T00:00:00Z', user: { ...user, status: 'ACTIVE', effectiveRoles: user.roles, grantedPermissions: [], requiresTokenRefresh: false }, academic: { organization: { id: 1, code: 'TEST', name: 'Cơ sở fixture', isActive: true }, department: { id: 2, code: 'SE', name: 'Khoa fixture', isActive: true }, major: { id: 3, departmentId: 2, code: 'SE', name: 'Kỹ thuật phần mềm', isActive: true }, hasActiveDepartmentScope: true, hasEligibleStudentProfile: true, issues: [] }, currentSemesters: [semester], selectedSemester: semester, semesterSelectionIssues: [], periods: [], currentTeam: team(), actions: [] })
const paged = items => ({ items, page: 1, pageSize: 20, totalCount: items.length, totalPages: 1 })
const respond = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
await page.route('**/api/v1/**', async route => {
  const request = route.request(), path = new URL(request.url()).pathname.replace('/api/v1', '')
  if (request.method() === 'POST' && path === '/student-qualifications/me/certificate') {
    writes.push(path); qualification = { id: 12, userId: 7, trainingStatus: 'TRAINING_COMPLETED', verificationStatus: 'PENDING_VERIFICATION', certificateNumber: 'C-12' }; return respond(route, qualification)
  }
  if (request.method() === 'POST' && path === '/tasks') { writes.push({ path, body: request.postDataJSON() }); return respond(route, { id: 20 }) }
  if (path === '/auth/me') return respond(route, user)
  if (path === '/auth/me/context') return respond(route, workflow())
  if (path === '/notifications/unread-count') return respond(route, { count: 0 })
  if (path === '/academic/project-periods') return respond(route, paged([]))
  if (path === '/academic/majors') return respond(route, paged([{ id: 3, name: 'Kỹ thuật phần mềm' }, { id: 12, name: 'Thiết kế đồ họa' }]))
  if (path === '/teams/current' || path === '/teams/2') return respond(route, team())
  if (path === '/teams/2/actions') return respond(route, { teamId: 2, canRegister: false, actions: [], reasons: ['TOO_FEW_MEMBERS'] })
  if (path === '/teams/invitations' || path === '/team-leader-change-requests') return respond(route, paged([]))
  if (path === '/projects') return respond(route, paged(active ? [project()] : []))
  if (path === '/projects/9') return respond(route, project())
  if (path === '/projects/9/supervisor-assignments') return respond(route, paged([]))
  if (path === '/projects/9/actions') return respond(route, { projectId: 9, status: project().status, actions: [] })
  if (path === '/projects/9/execution-actions') return respond(route, { projectId: 9, projectStatus: project().status, actions: [{ code: 'create_task', allowed: !archived, reasons: [] }] })
  if (path === '/teams/2/major-requirements/3/responsibilities') return respond(route, { concurrencyToken: 'responsibility', items: [] })
  if (path === '/milestones/project/9') return respond(route, [{ id: 2, title: 'Phát triển', status: 'PLANNED', projectId: 9 }])
  if (path === '/tasks/project/9') return respond(route, paged([]))
  if (path === '/projects/9/major-requirements') return respond(route, { concurrencyToken: 'scope', requirements: [{ majorId: 3 }, { majorId: 12 }] })
  if (path === '/projects/9/evidence') return respond(route, paged([]))
  if (path === '/student-qualifications/me') return qualification ? respond(route, qualification) : route.fulfill({ status: 204 })
  if (path === '/projects/9/students/7/result') return respond(route, { id: 3, projectId: 9, studentId: 7, majorId: 3, schemeId: 2, totalScore: 8.25, passThreshold: 5, outcome: 'PASSED', publishedAt: '2026-10-09T08:00:00Z', calculationRule: 'SERVER_FIXTURE', snapshotJson: '{}' })
  unknown.push(`${request.method()} ${path}`); return respond(route, { title: 'Unmapped route fixture' }, 501)
})
async function capture(name) {
  await page.setViewportSize({ width: 375, height: 812 })
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow ${name}`)
  await page.screenshot({ path: new URL(`route-${name}-375.png`, output).pathname.replace(/^\/([A-Z]:)/, '$1'), fullPage: true, animations: 'disabled' })
  await page.setViewportSize({ width: 1440, height: 1000 })
}
try {
  await page.goto(`${base}/team`)
  await page.getByRole('button', { name: 'Nộp chứng nhận', exact: true }).waitFor()
  await page.getByLabel('Tệp chứng nhận').setInputFiles({ name: 'certificate.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 fixture') })
  await page.getByRole('checkbox', { name: /Tôi đã hoàn thành/ }).check()
  await page.getByRole('button', { name: 'Nộp chứng nhận', exact: true }).click()
  await page.getByText('Chờ xác minh', { exact: true }).waitFor()
  assert.equal(writes.filter(item => typeof item === 'string').length, 1)
  await capture('team')
  checks.push('/team: real router, restored synthetic auth, qualification upload, refresh readback, no automatic team eligibility promotion')
  active = true; await page.goto(`${base}/project/tasks`)
  await page.getByRole('button', { name: 'Tạo công việc', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Tạo công việc', exact: true }).click()
  await page.getByLabel('Ngành chính').waitFor()
  await page.getByLabel('Tên công việc').fill('Công việc route fixture')
  await page.getByLabel('Mốc đồ án').selectOption('2'); await page.getByLabel('Ngành chính').selectOption('3')
  await page.getByRole('checkbox', { name: 'Thiết kế đồ họa', exact: true }).check()
  await capture('task-board')
  await page.getByRole('region', { name: 'Tạo công việc', exact: true }).getByRole('button', { name: 'Tạo công việc', exact: true }).click()
  await page.getByText('Đã tạo công việc.', { exact: true }).waitFor()
  assert.equal(writes.filter(item => typeof item !== 'string').length, 1)
  checks.push('/project/tasks: execution capability+frozen scope permit atomic interdisciplinary create')
  await page.goto(`${base}/project/evidence`)
  await page.getByText('Chưa có minh chứng phù hợp', { exact: true }).waitFor()
  await page.getByRole('combobox', { name: 'Ngành', exact: true }).selectOption('12')
  await page.getByRole('button', { name: 'Áp dụng', exact: true }).click(); await capture('evidence')
  checks.push('/project/evidence: existing execution route connects authoritative major selector')
  archived = true; await page.goto(`${base}/project/result`)
  await page.getByText('8.25', { exact: true }).waitFor(); await capture('archived-result')
  assert.equal(await page.getByRole('button', { name: 'Tạo công việc', exact: true }).count(), 0)
  checks.push('/project/result: archived project retains own published result, no execution mutation CTA')
  assert.deepEqual(unknown, []); assert.deepEqual(errors, [])
} finally {
  await writeFile(new URL('route-evidence.json', output), JSON.stringify({ kind: 'real-app-router-api-fixture', checks, unknown, errors, writes, liveBackendVerified: false }, null, 2))
  await browser.close()
}
console.log(JSON.stringify({ passed: checks.length, kind: 'real-app-router-api-fixture', unknown, errors }))
