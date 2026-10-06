import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AssignmentManagementPanel } from './AssignmentManagementPanel'
const api = vi.hoisted(() => ({ getAssignments: vi.fn(), getCandidates: vi.fn(), getSupervisorAssignment: vi.fn(), replaceSupervisorAssignment: vi.fn(), endSupervisorAssignment: vi.fn() }))
vi.mock('../../../services/api/supervisors.api', () => api)
vi.mock('../api/assignment-management-api', () => api)
const assignment = { id: 4, supervisorName: 'Nguyễn An', supervisorProfileId: 8, isPrimary: true, endedAt: null }
beforeEach(() => { api.getAssignments.mockResolvedValue({ items: [assignment] }); api.getCandidates.mockResolvedValue({ items: [{ id: 9, fullName: 'Lê Bình', remainingSlots: 2 }] }); api.getSupervisorAssignment.mockResolvedValue(assignment); api.endSupervisorAssignment.mockResolvedValue({}) })
afterEach(() => { cleanup(); vi.clearAllMocks() })
async function confirmEnd() { fireEvent.click(await screen.findByRole('button', { name: 'Kết thúc phân công' })); fireEvent.change(screen.getByLabelText('Lý do thay đổi'), { target: { value: 'Thay đổi kế hoạch hướng dẫn' } }); fireEvent.click(screen.getAllByRole('button', { name: 'Kết thúc phân công' })[0]) }
it('reloads the assignment before ending it with a confirmed reason', async () => {
  render(<AssignmentManagementPanel projectId={2} canManage />)
  await confirmEnd()
  await waitFor(() => expect(api.endSupervisorAssignment).toHaveBeenCalledWith(4, 'Thay đổi kế hoạch hướng dẫn'))
  expect(api.getSupervisorAssignment).toHaveBeenCalledWith(4)
})
it('does not end an assignment that has already ended since the list loaded', async () => {
  api.getSupervisorAssignment.mockResolvedValue({ ...assignment, endedAt: '2026-10-06' })
  render(<AssignmentManagementPanel projectId={2} canManage />)
  await confirmEnd(); await screen.findByRole('alert')
  expect(api.endSupervisorAssignment).not.toHaveBeenCalled()
})
it('keeps assignment mutations hidden outside the management scope', async () => {
  render(<AssignmentManagementPanel projectId={2} canManage={false} />)
  await screen.findByText('Nguyễn An')
  expect(screen.queryByRole('button', { name: 'Kết thúc phân công' })).toBeNull()
  expect(api.getCandidates).not.toHaveBeenCalled()
})
