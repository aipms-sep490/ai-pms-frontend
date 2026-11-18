import { test, expect, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const evidence = process.env.NOV18_EVIDENCE_DIR || 'test-results/nov18-integrity'
const scope = (token: string) => ({ projectMode: 'INTERDISCIPLINARY', primaryMajorId: null, leadDepartmentId: 1, concurrencyToken: token,
  requirements: [1, 2].map(majorId => ({ majorId, minMembers: 1, maxMembers: 5, responsibility: 'Phối hợp' })) })
const pageOf = (items: unknown[]) => ({ items, page: 1, pageSize: 20, totalCount: items.length, totalPages: 1 })
async function fixture(page: Page, done = false) {
  const mutations: Array<{ path: string; body: unknown; method: string }> = [], errors: string[] = [], unexpected: string[] = []
  let teamToken = 'scope-1', taskStatus = done ? 'DONE' : 'IN_PROGRESS', taskToken = 'task-1', fileDeleted = false
  let responsibilities = [{ id: 1, majorId: 1, content: 'Thiết kế cơ sở dữ liệu', sortOrder: 0, concurrencyToken: 'row-1' }]
  let impactStatus = 'PENDING'
  const task = () => ({ id: 42, milestoneId: 5, title: 'DEMO - Hoàn thiện SQL Schema', description: 'Đối chiếu kết quả với thiết kế cơ sở dữ liệu.', status: taskStatus,
    priority: 'HIGH', concurrencyToken: taskToken, assignees: [{ id: 1, taskId: 42, userId: 2, userFullName: 'Sinh viên DEMO', assignedBy: 2, assignedAt: '2026-11-18T02:00:00Z' }], dependencies: [], updatedAt: '2026-11-18T03:00:00Z' })
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/api/v1/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname, method = request.method()
    if (method !== 'GET') mutations.push({ path, method, body: request.postData() ? request.postDataJSON() : null })
    const json = (body: unknown, status = 200) => route.fulfill({ status, json: body })
    if (path.endsWith('/majors')) return json(pageOf([{ id: 1, code: 'SE', name: 'Kỹ thuật phần mềm', departmentId: 1 }, { id: 2, code: 'MKT', name: 'Marketing', departmentId: 1 }]))
    if (path === '/api/v1/teams/7/academic-scope') { teamToken = 'scope-2'; return json({ id: 7, academicScope: scope(teamToken) }) }
    if (path === '/api/v1/teams/7') return json({ id: 7, academicScope: scope(teamToken) })
    if (path.endsWith('/responsibilities')) {
      if (method === 'PUT') {
        const body = request.postDataJSON()
        if (body.concurrencyToken !== teamToken) return json({ detail: 'Stale token' }, 409)
        teamToken = 'scope-3'
        responsibilities = body.items.map((item: { content: string; sortOrder: number }, index: number) => ({ ...item, id: index + 1, majorId: 1, concurrencyToken: 'row-2' }))
      }
      return json({ concurrencyToken: teamToken, isAvailable: true, isSnapshot: false, items: responsibilities })
    }
    if (path === '/api/v1/tasks/42') return json(task())
    if (path === '/api/v1/tasks/42/history') return json([])
    if (path === '/api/v1/tasks/project/9/timeline') return json({ projectId: 9, milestones: [{ id: 5, title: 'Mốc DEMO', tasks: [task()] }] })
    if (path.endsWith('/execution-actions')) return json({ taskId: 42, projectId: 9, status: taskStatus, concurrencyToken: taskToken,
      actions: ['assign_task', 'change_task_status', 'add_task_evidence', 'review_task_dependency_impact'].map(code => ({ code, allowed: true, reasons: [] })) })
    if (path.endsWith('/dependency-impacts/12/resolve')) {
      const body = request.postDataJSON()
      if (body.concurrencyToken !== taskToken) return json({ detail: 'Stale task' }, 409)
      impactStatus = body.decision; taskToken = 'task-2'
      if (impactStatus === 'REWORK_REQUIRED') taskStatus = 'IN_PROGRESS'
      return json(task())
    }
    if (path.endsWith('/dependency-impacts')) return json({ taskId: 42, canReview: true, items: done ? [{
      id: 12, taskId: 42, predecessorTaskId: 3, predecessorTitle: 'Thiết kế sơ đồ CSDL', predecessorStatus: 'DONE', status: impactStatus,
      reopenedAt: '2026-11-18T03:00:00Z', reopenedBy: 2, reopenReason: 'Bổ sung bảng giao dịch', canResolve: impactStatus === 'PENDING', blockedReason: null,
      reviewedAt: impactStatus === 'PENDING' ? null : '2026-11-18T04:00:00Z', reviewedBy: impactStatus === 'PENDING' ? null : 2,
      reviewReason: impactStatus === 'PENDING' ? null : 'SQL đã có đủ bảng giao dịch.',
    }] : [] })
    if (path.endsWith('/disciplines')) return json({ concurrencyToken: taskToken, classification: 'UNCLASSIFIED', items: [] })
    if (path.endsWith('/evidence')) return json(pageOf(fileDeleted ? [] : [{ id: 55, parentType: 'TASK', parentId: 42, fileName: 'DEMO-schema.docx', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', sizeBytes: 12000, uploadedBy: 2, createdAt: '2026-11-18T03:00:00Z', canDelete: !done }]))
    if (path.endsWith('/comments')) return json(pageOf([]))
    if (path.includes('/upload-policies/')) return json({ parentType: 'TASK', maxBytes: 20 * 1024 * 1024, maxBytesLabel: '20 MiB', allowedMimeTypes: ['application/pdf'], allowedExtensions: ['.pdf', '.docx'], maxFilesPerRequest: 1, requiresVersionAnchor: false })
    if (path === '/api/v1/files/55' && method === 'DELETE') { fileDeleted = true; return route.fulfill({ status: 204 }) }
    unexpected.push(`${method} ${path}`)
    return json({ detail: `Unexpected fixture request ${path}` }, 404)
  })
  return { mutations, errors, unexpected }
}
async function snapshot(page: Page, name: string) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  mkdirSync(evidence, { recursive: true })
  await page.screenshot({ path: `${evidence}/${name}.png`, fullPage: false })
}

for (const width of [390, 1440]) {
  test(`team responsibility follows scope token and preserves entered draft at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const observed = await fixture(page)
    await page.goto('/e2e/nov18-integrity.html?view=team')
    await expect(page.getByLabel('Trách nhiệm 1')).toHaveValue('Thiết kế cơ sở dữ liệu')
    await page.getByLabel('Trách nhiệm 1').fill('Thiết kế cơ sở dữ liệu và kiểm thử tích hợp')
    await page.getByRole('button', { name: 'Lưu phạm vi ngành' }).click()
    await expect.poll(() => observed.mutations.filter(item => item.path.endsWith('/academic-scope')).length).toBe(1)
    await expect(page.getByLabel('Trách nhiệm 1')).toHaveValue('Thiết kế cơ sở dữ liệu và kiểm thử tích hợp')
    await expect(page.getByRole('button', { name: 'Lưu', exact: true })).toBeEnabled()
    await page.getByRole('button', { name: 'Lưu', exact: true }).click()
    await expect(page.getByText('Đã lưu phân công và cập nhật điều kiện của nhóm.')).toBeVisible()
    expect(observed.mutations.find(item => item.path.endsWith('/responsibilities'))?.body).toEqual({ concurrencyToken: 'scope-2', items: [{ content: 'Thiết kế cơ sở dữ liệu và kiểm thử tích hợp', sortOrder: 0 }] })
    await snapshot(page, `browser-team-responsibilities-${width}`)
    expect(observed.errors).toEqual([]); expect(observed.unexpected).toEqual([])
  })

  test(`task evidence cancellation and confirmed deletion at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const observed = await fixture(page)
    await page.goto('/e2e/nov18-integrity.html?view=task')
    await page.getByRole('button', { name: 'Xóa tệp DEMO-schema.docx' }).click()
    await expect(page.getByRole('dialog', { name: 'Xóa tệp minh chứng' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Hủy', exact: true })).toBeFocused()
    await snapshot(page, `browser-evidence-delete-confirm-${width}`)
    await page.getByRole('button', { name: 'Hủy', exact: true }).click()
    expect(observed.mutations.filter(item => item.method === 'DELETE')).toHaveLength(0)
    await page.getByRole('button', { name: 'Xóa tệp DEMO-schema.docx' }).click()
    await page.getByRole('button', { name: 'Xác nhận xóa' }).click()
    await expect(page.getByText('Đã xóa tệp DEMO-schema.docx.')).toBeVisible()
    await expect(page.getByText('Chưa có tệp đính kèm.')).toBeVisible()
    expect(observed.mutations.filter(item => item.method === 'DELETE')).toEqual([{ path: '/api/v1/files/55', method: 'DELETE', body: null }])
    await snapshot(page, `browser-evidence-deleted-${width}`)
    expect(observed.errors).toEqual([]); expect(observed.unexpected).toEqual([])
  })

  test(`completed task keeps assignments locked and records impact review at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const observed = await fixture(page, true)
    await page.goto('/e2e/nov18-integrity.html?view=task')
    await expect(page.getByText(/Phân công đã khóa khi chờ nghiệm thu hoặc hoàn thành/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Phân công', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Xóa tệp DEMO-schema.docx' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Giữ kết quả hoàn thành' }).click()
    await page.getByLabel('Lý do đánh giá').fill('SQL đã có đủ bảng giao dịch.')
    await snapshot(page, `browser-impact-review-${width}`)
    await page.getByRole('button', { name: 'Xác nhận vẫn hợp lệ' }).click()
    await expect(page.getByText('Lịch sử đánh giá ảnh hưởng (1)')).toBeVisible()
    expect(observed.mutations.find(item => item.path.endsWith('/resolve'))?.body).toEqual({ decision: 'CONFIRMED_VALID', reason: 'SQL đã có đủ bảng giao dịch.', concurrencyToken: 'task-1' })
    await expect(page.getByRole('button', { name: 'Phân công', exact: true })).toHaveCount(0)
    await snapshot(page, `browser-impact-reviewed-${width}`)
    expect(observed.errors).toEqual([]); expect(observed.unexpected).toEqual([])
  })
}
