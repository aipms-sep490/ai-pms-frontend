import { expect, test } from '@playwright/test'

const room = { id: 7, code: 'A-201', building: 'Tòa A', floor: 2, capacity: 40, status: 'ACTIVE', concurrencyToken: 'room-token' }
const allocation = { projectId: 12, committeeId: 5, roomId: 7, roomCode: 'A-201', date: '2026-12-01', slotNumber: 1,
  startAt: '2026-12-01T08:00:00+07:00', endAt: '2026-12-01T09:15:00+07:00' }

test('controlled browser: publishes only after official schedule readback and keeps room display factual', async ({ page }) => {
  let published = false
  let calendarMask = 62
  let calendarToken = 'calendar-old'
  await page.route('**/api/v1/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (path === '/api/v1/rooms') return route.fulfill({ json: [room] })
    if (path.endsWith('/calendar')) {
      if (request.method() === 'PUT') {
        expect(request.postDataJSON().concurrencyToken).toBe(calendarToken)
        calendarMask = request.postDataJSON().workingDaysOfWeek
        calendarToken = 'calendar-new'
      }
      return route.fulfill({ json: { projectPeriodId: 5, workingDaysOfWeek: calendarMask,
        workingDaysDescription: 'Ngày làm việc đã cấu hình', holidays: [], concurrencyToken: calendarToken } })
    }
    if (path.endsWith('/defense-sessions/change-requests')) return route.fulfill({ json: [] })
    if (path.endsWith('/defense-sessions')) return route.fulfill({ json: published ? [{
      id: 50, projectId: 12, projectCode: 'P12', projectTitle: 'Đồ án 12', committeeId: 5,
      committeeName: 'Hội đồng', roomId: 7, roomCode: 'A-201', slotNumber: 1,
      startAt: allocation.startAt, endAt: allocation.endAt, status: 'SCHEDULED', concurrencyToken: 'session-token', canCancel: true,
    }] : [] })
    if (path.endsWith('/auto-schedule/preview')) return route.fulfill({ json: {
      scheduledCount: 1, unscheduledCount: 0, allocations: [allocation], conflicts: [], concurrencyToken: 'preview-token',
    } })
    if (path.endsWith('/auto-schedule/apply')) {
      expect(request.postDataJSON().concurrencyToken).toBe('preview-token')
      published = true
      return route.fulfill({ json: { success: true, createdSessionsCount: 1 } })
    }
    return route.fulfill({ status: 404, json: { detail: `Unexpected controlled route: ${path}` } })
  })
  await page.goto('/e2e/room-planner.html')
  await expect(page.getByRole('button', { name: /Phòng A-201/ })).toBeVisible()
  await expect(page.getByText(/Dữ liệu vị trí vật lý chưa có/)).toBeVisible()
  await expect(page.getByText(/35 m²|FPT/)).toHaveCount(0)
  await page.getByRole('button', { name: /Phòng A-201/ }).click()
  await page.getByRole('button', { name: /Lưới thời khóa biểu/ }).click()
  await expect(page.getByText(/35 m²|CLASSROOM/)).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Khóa ca' }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Xem & cấu hình' }).click()
  await page.getByLabel('Thứ 7').check()
  await page.getByRole('button', { name: 'Lưu lịch kỳ' }).click()
  await expect(page.getByText(/Đã xác minh lịch làm việc/)).toBeVisible()
  await page.getByLabel('Từ ngày').fill('2026-12-01')
  await page.getByLabel('Đến ngày').fill('2026-12-02')
  await page.getByRole('button', { name: /Tự động xếp lịch R4/ }).click()
  await expect(page.getByRole('button', { name: 'Duyệt và áp dụng lịch' })).toBeEnabled()
  await page.getByRole('button', { name: 'Duyệt và áp dụng lịch' }).click()
  await expect(page.getByText(/Đã xác minh 1 phiên bảo vệ Gate 4/)).toBeVisible()
  await expect(page.getByRole('table', { name: 'Danh sách lịch đã công bố R4' }).getByText('A-201')).toBeVisible()
})

test('controlled mobile browser: shows a retry when catalog access is denied', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.route('**/api/v1/**', route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/v1/rooms') return route.fulfill({ status: 403, json: { title: 'Forbidden' } })
    if (path.endsWith('/calendar')) return route.fulfill({ json: { projectPeriodId: 5,
      workingDaysOfWeek: 62, workingDaysDescription: 'Thứ 2 đến Thứ 6', holidays: [], concurrencyToken: 'calendar' } })
    return route.fulfill({ json: [] })
  })
  await page.goto('/e2e/room-planner.html')
  await expect(page.getByRole('alert').filter({ hasText: 'Bạn không có quyền' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Tải lại phòng' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
})
