import { expect, test, type Page } from '@playwright/test'

const artifact = { version: 1, filename: 'report.pdf', submittedAt: '2026-10-20', submittedBy: '1', downloadUrl: '/api/v1/projects/1/review-gates/R1/requirements/21/evidence/1/download', sha256: 'fixture-hash', sizeBytes: 24 }
const requirement = { id: '21', code: 'DOC', title: 'Report', type: 'DOCUMENT', scope: 'COMMON', isMandatory: true, verificationStatus: 'REJECTED', latestArtifact: artifact }
const gate = { gateInstanceId: '11', code: 'R1', title: 'Review', objective: '', status: 'REVISION_REQUIRED', reviewEligibility: 'BLOCKED', isRequired: true, windowStart: null, windowEnd: null, concurrencyToken: 'gate-token', blockingReasons: [], requirements: [requirement] }
const timeline = { projectId: '1', projectCode: 'P1', projectName: 'Controlled contract project', projectMode: 'SINGLE_MAJOR', major: 'Engineering', effectivePolicyVersion: '1', currentGateCode: 'R1', gates: [gate], capabilities: { canSubmitPackage: false, canSubmitRevision: true, blockingReasons: [] } }
const assignment = { id: '31', projectId: '1', projectCode: 'P1', projectName: 'Controlled contract project', gateCode: 'R1', gateTitle: 'Review', scope: 'COMMON', dueAt: null, status: 'PENDING_REVIEW', requirements: [requirement], concurrencyToken: 'assignment-token' }

async function login(page: Page, view = 'student') {
  await page.goto(`/e2e/review-gates.html?view=${view}`)
  await page.getByLabel('Email', { exact: true }).fill('controlled@example.test')
  await page.getByLabel('Mật khẩu', { exact: true }).fill('controlled-fixture')
  await page.getByRole('button', { name: 'Đăng nhập acceptance' }).click()
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/auth/login')) return route.fulfill({ json: { accessToken: 'controlled-token', user: { id: 1, email: 'controlled@example.test', fullName: 'Student', roles: ['STUDENT'] } } })
    if (path.endsWith('/timeline')) return route.fulfill({ json: timeline })
    if (path.endsWith('/defense-readiness')) return route.fulfill({ json: { projectId: '1', projectName: timeline.projectName, isReady: false, blockedCount: 1, conditions: [{ id: 'PACKAGE', title: 'Locked package', satisfied: false, detail: 'Not locked', isMandatory: true }] } })
    if (path.endsWith('/gate-assignments')) return route.fulfill({ json: { items: [assignment], page: 1, pageSize: 20, totalCount: 1, totalPages: 1 } })
    return route.fulfill({ status: 404, json: { detail: `Unexpected controlled route: ${path}` } })
  })
})

