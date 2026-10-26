import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PeriodPolicyManagementPage } from './PeriodPolicyManagementPage'
import { HttpError } from '../../../services/http/http-client'
import type { PeriodPolicy } from '../api/period-policy-api'

const api = vi.hoisted(() => ({ getPeriodPolicyHistory: vi.fn(), getEffectivePeriodPolicy: vi.fn(), savePeriodPolicy: vi.fn() }))
vi.mock('../api/period-policy-api', () => api)
vi.mock('../components/QualificationPolicyPanel', () => ({ QualificationPolicyPanel: () => null }))
const draft: PeriodPolicy = { id: 2, projectPeriodId: 4, version: 2, status: 'DRAFT', effectiveFrom: '2026-10-01T00:00:00Z', effectiveTo: '2099-12-01T00:00:00Z', concurrencyToken: 'old-token', policy: { allowedProjectModes: 'SINGLE_MAJOR', allowedProposalSources: 'STUDENT_PROPOSAL', minTeamSize: 2, maxTeamSize: 4, minDistinctMajors: 1, maxProjectsPerSupervisor: 5 } }
const published = { ...draft, id: 1, version: 1, status: 'PUBLISHED', concurrencyToken: 'locked-token' }
const page = () => render(<MemoryRouter initialEntries={['/academic/governance/periods/4/policy']}><Routes><Route path="/academic/governance/periods/:periodId/policy" element={<PeriodPolicyManagementPage />} /></Routes></MemoryRouter>)
beforeEach(() => { api.getPeriodPolicyHistory.mockResolvedValue([draft, published]); api.getEffectivePeriodPolicy.mockResolvedValue(published) })
afterEach(() => { cleanup(); vi.resetAllMocks() })
const submit = () => fireEvent.submit(screen.getByLabelText('Thành viên tối đa').closest('form')!)

it('keeps edits after 409 but blocks stale writes until the freshly loaded draft is explicitly selected', async () => {
  const fresh = { ...draft, concurrencyToken: 'fresh-token', policy: { ...draft.policy, maxTeamSize: 5 } }
  page(); fireEvent.click(await screen.findByRole('button', { name: /Phiên bản 2/ }))
  fireEvent.change(screen.getByLabelText('Thành viên tối đa'), { target: { value: '6' } })
  api.savePeriodPolicy.mockRejectedValueOnce(new HttpError('Conflict', 409)).mockResolvedValue(fresh)
  api.getPeriodPolicyHistory.mockResolvedValue([fresh, published])
  submit(); await screen.findByRole('alert')
  expect((screen.getByLabelText('Thành viên tối đa') as HTMLInputElement).value).toBe('6')
  expect((screen.getByLabelText('Thành viên tối đa') as HTMLInputElement).disabled).toBe(true)
  submit(); expect(api.savePeriodPolicy).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: /Phiên bản 2/ }))
  expect((screen.getByLabelText('Thành viên tối đa') as HTMLInputElement).value).toBe('5')
  submit()
  await waitFor(() => expect(api.savePeriodPolicy).toHaveBeenLastCalledWith(4, expect.objectContaining({ operation: 'UPDATE_DRAFT', concurrencyToken: 'fresh-token', expectedVersion: 2 })))
})
it('leaves the preserved draft locked and removes stale history when conflict reload is forbidden', async () => {
  page(); fireEvent.click(await screen.findByRole('button', { name: /Phiên bản 2/ }))
  api.savePeriodPolicy.mockRejectedValue(new HttpError('Conflict', 409))
  api.getPeriodPolicyHistory.mockRejectedValue(new HttpError('Forbidden', 403))
  submit(); await screen.findByRole('alert')
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Bạn chưa có quyền quản lý chính sách'))
  expect(screen.queryByRole('button', { name: 'Tải lại dữ liệu' })).toBeNull()
  expect(screen.queryByRole('button', { name: /Phiên bản 2/ })).toBeNull()
  expect((screen.getByLabelText('Thành viên tối đa') as HTMLInputElement).disabled).toBe(true)
  submit(); expect(api.savePeriodPolicy).toHaveBeenCalledTimes(1)
})

