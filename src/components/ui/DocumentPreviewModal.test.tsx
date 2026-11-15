import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { DocumentPreviewModal, getFileCategory } from './DocumentPreviewModal'

const office = vi.hoisted(() => ({ previewOfficeFile: vi.fn() }))
vi.mock('../../services/api/office-preview.api', () => office)

describe('getFileCategory', () => {
  it('identifies PDF, images, code, and office documents', () => {
    expect(getFileCategory('report.pdf', 'application/pdf')).toBe('pdf')
    expect(getFileCategory('diagram.PNG', 'image/png')).toBe('image')
    expect(getFileCategory('schema.sql', 'text/plain')).toBe('code')
    expect(getFileCategory('document.docx', 'application/vnd.openxmlformats')).toBe('office')
    expect(getFileCategory('bundle.zip')).toBe('archive')
    expect(getFileCategory('binary.dat')).toBe('other')
  })
})

describe('DocumentPreviewModal', () => {
  beforeEach(() => {
    office.previewOfficeFile.mockReset()
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    })
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: vi.fn(function (this: HTMLDialogElement) {
        this.setAttribute('open', '')
      }),
    })
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value: vi.fn(function (this: HTMLDialogElement) {
        this.removeAttribute('open')
      }),
    })
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('renders loading state and displays PDF preview on resolution', async () => {
    const loadBlob = vi.fn().mockResolvedValue(new Blob(['pdf content'], { type: 'application/pdf' }))
    const onClose = vi.fn()

    render(
      <DocumentPreviewModal
        open={true}
        onClose={onClose}
        fileName="srs_document.pdf"
        fileSize={1048576}
        contentType="application/pdf"
        loadBlob={loadBlob}
      />
    )

    expect(screen.getAllByText('srs_document.pdf').length).toBeGreaterThan(0)
    expect(screen.getByText('Tài liệu PDF')).toBeTruthy()
    expect(screen.getByText('1.0 MB')).toBeTruthy()

    await waitFor(() => {
      expect(screen.getByTitle('Bản xem trước srs_document.pdf')).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Đóng bản xem trước' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('renders fallback card and triggers download for office files', async () => {
    office.previewOfficeFile.mockRejectedValue(new Error('preview unavailable'))
    const loadBlob = vi.fn().mockResolvedValue(new Blob(['word content'], { type: 'application/msword' }))
    const onDownload = vi.fn()

    render(
      <DocumentPreviewModal
        open={true}
        onClose={vi.fn()}
        fileName="thesis.docx"
        fileSize={20480}
        contentType="application/vnd.openxmlformats"
        loadBlob={loadBlob}
        onDownload={onDownload}
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'thesis.docx' })).toBeTruthy()
    })

    const downloadButtons = screen.getAllByRole('button', { name: /Tải/ })
    expect(downloadButtons.length).toBeGreaterThan(0)

    fireEvent.click(downloadButtons[0])
    expect(onDownload).toHaveBeenCalled()
  })

  it('shows extracted DOCX text safely and a bounded XLSX grid', async () => {
    office.previewOfficeFile.mockResolvedValueOnce({ kind: 'DOCX_TEXT', paragraphs: ['Đề cương <script>alert(1)</script>'], sheets: [], truncated: false })
      .mockResolvedValueOnce({ kind: 'XLSX_GRID', paragraphs: [], sheets: [{ name: 'Tiêu chí', rows: [['Gate 1', '50']] }], truncated: true })
    const loadBlob = vi.fn().mockResolvedValue(new Blob(['office content']))
    const { rerender } = render(<DocumentPreviewModal open fileId={1} onClose={vi.fn()} fileName="template.docx" loadBlob={loadBlob} />)
    expect(await screen.findByText('Đề cương <script>alert(1)</script>')).toBeTruthy()
    expect(document.querySelector('script')).toBeNull()
    rerender(<DocumentPreviewModal open fileId={2} onClose={vi.fn()} fileName="criteria.xlsx" loadBlob={loadBlob} />)
    expect(await screen.findByRole('table', { name: 'Bảng tính Tiêu chí' })).toBeTruthy()
    expect(screen.getByText('Gate 1')).toBeTruthy()
    expect(screen.getByText(/chỉ hiển thị phần đầu/)).toBeTruthy()
  })

  it('shows a recoverable error when an authorized download fails', async () => {
    render(<DocumentPreviewModal open onClose={vi.fn()} fileName="report.pdf"
      loadBlob={vi.fn().mockResolvedValue(new Blob(['%PDF']))}
      onDownload={vi.fn().mockRejectedValue(new Error('network'))} />)
    await screen.findByTitle('Mở trong tab mới')
    fireEvent.click(screen.getByRole('button', { name: 'Tải về' }))
    expect(await screen.findByText(/Không thể tải tệp về máy/)).toBeTruthy()
  })

  it('revokes previous objectUrl and refetches when fileId changes with same fileName (fixes F-DOC-01)', async () => {
    const blob1 = new Blob(['version 1 content'], { type: 'application/pdf' })
    const blob2 = new Blob(['version 2 content'], { type: 'application/pdf' })
    const loadBlob1 = vi.fn().mockResolvedValue(blob1)
    const loadBlob2 = vi.fn().mockResolvedValue(blob2)

    const { rerender } = render(
      <DocumentPreviewModal
        fileId={101}
        open={true}
        onClose={vi.fn()}
        fileName="report.pdf"
        contentType="application/pdf"
        loadBlob={loadBlob1}
      />
    )

    await waitFor(() => {
      expect(loadBlob1).toHaveBeenCalled()
    })
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob1)

    // Now switch to another file with identical name and content type but different fileId
    rerender(
      <DocumentPreviewModal
        fileId={102}
        open={true}
        onClose={vi.fn()}
        fileName="report.pdf"
        contentType="application/pdf"
        loadBlob={loadBlob2}
      />
    )

    await waitFor(() => {
      expect(loadBlob2).toHaveBeenCalled()
    })
    expect(URL.revokeObjectURL).toHaveBeenCalled()
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob2)
  })
})
