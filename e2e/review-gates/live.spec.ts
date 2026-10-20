import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import type { LoginSession } from '../../src/features/auth/types/auth.types'
import type { AssignedReviewItem, StudentReviewTimelineDto, ReviewGateTemplate } from '../../src/features/review-gates/types/review-gates.types'

// Requires an owned E2E database and a dedicated API process. Never point this suite at shared staging.
const fixturePath = process.env.REVIEW_GATES_LIVE_FIXTURE
test.skip(!fixturePath, 'Run with an owned database/API and REVIEW_GATES_LIVE_FIXTURE.')
type Fixture = { projects: { id: number; code: string; periodId: number }[]; actors: { id: number; email: string }[]; majors: { id: number; code: string }[] }
const fixture: Fixture | null = fixturePath ? JSON.parse(readFileSync(fixturePath, 'utf8').replace(/^\uFEFF/, '')) : null
const sessions = new Map<string, LoginSession>()
const root = process.env.REVIEW_GATES_API_URL
const initialBytes = Buffer.from('%PDF-1.4\nInitial exact version acceptance file\n%%EOF')
const revisedBytes = Buffer.from('%PDF-1.4\nRevised exact version acceptance file\n%%EOF')

async function login(request: APIRequestContext, email: string) {
  if (sessions.has(email)) return sessions.get(email)!
  const response = await request.post(`${root}/api/v1/auth/login`, { data: { email, password: process.env.AIPMS_E2E_PASSWORD } })
  expect(response.status(), `Real login for ${email}`).toBe(200)
  const session = await response.json() as LoginSession
  sessions.set(email, session)
  return session
}
async function openActor(page: Page, session: LoginSession, view: string, projectId: string) {
  await page.addInitScript(value => {
    localStorage.setItem('review-gates-acceptance-session', JSON.stringify(value))
    localStorage.setItem('token', value.accessToken)
  }, session)
  await page.goto(`/e2e/review-gates.html?view=${view}&projectId=${projectId}`)
}

