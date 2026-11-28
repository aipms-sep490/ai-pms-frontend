import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import * as resultsApi from '../../../services/api/project-results.api'
import { HttpError } from '../../../services/http/http-client'
import { SupervisorProjectResultPage } from './SupervisorProjectResultPage'

vi.mock('../../../services/api/project-results.api', () => ({
  getProjectResult: vi.fn(),
  getProjectStudentResults: vi.fn(),
}))

vi.mock('../../execution/context/ExecutionAccessContext', () => ({
  useExecutionAccess: () => ({
    routeBase: '/supervisor/projects/42',
    project: {
      id: 42,
      code: 'PRJ-IT-MKT-01',
      title: 'Hệ thống thương mại thông minh',
      status: 'COMPLETED',
      majors: [
        { majorId: 1, majorCode: 'SE', majorName: 'Kỹ thuật phần mềm' },
        { majorId: 2, majorCode: 'MKT', majorName: 'Marketing số' },
      ],
    },
    team: {
      members: [
        { userId: 101, fullName: 'Nguyễn Văn A' },
        { userId: 102, fullName: 'Trần Thị B' },
      ],
    },
  }),
}))

const mockedResults = vi.mocked(resultsApi)

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('SupervisorProjectResultPage', () => {
  it('shows N6 lock message when result is not yet published', async () => {
    mockedResults.getProjectResult.mockResolvedValue(null)
    mockedResults.getProjectStudentResults.mockResolvedValue(null)

    render(<MemoryRouter><SupervisorProjectResultPage /></MemoryRouter>)

    expect(await screen.findByText('Kết quả chưa được công bố chính thức')).toBeTruthy()
    expect(screen.getByText(/N6/i)).toBeTruthy()
  })

  it('renders published project score and individual student breakdowns with feedback', async () => {
    mockedResults.getProjectResult.mockResolvedValue({
      id: 500,
      projectId: 42,
      finalSubmissionId: 11,
      version: 1,
      policyConcurrencyToken: 'tok-pol',
      calculationRule: 'POL_V4_DECIMAL',
      passThreshold: 5,
      totalScore: 8.25,
      outcome: 'PASSED',
      outcomeDetail: 'PASSED',
      publishedBy: 2,
      publishedAt: '2026-10-20T08:00:00Z',
      contributions: [],
    })
    mockedResults.getProjectStudentResults.mockResolvedValue([
      {
        id: 601,
        projectId: 42,
        studentId: 101,
        majorId: 1,
        schemeId: 9,
        version: 1,
        passThreshold: 5,
        totalScore: 8.4,
        outcome: 'PASSED',
        outcomeDetail: 'PASSED',
        calculationRule: 'POL_V4_DECIMAL',
        publishedBy: 2,
        publishedAt: '2026-10-20T08:00:00Z',
        snapshotJson: '{}',
        breakdown: {
          schemeName: 'POL-01',
          schemeVersion: 1,
          calculationVersion: 'POL_V4_DECIMAL',
          isLegacy: false,
          isDemo: false,
          approvalStatus: 'APPROVED',
          readiness: 'READY',
          unroundedTotal: 8.4,
          commonScore: 8.4,
          majorAggregate: 8.4,
          majorBreakdown: [],
          components: [],
          publishedFeedback: [{ source: 'Hội đồng bảo vệ', comments: 'Trình bày mạch lạc, demo ổn định.' }],
        },
      },
    ])

    render(<MemoryRouter><SupervisorProjectResultPage /></MemoryRouter>)

    expect(await screen.findByText(/8[.,]25/)).toBeTruthy()
    expect(screen.getByText(/Nguyễn Văn A/)).toBeTruthy()
    expect(screen.getByText('8.4')).toBeTruthy()
    expect(screen.getByText(/Trình bày mạch lạc, demo ổn định\./)).toBeTruthy()
  })

  it('shows 403 permission error when caller is not active Primary Supervisor', async () => {
    mockedResults.getProjectResult.mockRejectedValue(new HttpError('Forbidden', 403))
    mockedResults.getProjectStudentResults.mockRejectedValue(new HttpError('Forbidden', 403))

    render(<MemoryRouter><SupervisorProjectResultPage /></MemoryRouter>)

    expect((await screen.findByRole('alert')).textContent).toContain('GVHD Chính')
  })
})
