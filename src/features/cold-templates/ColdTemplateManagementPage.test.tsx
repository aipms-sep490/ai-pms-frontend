import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { HttpError } from '../../services/http/http-client'
import { ColdTemplateManagementPage } from './ColdTemplateManagementPage'
import type { ColdTemplate } from '../../services/api/cold-templates.api'

const api = vi.hoisted(() => ({ getColdTemplateItExample: vi.fn(), getColdTemplates: vi.fn(), createColdTemplate: vi.fn() }))
vi.mock('../../services/api/cold-templates.api', () => api)

const template: ColdTemplate = {
  id: 1, majorId: 12, projectPeriodId: 34, name: 'Marketing research reports', version: 1,
  reports: [{ code: 'MARKET_RESEARCH', name: 'Market research', required: true }],
}

beforeEach(() => vi.resetAllMocks())
afterEach(cleanup)

describe('ColdTemplateManagementPage', () => {
  it('searches templates by major and period and lists them', async () => {
    api.getColdTemplates.mockResolvedValue({ items: [template], page: 1, pageSize: 50, totalCount: 1, totalPages: 1 })
    render(<ColdTemplateManagementPage />)
    fireEvent.change(screen.getByLabelText('Mã ngành'), { target: { value: '12' } })
    fireEvent.change(screen.getByLabelText('Mã kỳ đồ án'), { target: { value: '34' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tìm' }))
    await waitFor(() => expect(api.getColdTemplates).toHaveBeenCalledWith(12, 34, 1, 50))
    expect(await screen.findByText('Marketing research reports (v1)')).toBeTruthy()
    expect(screen.getByText(/MARKET_RESEARCH/)).toBeTruthy()
  })

  it('shows an empty state when the major/period has no templates yet', async () => {
    api.getColdTemplates.mockResolvedValue({ items: [], page: 1, pageSize: 50, totalCount: 0, totalPages: 0 })
    render(<ColdTemplateManagementPage />)
    fireEvent.change(screen.getByLabelText('Mã ngành'), { target: { value: '99' } })
    fireEvent.change(screen.getByLabelText('Mã kỳ đồ án'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tìm' }))
    expect(await screen.findByText('Chưa có template cho ngành/kỳ này.')).toBeTruthy()
  })

  it('surfaces a department-scope message on 403', async () => {
    api.getColdTemplates.mockRejectedValue(new HttpError('forbidden', 403))
    render(<ColdTemplateManagementPage />)
    fireEvent.change(screen.getByLabelText('Mã ngành'), { target: { value: '12' } })
    fireEvent.change(screen.getByLabelText('Mã kỳ đồ án'), { target: { value: '34' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tìm' }))
    expect((await screen.findByRole('alert')).textContent).toContain('chỉ được tạo template')
  })

  it('loads the IT example into the report rows for reference only', async () => {
    api.getColdTemplateItExample.mockResolvedValue([
      { code: 'PROJECT_INTRODUCTION', name: 'Project Introduction', required: true },
      { code: 'PROJECT_MANAGEMENT', name: 'Project Management', required: true },
    ])
    render(<ColdTemplateManagementPage />)
    fireEvent.click(screen.getByRole('button', { name: /Dùng mẫu IT/ }))
    expect(await screen.findByDisplayValue('PROJECT_INTRODUCTION')).toBeTruthy()
    expect(screen.getByDisplayValue('PROJECT_MANAGEMENT')).toBeTruthy()
  })

  it('creates a template, drops incomplete rows and prepends the immutable result', async () => {
    api.createColdTemplate.mockResolvedValue({ ...template, id: 2, version: 1 })
    render(<ColdTemplateManagementPage />)
    fireEvent.change(screen.getByLabelText('Mã ngành'), { target: { value: '12' } })
    fireEvent.change(screen.getByLabelText('Mã kỳ đồ án'), { target: { value: '34' } })
    fireEvent.change(screen.getByLabelText('Tên template'), { target: { value: 'Marketing research reports' } })
    fireEvent.change(screen.getByPlaceholderText('Mã report'), { target: { value: 'MARKET_RESEARCH' } })
    fireEvent.change(screen.getByPlaceholderText('Tên report'), { target: { value: 'Market research' } })
    fireEvent.click(screen.getByRole('button', { name: '+ Thêm report' }))
    fireEvent.click(screen.getByRole('button', { name: 'Tạo template' }))
    await waitFor(() => expect(api.createColdTemplate).toHaveBeenCalledWith({ majorId: 12, projectPeriodId: 34, name: 'Marketing research reports', reports: [{ code: 'MARKET_RESEARCH', name: 'Market research', required: true }] }))
    expect(await screen.findByText('Marketing research reports (v1)')).toBeTruthy()
  })

  it('keeps create disabled until major, period, name and at least one complete row are set', () => {
    render(<ColdTemplateManagementPage />)
    const create = screen.getByRole('button', { name: 'Tạo template' }) as HTMLButtonElement
    expect(create.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Mã ngành'), { target: { value: '12' } })
    fireEvent.change(screen.getByLabelText('Mã kỳ đồ án'), { target: { value: '34' } })
    fireEvent.change(screen.getByLabelText('Tên template'), { target: { value: 'Tên' } })
    expect(create.disabled).toBe(true)
    fireEvent.change(screen.getByPlaceholderText('Mã report'), { target: { value: 'CODE' } })
    fireEvent.change(screen.getByPlaceholderText('Tên report'), { target: { value: 'Name' } })
    expect(create.disabled).toBe(false)
  })
})
