import type { ColdScope, ColdSubmissionStatus } from '../../services/api/cold.api'

export const coldScopeLabels: Record<string, string> = {
  COMMON: 'Chung',
  MAJOR_SPECIFIC: 'Theo ngành',
  INDIVIDUAL: 'Cá nhân',
}

export const coldStatusLabels: Record<string, string> = {
  DRAFT: 'Bản nháp',
  SUBMITTED: 'Đã nộp',
  LOCKED: 'Đã khóa',
}

export function coldScopeLabel(scope: ColdScope): string {
  return coldScopeLabels[scope] ?? scope
}

export function coldStatusLabel(status: ColdSubmissionStatus): string {
  return coldStatusLabels[status] ?? status
}

export function formatColdDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
