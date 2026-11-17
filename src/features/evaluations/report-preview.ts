import type { EvidenceFile } from '../../services/api/evaluations.api'

export type PreviewKind = 'pdf' | 'image' | 'office' | 'other'

/** Office files use the bounded read-only backend extraction; other formats offer a download. */
export function previewKind(file: Pick<EvidenceFile, 'contentType' | 'fileName'>): PreviewKind {
  const type = (file.contentType || '').toLowerCase()
  const name = (file.fileName || '').toLowerCase()
  if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf'
  if (type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(name)) return 'image'
  if (/\.(docx|xlsx)$/.test(name)) return 'office'
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
