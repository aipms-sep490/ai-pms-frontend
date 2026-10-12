import type { WeeklyAssessmentStatus } from '../../services/api/weekly.api'

export const weeklyStatusLabels: Record<string, string> = {
  DRAFT: 'Bản nháp',
  SUBMITTED: 'Đã nộp',
  SUPERSEDED: 'Đã thay thế',
}

export function weeklyStatusLabel(status: WeeklyAssessmentStatus): string {
  return weeklyStatusLabels[status] ?? status
}

export function formatCalendarDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-')
  return `${day}/${month}/${year}`
}

export function formatWeeklyDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
}
