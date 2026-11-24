import { Table, TableHead } from '../../../components/ui/Table'
import { WorkspaceTabs } from '../../../components/ui/WorkspaceTabs'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { Pagination } from '../../../components/ui/Pagination'
import { useClientPagination } from '../../../components/ui/useClientPagination'
import { useState } from 'react'
import type { DefenseReadinessSummary, GateStatus, StudentGateRequirement, StudentReviewTimelineDto } from '../types/review-gates.types'
import { ReviewSubmissionModal, type ReviewSubmissionPayload } from './ReviewSubmissionModal'
import { EvidenceDownloadButton } from './EvidenceDownloadButton'
import { DefenseReadinessChecker } from './DefenseReadinessChecker'
import { Modal } from '../../../components/ui/Modal'
import { env } from '../../../app/config/env'
import { evidenceArtifactLabel } from '../utils/evidence-link'
import { gateStatusLabels, requirementTypeLabel } from '../utils/review-gate-labels'
import { displayLabel } from '../../../components/ui/display-label'

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
  const [activeTab, setActiveTab] = useState<'requirements' | 'feedback' | 'questions' | 'revisions'>('requirements')

  const selectedGate = timeline.gates.find((g) => g.code === selectedGateCode) || timeline.gates[0]
  const requirementsList = selectedGate?.requirements ?? []
  const reqPagination = useClientPagination(requirementsList, 8)
  const submissionRequirement = selectedGate?.requirements.find(req => req.id === activeReqForSubmission?.id) ?? null
  const completedGatesCount = timeline.gates.filter((g) => g.status === 'PASSED').length
  const totalGatesCount = timeline.gates.length
  const gateFeedbacks = (timeline.supervisorFeedbacks ?? []).filter(item => item.gateCode === selectedGate?.code)
  const revisionItems = (selectedGate?.requirements ?? []).filter(req => req.verificationStatus === 'REJECTED' || Boolean(req.reviewerFeedback))
  const feedbackPagination = useClientPagination(gateFeedbacks, 6)
  const sidebarFeedbackPagination = useClientPagination(gateFeedbacks, 6)
  const revisionPagination = useClientPagination(revisionItems, 6)
  // Server-authoritative values (no client calculation or fallback heuristics)
  const academicProgress = timeline.academicProgress
  const isDefenseReady = readiness?.isReady ?? timeline.isDefenseReady
  const canSubmitSelectedGate = Boolean(isAuthenticated && isLeader && selectedGate
    && selectedGate.code === timeline.currentGateCode && selectedGate.status !== 'LOCKED' && selectedGate.status !== 'PASSED'
    && (selectedGate.status === 'REVISION_REQUIRED' ? timeline.capabilities.canSubmitRevision : timeline.capabilities.canSubmitPackage))

  const getStatusBadge = (status: GateStatus) => {
    switch (status) {
      case 'PASSED':
        return <StatusBadge tone="success" label="✓ ĐÃ ĐẠT" />
      case 'REVISION_REQUIRED':
        return <StatusBadge tone="danger" label="! CẦN CHỈNH SỬA" />
      case 'IN_REVIEW':
        return <StatusBadge tone="info" label="◷ ĐANG THẨM ĐỊNH" />
      case 'PLANNED':
        return <StatusBadge tone="neutral" label="KẾ HOẠCH" />
      default:
        return <StatusBadge tone="neutral" label={gateStatusLabels[status] ?? 'Chưa xác định'} />
    }
  }

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return <StatusBadge tone="success" label="✓ Chấp thuận" />
      case 'REJECTED':
        return <StatusBadge tone="danger" label="✕ Cần nộp lại" />
      case 'SUBMITTED':
        return <StatusBadge tone="info" label="◷ Đã nộp (chờ duyệt)" />
      default:
        return <StatusBadge tone="neutral" label="Chưa nộp" />
    }
  }

  return (
    <div className="review-gates-surface min-w-0 space-y-5">
      {/* Project & Policy Header */}
      <div className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-canvas/70 border-b border-hairline px-5 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-lg font-bold text-ink">{timeline.projectName}</h2>
              <span className="rounded-full bg-card px-2.5 py-0.5 text-xs font-semibold font-mono text-ink-muted border border-hairline">
                {timeline.projectCode}
              </span>
              <span className="rounded-full bg-status-success-bg px-2.5 py-0.5 text-xs font-bold text-status-success-text border border-status-success-border">
                {env.reviewGatesMockEnabled ? `Chính sách: v${timeline.effectivePolicyVersion} (Đã ban hành)` : `Phiên bản cấu hình: ${timeline.effectivePolicyVersion}`}
              </span>
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              Chế độ: <strong className="text-ink-soft">{timeline.projectMode === 'SINGLE_MAJOR' ? 'Đơn ngành' : 'Liên ngành'}</strong> · Ngành: {timeline.major} · Đang xét duyệt: <strong className="text-primary">{selectedGate?.code}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowDefenseModal(true)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-hairline bg-card px-3 py-1.5 text-xs font-semibold text-primary hover:bg-canvas cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm" aria-hidden="true">verified</span>
              <span>
                {timeline.defenseReadinessStatus ||
                  (isDefenseReady === true
                    ? 'Đủ điều kiện bảo vệ (dự kiến)'
                    : isDefenseReady === false
                    ? 'Chưa đủ điều kiện bảo vệ'
                    : 'Điều kiện bảo vệ')}
              </span>
              <span className="text-ink-muted">· Chi tiết ↗</span>
            </button>
            <div className="rounded-lg border border-hairline bg-card px-3 py-1.5 text-xs text-ink-soft">
              Vai trò hiện tại: <strong className={isLeader ? 'text-primary' : 'text-ink'}>{isLeader ? 'Trưởng nhóm (Leader)' : isAuthenticated ? 'Thành viên (Member)' : 'Chưa xác thực (Guest)'}</strong>
            </div>
            {onToggleRole && (
              <div className="flex items-center gap-1.5">
                <span className="rounded bg-status-warning-bg px-1.5 py-0.5 text-xs font-bold text-status-warning-text uppercase tracking-wider">
                  Mô phỏng
                </span>
                <button
                  type="button"
                  onClick={onToggleRole}
                  className="rounded-lg border border-hairline bg-card px-3 py-1.5 text-xs font-semibold text-ink-muted shadow-2xs hover:bg-canvas cursor-pointer"
                  title="Đổi vai trò để kiểm thử quyền Leader vs Member (Chế độ mô phỏng)"
                >
                  ⇄ Đổi vai trò kiểm thử
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Compact Progress Strip (Academic vs Task — folded inside header card to avoid duplicate KPI grids) */}
        <div className="grid grid-cols-1 gap-4 px-5 py-3.5 md:grid-cols-2 md:divide-x md:divide-hairline">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-xs font-semibold text-ink-muted">Tiến độ thực hiện học vụ</span>
              <span className="text-xs text-ink-muted">({completedGatesCount}/{totalGatesCount} Cổng đạt)</span>
            </div>
            <div className="mt-1 flex flex-wrap items-baseline gap-2">
              <span className={academicProgress != null ? 'text-2xl font-black tabular-nums text-status-success-text' : 'text-base font-semibold leading-6 text-status-success-text'}>
                {academicProgress != null ? `${academicProgress}%` : timeline.academicProgressSource === 'NOT_CONFIGURED' ? 'Chưa áp dụng quy chế Cổng thẩm định' : 'Chưa có dữ liệu'}
              </span>
              <span className="text-xs text-ink-muted">{academicProgressSourceLabel(timeline.academicProgressSource)}</span>
            </div>
            {academicProgress != null && (
              <div role="progressbar" aria-label="Tiến độ học vụ" aria-valuenow={academicProgress} aria-valuemin={0} aria-valuemax={100} className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-canvas">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${academicProgress}%` }}
                />
              </div>
            )}
          </div>

          <div className="min-w-0 md:pl-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-xs font-semibold text-ink-muted">Tiến độ công việc (Task Board)</span>
              <span className="text-xs text-ink-soft font-medium">Khác với tiến độ học vụ</span>
            </div>
            <div className="mt-1 flex flex-wrap items-baseline gap-2">
              <span className="text-2xl font-black tabular-nums text-primary">
                {timeline.taskProgress != null ? `${timeline.taskProgress}%` : 'Chưa đồng bộ'}
              </span>
              <span className="text-xs text-ink-muted">
                {timeline.taskProgress != null
                  ? 'Hoàn thành task kỹ thuật không thay thế đạt cổng học vụ.'
                  : 'Chưa kết nối dữ liệu Task Board.'}
              </span>
            </div>
            {timeline.taskProgress != null && (
              <div role="progressbar" aria-label="Tiến độ công việc" aria-valuenow={timeline.taskProgress} aria-valuemin={0} aria-valuemax={100} className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-canvas">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${timeline.taskProgress}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Role Notice inside policy card */}
        {!isAuthenticated ? (
          <div className="border-t border-hairline px-5 py-3 text-xs text-ink-soft bg-canvas/40">
            <strong>Thông báo phân quyền:</strong> Chưa phát hiện phiên làm việc sinh viên hợp lệ. Quyền nộp hồ sơ, sửa đổi minh chứng và các thao tác thẩm định chỉ dành cho sinh viên thuộc nhóm đồ án.
          </div>
        ) : !isLeader ? (
          <div className="border-t border-hairline px-5 py-3 text-xs text-status-warning-text bg-status-warning-bg/70">
            <strong>Thông báo quyền hạn:</strong> Bạn đang xem với vai trò Thành viên (Student Member). Bạn có thể xem toàn bộ tiến trình, lịch sử nhận xét và minh chứng. Quyền nộp hồ sơ thẩm định chính thức và bản sửa đổi Gate thuộc về Trưởng nhóm.
          </div>
        ) : null}
      </div>

      {/* Interdisciplinary Multi-branch Progress (F5) */}
      {timeline.projectMode === 'INTERDISCIPLINARY' && (
        <div className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-canvas/70 border-b border-hairline px-5 py-3.5">
            <div>
              <h3 className="text-sm font-bold text-ink">Tiến độ Các Phân nhánh Chuyên môn (Liên ngành)</h3>
              <p className="mt-0.5 text-xs text-ink-muted">Mỗi chuyên ngành có trọng số và cổng thẩm định độc lập theo quy chế.</p>
            </div>
            <span className="rounded-full bg-tag-se-bg px-2.5 py-0.5 text-xs font-bold text-tag-se border border-tag-se/25">
              Mô hình Tích hợp Đa ngành
            </span>
          </div>

          <div className="p-5 space-y-3">
            {timeline.disciplineProgress && timeline.disciplineProgress.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {timeline.disciplineProgress.map((branch) => (
                  <div key={branch.scope} className="rounded-lg border border-hairline bg-canvas/50 p-3">
                    <div className="flex justify-between text-xs font-semibold text-ink-soft mb-1.5">
                      <span>{branch.name}</span>
                      <span className="tabular-nums">{branch.progress != null ? `${branch.progress}%` : 'Chưa có dữ liệu'}</span>
                    </div>
                    {branch.progress != null && (
                      <div role="progressbar" aria-label={`Tiến độ ${branch.name}`} aria-valuenow={branch.progress} aria-valuemin={0} aria-valuemax={100} className="h-2 w-full overflow-hidden rounded-full bg-canvas">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{ width: `${branch.progress}%` }}
                        />
                      </div>
                    )}
                    {branch.weight != null && (
                      <span className="text-xs text-ink-muted mt-1.5 block">Trọng số: {branch.weight}%</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-lg border border-hairline bg-canvas p-4 text-xs text-ink-muted">
                <span className="material-symbols-outlined text-base text-ink-muted shrink-0" aria-hidden="true">info</span>
                <span>Đồ án liên ngành đang chờ Hội đồng công bố cấu trúc phân nhánh và trọng số chuyên môn theo snapshot kỳ học.</span>
              </div>
            )}

            <div className="flex items-start gap-2 rounded-lg border border-status-warning-border bg-status-warning-bg p-3 text-xs text-status-warning-text">
              <span className="material-symbols-outlined text-base text-status-warning-text shrink-0" aria-hidden="true">warning</span>
              <span><strong>Quy tắc Cổng Tích hợp:</strong> Cổng đánh giá tích hợp liên ngành chỉ được thông qua khi toàn bộ các ngành thành viên bắt buộc đều được phê duyệt ĐẠT.</span>
            </div>
          </div>
        </div>
      )}

      {/* Compact Gate Selector Strip styled like WorkspaceTabs (preserves button role for gate tests) */}
      <nav className="ui-workspace-tabs" aria-label="Chọn Cổng thẩm định">
        {timeline.gates.map((gate) => {
          const isSelected = gate.code === selectedGateCode
          const isCurrent = gate.code === timeline.currentGateCode
          const statusTone = gate.status === 'PASSED'
            ? 'is-success'
            : gate.status === 'REVISION_REQUIRED'
            ? 'is-danger'
            : gate.status === 'IN_REVIEW'
            ? 'is-warning'
            : ''
          return (
            <button
              key={gate.gateInstanceId}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setSelectedGateCode(gate.code)}
              className={`ui-workspace-tab ${isSelected ? 'is-active' : ''}`}
            >
              <span className="font-mono font-bold text-primary">{gate.code}</span>
              <span>{gate.title}</span>
              {isCurrent && (
                <span className="ui-workspace-tab-count is-warning">Mốc hiện tại</span>
              )}
              {gate.reviewEligibility === 'BLOCKED' && gate.status !== 'REVISION_REQUIRED' ? (
                <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-status-error-text">
                  <span className="material-symbols-outlined text-xs" aria-hidden="true">lock</span>
                  <span>Bị chặn</span>
                </span>
              ) : (
                <span className={`ui-workspace-tab-count ${statusTone}`} aria-hidden="true">
                  {gateStatusLabels[gate.status] ?? gate.status}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Bento 2-column layout: Left 8 cols (Selected Gate Details + Tabs) | Right 4 cols (Supervisor Guidance & Gate Info) */}
      {selectedGate && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12 items-start">
          {/* Left column: Selected Gate Details */}
          <div className="xl:col-span-8 overflow-hidden rounded-xl border border-hairline bg-card shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-canvas/70 border-b border-hairline px-5 py-4">
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
                <div>Thời gian nộp: <strong>{selectedGate.windowStart || 'Chưa xác định'}</strong> đến <strong>{selectedGate.windowEnd || 'Chưa xác định'}</strong></div>
                <div>Điều kiện tham gia: <strong className={canSubmitSelectedGate ? 'text-status-success-text' : 'text-status-error-text'}>{selectedGate.status === 'REVISION_REQUIRED' && canSubmitSelectedGate ? 'Được nộp bản sửa' : selectedGate.reviewEligibility === 'BLOCKED' ? 'Đang bị chặn' : 'Sẵn sàng'}</strong></div>
              </div>
            </div>

            <div className="p-5 space-y-4">
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

              {/* 4 Tabs Navigation using shared WorkspaceTabs */}
              <WorkspaceTabs
                ariaLabel="Nội dung Cổng thẩm định"
                activeId={activeTab}
                onChange={setActiveTab}
                tabs={[
                  {
                    id: 'requirements',
                    label: 'Yêu cầu & Minh chứng',
                    icon: 'folder_check',
                    count: selectedGate.requirements.length,
                  },
                  {
                    id: 'feedback',
                    label: 'Phản hồi đã nhận',
                    icon: 'chat',
                    count: gateFeedbacks.length,
                  },
                  {
                    id: 'questions',
                    label: 'Câu hỏi (Q&A)',
                    icon: 'help',
                  },
                  {
                    id: 'revisions',
                    label: 'Yêu cầu chỉnh sửa',
                    icon: 'edit_document',
                    count: revisionItems.length,
                    badgeTone: revisionItems.length > 0 ? 'danger' : 'default',
                  },
                ]}
              />

              {/* TAB 1: YÊU CẦU & MINH CHỨNG */}
              {activeTab === 'requirements' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                    Danh mục Minh chứng Học thuật ({selectedGate.requirements.length} yêu cầu)
                  </h4>
                  <p className="text-xs text-ink-muted sm:hidden">Cuộn ngang để xem tệp và thao tác.</p>
                  <div role="region" aria-label="Danh mục minh chứng, có thể cuộn ngang" tabIndex={0} className="overflow-x-auto rounded-lg border border-hairline">
                    <Table className="w-full min-w-[680px] text-left text-xs">
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
                        {reqPagination.paginatedItems.map((req) => (
                          <tr key={req.id} className="hover:bg-canvas/70">
                            <td className="px-3.5 py-3">
                              <strong className="block font-semibold text-ink">{req.title}</strong>
                              <span className="font-mono text-ink-muted">{req.code}</span>
                              {req.reviewerFeedback && (
                                <p className="mt-1 text-status-error-text bg-status-error-bg/70 p-1.5 rounded-sm border border-status-error-border">
                                  <strong>Nhận xét:</strong> {req.reviewerFeedback}
                                </p>
                              )}
                            </td>
                            <td className="px-3 py-3">
                              <span className="rounded-md bg-canvas px-2 py-0.5 font-medium text-ink-soft">
                                {requirementTypeLabel(req.type)}
                              </span>
                              <span className="ml-1 text-ink-muted">({displayLabel(req.scope)})</span>
                            </td>
                            <td className="px-3 py-3 font-semibold text-ink-soft">
                              {req.isMandatory ? <span className="text-status-error-text font-bold">Bắt buộc</span> : 'Tùy chọn'}
                            </td>
                            <td className="px-3 py-3">
                              {getVerificationBadge(req.verificationStatus)}
                            </td>
                            <td className="px-3.5 py-3">
                              {req.latestArtifact ? (
                                <div>
                                  <strong className="break-all text-ink" title={req.latestArtifact.linkUrl ?? req.latestArtifact.filename}>v{req.latestArtifact.version}: {evidenceArtifactLabel(req.latestArtifact)}</strong>
                                  <div className="text-ink-muted">{req.latestArtifact.submittedAt} · {req.latestArtifact.submittedBy}</div>
                                  {req.latestArtifact.notes && <div className="text-ink-muted italic mt-0.5">&ldquo;{req.latestArtifact.notes}&rdquo;</div>}
                                  <EvidenceDownloadButton projectId={timeline.projectId} gateCode={selectedGate.code} requirement={req} />
                                </div>
                              ) : (
                                <span className="text-ink-muted">Chưa có tệp</span>
                              )}
                            </td>
                            <td className="px-3.5 py-3 text-right">
                              {req.verificationStatus === 'ACCEPTED' && selectedGate.status !== 'REVISION_REQUIRED' ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-status-success-bg px-2.5 py-1 text-xs font-semibold text-status-success-text border border-status-success-border">
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
                        ))}
                      </tbody>
                    </Table>
                  </div>

                  {reqPagination.showPagination && (
                    <Pagination
                      page={reqPagination.page}
                      pages={reqPagination.totalPages}
                      total={reqPagination.total}
                      pageSize={reqPagination.pageSize}
                      pageSizeOptions={[8, 16, 30]}
                      onPage={reqPagination.setPage}
                      onPageSizeChange={reqPagination.setPageSize}
                    />
                  )}

                  {onSubmitForReview && (
                    <div className="space-y-2 border-t border-hairline pt-3">
                      <button
                        type="button"
                        disabled={!canSubmitSelectedGate || submittingGate || selectedGate.requirements.some(req => req.isMandatory && !req.latestArtifact)}
                        className="min-h-10 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-hover disabled:bg-hairline disabled:text-ink-muted cursor-pointer"
                        onClick={async () => {
                          setSubmittingGate(true); setSubmitError(null)
                          try { await onSubmitForReview(selectedGate.code) }
                          catch (err) { setSubmitError(err instanceof Error ? err.message : 'Không thể gửi hồ sơ thẩm định.') }
                          finally { setSubmittingGate(false) }
                        }}
                      >
                        {submittingGate ? 'Đang gửi...' : 'Gửi hồ sơ thẩm định'}
                      </button>
                      {submitError && <p role="alert" className="text-xs text-status-error-text">{submitError}</p>}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: PHẢN HỒI ĐÃ NHẬN */}
              {activeTab === 'feedback' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                    Nhật ký nhận xét & Hướng dẫn · {selectedGate.code}
                  </h4>
                  {gateFeedbacks.length > 0 ? (
                    <>
                      <ul className="space-y-3">
                        {feedbackPagination.paginatedItems.map((item, index) => (
                          <li key={`${item.submittedAt}-${index}`} className="rounded-xl border border-hairline bg-canvas/60 p-4 text-xs">
                            <div className="flex items-center justify-between text-ink-muted mb-1.5">
                              <span className="font-semibold text-primary">{item.supervisorName ?? 'Giảng viên hướng dẫn'}</span>
                              <time dateTime={item.submittedAt}>{item.submittedAt}</time>
                            </div>
                            <p className="whitespace-pre-wrap text-sm text-ink">{item.feedback}</p>
                          </li>
                        ))}
                      </ul>
                      {feedbackPagination.showPagination && (
                        <Pagination
                          page={feedbackPagination.page}
                          pages={feedbackPagination.totalPages}
                          total={feedbackPagination.total}
                          pageSize={feedbackPagination.pageSize}
                          onPage={feedbackPagination.setPage}
                        />
                      )}
                    </>
                  ) : (
                    <div className="rounded-xl border border-hairline bg-canvas p-6 text-center text-xs text-ink-muted">
                      <span className="material-symbols-outlined text-3xl text-ink-muted" aria-hidden="true">chat_bubble_outline</span>
                      <p className="mt-1 font-semibold text-ink">Chưa có nhận xét cho cổng này.</p>
                      <p className="text-ink-muted">Theo dõi phản hồi của giảng viên hướng dẫn hoặc reviewer tại đây.</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: CÂU HỎI HỘI ĐỒNG (Q&A) */}
              {activeTab === 'questions' && (
                <div className="rounded-xl border border-hairline bg-canvas p-6 text-center text-xs text-ink-muted">
                  <span className="material-symbols-outlined text-3xl text-ink-muted" aria-hidden="true">help_outline</span>
                  <h4 className="mt-2 font-bold text-ink">Chưa có luồng câu hỏi học thuật độc lập</h4>
                  <p className="mt-1 max-w-md mx-auto text-ink-muted leading-relaxed">
                    Chức năng phân loại câu hỏi/phiếu yêu cầu sửa đang chờ chuẩn hóa theo API học vụ từ Hội đồng. Hiện tại mọi trao đổi và lưu ý từ cán bộ hướng dẫn được ghi nhận trực tiếp tại thẻ Phản hồi đã nhận.
                  </p>
                </div>
              )}

              {/* TAB 4: YÊU CẦU CHỈNH SỬA */}
              {activeTab === 'revisions' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                    Danh sách Minh chứng Cần Sửa đổi · {selectedGate.code}
                  </h4>
                  {revisionItems.length > 0 ? (
                    <>
                      <ul className="space-y-3">
                        {revisionPagination.paginatedItems.map((req) => (
                          <li key={req.id} className="rounded-xl border border-status-error-border bg-status-error-bg/30 p-4 text-xs">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-status-error-border/40 pb-2">
                              <div>
                                <strong className="text-sm font-bold text-status-error-text">{req.title}</strong>
                                <span className="ml-2 text-ink-muted font-mono">({req.code})</span>
                              </div>
                              <StatusBadge tone="danger" label={req.verificationStatus === 'REJECTED' ? 'Cần nộp lại' : 'Cần chỉnh sửa'} />
                            </div>
                            {req.reviewerFeedback && (
                              <p className="mt-2 text-ink leading-relaxed">
                                <strong>Góp ý của Reviewer:</strong> {req.reviewerFeedback}
                              </p>
                            )}
                            <div className="mt-3 flex justify-end">
                              {isLeader ? (
                                <button
                                  type="button"
                                  onClick={() => setActiveReqForSubmission(req)}
                                  className="min-h-11 rounded-lg bg-status-error-text px-4 py-1.5 text-xs font-bold text-white shadow-2xs hover:opacity-90 cursor-pointer"
                                >
                                  Nộp bản sửa đổi ngay
                                </button>
                              ) : (
                                <span className="text-ink-muted italic">Trưởng nhóm phụ trách nộp bản sửa</span>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                      {revisionPagination.showPagination && (
                        <Pagination
                          page={revisionPagination.page}
                          pages={revisionPagination.totalPages}
                          total={revisionPagination.total}
                          pageSize={revisionPagination.pageSize}
                          onPage={revisionPagination.setPage}
                        />
                      )}
                    </>
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
          </div>

          {/* Right Bento column (4 cols): Supervisor Guidance Feedback Section */}
          <section className="xl:col-span-4 overflow-hidden rounded-xl border border-hairline bg-card shadow-xs" aria-label={`Nhận xét hướng dẫn · ${selectedGate.code}`}>
            <div className="bg-canvas/70 border-b border-hairline px-5 py-3.5">
              <h3 className="text-sm font-bold text-ink">Nhận xét hướng dẫn · {selectedGate.code}</h3>
              <p className="mt-0.5 text-xs text-ink-muted">Nhận xét tư vấn từ giảng viên hướng dẫn, không thay đổi kết luận thẩm định chính thức của reviewer.</p>
            </div>
            <div className="p-5 space-y-3">
              {gateFeedbacks.length > 0 ? (
                <>
                  <ul className="space-y-3">
                    {sidebarFeedbackPagination.paginatedItems.map((item, index) => (
                      <li key={`${item.submittedAt}-${index}`} className="rounded-lg border border-hairline bg-canvas/50 p-3 break-words text-sm">
                        <p className="whitespace-pre-wrap text-ink">{item.feedback}</p>
                        <p className="mt-1.5 text-xs text-ink-muted">{item.supervisorName ?? 'Giảng viên hướng dẫn'} · <time dateTime={item.submittedAt}>{item.submittedAt}</time></p>
                      </li>
                    ))}
                  </ul>
                  {sidebarFeedbackPagination.showPagination && (
                    <Pagination
                      page={sidebarFeedbackPagination.page}
                      pages={sidebarFeedbackPagination.totalPages}
                      total={sidebarFeedbackPagination.total}
                      pageSize={sidebarFeedbackPagination.pageSize}
                      onPage={sidebarFeedbackPagination.setPage}
                    />
                  )}
                </>
              ) : (
                <p className="text-sm text-ink-muted">Chưa có nhận xét cho cổng này. Theo dõi phản hồi của giảng viên hướng dẫn tại đây.</p>
              )}
            </div>
          </section>
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
