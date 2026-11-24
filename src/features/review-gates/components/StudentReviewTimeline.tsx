import { Table, TableHead } from '../../../components/ui/Table'
import { useMemo, useState } from 'react'
import { FilterToolbar } from '../../../components/ui/FilterToolbar'
import type { DefenseReadinessSummary, GateStatus, StudentGateRequirement, StudentReviewTimelineDto } from '../types/review-gates.types'
import { ReviewSubmissionModal, type ReviewSubmissionPayload } from './ReviewSubmissionModal'
import { EvidenceDownloadButton } from './EvidenceDownloadButton'
import { DefenseReadinessChecker } from './DefenseReadinessChecker'
import { Modal } from '../../../components/ui/Modal'
import { env } from '../../../app/config/env'
import { evidenceArtifactLabel } from '../utils/evidence-link'
import { gateStatusLabels, requirementTypeLabel } from '../utils/review-gate-labels'
import { displayLabel } from '../../../components/ui/display-label'
import { dateTimeLabel } from '../../execution/execution-utils'
import { humanizeHttpError } from '../../../services/http/humanize-http-error'

function formatGateWindow(start?: string | null, end?: string | null): string {
  const s = start?.trim()
  const e = end?.trim()
  if (s && e) return `${s} → ${e}`
  if (e) return `Hạn nộp: ${e}`
  if (s) return `Từ ${s}`
  return 'Mở theo tiến độ học kỳ'
}

function formatRequirementCode(code: string): string {
  if (/^INDIV_\d+$/i.test(code)) return 'Minh chứng cá nhân'
  return code
}

function formatSubmitter(submittedBy?: string | null, submittedByName?: string | null): string {
  if (submittedByName?.trim()) return submittedByName.trim()
  if (!submittedBy?.trim()) return 'Thành viên nhóm'
  if (/^\d+$/.test(submittedBy.trim())) return 'Thành viên nhóm'
  return submittedBy.trim()
}

