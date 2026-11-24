import { useMemo } from 'react'
import { displayLabel } from '../../components/ui/display-label'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../../components/ui/Table'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Pagination } from '../../components/ui/Pagination'
import { useClientPagination } from '../../components/ui/useClientPagination'
import { formatScore } from '../../components/ui/format'
import type { ResultBreakdown, ResultContribution } from './result-types'

interface ProjectResultBreakdownProps {
  target?: 'project' | 'student'
  majorNames?: Record<number, string>
  breakdown?: ResultBreakdown | null
  contributions?: ResultContribution[]
}

/**
 * Displays frozen server result data and optional BE-15 formula metadata without calculating scores.
 * Renders nothing when the backend hasn't shipped a breakdown yet, so the caller still shows the
 * numeric total on its own. Advisory contributions (industry ADVISORY) are listed apart and never
 * summed. A non-approved scheme (demo/proposed — e.g. an unapproved Marketing rubric template) is
 * flagged; never present it as an official academic breakdown without that signal.
 */
export function ProjectResultBreakdown({ breakdown, contributions, majorNames = {}, target = 'project' }: ProjectResultBreakdownProps) {
  const advisory = useMemo(() => (contributions ?? []).filter(item => item.advisory), [contributions])
  const components = useMemo(() => breakdown?.components ?? [], [breakdown])
  const majorBreakdown = useMemo(() => breakdown?.majorBreakdown ?? [], [breakdown])
  const componentPagination = useClientPagination(components, 10)
  const majorPagination = useClientPagination(majorBreakdown, 8)
  const advisoryPagination = useClientPagination(advisory, 8)
  const formula = formulaLabel(breakdown?.formula, target)
  const heading = target === 'student' ? 'Cấu thành điểm cá nhân' : 'Cấu thành điểm đồ án'
  if (!breakdown && advisory.length === 0) return null

  return (
    <>
      {breakdown && (
        <section className="overflow-hidden rounded-2xl border border-hairline bg-card shadow-xs" aria-label={heading}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
            <h2 className="font-heading font-semibold text-ink">{heading}</h2>
            {(breakdown.isDemo || breakdown.approvalStatus !== 'APPROVED') && (
              <StatusBadge tone="warning" label={breakdown.isLegacy ? 'Chính sách cũ (tra cứu)' : 'Phương án demo / chưa duyệt chính thức'} />
            )}
          </div>
          <div className="space-y-4 p-5">
            <div className="space-y-1">
              <p className="text-sm text-ink-muted">
                {formula ?? 'Cách tính điểm theo phương án đánh giá đã công bố.'}
              </p>
              <p className="text-sm text-ink-muted">{breakdown.schemeName && `Phương án: ${breakdown.schemeName}. `}{breakdown.schemeVersion != null ? `Phiên bản ${breakdown.schemeVersion}.` : 'Chưa có phiên bản phương án.'}</p>
            </div>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-hairline bg-canvas/50 p-3.5"><dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Điểm chung (COMMON)</dt><dd className="mt-1 font-mono text-lg font-semibold tabular-nums text-ink">{formatScore(breakdown.commonScore)}</dd></div>
              <div className="rounded-xl border border-hairline bg-canvas/50 p-3.5"><dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Tổng hợp theo ngành (MajorAggregate)</dt><dd className="mt-1 font-mono text-lg font-semibold tabular-nums text-ink">{formatScore(breakdown.majorAggregate)}</dd></div>
            </dl>
            {components.length > 0 && <div className="space-y-3">
              <Table stack aria-label="Điểm thành phần do hệ thống cung cấp">
                <TableHead><TableRow head><TableHeaderCell>Thành phần</TableHeaderCell><TableHeaderCell numeric>Điểm</TableHeaderCell><TableHeaderCell>Trạng thái</TableHeaderCell></TableRow></TableHead>
                <TableBody>{componentPagination.paginatedItems.map(component => {
                  const inactive = component.weightPercent === 0
                  const pending = component.score == null
                  return <TableRow key={component.componentId}>
                    <TableCell label="Thành phần">{component.name}{component.majorId != null && ` · ${majorNames[component.majorId] ?? `Ngành #${component.majorId}`}`}</TableCell>
                    <TableCell label="Điểm" numeric>{inactive ? 'Không áp dụng' : formatScore(component.score)}</TableCell>
                    <TableCell label="Trạng thái"><StatusBadge tone={inactive || pending ? 'warning' : 'success'} label={inactive ? 'Không tính vào tổng này' : pending ? 'Chưa có điểm' : 'Đã chấm'} /></TableCell>
                  </TableRow>
                })}</TableBody>
              </Table>
              <p className="text-sm text-ink-muted">{components.length} thành phần</p>
              {componentPagination.showPagination && (
                <Pagination page={componentPagination.page} pages={componentPagination.totalPages} total={componentPagination.total} pageSize={componentPagination.pageSize} onPage={componentPagination.setPage} />
              )}
            </div>}
            {majorBreakdown.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs text-ink-muted">Ngành chưa có điểm được đánh dấu "Chưa có điểm", không tính là 0.</p>
                <Table stack aria-label="Điểm theo ngành">
                  <TableHead>
                    <TableRow head>
                      <TableHeaderCell>Ngành</TableHeaderCell>
                      <TableHeaderCell numeric>Điểm ngành</TableHeaderCell>
                      <TableHeaderCell>Trạng thái</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {majorPagination.paginatedItems.map((major, index) => {
                      const pending = major.score === null
                      return (
                        <TableRow key={`${major.majorId}-${index}`}>
                          <TableCell label="Ngành" className="font-medium text-ink">{majorNames[major.majorId] ?? 'Chưa tải được tên ngành'}</TableCell>
                          <TableCell label="Điểm ngành" numeric className="font-semibold tabular-nums">{formatScore(major.score)}</TableCell>
                          <TableCell label="Trạng thái"><StatusBadge tone={pending ? 'warning' : 'success'} label={pending ? 'Chưa có điểm' : 'Đã chấm'} /></TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
                {majorPagination.showPagination && (
                  <Pagination page={majorPagination.page} pages={majorPagination.totalPages} total={majorPagination.total} pageSize={majorPagination.pageSize} onPage={majorPagination.setPage} />
                )}
              </div>
            )}
          </div>
        </section>
      )}
      {advisory.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-hairline bg-card shadow-xs" aria-label="Góp ý cố vấn">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
            <h2 className="font-heading font-semibold text-ink">Góp ý cố vấn doanh nghiệp</h2>
            <span className="rounded-full bg-primary-subtle px-2.5 py-0.5 text-xs font-semibold tabular-nums text-primary">{advisory.length}</span>
          </div>
          <div className="space-y-3 p-5">
            <p className="text-sm text-ink-muted">Các góp ý dưới đây là cố vấn thực tiễn, <strong>không tính vào điểm số</strong> trừ khi phương án đánh giá được duyệt có trọng số.</p>
            <ul className="space-y-2 text-sm">
              {advisoryPagination.paginatedItems.map(item => (
                <li key={item.assignmentId} className="rounded-lg border border-hairline bg-canvas p-3">
                  <span className="inline-flex items-center rounded-full border border-hairline bg-card px-2 py-0.5 text-xs font-semibold text-ink-muted">{displayLabel('ADVISORY')}</span>
                  <span className="ml-2 text-ink-soft">{item.source ? displayLabel(item.source) : 'Chuyên gia doanh nghiệp'} · người chấm #{item.evaluatorId}</span>
                </li>
              ))}
            </ul>
            {advisoryPagination.showPagination && (
              <Pagination page={advisoryPagination.page} pages={advisoryPagination.totalPages} total={advisoryPagination.total} pageSize={advisoryPagination.pageSize} onPage={advisoryPagination.setPage} />
            )}
          </div>
        </section>
      )}
    </>
  )
}

const formulaNames: Record<string, string> = { COMMON: 'điểm chung', MAJOR: 'tổng hợp theo ngành', INDIVIDUAL: 'điểm cá nhân' }
function formulaLabel(formula: ResultBreakdown['formula'], target: 'project' | 'student') {
  const items = formula?.components
  if (!Array.isArray(items) || !items.length || items.length > 3
    || items.some(item => !item || typeof item.type !== 'string' || !Object.hasOwn(formulaNames, item.type) || !Number.isInteger(item.weightPercent) || item.weightPercent < 0 || item.weightPercent > 100)
    || new Set(items.map(item => item.type)).size !== items.length
    || items.reduce((sum, item) => sum + item.weightPercent, 0) !== 100) return null
  return `Điểm ${target === 'student' ? 'cá nhân' : 'đồ án'} = ${items.filter(item => item.weightPercent > 0).map(item => `${item.weightPercent}% ${formulaNames[item.type]}`).join(' + ')}.`
}
