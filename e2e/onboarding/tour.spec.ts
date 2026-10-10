import { expect, test } from '@playwright/test'

const open = (role = 'student') => `/e2e/onboarding.html?role=${role}`

test.describe('guided onboarding tour', () => {
  test('auto-starts for a new student, walks forward and back, and finishes', async ({ page }) => {
    await page.goto(open('student'))
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Chào mừng đến AI-PMS' })).toBeVisible()
    await expect(page.getByText('1/8')).toBeVisible()
    await page.screenshot({ path: 'test-results/onboarding/student-welcome.png' })

    // Advance to an anchored step → spotlight appears over the sidebar.
    await page.getByRole('button', { name: 'Tiếp theo' }).click()
    await expect(page.getByRole('heading', { name: 'Thanh điều hướng đồ án' })).toBeVisible()
    await expect(page.locator('.tour-spotlight')).toBeVisible()
    await page.screenshot({ path: 'test-results/onboarding/student-spotlight.png' })

    // Back returns to the welcome step.
    await page.getByRole('button', { name: 'Quay lại' }).click()
    await expect(page.getByRole('heading', { name: 'Chào mừng đến AI-PMS' })).toBeVisible()

    // Walk to the end and finish.
    while (await page.getByRole('button', { name: 'Tiếp theo' }).count()) {
      await page.getByRole('button', { name: 'Tiếp theo' }).click()
    }
    await page.getByRole('button', { name: 'Xong' }).click()
    await expect(dialog).toBeHidden()

    // Seen once: reloading does not auto-start again.
    await page.reload()
    await expect(page.getByRole('dialog')).toBeHidden()
  })

  test('supports keyboard navigation and Escape to dismiss', async ({ page }) => {
    await page.goto(open('student'))
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('heading', { name: 'Thanh điều hướng đồ án' })).toBeVisible()
    await page.keyboard.press('ArrowLeft')
    await expect(page.getByRole('heading', { name: 'Chào mừng đến AI-PMS' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()
  })

  test('lets a returning user replay from the Help button', async ({ page }) => {
    await page.goto(open('student'))
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: 'Bỏ qua', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeHidden()

    await page.getByRole('button', { name: /hướng dẫn/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('shows the lecturer-specific welcome for a supervisor', async ({ page }) => {
    await page.goto(open('lecturer'))
    await expect(page.getByRole('heading', { name: 'Chào mừng giảng viên' })).toBeVisible()
    await page.screenshot({ path: 'test-results/onboarding/lecturer-welcome.png' })
  })
})
