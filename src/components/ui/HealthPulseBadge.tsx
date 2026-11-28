import { StatusBadge } from './StatusBadge'

export interface HealthPulseSignals {
  evidenceReadyPercent?: number | null
  totalMandatoryGateRequirements?: number
  blockedOver48hCount?: number
  weeklyReportsLast14Days?: number
  interdisciplinaryBalanceRatio?: number | null
}

interface HealthPulseBadgeProps {
  healthPulseStatus?: string | null
  riskLevel?: string | null
  signals?: HealthPulseSignals | null
}

function resolveStatus(healthPulseStatus?: string | null, riskLevel?: string | null): 'GREEN' | 'YELLOW' | 'RED' | 'INSUFFICIENT_DATA' {
  const pulse = healthPulseStatus?.trim().toUpperCase()
  if (pulse === 'GREEN' || pulse === 'YELLOW' || pulse === 'RED' || pulse === 'INSUFFICIENT_DATA') return pulse
  const risk = riskLevel?.trim().toUpperCase()
  if (risk === 'LOW') return 'GREEN'
  if (risk === 'MEDIUM') return 'YELLOW'
  if (risk === 'HIGH' || risk === 'CRITICAL') return 'RED'
  return 'INSUFFICIENT_DATA'
}

export function HealthPulseBadge({ healthPulseStatus, riskLevel, signals }: HealthPulseBadgeProps) {
  const status = resolveStatus(healthPulseStatus, riskLevel)
  const meta = status === 'GREEN'
    ? { tone: 'success' as const, label: 'Sức khỏe: Ổn định (Thấp)' }
    : status === 'YELLOW'
    ? { tone: 'warning' as const, label: 'Sức khỏe: Cần theo dõi (Trung bình)' }
    : status === 'RED'
    ? { tone: 'danger' as const, label: 'Sức khỏe: Nguy cơ cao (Cao)' }
    : { tone: 'neutral' as const, label: 'Sức khỏe: Chưa đủ dữ liệu' }

  const tooltip = signals
    ? [
        `Minh chứng Gate READY: ${signals.evidenceReadyPercent != null ? `${signals.evidenceReadyPercent}%` : 'Chưa có'} (${signals.totalMandatoryGateRequirements ?? 0} bắt buộc)`,
        `Task BLOCKED > 48h: ${signals.blockedOver48hCount ?? 0}`,
        `Báo cáo tuần (14 ngày): ${signals.weeklyReportsLast14Days ?? 0}`,
        signals.interdisciplinaryBalanceRatio != null ? `Cân bằng IT/MKT: ${signals.interdisciplinaryBalanceRatio}` : null,
      ].filter(Boolean).join(' · ')
    : 'Đánh giá theo Health Pulse 4 tín hiệu (Gate READY, Task BLOCKED > 48h, Báo cáo 14 ngày, Cân bằng IT/MKT).'

  return (
    <span title={tooltip} className="inline-flex items-center">
      <StatusBadge status={status} tone={meta.tone} label={meta.label} />
    </span>
  )
}
