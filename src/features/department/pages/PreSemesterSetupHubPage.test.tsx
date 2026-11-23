import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PreSemesterSetupHubPage } from './PreSemesterSetupHubPage'
import * as preSemApi from '../api/pre-semester-api'
import * as govApi from '../../academic/api/governance-api'

vi.mock('../../auth/context/useAuthSession', () => ({
  useAuthSession: () => ({
    session: { accessToken: 'tok', user: { id: 1, roles: ['DEPARTMENT_STAFF'] } },
  }),
}))

vi.mock('../../academic/api/governance-api', () => ({
  getSemesters: vi.fn(),
}))

vi.mock('../api/pre-semester-api', () => ({
  getPreSemesterReadiness: vi.fn(),
  previewPreSemesterRollover: vi.fn(),
  applyPreSemesterRollover: vi.fn(),
  checkPreSemesterAiDiff: vi.fn(),
}))

describe('PreSemesterSetupHubPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(govApi.getSemesters).mockResolvedValue({
      items: [
        { id: 201, organizationId: 1, organizationCode: 'FPT', organizationName: 'FPT', code: 'SP26', name: 'Spring 2026', startDate: '2026-01-10', endDate: '2026-05-10', status: 'CLOSED', createdAt: '', updatedAt: '' },
        { id: 202, organizationId: 1, organizationCode: 'FPT', organizationName: 'FPT', code: 'FA26', name: 'Fall 2026', startDate: '2026-09-01', endDate: '2026-12-20', status: 'UPCOMING', createdAt: '', updatedAt: '' },
      ],
      page: 1,
      pageSize: 100,
      totalCount: 2,
    })
    vi.mocked(preSemApi.getPreSemesterReadiness).mockResolvedValue({
      semesterId: 202,
      semesterCode: 'FA26',
      semesterName: 'Fall 2026',
      semesterStatus: 'UPCOMING',
      departmentId: 10,
      departmentName: 'Bộ môn SE',
      isAdmin: false,
      isDepartmentStaff: true,
      readyCount: 1,
      totalRelevantCount: 6,
      items: [
        {
          key: 'RUBRICS',
          label: 'Bộ tiêu chí đánh giá (Rubrics)',
          description: 'Cây tiêu chí chấm điểm.',
          status: 'MISSING',
          totalCount: 0,
          draftCount: 0,
          publishedCount: 0,
          route: '/academic/rubrics',
          supportsRollover: true,
          supportsAiDraft: true,
          allowedByRole: true,
        },
        {
          key: 'MILESTONE_TEMPLATES',
          label: 'Mẫu mốc tiến độ dùng chung',
          description: 'Chỉ Quản trị viên.',
          status: 'READY',
          totalCount: 1,
          draftCount: 0,
          publishedCount: 1,
          route: '/admin/milestone-templates',
          supportsRollover: false,
          supportsAiDraft: true,
          allowedByRole: false,
        },
      ],
    })
  })

  it('renders checklist with role visibility and completes 3-step rollover wizard', async () => {
    vi.mocked(preSemApi.previewPreSemesterRollover).mockResolvedValue({
      sourceSemesterId: 201,
      sourceSemesterCode: 'SP26',
      targetSemesterId: 202,
      targetSemesterCode: 'FA26',
      shiftDays: 234,
      totalCandidates: 1,
      actionableCount: 1,
      items: [
        {
          category: 'RUBRIC',
          sourceId: 301,
          sourceCode: 'RUB_SE',
          sourceName: 'Rubric SE',
          proposedCode: 'RUB_SE_FA26',
          proposedName: 'Rubric SE (FA26)',
          willSkip: false,
          dateShifts: [],
        },
      ],
      warnings: [],
    })
    vi.mocked(preSemApi.applyPreSemesterRollover).mockResolvedValue({
      replay: false,
      createdCount: 1,
      skippedCount: 0,
      holidaysLoadedCount: 0,
      created: [{ category: 'RUBRIC', sourceId: 301, createdId: 901, code: 'RUB_SE_FA26', name: 'Rubric SE (FA26)', status: 'DRAFT' }],
      skipped: [],
      warnings: [],
    })

    render(
      <MemoryRouter>
        <PreSemesterSetupHubPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Bộ tiêu chí đánh giá (Rubrics)')).toBeTruthy()
    })
    expect(screen.getByText(/1\/6 hạng mục đã công bố/i)).toBeTruthy()

    // Open rollover wizard
    fireEvent.click(screen.getByRole('button', { name: 'Kế thừa nhanh từ kỳ trước' }))
    fireEvent.click(screen.getByRole('button', { name: 'Xem trước thay đổi' }))

    await waitFor(() => {
      expect(screen.getByText('RUB_SE_FA26')).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Tạo 1 bản nháp (DRAFT)' }))
    await waitFor(() => {
      expect(preSemApi.applyPreSemesterRollover).toHaveBeenCalledTimes(1)
      expect(screen.getByText(/Đã tạo 1 bản nháp \(DRAFT\)/i)).toBeTruthy()
    })
  })
})
