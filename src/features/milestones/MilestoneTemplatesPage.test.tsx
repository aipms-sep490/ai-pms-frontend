import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MilestoneTemplatesPage } from './MilestoneTemplatesPage'
import { httpGet } from '../../services/http/http-client'
const api = vi.hoisted(() => ({ getMilestoneTemplates: vi.fn(), createMilestoneTemplate: vi.fn(), publishTemplateVersion: vi.fn(), assignMilestoneTemplate: vi.fn() }))
vi.mock('./milestone-templates-api', () => api)
vi.mock('../../services/http/http-client', async importOriginal => ({ ...await importOriginal<typeof import('../../services/http/http-client')>(), httpGet: vi.fn().mockResolvedValue({ items: [{ id: 2, name: 'Kỳ đồ án' }] }) }))
const template = { id: 1, name: 'Mẫu chuẩn', description: null, versions: [{ id: 5, versionNumber: 1, status: 'DRAFT', items: [{ id: 8, title: 'Nộp đề cương', sortOrder: 1, startOffsetDays: 0, dueOffsetDays: 7 }] }] }
beforeEach(() => { api.getMilestoneTemplates.mockResolvedValue([template]); api.publishTemplateVersion.mockResolvedValue(undefined); api.createMilestoneTemplate.mockResolvedValue({ id: 2 }) })
afterEach(() => { cleanup(); vi.clearAllMocks() })
it('loads in view mode and explains published version impact', async () => {
  render(<MemoryRouter><MilestoneTemplatesPage /></MemoryRouter>)
  expect(screen.getByText('Chế độ xem')).toBeTruthy()
  expect(screen.queryByLabelText('Tên mẫu')).toBeNull()
  expect(screen.getByText(/Phiên bản đã công bố được giữ nguyên/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Tạo mẫu' }))
  expect(screen.getByText('ĐANG CHỈNH SỬA')).toBeTruthy()
  expect(screen.getByLabelText('Tên mẫu')).toBeTruthy()
})
it('requires confirmation before locking a template version', async () => {
  render(<MemoryRouter><MilestoneTemplatesPage /></MemoryRouter>)
  fireEvent.click(await screen.findByRole('button', { name: /Mẫu chuẩn/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Công bố' }))
  expect(api.publishTemplateVersion).not.toHaveBeenCalled()
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Công bố' }))
  await waitFor(() => expect(api.publishTemplateVersion).toHaveBeenCalledWith(5))
})
it('keeps a published version immutable and offers period assignment', async () => {
  api.getMilestoneTemplates.mockResolvedValue([{ ...template, versions: [{ ...template.versions[0], status: 'PUBLISHED' }] }])
  render(<MemoryRouter><MilestoneTemplatesPage /></MemoryRouter>)
  fireEvent.click(await screen.findByRole('button', { name: /Mẫu chuẩn/ }))
  expect(screen.queryByRole('button', { name: 'Sửa mốc' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Xóa mốc' })).toBeNull()
  expect(screen.getByRole('button', { name: 'Áp dụng mẫu' })).toBeTruthy()
})
it('only offers open execution periods for assignment', async () => {
  const future = new Date(Date.now() + 30 * 86400000).toISOString()
  const past = new Date(Date.now() - 30 * 86400000).toISOString()
  const base = { academicSemesterId: 1, semesterCode: 'HK1', semesterName: 'HK1', startAt: past, createdAt: past, updatedAt: past }
  vi.mocked(httpGet).mockResolvedValueOnce({ items: [
    { ...base, id: 10, code: 'REG', name: 'HK1 Đăng ký', periodType: 'REGISTRATION', status: 'ACTIVE', endAt: future },
    { ...base, id: 11, code: 'EXEC', name: 'HK1 Thực hiện', periodType: 'EXECUTION', status: 'ACTIVE', endAt: future },
    { ...base, id: 12, code: 'EXEC-OLD', name: 'HK0 Thực hiện', periodType: 'EXECUTION', status: 'CLOSED', endAt: future },
    { ...base, id: 13, code: 'EXEC-END', name: 'HK9 Thực hiện', periodType: 'EXECUTION', status: 'ACTIVE', endAt: past },
  ] })
  api.getMilestoneTemplates.mockResolvedValue([{ ...template, versions: [{ ...template.versions[0], status: 'PUBLISHED' }] }])
  render(<MemoryRouter><MilestoneTemplatesPage /></MemoryRouter>)
  fireEvent.click(await screen.findByRole('button', { name: /Mẫu chuẩn/ }))
  const select = screen.getByLabelText('Kỳ Thực hiện')
  const labels = within(select).getAllByRole('option').map(o => o.textContent)
  expect(labels).toEqual(['Chọn kỳ Thực hiện', 'HK1 Thực hiện (Đang mở)'])
})
it('sends a trimmed template name and description', async () => {
  render(<MemoryRouter><MilestoneTemplatesPage /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'Tạo mẫu' }))
  fireEvent.change(screen.getByLabelText('Tên mẫu'), { target: { value: '  Chuẩn đầu ra  ' } })
  fireEvent.click(screen.getByRole('button', { name: 'Lưu mẫu' }))
  await waitFor(() => expect(api.createMilestoneTemplate).toHaveBeenCalledWith({ name: 'Chuẩn đầu ra', description: null }))
})
