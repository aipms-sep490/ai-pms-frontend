import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '../../../services/http/http-client'

const mocks = vi.hoisted(() => ({
  useAuthSession: vi.fn(),
  useAcademicWorkflow: vi.fn(),
  getAcademicHierarchy: vi.fn(),
  listSpecializations: vi.fn(),
  listDepartmentStudents: vi.fn(),
  getDepartmentStudentDetail: vi.fn(),
  updateDepartmentStudentAcademic: vi.fn(),
  exportDepartmentStudents: vi.fn(),
  updateMyStudentAcademic: vi.fn(),
  getMyAcademicProfile: vi.fn(),
  verifyAcademicProfile: vi.fn(),
  rejectAcademicProfile: vi.fn(),
}))

vi.mock('../../auth/context/useAuthSession', () => ({ useAuthSession: mocks.useAuthSession }))
vi.mock('../../../app/context/useAcademicWorkflow', () => ({ useAcademicWorkflow: mocks.useAcademicWorkflow }))
vi.mock('../../academic/api/academic-api', () => ({ getAcademicHierarchy: mocks.getAcademicHierarchy }))
vi.mock('../api/department-students-api', () => ({
  listSpecializations: mocks.listSpecializations,
  createDepartmentSpecialization: vi.fn(),
  updateDepartmentSpecialization: vi.fn(),
  listDepartmentStudents: mocks.listDepartmentStudents,
  getDepartmentStudentDetail: mocks.getDepartmentStudentDetail,
  updateDepartmentStudentAcademic: mocks.updateDepartmentStudentAcademic,
  exportDepartmentStudents: mocks.exportDepartmentStudents,
  updateMyStudentAcademic: mocks.updateMyStudentAcademic,
}))
vi.mock('../../academic/api/profile-verification-api', async importOriginal => ({
  ...await importOriginal<typeof import('../../academic/api/profile-verification-api')>(),
  getMyAcademicProfile: mocks.getMyAcademicProfile,
  verifyAcademicProfile: mocks.verifyAcademicProfile,
  rejectAcademicProfile: mocks.rejectAcademicProfile,
}))

import { AcademicProfileSummary } from '../../academic/components/AcademicProfileSummary'
import { DepartmentStudentDetailPage } from './DepartmentStudentDetailPage'
import { DepartmentStudentsPage } from './DepartmentStudentsPage'

const sampleSpec = {
  id: 11,
  departmentId: 2,
  majorId: 20,
  majorCode: 'SE',
  majorName: 'Kỹ thuật phần mềm',
  code: 'SE-WEB',
  name: 'Kỹ thuật Web & Cloud',
  description: 'Phát triển web hiện đại',
  isActive: true,
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
}

const sampleStudent = {
  userId: 42,
  studentCode: 'SE180042',
  fullName: 'Nguyễn Minh Quân',
  email: 'quan@fpt.edu.vn',
  phone: '0901234567',
  status: 'ACTIVE',
  departmentId: 2,
  departmentName: 'Khoa CNTT',
  majorId: 20,
  majorCode: 'SE',
  majorName: 'Kỹ thuật phần mềm',
  classCode: 'SE1801',
  specializationId: 11,
  specializationCode: 'SE-WEB',
  specializationName: 'Kỹ thuật Web & Cloud',
  curriculumCode: 'K18_SE',
  academicProfileStatus: 'PENDING',
  qualificationStatus: 'VERIFIED',
  teamId: 9,
  teamCode: 'G09',
  isTeamLeader: true,
  projectId: 109,
  projectCode: 'PRJ-109',
  projectStatus: 'ACTIVE',
  lastLoginAt: '2026-11-20T03:00:00Z',
}

