import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card'
import type { MilestoneItem } from '../types/dashboard.types'

interface MilestoneTimelineProps {
  milestones: MilestoneItem[]
}

export function MilestoneTimeline({ milestones }: MilestoneTimelineProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-canvas/60 py-2.5 px-4">
        <div className="flex items-center justify-between w-full flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-blue-600" aria-hidden="true">
              route
            </span>
            <CardTitle className="text-xs uppercase tracking-wider font-mono">
              Lộ trình 6 Cột mốc Khóa luận Tốt nghiệp (Fall 2026)
            </CardTitle>
          </div>
          <span className="font-mono text-xs text-ink-muted font-semibold">
            Chu kỳ 15 tuần chuẩn hóa CDIO / ABET
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <ol className="grid grid-cols-1 md:grid-cols-6 gap-3 list-none p-0 m-0">
          {milestones.map((m) => {
            const isCompleted = m.status === 'completed'
            const isActive = m.status === 'active'

            return (
              <li
                key={m.id}
                className={`p-3 rounded-lg border transition-all flex flex-col justify-between gap-2 ${
                  isCompleted
                    ? 'bg-emerald-50/40 border-emerald-200'
                    : isActive
                    ? 'bg-blue-50/50 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
                    : 'bg-canvas/60 border-hairline opacity-80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded ${
                      isCompleted
                        ? 'bg-emerald-100 text-emerald-800'
                        : isActive
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-200 text-ink-muted'
                    }`}
                  >
                    {m.id}
                  </span>
                  <span className="font-mono text-xs text-ink-muted font-medium">
                    {m.date}
                  </span>
                </div>

                <div>
                  <h4 className="font-heading text-xs font-bold text-ink leading-snug line-clamp-2">
                    {m.name}
                  </h4>
                </div>

                <div className="space-y-1 pt-1 border-t border-hairline/60">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-ink-muted">Tiến độ</span>
                    <span
                      className={`font-bold ${
                        isCompleted
                          ? 'text-emerald-700'
                          : isActive
                          ? 'text-blue-700'
                          : 'text-ink-muted'
                      }`}
                    >
                      {m.progress}%
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={`Tiến độ cột mốc ${m.id} (${m.name})`}
                    aria-valuenow={m.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden"
                  >
                    <div
                      className={`h-full rounded-full transition-all ${
                        isCompleted
                          ? 'bg-emerald-600'
                          : isActive
                          ? 'bg-blue-600'
                          : 'bg-slate-400'
                      }`}
                      style={{ width: `${m.progress}%` }}
                    />
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </CardContent>
    </Card>
  )
}
