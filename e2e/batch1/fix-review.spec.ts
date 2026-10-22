import { expect, test, type Page } from '@playwright/test'

const root = process.env.BATCH1_EVIDENCE_DIR || 'F:/AI-PMS/artifacts/fe-fix-batch1-20261022'
const milestone = { id: 12, title: 'Mốc đồ án quá hạn', status: 'OPEN', dueDate: '2026-10-01', isOverdue: true }
const task = { id: 11, title: 'Task quá hạn duy nhất', status: 'TODO', dueAtUtc: '2026-10-01T08:00:00Z', isOverdue: true }
const timeline = { projectId: '1', projectCode: 'P1', projectName: 'Đồ án kiểm chứng bố cục KPI', projectMode: 'SINGLE_MAJOR', major: 'Công nghệ thông tin', effectivePolicyVersion: '1', currentGateCode: '', academicProgress: null, academicProgressSource: 'NOT_CONFIGURED', taskProgress: 75, isDefenseReady: false, gates: [], capabilities: { canSubmitPackage: false, canSubmitRevision: false, blockingReasons: [] } }

async function fixture(page: Page, options: { calendarFails?: boolean; normalOnly?: boolean; failedDepartment?: boolean } = {}) {
  const reads: string[] = []
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname
    reads.push(path)
    const json = (body: unknown) => route.fulfill({ json: body })
    if (path.endsWith('/timeline')) return json(timeline)
    if (path.endsWith('/defense-readiness')) return json({ projectId: '1', projectName: timeline.projectName, isReady: false, blockedCount: 0, conditions: [] })
    if (path.endsWith('/evaluation-assignments/my')) return json({ items: [], totalCount: 0, page: 1, pageSize: 20, totalPages: 0 })
    if (path.endsWith('/dashboards/student')) return json({ project: { id: 1, title: 'Đồ án dự phòng' }, taskDeadlines: [task], milestoneDeadlines: options.normalOnly ? [] : [milestone] })
    if (path.endsWith('/calendar')) return options.calendarFails ? route.fulfill({ status: 500, json: { detail: 'Lịch chính tạm lỗi' } }) : json({ items: [], complete: true, hasMore: false })
    if (/next-actions|triage-queue|urgent-actions/.test(path)) {
      const departmentId = Number(path.match(/departments\/(\d+)/)?.[1])
      if (options.failedDepartment && departmentId === 2) return route.fulfill({ status: 403, json: { detail: 'Bộ môn 2 không tải được' } })
      return json({ asOfUtc: '2026-10-22T08:00:00Z', departmentId, items: [{ kind: 'TASK', id: departmentId || 11, projectId: departmentId || 1, title: departmentId ? `Việc của bộ môn ${departmentId}` : task.title, status: 'TODO', severity: options.normalOnly ? 'NORMAL' : 'HIGH', dueAt: task.dueAtUtc, deepLink: '/project/tasks/11' }] })
    }
    if (path.endsWith('/meetings')) return json({ items: [{ id: 21, projectId: 1, title: 'Cuộc họp dự phòng', status: 'SCHEDULED', startAt: '2026-10-25T08:00:00Z' }], totalCount: 1 })
    if (path.endsWith('/deliverables')) return json({ items: [{ id: 22, projectId: 1, title: 'Hạng mục dự phòng', status: 'OPEN', dueAt: '2026-10-26' }], totalCount: 1 })
    if (path.endsWith('/final-submission/checklist')) return json({ deadline: '2026-10-27' })
    return route.fulfill({ status: 404, json: { detail: `Unexpected fixture request: ${path}` } })
  })
  return reads
}

