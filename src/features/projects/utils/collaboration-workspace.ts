import type { TeamMemberDto, TimelineTaskDto } from '../../../types/backend'

export function utcTimestamp(value?: string | null): number {
  if (!value) return Number.POSITIVE_INFINITY
  // SQL datetime2 responses can omit the offset; backend task timestamps are UTC.
  return new Date(/(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`).getTime()
}

export function isOpenTask(task: TimelineTaskDto): boolean {
  return task.status !== 'DONE' && task.status !== 'CANCELLED'
}

export function isOverdue(task: TimelineTaskDto, now: number): boolean {
  return isOpenTask(task) && utcTimestamp(task.dueAt) < now
}

export function summarizeMembers(members: TeamMemberDto[], tasks: TimelineTaskDto[], now: number) {
  return members.map(member => {
    const assigned = tasks.filter(task => task.assignees.some(person => person.userId === member.userId))
    const completed = assigned.filter(task => task.status === 'DONE').length
    return {
      ...member,
      assigned: assigned.length,
      completed,
      // Same count-based definition as ProjectRepository.GetProjectProgressSummaryAsync.
      progress: assigned.length ? completed / assigned.length * 100 : null,
      blocked: assigned.filter(task => task.status === 'BLOCKED').length,
      overdue: assigned.filter(task => isOverdue(task, now)).length,
      currentTask: assigned.filter(isOpenTask).sort((a, b) =>
        Number(b.status === 'BLOCKED') - Number(a.status === 'BLOCKED') ||
        utcTimestamp(a.dueAt) - utcTimestamp(b.dueAt) || a.id - b.id)[0],
    }
  })
}

export function taskStatusLabel(status: string): string {
  return ({ TODO: 'Chưa bắt đầu', IN_PROGRESS: 'Đang làm', BLOCKED: 'Đang vướng mắc',
    IN_REVIEW: 'Chờ kiểm tra', DONE: 'Hoàn thành', CANCELLED: 'Đã hủy' } as Record<string, string>)[status] ?? 'Chưa xác định'
}

export function dateLabel(value?: string | null): string {
  if (!value) return 'Chưa có hạn nộp'
  // Preserve DateOnly values; UTC timestamps are displayed in Vietnam time.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00+07:00`) : new Date(utcTimestamp(value))
  if (Number.isNaN(date.getTime())) return 'Chưa có ngày hợp lệ'
  const parts = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', timeZone: 'Asia/Ho_Chi_Minh',
  }).formatToParts(date)
  return `${parts.find(part => part.type === 'day')?.value}/${parts.find(part => part.type === 'month')?.value}`
}

export function initials(name: string): string {
  return name.trim().split(/\s+/).slice(-2).map(part => part[0]).join('').toUpperCase()
}