it('translates field validation beside the control without exposing server prose or trace ID', async () => {
  page(); fireEvent.click(await screen.findByRole('button', { name: /Phiên bản 2/ }))
  fireEvent.change(screen.getByLabelText('Thành viên tối đa'), { target: { value: '6' } })
  api.savePeriodPolicy.mockRejectedValue(new HttpError('PRIVATE_ERROR', 422, {
    detail: 'PRIVATE_DETAIL', traceId: 'PRIVATE_TRACE', errors: { 'Policy.MaxTeamSize': ['PRIVATE_FIELD'] },
  }))
  submit(); await screen.findByRole('alert')
  const input = screen.getByLabelText('Thành viên tối đa') as HTMLInputElement
  expect(input.value).toBe('6')
  expect(input.disabled).toBe(false)
  expect(input.getAttribute('aria-invalid')).toBe('true')
  expect(document.getElementById(input.getAttribute('aria-describedby')!)?.textContent).toContain('số thành viên tối đa')
  expect(screen.queryByRole('button', { name: 'Thử lại' })).toBeNull()
  expect(document.body.textContent).not.toContain('PRIVATE')
})
it('keeps published history immutable and creates a separate successor using the latest BE version', async () => {
  api.getPeriodPolicyHistory.mockResolvedValue([published])
  page(); await screen.findByRole('button', { name: /Phiên bản 1/ })
  expect((screen.getByRole('button', { name: /Phiên bản 1/ }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Tạo bản kế tiếp' }))
  expect(api.savePeriodPolicy).not.toHaveBeenCalled()
  api.savePeriodPolicy.mockResolvedValue(draft)
  submit()
  await waitFor(() => expect(api.savePeriodPolicy).toHaveBeenCalledTimes(1))
  expect(api.savePeriodPolicy.mock.calls[0][1]).toMatchObject({ operation: 'SUCCESSOR', expectedVersion: 1, policy: published.policy })
  expect(api.savePeriodPolicy.mock.calls[0][1]).not.toHaveProperty('concurrencyToken')
})
it('requires editing the existing draft before a successor can be created', async () => {
  page(); await screen.findByRole('button', { name: /Phiên bản 2/ })
  expect((screen.getByRole('button', { name: 'Tạo bản kế tiếp' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Tạo bản kế tiếp' }))
  expect(screen.queryByLabelText('Thành viên tối đa')).toBeNull()
  expect(api.savePeriodPolicy).not.toHaveBeenCalled()
})
it('retains editable input after validation rejection without claiming success', async () => {
  page(); fireEvent.click(await screen.findByRole('button', { name: /Phiên bản 2/ }))
  api.savePeriodPolicy.mockRejectedValue(new HttpError('Invalid policy', 400))
  submit(); await screen.findByRole('alert')
  expect((screen.getByLabelText('Thành viên tối đa') as HTMLInputElement).disabled).toBe(false)
  expect(screen.queryByText('Đã lưu bản nháp chính sách.')).toBeNull()
})
it('toggles requireWorkingAgreement and includes it in save payload', async () => {
  page(); fireEvent.click(await screen.findByRole('button', { name: /Phiên bản 2/ }))
  const checkbox = screen.getByLabelText(/Bắt buộc có Thỏa thuận làm việc nhóm/) as HTMLInputElement
  expect(checkbox.checked).toBe(false)
  fireEvent.click(checkbox)
  expect(checkbox.checked).toBe(true)
  api.savePeriodPolicy.mockResolvedValue({ ...draft, policy: { ...draft.policy, requireWorkingAgreement: true } })
  submit()
  await waitFor(() => expect(api.savePeriodPolicy).toHaveBeenCalledWith(4, expect.objectContaining({
    policy: expect.objectContaining({ requireWorkingAgreement: true })
  })))
})
