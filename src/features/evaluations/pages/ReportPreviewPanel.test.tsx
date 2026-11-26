import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { ReportPreviewPanel } from './ReportPreviewPanel'
import { downloadEvaluationEvidenceFile } from '../../../services/api/evaluations.api'

vi.mock('../../../services/api/evaluations.api', () => ({ downloadEvaluationEvidenceFile: vi.fn() }))
const office = vi.hoisted(() => ({ previewOfficeFile: vi.fn(), previewOfficeAsPdf: vi.fn() }))
vi.mock('../../../services/api/office-preview.api', () => office)

afterEach(() => { cleanup(); vi.resetAllMocks() })

it('shows assignment-authorized DOCX content beside the scoring form', async () => {
  vi.mocked(downloadEvaluationEvidenceFile).mockResolvedValue(new Blob(['office']))
  office.previewOfficeAsPdf.mockRejectedValue(new Error('pdf unavailable'))
  office.previewOfficeFile.mockResolvedValue({ kind: 'DOCX_TEXT', paragraphs: ['Yêu cầu Gate 1'], sheets: [], truncated: false })
  render(<ReportPreviewPanel assignmentId={41} files={[
    { id: 8, fileName: 'Bao-cao.docx', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', sizeBytes: 500 },
  ]} />)
  expect(await screen.findByText('Yêu cầu Gate 1')).toBeTruthy()
  expect(downloadEvaluationEvidenceFile).toHaveBeenCalledWith(41, 8, expect.any(AbortSignal))
  expect(office.previewOfficeFile).toHaveBeenCalledWith(expect.any(Blob), 'Bao-cao.docx', expect.any(AbortSignal))
})

it('renders faithful PDF iframe when Gotenberg office PDF preview succeeds', async () => {
  const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-office-pdf')
  const revokeUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  try {
    vi.mocked(downloadEvaluationEvidenceFile).mockResolvedValue(new Blob(['office']))
    office.previewOfficeAsPdf.mockResolvedValue(new Blob(['%PDF-1.7'], { type: 'application/pdf' }))
    render(<ReportPreviewPanel assignmentId={41} files={[
      { id: 8, fileName: 'Bao-cao.docx', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', sizeBytes: 500 },
    ]} />)
    const frame = await screen.findByTitle('Báo cáo Bao-cao.docx')
    expect(frame.tagName).toBe('IFRAME')
    expect(frame.getAttribute('src')).toBe('blob:mock-office-pdf')
    expect(office.previewOfficeFile).not.toHaveBeenCalled()
  } finally {
    createUrl.mockRestore()
    revokeUrl.mockRestore()
  }
})

it('uses a native modal for fullscreen viewing and restores focus when cancelled', () => {
  vi.mocked(downloadEvaluationEvidenceFile).mockResolvedValue(new Blob(['office']))
  office.previewOfficeAsPdf.mockRejectedValue(new Error('pdf unavailable'))
  office.previewOfficeFile.mockResolvedValue({ kind: 'DOCX_TEXT', paragraphs: ['Report'], sheets: [], truncated: false })
  render(<ReportPreviewPanel assignmentId={41} files={[
    { id: 8, fileName: 'Bao-cao.docx', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', sizeBytes: 500 },
  ]} />)
  const opener = screen.getByRole('button', { name: 'Phóng to' })
  opener.focus()
  fireEvent.click(opener)
  const dialog = screen.getByRole('dialog', { name: 'Xem tài liệu Bao-cao.docx toàn màn hình' })
  expect(dialog.tagName).toBe('DIALOG')
  expect(dialog.hasAttribute('open')).toBe(true)
  expect(document.body.style.overflow).toBe('hidden')
  fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(document.body.style.overflow).toBe('')
  expect(document.activeElement).toBe(opener)
})

it('keeps the fullscreen download failure visible inside the active dialog', async () => {
  vi.mocked(downloadEvaluationEvidenceFile).mockRejectedValue(new Error('Forbidden'))
  render(<ReportPreviewPanel assignmentId={41} files={[
    { id: 8, fileName: 'Bao-cao.docx', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', sizeBytes: 500 },
  ]} />)
  const opener = screen.getByRole('button', { name: 'Phóng to' })
  expect(opener.getAttribute('aria-label')).toBe('Phóng to')
  fireEvent.click(opener)
  const dialog = screen.getByRole('dialog')
  fireEvent.click(within(dialog).getByRole('button', { name: 'Tải tệp' }))
  expect(await within(dialog).findByText(/Không thể tải tệp\. Quyền phân công/)).toBeTruthy()
  expect(downloadEvaluationEvidenceFile).toHaveBeenCalledWith(41, 8)
})
