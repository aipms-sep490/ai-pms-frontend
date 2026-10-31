import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card'
import { MultidisciplinaryTag } from '../../../components/ui/MultidisciplinaryTag'
import type { MemberContribution } from '../types/dashboard.types'

interface ContributionPreviewProps {
  contributions: MemberContribution[]
}

export function ContributionPreview({ contributions }: ContributionPreviewProps) {
  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between w-full flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">
              pie_chart
            </span>
            <CardTitle className="text-xs uppercase tracking-wider font-mono">
              Tỷ lệ Đóng góp Thành viên (Mô phỏng)
            </CardTitle>
          </div>
          <span className="font-mono text-xs text-status-success-text font-bold bg-status-success-bg px-2 py-0.5 rounded border border-status-success-border">
            Mô phỏng CDIO
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-4 flex flex-col gap-3">
        {/* Segmented Progress Bar */}
        <div
          role="group"
          aria-label="Biểu đồ phân bổ tỷ lệ đóng góp giữa các thành viên"
          className="w-full h-3 rounded-full overflow-hidden flex shadow-inner bg-slate-100"
        >
          {contributions.map((member) => (
            <div
              key={member.name}
              className={`${member.color} h-full transition-all`}
              style={{ width: `${member.percentage}%` }}
              title={`${member.name} (${member.percentage}%)`}
            />
          ))}
        </div>

        {/* Member Breakdown List */}
        <div className="space-y-2 pt-1 text-xs">
          {contributions.map((member) => (
            <div key={member.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2.5 h-2.5 rounded-full ${member.color} shrink-0`} aria-hidden="true" />
                <span className="font-medium text-ink-soft truncate">{member.name}</span>
                <MultidisciplinaryTag major={member.major} />
              </div>
              <span className="font-mono font-bold text-ink-soft shrink-0 ml-2">
                {member.percentage}% ({member.storyPoints} SP)
              </span>
            </div>
          ))}
        </div>

        <div className="p-2.5 rounded bg-canvas border border-hairline/80 text-xs text-ink-muted flex items-center gap-2 mt-1">
          <span className="material-symbols-outlined text-[15px] text-primary shrink-0" aria-hidden="true">
            verified
          </span>
          <span>Dữ liệu minh họa phân bổ đóng góp nhóm đồ án theo chuẩn CDIO.</span>
        </div>
      </CardContent>
    </Card>
  )
}
