import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AcademicGovernancePage } from './AcademicGovernancePage'
import { PeriodPolicyManagementPage } from './PeriodPolicyManagementPage'
import type { PeriodPolicy, SavePeriodPolicyInput } from '../api/period-policy-api'
import type { ProjectPeriod, ProjectPeriodDraft, Semester } from '../types/governance.types'

const hook = vi.hoisted(() => ({ useAcademicGovernance: vi.fn() }))
const api = vi.hoisted(() => ({ getPeriodPolicyHistory: vi.fn(), getEffectivePeriodPolicy: vi.fn(), savePeriodPolicy: vi.fn() }))
vi.mock('../hooks/useAcademicGovernance', () => hook)
vi.mock('../api/period-policy-api', () => api)
vi.mock('../components/QualificationPolicyPanel', () => ({ QualificationPolicyPanel: () => null }))

const start = '2026-10-24T00:00'
const end = '2026-11-30T00:00'
const utcStart = '2026-10-23T17:00:00.000Z'
const utcEnd = '2026-11-29T17:00:00.000Z'
const semester: Semester = { id: 1, organizationId: 1, organizationCode: 'TEST', organizationName: 'Test', code: 'TZ26', name: 'Timezone semester', startDate: '2026-10-01', endDate: '2026-12-31', status: 'DRAFT', createdAt: '', updatedAt: '' }
const period: ProjectPeriod = { id: 4, academicSemesterId: 1, semesterCode: 'TZ26', semesterName: semester.name, code: 'TZ', name: 'Midnight period', periodType: 'REGISTRATION', startAt: utcStart, endAt: utcEnd, status: 'DRAFT', minTeamSize: 2, maxTeamSize: 5, minDistinctMajors: 1, maxProjectsPerSupervisor: 5, milestoneTemplateId: null, rubricId: null, createdAt: '', updatedAt: '' }
const draft: PeriodPolicy = { id: 2, projectPeriodId: 4, version: 2, status: 'DRAFT', effectiveFrom: utcStart, effectiveTo: utcEnd, concurrencyToken: 'token-2', policy: { allowedProjectModes: 'SINGLE_MAJOR', allowedProposalSources: 'STUDENT_PROPOSAL', minTeamSize: 2, maxTeamSize: 5, minDistinctMajors: 1, maxProjectsPerSupervisor: 5 } }
const published: PeriodPolicy = { ...draft, id: 1, version: 1, status: 'PUBLISHED' }
const state = () => ({ semesters: [semester], periods: [{ ...period }], error: null, loading: false, isForbidden: false, isUnauthorized: false, canManage: true, submitting: false, retry: vi.fn(), saveSemester: vi.fn(), saveProjectPeriod: vi.fn(), setStatus: vi.fn() })
const governancePage = () => render(<MemoryRouter><AcademicGovernancePage /></MemoryRouter>)
const policyPage = () => render(<MemoryRouter initialEntries={['/academic/project-periods/4/policy']}><Routes><Route path="/academic/project-periods/:periodId/policy" element={<PeriodPolicyManagementPage />} /></Routes></MemoryRouter>)
const submitPolicy = () => fireEvent.submit(screen.getByLabelText(/Bắt đầu hiệu lực/).closest('form')!)

beforeEach(() => {
  hook.useAcademicGovernance.mockReturnValue(state())
  api.getPeriodPolicyHistory.mockResolvedValue([draft, published])
  api.getEffectivePeriodPolicy.mockResolvedValue(published)
})
afterEach(() => { cleanup(); vi.resetAllMocks() })

