import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { DocumentPreviewModal, getFileCategory } from './DocumentPreviewModal'

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
})
