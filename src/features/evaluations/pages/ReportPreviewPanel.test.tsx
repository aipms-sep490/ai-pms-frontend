import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { ReportPreviewPanel } from './ReportPreviewPanel'
import { downloadEvaluationEvidenceFile } from '../../../services/api/evaluations.api'

vi.mock('../../../services/api/evaluations.api', () => ({ downloadEvaluationEvidenceFile: vi.fn() }))

afterEach(() => { cleanup(); vi.resetAllMocks() })

it('uses a native modal for fullscreen viewing and restores focus when cancelled', () => {
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
  expect(await within(dialog).findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('Không thể tải tệp.'))
  expect(downloadEvaluationEvidenceFile).toHaveBeenCalledWith(41, 8)
})
