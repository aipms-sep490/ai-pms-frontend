import type { ReactNode } from 'react'
import { Button } from '../../components/ui/Button'
import { HttpError } from '../../services/http/http-client'
import './collaboration.css'

export function CollaborationIntro({ icon, title, children }: { icon: string; title: string; children: ReactNode }) {
  return <section className="collab-intro"><span className="material-symbols-outlined collab-intro-icon" aria-hidden="true">{icon}</span><div><h2>{title}</h2><p>{children}</p></div></section>
}

export function CollaborationPager({ page, total, size = 10, busy, onChange }: { page: number; total: number; size?: number; busy?: boolean; onChange: (page: number) => void }) {
  if (total <= size) return null
  return <nav className="collab-pager" aria-label="Phân trang"><Button variant="outline" disabled={busy || page <= 1} onClick={() => onChange(page - 1)}>Trước</Button><span>Trang {page} / {Math.ceil(total / size)}</span><Button variant="outline" disabled={busy || page * size >= total} onClick={() => onChange(page + 1)}>Tiếp</Button></nav>
}

export function collaborationError(error: unknown): string {
  if (error instanceof HttpError) {
    if (error.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    if (error.status === 403) return 'Bạn không có quyền thực hiện thao tác này trong đồ án.'
    if (error.status === 404) return 'Không tìm thấy dữ liệu hoặc tính năng chưa được bật.'
    if (error.status === 409) return 'Thông tin đã thay đổi. Hãy đối chiếu bản mới nhất trước khi tiếp tục.'
    if (error.status === 400 || error.status === 422) return 'Kiểm tra nội dung, thời gian và điều kiện thực hiện trước khi thử lại.'
  }
  return 'Chưa kết nối được với hệ thống. Hãy tải lại để kiểm tra kết quả thao tác.'
}

export const collaborationDate = (value?: string | null) => value && !Number.isNaN(Date.parse(value))
  ? new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : 'Chưa có'
