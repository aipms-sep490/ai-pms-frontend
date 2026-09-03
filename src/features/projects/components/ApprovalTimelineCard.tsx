import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card'
import type { ApprovalStage } from '../types/project-dossier.types'

interface ApprovalTimelineCardProps {
  timeline: ApprovalStage[]
}

export function ApprovalTimelineCard({ timeline }: ApprovalTimelineCardProps) {
  return (
    <Card className="border-hairline bg-white shadow-xs">
      <CardHeader className="pb-3 border-b border-hairline">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-academic-emerald" aria-hidden="true">
            fact_check
          </span>
          <CardTitle className="text-sm font-heading">
            Tiến trình Thẩm định & Phê duyệt Hồ sơ Đề tài
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {timeline.map((stage) => {
            const isCompleted = stage.status === 'completed'
            const isCurrent = stage.status === 'current'

            return (
              <div key={stage.step} className="relative group">
                {/* Step Marker Dot */}
                <div
                  className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-white ${
                    isCompleted
                      ? 'bg-academic-emerald text-white'
                      : isCurrent
                      ? 'bg-primary text-white animate-pulse'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {isCompleted ? (
                    <span className="material-symbols-outlined text-[13px]">check</span>
                  ) : (
                    <span className="font-mono text-[10px] font-bold">{stage.step}</span>
                  )}
                </div>

                {/* Content Box */}
                <div
                  className={`p-3 rounded-lg border transition-colors ${
                    isCurrent
                      ? 'bg-primary-subtle/50 border-primary/30'
                      : isCompleted
                      ? 'bg-slate-50/70 border-hairline'
                      : 'bg-white border-dashed border-slate-200'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-bold text-xs md:text-sm text-slate-900">
                        {stage.step}. {stage.title}
                      </span>
                      {isCompleted && (
                        <span className="font-mono text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                          Hoàn tất
                        </span>
                      )}
                      {isCurrent && (
                        <span className="font-mono text-[10px] font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                          Đang diễn ra
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[11px] text-slate-500">
                      {stage.date}
                    </span>
                  </div>

                  <p className="text-xs font-medium text-slate-700 mt-1">
                    Kết luận: <span className="text-slate-900">{stage.decision}</span>
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 mt-1.5 pt-1.5 border-t border-slate-200/60 text-[11px] text-slate-500">
                    <span>Thẩm định: <strong>{stage.reviewer}</strong></span>
                    {stage.note && <span className="italic text-slate-400">{stage.note}</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
