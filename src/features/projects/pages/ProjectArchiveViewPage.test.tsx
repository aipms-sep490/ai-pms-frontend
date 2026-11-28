import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProjectArchiveViewPage } from './ProjectArchiveViewPage'
import { HttpError } from '../../../services/http/http-client'

const archiveMocks = vi.hoisted(() => ({
  getArchiveDossier: vi.fn(),
  unarchiveProject: vi.fn(),
}))

const mockNavigate = vi.fn()

vi.mock('../api/archive-project', () => archiveMocks)
vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

const dossierFixture = {
  id: 42,
  code: 'PRJ-IT-042',
  title: 'Hệ thống Quản lý Đồ án',
  description: 'Đồ án thí điểm đã hoàn tất toàn bộ 7 phần hồ sơ kiểm định.',
  status: 'ARCHIVED',
  trackCode: 'IT_ONLY',
  semesterCode: 'PILOT-FALL2026',
  semesterName: 'Fall 2026 Pilot',
  leadDepartmentId: 10,
  leadDepartmentName: 'Khoa CNTT',
  departmentNames: ['Khoa CNTT'],
  majors: [{ majorId: 1, majorCode: 'SE', majorName: 'Kỹ thuật phần mềm', isPrimary: true }],
  registeredAt: '2026-09-10T00:00:00Z',
  submittedAt: '2026-09-15T00:00:00Z',
  approvedAt: '2026-09-20T00:00:00Z',
  completedAt: '2026-12-20T00:00:00Z',
  archivedAt: '2026-12-24T00:00:00Z',
  concurrencyToken: 'tok-archive-1',
  canUnarchive: true,
  members: [
    { userId: 101, studentCode: 'SE1801', fullName: 'Nguyễn Minh An', email: 'an@e2e.invalid', majorId: 1, majorName: 'Kỹ thuật phần mềm', isLeader: true },
  ],
  supervisors: [
    { userId: 201, fullName: 'TS. Trần Thị Hoa', email: 'hoa@e2e.invalid', assignmentType: 'PRIMARY', isPrimary: true, majorId: null, majorName: null, isActive: true, assignedAt: '2026-09-18T00:00:00Z', endedAt: null },
  ],
  results: {
    projectResult: { id: 1, projectId: 42, totalScore: 8.5, passThreshold: 5, outcome: 'PASSED', calculationRule: 'POL_V4_DECIMAL', publishedBy: 301, publishedAt: '2026-12-15T00:00:00Z', snapshotJson: '{}' },
    studentResults: [{ id: 11, projectId: 42, studentId: 101, majorId: 1, schemeId: 5, totalScore: 8.5, passThreshold: 5, outcome: 'PASSED', outcomeDetail: 'PASSED', version: 2, calculationRule: 'POL_V4_DECIMAL', publishedBy: 301, publishedAt: '2026-12-15T00:00:00Z', snapshotJson: '{}' }],
    revisionHistory: [{ version: 2, supersedesVersion: 1, totalScore: 8.5, outcome: 'PASSED', studentId: 101, studentName: 'Nguyễn Minh An', publishedAt: '2026-12-18T00:00:00Z' }],
  },
  defense: { committeeName: 'HĐ CNTT 01', committeeStatus: 'CONFIRMED', room: null, startAt: null, endAt: null, members: [] },
  finalSubmission: {
    finalSubmissionId: 99,
    submittedAt: '2026-12-10T00:00:00Z',
    lockedAt: '2026-12-11T00:00:00Z',
    lockedByName: 'TS. Trần Thị Hoa',
    items: [{ deliverableId: 501, title: 'Báo cáo tổng hợp', deliverableVersionId: 601, files: [{ fileId: 701, fileName: 'final-dossier.pdf', sha256: 'abc', sizeBytes: 20480, downloadUrl: '/files/701', majorId: null, scope: 'COMMON' }] }],
  },
  appeals: {
    totalCount: 1,
    acceptedCount: 1,
    rejectedCount: 0,
    withdrawnCount: 0,
    pendingCount: 0,
    items: [{ id: 81, source: 'STUDENT_APPEAL', appealKind: 'INDEPENDENT_80', targetLabel: 'Nguyễn Minh An', componentName: 'Cold', status: 'ACCEPTED', resultVersion: 1, requestedAt: '2026-12-16T00:00:00Z', decisionReason: 'Điều chỉnh điểm' }],
  },
  statusHistory: [{ id: 1, oldStatus: 'COMPLETED', newStatus: 'ARCHIVED', changedBy: 301, changedByName: 'Giáo vụ Khoa', reason: 'Đóng gói học kỳ', changedAt: '2026-12-24T00:00:00Z' }],
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/department/projects/42/archive-view']}>
      <Routes>
        <Route path="/department/projects/:projectId/archive-view" element={<ProjectArchiveViewPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  archiveMocks.getArchiveDossier.mockResolvedValue(dossierFixture)
})

