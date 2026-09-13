import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { ProjectLifecycle } from '../components/ProjectLifecycle'
import { ProjectDossierCard } from '../components/ProjectDossierCard'
import { TeamCompositionCard } from '../components/TeamCompositionCard'
import { ApprovalTimelineCard } from '../components/ApprovalTimelineCard'
import { projectDossierPreview } from '../fixtures/project-dossier-preview'
import { useProjectLifecycle } from '../hooks/useProjectLifecycle'
import './project-lifecycle-page.css'

export function ProjectLifecyclePage() {
  const { data, error, isLoading, isForbidden, isEmpty, retry } = useProjectLifecycle()

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Simulation status banner */}
      <div
        role="status"
        aria-label="Thông báo chế độ xem trước dữ liệu hồ sơ"
        className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-status-warning-bg border border-status-warning-border text-status-warning-text text-xs font-medium"
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] shrink-0" aria-hidden="true">
            info
          </span>
          <span>
            <strong>Chế độ xem trước hồ sơ đề tài & nhóm</strong> — Dữ liệu thành viên và tiến trình phê duyệt minh họa.
          </span>
        </div>
        <Badge variant="warning" size="sm" className="shrink-0">
          Mô phỏng
        </Badge>
      </div>

      {/* 1. Main Project Dossier & Metadata */}
      <ProjectDossierCard dossier={projectDossierPreview} />

      {/* 2. Team Composition & Member Roles */}
      <TeamCompositionCard
        members={projectDossierPreview.members}
        breakdown={projectDossierPreview.majorBreakdown}
      />

      {/* 3. Approval Timeline Stages */}
      <ApprovalTimelineCard timeline={projectDossierPreview.timeline} />

      {/* 4. Domain Workflow State Machine Integration (API-backed) */}
      <section className="pt-6 border-t border-hairline">
        <div className="page-heading split-heading mb-4">
          <div>
            <p className="eyebrow">Domain workflow engine</p>
            <h2 className="font-heading text-lg font-bold text-slate-900">
              Quy trình Chuyển đổi Trạng thái Đồ án (State Machine)
            </h2>
            <p className="text-xs text-slate-500">
              Các bước chuyển trạng thái nghiệp vụ được điều phối từ backend domain state machine.
            </p>
          </div>
          <code className="endpoint-label">GET /api/projects/lifecycle</code>
        </div>

        {isLoading && <div className="state-panel">Đang tải trạng thái lifecycle từ API...</div>}

        {!isLoading && isForbidden && (
          <div className="state-panel forbidden-panel" role="alert">
            <div>
              <strong>Không có quyền xem lifecycle đồ án</strong>
              <p>Backend đã từ chối yêu cầu này. Hãy dùng tài khoản được phân quyền cho đồ án.</p>
            </div>
          </div>
        )}

        {!isLoading && error && !isForbidden && (
          <div className="state-panel error-panel">
            <div>
              <strong>Backend is not available</strong>
              <p>{error.message}</p>
            </div>
            <Button type="button" onClick={retry}>Thử lại (Retry)</Button>
          </div>
        )}

        {!isLoading && data && isEmpty && (
          <div className="state-panel empty-panel" role="status">
            Chưa có trạng thái lifecycle nào được trả về cho đồ án này.
          </div>
        )}

        {!isLoading && data && !isEmpty && <ProjectLifecycle states={data.states} />}
      </section>
    </div>
  )
}
