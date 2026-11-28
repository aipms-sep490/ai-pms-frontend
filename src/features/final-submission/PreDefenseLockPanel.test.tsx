import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { HttpError } from '../../services/http/http-client'
import * as checklistApi from '../review-gates/api/project-checklists-api'
import { PreDefenseLockPanel } from './PreDefenseLockPanel'

vi.mock('../review-gates/api/project-checklists-api', () => ({
  getPreDefenseLockStatus: vi.fn(),
  supervisorDecideFinalLock: vi.fn(),
  forceLockFinal: vi.fn(),
  reopenFinalLock: vi.fn(),
  getProjectGateChecklist: vi.fn().mockRejectedValue(new HttpError('not found', 404)),
  updateProjectChecklistItem: vi.fn(),
}))

const mockedApi = vi.mocked(checklistApi)

afterEach(() => { cleanup(); vi.clearAllMocks() })

const baseStatus: checklistApi.PreDefenseLockStatusDto = {
  projectId: 12,
  projectStatus: 'ACTIVE',
  lockWorkflowStatus: 'PENDING_SUPERVISOR_LOCK',
  lockRequestedAt: '2026-10-01T08:00:00Z',
  lockRequestedBy: 5,
  lockedBySupervisorId: null,
  forceLockedBy: null,
  forceLockReason: null,
  coldManifestSha256: null,
  draftConcurrencyToken: 'tok-1',
  finalSubmissionId: null,
  coldPackageId: null,
}

describe('PreDefenseLockPanel', () => {
  it('allows primary supervisor to approve and lock Final + Cold with confirmation and shows SHA-256 manifest', async () => {
    mockedApi.getPreDefenseLockStatus.mockResolvedValue(baseStatus)
    mockedApi.supervisorDecideFinalLock.mockResolvedValue({
      ...baseStatus,
      projectStatus: 'FINAL_SUBMISSION',
      lockWorkflowStatus: 'LOCKED',
      lockedBySupervisorId: 9,
      coldManifestSha256: 'a'.repeat(64),
    })

    const onChanged = vi.fn()
    render(<PreDefenseLockPanel projectId={12} mode="supervisor" onChanged={onChanged} />)

    expect(await screen.findByText(/Chờ GVHD ký khóa/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Ký khóa Final & Cold' }))
    const confirmBtn = await screen.findByRole('button', { name: 'Xác nhận ký khóa' })
    fireEvent.click(confirmBtn)

    await waitFor(() => expect(mockedApi.supervisorDecideFinalLock).toHaveBeenCalledWith(12, {
      decision: 'LOCK',
      notes: undefined,
      concurrencyToken: 'tok-1',
    }))
    expect(onChanged).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('a'.repeat(64))).toBeTruthy()
  })

  it('requires notes before returning package to OPEN and surfaces GATE_3_NOT_PASSED conflict clearly', async () => {
    mockedApi.getPreDefenseLockStatus.mockResolvedValue(baseStatus)
    mockedApi.supervisorDecideFinalLock.mockRejectedValue(
      new HttpError('Gate 3 not passed', 409, { code: 'GATE_3_NOT_PASSED', detail: 'Gate 3 must pass.' }),
    )

    render(<PreDefenseLockPanel projectId={12} mode="supervisor" />)
    await screen.findByText(/Chờ GVHD ký khóa/i)

    fireEvent.click(screen.getByRole('button', { name: 'Trả về nhóm chỉnh sửa' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Vui lòng nhập ghi chú lý do')
    expect(mockedApi.supervisorDecideFinalLock).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Ký khóa Final & Cold' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Xác nhận ký khóa' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Gate 3')
  })

  it('allows lead department to reopen locked package and handles EVALUATION_ALREADY_STARTED 409', async () => {
    mockedApi.getPreDefenseLockStatus.mockResolvedValue({
      ...baseStatus,
      projectStatus: 'FINAL_SUBMISSION',
      lockWorkflowStatus: 'LOCKED',
      coldManifestSha256: 'b'.repeat(64),
    })
    mockedApi.reopenFinalLock.mockRejectedValue(
      new HttpError('Evaluation already started', 409, { code: 'EVALUATION_ALREADY_STARTED' }),
    )

    render(<PreDefenseLockPanel projectId={12} mode="department" />)
    await screen.findByText(/Đã khóa Final \+ Cold/i)

    const reasonInput = screen.getByLabelText(/Lý do nghiệp vụ/i)
    fireEvent.change(reasonInput, { target: { value: 'Sinh viên nộp nhầm phụ lục báo cáo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Mở lại hồ sơ (Reopen)' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Xác nhận mở lại' }))

    await waitFor(() => expect(mockedApi.reopenFinalLock).toHaveBeenCalledWith(12, {
      reason: 'Sinh viên nộp nhầm phụ lục báo cáo',
      concurrencyToken: 'tok-1',
    }))
    expect((await screen.findByRole('alert')).textContent).toContain('đã phát sinh phân công chấm')
  })
})
