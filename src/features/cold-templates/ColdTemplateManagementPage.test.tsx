import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { HttpError } from '../../services/http/http-client'
import { ColdTemplateManagementPage } from './ColdTemplateManagementPage'
import type { ColdTemplate } from '../../services/api/cold-templates.api'

const api = vi.hoisted(() => ({ getColdTemplateItExample: vi.fn(), getColdTemplates: vi.fn(), createColdTemplate: vi.fn() }))
vi.mock('../../services/api/cold-templates.api', () => api)

const coldApi = vi.hoisted(() => ({ applyColdChecklist: vi.fn() }))
vi.mock('../../services/api/cold.api', () => coldApi)

const demoSession = { accessToken: 'test' }
vi.mock('../auth/context/useAuthSession', () => ({ useAuthSession: () => ({ session: demoSession }) }))
vi.mock('../academic/api/academic-api', () => ({ getAcademicHierarchy: () => Promise.resolve([{ departments: [{ department: { id: 1 }, majors: [{ id: 12, code: 'MKT', name: 'Marketing' }, { id: 99, code: 'SE', name: 'Phần mềm' }] }] }]) }))
vi.mock('../academic/api/governance-api', () => ({ getProjectPeriods: () => Promise.resolve({ items: [{ id: 34, code: 'EVAL', name: 'Đánh giá cuối kỳ', periodType: 'EVALUATION' }, { id: 1, code: 'FINAL', name: 'Nộp cuối kỳ', periodType: 'FINAL_SUBMISSION' }], page: 1, pageSize: 100, totalCount: 2, totalPages: 1 }) }))
vi.mock('../../services/api/projects.api', () => ({ getProjects: () => Promise.resolve({ items: [{ id: 101, title: 'Đồ án demo', code: 'P1' }], page: 1, pageSize: 100, totalCount: 1, totalPages: 1 }) }))
vi.mock('../projects/api/project-review-api', () => ({ getReviewDetail: () => Promise.resolve({ latestSubmission: { evidence: { members: [] } } }) }))
async function renderCold() {
  render(<ColdTemplateManagementPage />)
  await screen.findAllByRole('option', { name: 'Marketing (MKT)' })
}

const template: ColdTemplate = {
  id: 1, majorId: 12, projectPeriodId: 34, name: 'Marketing research reports', version: 1,
  reports: [{ code: 'MARKET_RESEARCH', name: 'Market research', required: true }],
}

beforeEach(() => vi.resetAllMocks())
afterEach(cleanup)

