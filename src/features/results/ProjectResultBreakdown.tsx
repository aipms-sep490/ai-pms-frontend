import { displayLabel } from '../../components/ui/display-label'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../../components/ui/Table'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { formatScore } from '../../components/ui/format'
import type { ResultBreakdown, ResultContribution } from './result-types'

interface ProjectResultBreakdownProps {
  majorNames?: Record<number, string>
  breakdown?: ResultBreakdown | null
  contributions?: ResultContribution[]
}

/**
 * Project-level composition for v5 `ProjectResult` rendered from structured formula components.
 * Renders nothing when the backend hasn't shipped a breakdown yet, so the caller still shows the
 * numeric total on its own. Advisory contributions (industry ADVISORY) are listed apart and never
 * summed. A non-approved scheme (demo/proposed — e.g. an unapproved Marketing rubric template) is
 * flagged; never present it as an official academic breakdown without that signal.
 */
const scopeLabels: Record<string, string> = {
  COMMON: 'điểm chung',
  MAJOR: 'tổng hợp theo ngành',
  INDIVIDUAL: 'đánh giá cá nhân',
}

export function formatFormula(breakdown: ResultBreakdown): string {
  const formulaComponents = breakdown.formula?.components
  if (Array.isArray(formulaComponents) && formulaComponents.length > 0) {
    const parts = formulaComponents.map((c) => {
      const label = scopeLabels[c.type] ?? c.type
      return `${c.weightPercent}% ${label}`
    })
    return `Điểm đồ án = ${parts.join(' + ')}.`
  }

  if (Array.isArray(breakdown.components) && breakdown.components.length > 0) {
    const projectComponents = breakdown.components.filter(
      (c) => c.weightPercent > 0 && c.scope !== 'INDIVIDUAL',
    )
    if (projectComponents.length > 0) {
      const parts = projectComponents.map((c) => {
        const label = scopeLabels[c.scope] ?? c.name ?? c.scope
        return `${c.weightPercent}% ${label}`
      })
      return `Điểm đồ án = ${parts.join(' + ')}.`
    }
  }

  return 'Cách tính điểm theo phương án đánh giá đã công bố.'
}

export function ProjectResultBreakdown({ breakdown, contributions, majorNames = {} }: ProjectResultBreakdownProps) {
  const advisory = (contributions ?? []).filter(item => item.advisory)
  if (!breakdown && advisory.length === 0) return null

  return (
    <>
      {breakdown && (
        <section className="workspace-surface space-y-3 p-4 sm:p-5" aria-label="Cấu thành điểm đồ án">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-heading font-semibold">Cấu thành điểm đồ án</h2>
            {(breakdown.isDemo || breakdown.approvalStatus !== 'APPROVED') && (
              <StatusBadge tone="warning" label={breakdown.isLegacy ? 'Chính sách cũ (tra cứu)' : 'Phương án demo / chưa duyệt chính thức'} />
            )}
          </div>
          <p className="text-sm text-ink-muted">
            {formatFormula(breakdown)}
            {breakdown.schemeName && ` Theo phương án "${breakdown.schemeName}"${breakdown.schemeVersion ? ` (v${breakdown.schemeVersion})` : ''}.`}
          </p>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Điểm chung (COMMON)</dt><dd className="mt-1 font-mono text-lg font-semibold tabular-nums text-ink">{formatScore(breakdown.commonScore)}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Tổng hợp theo ngành (MajorAggregate)</dt><dd className="mt-1 font-mono text-lg font-semibold tabular-nums text-ink">{formatScore(breakdown.majorAggregate)}</dd></div>
          </dl>
          {breakdown.majorBreakdown.length > 0 && (
            <div>
              <p className="mb-1 text-xs text-ink-muted">Ngành chưa có điểm được đánh dấu "Chưa có điểm", không tính là 0.</p>
              <Table stack aria-label="Điểm theo ngành">
                <TableHead>
                  <TableRow head>
                    <TableHeaderCell>Ngành</TableHeaderCell>
                    <TableHeaderCell numeric>Điểm ngành</TableHeaderCell>
                    <TableHeaderCell>Trạng thái</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {breakdown.majorBreakdown.map((major, index) => {
                    const pending = major.score === null
                    return (
                      <TableRow key={`${major.majorId}-${index}`}>
                        <TableCell label="Ngành" className="font-medium text-ink">{majorNames[major.majorId] ?? 'Chưa tải được tên ngành'}</TableCell>
                        <TableCell label="Điểm ngành" numeric className="font-semibold">{formatScore(major.score)}</TableCell>
                        <TableCell label="Trạng thái"><StatusBadge tone={pending ? 'warning' : 'success'} label={pending ? 'Chưa có điểm' : 'Đã chấm'} /></TableCell>
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
          <p className="text-sm text-ink-muted">Các góp ý dưới đây là cố vấn thực tiễn, <strong>không tính vào điểm số</strong> trừ khi phương án đánh giá được duyệt có trọng số.</p>
          <ul className="space-y-2 text-sm">
            {advisory.map(item => (
              <li key={item.assignmentId} className="rounded-lg border border-hairline bg-canvas p-3">
                <span className="inline-flex items-center rounded-full border border-hairline bg-card px-2 py-0.5 text-xs font-semibold text-ink-muted">{displayLabel('ADVISORY')}</span>
                <span className="ml-2 text-ink-soft">{item.source ? displayLabel(item.source) : 'Chuyên gia doanh nghiệp'} · người chấm #{item.evaluatorId}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
