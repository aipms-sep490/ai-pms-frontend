import { useParams } from 'react-router-dom'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { ProjectProgressAnalysisPanel } from './components/ProjectProgressAnalysisPanel'

export function DepartmentProjectRiskPage() {
  const projectId = Number(useParams().projectId)
  if (!Number.isSafeInteger(projectId) || projectId < 1) return <main className="workspace-page mx-auto max-w-5xl pb-12"><p role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-5 text-sm text-status-error-text">Đường dẫn đồ án không hợp lệ.</p></main>
  return <WorkspacePage className="space-y-6" eyebrow="Theo dõi bộ môn" title="Phân tích rủi ro đồ án" description="Các tín hiệu dưới đây hỗ trợ theo dõi trong phạm vi bộ môn, không thay thế điểm số hoặc quyết định học vụ." backTo="/department/portfolio"><ProjectProgressAnalysisPanel projectId={projectId} /></WorkspacePage>
}