describe('ColdTemplateManagementPage', () => {
  it('searches templates by major and period and lists them', async () => {
    api.getColdTemplates.mockResolvedValue({ items: [template], page: 1, pageSize: 50, totalCount: 1, totalPages: 1 })
    await renderCold()
    fireEvent.change(screen.getByLabelText('Ngành áp dụng'), { target: { value: '12' } })
    fireEvent.change(screen.getByLabelText('Kỳ đồ án áp dụng'), { target: { value: '34' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tìm' }))
    await waitFor(() => expect(api.getColdTemplates).toHaveBeenCalledWith(12, 34, 1, 50))
    expect(await screen.findByText('Marketing research reports (v1)', { selector: 'p' })).toBeTruthy()
    expect(screen.getByText(/MARKET_RESEARCH/)).toBeTruthy()
  })

  it('shows an empty state when the major/period has no templates yet', async () => {
    api.getColdTemplates.mockResolvedValue({ items: [], page: 1, pageSize: 50, totalCount: 0, totalPages: 0 })
    await renderCold()
    fireEvent.change(screen.getByLabelText('Ngành áp dụng'), { target: { value: '99' } })
    fireEvent.change(screen.getByLabelText('Kỳ đồ án áp dụng'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tìm' }))
    expect(await screen.findByText('Chưa có template cho ngành/kỳ này.')).toBeTruthy()
  })

  it('surfaces a department-scope message on 403', async () => {
    api.getColdTemplates.mockRejectedValue(new HttpError('forbidden', 403))
    await renderCold()
    fireEvent.change(screen.getByLabelText('Ngành áp dụng'), { target: { value: '12' } })
    fireEvent.change(screen.getByLabelText('Kỳ đồ án áp dụng'), { target: { value: '34' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tìm' }))
    expect((await screen.findByRole('alert')).textContent).toContain('chỉ được tạo template')
  })

  it('loads the IT example into the report rows for reference only', async () => {
    api.getColdTemplateItExample.mockResolvedValue([
      { code: 'PROJECT_INTRODUCTION', name: 'Project Introduction', required: true },
      { code: 'PROJECT_MANAGEMENT', name: 'Project Management', required: true },
    ])
    await renderCold()
    fireEvent.click(screen.getByRole('button', { name: /Dùng mẫu IT/ }))
    expect(await screen.findByDisplayValue('PROJECT_INTRODUCTION')).toBeTruthy()
    expect(screen.getByDisplayValue('PROJECT_MANAGEMENT')).toBeTruthy()
  })

  it('creates a template, drops incomplete rows and prepends the immutable result', async () => {
    api.createColdTemplate.mockResolvedValue({ ...template, id: 2, version: 1 })
    await renderCold()
    fireEvent.change(screen.getByLabelText('Ngành áp dụng'), { target: { value: '12' } })
    fireEvent.change(screen.getByLabelText('Kỳ đồ án áp dụng'), { target: { value: '34' } })
    fireEvent.change(screen.getByLabelText('Tên template'), { target: { value: 'Marketing research reports' } })
    fireEvent.change(screen.getByPlaceholderText('Mã report'), { target: { value: 'MARKET_RESEARCH' } })
    fireEvent.change(screen.getByPlaceholderText('Tên report'), { target: { value: 'Market research' } })
    fireEvent.click(screen.getByRole('button', { name: '+ Thêm report' }))
    fireEvent.click(screen.getByRole('button', { name: 'Tạo template' }))
    await waitFor(() => expect(api.createColdTemplate).toHaveBeenCalledWith({ majorId: 12, projectPeriodId: 34, name: 'Marketing research reports', reports: [{ code: 'MARKET_RESEARCH', name: 'Market research', required: true }] }))
    expect(await screen.findByText('Marketing research reports (v1)', { selector: 'p' })).toBeTruthy()
  })

  it('keeps create disabled until major, period, name and at least one complete row are set', async () => {
    await renderCold()
    const create = screen.getByRole('button', { name: 'Tạo template' }) as HTMLButtonElement
    expect(create.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Ngành áp dụng'), { target: { value: '12' } })
    fireEvent.change(screen.getByLabelText('Kỳ đồ án áp dụng'), { target: { value: '34' } })
    fireEvent.change(screen.getByLabelText('Tên template'), { target: { value: 'Tên' } })
    expect(create.disabled).toBe(true)
    fireEvent.change(screen.getByPlaceholderText('Mã report'), { target: { value: 'CODE' } })
    fireEvent.change(screen.getByPlaceholderText('Tên report'), { target: { value: 'Name' } })
    expect(create.disabled).toBe(false)
  })

  it('allows applying template checklist to a project with scope and deadline', async () => {
    coldApi.applyColdChecklist.mockResolvedValue({ id: 10, items: [{ id: 1 }] })
    api.getColdTemplates.mockResolvedValue({ items: [template], page: 1, pageSize: 50, totalCount: 1, totalPages: 1 })
    await renderCold()

    fireEvent.change(screen.getByLabelText('Đồ án áp dụng'), { target: { value: '101' } })
    fireEvent.change(screen.getByLabelText('Kỳ áp dụng'), { target: { value: '34' } })
    fireEvent.change(screen.getByLabelText('Hạn nộp báo cáo (Deadline)'), { target: { value: '2026-12-31T23:59' } })
    fireEvent.change(screen.getByLabelText('Ngành áp dụng'), { target: { value: '12' } })
    fireEvent.change(screen.getByLabelText('Kỳ đồ án áp dụng'), { target: { value: '34' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tìm' }))
    await screen.findByRole('option', { name: 'Marketing research reports (v1)' })
    fireEvent.change(screen.getByRole('option', { name: '-- Chọn template --' }).parentElement!, { target: { value: '1' } })

    const applyBtn = screen.getByRole('button', { name: 'Áp dụng checklist vào đồ án' })
    expect(applyBtn.hasAttribute('disabled')).toBe(false)
    fireEvent.click(applyBtn)

    await waitFor(() => {
      expect(coldApi.applyColdChecklist).toHaveBeenCalledWith(101, expect.objectContaining({
        projectPeriodId: 34,
        targets: [{ templateId: 1, scope: 'COMMON', studentId: null }],
      }))
    })

    expect(await screen.findByText(/Đã áp dụng checklist cho đồ án. Tổng số hạng mục: 1./)).toBeTruthy()
  })
})
