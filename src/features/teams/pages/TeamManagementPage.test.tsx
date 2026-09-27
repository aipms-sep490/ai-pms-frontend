import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { TeamManagementPage } from './TeamManagementPage'

const mocks = vi.hoisted(() => ({ useTeamManagement: vi.fn(), getMajors: vi.fn(), qualification: vi.fn(() => null) }))
vi.mock('../hooks/useTeamManagement', () => ({ useTeamManagement: mocks.useTeamManagement }))
vi.mock('../../../services/service-gateway', () => ({ services: { academic: { getMajors: mocks.getMajors } } }))
vi.mock('../../qualifications/components/StudentQualificationCard', () => ({ StudentQualificationCard: mocks.qualification }))
afterEach(() => { cleanup(); vi.clearAllMocks() })

const locked = {
  team: { id: 2, name: 'Nhóm đồ án', code: 'SE-2', status: 'LOCKED', members: [{ userId: 9, fullName: 'Mai Anh', majorId: 3, isLeader: true, isEligibleStudent: true }], eligibility: { canRegister: false, rosterLocked: true, reasons: ['ROSTER_LOCKED'] } },
  profile: { id: 9, fullName: 'Mai Anh', studentCode: 'SE123' }, semester: { name: 'Fall 2026' }, period: null,
  workflowContext: { academic: { organization: { id: 1 } } }, isLoading: false, currentUserId: 9, rosterLocked: true, permissions: {},
  sentInvitations: [], receivedInvitations: [], leaderChangeRequests: [], isMutationPending: () => false,
}
describe('Team workspace cleanup', () => {
  it('shows a finalized roster without a failed registration banner or empty invitation panels', async () => {
    mocks.getMajors.mockResolvedValue([{ id: 3, name: 'Kỹ thuật phần mềm' }])
    mocks.useTeamManagement.mockReturnValue(locked)
    render(<MemoryRouter><TeamManagementPage /></MemoryRouter>)
    expect(await screen.findByText('Kỹ thuật phần mềm')).toBeTruthy()
    expect(screen.queryByText(/FAIL|Nhóm cần hoàn thiện điều kiện đăng ký|Backend|Major #/)).toBeNull()
    expect(screen.queryByRole('button', { name: /Lời mời đã gửi/ })).toBeNull()
    expect(mocks.qualification).not.toHaveBeenCalled()
    expect(screen.getByText('Danh sách thành viên đã được chốt theo hồ sơ đồ án.')).toBeTruthy()
  })
  it('keeps loading neutral while team context is unknown', () => {
    mocks.useTeamManagement.mockReturnValue({ ...locked, isLoading: true, team: null, workflowContext: null })
    render(<MemoryRouter><TeamManagementPage /></MemoryRouter>)
    expect(screen.getByRole('status', { name: 'Đang tải…' })).toBeTruthy()
    expect(screen.queryByRole('heading')).toBeNull()
    expect(mocks.qualification).not.toHaveBeenCalled()
  })
})
