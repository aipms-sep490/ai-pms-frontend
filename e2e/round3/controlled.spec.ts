import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test'
import type { StudentReviewTimelineDto } from '../../src/features/review-gates/types/review-gates.types'

const title = 'Đồ án tích hợp đợt ba với tên tiếng Việt dài để kiểm chứng bố cục không tràn và thao tác vẫn đọc được'
const externalReviewUrl = `https://example.test/evidence/${'thiet-ke-va-ma-nguon-'.repeat(7)}review`
const makeTimeline = (): StudentReviewTimelineDto => ({
  projectId: '40006', projectCode: 'P1', projectName: title, projectMode: 'SINGLE_MAJOR', major: 'Kỹ thuật phần mềm',
  effectivePolicyVersion: '1', currentGateCode: 'R1', academicProgress: null, academicProgressSource: 'NOT_CONFIGURED',
  taskProgress: 0, gates: ['R1', 'R2'].map((code, index) => ({
    gateInstanceId: String(index + 4), code, title: `Thẩm định ${code}`, objective: 'Kiểm chứng minh chứng theo hợp đồng đã công bố',
    status: 'PLANNED', reviewEligibility: 'READY', isRequired: true, windowStart: null, windowEnd: null,
    concurrencyToken: 'controlled-gate-version', blockingReasons: [], requirements: index ? [] : [{
      id: '21', code: 'SOURCE', title: 'Liên kết kho mã nguồn minh chứng thiết kế và triển khai', type: 'EXTERNAL_LINK',
      scope: 'COMMON', isMandatory: true, verificationStatus: 'PENDING', latestArtifact: null,
    }],
  })), supervisorFeedbacks: [], capabilities: { canSubmitPackage: true, canSubmitRevision: true, blockingReasons: [] },
})

