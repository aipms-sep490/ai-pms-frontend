import { httpPostForm, httpPostFormBlob } from '../http/http-client'

export interface OfficePreview {
  kind: 'DOCX_TEXT' | 'XLSX_GRID' | 'PPTX_SLIDES' | 'ZIP_TREE'
  paragraphs: string[]
  sheets: Array<{ name: string; rows: string[][] }>
  zipEntries?: Array<{ path: string; sizeBytes: number; compressedBytes: number; isDirectory: boolean }>
  truncated: boolean
}

export const OFFICE_PDF_PREVIEW_EXTENSIONS = /\.(docx?|xlsx?|pptx?|odt|ods|odp)$/i

export function previewOfficeFile(blob: Blob, fileName: string, signal?: AbortSignal) {
  const form = new FormData()
  form.append('file', blob, fileName)
  return httpPostForm<OfficePreview>('/files/office-preview', form, signal)
}

export async function previewOfficeAsPdf(blob: Blob, fileName: string, signal?: AbortSignal): Promise<Blob> {
  const form = new FormData()
  form.append('file', blob, fileName)
  const raw = await httpPostFormBlob('/files/office-preview/pdf', form, { signal })
  if (!raw.size) throw new Error('Empty PDF preview response')
  return raw.type === 'application/pdf' ? raw : new Blob([raw], { type: 'application/pdf' })
}
