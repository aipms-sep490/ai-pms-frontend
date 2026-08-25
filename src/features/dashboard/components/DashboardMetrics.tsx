import { Badge } from '../../../components/ui/Badge'
import { TelemetryCard } from '../../../components/ui/TelemetryCard'
import type { TelemetryMetric } from '../types/dashboard.types'

interface DashboardMetricsProps {
  metrics: TelemetryMetric[]
}

export function DashboardMetrics({ metrics }: DashboardMetricsProps) {
  return (
    <section
      aria-label="Các chỉ số tiến độ và vận hành"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {metrics.map((metric) => (
        <TelemetryCard
          key={metric.label}
          label={metric.label}
          value={metric.value}
          unit={metric.unit}
          icon={metric.icon}
          iconColor={metric.iconColor}
          statusBadge={
            <Badge variant={metric.badgeVariant} size="sm" dot>
              {metric.badgeText}
            </Badge>
          }
          subtitle={metric.subtitle}
        />
      ))}
    </section>
  )
}