test('controlled HTTP: STUDENT leader uploads bytes, sends gate token and submits for review', async ({ page }) => {
  const requests: string[] = []
  await page.route('**/evidence/file', async route => {
    expect(route.request().headers()['authorization']).toBe('Bearer controlled-token')
    expect(route.request().headers()['content-type']).toContain('multipart/form-data; boundary=')
    const bytes = route.request().postDataBuffer()!.toString()
    expect(bytes).toContain('%PDF-1.4 actual acceptance bytes')
    expect(bytes).toContain('gate-token')
    requests.push('upload')
    await route.fulfill({ json: { ...timeline, gates: [{ ...gate, status: 'IN_REVIEW', reviewEligibility: 'READY', concurrencyToken: 'updated-token', requirements: [{ ...requirement, verificationStatus: 'SUBMITTED', latestArtifact: { ...artifact, version: 2 } }] }], capabilities: { ...timeline.capabilities, canSubmitPackage: true } } })
  })
  await page.route('**/submit-for-review', async route => {
    expect(route.request().postDataJSON()).toEqual({ concurrencyToken: 'updated-token' })
    requests.push('submit-for-review')
    await route.fulfill({ json: timeline })
  })
  await login(page)
  await page.getByRole('button', { name: 'Nộp bản sửa', exact: true }).click()
  await expect(page.getByRole('button', { name: /Liên kết ngoài/ })).toHaveCount(0)
  await page.getByLabel('Tệp minh chứng', { exact: true }).setInputFiles({ name: 'report.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 actual acceptance bytes') })
  await page.getByPlaceholder(/Mô tả cụ thể/).fill('Actual byte submission through authenticated HTTP')
  await page.getByRole('button', { name: 'Xác nhận nộp bản sửa' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Gửi hồ sơ thẩm định' }).click()
  await expect.poll(() => requests).toEqual(['upload', 'submit-for-review'])
})

test('controlled HTTP: paged queue retains review draft after a structured 409 and reload', async ({ page }) => {
  let reads = 0
  await page.route('**/gate-assignments?*', async route => {
    reads++
    const currentPage = Number(new URL(route.request().url()).searchParams.get('page'))
    await route.fulfill({ json: { items: currentPage === 1 ? [assignment] : [{ ...assignment, id: '32', projectCode: 'P2', projectName: 'Second page project' }], page: currentPage, pageSize: 20, totalCount: 21, totalPages: 2 } })
  })
  await page.route('**/decision', route => route.fulfill({ status: 409, json: { detail: 'The review gate changed; reload before retrying.' } }))
  await login(page, 'reviewer')
  await page.getByPlaceholder(/Nhập chi tiết đánh giá/).fill('Keep this draft after refresh')
  await page.getByRole('button', { name: /Yêu cầu nhóm chỉnh sửa/ }).click()
  await page.getByRole('button', { name: 'Tải lại dữ liệu mới nhất' }).click()
  await expect.poll(() => reads).toBe(2)
  await expect(page.getByPlaceholder(/Nhập chi tiết đánh giá/)).toHaveValue('Keep this draft after refresh')
  await page.getByRole('button', { name: 'Trang sau', exact: true }).click()
  await expect.poll(() => reads).toBe(3)
  await expect(page.getByRole('button', { name: /Second page project/ })).toBeVisible()
  await expect(page.getByPlaceholder(/Nhập chi tiết đánh giá/)).toHaveValue('')
  await page.getByRole('button', { name: 'Trang trước', exact: true }).click()
  await expect(page.getByPlaceholder(/Nhập chi tiết đánh giá/)).toHaveValue('Keep this draft after refresh')
})

test('controlled HTTP: upload 409 reload preserves the selected file and notes', async ({ page }) => {
  let submitted = 0
  await page.route('**/timeline', route => route.fulfill({ json: { ...timeline, gates: [{ ...gate, concurrencyToken: submitted ? 'fresh-token' : 'gate-token' }] } }))
  await page.route('**/evidence/file', async route => {
    submitted++
    if (submitted === 1) return route.fulfill({ status: 409, json: { detail: 'The gate changed; reload before submitting.' } })
    expect(route.request().postDataBuffer()!.toString()).toContain('fresh-token')
    expect(route.request().postDataBuffer()!.toString()).toContain('%PDF retained bytes')
    await route.fulfill({ json: timeline })
  })
  await login(page)
  await page.getByRole('button', { name: 'Nộp bản sửa', exact: true }).click()
  await page.getByLabel('Tệp minh chứng', { exact: true }).setInputFiles({ name: 'retained.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF retained bytes') })
  await page.getByPlaceholder(/Mô tả cụ thể/).fill('Keep upload draft')
  await page.getByRole('button', { name: 'Xác nhận nộp bản sửa' }).click()
  await page.getByRole('button', { name: 'Tải lại dữ liệu, giữ tệp và ghi chú' }).click()
  await expect(page.getByPlaceholder(/Mô tả cụ thể/)).toHaveValue('Keep upload draft')
  await expect(page.getByRole('dialog').getByText('retained.pdf', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Xác nhận nộp bản sửa' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(submitted).toBe(2)
})

test('controlled HTTP: exact download handles authorization revocation', async ({ page }) => {
  await page.route('**/evidence/1/download', route => route.fulfill({ status: 403, json: { detail: 'Assignment revoked' } }))
  await login(page, 'reviewer')
  await page.getByRole('button', { name: 'Tải tệp v1', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Assignment revoked')
})

test('controlled HTTP: empty governance does not request a hardcoded project', async ({ page }) => {
  const projectRequests: string[] = []
  page.on('request', request => { if (request.url().includes('/projects/')) projectRequests.push(request.url()) })
  await page.route('**/gate-templates', route => route.fulfill({ json: [] }))
  await page.route('**/review-gates/matrix', route => route.fulfill({ json: [] }))
  await login(page, 'governance')
  await expect(page.getByRole('button', { name: /Tạo Mẫu Tiến trình Mới/ })).toBeVisible()
  expect(projectRequests).toEqual([])
  await expect(page.getByText('Tất cả kỳ học')).toBeVisible()
})

test('controlled HTTP: governance saves a new numeric ID before publishing the latest draft token', async ({ page }) => {
  const calls: string[] = []
  let saved: Record<string, unknown> = {}
  await page.route('**/review-gates/matrix', route => route.fulfill({ json: [] }))
  await page.route('**/academic/gate-templates', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: [] })
    calls.push('POST')
    const body = route.request().postDataJSON()
    expect(body).not.toHaveProperty('id')
    expect(body.gates[0].sequence).toBe(1)
    expect(body.gates[0].requirements[0].code).toBe('REPORT')
    saved = { ...body, id: '101', gatesCount: 1, status: 'DRAFT', concurrencyToken: 'saved-token' }
    await route.fulfill({ json: saved })
  })
  await page.route('**/academic/gate-templates/101', async route => {
    calls.push('PUT')
    expect(route.request().postDataJSON().concurrencyToken).toBe('saved-token')
    saved = { ...saved, concurrencyToken: 'latest-token' }
    await route.fulfill({ json: saved })
  })
  await page.route('**/academic/gate-templates/101/publish', async route => {
    calls.push('PUBLISH')
    expect(route.request().postDataJSON()).toEqual({ concurrencyToken: 'latest-token' })
    await route.fulfill({ json: { ...saved, status: 'PUBLISHED' } })
  })
  await login(page, 'governance')
  await page.getByRole('button', { name: /Tạo Mẫu Tiến trình Mới/ }).click()
  await page.getByRole('button', { name: '＋ Thêm yêu cầu' }).click()
  await page.getByLabel('Mã yêu cầu *', { exact: true }).fill('REPORT')
  await page.getByLabel(/Tên yêu cầu/).fill('Project report')
  await page.getByRole('button', { name: 'Lưu yêu cầu', exact: true }).click()
  await page.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Đã lưu bản nháp' })).toBeVisible()
  await page.getByRole('button', { name: 'Công bố chính sách', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Đã công bố' })).toBeVisible()
  expect(calls).toEqual(['POST', 'PUT', 'PUBLISH'])
})

test('controlled HTTP: student view fits 320/375/768/1024/1440 widths', async ({ page }, testInfo) => {
  await login(page)
  await expect(page.getByText(timeline.projectName)).toBeVisible()
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `overflow at ${width}`).toBe(true)
    if (width === 320 || width === 1440) await page.screenshot({ path: testInfo.outputPath(`student-${width}.png`), fullPage: true })
  }
})