async function fixture(page: Page, options: { dashboardError?: boolean; actionsError?: boolean; truncated?: boolean; feedbackForbidden?: boolean } = {}) {
  let timeline = makeTimeline()
  let failing = Boolean(options.actionsError)
  let forbidden = Boolean(options.feedbackForbidden)
  let releaseFeedback: (() => void) | null = null
  let holdFeedback = false
  const calls: Array<{ path: string; method: string; body?: unknown }> = []
  const unexpected: string[] = []
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error' && !message.text().includes('Failed to load resource')) errors.push(message.text()) })
  await page.route('**/*', async route => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.origin !== 'http://127.0.0.1:5199') { unexpected.push(url.origin); return route.abort() }
    if (!url.pathname.startsWith('/api/')) return route.continue()
    const path = url.pathname
    const method = request.method()
    const body = method === 'POST' ? request.postDataJSON() as Record<string, unknown> : undefined
    calls.push({ path, method, body })
    const json = (value: unknown) => route.fulfill({ json: value })
    if (path.endsWith('/gate-assignments')) return json({ items: [{
      id: '31', projectId: '40006', projectCode: 'P1', projectName: 'Đồ án P1', gateCode: 'R1', gateTitle: 'Thẩm định R1',
      scope: 'COMMON', dueAt: '2026-10-30', status: 'PENDING_REVIEW', concurrencyToken: 'controlled-review-version',
      requirements: [{ ...timeline.gates[0].requirements[0], title: 'Kho mã nguồn', verificationStatus: 'SUBMITTED', latestArtifact: {
        version: 1, filename: externalReviewUrl, linkUrl: externalReviewUrl, submittedAt: '2026-10-22', submittedBy: 'Sinh viên P1',
        contentType: 'text/uri-list', sizeBytes: 0, sha256: '', notes: 'Minh chứng liên kết ngoài, phiên bản đầu.',
      } }],
    }], page: 1, pageSize: 20, totalCount: 1, totalPages: 1 })
    if (path.endsWith('/feedback') && method === 'POST') {
      if (forbidden) return route.fulfill({ status: 403, json: { detail: 'Bạn không phải GVHD được phân công.' } })
      if (holdFeedback) await new Promise<void>(resolve => { releaseFeedback = resolve })
      timeline = { ...timeline, supervisorFeedbacks: [...(timeline.supervisorFeedbacks ?? []), {
        gateCode: 'R1', feedback: String(body?.feedback), submittedAt: '2026-10-22T08:00:00Z', supervisorName: 'GVHD kiểm chứng',
      }] }
      return json({})
    }
    if (path.endsWith('/evidence') && method === 'POST') {
      const req = timeline.gates[0].requirements[0]
      timeline = { ...timeline, gates: timeline.gates.map((gate, index) => index ? gate : { ...gate, requirements: [{
        ...req, verificationStatus: 'SUBMITTED', latestArtifact: { version: 1, filename: String(body?.linkUrl),
          linkUrl: String(body?.linkUrl), submittedAt: '2026-10-22T08:00:00Z', submittedBy: 'SV kiểm chứng',
          contentType: 'text/uri-list', sizeBytes: 0, sha256: '', notes: String(body?.notes),
        },
      }] }) }
      return json(timeline)
    }
    if (path.endsWith('/timeline')) return json(timeline)
    if (path.endsWith('/defense-readiness')) return json({ projectId: '40008', projectName: title, isReady: false, blockedCount: 0, conditions: [] })
    if (path.endsWith('/gate-templates')) return json([])
    if (path.endsWith('/matrix')) return json([{
      projectId: '40008', projectName: title, mode: 'INTERDISCIPLINARY', major: 'Liên ngành', dept: 'IT', taskProgress: 0, hasTasks: false,
      gateStatuses: { R1: 'REVISION_REQUIRED', R2: 'LOCKED' }, blockingReasons: { R1: ['Cần bổ sung minh chứng thiết kế.'], R2: ['Chờ kết luận cổng R1.'] },
      hybridScopes: { COMMON: 'IN_REVIEW', '12': 'REVISION_REQUIRED', '13': 'IN_REVIEW' },
      hybridScopeLabels: { COMMON: 'Phần tích hợp chung', '12': 'Kỹ thuật phần mềm', '13': 'Thiết kế đồ họa' },
    }])
    if (path.endsWith('/calendar')) return json({ items: [], complete: true, hasMore: false })
    if (path.endsWith('/dashboards/student')) return options.dashboardError
      ? route.fulfill({ status: 500, json: { detail: 'Dashboard tạm lỗi' } })
      : json({ project: { id: 40006, title }, taskDeadlines: [], milestoneDeadlines: [{ id: 99, title: 'Mốc quá hạn duy nhất', status: 'OPEN', isOverdue: true, dueDate: '2026-10-01' }] })
    if (/next-actions|triage-queue|urgent-actions/.test(path)) {
      if (failing) return route.fulfill({ status: 500, json: { detail: 'Nguồn công việc tạm lỗi' } })
      const items = [{ kind: 'MILESTONE', id: 99, projectId: 40006, title: 'Mốc quá hạn duy nhất', status: 'OVERDUE', severity: 'HIGH', dueAt: '2026-10-01', deepLink: '/project/milestones/99' }]
      if (options.truncated) items.push({ ...items[0], kind: 'TASK', id: 100, title: 'Công việc thông thường đang mở', severity: 'NORMAL', deepLink: '/project/tasks/100' })
      return json({ projectId: 40006, departmentId: 4, asOfUtc: '2026-10-22T08:00:00Z', items, totalCount: options.truncated ? 20 : 1, hasMore: Boolean(options.truncated) })
    }
    unexpected.push(`${method} ${path}`)
    return route.fulfill({ status: 404, json: { detail: `Unexpected controlled request ${path}` } })
  })
  return { calls, errors, unexpected, recover: () => { failing = false }, allowFeedback: () => { forbidden = false },
    holdFeedback: () => { holdFeedback = true }, releaseFeedback: () => { releaseFeedback?.() }, getTimeline: () => timeline }
}

