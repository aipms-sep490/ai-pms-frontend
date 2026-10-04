import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MilestoneTemplatesPage } from './MilestoneTemplatesPage'
const api = vi.hoisted(() => ({ getMilestoneTemplates: vi.fn(), createMilestoneTemplate: vi.fn(), publishTemplateVersion: vi.fn(), assignMilestoneTemplate: vi.fn() }))
vi.mock('./milestone-templates-api', () => api)
vi.mock('../../services/http/http-client', async importOriginal => ({ ...await importOriginal<typeof import('../../services/http/http-client')>(), httpGet: vi.fn().mockResolvedValue({ items: [{ id: 2, name: 'Kỳ đồ án' }] }) }))
const template = { id: 1, name: 'Mẫu chuẩn', description: null, versions: [{ id: 5, versionNumber: 1, status: 'DRAFT', items: [{ id: 8, title: 'Nộp đề cương', sortOrder: 1, startOffsetDays: 0, dueOffsetDays: 7 }] }] }
beforeEach(() => { api.getMilestoneTemplates.mockResolvedValue([template]); api.publishTemplateVersion.mockResolvedValue(undefined); api.createMilestoneTemplate.mockResolvedValue({ id: 2 }) })
afterEach(() => { cleanup(); vi.clearAllMocks() })
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
it('sends a trimmed template name and description', async () => {
  render(<MemoryRouter><MilestoneTemplatesPage /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'Tạo mẫu' }))
  fireEvent.change(screen.getByLabelText('Tên mẫu'), { target: { value: '  Chuẩn đầu ra  ' } })
  fireEvent.click(screen.getByRole('button', { name: 'Lưu mẫu' }))
  await waitFor(() => expect(api.createMilestoneTemplate).toHaveBeenCalledWith({ name: 'Chuẩn đầu ra', description: null }))
})