afterEach(cleanup)

describe('ProjectArchiveViewPage (TK-W4-05)', () => {
  it('renders all 7 inspection dossier sections including non-blocking POL-06 defense & v2 revision', async () => {
    renderPage()
    expect(await screen.findByText(/PRJ-IT-042 · Hệ thống Quản lý Đồ án/)).toBeTruthy()
    expect(screen.getByText('2. Thành viên thực hiện (1)')).toBeTruthy()
    expect(screen.getByText('3. Giảng viên hướng dẫn & Mentor (1)')).toBeTruthy()
    expect(screen.getByText('4. Kết quả công bố & Lịch sử đính chính')).toBeTruthy()
    expect(screen.getByText('5. Hội đồng & Lịch bảo vệ')).toBeTruthy()
    expect(screen.getByText('6. Hồ sơ bàn giao cuối kỳ')).toBeTruthy()
    expect(screen.getByText(/7\. Tổng hợp Phúc khảo/)).toBeTruthy()
    expect(screen.getByText(/Chưa xếp lịch phòng bảo vệ \(chấm điểm độc lập theo POL-06\)/)).toBeTruthy()
    expect(screen.getByText('final-dossier.pdf (20.0 KB)')).toBeTruthy()
  })

  it('requires reason >= 10 chars for unarchive and shows 403/409 errors cleanly', async () => {
    archiveMocks.unarchiveProject
      .mockRejectedValueOnce(new HttpError('forbidden', 403))
      .mockResolvedValueOnce({ ...dossierFixture, status: 'COMPLETED' })
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Khôi phục về Hoàn thành' }))
    const submitBtn = screen.getByRole('button', { name: 'Xác nhận khôi phục' }) as HTMLButtonElement
    expect(submitBtn.disabled).toBe(true)

    fireEvent.change(screen.getByLabelText(/Lý do khôi phục/), { target: { value: 'Mở lại hậu kiểm theo quyết định hội đồng Khoa' } })
    expect(submitBtn.disabled).toBe(false)
    fireEvent.click(submitBtn)

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Chỉ Khoa chủ trì mới có quyền khôi phục đồ án lưu trữ.'))

    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận khôi phục' }))
    await waitFor(() => expect(archiveMocks.unarchiveProject).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/department/projects/review/42'))
  })

  it('hides unarchive CTA when canUnarchive is false and displays 403 error on denied dossier read', async () => {
    archiveMocks.getArchiveDossier.mockResolvedValueOnce({ ...dossierFixture, canUnarchive: false })
    renderPage()
    await screen.findByText(/PRJ-IT-042 · Hệ thống Quản lý Đồ án/)
    expect(screen.queryByRole('button', { name: 'Khôi phục về Hoàn thành' })).toBeNull()

    cleanup()
    archiveMocks.getArchiveDossier.mockRejectedValueOnce(new HttpError('denied', 403))
    renderPage()
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Hệ thống không cấp quyền xem đồ án lưu trữ này.'))
  })
})
