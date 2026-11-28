import type * as api from '../../../services/api/evaluations.api'
import type { EvaluationDraft } from '../evaluation-types'
import { formatPercent, formatScore } from '../../../components/ui/format'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../../../components/ui/Table'
import type { FieldValues } from './evaluator-scoring-helpers'

export type AutoSaveStatus = 'idle' | 'scheduled' | 'saving' | 'saved' | 'paused'

interface LiveScoringToolbarProps {
  draft: EvaluationDraft
  values: FieldValues
  livePreviewScore: number | null
  failingFloor: number
  isFailingFloorAlert: boolean
  isInterdisciplinaryCommonDefense?: boolean
  autoSaveStatus: AutoSaveStatus
  dirty: boolean
  busy: boolean
  conflicted: boolean
  scoringAllowed: boolean
  editable: boolean
  workbench: api.ProjectScoringWorkbench | null
  batchDraftCount: number
  workbenchTab: 'scoring' | 'process20'
  onWorkbenchTabChange: (tab: 'scoring' | 'process20') => void
  onBatchFinalizeAll: () => void
}

export function LiveScoringToolbar({
  draft,
  values,
  livePreviewScore,
  failingFloor,
  isFailingFloorAlert,
  isInterdisciplinaryCommonDefense = false,
  autoSaveStatus,
  dirty,
  busy,
  conflicted,
  scoringAllowed,
  editable,
  workbench,
  batchDraftCount,
  workbenchTab,
  onWorkbenchTabChange,
  onBatchFinalizeAll,
}: LiveScoringToolbarProps) {
  const filledCount = draft.scores.filter(c => (values[c.rubricCriterionId]?.score ?? '').trim() !== '').length
  const remainingCount = draft.scores.length - filledCount

  return (
    <>
      <div className="evaluator-sticky-scorebar" data-testid="live-n6-bar">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Tiến trình chấm Rubrics:</span>
          <span className="rounded-full bg-canvas px-2.5 py-0.5 text-xs font-bold text-ink">
            {filledCount} / {draft.scores.length} tiêu chí
          </span>
          {livePreviewScore !== null ? (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${isFailingFloorAlert ? 'bg-status-error-bg text-status-error-text' : 'bg-status-success-bg text-status-success-text'}`}>
              Dự kiến N6: {formatScore(livePreviewScore)}/{formatScore(draft.scoreScale)}
            </span>
          ) : null}
          {isFailingFloorAlert ? (
            <span
              role="alert"
              className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                isInterdisciplinaryCommonDefense
                  ? 'border-status-warning-border bg-status-warning-bg text-status-warning-text'
                  : 'border-status-error-border bg-status-error-bg text-status-error-text'
              }`}
            >
              {isInterdisciplinaryCommonDefense
                ? `Điểm Bảo vệ phần Chung < ${formatScore(failingFloor)} — theo POL-01 liên ngành, điều kiện liệt được xét trên tổng khối 40% Chung (30% Cold + 70% Defense). Hội đồng lưu ý rà soát.`
                : `Cảnh báo điểm liệt (< ${formatScore(failingFloor)})`}
            </span>
          ) : null}
          {remainingCount === 0 ? (
            <span className="rounded-full bg-status-success-bg px-2 py-0.5 text-xs font-semibold text-status-success-text">✓ Đã chấm đủ</span>
          ) : (
            <span className="rounded-full bg-status-warning-bg px-2 py-0.5 text-xs font-semibold text-status-warning-text">
              Còn {remainingCount} tiêu chí
            </span>
          )}
          {autoSaveStatus === 'saving' ? <span className="text-xs text-ink-muted">Đang tự lưu…</span> : null}
          {autoSaveStatus === 'saved' && !dirty ? <span className="text-xs text-academic-emerald">Đã tự lưu</span> : null}
          {autoSaveStatus === 'paused' ? <span className="text-xs font-semibold text-status-warning-text">Tự lưu tạm dừng (giữ nguyên bản nháp)</span> : null}
        </div>
        <div className="flex items-center gap-2">
          {workbench && batchDraftCount > 0 && scoringAllowed ? (
            <button
              type="button"
              disabled={busy || conflicted || dirty}
              onClick={onBatchFinalizeAll}
              className="inline-flex min-h-9 items-center justify-center rounded-lg border border-primary bg-card px-3 text-xs font-semibold text-primary hover:bg-primary-subtle disabled:opacity-50"
            >
              Chốt hàng loạt ({batchDraftCount})
            </button>
          ) : null}
          {scoringAllowed && editable ? (
            <button
              type="submit"
              form="evaluator-scoring-form"
              disabled={busy || conflicted}
              aria-label="Lưu nhanh tiến trình"
              className="inline-flex min-h-9 items-center justify-center rounded-lg bg-primary px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-primary-hover disabled:opacity-50"
            >
              {busy ? 'Đang lưu…' : 'Lưu nhanh'}
            </button>
          ) : null}
        </div>
      </div>

      {workbench ? (
        <section className="rounded-xl border border-hairline bg-card p-4 space-y-3" aria-label="Bảng thành viên và điểm quá trình 20%">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2" role="tablist" aria-label="Chế độ xem bàn chấm">
              <button
                type="button"
                role="tab"
                aria-selected={workbenchTab === 'scoring'}
                onClick={() => onWorkbenchTabChange('scoring')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${workbenchTab === 'scoring' ? 'bg-primary text-white' : 'border border-hairline text-ink-soft'}`}
              >
                Phiếu chấm 80% (Hội đồng)
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={workbenchTab === 'process20'}
                onClick={() => onWorkbenchTabChange('process20')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${workbenchTab === 'process20' ? 'bg-primary text-white' : 'border border-hairline text-ink-soft'}`}
              >
                Điểm GVHD 20% (Chỉ đọc) &amp; Đóng góp ({workbench.roster.length} SV)
              </button>
            </div>
          </div>
          {workbenchTab === 'process20' ? (
            <Table className="text-xs">
              <TableHead>
                <TableRow head>
                  <TableHeaderCell>MSSV / Thành viên</TableHeaderCell>
                  <TableHeaderCell>Chuyên ngành</TableHeaderCell>
                  <TableHeaderCell>Đóng góp</TableHeaderCell>
                  <TableHeaderCell>20% GVHD (G1–G3)</TableHeaderCell>
                  <TableHeaderCell>Trạng thái phiếu</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {workbench.roster.map(member => (
                  <TableRow key={member.studentId}>
                    <TableCell className="font-medium text-ink">{member.studentCode ? `${member.studentCode} · ` : ''}{member.fullName}{member.isLeader ? ' (Nhóm trưởng)' : ''}</TableCell>
                    <TableCell>{member.majorName ?? member.majorCode ?? '—'}</TableCell>
                    <TableCell>{formatPercent(member.contributionPercent)}</TableCell>
                    <TableCell className="font-semibold text-ink">
                      {member.individualProcessScore != null ? `${formatScore(member.individualProcessScore)}/10${member.individualProcessComplete ? '' : ' (Chưa đủ 3 Gate)'}` : 'Chưa chốt'}
                    </TableCell>
                    <TableCell className="text-ink-muted">
                      {member.assignments.length === 0 ? 'Theo phiếu chung' : member.assignments.map(a => `${a.componentName ?? a.scope}: ${a.status}`).join(' · ')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </section>
      ) : null}
    </>
  )
}
