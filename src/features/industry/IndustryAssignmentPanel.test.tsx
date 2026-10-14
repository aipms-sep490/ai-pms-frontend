import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { IndustryAssignmentPanel } from './IndustryAssignmentPanel'

const mocks = vi.hoisted(() => ({
  getProjectIndustryAssignments: vi.fn(),
  assignIndustryExpert: vi.fn(),
  revokeIndustryAssignment: vi.fn(),
  getIndustryEvidence: vi.fn(),
  shareIndustryEvidence: vi.fn(),
  unshareIndustryEvidence: vi.fn(),
  getIndustryFeedbackHistory: vi.fn(),
  getDeliverables: vi.fn(),
  getDeliverableVersions: vi.fn(),
}))
vi.mock('./industry-api', async () => {
  const actual = await vi.importActual<typeof import('./industry-api')>('./industry-api')
  return {
    ...actual,
    getProjectIndustryAssignments: mocks.getProjectIndustryAssignments, assignIndustryExpert: mocks.assignIndustryExpert,
    revokeIndustryAssignment: mocks.revokeIndustryAssignment, getIndustryEvidence: mocks.getIndustryEvidence,
    shareIndustryEvidence: mocks.shareIndustryEvidence, unshareIndustryEvidence: mocks.unshareIndustryEvidence,
    getIndustryFeedbackHistory: mocks.getIndustryFeedbackHistory,
  }
})
vi.mock('../../services/api/deliverables.api', () => ({ getDeliverables: mocks.getDeliverables, getDeliverableVersions: mocks.getDeliverableVersions }))

const page = <T,>(items: T[]) => ({ items, page: 1, pageSize: 100, totalCount: items.length })
const assignment = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 7, projectId: 9, projectCode: 'P9', projectTitle: 'Demo', expertId: 3, scope: 'COMMON', majorId: null,
  startsAt: '2026-10-01T00:00:00Z', endsAt: '2026-12-01T00:00:00Z', status: 'ACTIVE', concurrencyToken: 'tok',
  allowedActions: ['READ', 'REVOKE', 'UNSHARE', 'SHARE'], advisoryOnly: true, ...over,
})
const majors = [{ id: 1, majorId: 5, majorCode: 'SE', majorName: 'Kỹ thuật phần mềm' }]

function setupDefaults() {
  mocks.getIndustryEvidence.mockResolvedValue(page([]))
  mocks.getIndustryFeedbackHistory.mockResolvedValue(page([]))
}

afterEach(() => { cleanup(); vi.resetAllMocks() })