beforeEach(() => {
  mocks.useAuthSession.mockReturnValue({
    session: { accessToken: 'dept-token', user: { id: 1, roles: ['DEPARTMENT_STAFF'] } },
  })
  mocks.useAcademicWorkflow.mockReturnValue({
    academic: {
      departments: [{ id: 2, code: 'IT', name: 'Khoa CNTT' }],
      majors: [{ id: 20, code: 'SE', name: 'Kỹ thuật phần mềm' }],
      currentSemesters: [{ id: 5, code: 'FA26', name: 'Fall 2026' }],
      selectedSemester: { id: 5, code: 'FA26', name: 'Fall 2026' },
      hasActiveDepartmentScope: true,
    },
  })
  mocks.getAcademicHierarchy.mockResolvedValue([
    {
      organization: { id: 1, code: 'FPT', name: 'FPTU' },
      departments: [
        {
          department: { id: 2, code: 'IT', name: 'Khoa CNTT', isActive: true },
          majors: [{ id: 20, code: 'SE', name: 'Kỹ thuật phần mềm', isActive: true }],
        },
      ],
    },
  ])
  mocks.listSpecializations.mockResolvedValue([sampleSpec])
  mocks.listDepartmentStudents.mockResolvedValue({
    items: [sampleStudent],
    page: 1,
    pageSize: 20,
    totalCount: 1,
    totalPages: 1,
    stats: {
      totalStudents: 12,
      pendingVerificationCount: 4,
      qualifiedCount: 9,
      withoutTeamCount: 3,
    },
  })
  mocks.getDepartmentStudentDetail.mockResolvedValue({
    summary: sampleStudent,
    academicProfileRejectionReason: null,
    academicProfileReviewedAt: null,
    academicProfileReviewedBy: null,
    qualificationId: 77,
    trainingStatus: 'TRAINING_COMPLETED',
    certificateNumber: 'CERT-2026-42',
    certificateFileId: null,
    qualificationIssuedAt: '2026-09-01T00:00:00Z',
    qualificationExpiresAt: '2027-09-01T00:00:00Z',
    qualificationRejectionReason: null,
    qualificationConcurrencyToken: 'q-tok-1',
    projectTitle: 'Hệ thống AI-PMS',
    trackCode: 'IT_ONLY',
    concurrencyToken: 'stu-tok-1',
  })
  mocks.updateDepartmentStudentAcademic.mockImplementation(async (_id, body) => ({
    summary: { ...sampleStudent, classCode: body.classCode, curriculumCode: body.curriculumCode },
    academicProfileRejectionReason: null,
    academicProfileReviewedAt: null,
    academicProfileReviewedBy: null,
    qualificationId: 77,
    trainingStatus: 'TRAINING_COMPLETED',
    certificateNumber: 'CERT-2026-42',
    certificateFileId: null,
    qualificationIssuedAt: '2026-09-01T00:00:00Z',
    qualificationExpiresAt: '2027-09-01T00:00:00Z',
    qualificationRejectionReason: null,
    qualificationConcurrencyToken: 'q-tok-1',
    projectTitle: 'Hệ thống AI-PMS',
    trackCode: 'IT_ONLY',
    concurrencyToken: 'stu-tok-2',
  }))
  mocks.exportDepartmentStudents.mockResolvedValue(new Blob(['xlsx']))
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL = vi.fn(() => 'blob:dept-students')
    static revokeObjectURL = vi.fn()
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('DepartmentStudentsPage', () => {
  it('displays KPI cards, class and specialization columns, filters on KPI click, and exports xlsx', async () => {
    render(
      <MemoryRouter initialEntries={['/department/students']}>
        <DepartmentStudentsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Nguyễn Minh Quân')).toBeTruthy()
    expect(screen.getByText('Lớp SE1801')).toBeTruthy()
    expect(screen.getAllByText(/SE-WEB · Kỹ thuật Web & Cloud/).length).toBeGreaterThan(0)
    expect(screen.getByText('12')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Chờ xác minh hồ sơ/ }))
    await waitFor(() => {
      expect(mocks.listDepartmentStudents).toHaveBeenLastCalledWith(
        expect.objectContaining({ profileStatus: 'PENDING' }),
        expect.any(AbortSignal),
      )
    })

    fireEvent.click(screen.getByRole('button', { name: /Xuất DS SV Khoa/ }))
    expect(await screen.findByText(/Đã xuất danh sách sinh viên Khoa/)).toBeTruthy()
    expect(mocks.exportDepartmentStudents).toHaveBeenCalledOnce()
  })
})

describe('DepartmentStudentDetailPage', () => {
  it('loads 360 student detail and saves class/specialization/curriculum with concurrencyToken', async () => {
    render(
      <MemoryRouter initialEntries={['/department/students/42']}>
        <Routes>
          <Route path="/department/students/:userId" element={<DepartmentStudentDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Nguyễn Minh Quân' })).toBeTruthy()
    expect(screen.getByText('Hệ thống AI-PMS')).toBeTruthy()

    const classInput = screen.getByLabelText('Lớp hành chính') as HTMLInputElement
    fireEvent.change(classInput, { target: { value: 'SE1805' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thông tin học vụ' }))

    await screen.findByText(/Đã cập nhật thông tin học vụ/)
    expect(mocks.updateDepartmentStudentAcademic).toHaveBeenCalledWith(42, {
      majorId: 20,
      classCode: 'SE1805',
      specializationId: 11,
      curriculumCode: 'K18_SE',
      concurrencyToken: 'stu-tok-1',
    })
  })

  it('reloads detail and displays conflict alert on 409', async () => {
    mocks.updateDepartmentStudentAcademic.mockRejectedValueOnce(new HttpError('Stale', 409))
    render(
      <MemoryRouter initialEntries={['/department/students/42']}>
        <Routes>
          <Route path="/department/students/:userId" element={<DepartmentStudentDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { name: 'Nguyễn Minh Quân' })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thông tin học vụ' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/cập nhật bởi phiên khác/)
  })
})

describe('AcademicProfileSummary student self-update and lock', () => {
  it('allows pending student to update class and specialization', async () => {
    mocks.useAuthSession.mockReturnValue({
      session: { accessToken: 'stu-token', user: { id: 42, roles: ['STUDENT'] } },
    })
    mocks.getMyAcademicProfile.mockResolvedValue({
      userId: 42,
      fullName: 'Nguyễn Minh Quân',
      email: 'quan@fpt.edu.vn',
      studentCode: 'SE180042',
      departmentId: 2,
      departmentName: 'Khoa CNTT',
      majorId: 20,
      majorName: 'Kỹ thuật phần mềm',
      classCode: 'SE1801',
      specializationId: null,
      specializationCode: null,
      specializationName: null,
      curriculumCode: 'K18_SE',
      status: 'PENDING',
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: null,
      concurrencyToken: 'tok',
    })
    mocks.updateMyStudentAcademic.mockResolvedValue({
      userId: 42,
      fullName: 'Nguyễn Minh Quân',
      email: 'quan@fpt.edu.vn',
      studentCode: 'SE180042',
      departmentId: 2,
      departmentName: 'Khoa CNTT',
      majorId: 20,
      majorName: 'Kỹ thuật phần mềm',
      classCode: 'SE1809',
      specializationId: 11,
      specializationCode: 'SE-WEB',
      specializationName: 'Kỹ thuật Web & Cloud',
      curriculumCode: 'K18_SE',
      status: 'PENDING',
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: null,
      concurrencyToken: 'tok-2',
    })

    render(<AcademicProfileSummary />)
    await screen.findByText('SE180042')
    fireEvent.click(screen.getByRole('button', { name: 'Cập nhật lớp & chuyên ngành hẹp' }))
    fireEvent.change(screen.getByLabelText(/Lớp hành chính/), { target: { value: 'SE1809' } })
    fireEvent.change(screen.getByLabelText('Chuyên ngành hẹp'), { target: { value: '11' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu lớp & chuyên ngành hẹp' }))

    expect(await screen.findByText(/Đã cập nhật lớp hành chính và chuyên ngành hẹp/)).toBeTruthy()
    expect(mocks.updateMyStudentAcademic).toHaveBeenCalledWith({ classCode: 'SE1809', specializationId: 11 })
  })

  it('locks self-editing when academic profile is VERIFIED', async () => {
    mocks.useAuthSession.mockReturnValue({
      session: { accessToken: 'stu-token', user: { id: 42, roles: ['STUDENT'] } },
    })
    mocks.getMyAcademicProfile.mockResolvedValue({
      userId: 42,
      fullName: 'Nguyễn Minh Quân',
      email: 'quan@fpt.edu.vn',
      studentCode: 'SE180042',
      departmentId: 2,
      departmentName: 'Khoa CNTT',
      majorId: 20,
      majorName: 'Kỹ thuật phần mềm',
      classCode: 'SE1801',
      specializationId: 11,
      specializationCode: 'SE-WEB',
      specializationName: 'Kỹ thuật Web & Cloud',
      curriculumCode: 'K18_SE',
      status: 'VERIFIED',
      reviewedBy: 1,
      reviewedAt: '2026-11-20T00:00:00Z',
      rejectionReason: null,
      concurrencyToken: 'tok',
    })

    render(<AcademicProfileSummary />)
    expect(await screen.findByText(/đã được Khoa xác minh và khóa tự chỉnh sửa/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Cập nhật lớp & chuyên ngành hẹp' })).toBeNull()
  })
})
