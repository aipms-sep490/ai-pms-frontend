import { expect, test, type Page } from '@playwright/test'

const root = process.env.BATCH1_EVIDENCE_DIR || 'F:/AI-PMS/artifacts/fe-fix-round2-20261022'
const warning = 'Một số nguồn chưa tải được; danh sách có thể chưa đầy đủ.'
type Mode = 'aggregator-error' | 'dashboard-error' | 'ready-items' | 'ready-empty' | 'department-error'
async function fixture(page: Page, mode: Mode) {
  const reads: string[] = []
  let failing = true
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname
    reads.push(path)
    if (path.endsWith('/calendar')) return route.fulfill({ json: { items: [], complete: true, hasMore: false } })
    if (path.endsWith('/dashboards/student')) {
      if (mode === 'dashboard-error' && failing) return route.fulfill({ status: 500, json: { detail: 'Nguồn mốc chưa tải được' } })
      return route.fulfill({ json: { project: { id: 1, title: 'Đồ án kiểm chứng' }, taskDeadlines: [], milestoneDeadlines: mode === 'ready-empty' ? [] : [{ id: 9, title: 'Mốc quá hạn vẫn hiển thị', status: 'OPEN', isOverdue: true, dueDate: '2026-10-01' }] } })
    }
    if (path.endsWith('/next-actions')) {
      if (mode === 'aggregator-error' && failing) return route.fulfill({ status: 500, json: { detail: 'Nguồn công việc chưa tải được' } })
      return route.fulfill({ json: { asOfUtc: '2026-10-22T08:00:00Z', items: mode === 'ready-empty' ? [] : [1, 2, 3].map(id => ({ kind: 'TASK', id, projectId: 1, title: `Task HIGH số ${id}`, status: 'TODO', severity: 'HIGH', dueAt: '2026-10-01', deepLink: `/project/tasks/${id}` })) } })
    }
    const departmentId = Number(path.match(/departments\/(\d+)\/urgent-actions/)?.[1])
    if (departmentId) {
      if (mode === 'department-error' && departmentId === 2 && failing) return route.fulfill({ status: 403, json: { detail: 'Không đọc được dữ liệu bộ môn' } })
      return route.fulfill({ json: { asOfUtc: '2026-10-22T08:00:00Z', departmentId, items: [{ kind: 'TASK', id: departmentId, projectId: departmentId, title: departmentId === 1 ? 'Việc IT đã tải được' : 'Việc bộ môn đã tải được', status: 'TODO', severity: 'HIGH', dueAt: null, deepLink: null }] } })
    }
    return route.fulfill({ status: 404, json: { detail: `Unexpected fixture request: ${path}` } })
  })
  return { reads, recover: () => { failing = false } }
}

for (const width of [390, 1440]) for (const mode of ['aggregator-error', 'dashboard-error', 'ready-items', 'ready-empty', 'department-error'] as const) {
  test(`Round2 ${mode} at ${width}px: truthful count, retained items and named source`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
    const state = await fixture(page, mode)
    await page.setViewportSize({ width, height: 900 })
    const department = mode === 'department-error'
    await page.goto(`/e2e/batch1.html?view=calendar${department ? '&actor=department&departments=multiple' : ''}`)
    const panel = page.getByRole('complementary')
    const degraded = mode.endsWith('error')
    if (degraded) {
      await expect(panel.getByLabel('Chưa xác định số việc cần làm')).toHaveText('—')
      await expect(panel.getByText(warning, { exact: true })).toBeVisible()
      if (mode === 'aggregator-error') await expect(panel.getByText('Mốc quá hạn vẫn hiển thị')).toBeVisible()
      if (mode === 'dashboard-error') for (const id of [1, 2, 3]) await expect(panel.getByText(`Task HIGH số ${id}`, { exact: true })).toBeVisible()
      if (department) {
        await expect(panel.getByText('Việc IT đã tải được')).toBeVisible()
        await expect(page.getByText('Việc cần xử lý · Công nghệ thông tin', { exact: true })).toBeVisible()
        const failedSource = page.getByText('Việc cần xử lý · Quản trị kinh doanh', { exact: true }).locator('..')
        await expect(failedSource).toContainText('Không đọc được dữ liệu bộ môn')
        await expect(page.getByText(/^Việc cần xử lý · Bộ môn \d+$/)).toHaveCount(0)
      }
      await page.screenshot({ path: `${root}/round2-${mode}-${width}.png`, fullPage: true })
      state.recover()
      await panel.getByRole('button', { name: 'Tải lại danh sách' }).click()
      await expect(panel.getByLabel(`${department ? 2 : 4} điểm cần chú ý`)).toHaveText(department ? '2' : '4')
      await expect(panel.getByText(warning, { exact: true })).toHaveCount(0)
    } else {
      const count = mode === 'ready-empty' ? 0 : 4
      await expect(panel.getByLabel(`${count} điểm cần chú ý`)).toHaveText(String(count))
      await expect(panel.getByText(warning, { exact: true })).toHaveCount(0)
      if (!count) await expect(panel.getByText('Không có việc cần làm.', { exact: true })).toBeVisible()
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(errors).toEqual([])
  })
}

for (const missingNames of [false, true]) test(`Round2 department label; missing name = ${missingNames}; stable request count`, async ({ page }) => {
  const { reads } = await fixture(page, 'ready-items')
  await page.goto(`/e2e/batch1.html?view=calendar&actor=department${missingNames ? '&departmentNames=missing' : ''}`)
  await expect(page.getByText(`Việc cần xử lý · ${missingNames ? 'Bộ môn 4' : 'Thiết kế'}`, { exact: true })).toBeVisible()
  await expect(page.getByLabel('1 điểm cần chú ý')).toHaveText('1')
  await page.getByRole('button', { name: 'Theo tháng' }).click()
  await page.getByLabel('Hiện hoàn tất').check()
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  expect(reads.filter(path => path.endsWith('/urgent-actions'))).toEqual(['/api/v1/departments/4/urgent-actions'])
})
