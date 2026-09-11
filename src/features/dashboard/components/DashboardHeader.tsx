import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'

interface DashboardHeaderProps {
  projectCode: string
  groupCode: string
  semester: string
  projectName: string
  teamLeader: string
  supervisor: string
  currentMilestone: string
}

export function DashboardHeader({
  projectCode,
  groupCode,
  semester,
  projectName,
  teamLeader,
  supervisor,
  currentMilestone,
}: DashboardHeaderProps) {
  return (
    <section className="flex flex-col gap-3 pb-4 border-b border-hairline">
      {/* Simulation banner */}
      <div
        role="status"
        aria-label="Thông báo chế độ xem trước dữ liệu"
        className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-status-warning-bg border border-status-warning-border text-status-warning-text text-xs font-medium"
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] shrink-0" aria-hidden="true">
            info
          </span>
          <span className="leading-snug">
            <strong>Chế độ xem trước giao diện</strong> — Dữ liệu minh họa, chưa kết nối API backend thực tế.
          </span>
        </div>
        <Badge variant="warning" size="sm" className="shrink-0">
          Mô phỏng
        </Badge>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mt-1">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-500 uppercase tracking-wider">
            <span>Kỳ {semester}</span>
            <span aria-hidden="true">›</span>
            <span>{projectCode}</span>
            <span aria-hidden="true">›</span>
            <span className="text-primary font-semibold">{groupCode}</span>
          </div>

          <h1 className="font-heading text-xl md:text-2xl font-bold text-slate-900 tracking-tight leading-snug break-words">
            {projectName}
          </h1>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 mt-0.5">
            <span className="font-medium text-slate-800">
              Trưởng nhóm: {teamLeader}
            </span>
            <span className="text-slate-300" aria-hidden="true">•</span>
            <span className="text-primary font-semibold font-mono">
              GVHD: {supervisor}
            </span>
            <span className="text-slate-300" aria-hidden="true">•</span>
            <span className="text-academic-emerald font-medium">
              Mốc hiện tại: {currentMilestone}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
          <Button
            variant="secondary"
            size="sm"
            icon="download"
            disabled
            title="Chức năng xuất báo cáo sẽ khả dụng khi kết nối backend"
            className="flex-1 sm:flex-initial justify-center"
          >
            Xuất báo cáo (Sắp có)
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon="upload_file"
            disabled
            title="Chức năng nộp sản phẩm sẽ khả dụng ở phân hệ Deliverables"
            className="flex-1 sm:flex-initial justify-center"
          >
            Nộp sản phẩm (Sắp có)
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon="add"
            disabled
            title="Chức năng tạo task sẽ khả dụng ở phân hệ Tasks"
            className="w-full sm:w-auto justify-center"
          >
            Tạo việc mới (Sắp có)
          </Button>
        </div>
      </div>
    </section>
  )
}
