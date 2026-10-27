import { test, expect } from '@playwright/test'

for (const width of [390, 768, 1280, 1440]) {
  test(`leader tasks and roster at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto('/e2e/fe1-preview.html')
    await page.evaluate(() => document.fonts.ready)
    await expect(page.getByText('Kiểm thử luồng nhóm và báo cáo', { exact: true })).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Người phụ trách' })).toContainText('Thành viên chưa có task')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `logs/leader-tasks-${width}.png`, fullPage: true })
    expect(errors).toEqual([])
  })
}
test('denied capability hides task creation', async ({ page }) => {
  await page.goto('/e2e/fe1-preview.html?scenario=denied')
  await expect(page.getByText('Kiểm thử luồng nhóm và báo cáo', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Tạo công việc', exact: true })).toHaveCount(0)
})
test('readonly supervisor cannot drag a task', async ({ page }) => {
  await page.goto('/e2e/fe1-preview.html?scenario=readonly')
  await page.getByRole('button', { name: 'Bảng Kanban' }).click()
  await expect(page.getByText(/Bảng công việc chỉ xem/)).toBeVisible()
  expect(await page.locator('[draggable="true"]').count()).toBe(0)
})
test('service failure offers retry without false empty success', async ({ page }) => {
  await page.goto('/e2e/fe1-preview.html?scenario=error')
  await expect(page.getByRole('button', { name: 'Thử lại', exact: true }).first()).toBeVisible()
  await expect(page.getByText('Kiểm thử luồng nhóm và báo cáo', { exact: true })).toHaveCount(0)
})
test('leader can select reporting cycle and save a draft in memory', async ({ page }) => {
  await page.goto('/e2e/fe1-preview.html?view=report')
  await page.locator('#report-cycle-select').selectOption('101')
  await page.locator('textarea').first().fill('Đã kiểm chứng nhóm và báo cáo bằng dữ liệu fixture.')
  await page.getByRole('button', { name: /Lưu bản nháp/ }).click()
  await expect(page.getByText(/Đã kiểm chứng nhóm và báo cáo bằng dữ liệu fixture/).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /Nộp cho GVHD/ })).toBeVisible()
})
test('denied report capability prevents opening the editor', async ({ page }) => {
  await page.goto('/e2e/fe1-preview.html?view=report&scenario=denied')
  await expect(page.getByRole('alert')).toContainText('Bạn chưa thể tạo báo cáo tiến độ cho đồ án này.')
  await expect(page.locator('#report-cycle-select')).toHaveCount(0)
})
test('profile saves and reads back phone through the real FE API wrapper', async ({ page }) => {
  await page.goto('/e2e/fe1-preview.html?view=profile')
  await page.getByRole('button', { name: 'Chỉnh sửa hồ sơ' }).click()
  await page.getByLabel('Số điện thoại').fill('0912345678')
  await page.getByRole('button', { name: 'Lưu hồ sơ' }).click()
  await expect(page.getByText('0912345678', { exact: true })).toBeVisible()
})
test('invitation context displays names and treats message as text', async ({ page }) => {
  await page.goto('/e2e/fe1-preview.html?view=invitations')
  await expect(page.getByText('Thành viên chưa có task', { exact: false }).first()).toBeVisible()
  await expect(page.getByText('<script>không thực thi</script>', { exact: false })).toBeVisible()
  await page.screenshot({ path: 'logs/invitations.png', fullPage: true })
})
