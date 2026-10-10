import { describe, expect, it } from 'vitest'
import { fileLabel, formatBytes, previewKind } from './report-preview'

describe('report preview helpers', () => {
  it('classifies PDFs, images and other formats by type or extension', () => {
    expect(previewKind({ contentType: 'application/pdf', fileName: 'a' })).toBe('pdf')
    expect(previewKind({ contentType: '', fileName: 'report.PDF' })).toBe('pdf')
    expect(previewKind({ contentType: 'image/png', fileName: 'b' })).toBe('image')
    expect(previewKind({ contentType: '', fileName: 'shot.jpeg' })).toBe('image')
    expect(previewKind({ contentType: 'application/zip', fileName: 'pack.zip' })).toBe('other')
    expect(previewKind({ contentType: '', fileName: 'doc.docx' })).toBe('other')
  })

  it('labels a file by report type when present, else the file name', () => {
    expect(fileLabel({ id: 1, fileName: 'srs.pdf', contentType: '', sizeBytes: 0, reportType: 'Software Requirement' })).toBe('Software Requirement')
    expect(fileLabel({ id: 1, fileName: 'srs.pdf', contentType: '', sizeBytes: 0, reportType: '  ' })).toBe('srs.pdf')
    expect(fileLabel({ id: 1, fileName: 'srs.pdf', contentType: '', sizeBytes: 0 })).toBe('srs.pdf')
  })

  it('formats byte sizes', () => {
    expect(formatBytes(900)).toBe('900 B')
    expect(formatBytes(4096)).toBe('4 KB')
    expect(formatBytes(2 * 1024 * 1024)).toBe('2.0 MB')
  })
})
