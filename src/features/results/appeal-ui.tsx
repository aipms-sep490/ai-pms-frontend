import { HttpError } from '../../services/http/http-client'
import { Button } from '../../components/ui/Button'

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
  return <nav aria-label="Phân trang" className="flex flex-wrap items-center gap-3 text-sm"><Button variant="secondary" disabled={busy || page <= 1} onClick={() => onChange(page - 1)}>Trang trước</Button><span>Trang {page} · {totalCount} mục</span><Button variant="secondary" disabled={busy || page * 20 >= totalCount} onClick={() => onChange(page + 1)}>Trang sau</Button></nav>
}

export async function saveAppealDownload(read: () => Promise<Blob>, fileName: string) {
  const blob = await read(), url = URL.createObjectURL(blob)
  try { const anchor = document.createElement('a'); anchor.href = url; anchor.download = fileName; anchor.click() }
  finally { URL.revokeObjectURL(url) }
}

export const appealInputClass = 'min-h-11 w-full rounded-lg border border-hairline bg-card p-3 text-sm text-ink'
