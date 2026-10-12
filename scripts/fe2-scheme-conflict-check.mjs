import { chromium, expect } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'

const baseUrl = process.env.FE2_FIXTURE_URL || 'http://127.0.0.1:5199/e2e/fixtures/fe2-scheme-conflict.html'
const outputDir = 'test-results/fe2-scheme-conflict'
await mkdir(outputDir, { recursive: true })
const browser = await chromium.launch({ headless: true })
const results = []
const errors = []
const initial = {
  id: 31, rootId: 31, version: 1, projectId: 2, projectPeriodId: 7, name: 'Phương án ban đầu', status: 'DRAFT', passThreshold: 5,
  concurrencyToken: 'old-token', policyVersionId: null, calculationRule: 'CURRENT_RULE', students: [],
  components: [{ id: 42, name: 'Chất lượng', scope: 'COMMON', majorId: null, rubricId: 4, projectWeightPercent: 100, studentWeightPercent: 100, requiredEvaluators: 1 }],
}
try {
  for (const width of [1440, 1024, 768, 375]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } })
    page.on('pageerror', error => errors.push(error.message))
    let current = initial
    const writes = []
    await page.route('**/api/v1/**', async route => {
      const url = new URL(route.request().url())
      const path = url.pathname
      let body
      let status = 200
      if (path.endsWith('/evaluation-schemes/31') && route.request().method() === 'PUT') {
        const input = route.request().postDataJSON()
        writes.push(input)
        if (writes.length === 1) {
          current = { ...initial, name: 'Phương án trên server', passThreshold: 6, concurrencyToken: 'new-token' }
          status = 409; body = { status, title: 'Conflict', detail: 'Scheme changed' }
        } else {
          if (input.concurrencyToken !== 'new-token') throw new Error('Stale token replayed')
          current = { ...current, ...input, concurrencyToken: 'saved-token' }; body = current
        }
      } else if (path.endsWith('/evaluation-schemes')) body = [current]
      else if (path.endsWith('/projects/2/my-capabilities')) body = { projectId: 2, projectStatus: 'FINAL_SUBMISSION', concurrencyToken: 'project-token', academicScopeProvenance: 'FROZEN_REGISTRATION_SNAPSHOT', leadDepartmentId: 2, managedDepartmentIds: [2], registrationSnapshotId: 3, schemeId: 31, schemeConcurrencyToken: current.concurrencyToken, policyVersionId: null, actions: [{ code: 'manage_evaluation_scheme', allowed: true, reasons: [] }] }
      else if (path.endsWith('/projects/2')) body = { id: 2, majors: [{ majorId: 1, majorCode: 'IT', majorName: 'CNTT' }] }
      else if (path.endsWith('/project-periods')) body = { items: [{ id: 7, name: 'Đợt bảo vệ', periodType: 'EVALUATION', status: 'ACTIVE' }], totalCount: 1 }
      else if (path.endsWith('/rubrics')) body = { items: [{ id: 4, code: 'RUBRIC', version: 1 }], totalCount: 1 }
      else throw new Error(`Unexpected fixture request: ${route.request().method()} ${path}`)
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    })
    await page.goto(baseUrl)
    await page.getByRole('button', { name: /Phương án ban đầu/ }).click()
    await page.getByLabel('Tên phương án đánh giá', { exact: true }).fill('Nội dung chưa lưu của tôi')
    await page.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click()
    const comparison = page.getByRole('region', { name: 'Kiểm tra thay đổi trước khi tiếp tục' })
    await expect(page.getByRole('button', { name: 'Giữ nội dung để tiếp tục sửa' })).toBeEnabled()
    await expect(page.getByLabel('Tên phương án đánh giá', { exact: true })).toHaveValue('Nội dung chưa lưu của tôi')
    await expect(page.getByRole('button', { name: 'Lưu bản nháp', exact: true })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Công bố phương án', exact: true })).toBeDisabled()
    await expect(page.getByRole('alert')).toBeFocused()
    await comparison.locator('summary').focus()
    await page.keyboard.press('Enter')
    await expect(comparison.getByText('Nội dung chưa lưu của tôi', { exact: false })).toBeVisible()
    await expect(comparison.getByRole('heading', { name: /Phương án trên server/ })).toBeVisible()
    if (writes.length !== 1) throw new Error('Conflict mutation was replayed')
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error(`Overflow at ${width}`)
    await comparison.screenshot({ path: `${outputDir}/conflict-${width}.png` })
    results.push({ case: 'conflict/draft/locked commands/focus/keyboard/no overflow', width, pass: true })
    const keep = page.getByRole('button', { name: 'Giữ nội dung để tiếp tục sửa' })
    await keep.focus(); await page.keyboard.press('Enter')
    await expect(page.getByLabel('Tên phương án đánh giá', { exact: true })).toBeEnabled()
    if (writes.length !== 1) throw new Error('Accepting reconciliation performed a write')
    await page.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click()
    await expect(page.getByText('Đã lưu thay đổi cho phương án đánh giá bản nháp.', { exact: true })).toBeVisible()
    if (writes.length !== 2 || writes[1].concurrencyToken !== 'new-token' || writes[1].name !== 'Nội dung chưa lưu của tôi') throw new Error('Reconciled save lost draft/token')
    results.push({ case: 'explicit reconciliation/new token/one subsequent write', width, pass: true })
    await page.close()
  }
  if (errors.length) throw new Error(errors.join('\n'))
  console.log(JSON.stringify({ scope: 'mock API browser regression', results, errors }, null, 2))
} finally {
  await writeFile(`${outputDir}/results.json`, JSON.stringify({ scope: 'mock API browser regression', results, errors }, null, 2))
  await browser.close()
}
