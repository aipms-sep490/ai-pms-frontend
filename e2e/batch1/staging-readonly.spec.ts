import { expect, test } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
const root = process.env.BATCH1_EVIDENCE_DIR || 'F:/AI-PMS/artifacts/fe-batch1-20261022'
const actors = [
  { actor: 'student-p1', email: 'p1.se1@demo.aipms.invalid', endpoint: '/students/me/next-actions' },
  { actor: 'student-p3', email: 'p3.se1@demo.aipms.invalid', endpoint: '/students/me/next-actions' },
  { actor: 'lecturer', email: 'lecturer.it1@demo.aipms.invalid', endpoint: '/supervisors/me/triage-queue' },
  { actor: 'department', email: 'staff.it@demo.aipms.invalid', endpoint: null },
]
for (const actor of actors) test(`staging read only: ${actor.actor}`, async ({ page, request }) => {
  test.skip(!process.env.BATCH1_DEMO_PASSWORD, 'Supply demo password only through process environment.')
  const mutations: string[] = []
  page.on('request', req => { if (req.url().includes('/api/v1/') && !['GET', 'OPTIONS'].includes(req.method()) && !/\/auth\/(login|refresh|google\/challenge)/.test(req.url())) mutations.push(`${req.method()} ${new URL(req.url()).pathname}`) })
  await page.route('**/auth/google/challenge', route => route.fulfill({ status: 503, json: { detail: 'Google login is outside this password-login check.' } }))
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(actor.email)
  await page.getByLabel('Mật khẩu', { exact: true }).fill(process.env.BATCH1_DEMO_PASSWORD!)
  const login = page.waitForResponse(r => r.url().endsWith('/auth/login') && r.request().method() === 'POST')
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  const response = await login
  expect(response.status()).toBe(200)
  const session = await response.json()
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 })
  const headers = { Authorization: `Bearer ${session.accessToken}` }
  // Only sanitized shapes/counts are retained. No tokens, passwords, or auth response bodies.
  const evidence: Record<string, unknown> = { actor: actor.actor, loginStatus: response.status(), reads: [] }
  const reads = evidence.reads as Array<Record<string, unknown>>
  let endpoint = actor.endpoint
  if (!endpoint) {
    const scope = await request.get('/api/v1/auth/me/context', { headers })
    const data = await scope.json()
    const id = data.department?.id ?? data.academicScope?.departmentId ?? data.user?.departmentId ?? data.academic?.department?.id
    evidence.departmentScopeStatus = scope.status()
    evidence.scopeTopLevelFields = Object.keys(data)
    expect(id).toBeGreaterThan(0)
    if (id) endpoint = `/departments/${id}/urgent-actions`
  }
  const now = new Date(), from = new Date(now.getTime() - 30 * 86400000).toISOString(), to = new Date(now.getTime() + 180 * 86400000).toISOString()
  const paths = [...(endpoint ? [endpoint] : []), ...(actor.actor === 'lecturer' ? [`/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&pageSize=100`] : []), ...(actor.actor.startsWith('student') ? ['/students/me/review-gates/timeline'] : [])]
  for (const path of paths) {
    const res = await request.get(`/api/v1${path}`, { headers })
    const body = await res.json()
    reads.push({ path: path.split('?')[0], status: res.status(), count: body.items?.length, asOfUtc: body.asOfUtc, academicProgress: body.academicProgress, academicProgressSource: body.academicProgressSource, gateCount: body.gates?.length, hasMore: body.hasMore, complete: body.complete, errorTitle: res.ok() ? undefined : body.title, errorDetail: res.ok() ? undefined : body.detail })
    if (path.includes('actions') || path.includes('queue') || path.includes('/calendar?')) expect(res.status()).toBe(200)
  }
  mkdirSync(root, { recursive: true }); writeFileSync(`${root}/staging-${actor.actor}.json`, JSON.stringify(evidence, null, 2))
  await page.goto('/calendar')
  await expect(page.getByRole('heading', { name: 'Lịch tổng hợp & điểm cần chú ý' })).toBeVisible()
  await expect(page.getByText('Dữ liệu tính đến:', { exact: false })).toBeVisible({ timeout: 20_000 })
  await page.screenshot({ path: `${root}/staging-${actor.actor}-calendar.png`, fullPage: true })
  if (actor.actor.startsWith('student')) {
    await page.goto('/project/timeline')
    await expect(page.getByRole('heading', { name: 'Tiến trình & Hồ sơ Thẩm định Đồ án' })).toBeVisible()
    await expect(page.getByText('Đang tải tiến trình Review Gates của nhóm...')).toHaveCount(0)
    evidence.nullLabelVisible = await page.getByText('Chưa áp dụng quy chế Cổng thẩm định', { exact: true }).isVisible()
    await page.screenshot({ path: `${root}/staging-${actor.actor}-timeline.png`, fullPage: true })
  }
  expect(mutations).toEqual([])
  evidence.businessMutations = mutations
  mkdirSync(root, { recursive: true }); writeFileSync(`${root}/staging-${actor.actor}.json`, JSON.stringify(evidence, null, 2))
})
