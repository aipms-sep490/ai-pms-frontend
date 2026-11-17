import { expect, test } from '@playwright/test'

test('controlled UI: department uploads, publishes and previews a template on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.addInitScript(() => { (window as Window & { __AIPMS_DOCUMENT_FIXTURE__?: boolean }).__AIPMS_DOCUMENT_FIXTURE__ = true })
  let uploaded = false
  let published = false
  const doc = { id: 7, departmentId: 2, majorId: 12, projectPeriodId: null,
    code: 'REPORT', title: 'Mẫu báo cáo', version: 1, status: 'DRAFT', fileName: 'report.docx',
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', sizeBytes: 32,
    sha256: 'a'.repeat(64), concurrencyToken: 'token', uploadedAt: '2026-11-15T00:00:00Z', publishedAt: null }
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url())
    const path = url.pathname
    if (path === '/api/v1/users/me/profile') return route.fulfill({ json: { id: 2, departmentId: 2, majorId: null, status: 'ACTIVE', roles: ['DEPARTMENT_STAFF'], email: 'fixture@example.test', fullName: 'Cán bộ bộ môn' } })
    if (path === '/api/v1/academic/hierarchy') return route.fulfill({ json: [{ departments: [{ department: { id: 2 }, majors: [{ id: 12, name: 'Kỹ thuật phần mềm', code: 'SE' }] }] }] })
    if (path === '/api/v1/academic/project-periods') return route.fulfill({ json: { items: [], page: 1, pageSize: 100, totalCount: 0, totalPages: 0 } })
    if (path === '/api/v1/academic/department-documents' && route.request().method() === 'GET')
      return route.fulfill({ json: uploaded ? [{ ...doc, status: published ? 'PUBLISHED' : 'DRAFT', concurrencyToken: published ? 'fresh-token' : 'token' }] : [] })
    if (path === '/api/v1/academic/department-documents' && route.request().method() === 'POST') {
      expect(route.request().postData()).toContain('REPORT')
      uploaded = true
      return route.fulfill({ status: 201, json: doc })
    }
    if (path === '/api/v1/academic/department-documents/7/publish') {
      expect(route.request().postDataJSON()).toEqual({ concurrencyToken: 'token' })
      published = true
      return route.fulfill({ json: { ...doc, status: 'PUBLISHED', concurrencyToken: 'fresh-token' } })
    }
    if (path === '/api/v1/academic/department-documents/7/download') return route.fulfill({
      status: 200, contentType: doc.contentType, body: 'controlled office blob' })
    if (path === '/api/v1/files/office-preview') return route.fulfill({ json: {
      kind: 'DOCX_TEXT', paragraphs: ['Nội dung mẫu kiểm thử'], sheets: [], truncated: false } })
    throw new Error(`Unexpected controlled request: ${path}`)
  })
  await page.goto('/e2e/department-documents.html')
  await expect(page.getByRole('heading', { name: 'Tài liệu mẫu của bộ môn' })).toBeVisible()
  await page.getByLabel('Mã tài liệu').fill('REPORT')
  await page.getByLabel('Tên tài liệu').fill('Mẫu báo cáo')
  await page.getByLabel('Tệp mẫu').setInputFiles({ name: 'report.docx', mimeType: doc.contentType, buffer: Buffer.from('controlled office blob') })
  await page.getByRole('button', { name: 'Tải lên bản nháp' }).click()
  await expect(page.getByText('Đã tải lên bản nháp.')).toBeVisible()
  await page.getByRole('button', { name: 'Công bố' }).click()
  await expect(page.getByText('Tài liệu đã được công bố.')).toBeVisible()
  await page.getByRole('button', { name: 'Xem trước' }).click()
  await expect(page.getByRole('dialog')).toContainText('Nội dung mẫu kiểm thử')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
