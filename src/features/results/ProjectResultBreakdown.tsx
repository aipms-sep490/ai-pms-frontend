import { displayLabel } from '../../components/ui/display-label'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../../components/ui/Table'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { formatPercent, formatScore } from '../../components/ui/format'
import type { ProjectMajorScore, ResultContribution } from './result-types'

interface ProjectResultBreakdownProps {
  commonScore?: number | null
  majorAggregate?: number | null
  majorBreakdown?: ProjectMajorScore[]
  contributions?: ResultContribution[]
}

/**
 * Project-level composition for v5 `ProjectResult = 50% COMMON + 50% MajorAggregate`.
 * Every section is optional: when the backend has not shipped the breakdown the whole
 * block renders nothing, so the caller still shows the numeric total on its own.
 * Advisory contributions (industry ADVISORY) are listed apart and never summed.
 */
export function ProjectResultBreakdown({ commonScore, majorAggregate, majorBreakdown, contributions }: ProjectResultBreakdownProps) {
  const hasComposition = commonScore !== undefined || majorAggregate !== undefined || (majorBreakdown?.length ?? 0) > 0
  const advisory = (contributions ?? []).filter(item => item.advisory)
  if (!hasComposition && advisory.length === 0) return null

  return (
    <>
      {hasComposition && (
        <section className="workspace-surface space-y-3 p-4 sm:p-5" aria-label="Cấu thành điểm đồ án">
          <h2 className="font-heading font-semibold">Cấu thành điểm đồ án</h2>
          <p className="text-sm text-slate-600">Điểm đồ án = 50% điểm chung + 50% tổng hợp theo ngành. Không cộng điểm cá nhân vào điểm đồ án.</p>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Điểm chung (COMMON)</dt><dd className="mt-1 font-mono text-lg font-semibold tabular-nums text-slate-900">{formatScore(commonScore)}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tổng hợp theo ngành (MajorAggregate)</dt><dd className="mt-1 font-mono text-lg font-semibold tabular-nums text-slate-900">{formatScore(majorAggregate)}</dd></div>
          </dl>
          {(majorBreakdown?.length ?? 0) > 0 && (
            <div>
              <p className="mb-1 text-xs text-slate-500">Ngành chưa có điểm được đánh dấu "Chưa có điểm", không tính là 0.</p>
              <Table stack aria-label="Điểm theo ngành">
                <TableHead>
                  <TableRow head>
                    <TableHeaderCell>Ngành</TableHeaderCell>
                    <TableHeaderCell numeric>Trọng số ngành</TableHeaderCell>
                    <TableHeaderCell numeric>Điểm ngành</TableHeaderCell>
                    <TableHeaderCell>Trạng thái</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {majorBreakdown!.map((major, index) => {
                    const pending = major.majorScore === null
                    const statusLabel = pending ? 'Chưa có điểm' : displayLabel(major.status) !== 'Chưa xác định' && major.status ? displayLabel(major.status) : 'Đã chấm'
                    return (
                      <TableRow key={`${major.majorId}-${index}`}>
                        <TableCell label="Ngành" className="font-medium text-slate-900">{major.majorName ?? `Ngành #${major.majorId}`}</TableCell>
                        <TableCell label="Trọng số ngành" numeric>{formatPercent(major.weightPercent)}</TableCell>
                        <TableCell label="Điểm ngành" numeric className="font-semibold">{formatScore(major.majorScore)}</TableCell>
                        <TableCell label="Trạng thái"><StatusBadge tone={pending ? 'warning' : 'success'} label={statusLabel} /></TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      )}
      {advisory.length > 0 && (
        <section className="workspace-surface space-y-2 p-4 sm:p-5" aria-label="Góp ý cố vấn">
          <h2 className="font-heading font-semibold">Góp ý cố vấn doanh nghiệp</h2>
          <p className="text-sm text-slate-600">Các góp ý dưới đây là cố vấn thực tiễn, <strong>không tính vào điểm số</strong> trừ khi phương án đánh giá được duyệt có trọng số.</p>
          <ul className="space-y-2 text-sm">
            {advisory.map(item => (
              <li key={item.assignmentId} className="rounded-lg border border-hairline bg-slate-50 p-3">
                <span className="inline-flex items-center rounded-full border border-hairline bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">{displayLabel('ADVISORY')}</span>
                <span className="ml-2 text-slate-700">{item.source ? displayLabel(item.source) : 'Chuyên gia doanh nghiệp'} · người chấm #{item.evaluatorId}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
