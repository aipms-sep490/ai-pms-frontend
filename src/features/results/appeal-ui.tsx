import { HttpError } from '../../services/http/http-client'
import { Pagination } from '../../components/ui/Pagination'
import { displayLabel } from '../../components/ui/display-label'

export function correctionStatusLabel(status: string | null | undefined): string {
  switch ((status ?? '').toUpperCase()) {
    case 'PENDING': return 'Đang chờ xử lý'
    case 'UNDER_REVIEW': return 'Đang xem xét'
    case 'ACCEPTED': return 'Đã chấp nhận'
    case 'REJECTED': return 'Đã từ chối'
    default: return displayLabel(status)
  }
}

export function correctionSourceLabel(source: string | null | undefined): string {
  switch ((source ?? '').toUpperCase()) {
    case 'STUDENT_APPEAL': return 'Phúc khảo sinh viên'
    case 'STAFF_CORRECTION': return 'Đính chính của khoa'
    default: return displayLabel(source)
  }
}

export function appealTargetTypeLabel(targetType: string | null | undefined, studentId?: number | null): string {
  const upper = (targetType ?? '').toUpperCase()
  if (upper === 'PROJECT') return 'Toàn đồ án'
  if (upper === 'STUDENT') return studentId != null ? `Sinh viên #${studentId}` : 'Sinh viên'
  return studentId != null ? `${displayLabel(targetType)} #${studentId}` : displayLabel(targetType)
}

export function appealWindowStatusLabel(status: string | null | undefined): string {
  switch ((status ?? '').toUpperCase()) {
    case 'OPEN': return 'Đang mở'
    case 'SCHEDULED': return 'Đã lên lịch'
    case 'EXPIRED': return 'Hết hạn'
    case 'CLOSED': return 'Đã đóng'
    default: return displayLabel(status)
  }
}

export function appealProposalLabel(proposal: string | null | undefined): string {
  switch ((proposal ?? '').toUpperCase()) {
    case 'KEEP': return 'Giữ nguyên điểm'
    case 'AMEND': return 'Đính chính tiêu chí'
    default: return displayLabel(proposal)
  }
}

export function appealError(error: unknown): string {
  if (error instanceof HttpError) {
    if (error.status === 401) return 'Phiên đăng nhập cần được xác minh lại.'
    if (error.status === 403 || error.status === 404) return 'Chức năng hoặc dữ liệu này không khả dụng trong phạm vi của bạn.'
    if (error.status === 409) return 'Dữ liệu đã thay đổi. Nội dung nháp vẫn được giữ; hãy đối chiếu dữ liệu mới và xác nhận lại trước khi thao tác.'
    const errors = error.problem?.errors
    return [error.problem?.code, error.problem?.detail, ...(errors ? Object.values(errors).flat() : [])].filter(Boolean).join(' · ') || 'Dữ liệu chưa đáp ứng điều kiện của hệ thống.'
  }
  return 'Chưa đồng bộ được dữ liệu. Hãy thử tải lại.'
}

export function AppealPaging({ page, totalCount, busy, onChange }: { page: number; totalCount: number; busy: boolean; onChange: (page: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(totalCount / 20))
  if (totalCount <= 20 && page <= 1) return null
  return <Pagination page={page} pages={totalPages} total={totalCount} pageSize={20} busy={busy} onPage={onChange} />
}

export async function saveAppealDownload(read: () => Promise<Blob>, fileName: string) {
  const blob = await read(), url = URL.createObjectURL(blob)
  try { const anchor = document.createElement('a'); anchor.href = url; anchor.download = fileName; anchor.click() }
  finally { URL.revokeObjectURL(url) }
}

export const appealInputClass = 'min-h-11 w-full rounded-lg border border-hairline bg-card p-3 font-normal text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:bg-canvas disabled:text-ink-muted'
