import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card'
import type { AiCopilotInsight } from '../types/dashboard.types'

interface AiPreviewProps {
  insight: AiCopilotInsight
}

export function AiPreview({ insight }: AiPreviewProps) {
  return (
    <Card className="border-blue-200 bg-linear-to-b from-blue-50/50 to-white shadow-xs">
      <CardHeader className="py-3 px-4 border-b border-blue-100 flex-wrap gap-2">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-blue-600" aria-hidden="true">
              neurology
            </span>
            <CardTitle className="text-xs uppercase tracking-wider font-mono text-blue-900">
              Trợ lý AI Học thuật (Lab Copilot)
            </CardTitle>
          </div>
          <Badge variant="info" size="sm">
            Mô phỏng • {insight.commitCount} commits
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 flex flex-col gap-3">
        <div className="p-3 rounded-lg bg-white border border-blue-100 text-xs text-slate-700 space-y-2 leading-relaxed">
          <p className="font-semibold text-slate-900 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px] text-amber-600" aria-hidden="true">
              tips_and_updates
            </span>
            {insight.title}:
          </p>
          <p>{insight.description}</p>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            icon="chat"
            disabled
            className="text-xs"
            title="Chức năng hội ý với Copilot sẽ khả dụng ở phân hệ Trợ lý AI"
          >
            Hội ý Copilot (Sắp có)
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon="auto_awesome"
            disabled
            className="text-xs"
            title="Chức năng tạo báo cáo tự động bằng AI sẽ khả dụng khi kết nối backend"
          >
            Báo cáo AI (Sắp có)
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