for (const width of [390, 768, 1280, 1440]) test(`FIX-06/07: unconfigured KPI has readable text and aligned cards at ${width}px`, async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
  await fixture(page)
  await page.setViewportSize({ width, height: 900 })
  await page.goto('/e2e/batch1.html?view=timeline')
  const value = page.getByText('Chưa áp dụng quy chế Cổng thẩm định', { exact: true })
  await expect(value).toBeVisible()
  await expect(page.getByText('Chưa cấu hình trọng số Cổng thẩm định.', { exact: true })).toBeVisible()
  await expect(page.getByText(/NOT_CONFIGURED/)).toHaveCount(0)
  await expect(page.getByRole('progressbar', { name: 'Tiến độ học vụ' })).toHaveCount(0)
  expect(await value.evaluate(node => getComputedStyle(node).fontSize)).toBe('16px')
  const boxes = await page.getByText('Tiến độ thực hiện học vụ', { exact: true }).locator('..').locator('..').evaluate(grid => [...grid.children].map(card => {
    const box = card.getBoundingClientRect()
    return { y: box.y, height: box.height, overflow: card.scrollWidth > card.clientWidth || card.scrollHeight > card.clientHeight }
  }))
  expect(boxes).toHaveLength(4)
  for (const box of boxes) {
    expect(box.overflow).toBe(false)
    for (const peer of boxes.filter(peer => peer.y === box.y)) expect(peer.height).toBe(box.height)
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: `${root}/fix07-kpi-null-${width}.png`, fullPage: true })
  expect(errors).toEqual([])
})

test('FIX-01/02/04: fallback preserves real resources, milestones and source disclosures', async ({ page }) => {
  const reads = await fixture(page, { calendarFails: true })
  await page.goto('/e2e/batch1.html?view=calendar')
  await expect(page.getByRole('link', { name: /Cuộc họp dự phòng/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Hạng mục dự phòng/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Hạn bàn giao cuối/ })).toBeVisible()
  const panel = page.getByRole('complementary')
  await expect(panel.getByText(milestone.title, { exact: true })).toHaveCount(1)
  await expect(panel.getByText(task.title, { exact: true })).toHaveCount(1)
  await expect(page.getByText('Lịch chính tạm lỗi', { exact: true })).toBeVisible()
  await expect(page.getByText('API hiện trả kỳ báo cáo, không trả hạn nộp báo cáo.')).toBeVisible()
  expect(reads.filter(path => path.endsWith('/next-actions'))).toHaveLength(1)
  await page.screenshot({ path: `${root}/fix02-calendar-fallback.png`, fullPage: true })
})

test('FIX-03: normal tasks are disclosed outside urgent attention and healthy calendar skips fallback', async ({ page }) => {
  const reads = await fixture(page, { normalOnly: true })
  await page.goto('/e2e/batch1.html?view=calendar')
  await expect(page.getByText('Còn 1 việc đang mở không thuộc nhóm ưu tiên cao.')).toBeVisible()
  await expect(page.getByText('Không có điểm cần chú ý ưu tiên cao.')).toBeVisible()
  await expect(page.getByRole('complementary').getByText(task.title)).toHaveCount(0)
  expect(reads.filter(path => /\/meetings$|\/deliverables$|\/final-submission\/checklist$/.test(path))).toEqual([])
})

for (const failedDepartment of [false, true]) test(`FIX-05: authorized departments load independently; one failed = ${failedDepartment}`, async ({ page }) => {
  const reads = await fixture(page, { failedDepartment })
  await page.goto('/e2e/batch1.html?view=calendar&actor=department&departments=multiple')
  await expect(page.getByText('Việc của bộ môn 1', { exact: true })).toBeVisible()
  if (failedDepartment) await expect(page.getByText('Bộ môn 2 không tải được', { exact: true })).toBeVisible()
  else await expect(page.getByText('Việc của bộ môn 2', { exact: true })).toBeVisible()
  expect(reads.filter(path => path.endsWith('/urgent-actions')).sort()).toEqual(['/api/v1/departments/1/urgent-actions', '/api/v1/departments/2/urgent-actions'])
})

test('FIX-04: lecturer is told evaluation deadlines are unsupported', async ({ page }) => {
  await fixture(page)
  await page.goto('/e2e/batch1.html?view=calendar&actor=lecturer')
  await expect(page.getByText('DTO hiện không có hạn đánh giá; không tạo sự kiện lịch.')).toBeVisible()
})
