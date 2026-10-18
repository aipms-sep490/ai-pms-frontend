import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { NextActionBanner } from './NextActionBanner'
import type {
  StudentGateInstance,
  StudentReviewTimelineDto,
} from '../../review-gates/types/review-gates.types'

afterEach(() => {
  cleanup()
})

const mockActiveGateRevision: StudentGateInstance = {
  gateInstanceId: 'inst-1',
  code: 'R2',
  title: 'Thẩm định Kiến trúc & Thiết kế kỹ thuật',
  objective: 'Đánh giá cấu trúc phần mềm và sơ đồ CSDL',
  status: 'REVISION_REQUIRED',
  reviewEligibility: 'READY',
  isRequired: true,
  windowStart: '2026-10-15',
  windowEnd: '2026-10-25',
  blockingReasons: [
    {
      code: 'REQ_REVISION',
      requirementCode: 'REQ-02',
      message: 'Sơ đồ ERD thiếu quan hệ phân quyền đa vai trò.',
    },
  ],
  requirements: [
    {
      id: 'req-1',
      code: 'REQ-01',
      title: 'Tài liệu kiến trúc hệ thống (SAD)',
      type: 'DOCUMENT',
      scope: 'COMMON',
      isMandatory: true,
      verificationStatus: 'ACCEPTED',
      latestArtifact: {
        version: 1,
        filename: 'sad-v1.pdf',
        submittedAt: '2026-10-18',
        submittedBy: 'Nguyễn Minh An',
      },
    },
    {
      id: 'req-2',
      code: 'REQ-02',
      title: 'Sơ đồ thiết kế cơ sở dữ liệu chi tiết (ERD)',
      type: 'DOCUMENT',
      scope: 'COMMON',
      isMandatory: true,
      verificationStatus: 'REJECTED',
      latestArtifact: {
        version: 1,
        filename: 'erd-v1.pdf',
        submittedAt: '2026-10-18',
        submittedBy: 'Nguyễn Minh An',
      },
      reviewerFeedback: 'Sơ đồ CSDL cần bổ sung bảng Audit Log và phân quyền RBAC.',
    },
  ],
}

const mockTimeline: StudentReviewTimelineDto = {
  projectId: '9',
  projectCode: 'PRJ-9',
  projectName: 'Hệ thống Quản lý Đồ án',
  projectMode: 'SINGLE_MAJOR',
  major: 'Kỹ thuật Phần mềm',
  effectivePolicyVersion: '1.0',
  currentGateCode: 'R2',
  gates: [mockActiveGateRevision],
  capabilities: {
    canSubmitPackage: true,
    canSubmitRevision: true,
    blockingReasons: [],
  },
}

describe('NextActionBanner', () => {
  it('renders fallback when no active gate is configured', () => {
    render(
      <MemoryRouter>
        <NextActionBanner
          timeline={null}
          activeGate={null}
          isLeader={true}
          closestMilestone={{
            id: 1,
            title: 'Khảo sát và đặc tả yêu cầu',
            dueDate: '2026-11-01',
            status: 'IN_PROGRESS',
          }}
          taskAttentionCount={{ overdue: 2, blocked: 1 }}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Việc cần làm tiếp theo')).toBeTruthy()
    expect(screen.getByText(/Mốc công việc: Khảo sát và đặc tả yêu cầu/)).toBeTruthy()
    expect(screen.getByText(/Có 2 việc quá hạn cần xử lý/)).toBeTruthy()
    expect(screen.getByRole('link', { name: /Xem bảng công việc/ })).toBeTruthy()
  })

  it('renders REVISION_REQUIRED gate with rejected requirements and reviewer notes for leader', async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined)

    render(
      <MemoryRouter>
        <NextActionBanner
          timeline={mockTimeline}
          activeGate={mockActiveGateRevision}
          isLeader={true}
          closestMilestone={{
            id: 1,
            title: 'Mốc 1',
            dueDate: '2026-10-25',
            status: 'IN_PROGRESS',
          }}
          onSubmitRevision={handleSubmit}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('R2')).toBeTruthy()
    expect(screen.getByText('Thẩm định Kiến trúc & Thiết kế kỹ thuật')).toBeTruthy()
    expect(screen.getByText('YÊU CẦU CHỈNH SỬA MINH CHỨNG')).toBeTruthy()
    expect(screen.getByText(/Sơ đồ CSDL cần bổ sung bảng Audit Log và phân quyền RBAC/)).toBeTruthy()
    expect(screen.getByText(/Trưởng nhóm sinh viên \(Leader\) nộp lại minh chứng bổ sung/)).toBeTruthy()
    expect(screen.getByText(/Sơ đồ ERD thiếu quan hệ phân quyền đa vai trò/)).toBeTruthy()

    // Leader sees submission action buttons
    const submitBtn = screen.getByRole('button', { name: /Nộp bản sửa đổi v2/ })
    expect(submitBtn).toBeTruthy()

    // Clicking opens submission modal
    fireEvent.click(submitBtn)
    expect(await screen.findByRole('dialog')).toBeTruthy()
    expect(screen.getByText(/Nộp bản sửa đổi · REQ-02/)).toBeTruthy()
  })

  it('renders role notice and restricts submission button when user is a Member, not Leader', () => {
    render(
      <MemoryRouter>
        <NextActionBanner
          timeline={mockTimeline}
          activeGate={mockActiveGateRevision}
          isLeader={false}
        />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('button', { name: /Nộp bản sửa đổi v2/ })).toBeNull()
    expect(screen.getByText('Trưởng nhóm nộp bản sửa đổi')).toBeTruthy()
    expect(screen.getByText(/Bạn đang ở vai trò Thành viên \(Member\)/)).toBeTruthy()
  })

  it('renders IN_REVIEW state correctly', () => {
    const inReviewGate: StudentGateInstance = {
      ...mockActiveGateRevision,
      status: 'IN_REVIEW',
      blockingReasons: [],
    }

    render(
      <MemoryRouter>
        <NextActionBanner
          timeline={mockTimeline}
          activeGate={inReviewGate}
          isLeader={true}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('ĐANG TRONG PHIÊN THẨM ĐỊNH HỘI ĐỒNG')).toBeTruthy()
    expect(screen.getByText(/Hội đồng thẩm định \/ Cán bộ phản biện đang chấm hồ sơ/)).toBeTruthy()
  })

  it('renders PASSED state correctly', () => {
    const passedGate: StudentGateInstance = {
      ...mockActiveGateRevision,
      status: 'PASSED',
      blockingReasons: [],
    }

    render(
      <MemoryRouter>
        <NextActionBanner
          timeline={mockTimeline}
          activeGate={passedGate}
          isLeader={true}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('ĐÃ ĐẠT CỔNG THẨM ĐỊNH')).toBeTruthy()
    expect(screen.getByText(/Hệ thống \/ Bộ môn sẽ kích hoạt đợt thẩm định tiếp theo/)).toBeTruthy()
  })
})
