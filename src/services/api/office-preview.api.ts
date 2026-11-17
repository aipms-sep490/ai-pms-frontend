import { httpPostForm } from '../http/http-client'

export interface OfficePreview {
  kind: 'DOCX_TEXT' | 'XLSX_GRID'
  paragraphs: string[]
  sheets: Array<{ name: string; rows: string[][] }>
  truncated: boolean
}

export function previewOfficeFile(blob: Blob, fileName: string, signal?: AbortSignal) {
  const form = new FormData()
  form.append('file', blob, fileName)
  return httpPostForm<OfficePreview>('/files/office-preview', form, signal)
}
