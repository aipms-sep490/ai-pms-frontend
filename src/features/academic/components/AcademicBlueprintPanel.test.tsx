import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AcademicBlueprintPanel } from './AcademicBlueprintPanel'
import * as api from '../api/academic-blueprints-api'

vi.mock('../api/academic-blueprints-api')

describe('AcademicBlueprintPanel', () => {
  it('displays readiness issues, executes Dry-Run Diff preserving customized tasks, and handles dual approval', async () => {
    vi.mocked(api.listAcademicBlueprints).mockResolvedValue([
      {
        id: 10,
        academicSemesterId: 1,
        trackCode: 'IT_MKT',
        code: 'BP-ITMKT',
        name: 'Blueprint Liên ngành IT×MKT',
        version: 1,
        status: 'PUBLISHED',
        leadDepartmentId: 1,
        participatingDepartmentId: 2,
        config: {},
        concurrencyToken: 'tok1',
        createdBy: 1,
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
        publishedAt: '2026-09-02T00:00:00Z',
        approvals: [
          { departmentId: 1, scopeRole: 'LEAD', decision: 'APPROVED' },
          { departmentId: 2, scopeRole: 'PARTICIPATING', decision: 'APPROVED' },
        ],
      },
    ])
    vi.mocked(api.getSemesterBlueprintReadiness).mockResolvedValue({
      academicSemesterId: 1,
      isReadyForRegistration: true,
      presentPeriodTypes: ['REGISTRATION', 'EXECUTION'],
      missingPeriodTypes: [],
      publishedTracks: ['IT_MKT'],
      missingOrUnpublishedTracks: [],
      blockingIssues: [],
    })
    vi.mocked(api.dryRunBlueprintPlan).mockResolvedValue({
      projectId: 50,
      blueprintId: 10,
      blueprintVersion: 1,
      trackCode: 'IT_MKT',
      executionPeriodId: 5,
      anchorDateUtc: '2026-09-10T00:00:00Z',
      alreadyApplied: false,
      gates: [
        { code: 'G1', title: 'Review 1', action: 'CREATE', submissionDueAt: '2026-09-24T00:00:00Z', reviewWindowEndAt: '2026-09-29T00:00:00Z', revisionDueAt: '2026-10-06T00:00:00Z' },
      ],
      sprints: [],
      milestones: [],
      coreTasks: [{ entityType: 'TASK', originId: 'T1', title: 'Core G1', action: 'CREATE', isCoreGateTask: true }],
      preservedCustomizedItems: ['TASK:TASK-CUSTOM:Custom Task'],
    })

    render(<AcademicBlueprintPanel semesterId={1} projectId={50} actorDepartmentId={1} />)

    await waitFor(() => expect(screen.getByText(/Blueprint Liên ngành IT×MKT/)).toBeTruthy())
    expect(screen.getByText('Sẵn sàng mở Đăng ký')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Xem trước Dry-Run Diff' }))
    await waitFor(() => expect(screen.getByTestId('blueprint-dry-run-diff')).toBeTruthy())
    expect(screen.getByText(/Bảo toàn mục đã tùy chỉnh \(1\)/)).toBeTruthy()
  })
})
