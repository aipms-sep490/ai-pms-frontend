import { expect, test } from '@playwright/test'

for (const width of [390, 1440]) test(`access table remains usable at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 850 })
  const requests: URL[] = []
  await page.route('**/api/v1/security/access-events**', async route => {
    const url = new URL(route.request().url())
    requests.push(url)
    await route.fulfill({ json: { page: Number(url.searchParams.get('page') ?? 1), pageSize: 20, totalCount: 21,
      items: [{ id: 11, userId: 7, fullName: 'Nguyễn Minh', email: 'minh@example.test', eventType: 'LOGIN',
        authenticationMethod: 'GOOGLE', outcome: 'SUCCESS', ipAddress: '192.0.2.1', occurredAt: '2026-11-13T08:30:00Z' }] } })
  })
  await page.goto('/e2e/access-events.html')
  await expect(page.getByRole('heading', { name: 'Nhật ký truy cập' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Nguyễn Minh' })).toBeVisible()
  await expect(page.getByText('IP là địa chỉ mạng, không phải vị trí địa lý.')).toBeVisible()
  await page.getByRole('button', { name: 'Trang sau' }).click()
  await expect.poll(() => requests.at(-1)?.searchParams.get('page')).toBe('2')
  await expect(page.getByText('Trang 2/2 · 21 lượt')).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
