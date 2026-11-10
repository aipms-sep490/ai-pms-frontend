import { expect, test } from '@playwright/test'
test('fixture scoring, leader approval, retry and network isolation', async ({ page }) => {
  const apiRequests: string[] = []; const errors: string[] = []
  page.on('request', request => { if (/^\/(api|hubs)\//.test(new URL(request.url()).pathname)) apiRequests.push(request.url()) })
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/e2e/workflow-preview.html')
  await page.getByRole('button', { name: 'Chấm nguội', exact: true }).click()
  await page.getByRole('button', { name: 'Hoàn tất', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('SCORES_INCOMPLETE')
  for (const input of await page.getByRole('spinbutton').all()) await input.fill('5')
  await page.getByRole('button', { name: 'Lưu nháp', exact: true }).click()
  await page.getByRole('button', { name: 'Hoàn tất', exact: true }).click()
  await expect(page.getByRole('spinbutton').first()).toBeDisabled()
  await page.getByRole('button', { name: 'Đổi trưởng nhóm', exact: true }).click()
  await page.getByRole('textbox', { name: 'Lý do đổi trưởng nhóm' }).fill('Điều phối công việc')
  await page.getByRole('button', { name: 'Gửi yêu cầu', exact: true }).click()
  await expect(page.getByText('Trưởng nhóm hiện tại: Nguyễn An (fixture)')).toBeVisible()
  await page.getByRole('combobox', { name: 'Vai trò thử nghiệm' }).selectOption('supervisor')
  await page.getByRole('button', { name: 'Duyệt', exact: true }).click()
  await expect(page.getByText('Trưởng nhóm hiện tại: Trần Bình (fixture)')).toBeVisible()
  await page.getByRole('combobox', { name: 'Kịch bản hiển thị' }).selectOption('error')
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click()
  expect(apiRequests).toEqual([]); expect(errors).toEqual([])
})
for (const width of [375, 768, 1440]) {
  test(`preview and real board responsive at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/e2e/workflow-preview.html')
    await expect(page.getByRole('heading', { name: 'Preview quy trình FE v5' })).toBeVisible()
    for (const tab of ['Báo cáo COLD', 'Chấm nguội', 'Điểm cá nhân tuần', 'Collaboration']) {
      await page.getByRole('button', { name: tab, exact: true }).click()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    }
    await page.screenshot({ path: `test-results/workflow-preview/preview-${width}.png`, fullPage: true })
    await page.goto('/e2e/workflow-preview.html?board')
    await page.getByRole('button', { name: 'Bảng Kanban', exact: true }).click()
    await expect(page.getByRole('link', { name: /Task fixture BLOCKED/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Task fixture CANCELLED/ })).toBeAttached()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(await page.locator('.ex-toolbar').evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
    const board = page.getByRole('region', { name: 'Bảng công việc theo trang' })
    await board.focus(); await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: /Task fixture TODO/ })).toBeFocused()
    await page.screenshot({ path: `test-results/workflow-preview/board-${width}.png`, fullPage: true })
  })
}
test('report upload creates versions and prevents replacement after lock', async ({ page }) => {
  await page.goto('/e2e/workflow-preview.html')
  await page.getByLabel('File báo cáo', { exact: true }).setInputFiles({ name: 'fixture.zip', mimeType: 'application/zip', buffer: Buffer.from('fixture metadata only') })
  await page.getByRole('button', { name: 'Tải lên fixture', exact: true }).click()
  await page.getByRole('button', { name: 'Nộp báo cáo 1', exact: true }).click()
  await page.getByRole('button', { name: 'Khóa báo cáo 1 (fixture hội đồng)', exact: true }).click()
  await expect(page.getByLabel('File báo cáo', { exact: true })).toBeDisabled()
  await expect(page.getByText('LOCKED', { exact: true })).toBeVisible()
})

test('collaboration board move, meeting calendar and chat stay isolated from the network', async ({ page }) => {
  const apiRequests: string[] = []; const errors: string[] = []
  page.on('request', request => { if (/^\/(api|hubs)\//.test(new URL(request.url()).pathname)) apiRequests.push(request.url()) })
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/e2e/workflow-preview.html')
  await page.getByRole('button', { name: 'Collaboration', exact: true }).click()

  // Board: move a card to the next column through the accessible control.
  await page.getByRole('button', { name: 'Chuyển “Đối chiếu contract COLD” sang cột IN_PROGRESS' }).click()
  // After the move the card sits in IN_PROGRESS, so its back-control now targets TODO.
  await expect(page.getByRole('button', { name: 'Chuyển “Đối chiếu contract COLD” sang cột TODO' })).toBeEnabled()

  // Meeting: create a recurring meeting and view it on the calendar.
  await page.getByRole('button', { name: 'Meeting', exact: true }).click()
  await page.getByLabel('Tiêu đề meeting').fill('Weekly sync')
  await page.getByLabel('Bắt đầu meeting (giờ địa phương)').fill('2026-10-12T09:00')
  await page.getByLabel('Kết thúc meeting (giờ địa phương)').fill('2026-10-12T10:00')
  await page.getByLabel('Lặp lịch').selectOption('WEEKLY')
  await page.getByLabel('Lặp đến ngày').fill('2026-10-26')
  await page.getByRole('button', { name: 'Tạo meeting fixture', exact: true }).click()
  await page.getByRole('button', { name: 'Lịch', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Lịch cuộc họp fixture' })).toBeVisible()

  // Chat: send a message and see it rendered with a delivery state.
  await page.getByRole('button', { name: 'Chat', exact: true }).click()
  await page.getByRole('textbox', { name: 'Soạn tin nhắn' }).fill('Đã cập nhật tiến độ')
  await page.getByRole('button', { name: 'Gửi tin nhắn fixture', exact: true }).click()
  await expect(page.getByText('Đã cập nhật tiến độ')).toBeVisible()

  expect(apiRequests).toEqual([]); expect(errors).toEqual([])
})
