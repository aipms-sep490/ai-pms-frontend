import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as projectsApi from '../../../services/api/projects.api'
import * as reviewGatesApi from '../api/review-gates-api'
import { GateCoordinationDrawer } from './GateCoordinationDrawer'

vi.mock('../../../services/api/projects.api')
vi.mock('../api/review-gates-api')

const mockProject = {
  projectId: '42',
  projectCode: 'PRJ-042',
  projectName: 'Hệ thống Liên ngành IT-MKT',
  major: 'IT / MKT',
  dept: 'CNTT',
  taskProgress: 50,
  mode: 'INTERDISCIPLINARY' as const,
  gateStatuses: { G1: 'IN_REVIEW' as const, G2: 'PLANNED' as const, G3: 'PLANNED' as const },
}

describe('GateCoordinationDrawer (TK-W2-08)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(projectsApi.getProject).mockResolvedValue({
      id: 42,
      majors: [
        { majorId: 1, majorName: 'Công nghệ thông tin', departmentId: 10 },
        { majorId: 2, majorName: 'Marketing số', departmentId: 20 },
      ],
    } as never)
    vi.mocked(reviewGatesApi.getReviewGateOverrideCapability).mockResolvedValue({ canOverrideGate: true })
    vi.mocked(reviewGatesApi.getStudentReviewTimeline).mockResolvedValue({
      projectId: '42',
      projectCode: 'PRJ-042',
      projectTitle: 'Hệ thống Liên ngành IT-MKT',
      gates: [
        {
          gateInstanceId: '701',
          code: 'G1',
          title: 'Cổng 1',
          mode: 'ONLINE',
          status: 'IN_REVIEW',
          dueAt: '2026-12-20T00:00:00Z',
          concurrencyToken: 'gate-tok-1',
          latestRoundNumber: 1,
          requirements: [],
        },
      ],
    } as never)
    vi.mocked(reviewGatesApi.getGateAssignments).mockResolvedValue([
      {
        id: 801,
        reviewerId: 301,
        reviewerName: 'ThS. Phản biện IT',
        scope: 'MAJOR_SPECIFIC',
        majorId: 1,
        majorName: 'Công nghệ thông tin',
        sessionRole: 'MEMBER',
        status: 'ACTIVE',
        latestDecision: null,
        concurrencyToken: 'asg-tok-1',
      },
    ])
    vi.mocked(reviewGatesApi.getGateReviewerCandidates).mockResolvedValue({
      items: [
        {
          userId: 302,
          fullName: 'ThS. Phản biện MKT',
          email: 'mkt.rev@aipms.edu.vn',
          isOnFixedProjectPanel: true,
        },
      ],
      totalCount: 1,
      page: 1,
      pageSize: 30,
    } as never)
    vi.mocked(reviewGatesApi.getGateRoundScopeConsensus).mockResolvedValue({
      roundNumber: 1,
      decisions: [
        { id: 1, scope: 'MAJOR:1', decision: 'PASSED', notes: 'IT đạt', concurrencyToken: 'dec-1' },
        { id: 2, scope: 'MAJOR:2', decision: 'PENDING', notes: null, concurrencyToken: 'dec-2' },
      ],
      consolidatedRevisionFeedback: null,
    } as never)
  })

  afterEach(() => {
    cleanup()
  })

  it('assigns a D17-filtered reviewer, records participating veto, and requires 20-char reason + confirmation for Lead Override', async () => {
    vi.mocked(reviewGatesApi.assignGateReviewer).mockResolvedValue({} as never)
    vi.mocked(reviewGatesApi.recordGateRoundScopeDecision).mockResolvedValue({
      roundNumber: 1,
      decisions: [
        { id: 1, scope: 'MAJOR:1', decision: 'PASSED', notes: 'IT đạt', concurrencyToken: 'dec-1' },
        { id: 2, scope: 'MAJOR:2', decision: 'REVISION_REQUIRED', notes: 'Cần bổ sung ngân sách MKT', concurrencyToken: 'dec-3' },
      ],
      consolidatedRevisionFeedback: 'Cần bổ sung ngân sách MKT',
    } as never)
    vi.mocked(reviewGatesApi.overrideReviewGate).mockResolvedValue({} as never)

    render(<GateCoordinationDrawer project={mockProject} />)

    await screen.findByText('ThS. Phản biện IT')
    expect(screen.getByText(/ThS. Phản biện MKT.*Hội đồng cố định/)).toBeTruthy()

    // 1. Assign reviewer
    fireEvent.click(screen.getByRole('button', { name: 'Gán phản biện' }))
    await waitFor(() => {
      expect(reviewGatesApi.assignGateReviewer).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: '42',
          gateCode: 'G1',
          reviewerId: 302,
          scope: 'MAJOR_SPECIFIC',
          majorId: 1,
          concurrencyToken: 'gate-tok-1',
        }),
      )
    })

    // 2. Participating scope decision
    fireEvent.change(screen.getByLabelText('Nhận xét chuyên môn vòng cổng'), {
      target: { value: 'Cần bổ sung ngân sách MKT' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Ghi nhận quyết định chuyên ngành' }))
    await waitFor(() => {
      expect(reviewGatesApi.recordGateRoundScopeDecision).toHaveBeenCalledWith(
        '42',
        'G1',
        expect.objectContaining({
          decision: 'REVISION_REQUIRED',
          notes: 'Cần bổ sung ngân sách MKT',
        }),
      )
    })

    // 3. Lead Override: disabled when < 20 chars, opens confirm dialog when >= 20 chars
    const overrideBtn = screen.getByRole('button', { name: 'Thực hiện Lead Override' })
    expect((overrideBtn as HTMLButtonElement).disabled).toBe(true)

    fireEvent.change(screen.getByLabelText('Lý do Override'), {
      target: { value: 'Biên bản hòa giải hai Khoa xác nhận nhóm đạt yêu cầu cổng 1.' },
    })
    expect((overrideBtn as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(overrideBtn)

    const confirmBtn = await screen.findByRole('button', { name: 'Xác nhận Override' })
    fireEvent.click(confirmBtn)
    await waitFor(() => {
      expect(reviewGatesApi.overrideReviewGate).toHaveBeenCalledWith('42', 'G1', {
        decision: 'PASSED',
        reason: 'Biên bản hòa giải hai Khoa xác nhận nhóm đạt yêu cầu cổng 1.',
        concurrencyToken: 'gate-tok-1',
      })
    })
  })

  it('shows Reopen section instead of Override when gate is locked PASSED/FAILED', async () => {
    vi.mocked(reviewGatesApi.getStudentReviewTimeline).mockResolvedValue({
      projectId: '42',
      projectCode: 'PRJ-042',
      projectTitle: 'Hệ thống Liên ngành IT-MKT',
      gates: [
        {
          gateInstanceId: '701',
          code: 'G1',
          title: 'Cổng 1',
          mode: 'ONLINE',
          status: 'PASSED',
          dueAt: '2026-12-20T00:00:00Z',
          concurrencyToken: 'gate-tok-locked',
          latestRoundNumber: 1,
          requirements: [],
        },
      ],
    } as never)
    vi.mocked(reviewGatesApi.reopenReviewGate).mockResolvedValue({} as never)

    render(
      <GateCoordinationDrawer
        project={{ ...mockProject, gateStatuses: { G1: 'PASSED', G2: 'PLANNED', G3: 'PLANNED' } }}
      />,
    )

    const reopenArea = await screen.findByLabelText('Lý do mở lại cổng')
    expect(screen.queryByRole('button', { name: 'Thực hiện Lead Override' })).toBeNull()

    fireEvent.change(reopenArea, {
      target: { value: 'Phát hiện thiếu phụ lục kiểm thử sau khi chốt cổng, mở lại có kiểm toán.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Mở lại cổng (Reopen)' }))

    const confirmBtn = await screen.findByRole('button', { name: 'Xác nhận mở lại cổng' })
    fireEvent.click(confirmBtn)
    await waitFor(() => {
      expect(reviewGatesApi.reopenReviewGate).toHaveBeenCalledWith('42', 'G1', {
        reason: 'Phát hiện thiếu phụ lục kiểm thử sau khi chốt cổng, mở lại có kiểm toán.',
        concurrencyToken: 'gate-tok-locked',
      })
    })
  })
})
