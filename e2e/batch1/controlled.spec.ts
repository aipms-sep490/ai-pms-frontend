import { expect, test, type Page } from '@playwright/test'
import { readFileSync, writeFileSync } from 'node:fs'

const root = process.env.BATCH1_EVIDENCE_DIR || 'F:/AI-PMS/artifacts/fe-batch1-20261022'
const longTitle = 'Đồ án liên ngành nghiên cứu hệ thống quản lý tiến trình thẩm định và phân tích dữ liệu học thuật có tên rất dài'
const template = { id: '1', code: 'TEST', name: longTitle, projectPeriodId: 1, mode: 'INTERDISCIPLINARY', major: 'Công nghệ thông tin, Marketing và Thiết kế', gatesCount: 4, status: 'DRAFT', version: '1', concurrencyToken: 'template-token', gates: [20, 20, 35, 25].map((weight, i) => ({ id: String(i + 1), code: `R${i + 1}`, title: `Đợt thẩm định ${i + 1} · ${longTitle}`, objective: longTitle, required: true, blockNextGate: false, start: null, end: null, reviewerPolicy: 'Assigned Reviewer', reviewScope: 'COMMON', requirements: [], weight })) }
const timeline = { projectId: '1', projectCode: 'P1', projectName: longTitle, projectMode: 'INTERDISCIPLINARY', major: 'Công nghệ thông tin', effectivePolicyVersion: '1', currentGateCode: 'R2', taskProgress: 75, academicProgress: 20, academicProgressSource: 'WEIGHTED_GATES', isDefenseReady: false, defenseReadinessStatus: 'NOT_READY', disciplineProgress: [{ scope: 'COMMON', name: 'Phần chung', progress: 20, weight: 40 }, { scope: 'MAJOR:1', name: 'Công nghệ thông tin', progress: null, weight: 60 }], gates: template.gates.map((g, i) => ({ gateInstanceId: g.id, code: g.code, title: g.title, objective: g.objective, status: i === 0 ? 'PASSED' : i === 1 ? 'IN_REVIEW' : 'PLANNED', reviewEligibility: 'READY', isRequired: true, windowStart: null, windowEnd: null, concurrencyToken: 'gate-token', blockingReasons: [], requirements: [], weight: g.weight })), capabilities: { canSubmitPackage: true, canSubmitRevision: true, blockingReasons: [] } }
const aggregator = { asOfUtc: '2026-10-22T00:00:00Z', projectId: 1, departmentId: 4, items: [{ kind: 'REVIEW_GATE', id: 1, projectId: 1, title: longTitle, status: 'IN_REVIEW', severity: 'HIGH', dueAt: null, deepLink: '/project/timeline' }, { kind: 'NEW_SERVER_KIND', id: 2, projectId: 1, title: 'Mục mới chưa có nhãn chuyên biệt', status: 'PENDING', severity: 'NORMAL', dueAt: null, deepLink: '//evil.invalid' }] }
async function fixtures(page: Page, mode = 'number') {
  const requests: string[] = []
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname
    requests.push(path)
    if (path.endsWith('/dashboards/student')) return route.fulfill({ json: { project: { id: 1, title: longTitle }, taskDeadlines: [], milestoneDeadlines: [] } })
    if (path.includes('/gate-templates')) return route.fulfill({ json: [template] })
    if (path.endsWith('/matrix')) return route.fulfill({ json: [] })
    if (path.endsWith('/timeline')) return route.fulfill({ json: mode === 'null' ? { ...timeline, academicProgress: null, academicProgressSource: 'NOT_CONFIGURED', gates: [] } : timeline })
    if (path.endsWith('/defense-readiness')) return route.fulfill({ json: { projectId: '1', projectName: longTitle, isReady: false, blockedCount: 1, conditions: [{ id: 'FINAL', title: 'Hồ sơ cuối kỳ chưa được khóa', satisfied: false, detail: 'Chờ hoàn tất hồ sơ', isMandatory: true }] } })
    if (/next-actions|triage-queue|urgent-actions/.test(path)) return route.fulfill({ json: aggregator })
    if (path.endsWith('/calendar')) return route.fulfill({ json: { items: [{ sourceType: 'MEETING', sourceId: 4, projectId: 1, title: longTitle, dueAt: '2026-10-22T09:00:00Z', status: 'SCHEDULED', deepLink: '/supervisor/projects/1/meetings/4' }], hasMore: false, complete: true } })
    if (path.endsWith('/evaluation-assignments/my')) return route.fulfill({ json: { items: [], totalCount: 0, page: 1, pageSize: 1, totalPages: 0 } })
    return route.fulfill({ status: 404, json: { detail: `Unexpected controlled request ${path}` } })
  })
  return requests
}
const views = ['builder', 'timeline-null', 'timeline-number', 'calendar-student', 'calendar-lecturer', 'calendar-department']
for (const width of [390, 768, 1280, 1440]) for (const view of views) test(`controlled responsive ${view} ${width}px`, async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
  const requests = await fixtures(page, view === 'timeline-null' ? 'null' : 'number')
  await page.setViewportSize({ width, height: 900 })
  const calendar = view.startsWith('calendar')
  await page.goto(`/e2e/batch1.html?view=${calendar ? 'calendar' : view === 'builder' ? 'builder' : 'timeline'}&actor=${view.split('-')[1] || 'student'}`)
  if (view === 'builder') {
    await expect(page.getByText('Đang tải dữ liệu tiến trình học vụ…')).toHaveCount(0)
    await page.getByRole('button', { name: 'Thiết kế Review Gates (Builder)' }).click()
    await expect(page.getByLabel('Trọng số học vụ của R1 (%)')).toHaveValue('20')
  } else if (calendar) {
    await expect(page.getByText('Dữ liệu tính đến:', { exact: false })).toBeVisible()
    expect(requests.filter(path => /next-actions|triage-queue|urgent-actions/.test(path))).toHaveLength(1)
    await expect(page.getByRole('link', { name: /Mục mới chưa có nhãn chuyên biệt/ })).toHaveCount(0)
  } else if (view === 'timeline-null') {
    await expect(page.getByText('Chưa áp dụng quy chế Cổng thẩm định')).toBeVisible()
    await expect(page.getByRole('progressbar', { name: 'Tiến độ học vụ' })).toHaveCount(0)
  } else await expect(page.getByRole('progressbar', { name: 'Tiến độ học vụ' })).toHaveAttribute('aria-valuenow', '20')
  expect(await page.evaluate(() => ({ innerWidth, width: document.documentElement.scrollWidth }))).toEqual({ innerWidth: width, width })
  if (width === 390) {
    await page.addScriptTag({ content: readFileSync(process.env.BATCH1_AXE_PATH!, 'utf8') })
    const audit = await page.evaluate(async () => (window as any).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } }))
    writeFileSync(`${root}/axe-${view}.json`, JSON.stringify(audit.violations, null, 2))
    expect(audit.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) }))).toEqual([])
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => document.activeElement !== document.body)).toBe(true)
    const focus = await page.evaluate(() => ({ tag: document.activeElement?.tagName, outline: document.activeElement ? getComputedStyle(document.activeElement).outlineStyle : '' }))
    expect(focus.outline).not.toBe('none')
  }
  if (width === 1440) {
    // Save rendered markup/styles for a separate native Chrome zoom inspection.
    writeFileSync(`${root}/native-zoom-${view}.html`, (await page.content()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ''))
    // CSS zoom exercises 200% reflow; native browser zoom remains a manual acceptance item.
    await page.evaluate(() => { document.documentElement.style.zoom = '2' })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.screenshot({ path: `${root}/controlled-${view}-${width}.png`, fullPage: true })
  expect(errors).toEqual([])
})