for (const mode of ['SINGLE_MAJOR', 'INTERDISCIPLINARY'] as const) {
  test(`real API + SQL: ${mode} upload → revision → resubmit → PASS → next gate → exact download/revoke`, async ({ page, context, request }, testInfo) => {
    test.setTimeout(120_000)
    const data = fixture!
    const project = data.projects.find(p => p.code === (mode === 'SINGLE_MAJOR' ? 'E2E-SINGLE-P' : 'E2E-INTER-P'))!
    const projectId = String(project.id)
    const admin = await login(request, 'admin@e2e.invalid')
    const leader = await login(request, mode === 'SINGLE_MAJOR' ? 'single.leader@e2e.invalid' : 'leader@e2e.invalid')
    const evaluator = await login(request, 'evaluator@e2e.invalid')
    const apiEvidence: { method: string; path: string; status: number }[] = []
    async function call<T>(session: LoginSession, path: string, body?: unknown): Promise<T> {
      const options = { headers: { Authorization: `Bearer ${session.accessToken}` } }
      const response = body === undefined ? await request.get(`${root}/api/v1${path}`, options) : await request.post(`${root}/api/v1${path}`, { ...options, data: body })
      apiEvidence.push({ method: body === undefined ? 'GET' : 'POST', path, status: response.status() })
      expect(response.status(), await response.text()).toBe(200)
      return response.json() as Promise<T>
    }
    const read = () => call<StudentReviewTimelineDto>(leader, `/projects/${projectId}/review-gates/timeline`)
    const extraRequirements = mode === 'INTERDISCIPLINARY' ? data.majors.map(m => ({ code: m.code, title: `${m.code} evidence`, type: 'FILE', scope: 'MAJOR_SPECIFIC', majorId: m.id, required: true, verification: 'HUMAN' })) : []
    const baseGate = { code: 'R1', sequence: 1, title: 'Acceptance review', objective: 'Synthetic isolated lifecycle', required: true, blockNextGate: true, blocksDefense: false, start: null, end: null, reviewerPolicy: 'Assigned Reviewer', reviewScope: 'COMMON', requirements: [{ code: 'COMMON', title: 'Common report', type: 'FILE', scope: 'COMMON', required: true, verification: 'HUMAN' }, ...extraRequirements] }
    const template = await call<ReviewGateTemplate>(admin, '/academic/gate-templates', {
      projectPeriodId: project.periodId, code: `ACCEPT-${mode}`, name: `Acceptance ${mode}`, mode, major: '', version: '1.0', gates: [baseGate, { ...baseGate, code: 'R2', sequence: 2, title: 'Next review', requirements: [baseGate.requirements[0]] }],
    })
    await call(admin, `/academic/gate-templates/${template.id}/publish`, { concurrencyToken: template.concurrencyToken })
    let timeline = await read()
    const commonRequirementId = timeline.gates[0].requirements.find(r => r.scope === 'COMMON')!.id
    const actors: { session: LoginSession; item: AssignedReviewItem }[] = []
    async function assign(session: LoginSession, scope: string, majorId?: number) {
      const item = await call<AssignedReviewItem>(admin, '/review-gates/assignments', { projectId, gateCode: 'R1', reviewerId: session.user.id, scope, majorId })
      actors.push({ session, item })
    }
    await assign(evaluator, 'COMMON')
    if (mode === 'INTERDISCIPLINARY') {
      await assign(await login(request, 'staff.cs@e2e.invalid'), 'MAJOR_SPECIFIC', data.majors.find(m => m.code === 'E2E-SE')!.id)
      await assign(await login(request, 'staff.ds@e2e.invalid'), 'MAJOR_SPECIFIC', data.majors.find(m => m.code === 'E2E-DS')!.id)
    }
    await openActor(page, leader, 'student', projectId)
    await page.getByRole('row', { name: /Common report/ }).getByRole('button', { name: 'Nộp tài liệu', exact: true }).click()
    await page.getByLabel('Tệp minh chứng', { exact: true }).setInputFiles({ name: 'common.pdf', mimeType: 'application/pdf', buffer: initialBytes })
    await page.getByPlaceholder(/Mô tả cụ thể/).fill('Initial evidence')
    await page.getByRole('button', { name: 'Nộp minh chứng', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    timeline = await read()
    // Upload remaining major evidence with the same real multipart contract.
    for (const req of timeline.gates[0].requirements.filter(r => r.scope !== 'COMMON')) {
      timeline = await read()
      const response = await request.post(`${root}/api/v1/projects/${projectId}/review-gates/R1/evidence/file`, {
        headers: { Authorization: `Bearer ${leader.accessToken}` }, multipart: {
          file: { name: `${req.code}.pdf`, mimeType: 'application/pdf', buffer: initialBytes }, requirementId: req.id, expectedVersion: '0', concurrencyToken: timeline.gates[0].concurrencyToken!, notes: 'Major evidence',
        },
      })
      expect(response.status(), await response.text()).toBe(200)
    }
    await page.reload()
    await Promise.all([
      page.waitForResponse(response => response.url().endsWith('/submit-for-review') && response.request().method() === 'POST').then(response => expect(response.status()).toBe(200)),
      page.getByRole('button', { name: 'Gửi hồ sơ thẩm định' }).click(),
    ])
    const reviewerPage = await context.newPage()
    await openActor(reviewerPage, evaluator, 'reviewer', projectId)
    await reviewerPage.getByRole('button', { name: new RegExp(project.code) }).click()
    await reviewerPage.getByRole('button', { name: '✕ Yêu cầu sửa', exact: true }).click()
    await reviewerPage.getByPlaceholder(/Nhập chi tiết đánh giá/).fill('Please revise the common report')
    await reviewerPage.getByRole('button', { name: /Yêu cầu nhóm chỉnh sửa/ }).click()
    await expect(reviewerPage.getByRole('status').filter({ hasText: 'Đã lưu quyết định' })).toBeVisible()
    timeline = await read()
    expect(timeline.gates[0].status).toBe('REVISION_REQUIRED')
    expect(timeline.capabilities.canSubmitRevision).toBe(true)
    await page.reload()
    await page.getByRole('row', { name: /Common report/ }).getByRole('button', { name: 'Nộp bản sửa', exact: true }).click()
    await page.getByLabel('Tệp minh chứng', { exact: true }).setInputFiles({ name: 'common-v2.pdf', mimeType: 'application/pdf', buffer: revisedBytes })
    await page.getByPlaceholder(/Mô tả cụ thể/).fill('Revised evidence')
    await page.getByRole('button', { name: 'Xác nhận nộp bản sửa' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await Promise.all([
      page.waitForResponse(response => response.url().endsWith('/submit-for-review') && response.request().method() === 'POST').then(response => expect(response.status()).toBe(200)),
      page.getByRole('button', { name: 'Gửi hồ sơ thẩm định' }).click(),
    ])
    // All scoped verifications precede any PASS decisions; BE remains authoritative.
    for (const actor of actors) {
      const queue = await call<{ items: AssignedReviewItem[] }>(actor.session, '/reviewers/me/gate-assignments?page=1&pageSize=20')
      actor.item = queue.items.find(a => a.projectId === projectId)!
      for (const req of actor.item.requirements) {
        actor.item = await call<AssignedReviewItem>(actor.session, `/review-gates/assignments/${actor.item.id}/evidence/${req.id}/verify`, { requirementId: req.id, decision: 'ACCEPTED', concurrencyToken: actor.item.concurrencyToken })
      }
    }
    for (const actor of actors) actor.item = await call<AssignedReviewItem>(actor.session, `/review-gates/assignments/${actor.item.id}/decision`, { decision: 'PASSED', notes: 'Accepted isolated evidence', concurrencyToken: actor.item.concurrencyToken })
    timeline = await read()
    expect(timeline.gates[0].status).toBe('PASSED')
    expect(timeline.gates[1].status).toBe('PLANNED')
    expect(timeline.gates[1].reviewEligibility).toBe('READY')
    const downloadPath = `/projects/${projectId}/review-gates/R1/requirements/${commonRequirementId}/evidence/1/download`
    const originalDownload = await request.get(`${root}/api/v1${downloadPath}`, { headers: { Authorization: `Bearer ${evaluator.accessToken}` } })
    expect(originalDownload.status()).toBe(200)
    expect(await originalDownload.body()).toEqual(initialBytes)
    expect(createHash('sha256').update(await originalDownload.body()).digest('hex')).toBe(createHash('sha256').update(initialBytes).digest('hex'))
    // Revoke an active assignment on the next gate. The BE explicitly rejects revoke of DECIDED assignments.
    const nextRequirement = timeline.gates[1].requirements[0]
    const nextAssignment = await call<AssignedReviewItem>(admin, '/review-gates/assignments', { projectId, gateCode: 'R2', reviewerId: evaluator.user.id, scope: 'COMMON' })
    const nextUpload = await request.post(`${root}/api/v1/projects/${projectId}/review-gates/R2/evidence/file`, {
      headers: { Authorization: `Bearer ${leader.accessToken}` }, multipart: {
        file: { name: 'next-gate.pdf', mimeType: 'application/pdf', buffer: revisedBytes }, requirementId: nextRequirement.id,
        expectedVersion: '0', concurrencyToken: timeline.gates[1].concurrencyToken!, notes: 'Next gate file for active revocation',
      },
    })
    expect(nextUpload.status(), await nextUpload.text()).toBe(200)
    const nextQueue = await call<{ items: AssignedReviewItem[] }>(evaluator, '/reviewers/me/gate-assignments?page=1&pageSize=20')
    const activeNext = nextQueue.items.find(a => a.id === nextAssignment.id)!
    const nextDownloadPath = `/projects/${projectId}/review-gates/R2/requirements/${nextRequirement.id}/evidence/1/download`
    const beforeRevoke = await request.get(`${root}/api/v1${nextDownloadPath}`, { headers: { Authorization: `Bearer ${evaluator.accessToken}` } })
    expect(beforeRevoke.status()).toBe(200)
    await call(admin, `/review-gates/assignments/${activeNext.id}/revoke`, { concurrencyToken: activeNext.concurrencyToken, reason: 'Revoke active acceptance assignment' })
    const revoked = await request.get(`${root}/api/v1${nextDownloadPath}`, { headers: { Authorization: `Bearer ${evaluator.accessToken}` } })
    expect(revoked.status()).toBe(403)
    const anonymous = await request.get(`${root}/api/v1${downloadPath}`)
    expect(anonymous.status()).toBe(401)
    await page.reload()
    await page.screenshot({ path: testInfo.outputPath(`${mode}-completed.png`), fullPage: true })
    await testInfo.attach('sanitized-api-evidence', { body: Buffer.from(JSON.stringify({ mode, projectId, apiEvidence, originalBytes: initialBytes.length, revoked: revoked.status(), anonymous: anonymous.status() }, null, 2)), contentType: 'application/json' })
    await reviewerPage.close()
  })
}
