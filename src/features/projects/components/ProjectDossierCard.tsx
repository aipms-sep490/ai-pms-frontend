import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { Card, CardContent, CardHeader } from '../../../components/ui/Card'
import type { ProjectDossier } from '../types/project-dossier.types'

interface ProjectDossierCardProps {
  dossier: ProjectDossier
}

export function ProjectDossierCard({ dossier }: ProjectDossierCardProps) {
  return (
    <Card className="border-hairline bg-white shadow-xs">
      <CardHeader className="flex-col xl:flex-row xl:items-start justify-between gap-4 pb-3 border-b border-hairline">
        <div className="flex flex-col gap-2 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold text-primary bg-primary-subtle border border-hairline px-2 py-0.5 rounded whitespace-nowrap">
              {dossier.projectCode} • {dossier.groupCode}
            </span>
            <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded whitespace-nowrap">
              Kỳ {dossier.semester}
            </span>
            <Badge variant="success" size="sm" dot>
              {dossier.statusLabel}
            </Badge>
            <span className="font-mono text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded whitespace-nowrap">
              Điểm CDIO: {dossier.cdioScore}/100
            </span>
          </div>

          <h1 className="font-heading text-xl md:text-2xl font-bold text-slate-900 tracking-tight leading-snug break-words">
            {dossier.titleVi}
          </h1>
          <p className="text-xs md:text-sm text-slate-500 font-sans italic">
            English: {dossier.titleEn}
          </p>
        </div>

        {/* Action Buttons (Disabled honest preview) */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            icon="edit_document"
            disabled
            title="Cần quyền Trưởng nhóm và hỗ trợ từ API backend"
          >
            Chỉnh sửa hồ sơ (Sắp có)
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon="picture_as_pdf"
            disabled
            title="Chức năng xuất PDF đang được phát triển"
          >
            Xuất hồ sơ PDF (Sắp có)
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Supervisor Box */}
        <div className="p-3.5 rounded-lg bg-slate-50 border border-hairline flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Giảng viên Hướng dẫn chính
            </span>
            {dossier.supervisor.hasDigitalSignature && (
              <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded whitespace-nowrap">
                <span className="material-symbols-outlined text-[12px]">edit_note</span>
                Chữ ký số mô phỏng (Demo)
              </span>
            )}
          </div>
          <div>
            <p className="font-heading font-bold text-sm text-slate-900">
              {dossier.supervisor.name}
            </p>
            <p className="text-xs text-slate-600">
              {dossier.supervisor.title} • {dossier.supervisor.department}
            </p>
            <p className="font-mono text-[11px] text-slate-500 mt-1">
              Email: {dossier.supervisor.email}
            </p>
            {dossier.supervisor.signatureDate && (
              <p className="font-mono text-[10px] text-slate-400 mt-0.5">
                Thời điểm ký: {dossier.supervisor.signatureDate}
              </p>
            )}
          </div>
        </div>

        {/* Reviewer Box */}
        <div className="p-3.5 rounded-lg bg-slate-50 border border-hairline flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Cán bộ / Giảng viên Phản biện
            </span>
            <span className="font-mono text-[10px] text-slate-400 bg-slate-200/70 px-2 py-0.5 rounded whitespace-nowrap">
              Được phân công
            </span>
          </div>
          <div>
            <p className="font-heading font-bold text-sm text-slate-900">
              {dossier.reviewer.name}
            </p>
            <p className="text-xs text-slate-600">
              {dossier.reviewer.title} • {dossier.reviewer.department}
            </p>
            <p className="font-mono text-[11px] text-slate-500 mt-1">
              Email: {dossier.reviewer.email}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
