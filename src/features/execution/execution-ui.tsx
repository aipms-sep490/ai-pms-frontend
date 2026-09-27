import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import './execution.css'

export function ExecutionPage({ title, description, eyebrow, backTo, action, children }: {
  title: string; description?: string; eyebrow?: string; backTo?: string; action?: ReactNode; children: ReactNode
}) {
  return <div className="execution-page">
    {backTo && <Link className="ex-back" to={backTo}><ExIcon name="arrow_back" />Quay lại</Link>}
    <header className="ex-heading"><div>{eyebrow && <p className="ex-eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="ex-description">{description}</p>}</div>{action && <div className="ex-actions">{action}</div>}</header>
    {children}
  </div>
}
export function ExIcon({ name }: { name: string }) { return <span className="material-symbols-outlined" aria-hidden="true">{name}</span> }
export function ExState({ loading, message, title, retry, action }: { loading?: boolean; message?: string; title?: string; retry?: () => void; action?: ReactNode }) {
  if (loading) return <div className="ex-loading" role="status" aria-label="Đang tải dữ liệu"><span /><span /><span /></div>
  return <div className={retry ? 'ex-notice ex-notice-error' : 'ex-empty'} role={retry ? 'alert' : undefined}>
    {title && <h2>{title}</h2>}{message && <p>{message}</p>}{retry && <button type="button" className="ex-text-button" onClick={retry}>Thử lại</button>}{action}
  </div>
}
export function ExProgress({ value, label }: { value: number; label: string }) {
  const percentage = Math.max(0, Math.min(100, value))
  return <span className="ex-progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percentage)}><span style={{ width: `${percentage}%` }} /></span>
}
export function ExPagination({ page, pages, total, busy, onPage }: { page: number; pages: number; total: number; busy?: boolean; onPage: (page: number) => void }) {
  return <nav className="ex-pagination" aria-label="Phân trang"><span>{total} kết quả · Trang {page}/{Math.max(1, pages)}</span><div>
    <button type="button" className="ex-button" disabled={busy || page <= 1} onClick={() => onPage(page - 1)}><ExIcon name="chevron_left" />Trước</button>
    <button type="button" className="ex-button" disabled={busy || page >= pages} onClick={() => onPage(page + 1)}>Sau<ExIcon name="chevron_right" /></button>
  </div></nav>
}
export function ExConfirm({ title, description, busy, onCancel, onConfirm }: { title: string; description: string; busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  return <section className="ex-confirm" aria-label={title}><h3>{title}</h3><p>{description}</p><div className="ex-actions">
    <button className="ex-button" type="button" disabled={busy} onClick={onCancel}>Giữ lại</button>
    <button className="ex-button ex-button-danger" type="button" disabled={busy} onClick={onConfirm}>{busy ? 'Đang xử lý…' : 'Xác nhận xóa'}</button>
  </div></section>
}