function formatPct(value: number): string {
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value)}%`
}

function defenseReadinessLabel(status?: string | null, isReady?: boolean | null): string {
  if (isReady === false) return 'CHƯA ĐỦ ĐIỀU KIỆN'
  if (isReady === true) return 'ĐỦ ĐIỀU KIỆN (DỰ KIẾN)'
  const normalized = status?.trim().toUpperCase()
  if (normalized === 'READY' || normalized === 'ELIGIBLE' || normalized === 'PASSED') return 'ĐỦ ĐIỀU KIỆN (DỰ KIẾN)'
  if (normalized === 'BLOCKED' || normalized === 'NOT_READY' || normalized === 'INELIGIBLE') return 'CHƯA ĐỦ ĐIỀU KIỆN'
  return 'CHƯA ĐƯỢC ĐÁNH GIÁ'
}

interface StudentReviewTimelineProps {
  timeline: StudentReviewTimelineDto
  isLeader: boolean
  isAuthenticated?: boolean
  onToggleRole?: () => void
  onSubmitRevision: (gateCode: string, requirementId: string, payload: ReviewSubmissionPayload) => Promise<void>
  onSubmitForReview?: (gateCode: string) => Promise<void>
  readiness?: DefenseReadinessSummary | null
  onReload?: () => Promise<void>
}

function academicProgressSourceLabel(source?: string): string {
  switch (source) {
    case 'NOT_CONFIGURED': return 'Chưa cấu hình trọng số Cổng thẩm định.'
    case 'INSUFFICIENT_DATA': return 'Chưa đủ dữ liệu để xác định tiến độ học vụ.'
    case 'FROZEN_GATE_WEIGHTS':
    case 'WEIGHTED_GATES': return 'Tính theo trọng số các Cổng thẩm định đã đạt.'
    default: return 'Nguồn tiến độ học vụ chưa được xác định.'
  }
}

export function StudentReviewTimeline({
  timeline,
  isLeader,
  isAuthenticated = true,
  onToggleRole,
  onSubmitRevision,
  onSubmitForReview,
  readiness,
  onReload,
}: StudentReviewTimelineProps) {
  const [selectedGateCode, setSelectedGateCode] = useState(timeline.currentGateCode || timeline.gates[0]?.code)
  const [activeReqForSubmission, setActiveReqForSubmission] = useState<StudentGateRequirement | null>(null)
  const [showDefenseModal, setShowDefenseModal] = useState(false)
  const [submittingGate, setSubmittingGate] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'requirements' | 'feedback' | 'revisions'>('requirements')
  const [reqSearch, setReqSearch] = useState('')
  const [reqFilter, setReqFilter] = useState<'ALL' | 'MANDATORY' | 'ACTION_NEEDED' | 'ACCEPTED'>('ALL')

  const selectedGate = timeline.gates.find((g) => g.code === selectedGateCode) || timeline.gates[0]
  const filteredRequirements = useMemo(() => {
    const list = selectedGate?.requirements ?? []
    const needle = reqSearch.trim().toLowerCase()
    return list.filter((req) => {
      if (reqFilter === 'MANDATORY' && !req.isMandatory) return false
      if (reqFilter === 'ACTION_NEEDED' && !['PENDING', 'REJECTED'].includes(req.verificationStatus)) return false
      if (reqFilter === 'ACCEPTED' && req.verificationStatus !== 'ACCEPTED') return false
      if (!needle) return true
      return (
        req.title.toLowerCase().includes(needle) ||
        req.code.toLowerCase().includes(needle) ||
        (req.latestArtifact?.filename ?? '').toLowerCase().includes(needle)
      )
    })
  }, [selectedGate, reqFilter, reqSearch])
  const submissionRequirement = selectedGate?.requirements.find(req => req.id === activeReqForSubmission?.id) ?? null
  const completedGatesCount = timeline.gates.filter((g) => g.status === 'PASSED').length
  const totalGatesCount = timeline.gates.length
  const gateFeedbacks = (timeline.supervisorFeedbacks ?? []).filter(item => item.gateCode === selectedGate?.code)
  const revisionItems = (selectedGate?.requirements ?? []).filter(
    req => req.verificationStatus === 'REJECTED' || (req.verificationStatus !== 'ACCEPTED' && Boolean(req.reviewerFeedback)),
  )
  const branchCount = timeline.disciplineProgress?.length ?? 0
  const branchGridCols = branchCount <= 1
    ? 'grid-cols-1'
    : branchCount === 2
    ? 'grid-cols-1 sm:grid-cols-2'
    : branchCount === 3
    ? 'grid-cols-1 sm:grid-cols-3'
    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
  const gateGridCols = totalGatesCount <= 1
    ? 'grid-cols-1'
    : totalGatesCount === 2
    ? 'grid-cols-1 sm:grid-cols-2'
    : totalGatesCount === 3
    ? 'grid-cols-1 sm:grid-cols-3'
    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
  // Server-authoritative values (no client calculation or fallback heuristics)
  const academicProgress = timeline.academicProgress
  const isDefenseReady = readiness?.isReady ?? timeline.isDefenseReady
  const canSubmitSelectedGate = Boolean(isAuthenticated && isLeader && selectedGate
    && selectedGate.code === timeline.currentGateCode && selectedGate.status !== 'LOCKED' && selectedGate.status !== 'PASSED'
    && (selectedGate.status === 'REVISION_REQUIRED' ? timeline.capabilities.canSubmitRevision : timeline.capabilities.canSubmitPackage))

  const getStatusBadge = (status: GateStatus) => {
    switch (status) {
      case 'PASSED':
        return <span className="rounded-full bg-status-success-bg px-2.5 py-0.5 text-xs font-bold text-status-success-text border border-status-success-border">✓ ĐÃ ĐẠT</span>
      case 'REVISION_REQUIRED':
        return <span className="rounded-full bg-status-error-bg px-2.5 py-0.5 text-xs font-bold text-status-error-text border border-status-error-border">! CẦN CHỈNH SỬA</span>
      case 'IN_REVIEW':
        return <span className="rounded-full bg-primary-subtle px-2.5 py-0.5 text-xs font-bold text-primary border border-primary/20">◷ ĐANG THẨM ĐỊNH</span>
      case 'PLANNED':
        return <span className="rounded-full bg-canvas px-2.5 py-0.5 text-xs font-semibold text-ink-muted border border-hairline">KẾ HOẠCH</span>
      default:
        return <span className="rounded-full bg-canvas px-2.5 py-0.5 text-xs font-semibold text-ink-muted border border-hairline">{gateStatusLabels[status] ?? 'Chưa xác định'}</span>
    }
  }

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return <span className="inline-flex items-center whitespace-nowrap rounded-md bg-status-success-bg px-2 py-0.5 text-xs font-semibold text-status-success-text border border-status-success-border">✓ Chấp thuận</span>
      case 'REJECTED':
        return <span className="inline-flex items-center whitespace-nowrap rounded-md bg-status-error-bg px-2 py-0.5 text-xs font-semibold text-status-error-text border border-status-error-border">✕ Cần nộp lại</span>
      case 'SUBMITTED':
        return <span className="inline-flex items-center whitespace-nowrap rounded-md bg-primary-subtle px-2 py-0.5 text-xs font-semibold text-primary border border-primary/20">◷ Đã nộp (chờ duyệt)</span>
      default:
        return <span className="inline-flex items-center whitespace-nowrap rounded-md bg-canvas px-2 py-0.5 text-xs font-medium text-ink-muted border border-hairline">Chưa nộp</span>
    }
  }

  return (
    <div className="review-gates-surface min-w-0 space-y-5">
      {/* Unified Project Policy, Role & Permission Context Card */}
      <div className="rounded-xl border border-hairline bg-card px-4 py-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <h2 className="text-sm font-bold text-ink">{timeline.projectName}</h2>
            {env.reviewGatesMockEnabled && (
              <span className="inline-flex items-center whitespace-nowrap rounded-full bg-status-success-bg px-2.5 py-0.5 text-xs font-bold text-status-success-text border border-status-success-border">
                Chính sách: v{timeline.effectivePolicyVersion} (Đã ban hành)
              </span>
            )}
            <span className="inline-flex items-center whitespace-nowrap rounded-full bg-canvas px-2.5 py-0.5 text-xs font-semibold text-ink-soft border border-hairline">
              {timeline.projectMode === 'SINGLE_MAJOR' ? 'Đơn ngành' : 'Liên ngành'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="whitespace-nowrap rounded-lg border border-hairline bg-canvas px-3 py-1 text-xs text-ink-soft">
              Vai trò hiện tại: <strong className={isLeader ? 'text-primary' : 'text-ink'}>{isLeader ? 'Trưởng nhóm' : isAuthenticated ? 'Thành viên nhóm' : 'Chưa xác thực'}</strong>
            </div>
            {onToggleRole && (
              <div className="flex items-center gap-1.5">
                <span className="rounded bg-status-warning-bg px-1.5 py-0.5 text-xs font-bold text-status-warning-text uppercase tracking-wider">
                  Mô phỏng
                </span>
                <button
                  type="button"
                  onClick={onToggleRole}
                  className="rounded-lg border border-hairline bg-card px-3 py-1 text-xs font-semibold text-ink-muted shadow-2xs hover:bg-canvas cursor-pointer"
                  title="Đổi vai trò để kiểm thử quyền Leader vs Member (Chế độ mô phỏng)"
                >
                  ⇄ Đổi vai trò kiểm thử
                </button>
              </div>
            )}
          </div>
        </div>

        {!isAuthenticated ? (
          <p className="mt-2.5 border-t border-hairline pt-2.5 text-xs leading-relaxed text-ink-soft">
            <strong className="text-ink">Thông báo phân quyền:</strong> Chưa phát hiện phiên làm việc sinh viên hợp lệ. Quyền nộp hồ sơ, sửa đổi minh chứng và các thao tác thẩm định chỉ dành cho sinh viên thuộc nhóm đồ án.
          </p>
        ) : !isLeader ? (
          <p className="mt-2.5 flex items-start gap-2 border-t border-hairline pt-2.5 text-xs leading-relaxed text-status-warning-text">
            <span className="material-symbols-outlined mt-0.5 shrink-0 text-[16px]" aria-hidden="true">info</span>
            <span>
              <strong>Thông báo quyền hạn:</strong> Bạn đang xem với vai trò Thành viên nhóm. Bạn có thể xem toàn bộ tiến trình, lịch sử nhận xét và minh chứng. Quyền nộp hồ sơ thẩm định chính thức và bản sửa đổi thuộc về Trưởng nhóm.
            </span>
          </p>
        ) : null}
      </div>

      {/* 4 KPI Summary Cards (aligned to V2 StatTileRow visual rhythm) */}
      <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Academic Execution Progress (Hero) */}
        <div className="flex h-full min-w-0 flex-col justify-between rounded-xl border border-primary bg-primary p-4 text-white shadow-sm">
          <div>
            <div className="flex items-start justify-between gap-2">
              <span className="block text-xs font-semibold uppercase tracking-[0.05em] leading-snug text-white">Tiến độ học vụ</span>
              <span aria-hidden="true" className="material-symbols-outlined grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/15 text-[18px] text-white">verified</span>
            </div>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <strong className={academicProgress != null ? 'text-2xl sm:text-[28px] font-bold leading-tight tabular-nums text-white whitespace-nowrap' : 'text-base font-bold leading-6 text-white'}>
                {academicProgress != null ? formatPct(academicProgress) : timeline.academicProgressSource === 'NOT_CONFIGURED' ? 'Chưa áp dụng quy chế Cổng thẩm định' : 'Chưa có dữ liệu'}
              </strong>
              <span className="text-xs font-medium text-white/90 whitespace-nowrap">({completedGatesCount}/{totalGatesCount} Cổng đạt)</span>
            </div>
            {academicProgress != null && <div role="progressbar" aria-label="Tiến độ học vụ" aria-valuenow={academicProgress} aria-valuemin={0} aria-valuemax={100} className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-white transition-all duration-300"
                style={{ width: `${academicProgress}%` }}
              />
            </div>}
          </div>
          <p className="mt-2.5 text-xs leading-relaxed text-white/90">
            {academicProgressSourceLabel(timeline.academicProgressSource)}
          </p>
        </div>

        {/* KPI 2: Task Progress */}
        <div className="flex h-full min-w-0 flex-col justify-between rounded-xl border border-line-strong/75 border-t-[3px] border-t-primary bg-card p-4 shadow-xs">
          <div>
            <div className="flex items-start justify-between gap-2">
              <span className="block text-xs font-semibold uppercase tracking-[0.05em] leading-snug text-ink-muted">Tiến độ công việc</span>
              <span aria-hidden="true" className="material-symbols-outlined grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-subtle text-[18px] text-primary">task_alt</span>
            </div>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <strong className="shrink-0 whitespace-nowrap text-2xl sm:text-[28px] font-bold leading-tight tabular-nums text-ink">
                {timeline.taskProgress != null ? formatPct(timeline.taskProgress) : 'Chưa đồng bộ'}
              </strong>
              <span className="text-xs text-ink-muted">Khác với học vụ</span>
            </div>
            {timeline.taskProgress != null && <div role="progressbar" aria-label="Tiến độ công việc" aria-valuenow={timeline.taskProgress} aria-valuemin={0} aria-valuemax={100} className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-canvas">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${timeline.taskProgress}%` }}
              />
            </div>}
          </div>
          <p className="mt-2.5 text-xs leading-relaxed text-ink-soft">
            {timeline.taskProgress != null
              ? 'Dữ liệu bảng công việc; không thay thế đạt cổng học vụ.'
              : 'Chưa kết nối dữ liệu bảng công việc.'}
          </p>
        </div>

        {/* KPI 3: Current Review Gate */}
        <div className="flex h-full min-w-0 flex-col justify-between rounded-xl border border-line-strong/75 border-t-[3px] border-t-status-success-text bg-card p-4 shadow-xs">
          <div>
            <div className="flex items-start justify-between gap-2">
              <span className="block text-xs font-semibold uppercase tracking-[0.05em] leading-snug text-ink-muted">Cổng đang xem</span>
              <span aria-hidden="true" className="material-symbols-outlined grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-status-success-bg text-[18px] text-status-success-text">flag</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2 min-w-0">
              <strong className="shrink-0 whitespace-nowrap text-2xl sm:text-[28px] font-bold leading-tight text-ink">{selectedGate?.code}</strong>
              <span className="min-w-0 text-xs font-semibold text-ink-soft truncate" title={selectedGate?.title}>{selectedGate?.title}</span>
            </div>
          </div>
          <div className="mt-2.5 space-y-1 text-xs text-ink-soft">
            <div className="flex items-center justify-between gap-2">
              <span className="text-ink-muted">Hạn chót:</span>
              <span className="shrink-0 whitespace-nowrap font-semibold text-ink">{selectedGate?.windowEnd || 'Theo kỳ'}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-ink-muted">Trạng thái:</span>
              <span className="shrink-0 whitespace-nowrap font-semibold text-ink">{selectedGate ? gateStatusLabels[selectedGate.status] ?? 'Chưa xác định' : 'Chưa xác định'}</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Defense Readiness Advisory */}
        <div className={`flex h-full min-w-0 flex-col justify-between rounded-xl border border-line-strong/75 border-t-[3px] ${
          isDefenseReady === true
            ? 'border-t-status-success-text'
            : isDefenseReady === false
            ? 'border-t-status-warning-text'
            : 'border-t-line-strong'
        } bg-card p-4 shadow-xs`}>
          <div>
            <div className="flex items-start justify-between gap-2">
              <span className="block text-xs font-semibold uppercase tracking-[0.05em] leading-snug text-ink-muted">Điều kiện bảo vệ</span>
              <button
                type="button"
                onClick={() => setShowDefenseModal(true)}
                className="shrink-0 whitespace-nowrap rounded-md bg-primary-subtle px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/15 cursor-pointer"
              >
                Chi tiết ↗
              </button>
            </div>
            <div className="mt-2">
              <strong
                className={`block text-base sm:text-lg font-bold leading-snug ${
                  isDefenseReady === true
                    ? 'text-status-success-text'
                    : isDefenseReady === false
                    ? 'text-status-warning-text'
                    : 'text-ink-muted'
                }`}
              >
                {defenseReadinessLabel(timeline.defenseReadinessStatus, isDefenseReady)}
              </strong>
            </div>
          </div>
          <p className="mt-2.5 text-xs leading-relaxed text-ink-soft line-clamp-2" title={readiness && !readiness.isReady ? readiness.conditions.filter(c => c.isMandatory && c.satisfied !== true).map(c => c.title).join(', ') : undefined}>
            {readiness && !readiness.isReady
              ? `Chưa đạt: ${readiness.conditions.filter(condition => condition.isMandatory && condition.satisfied !== true).map(condition => condition.title).join(', ') || 'Xem chi tiết điều kiện từ hệ thống.'}`
              : isDefenseReady === true
              ? 'Đã hoàn thành các cổng thẩm định tiên quyết (đánh giá tham khảo).'
              : isDefenseReady === false
              ? `Còn ${totalGatesCount - completedGatesCount} cổng chưa hoàn tất thẩm định.`
              : 'Chưa có kết luận chính thức từ Hội đồng học thuật.'}
          </p>
        </div>
      </div>

      {/* Interdisciplinary Multi-branch Progress (F5) */}
      {timeline.projectMode === 'INTERDISCIPLINARY' && (
        <div className="rounded-xl border border-hairline bg-card p-5 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-2">
            <div>
              <h3 className="text-sm font-bold text-ink">Tiến độ Các Phân nhánh Chuyên môn (Liên ngành)</h3>
              <p className="text-xs text-ink-muted">Mỗi chuyên ngành có trọng số và cổng thẩm định độc lập theo quy chế.</p>
            </div>
            <span className="rounded-full bg-tag-se-bg px-2.5 py-0.5 text-xs font-bold text-tag-se border border-tag-se/25">
              Mô hình Tích hợp Đa ngành
            </span>
          </div>

          {timeline.disciplineProgress && timeline.disciplineProgress.length > 0 ? (
            <div className={`grid gap-4 ${branchGridCols}`}>
              {timeline.disciplineProgress.map((branch) => (
                <div key={branch.scope}>
                  <div className="flex justify-between text-xs font-semibold text-ink-soft mb-1">
                    <span>{branch.name}</span>
                    <span>{branch.progress != null ? `${branch.progress}%` : 'Chưa có dữ liệu'}</span>
                  </div>
                  {branch.progress != null && <div role="progressbar" aria-label={`Tiến độ ${branch.name}`} aria-valuenow={branch.progress} aria-valuemin={0} aria-valuemax={100} className="h-2 w-full overflow-hidden rounded-full bg-canvas">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${branch.progress}%` }}
                    />
                  </div>}
                  {branch.weight != null && (
                    <span className="text-xs text-ink-muted mt-1 block">Trọng số: {branch.weight}%</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-hairline bg-canvas p-4 text-xs text-ink-muted">
              ℹ️ Đồ án liên ngành đang chờ Hội đồng công bố cấu trúc phân nhánh và trọng số chuyên môn theo snapshot kỳ học.
            </div>
          )}

          <div className="rounded-lg border border-status-warning-border bg-status-warning-bg p-3 text-xs text-status-warning-text">
            ⚠️ <strong>Quy tắc Cổng Tích hợp:</strong> Cổng đánh giá tích hợp liên ngành chỉ được thông qua khi toàn bộ các ngành thành viên bắt buộc đều được phê duyệt ĐẠT.
          </div>
        </div>
      )}

      {/* Timeline Steps */}
      <div className={`grid items-stretch gap-3 ${gateGridCols}`}>
        {timeline.gates.map((gate) => {
          const isSelected = gate.code === selectedGateCode
          return (
            <button
              key={gate.gateInstanceId}
              type="button"
              onClick={() => setSelectedGateCode(gate.code)}
              className={`flex h-full flex-col rounded-xl border p-4 text-left transition-colors duration-150 ${
                isSelected
                  ? 'border-primary bg-primary-subtle/50 shadow-xs'
                  : 'border-hairline bg-card hover:bg-canvas/50'
              }`}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-muted">
                  <span>{gate.code}</span>
                  {gate.code === timeline.currentGateCode && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary-subtle px-2 py-0.5 text-xs font-semibold text-primary">
                      <span aria-hidden="true">●</span>
                      <span>Mốc hiện tại</span>
                    </span>
                  )}
                </span>
                {getStatusBadge(gate.status)}
              </div>
              <h3 className="mt-2.5 text-sm font-bold text-ink">{gate.title}</h3>
              <p className="mt-1 text-xs text-ink-muted line-clamp-2">{gate.objective}</p>
              <div className="mt-auto flex w-full items-center justify-between border-t border-hairline pt-2.5 text-xs text-ink-muted">
                <span>{formatGateWindow(gate.windowStart, gate.windowEnd)}</span>
                {gate.reviewEligibility === 'BLOCKED' && <span className="font-bold text-status-error-text">{gate.status === 'REVISION_REQUIRED' ? 'Chờ bản sửa' : 'Bị chặn'}</span>}
              </div>
            </button>
          )
        })}
      </div>

      {/* Selected Gate Details */}
      {selectedGate && (
        <div className="space-y-4 rounded-xl border border-hairline bg-card p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-primary/20 bg-primary-subtle px-2 py-0.5 text-xs font-bold text-primary">
                  {selectedGate.code}
                </span>
                <h3 className="text-base font-bold text-ink">{selectedGate.title}</h3>
                {getStatusBadge(selectedGate.status)}
              </div>
              <p className="mt-1 text-xs text-ink-muted">{selectedGate.objective}</p>
            </div>
            <div className="text-right text-xs text-ink-muted">
              <div>Thời gian nộp: <strong className="text-ink-soft">{formatGateWindow(selectedGate.windowStart, selectedGate.windowEnd)}</strong></div>
              <div>
                Điều kiện tham gia:{' '}
                <strong
                  className={
                    selectedGate.status === 'PASSED'
                      ? 'text-status-success-text'
                      : selectedGate.status === 'REVISION_REQUIRED' && canSubmitSelectedGate
                      ? 'text-status-warning-text'
                      : selectedGate.reviewEligibility === 'BLOCKED'
                      ? 'text-status-error-text'
                      : 'text-status-success-text'
                  }
                >
                  {selectedGate.status === 'PASSED'
                    ? 'Đã hoàn tất'
                    : selectedGate.status === 'REVISION_REQUIRED' && canSubmitSelectedGate
                    ? 'Được nộp bản sửa'
                    : selectedGate.reviewEligibility === 'BLOCKED'
                    ? 'Đang bị chặn'
                    : 'Sẵn sàng'}
                </strong>
              </div>
            </div>
          </div>

          {/* Blocker alert if any */}
          {selectedGate.blockingReasons.length > 0 && (
            <div className="rounded-lg border border-status-error-border bg-status-error-bg p-3.5 text-xs text-status-error-text">
              <h4 className="font-bold">Lý do bị chặn / Yêu cầu khắc phục:</h4>
              <ul className="mt-1.5 list-disc pl-5 space-y-1">
                {selectedGate.blockingReasons.map((br, idx) => (
                  <li key={idx}>
                    {br.requirementCode && <strong>[{br.requirementCode}]: </strong>}
                    {br.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Compact gate-scoped supervisor advice banner when present (never shown when empty or on Feedback tab) */}
          {activeTab !== 'feedback' && gateFeedbacks.length > 0 && (
            <div className="rounded-xl border border-primary/20 bg-primary-subtle/50 p-3.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-primary">Nhận xét hướng dẫn · {selectedGate.code} ({gateFeedbacks.length})</span>
                <button type="button" onClick={() => setActiveTab('feedback')} className="font-semibold text-primary hover:underline cursor-pointer">
                  Xem toàn bộ phản hồi
                </button>
              </div>
              <ul className="mt-2 space-y-1.5">
                {gateFeedbacks.map((item, idx) => (
                  <li key={`${item.submittedAt}-${idx}`} className="text-ink-soft">
                    <span className="font-semibold text-ink">{item.supervisorName ?? 'GVHD'}:</span> {item.feedback}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Gate Inner Tabs (V2 segmented pill bar) */}
          <div role="tablist" aria-label="Nội dung Cổng thẩm định" className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-hairline bg-canvas p-1">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'requirements'}
              onClick={() => setActiveTab('requirements')}
              className={`min-h-9 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'requirements'
                  ? 'bg-card text-primary shadow-2xs border border-hairline'
                  : 'border border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              Yêu cầu & Minh chứng ({selectedGate.requirements.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'feedback'}
              onClick={() => setActiveTab('feedback')}
              className={`min-h-9 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'feedback'
                  ? 'bg-card text-primary shadow-2xs border border-hairline'
                  : 'border border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              Phản hồi đã nhận ({gateFeedbacks.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'revisions'}
              onClick={() => setActiveTab('revisions')}
              className={`min-h-9 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'revisions'
                  ? 'bg-card text-primary shadow-2xs border border-hairline'
                  : 'border border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              Yêu cầu chỉnh sửa {revisionItems.length > 0 && <span className="ml-1 rounded-full bg-status-error-bg px-1.5 py-0.5 text-xs text-status-error-text border border-status-error-border">{revisionItems.length}</span>}
            </button>
          </div>

          {/* TAB 1: YÊU CẦU & MINH CHỨNG */}
          {activeTab === 'requirements' && (
            <div className="space-y-4 pt-1">
              <h4 className="sr-only">
                Danh mục Minh chứng Học thuật ({selectedGate.requirements.length} yêu cầu)
              </h4>
              {selectedGate.requirements.length > 1 && (
                <FilterToolbar
                  embedded
                  className="rounded-lg border border-hairline"
                  tabs={[
                    { value: 'ALL', label: 'Tất cả', count: selectedGate.requirements.length },
                    { value: 'MANDATORY', label: 'Bắt buộc', count: selectedGate.requirements.filter(r => r.isMandatory).length },
                    { value: 'ACTION_NEEDED', label: 'Cần nộp / sửa', count: selectedGate.requirements.filter(r => ['PENDING', 'REJECTED'].includes(r.verificationStatus)).length },
                    { value: 'ACCEPTED', label: 'Đã chấp thuận', count: selectedGate.requirements.filter(r => r.verificationStatus === 'ACCEPTED').length },
                  ]}
                  activeTab={reqFilter}
                  onTabChange={(v) => setReqFilter(v as typeof reqFilter)}
                  search={reqSearch}
                  onSearchChange={setReqSearch}
                  searchPlaceholder="Tìm tên yêu cầu minh chứng…"
                  hasActiveFilters={reqFilter !== 'ALL' || Boolean(reqSearch.trim())}
                  onClearAll={() => { setReqFilter('ALL'); setReqSearch('') }}
                  resultSummary={`Hiển thị ${filteredRequirements.length} / ${selectedGate.requirements.length} yêu cầu`}
                />
              )}
              <p className="text-xs text-ink-muted sm:hidden">Cuộn ngang để xem tệp và thao tác.</p>
              <div role="region" aria-label="Danh mục minh chứng, có thể cuộn ngang" tabIndex={0} className="overflow-x-auto rounded-lg border border-hairline">
                <Table className="w-full min-w-[720px] text-left text-xs">
                  <TableHead className="font-semibold text-ink-muted">
                    <tr>
                      <th className="px-3.5 py-2.5">Yêu cầu minh chứng</th>
                      <th className="px-3 py-2.5">Loại & Phạm vi</th>
                      <th className="px-3 py-2.5">Bắt buộc</th>
                      <th className="px-3 py-2.5">Trạng thái thẩm định</th>
                      <th className="px-3.5 py-2.5">Phiên bản đã nộp</th>
                      <th className="px-3.5 py-2.5 text-right">Thao tác</th>
                    </tr>
                  </TableHead>
                  <tbody className="divide-y divide-hairline">
                    {filteredRequirements.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-ink-muted">
                          Không có yêu cầu minh chứng nào khớp với bộ lọc hiện tại.
                        </td>
                      </tr>
                    ) : filteredRequirements.map((req) => {
                      return (
                        <tr key={req.id} className="hover:bg-canvas/70">
                          <td className="max-w-[300px] px-3.5 py-3 align-top">
                            <strong className="block font-semibold text-ink">{req.title}</strong>
                            <span className="text-ink-muted">{formatRequirementCode(req.code)}</span>
                            {req.reviewerFeedback && (
                              <p
                                className={`mt-1.5 rounded-md border p-2 text-xs leading-relaxed ${
                                  req.verificationStatus === 'ACCEPTED'
                                    ? 'border-status-success-border bg-status-success-bg/60 text-status-success-text'
                                    : req.verificationStatus === 'REJECTED'
                                    ? 'border-status-error-border bg-status-error-bg/70 text-status-error-text'
                                    : 'border-hairline bg-canvas text-ink-soft'
                                }`}
                              >
                                <strong>Nhận xét:</strong> {req.reviewerFeedback}
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-3 align-top whitespace-nowrap">
                            <span className="inline-flex items-center rounded-md bg-canvas px-2 py-0.5 font-medium text-ink-soft">
                              {requirementTypeLabel(req.type)}
                            </span>
                            <span className="ml-1.5 text-ink-muted">({displayLabel(req.scope)})</span>
                          </td>
                          <td className="px-3 py-3 align-top whitespace-nowrap">
                            {req.isMandatory ? (
                              <span className="inline-flex items-center rounded-md border border-primary/25 bg-primary-subtle px-2 py-0.5 text-xs font-semibold text-primary">
                                Bắt buộc
                              </span>
                            ) : (
                              <span className="text-xs font-medium text-ink-muted">Tùy chọn</span>
                            )}
                          </td>
                          <td className="px-3 py-3 align-top whitespace-nowrap">
                            {getVerificationBadge(req.verificationStatus)}
                          </td>
                          <td className="max-w-[320px] px-3.5 py-3 align-top">
                            {req.latestArtifact ? (
                              <div className="space-y-0.5">
                                <strong className="block break-words text-ink" title={req.latestArtifact.linkUrl ?? req.latestArtifact.filename}>v{req.latestArtifact.version}: {evidenceArtifactLabel(req.latestArtifact)}</strong>
                                <div className="text-ink-muted">{dateTimeLabel(req.latestArtifact.submittedAt)} · {formatSubmitter(req.latestArtifact.submittedBy, req.latestArtifact.submittedByName)}</div>
                                {req.latestArtifact.notes && <div className="text-ink-muted italic">"{req.latestArtifact.notes}"</div>}
                                <EvidenceDownloadButton projectId={timeline.projectId} gateCode={selectedGate.code} requirement={req} />
                              </div>
                            ) : (
                              <span className="text-ink-muted">Chưa có tệp</span>
                            )}
                          </td>
                          <td className="px-3.5 py-3 align-top text-right whitespace-nowrap">
                            {req.verificationStatus === 'ACCEPTED' && selectedGate.status !== 'REVISION_REQUIRED' ? (
                              <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-status-success-bg px-2.5 py-1 text-xs font-semibold text-status-success-text border border-status-success-border">
                                <span className="material-symbols-outlined text-sm" aria-hidden="true">check</span>
                                Đã chấp thuận
                              </span>
                            ) : isLeader ? (
                              (() => {
                                const isRevision = selectedGate.status === 'REVISION_REQUIRED' || req.verificationStatus === 'REJECTED'
                                const canSubmitThis = canSubmitSelectedGate
                                const blockingReason = timeline.capabilities?.blockingReasons?.[0]

                                if (!canSubmitThis) {
                                  return (
                                    <div className="flex flex-col items-end gap-0.5">
                                      <button
                                        type="button"
                                        disabled
                                        aria-disabled="true"
                                        title={blockingReason || 'Hồ sơ hiện bị khóa nộp'}
                                        className="cursor-not-allowed rounded-lg bg-canvas px-3 py-1.5 text-xs font-semibold text-ink-muted"
                                      >
                                        {isRevision ? 'Nộp bản sửa' : req.latestArtifact ? 'Nộp lại' : 'Nộp tài liệu'}
                                      </button>
                                      <span className="max-w-[180px] truncate text-right text-xs text-status-error-text italic" title={blockingReason}>
                                        {blockingReason || 'Bị chặn nộp'}
                                      </span>
                                    </div>
                                  )
                                }

                                return (
                                  <button
                                    type="button"
                                    onClick={() => setActiveReqForSubmission(req)}
                                    className={`min-h-11 rounded-lg px-3 py-1.5 text-xs font-bold transition-all focus:outline-hidden focus:ring-2 focus:ring-offset-1 ${
                                      isRevision
                                        ? 'bg-status-error-text text-white shadow-xs hover:opacity-90 focus:ring-status-error-text'
                                        : 'bg-primary text-white shadow-xs hover:bg-primary-hover focus:ring-primary'
                                    }`}
                                  >
                                    {isRevision ? 'Nộp bản sửa' : req.latestArtifact ? 'Nộp lại' : 'Nộp tài liệu'}
                                  </button>
                                )
                              })()
                            ) : (
                              <div className="flex flex-col items-end gap-0.5">
                                <button
                                  type="button"
                                  disabled
                                  aria-disabled="true"
                                  aria-describedby={`member-only-notice-${req.id}`}
                                  className="cursor-not-allowed rounded-lg bg-canvas px-3 py-1.5 text-xs font-semibold text-ink-muted"
                                >
                                  {req.verificationStatus === 'REJECTED' ? 'Nộp bản sửa' : req.latestArtifact ? 'Nộp lại' : 'Nộp tài liệu'}
                                </button>
                                <span id={`member-only-notice-${req.id}`} className="text-xs text-ink-muted italic">
                                  {isAuthenticated ? 'Chỉ Trưởng nhóm' : 'Chưa đăng nhập'}
                                </span>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </Table>
              </div>

              {onSubmitForReview && selectedGate.status !== 'PASSED' && (
                <div className="space-y-2 border-t border-hairline pt-3">
                  <button type="button" disabled={!canSubmitSelectedGate || submittingGate || selectedGate.requirements.some(req => req.isMandatory && !req.latestArtifact)}
                    className="min-h-10 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-hover disabled:bg-hairline disabled:text-ink-muted cursor-pointer"
                    onClick={async () => {
                      setSubmittingGate(true); setSubmitError(null)
                      try { await onSubmitForReview(selectedGate.code) }
                      catch (err) { setSubmitError(humanizeHttpError(err, 'Không thể gửi hồ sơ thẩm định.')) }
                      finally { setSubmittingGate(false) }
                    }}>
                    {submittingGate ? 'Đang gửi...' : 'Gửi hồ sơ thẩm định'}
                  </button>
                  {submitError && <p role="alert" className="text-xs text-status-error-text">{submitError}</p>}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PHẢN HỒI ĐÃ NHẬN */}
          {activeTab === 'feedback' && (
            <div className="space-y-4 pt-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Nhật ký nhận xét & Hướng dẫn · {selectedGate.code}
              </h4>
              {gateFeedbacks.length > 0 ? (
                <ul className="space-y-3">
                  {gateFeedbacks.map((item, index) => (
                    <li key={`${item.submittedAt}-${index}`} className="rounded-xl border border-hairline bg-canvas/60 p-4 text-xs">
                      <div className="flex items-center justify-between text-ink-muted mb-1.5">
                        <span className="font-semibold text-primary">{item.supervisorName ?? 'Giảng viên hướng dẫn'}</span>
                        <time dateTime={item.submittedAt}>{dateTimeLabel(item.submittedAt)}</time>
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-ink">{item.feedback}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-xl border border-hairline bg-canvas p-6 text-center text-xs text-ink-muted">
                  <span className="material-symbols-outlined text-3xl text-ink-muted" aria-hidden="true">chat_bubble_outline</span>
                  <p className="mt-1 font-semibold text-ink">Chưa có nhận xét cho cổng này.</p>
                  <p className="text-ink-muted">Theo dõi phản hồi của giảng viên hướng dẫn hoặc giảng viên thẩm định tại đây.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: YÊU CẦU CHỈNH SỬA */}
          {activeTab === 'revisions' && (
            <div className="space-y-4 pt-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Danh sách Minh chứng Cần Sửa đổi · {selectedGate.code}
              </h4>
              {revisionItems.length > 0 ? (
                <ul className="space-y-3">
                  {revisionItems.map((req) => (
                    <li key={req.id} className="rounded-xl border border-status-error-border bg-status-error-bg/30 p-4 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-status-error-border/40 pb-2">
                        <div>
                          <strong className="text-sm font-bold text-status-error-text">{req.title}</strong>
                          <span className="ml-2 text-ink-muted font-mono">({formatRequirementCode(req.code)})</span>
                        </div>
                        <span className="rounded-md bg-status-error-bg px-2 py-0.5 font-bold text-status-error-text border border-status-error-border">
                          {req.verificationStatus === 'REJECTED' ? 'Cần nộp lại' : 'Cần chỉnh sửa'}
                        </span>
                      </div>
                      {req.reviewerFeedback && (
                        <p className="mt-2 text-ink leading-relaxed">
                          <strong>Góp ý của giảng viên thẩm định:</strong> {req.reviewerFeedback}
                        </p>
                      )}
                      <div className="mt-3 flex justify-end">
                        {canSubmitSelectedGate ? (
                          <button
                            type="button"
                            onClick={() => setActiveReqForSubmission(req)}
                            className="min-h-11 rounded-lg bg-status-error-text px-4 py-1.5 text-xs font-bold text-white shadow-2xs hover:opacity-90 cursor-pointer"
                          >
                            Nộp bản sửa đổi ngay
                          </button>
                        ) : isLeader ? (
                          <span className="text-ink-muted italic">
                            {timeline.capabilities?.blockingReasons?.[0] || 'Cổng hiện đang đóng hoặc đã hoàn tất nộp'}
                          </span>
                        ) : (
                          <span className="text-ink-muted italic">Trưởng nhóm phụ trách nộp bản sửa</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-xl border border-hairline bg-canvas p-6 text-center text-xs text-ink-muted">
                  <span className="material-symbols-outlined text-3xl text-status-success-text" aria-hidden="true">check_circle</span>
                  <h4 className="mt-1 font-bold text-ink">Không có yêu cầu chỉnh sửa tồn đọng</h4>
                  <p className="text-ink-muted">Cổng thẩm định này hiện không có minh chứng nào bị yêu cầu làm lại.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <ReviewSubmissionModal
        key={activeReqForSubmission?.id || 'closed'}
        open={Boolean(activeReqForSubmission)}
        onClose={() => setActiveReqForSubmission(null)}
        requirement={submissionRequirement}
        gateCode={selectedGate?.code || ''}
        isLeader={isLeader}
        canSubmit={canSubmitSelectedGate}
        blockingMessage={timeline.capabilities?.blockingReasons?.[0]}
        revisionRequired={selectedGate?.status === 'REVISION_REQUIRED'}
        onReload={onReload}
        onSubmit={async (payload) => {
          if (!activeReqForSubmission || !selectedGate) return
          await onSubmitRevision(selectedGate.code, activeReqForSubmission.id, payload)
        }}
      />

      {/* Advisory Defense Readiness Modal (DEF-01) */}
      {showDefenseModal && readiness ? (
        <Modal open onClose={() => setShowDefenseModal(false)} title="Điều kiện bảo vệ từ hệ thống">
          <DefenseReadinessChecker summary={readiness} />
        </Modal>
      ) : showDefenseModal && (
        <Modal open onClose={() => setShowDefenseModal(false)} title="Điều kiện bảo vệ từ hệ thống">
          <p className="text-sm text-ink-muted">Chưa tải được kết luận điều kiện bảo vệ từ hệ thống. Vui lòng tải lại tiến trình.</p>
        </Modal>
      )}
    </div>
  )
}
