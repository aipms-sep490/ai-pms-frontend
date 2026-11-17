import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { DepartmentDocumentsPage } from './DepartmentDocumentsPage'
import type { DepartmentDocument } from './department-documents-api'
import { HttpError } from '../../services/http/http-client'

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
  it('explains a document 404 and does not offer an upload that cannot work', async () => {
    api.listDepartmentDocuments.mockRejectedValue(new HttpError('Not found', 404))
    render(<DepartmentDocumentsPage manager />)
    await screen.findByText(/Không truy cập được kho tài liệu cho ngành đã chọn \(404\)/)
    expect(screen.queryByRole('button', { name: 'Tải lên bản nháp' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Tải lại' })).toBeTruthy()
  })

  it('lets department staff upload a draft then publish its server version', async () => {
    api.uploadDepartmentDocument.mockResolvedValue(row)
    api.publishDepartmentDocument.mockResolvedValue({ ...row, status: 'PUBLISHED' })
    api.listDepartmentDocuments.mockResolvedValueOnce([row]).mockResolvedValueOnce([row])
      .mockResolvedValueOnce([{ ...row, status: 'PUBLISHED' }])
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
    await screen.findByText(/Đã tải lên bản nháp/)
    fireEvent.click(screen.getByRole('button', { name: 'Công bố' }))
    await waitFor(() => expect(api.publishDepartmentDocument).toHaveBeenCalledWith(row))
    await screen.findByText('Tài liệu đã được công bố.')
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

  it('does not show stale documents or an empty-state claim after a filtered list fails', async () => {
    api.listDepartmentDocuments.mockResolvedValueOnce([row]).mockRejectedValueOnce(new HttpError('Unavailable', 500))
    render(<DepartmentDocumentsPage manager />)
    await screen.findByText('Mẫu báo cáo')

    fireEvent.change(screen.getByLabelText('Kỳ đồ án'), { target: { value: '34' } })

    await screen.findByText('Chưa kết nối được kho tài liệu. Hãy thử lại.')
    expect(screen.queryByText('Mẫu báo cáo')).toBeNull()
    expect(screen.queryByText(/Chưa có tài liệu phù hợp/)).toBeNull()
  })

  it('does not confirm an upload until list readback succeeds and prevents duplicate submission', async () => {
    api.uploadDepartmentDocument.mockResolvedValue(row)
    api.listDepartmentDocuments.mockResolvedValueOnce([])
      .mockRejectedValueOnce(new HttpError('Unavailable', 500))
      .mockResolvedValueOnce([row])
    render(<DepartmentDocumentsPage manager />)
    await screen.findByText('Chưa có tài liệu phù hợp với ngành và kỳ đã chọn.')
    fireEvent.change(screen.getByLabelText('Mã tài liệu'), { target: { value: 'REPORT' } })
    fireEvent.change(screen.getByLabelText('Tên tài liệu'), { target: { value: 'Mẫu báo cáo' } })
    fireEvent.change(screen.getByLabelText('Tệp mẫu'), { target: { files: [new File(['%PDF-1.4'], 'report.pdf', { type: 'application/pdf' })] } })
    fireEvent.submit(screen.getByRole('button', { name: 'Tải lên bản nháp' }).closest('form')!)

    await screen.findByText(/Máy chủ đã nhận bản nháp nhưng chưa xác nhận được trong danh sách/)
    expect((screen.getByRole('button', { name: 'Tải lên bản nháp' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByText(/Đã tải lên bản nháp/)).toBeNull()
    expect(api.uploadDepartmentDocument).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Tải lại' }))
    await screen.findByText(/Đã xác nhận bản nháp trong danh sách/)
    expect(screen.getByText('Mẫu báo cáo')).toBeDefined()
    expect(api.uploadDepartmentDocument).toHaveBeenCalledTimes(1)
  })

  it('keeps the upload pending when a successful list still omits its server id', async () => {
    api.uploadDepartmentDocument.mockResolvedValue({ ...row, id: 6 })
    api.listDepartmentDocuments.mockResolvedValueOnce([]).mockResolvedValueOnce([row]).mockResolvedValueOnce([row])
    render(<DepartmentDocumentsPage manager />)
    await screen.findByText('Chưa có tài liệu phù hợp với ngành và kỳ đã chọn.')
    fireEvent.change(screen.getByLabelText('Mã tài liệu'), { target: { value: 'REPORT' } })
    fireEvent.change(screen.getByLabelText('Tên tài liệu'), { target: { value: 'Mẫu báo cáo' } })
    fireEvent.change(screen.getByLabelText('Tệp mẫu'), { target: { files: [new File(['%PDF-1.4'], 'report.pdf', { type: 'application/pdf' })] } })
    fireEvent.submit(screen.getByRole('button', { name: 'Tải lên bản nháp' }).closest('form')!)

    await screen.findByText(/Máy chủ đã nhận bản nháp nhưng chưa xác nhận được trong danh sách/)
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại' }))
    await screen.findByText(/Chưa thấy bản nháp vừa tải lên trong danh sách/)
    expect((screen.getByRole('button', { name: 'Tải lên bản nháp' }) as HTMLButtonElement).disabled).toBe(true)
    expect(api.uploadDepartmentDocument).toHaveBeenCalledTimes(1)
  })
})