async function screenshot(page: Page, info: TestInfo, name: string) {
  await page.screenshot({ path: info.outputPath(`${name}.png`), fullPage: true })
}
async function noOverflow(page: Page) {
  const layout = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth,
    overflowing: [...document.querySelectorAll('main *')].filter(node => node.getBoundingClientRect().right > innerWidth + 1)
      .slice(0, 12).map(node => ({ tag: node.tagName, class: node.className, right: node.getBoundingClientRect().right })),
  }))
  expect(layout.scroll, JSON.stringify(layout)).toBeLessThanOrEqual(layout.width)
  await test.info().attach('layout-overflow-measurement', { body: JSON.stringify(layout, null, 2), contentType: 'application/json' })
}
async function touchTarget(locator: Locator) {
  await expect.poll(async () => (await locator.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44)
  await expect.poll(async () => (await locator.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(44)
}
async function liveMode(page: Page) {
  expect(await page.evaluate(async () => {
    const path = '/src/app/config/env.ts'
    const module = await import(path)
    return module.env.reviewGatesMockEnabled
  })).toBe(false)
}

for (const dashboardError of [false, true]) test(`R3-01 single milestone; dashboard error=${dashboardError} keeps authoritative attention count`, async ({ page }, info) => {
  const state = await fixture(page, { dashboardError })
  await page.goto('/e2e/batch1.html?view=calendar')
  const panel = page.getByRole('complementary')
  await expect(panel.getByText('Mốc quá hạn duy nhất', { exact: true })).toHaveCount(1)
  await expect(panel.getByText('Mốc đồ án', { exact: true })).toBeVisible()
  await expect(panel.getByRole('status', { name: '1 điểm cần chú ý' })).toHaveAttribute('aria-atomic', 'true')
  await expect(panel.getByText(/Mục cần chú ý \(MILESTONE\)/)).toHaveCount(0)
  await expect(panel.getByRole('button', { name: 'Tải lại danh sách' })).toHaveCount(0)
  await liveMode(page)
  await screenshot(page, info, 'single-milestone')
  expect(state.errors).toEqual([]); expect(state.unexpected).toEqual([])
})

test('R3-04 reviewer metadata preserves external-link identity at 390px', async ({ page }, info) => {
  const state = await fixture(page)
  expect(externalReviewUrl.length).toBeLessThan(255)
  await page.setViewportSize({ width: 390, height: 900 })
  await page.goto('/e2e/batch1.html?view=reviewer&actor=lecturer')
  await liveMode(page)
  const external = page.getByRole('link', { name: new RegExp('https://example\\.test/evidence/') })
  await expect(external).toHaveAttribute('href', externalReviewUrl)
  await expect(external).toHaveAttribute('rel', 'noopener noreferrer')
  await expect(page.getByRole('button', { name: /Tải tệp/ })).toHaveCount(0)
  await page.getByTitle('Xem chi tiết siêu dữ liệu phiên bản minh chứng').click()
  const preview = page.getByRole('dialog', { name: 'Chi tiết siêu dữ liệu minh chứng' })
  await expect(preview.getByText('Liên kết ngoài:', { exact: true })).toBeVisible()
  await expect(preview.getByText('Minh chứng dạng liên kết:', { exact: true })).toBeVisible()
  await expect(preview.getByText(/Minh chứng được mở ngoài hệ thống/)).toBeVisible()
  await expect(preview.getByText('Tên tệp:', { exact: true })).toHaveCount(0)
  await expect(preview.getByText('Chế độ bảo mật lưu trữ:', { exact: true })).toHaveCount(0)
  await expect(preview.getByText(/0 byte|sha256/i)).toHaveCount(0)
  const label = preview.locator('span[title]').filter({ hasText: 'example.test/evidence/' })
  await expect(label).toHaveAttribute('title', externalReviewUrl)
  expect((await label.innerText()).length).toBeLessThan(externalReviewUrl.length)
  await noOverflow(page)
  await screenshot(page, info, 'reviewer-external-metadata-390')
  expect(state.calls.filter(call => call.path.endsWith('/download'))).toEqual([])
  expect(state.calls.filter(call => call.method === 'POST')).toEqual([])
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([])
})

test('200% rendered CSS zoom at physical 1440x900 across real calendar, timeline, submission and hybrid pages', async ({ page }, info) => {
  const state = await fixture(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.zoom = '2' }))
  const checkZoomLayout = async () => {
    const layout = await page.evaluate(() => ({ zoom: getComputedStyle(document.documentElement).zoom,
      viewport: innerWidth, client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth,
      mainRight: document.querySelector('main')!.getBoundingClientRect().right,
    }))
    expect(layout.zoom).toBe('2')
    expect(layout.mainRight).toBeLessThanOrEqual(layout.viewport)
    expect(layout.scroll).toBeLessThanOrEqual(layout.client)
    await test.info().attach('rendered-css-zoom-layout', { body: JSON.stringify(layout, null, 2), contentType: 'application/json' })
  }
  await page.goto('/e2e/batch1.html?view=calendar')
  await expect(page.getByRole('complementary').getByText('Mốc quá hạn duy nhất', { exact: true })).toBeVisible()
  await checkZoomLayout(); await screenshot(page, info, 'calendar-css-zoom-200')
  await page.goto('/e2e/batch1.html?view=timeline')
  const open = page.getByRole('button', { name: 'Nộp tài liệu' })
  await expect(open).toBeVisible()
  await checkZoomLayout(); await screenshot(page, info, 'timeline-css-zoom-200')
  await open.click()
  const modal = page.getByRole('dialog')
  await modal.getByRole('textbox', { name: /Liên kết minh chứng/ }).fill('https://example.test/review')
  await modal.getByRole('textbox', { name: /Giải trình/ }).fill(title)
  const submit = modal.getByRole('button', { name: 'Nộp minh chứng', exact: true })
  await submit.scrollIntoViewIfNeeded()
  await modal.locator('.app-modal__body').hover()
  await page.mouse.wheel(0, 1000)
  await info.attach('css-zoom-modal-measurements', { contentType: 'application/json', body: JSON.stringify(await modal.evaluate(node => {
    const body = node.querySelector('.app-modal__body')!
    const button = body.querySelector('button[type="submit"]')!
    return { viewport: { width: innerWidth, height: innerHeight }, dialog: node.getBoundingClientRect().toJSON(),
      body: body.getBoundingClientRect().toJSON(), bodyScrollHeight: body.scrollHeight, bodyClientHeight: body.clientHeight,
      button: button.getBoundingClientRect().toJSON(), maxHeight: getComputedStyle(node).maxHeight }
  }), null, 2) })
  await expect(submit).toBeInViewport({ ratio: 1 })
  await expect.poll(async () => (await submit.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(88)
  await checkZoomLayout(); await screenshot(page, info, 'submission-css-zoom-200')
  await modal.getByRole('button', { name: 'Hủy', exact: true }).click()
  await page.goto('/e2e/batch1.html?view=builder&actor=department')
  await page.getByRole('button', { name: /Gate Liên ngành/ }).click()
  await expect(page.getByText('Kỹ thuật phần mềm', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Thiết kế đồ họa', { exact: true }).first()).toBeVisible()
  await expect(page.locator('table select:not([disabled])')).toHaveCount(0)
  await checkZoomLayout(); await screenshot(page, info, 'hybrid-css-zoom-200')
  expect(state.calls.filter(call => call.method === 'POST')).toEqual([])
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([])
})

test('R3-02 reports N received including HIGH and NORMAL against backend total', async ({ page }, info) => {
  const state = await fixture(page, { truncated: true })
  await page.goto('/e2e/batch1.html?view=calendar')
  const panel = page.getByRole('complementary')
  await expect(panel.getByText('Hiển thị 2 trong tổng số 20 việc.', { exact: true })).toBeVisible()
  await expect(panel.getByText('Còn 1 việc đang mở không thuộc nhóm ưu tiên cao.', { exact: true })).toBeVisible()
  await expect(panel.getByText('Mốc quá hạn duy nhất', { exact: true })).toHaveCount(1)
  await expect(panel.getByRole('status', { name: 'Chưa xác định số việc cần làm' })).toBeVisible()
  await screenshot(page, info, 'truncation')
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([])
})

test('R3-03 absent department scope uses source message once and provides no attention retry', async ({ page }, info) => {
  const state = await fixture(page)
  await page.goto('/e2e/batch1.html?view=calendar&actor=department&departments=none')
  const panel = page.getByRole('complementary')
  await expect(panel.getByText('Chưa xác định được bộ môn từ phiên đăng nhập. Không truy vấn phạm vi khác.', { exact: true })).toHaveCount(1)
  await expect(panel.getByRole('button', { name: 'Tải lại danh sách' })).toHaveCount(0)
  await expect(panel.getByRole('alert')).toHaveCount(0)
  expect(state.calls).toEqual([])
  await screenshot(page, info, 'staff-no-scope')
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([])
})

test('R3-03 an actual error is announced and retry recovers the count', async ({ page }, info) => {
  const state = await fixture(page, { actionsError: true })
  await page.goto('/e2e/batch1.html?view=calendar')
  const panel = page.getByRole('complementary')
  await expect(panel.getByRole('alert')).toContainText('Nguồn công việc tạm lỗi')
  const retry = panel.getByRole('button', { name: 'Tải lại danh sách' })
  await touchTarget(retry)
  await screenshot(page, info, 'attention-error')
  state.recover()
  await retry.click()
  await expect(panel.getByRole('status', { name: '1 điểm cần chú ý' })).toBeVisible()
  await expect(panel.getByRole('alert')).toHaveCount(0)
  expect(state.calls.filter(call => call.path.endsWith('/next-actions'))).toHaveLength(2)
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([])
})

test('R3-04 HTTPS evidence JSON submission and persisted controlled HTTP readback', async ({ page }, info) => {
  const state = await fixture(page)
  await page.goto('/e2e/batch1.html?view=timeline')
  await liveMode(page)
  const open = page.getByRole('button', { name: 'Nộp tài liệu' })
  await touchTarget(open)
  await open.focus(); await page.keyboard.press('Enter')
  const modal = page.getByRole('dialog')
  await expect(modal).toBeVisible()
  await expect(modal).toContainText('Liên kết ngoài')
  await touchTarget(modal.getByRole('button', { name: 'Đóng hộp thoại' }))
  await touchTarget(modal.getByRole('button', { name: 'Hủy', exact: true }))
  const url = modal.getByRole('textbox', { name: /Liên kết minh chứng/ })
  const notes = modal.getByRole('textbox', { name: /Giải trình/ })
  await notes.fill('Giải trình giữ nguyên sau validation')
  const submit = modal.getByRole('button', { name: 'Nộp minh chứng', exact: true })
  await touchTarget(submit)
  await url.fill('http://example.test/review'); await submit.click()
  await expect(modal.getByRole('alert')).toContainText('HTTPS')
  await expect(notes).toHaveValue('Giải trình giữ nguyên sau validation')
  expect(state.calls.filter(call => call.method === 'POST')).toHaveLength(0)
  await url.fill('https://example.test/review'); await submit.click()
  await expect(modal).toHaveCount(0)
  const link = page.getByRole('link', { name: /https:\/\/example\.test\/review/ })
  await expect(link).toHaveAttribute('href', 'https://example.test/review')
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  await expect(page.getByRole('button', { name: /Tải tệp/ })).toHaveCount(0)
  await expect(page.getByText(/0 byte|sha256/i)).toHaveCount(0)
  const writes = state.calls.filter(call => call.method === 'POST')
  expect(writes).toEqual([{ path: '/api/v1/projects/40006/review-gates/R1/evidence', method: 'POST', body: {
    requirementId: '21', artifactName: 'https://example.test/review', linkUrl: 'https://example.test/review',
    notes: 'Giải trình giữ nguyên sau validation', expectedVersion: 0, concurrencyToken: 'controlled-gate-version',
  } }])
  await page.reload()
  await expect(link).toBeVisible()
  await screenshot(page, info, 'external-evidence-readback')
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([])
})

test('R3-05 supervisor 403 retains draft; acknowledged advice refreshes correct gate without a gate decision', async ({ page }, info) => {
  const state = await fixture(page, { feedbackForbidden: true })
  await page.goto('/e2e/batch1.html?view=timeline&actor=lecturer')
  const field = page.getByRole('textbox', { name: /Nhận xét hướng dẫn/ })
  await field.fill('Nhận xét tư vấn chỉ cho R1')
  await page.getByRole('button', { name: 'Gửi nhận xét hướng dẫn' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(field).toHaveValue('Nhận xét tư vấn chỉ cho R1')
  state.allowFeedback(); state.holdFeedback()
  const send = page.getByRole('button', { name: 'Gửi nhận xét hướng dẫn' })
  await touchTarget(send); await send.click()
  await expect(page.getByRole('button', { name: 'Đang gửi...' })).toBeDisabled()
  await expect(page.getByText(/Đã gửi nhận xét hướng dẫn.*thành công/)).toHaveCount(0)
  await expect.poll(() => state.calls.filter(call => call.method === 'POST').length).toBe(2)
  state.releaseFeedback()
  await expect(page.getByText('Nhận xét tư vấn chỉ cho R1', { exact: true })).toBeVisible()
  expect(state.getTimeline().gates.map(gate => gate.status)).toEqual(['PLANNED', 'PLANNED'])
  expect(state.calls.filter(call => call.method === 'POST').map(call => call.body)).toEqual([
    { feedback: 'Nhận xét tư vấn chỉ cho R1' }, { feedback: 'Nhận xét tư vấn chỉ cho R1' },
  ])
  await screenshot(page, info, 'supervisor-feedback-readback')
  await page.getByRole('button', { name: /R2.*Thẩm định R2/ }).click()
  await expect(page.getByText('Nhận xét tư vấn chỉ cho R1', { exact: true })).toHaveCount(0)
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([])
})

for (const width of [390, 768, 1280, 1440, 720]) test(`R3-06..08 real governance pages at ${width}px${width === 720 ? ' (1440x900 at 200% equivalent layout viewport 720x450)' : ''}`, async ({ page }, info) => {
  const state = await fixture(page)
  await page.setViewportSize({ width, height: width === 720 ? 450 : 900 })
  await page.goto('/e2e/batch1.html?view=calendar')
  await expect(page.getByRole('complementary').getByText('Mốc quá hạn duy nhất', { exact: true })).toBeVisible()
  await noOverflow(page)
  await screenshot(page, info, 'calendar-responsive')
  await page.goto('/e2e/batch1.html?view=timeline')
  const openEvidence = page.getByRole('button', { name: 'Nộp tài liệu' })
  await expect(openEvidence).toBeVisible()
  await touchTarget(openEvidence)
  await expect(page.getByText('Trạng thái: PLANNED', { exact: true })).toHaveCount(0)
  await noOverflow(page)
  await screenshot(page, info, 'timeline-responsive')
  await openEvidence.focus(); await page.keyboard.press('Enter')
  const modal = page.getByRole('dialog')
  await expect(modal).toBeVisible()
  await modal.getByRole('textbox', { name: /Liên kết minh chứng/ }).fill('https://example.test/review')
  await modal.getByRole('textbox', { name: /Giải trình/ }).fill(title)
  await touchTarget(modal.getByRole('button', { name: 'Nộp minh chứng', exact: true }))
  await touchTarget(modal.getByRole('button', { name: 'Hủy', exact: true }))
  const cancelBox = await modal.getByRole('button', { name: 'Hủy', exact: true }).boundingBox()
  const submitBox = await modal.getByRole('button', { name: 'Nộp minh chứng', exact: true }).boundingBox()
  expect(submitBox!.x - (cancelBox!.x + cancelBox!.width)).toBeGreaterThanOrEqual(8)
  await noOverflow(page)
  await page.keyboard.press('Tab')
  expect(await modal.evaluate(node => node.contains(document.activeElement))).toBe(true)
  await screenshot(page, info, 'submission-responsive')
  await page.keyboard.press('Escape')
  await expect(modal).toHaveCount(0)
  await expect(openEvidence).toBeFocused()
  await page.goto('/e2e/batch1.html?view=builder&actor=department')
  await liveMode(page)
  await page.getByRole('button', { name: /Ma trận Giám sát/ }).click()
  await expect(page.getByText('Chưa có công việc', { exact: true })).toBeVisible()
  const row = page.getByRole('row').filter({ hasText: title })
  await expect(row.getByText('0%', { exact: true })).toHaveCount(0)
  await expect(row.getByRole('progressbar')).toHaveCount(0)
  await noOverflow(page)
  await row.click()
  const drawer = page.getByRole('dialog')
  await expect(drawer.getByText('Cần bổ sung minh chứng thiết kế.', { exact: true })).toBeVisible()
  await expect(drawer.getByText('Chờ kết luận cổng R1.', { exact: true })).toBeVisible()
  await expect(drawer.getByRole('button', { name: 'Cập nhật quyết định Reviewer' })).toHaveCount(0)
  await screenshot(page, info, 'matrix-blockers')
  await drawer.getByRole('button', { name: /Mở bảng kiểm duyệt liên ngành/ }).click()
  await expect(page.getByText('Kỹ thuật phần mềm', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Thiết kế đồ họa', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Chuyên ngành 12', { exact: true })).toHaveCount(0)
  await expect(page.getByText('READY FOR PASS', { exact: true })).toHaveCount(0)
  await expect(page.locator('table select:not([disabled])')).toHaveCount(0)
  await noOverflow(page)
  await screenshot(page, info, 'hybrid-backend-labels')
  expect(state.calls.filter(call => call.method === 'POST')).toEqual([])
  expect(state.unexpected).toEqual([]); expect(state.errors).toEqual([])
})
