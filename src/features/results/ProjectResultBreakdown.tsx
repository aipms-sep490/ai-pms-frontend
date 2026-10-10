import { displayLabel } from '../../components/ui/display-label'
import type { ProjectMajorScore, ResultContribution } from './result-types'

interface ProjectResultBreakdownProps {
  commonScore?: number | null
  majorAggregate?: number | null
  majorBreakdown?: ProjectMajorScore[]
  contributions?: ResultContribution[]
}

const fmt = (value: number | null | undefined) => (value === null || value === undefined ? '—' : String(value))

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
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Điểm chung (COMMON)</dt><dd className="mt-1 font-mono text-lg font-semibold text-slate-900">{fmt(commonScore)}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tổng hợp theo ngành (MajorAggregate)</dt><dd className="mt-1 font-mono text-lg font-semibold text-slate-900">{fmt(majorAggregate)}</dd></div>
          </dl>
          {(majorBreakdown?.length ?? 0) > 0 && (
            <div className="overflow-x-auto">
              <p className="mb-1 text-xs text-slate-500">Ngành chưa có điểm được đánh dấu "Chưa có điểm", không tính là 0.</p>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-hairline text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th scope="col" className="py-2 pr-4">Ngành</th>
                    <th scope="col" className="py-2 pr-4 text-right">Trọng số ngành</th>
                    <th scope="col" className="py-2 pr-4 text-right">Điểm ngành</th>
                    <th scope="col" className="py-2">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {majorBreakdown!.map((major, index) => {
                    const pending = major.majorScore === null
                    return (
                      <tr key={`${major.majorId}-${index}`} className="border-b border-hairline/70">
                        <td className="py-2.5 pr-4 font-medium text-slate-900">{major.majorName ?? `Ngành #${major.majorId}`}</td>
                        <td className="py-2.5 pr-4 text-right font-mono text-slate-700">{major.weightPercent}%</td>
                        <td className="py-2.5 pr-4 text-right font-mono font-semibold text-slate-900">{pending ? '—' : major.majorScore}</td>
                        <td className="py-2.5"><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${pending ? 'border border-status-warning-border bg-status-warning-bg text-status-warning-text' : 'border border-status-success-border bg-status-success-bg text-status-success-text'}`}>{pending ? 'Chưa có điểm' : displayLabel(major.status) !== 'Chưa xác định' && major.status ? displayLabel(major.status) : 'Đã chấm'}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
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
