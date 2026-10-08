import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { HttpError } from '../../../services/http/http-client'
import { AssignmentManagementPanel } from './AssignmentManagementPanel'
const api = vi.hoisted(() => ({ getAssignments: vi.fn(), getReplacementCandidates: vi.fn(), getSupervisorAssignment: vi.fn(), replaceSupervisorAssignment: vi.fn(), endSupervisorAssignment: vi.fn() }))
vi.mock('../../../services/api/supervisors.api', () => api)
vi.mock('../api/assignment-management-api', () => api)
const assignment = { id: 4, supervisorName: 'Nguyễn An', supervisorProfileId: 8, isPrimary: false, majorId: 3, endedAt: null, allowedActions: [{ code: 'REPLACE', allowed: true }, { code: 'END', allowed: true }] }
const candidate = { candidate: { id: 9, fullName: 'Lê Bình', departmentName: 'IT', remainingSlots: 2, activeProjects: 1, semesterActiveProjects: 1, semesterLimit: 3 }, eligible: true, reasons: [], expertiseMatch: 'MATCHED', responsibleDepartmentId: 2 }
beforeEach(() => { api.getAssignments.mockResolvedValue({ items: [assignment] }); api.getReplacementCandidates.mockResolvedValue({ items: [candidate], totalCount: 21 }); api.getSupervisorAssignment.mockResolvedValue(assignment); api.endSupervisorAssignment.mockResolvedValue({}); api.replaceSupervisorAssignment.mockResolvedValue({}) })
afterEach(() => { cleanup(); vi.clearAllMocks() })
async function confirmEnd() { fireEvent.click(await screen.findByRole('button', { name: 'Kết thúc phân công' })); fireEvent.change(screen.getByLabelText('Lý do thay đổi'), { target: { value: 'Thay đổi kế hoạch' } }); fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Kết thúc phân công' })) }
it('honors participating mentor capability independently of broad governance props', async () => {
  render(<AssignmentManagementPanel projectId={2} canManage={false} canEnd={false} projectStatus="ACTIVE" />)
  await confirmEnd(); await waitFor(() => expect(api.endSupervisorAssignment).toHaveBeenCalledWith(4, 'Thay đổi kế hoạch'))
})
it('does not end an assignment when fresh capability was revoked', async () => {
  api.getSupervisorAssignment.mockResolvedValue({ ...assignment, allowedActions: [] })
  render(<AssignmentManagementPanel projectId={2} />)
  await confirmEnd(); await screen.findByRole('alert'); expect(api.endSupervisorAssignment).not.toHaveBeenCalled()
})
it('offers no writes for completed projects despite inconsistent action hints', async () => {
  render(<AssignmentManagementPanel projectId={2} canManage canEnd projectStatus="COMPLETED" />)
  await screen.findByText('Nguyễn An'); expect(screen.queryByRole('button', { name: 'Kết thúc phân công' })).toBeNull(); expect(screen.queryByRole('button', { name: 'Chọn người thay thế' })).toBeNull()
})
it('loads paginated assignment-specific candidates and confirms replacement', async () => {
  render(<AssignmentManagementPanel projectId={2} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Chọn người thay thế' }))
  fireEvent.change(await screen.findByLabelText('Giảng viên thay thế'), { target: { value: '9' } })
  expect(screen.getByText(/Còn 2 suất/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Ứng viên trang sau' }))
  await waitFor(() => expect(api.getReplacementCandidates).toHaveBeenLastCalledWith(4, 2, ''))
  fireEvent.change(await screen.findByLabelText('Giảng viên thay thế'), { target: { value: '9' } })
  fireEvent.click(screen.getByRole('button', { name: 'Thay giảng viên' }))
  fireEvent.change(screen.getByLabelText('Lý do thay đổi'), { target: { value: 'Bổ sung chuyên môn' } })
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Thay giảng viên' }))
  await waitFor(() => expect(api.replaceSupervisorAssignment).toHaveBeenCalledWith(4, 9, 'Bổ sung chuyên môn'))
})
it('refreshes a conflict without replaying the write', async () => {
  api.endSupervisorAssignment.mockRejectedValue(new HttpError('Changed', 409)); render(<AssignmentManagementPanel projectId={2} />)
  await confirmEnd(); await screen.findByRole('alert'); expect(api.endSupervisorAssignment).toHaveBeenCalledTimes(1); expect(api.getAssignments).toHaveBeenCalledTimes(2)
})
it('does not infer permission from canManage when server actions are absent', async () => {
  api.getAssignments.mockResolvedValue({ items: [{ ...assignment, allowedActions: null, reasons: ['ACADEMIC_SCOPE_UNKNOWN'] }] })
  render(<AssignmentManagementPanel projectId={2} canManage canEnd />)
  await screen.findByText('Chưa xác định được phạm vi học thuật của đồ án.'); expect(screen.queryByRole('button', { name: 'Chọn người thay thế' })).toBeNull()
})

it('explains the server scope denial without granting an action', async () => {
  api.getAssignments.mockResolvedValue({ items: [{ ...assignment, allowedActions: [], reasons: ['OUTSIDE_ASSIGNMENT_SCOPE'] }] })
  render(<AssignmentManagementPanel projectId={2} />)
  await screen.findByText('Phân công này nằm ngoài phạm vi khoa được phép xử lý.')
  expect(screen.queryByRole('button', { name: 'Kết thúc phân công' })).toBeNull()
})
