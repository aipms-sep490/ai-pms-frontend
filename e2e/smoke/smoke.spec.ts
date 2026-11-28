import { expect, test } from '@playwright/test'

test('smoke shell renders login entry route', async ({ page }) => {
  await page.goto('/login')
  await expect(page.locator('#root')).toBeVisible()
})
