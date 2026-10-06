import { Link, useParams } from 'react-router-dom'
import { ProjectProgressAnalysisPanel } from './components/ProjectProgressAnalysisPanel'

export function DepartmentProjectRiskPage() {
  const projectId = Number(useParams().projectId)
  if (!Number.isSafeInteger(projectId) || projectId < 1) return <main className="mx-auto max-w-5xl pb-12"><p role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-5 text-sm text-status-error-text">Đường dẫn đồ án không hợp lệ.</p></main>
  return <main className="mx-auto max-w-5xl space-y-5 pb-12"><header className="flex flex-wrap items-end justify-between gap-3 border-b border-hairline pb-5"><div><p className="font-mono text-xs font-semibold uppercase tracking-wide text-primary">Theo dõi bộ môn</p><h1 className="mt-1 font-heading text-2xl font-bold text-slate-950">Phân tích rủi ro đồ án</h1><p className="mt-2 text-sm leading-6 text-slate-600">Các tín hiệu dưới đây hỗ trợ theo dõi trong phạm vi bộ môn, không thay thế điểm số hoặc quyết định học vụ.</p></div><Link to="/department/portfolio" className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4">Quay lại danh mục</Link></header><ProjectProgressAnalysisPanel projectId={projectId} /></main>
}