test('controlled keyboard: edit weights, reject 422/409, retain input and focus the form error', async ({ page }) => {
  await fixtures(page)
  await page.goto('/e2e/batch1.html?view=builder')
  await page.getByRole('button', { name: 'Thiết kế Review Gates (Builder)' }).click()
  const input = page.getByLabel('Trọng số học vụ của R1 (%)')
  await input.focus(); await page.keyboard.press('Control+A'); await page.keyboard.type('30')
  await expect(page.getByRole('button', { name: 'Lưu bản nháp' })).toBeDisabled()
  await page.keyboard.press('Control+A'); await page.keyboard.type('20')
  for (const status of [422, 409]) {
    await page.route('**/academic/gate-templates/1', route => route.fulfill({ status, json: { detail: 'Published templates are immutable; create a new version.', errors: { weights: ['Invalid weights'] } } }))
    await page.getByRole('button', { name: 'Lưu bản nháp' }).focus(); await page.keyboard.press('Enter')
    await expect(page.getByRole('alert')).toContainText(status === 422 ? 'Tổng hiện tại: 100%' : 'nhân bản')
    await expect(page.getByRole('alert')).toBeFocused()
    await expect(input).toHaveValue('20')
  }
})

for (const status of [401, 403, 404, 409, 422, 429, 500]) test(`controlled sources: ${status} keeps calendar and error distinct from empty`, async ({ page }) => {
  await fixtures(page)
  await page.route('**/supervisors/me/triage-queue', route => route.fulfill({ status, json: { detail: `HTTP ${status}` } }))
  await page.goto('/e2e/batch1.html?view=calendar&actor=lecturer')
  await expect(page.getByRole('heading', { name: 'Lịch của bạn' })).toBeVisible()
  await expect(page.getByText('Chưa tải được danh sách việc cần làm. Xem trạng thái nguồn và thử tải lại.')).toBeVisible()
  await expect(page.getByText(`HTTP ${status}`, { exact: true })).toBeVisible()
  await expect(page.getByText('Không có việc cần làm.', { exact: true })).toHaveCount(0)
})

test('controlled empty and filtered empty remain truthful', async ({ page }) => {
  await fixtures(page)
  await page.route('**/students/me/next-actions', route => route.fulfill({ json: { ...aggregator, items: [] } }))
  await page.route('**/calendar?*', route => route.fulfill({ json: { items: [{ sourceType: 'TASK', sourceId: 1, projectId: 1, title: 'Công việc đã hoàn tất', dueAt: '2026-10-22T09:00:00Z', status: 'DONE' }], hasMore: false, complete: true } }))
  await page.goto('/e2e/batch1.html?view=calendar&actor=student')
  await expect(page.getByText('Không có việc cần làm.', { exact: true })).toBeVisible()
  await expect(page.getByText('Không có sự kiện phù hợp bộ lọc hiện tại.')).toBeVisible()
  await page.getByLabel('Hiện hoàn tất').check()
  await expect(page.getByText('Công việc đã hoàn tất', { exact: true })).toBeVisible()
})