describe('Vietnam academic time at the form boundary', () => {
  it.each(['2026-10-23T17:00:00', utcStart, '2026-10-24T00:00:00+07:00'])('reads server instant %s as Vietnam midnight in labels and edit inputs', value => {
    const current = state(); current.periods[0].startAt = value
    hook.useAcademicGovernance.mockReturnValue(current)
    governancePage()
    expect(screen.getByText(/00:00.*24\/10\/2026/)).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa cấu trúc' }))
    expect((screen.getByLabelText(/Bắt đầu.*giờ Việt Nam/) as HTMLInputElement).value).toBe(start)
  })

  it('sends an explicit UTC instant when creating a period at Vietnam midnight', async () => {
    const current = state(); hook.useAcademicGovernance.mockReturnValue(current)
    governancePage(); fireEvent.click(screen.getByRole('button', { name: 'Thêm giai đoạn' }))
    fireEvent.change(screen.getByLabelText('Học kỳ', { selector: 'select' }), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Mã giai đoạn'), { target: { value: 'MIDNIGHT' } })
    fireEvent.change(screen.getByLabelText('Tên giai đoạn'), { target: { value: 'Midnight test' } })
    fireEvent.change(screen.getByLabelText(/Bắt đầu.*giờ Việt Nam/), { target: { value: start } })
    fireEvent.change(screen.getByLabelText(/Kết thúc.*giờ Việt Nam/), { target: { value: end } })
    fireEvent.submit(screen.getByLabelText('Mã giai đoạn').closest('form')!)
    await waitFor(() => expect(current.saveProjectPeriod).toHaveBeenCalledWith(expect.objectContaining({ startAt: utcStart, endAt: utcEnd })))
  })

  it('keeps three period edit/save round trips stable even when datetime2 responses omit Z', async () => {
    const current = state(); hook.useAcademicGovernance.mockReturnValue(current)
    current.saveProjectPeriod.mockImplementation(async (input: ProjectPeriodDraft) => { current.periods[0] = { ...current.periods[0], ...input, startAt: input.startAt.replace(/Z$/, ''), endAt: input.endAt.replace(/Z$/, '') } as ProjectPeriod })
    governancePage()
    for (let index = 0; index < 3; index++) {
      fireEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa cấu trúc' }))
      expect((screen.getByLabelText(/Bắt đầu.*giờ Việt Nam/) as HTMLInputElement).value).toBe(start)
      fireEvent.submit(screen.getByLabelText('Mã giai đoạn').closest('form')!)
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
      expect(current.saveProjectPeriod).toHaveBeenLastCalledWith(expect.objectContaining({ startAt: utcStart, endAt: utcEnd }))
    }
    expect(current.saveProjectPeriod).toHaveBeenCalledTimes(3)
  })

  it('preserves semester DateOnly values rather than applying an instant timezone conversion', async () => {
    const current = state(); hook.useAcademicGovernance.mockReturnValue(current)
    governancePage(); expect(screen.getByText('01/10/2026')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa' }))
    expect((screen.getByLabelText('Bắt đầu', { exact: true }) as HTMLInputElement).value).toBe('2026-10-01')
    fireEvent.submit(screen.getByLabelText('Mã học kỳ').closest('form')!)
    await waitFor(() => expect(current.saveSemester).toHaveBeenCalledWith(expect.objectContaining({ startDate: '2026-10-01', endDate: '2026-12-31' })))
  })

  it('renders policy instants consistently and keeps three draft saves stable', async () => {
    let current = { ...draft, effectiveFrom: utcStart.replace(/Z$/, ''), effectiveTo: utcEnd.replace(/Z$/, '') }
    api.getPeriodPolicyHistory.mockImplementation(async () => [current, published])
    api.savePeriodPolicy.mockImplementation(async (_id: number, input: SavePeriodPolicyInput) => { current = { ...current, effectiveFrom: input.effectiveFrom.replace(/Z$/, ''), effectiveTo: input.effectiveTo.replace(/Z$/, '') }; return current })
    policyPage(); fireEvent.click(await screen.findByRole('button', { name: /Phiên bản 2/ }))
    expect(screen.getAllByText(/00:00.*24\/10\/2026/).length).toBeGreaterThan(0)
    for (let index = 0; index < 3; index++) {
      expect((screen.getByLabelText(/Bắt đầu hiệu lực.*giờ Việt Nam/) as HTMLInputElement).value).toBe(start)
      submitPolicy()
      await waitFor(() => expect(api.savePeriodPolicy).toHaveBeenCalledTimes(index + 1))
      await waitFor(() => expect((screen.getByRole('button', { name: 'Lưu bản nháp' }) as HTMLButtonElement).disabled).toBe(false))
      expect(api.savePeriodPolicy).toHaveBeenLastCalledWith(4, expect.objectContaining({ effectiveFrom: utcStart, effectiveTo: utcEnd, operation: 'UPDATE_DRAFT' }))
    }
  })

  it('creates a successor from the server-effective policy without inferring effectiveness from local time', async () => {
    api.getPeriodPolicyHistory.mockResolvedValue([published])
    policyPage(); await screen.findByRole('button', { name: /Phiên bản 1/ })
    expect((screen.getByRole('button', { name: 'Tạo bản kế tiếp' }) as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Tạo bản kế tiếp' }))
    submitPolicy()
    await waitFor(() => expect(api.savePeriodPolicy).toHaveBeenCalledTimes(1))
    const input = api.savePeriodPolicy.mock.calls[0][1] as SavePeriodPolicyInput
    expect(input.effectiveTo).toBe(utcEnd)
    expect(input.effectiveFrom).toMatch(/Z$/)
    expect(Math.abs(Date.parse(input.effectiveFrom) - Date.now())).toBeLessThan(61_000)
  })

  it('publishes using an absolute current instant and a Vietnam-normalized end', async () => {
    policyPage(); fireEvent.click(await screen.findByRole('button', { name: /Phiên bản 2/ }))
    const before = Date.now()
    fireEvent.click(screen.getByRole('button', { name: 'Công bố ngay' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Công bố chính sách' }))
    await waitFor(() => expect(api.savePeriodPolicy).toHaveBeenCalledTimes(1))
    const input = api.savePeriodPolicy.mock.calls[0][1] as SavePeriodPolicyInput
    expect(input).toMatchObject({ operation: 'PUBLISH', effectiveTo: utcEnd })
    expect(input.effectiveFrom).toMatch(/Z$/)
    expect(Date.parse(input.effectiveFrom)).toBeGreaterThanOrEqual(before)
    expect(Date.parse(input.effectiveFrom)).toBeLessThanOrEqual(Date.now())
  })

  it('rejects an empty policy end before publication confirmation without losing input', async () => {
    policyPage(); fireEvent.click(await screen.findByRole('button', { name: /Phiên bản 2/ }))
    fireEvent.change(screen.getByLabelText(/Kết thúc hiệu lực/), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Công bố ngay' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Khoảng hiệu lực')
    expect((screen.getByLabelText(/Bắt đầu hiệu lực/) as HTMLInputElement).value).toBe(start)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(api.savePeriodPolicy).not.toHaveBeenCalled()
  })
})
