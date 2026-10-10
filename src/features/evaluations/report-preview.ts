import type { EvidenceFile } from '../../services/api/evaluations.api'

export type PreviewKind = 'pdf' | 'image' | 'other'

/** Decide how a report file renders inline. Only PDF and image are shown in-browser; anything else
 * (DOCX/ZIP/…) is offered as a download — we never pretend to preview a format the browser can't show. */
export function previewKind(file: Pick<EvidenceFile, 'contentType' | 'fileName'>): PreviewKind {
  const type = (file.contentType || '').toLowerCase()
  const name = (file.fileName || '').toLowerCase()
  if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf'
  if (type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(name)) return 'image'
  return 'other'
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Short tab label: the report-type name when present, else the file name. */
export function fileLabel(file: EvidenceFile): string {
  return file.reportType?.trim() || file.fileName
}