describe('IndustryAssignmentPanel', () => {
  it('lists assignments with status and scope', async () => {
    setupDefaults()
    mocks.getProjectIndustryAssignments.mockResolvedValue(page([assignment()]))
    render(<IndustryAssignmentPanel projectId={9} projectStatus="ACTIVE" projectMajors={majors} />)
    expect(await screen.findByText('Chuyên gia #3 · Chung')).toBeTruthy()
    expect(screen.getByText('Đang hoạt động')).toBeTruthy()
  })

  it('requires a major when scope is MAJOR_SPECIFIC', async () => {
    setupDefaults()
    mocks.getProjectIndustryAssignments.mockResolvedValue(page([]))
    render(<IndustryAssignmentPanel projectId={9} projectStatus="ACTIVE" projectMajors={majors} />)
    await screen.findByText('Chưa có cố vấn doanh nghiệp nào.')
    fireEvent.change(screen.getByLabelText('Mã chuyên gia'), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText('Phạm vi'), { target: { value: 'MAJOR_SPECIFIC' } })
    fireEvent.change(screen.getByLabelText('Bắt đầu'), { target: { value: '2026-10-01T00:00' } })
    fireEvent.change(screen.getByLabelText('Kết thúc'), { target: { value: '2026-12-01T00:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gán chuyên gia' }))
    expect(mocks.assignIndustryExpert).not.toHaveBeenCalled()
    expect(await screen.findByRole('alert')).toBeTruthy()
  })

  it('assigns a COMMON-scope expert and refetches', async () => {
    setupDefaults()
    mocks.getProjectIndustryAssignments.mockResolvedValueOnce(page([])).mockResolvedValueOnce(page([assignment()]))
    mocks.assignIndustryExpert.mockResolvedValue(assignment())
    render(<IndustryAssignmentPanel projectId={9} projectStatus="ACTIVE" projectMajors={majors} />)
    await screen.findByText('Chưa có cố vấn doanh nghiệp nào.')
    fireEvent.change(screen.getByLabelText('Mã chuyên gia'), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText('Bắt đầu'), { target: { value: '2026-10-01T00:00' } })
    fireEvent.change(screen.getByLabelText('Kết thúc'), { target: { value: '2026-12-01T00:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gán chuyên gia' }))
    await waitFor(() => expect(mocks.assignIndustryExpert).toHaveBeenCalledWith(9, expect.objectContaining({ expertId: 3, scope: 'COMMON', majorId: undefined })))
    expect(await screen.findByText('Đã gán chuyên gia cho đồ án.')).toBeTruthy()
  })

  it('only shows revoke when the backend allows it', async () => {
    setupDefaults()
    mocks.getProjectIndustryAssignments.mockResolvedValue(page([assignment({ allowedActions: ['READ'] })]))
    render(<IndustryAssignmentPanel projectId={9} projectStatus="ACTIVE" projectMajors={majors} />)
    await screen.findByText('Chuyên gia #3 · Chung')
    expect(screen.queryByRole('button', { name: 'Thu hồi' })).toBeNull()
  })

  it('revokes an assignment and refetches', async () => {
    setupDefaults()
    mocks.getProjectIndustryAssignments.mockResolvedValueOnce(page([assignment()])).mockResolvedValueOnce(page([assignment({ status: 'REVOKED', allowedActions: ['READ'] })]))
    mocks.revokeIndustryAssignment.mockResolvedValue(assignment({ status: 'REVOKED' }))
    render(<IndustryAssignmentPanel projectId={9} projectStatus="ACTIVE" projectMajors={majors} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Thu hồi' }))
    await waitFor(() => expect(mocks.revokeIndustryAssignment).toHaveBeenCalledWith(7, 'tok'))
    expect(await screen.findByText('Đã thu hồi phân công.')).toBeTruthy()
  })

  it('shares a file picked from the latest deliverable version', async () => {
    mocks.getIndustryFeedbackHistory.mockResolvedValue(page([]))
    mocks.getIndustryEvidence.mockResolvedValue(page([]))
    mocks.getProjectIndustryAssignments.mockResolvedValue(page([assignment()]))
    mocks.getDeliverables.mockResolvedValue(page([{ id: 1, title: 'SRS' }]))
    mocks.getDeliverableVersions.mockResolvedValue(page([{ id: 2, files: [{ id: 4, fileName: 'srs.pdf' }] }]))
    mocks.shareIndustryEvidence.mockResolvedValue({})
    render(<IndustryAssignmentPanel projectId={9} projectStatus="ACTIVE" projectMajors={majors} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Chia sẻ minh chứng' }))
    const select = await screen.findByLabelText('Bàn giao')
    await screen.findByRole('option', { name: 'SRS' }) // wait for getDeliverables to resolve before setting the select's value
    fireEvent.change(select, { target: { value: '1' } })
    await waitFor(() => expect(mocks.getDeliverableVersions).toHaveBeenCalledWith(1, 1, 1))
    expect(await screen.findByText('srs.pdf')).toBeTruthy()
    fireEvent.click(await screen.findByRole('button', { name: 'Chia sẻ' }))
    await waitFor(() => expect(mocks.shareIndustryEvidence).toHaveBeenCalledWith(7, { concurrencyToken: 'tok', deliverableVersionId: 2, fileId: 4 }))
  })

  it('does not offer the assignment form when the project is read-only', async () => {
    setupDefaults()
    mocks.getProjectIndustryAssignments.mockResolvedValue(page([]))
    render(<IndustryAssignmentPanel projectId={9} projectStatus="COMPLETED" projectMajors={majors} />)
    await screen.findByText('Đồ án không ở trạng thái cho phép gán cố vấn.')
    expect(screen.queryByLabelText('Mã chuyên gia')).toBeNull()
  })
})
