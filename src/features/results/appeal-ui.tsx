import { HttpError } from '../../services/http/http-client'
import { Pagination } from '../../components/ui/Pagination'

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

export function AppealPaging({ page, totalCount, pageSize = 10, busy, onChange }: { page: number; totalCount: number; pageSize?: number; busy: boolean; onChange: (page: number) => void }) {
  if (totalCount <= pageSize) return null
  return (
    <Pagination
      page={page}
      pages={Math.max(1, Math.ceil(totalCount / pageSize))}
      total={totalCount}
      pageSize={pageSize}
      busy={busy}
      onPage={onChange}
    />
  )
}

export async function saveAppealDownload(read: () => Promise<Blob>, fileName: string) {
  const blob = await read(), url = URL.createObjectURL(blob)
  try { const anchor = document.createElement('a'); anchor.href = url; anchor.download = fileName; anchor.click() }
  finally { URL.revokeObjectURL(url) }
}

export const appealInputClass = 'min-h-11 w-full rounded-lg border border-hairline bg-card p-3 font-normal text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:bg-canvas disabled:text-ink-muted'
