import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { DepartmentDocumentsPage } from './DepartmentDocumentsPage'
import type { DepartmentDocument } from './department-documents-api'

const api = vi.hoisted(() => ({ listDepartmentDocuments: vi.fn(), uploadDepartmentDocument: vi.fn(),
  publishDepartmentDocument: vi.fn(), retireDepartmentDocument: vi.fn(), downloadDepartmentDocument: vi.fn() }))
vi.mock('./department-documents-api', () => api)
const demoSession = { accessToken: 'token' }
vi.mock('../auth/context/useAuthSession', () => ({ useAuthSession: () => ({ session: demoSession }) }))
vi.mock('../academic/api/academic-api', () => ({ getAcademicHierarchy: () => Promise.resolve([{ departments: [{ department: { id: 1 }, majors: [{ id: 12, name: 'Phần mềm', code: 'SE' }] }] }]) }))
vi.mock('../academic/api/governance-api', () => ({ getProjectPeriods: () => Promise.resolve({ items: [{ id: 34, name: 'Đánh giá', code: 'EVAL' }], page: 1, pageSize: 100, totalCount: 1, totalPages: 1 }) }))
vi.mock('../../services/api/auth.api', () => ({ getMyProfile: () => Promise.resolve({ departmentId: 1, majorId: 12 }) }))
vi.mock('../../services/api/projects.api', () => ({ getProjects: () => Promise.resolve({ items: [], page: 1, pageSize: 100, totalCount: 0, totalPages: 0 }) }))
vi.mock('../../components/ui/DocumentPreviewModal', () => ({ DocumentPreviewModal: () => <div role="dialog">Bản xem trước</div> }))

const row: DepartmentDocument = { id: 5, departmentId: 1, majorId: 12, projectPeriodId: null,
  code: 'REPORT', title: 'Mẫu báo cáo', version: 1, status: 'DRAFT', fileName: 'report.pdf',
  contentType: 'application/pdf', sizeBytes: 12, sha256: 'a'.repeat(64), concurrencyToken: 'token',
  uploadedAt: '2026-11-15T00:00:00Z', publishedAt: null }

beforeEach(() => { vi.resetAllMocks(); api.listDepartmentDocuments.mockResolvedValue([row]) })
afterEach(cleanup)

describe('DepartmentDocumentsPage', () => {
  it('lets department staff upload a draft then publish its server version', async () => {
    api.uploadDepartmentDocument.mockResolvedValue(row)
    api.publishDepartmentDocument.mockResolvedValue({ ...row, status: 'PUBLISHED' })
    render(<DepartmentDocumentsPage manager />)
    await screen.findByText('Mẫu báo cáo')
    fireEvent.change(screen.getByLabelText('Mã tài liệu'), { target: { value: 'REPORT' } })
    fireEvent.change(screen.getByLabelText('Tên tài liệu'), { target: { value: 'Mẫu báo cáo' } })
    const file = new File(['%PDF-1.4'], 'report.pdf', { type: 'application/pdf' })
    fireEvent.change(screen.getByLabelText('Tệp mẫu'), { target: { files: [file] } })
    fireEvent.submit(screen.getByRole('button', { name: 'Tải lên bản nháp' }).closest('form')!)
    await waitFor(() => expect(api.uploadDepartmentDocument).toHaveBeenCalledWith(expect.objectContaining({
      majorId: 12, code: 'REPORT', title: 'Mẫu báo cáo', file,
    })))
    fireEvent.click(screen.getByRole('button', { name: 'Công bố' }))
    await waitFor(() => expect(api.publishDepartmentDocument).toHaveBeenCalledWith(row))
  })

  it('shows students published documents without management controls', async () => {
    api.listDepartmentDocuments.mockResolvedValue([{ ...row, status: 'PUBLISHED' }])
    render(<DepartmentDocumentsPage />)
    await screen.findByText('Mẫu báo cáo')
    expect(screen.queryByRole('button', { name: 'Công bố' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Tải lên bản nháp' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Xem trước' }))
    expect(screen.getByRole('dialog')).toBeTruthy()
  })
})
