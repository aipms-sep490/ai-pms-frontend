import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'
import { getProject } from '../../../services/api/projects.api'
import { HttpError } from '../../../services/http/http-client'
import { humanizeHttpError } from '../../../services/http/humanize-http-error'
import {
  assignGateReviewer,
  getGateAssignments,
  getGateReviewerCandidates,
  getGateRoundScopeConsensus,
  getReviewGateOverrideCapability,
  getStudentReviewTimeline,
  overrideReviewGate,
  recordGateRoundScopeDecision,
  reopenReviewGate,
  revokeGateReviewer,
} from '../api/review-gates-api'
import type {
  GateAssignmentSummary,
  GateReviewerCandidate,
  GateRoundConsensus,
  ProjectReviewMatrixRow,
  StudentGateInstance,
} from '../types/review-gates.types'
import { gateStatusLabels } from '../utils/review-gate-labels'

interface GateCoordinationDrawerProps {
  project: ProjectReviewMatrixRow
  onChanged?: () => Promise<void> | void
}

export function GateCoordinationDrawer({ project, onChanged }: GateCoordinationDrawerProps) {
  const gateCodes = Object.keys(project.gateStatuses)
  const [selectedGateCode, setSelectedGateCode] = useState<string>(gateCodes[0] || 'G1')
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [assignments, setAssignments] = useState<GateAssignmentSummary[]>([])
  const [candidates, setCandidates] = useState<GateReviewerCandidate[]>([])
  const [majors, setMajors] = useState<Array<{ majorId: number; majorName: string }>>([])
  const [selectedMajorId, setSelectedMajorId] = useState<string>('')
  const [selectedReviewerId, setSelectedReviewerId] = useState<string>('')
  const [sessionRole, setSessionRole] = useState<'MEMBER' | 'CHAIR' | 'SECRETARY'>('MEMBER')
  const [candidateSearch, setCandidateSearch] = useState('')

  const [revokingId, setRevokingId] = useState<number | null>(null)
  const [revokeReason, setRevokeReason] = useState('')

  const [consensus, setConsensus] = useState<GateRoundConsensus | null>(null)
  const [scopeChoice, setScopeChoice] = useState('')
  const [scopeDecision, setScopeDecision] = useState<'REVISION_REQUIRED' | 'PASSED'>('REVISION_REQUIRED')
  const [scopeNotes, setScopeNotes] = useState('')

  const [canOverrideGate, setCanOverrideGate] = useState(false)
  const [gateInstance, setGateInstance] = useState<StudentGateInstance | null>(null)
  const [overrideDecision, setOverrideDecision] = useState<'PASSED' | 'REVISION_REQUIRED' | 'FAILED'>('PASSED')
  const [overrideReason, setOverrideReason] = useState('')
  const [reopenReason, setReopenReason] = useState('')

  const { requestConfirmation, confirmationDialog } = useActionConfirmation()
  const isNumericProject = /^\d+$/.test(project.projectId)

  useEffect(() => {
    const codes = Object.keys(project.gateStatuses)
    setSelectedGateCode(prev => (codes.includes(prev) ? prev : codes[0] || 'G1'))
  }, [project.projectId, project.gateStatuses])

  const loadGateData = useCallback(async () => {
    if (!isNumericProject || !selectedGateCode) return
    setLoading(true)
    setError(null)
    try {
      const [projDetail, cap, timeline, assignList] = await Promise.all([
        getProject(Number(project.projectId)).catch(() => null),
        getReviewGateOverrideCapability(project.projectId).catch(() => ({ canOverrideGate: false })),
        getStudentReviewTimeline(project.projectId).catch(() => null),
        getGateAssignments(project.projectId, selectedGateCode).catch(() => []),
      ])

      const projectMajors = projDetail?.majors?.map(m => ({ majorId: m.majorId, majorName: m.majorName })) ?? []
      setMajors(projectMajors)
      const defaultMajor = projectMajors[0]?.majorId ? String(projectMajors[0].majorId) : ''
      setSelectedMajorId(prev => (prev && projectMajors.some(m => String(m.majorId) === prev) ? prev : defaultMajor))

      setCanOverrideGate(cap.canOverrideGate)
      const matchedGate = timeline?.gates.find(g => g.code === selectedGateCode) ?? null
      setGateInstance(matchedGate)
      setAssignments(assignList)

      if (project.mode === 'INTERDISCIPLINARY') {
        const roundConsensus = await getGateRoundScopeConsensus(project.projectId, selectedGateCode).catch(() => null)
        setConsensus(roundConsensus)
        if (roundConsensus && roundConsensus.decisions.length > 0) {
          setScopeChoice(prev => prev || roundConsensus.decisions[0].scope)
        } else if (projectMajors.length > 0) {
          setScopeChoice(prev => prev || `MAJOR:${projectMajors[0].majorId}`)
        }
      } else {
        setConsensus(null)
      }
    } catch (err) {
      setError(humanizeHttpError(err, 'Không thể tải dữ liệu điều phối cổng thẩm định.'))
    } finally {
      setLoading(false)
    }
  }, [isNumericProject, project.mode, project.projectId, selectedGateCode])

  useEffect(() => {
    void loadGateData()
  }, [loadGateData])

  useEffect(() => {
    if (!isNumericProject || !selectedGateCode) return
    let active = true
    const majorNum = project.mode === 'INTERDISCIPLINARY' && selectedMajorId ? Number(selectedMajorId) : undefined
    void getGateReviewerCandidates(project.projectId, selectedGateCode, {
      majorId: majorNum,
      search: candidateSearch.trim() || undefined,
      page: 1,
      pageSize: 30,
    })
      .then(res => {
        if (!active) return
        setCandidates(res.items)
        setSelectedReviewerId(prev =>
          res.items.some(c => String(c.userId) === prev) ? prev : (res.items[0] ? String(res.items[0].userId) : ''),
        )
      })
      .catch(() => {
        if (active) setCandidates([])
      })
    return () => { active = false }
  }, [isNumericProject, project.mode, project.projectId, selectedGateCode, selectedMajorId, candidateSearch])

  async function handleAssign() {
    if (!selectedReviewerId) {
      setError('Vui lòng chọn phản biện hợp lệ trước khi phân công.')
      return
    }
    const majorNum = project.mode === 'INTERDISCIPLINARY' && selectedMajorId ? Number(selectedMajorId) : null
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await assignGateReviewer({
        projectId: project.projectId,
        gateCode: selectedGateCode,
        reviewerId: Number(selectedReviewerId),
        scope: majorNum ? 'MAJOR_SPECIFIC' : 'COMMON',
        majorId: majorNum,
        studentId: null,
        concurrencyToken: gateInstance?.concurrencyToken ?? null,
        sessionRole,
      })
      setNotice('Đã phân công phản biện thành công.')
      await loadGateData()
      await onChanged?.()
    } catch (err) {
      setError(humanizeHttpError(err, 'Không thể phân công phản biện.'))
    } finally {
      setBusy(false)
    }
  }

  async function handleRevoke(item: GateAssignmentSummary) {
    if (revokeReason.trim().length < 5) {
      setError('Vui lòng nhập lý do thu hồi phân công (tối thiểu 5 ký tự).')
      return
    }
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await revokeGateReviewer(item.id, {
        concurrencyToken: item.concurrencyToken,
        reason: revokeReason.trim(),
      })
      setRevokingId(null)
      setRevokeReason('')
      setNotice(`Đã thu hồi phân công của ${item.reviewerName}.`)
      await loadGateData()
      await onChanged?.()
    } catch (err) {
      setError(humanizeHttpError(err, 'Không thể thu hồi phân công phản biện.'))
    } finally {
      setBusy(false)
    }
  }

  async function handleRecordScopeDecision() {
    if (!scopeChoice) {
      setError('Vui lòng chọn phạm vi chuyên ngành.')
      return
    }
    if (scopeDecision === 'REVISION_REQUIRED' && scopeNotes.trim().length < 5) {
      setError('Vui lòng nhập nhận xét yêu cầu chỉnh sửa cho phạm vi chuyên ngành.')
      return
    }
    const existingDecision = consensus?.decisions.find(d => d.scope === scopeChoice)
    const roundNumber = consensus?.roundNumber ?? gateInstance?.latestRoundNumber ?? 1
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const updated = await recordGateRoundScopeDecision(project.projectId, selectedGateCode, {
        scope: scopeChoice,
        roundNumber,
        decision: scopeDecision,
        notes: scopeNotes.trim() || null,
        concurrencyToken: existingDecision?.concurrencyToken ?? null,
      })
      setConsensus(updated)
      setScopeNotes('')
      setNotice('Đã ghi nhận quyết định chuyên môn của Khoa cho vòng hiện tại.')
      await loadGateData()
      await onChanged?.()
    } catch (err) {
      setError(humanizeHttpError(err, 'Không thể ghi nhận quyết định vòng chuyên ngành.'))
    } finally {
      setBusy(false)
    }
  }

  async function handleOverride() {
    if (overrideReason.trim().length < 20) {
      setError('Lý do hòa giải / Override bắt buộc từ 20 ký tự trở lên.')
      return
    }
    if (!gateInstance?.concurrencyToken) {
      setError('Thiếu concurrencyToken của cổng. Vui lòng bấm Tải lại dữ liệu trước khi gửi.')
      return
    }
    const confirmed = await requestConfirmation({
      title: `Xác nhận Lead Override (${selectedGateCode} → ${overrideDecision})?`,
      description: `Thao tác này ghi đè trạng thái cổng ${selectedGateCode} thành ${gateStatusLabels[overrideDecision]} và được lưu kiểm toán (AuditLog).`,
      confirmLabel: 'Xác nhận Override',
      danger: overrideDecision === 'FAILED',
    })
    if (confirmed === null) return

    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await overrideReviewGate(project.projectId, selectedGateCode, {
        decision: overrideDecision,
        reason: overrideReason.trim(),
        concurrencyToken: gateInstance.concurrencyToken,
      })
      setOverrideReason('')
      setNotice(`Đã thực hiện Lead Override cho cổng ${selectedGateCode} (${gateStatusLabels[overrideDecision]}).`)
      await loadGateData()
      await onChanged?.()
    } catch (err) {
      if (err instanceof HttpError && err.status === 409) {
        setError('Phiên bản cổng đã thay đổi (409 STALE_CONCURRENCY_TOKEN). Đã giữ nguyên lý do — vui lòng tải lại trước khi gửi.')
      } else {
        setError(humanizeHttpError(err, 'Không thể thực hiện Lead Override.'))
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleReopen() {
    if (reopenReason.trim().length < 20) {
      setError('Lý do mở lại cổng đã khóa bắt buộc từ 20 ký tự trở lên.')
      return
    }
    if (!gateInstance?.concurrencyToken) {
      setError('Thiếu concurrencyToken của cổng. Vui lòng bấm Tải lại dữ liệu trước khi gửi.')
      return
    }
    const confirmed = await requestConfirmation({
      title: `Mở lại cổng ${selectedGateCode} đã khóa?`,
      description: 'Cổng sẽ chuyển về trạng thái Cần chỉnh sửa để nhóm nộp vòng mới; thao tác được ghi vào AuditLog.',
      confirmLabel: 'Xác nhận mở lại cổng',
      danger: true,
    })
    if (confirmed === null) return

    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await reopenReviewGate(project.projectId, selectedGateCode, {
        reason: reopenReason.trim(),
        concurrencyToken: gateInstance.concurrencyToken,
      })
      setReopenReason('')
      setNotice(`Đã mở lại cổng ${selectedGateCode} về trạng thái Cần chỉnh sửa.`)
      await loadGateData()
      await onChanged?.()
    } catch (err) {
      setError(humanizeHttpError(err, 'Không thể mở lại cổng thẩm định.'))
    } finally {
      setBusy(false)
    }
  }

  if (!isNumericProject) {
    return null
  }

  const activeAssignments = assignments.filter(a => a.status !== 'REVOKED')
  const gateStatus = gateInstance?.status ?? project.gateStatuses[selectedGateCode]
  const isGateLocked = gateStatus === 'PASSED' || gateStatus === 'FAILED'

  return (
    <div className="space-y-4 border-t border-hairline pt-4">
      {confirmationDialog}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <label htmlFor="coord-gate-select" className="text-xs font-bold text-ink">
            Điều phối cổng:
          </label>
          <select
            id="coord-gate-select"
            value={selectedGateCode}
            onChange={e => setSelectedGateCode(e.target.value)}
            className="min-h-9 rounded-lg border border-hairline bg-card px-2.5 py-1 text-xs font-semibold text-ink"
          >
            {gateCodes.map(code => (
              <option key={code} value={code}>
                {code} ({gateStatusLabels[project.gateStatuses[code]] ?? project.gateStatuses[code]})
              </option>
            ))}
          </select>
        </div>
        <Button size="sm" variant="secondary" disabled={loading || busy} onClick={() => void loadGateData()}>
          Tải lại
        </Button>
      </div>

      {notice && (
        <div role="status" className="rounded-lg border border-status-success-border bg-status-success-bg p-2.5 text-xs font-semibold text-status-success-text">
          {notice}
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-2.5 text-xs font-semibold text-status-error-text">
          {error}
        </div>
      )}

      {/* Block 1: Reviewer Assignment & Revocation (QD-09 + D17) */}
      <section className="rounded-xl border border-hairline bg-canvas p-3.5 space-y-3" aria-label="Phân công và thu hồi phản biện">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-bold text-ink">1. Phân công &amp; Thu hồi Phản biện ({selectedGateCode})</h4>
            <p className="text-xs text-ink-muted">
              {project.mode === 'INTERDISCIPLINARY'
                ? 'Đồ án liên ngành: mỗi chuyên ngành tối đa 1 phản biện (tổng 2 phản biện cố định G1–G3).'
                : 'Đồ án đơn ngành: tối đa 2 phản biện cùng ngành/khoa (lọc tự động xung đột D17/QD-06).'}
            </p>
          </div>
          <StatusBadge tone={activeAssignments.length >= 2 ? 'success' : 'warning'} label={`${activeAssignments.length}/2 phản biện`} />
        </div>

        {activeAssignments.length > 0 ? (
          <ul className="space-y-2">
            {activeAssignments.map(item => (
              <li key={item.id} className="rounded-lg border border-hairline bg-card p-2.5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <strong className="text-xs text-ink">{item.reviewerName}</strong>
                    <span className="ml-2 text-xs text-ink-muted">
                      {item.majorName || item.scope} · {item.sessionRole}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge
                      tone={item.latestDecision === 'PASSED' ? 'success' : item.latestDecision === 'REVISION_REQUIRED' ? 'warning' : 'neutral'}
                      label={item.latestDecision ?? item.status}
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setRevokingId(revokingId === item.id ? null : item.id)
                        setRevokeReason('')
                      }}
                      className="rounded-md border border-status-error-border px-2 py-1 text-xs font-semibold text-status-error-text hover:bg-status-error-bg"
                    >
                      Thu hồi
                    </button>
                  </div>
                </div>
                {revokingId === item.id && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-hairline pt-2">
                    <input
                      type="text"
                      aria-label={`Lý do thu hồi ${item.reviewerName}`}
                      value={revokeReason}
                      onChange={e => setRevokeReason(e.target.value)}
                      placeholder="Nhập lý do thu hồi phân công (tối thiểu 5 ký tự)..."
                      className="min-h-9 flex-1 rounded-lg border border-hairline bg-card px-2.5 py-1 text-xs text-ink"
                    />
                    <Button size="sm" variant="danger" disabled={busy} onClick={() => void handleRevoke(item)}>
                      Xác nhận thu hồi
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-ink-muted">Chưa có phản biện nào được phân công cho cổng {selectedGateCode}.</p>
        )}

        <div className="space-y-2 border-t border-hairline pt-2.5">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {project.mode === 'INTERDISCIPLINARY' && majors.length > 0 && (
              <label className="block">
                <span className="text-xs font-semibold text-ink-soft">Chuyên ngành phản biện</span>
                <select
                  value={selectedMajorId}
                  onChange={e => setSelectedMajorId(e.target.value)}
                  className="mt-1 min-h-9 w-full rounded-lg border border-hairline bg-card px-2 py-1 text-xs text-ink"
                >
                  {majors.map(m => (
                    <option key={m.majorId} value={String(m.majorId)}>
                      {m.majorName}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block">
              <span className="text-xs font-semibold text-ink-soft">Vai trò phiên</span>
              <select
                value={sessionRole}
                onChange={e => setSessionRole(e.target.value as 'MEMBER' | 'CHAIR' | 'SECRETARY')}
                className="mt-1 min-h-9 w-full rounded-lg border border-hairline bg-card px-2 py-1 text-xs text-ink"
              >
                <option value="MEMBER">Ủy viên phản biện (MEMBER)</option>
                <option value="CHAIR">Chủ tọa (CHAIR)</option>
                <option value="SECRETARY">Thư ký (SECRETARY)</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-semibold text-ink-soft">Tìm ứng viên phản biện (đã lọc D17)</span>
            <input
              type="text"
              value={candidateSearch}
              onChange={e => setCandidateSearch(e.target.value)}
              placeholder="Tìm theo họ tên hoặc email giảng viên..."
              className="mt-1 min-h-9 w-full rounded-lg border border-hairline bg-card px-2.5 py-1 text-xs text-ink"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Ứng viên phản biện hợp lệ"
              value={selectedReviewerId}
              onChange={e => setSelectedReviewerId(e.target.value)}
              className="min-h-9 flex-1 rounded-lg border border-hairline bg-card px-2.5 py-1 text-xs text-ink"
            >
              {candidates.length === 0 ? (
                <option value="">Không có ứng viên phù hợp (hoặc bị lọc COI D17)</option>
              ) : (
                candidates.map(c => (
                  <option key={c.userId} value={String(c.userId)}>
                    {c.fullName} ({c.email}){c.isOnFixedProjectPanel ? ' ★ Hội đồng cố định' : ''}
                  </option>
                ))
              )}
            </select>
            <Button size="sm" disabled={busy || !selectedReviewerId} onClick={() => void handleAssign()}>
              Gán phản biện
            </Button>
          </div>
        </div>
      </section>

      {/* Block 2: Dual-Dept Consensus & Participating Scope Veto (POL-02) */}
      {project.mode === 'INTERDISCIPLINARY' && (
        <section className="rounded-xl border border-hairline bg-canvas p-3.5 space-y-2.5" aria-label="Đồng thuận và phủ quyết hai Khoa">
          <h4 className="text-xs font-bold text-ink">2. Đồng thuận &amp; Phủ quyết chuyên môn 2 Khoa (POL-02)</h4>
          {consensus?.consolidatedRevisionFeedback && (
            <div className="rounded-lg border border-status-warning-border bg-status-warning-bg p-2.5 text-xs text-status-warning-text">
              <strong>Tổng hợp yêu cầu sửa vòng {consensus.roundNumber}:</strong> {consensus.consolidatedRevisionFeedback}
            </div>
          )}
          {consensus && consensus.decisions.length > 0 && (
            <ul className="space-y-1">
              {consensus.decisions.map(d => (
                <li key={d.id} className="flex items-center justify-between rounded border border-hairline bg-card px-2.5 py-1.5 text-xs">
                  <span className="font-semibold text-ink">{d.scope}</span>
                  <span className="text-ink-soft">{d.decision}{d.notes ? ` · ${d.notes}` : ''}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <select
              aria-label="Phạm vi Khoa quyết định"
              value={scopeChoice}
              onChange={e => setScopeChoice(e.target.value)}
              className="min-h-9 rounded-lg border border-hairline bg-card px-2 py-1 text-xs text-ink"
            >
              {(consensus?.decisions.map(d => d.scope) ?? majors.map(m => `MAJOR:${m.majorId}`)).map(sc => (
                <option key={sc} value={sc}>{sc}</option>
              ))}
            </select>
            <select
              aria-label="Quyết định vòng chuyên ngành"
              value={scopeDecision}
              onChange={e => setScopeDecision(e.target.value as 'REVISION_REQUIRED' | 'PASSED')}
              className="min-h-9 rounded-lg border border-hairline bg-card px-2 py-1 text-xs text-ink"
            >
              <option value="REVISION_REQUIRED">Phủ quyết: Yêu cầu chỉnh sửa</option>
              <option value="PASSED">Xác nhận Đạt phạm vi</option>
            </select>
          </div>
          <textarea
            rows={2}
            aria-label="Nhận xét chuyên môn vòng cổng"
            value={scopeNotes}
            onChange={e => setScopeNotes(e.target.value)}
            placeholder="Nhập nhận xét chuyên môn / lý do yêu cầu chỉnh sửa..."
            className="w-full rounded-lg border border-hairline bg-card px-2.5 py-1.5 text-xs text-ink"
          />
          <Button size="sm" variant="secondary" disabled={busy || !scopeChoice} onClick={() => void handleRecordScopeDecision()}>
            Ghi nhận quyết định chuyên ngành
          </Button>
        </section>
      )}

      {/* Block 3: Lead Override / FAILED / Reopen (LeadScope ONLY) */}
      {canOverrideGate && (
        <section className="rounded-xl border border-primary/30 bg-primary-subtle/30 p-3.5 space-y-3" aria-label="Hòa giải và mở lại cổng dành cho Khoa chủ trì">
          <div>
            <h4 className="text-xs font-bold text-primary">3. Hòa giải / Override / Mở lại cổng (Khoa Chủ trì)</h4>
            <p className="text-xs text-ink-soft">
              Chỉ hiển thị cho Khoa Chủ trì (`LeadScope`). Bắt buộc nhập lý do từ 20 ký tự trở lên và ghi AuditLog.
            </p>
          </div>

          {!isGateLocked ? (
            <div className="space-y-2">
              <label className="block">
                <span className="text-xs font-semibold text-ink-soft">Kết luận Lead Override</span>
                <select
                  aria-label="Kết luận Lead Override"
                  value={overrideDecision}
                  onChange={e => setOverrideDecision(e.target.value as 'PASSED' | 'REVISION_REQUIRED' | 'FAILED')}
                  className="mt-1 min-h-9 w-full rounded-lg border border-hairline bg-card px-2.5 py-1 text-xs text-ink"
                >
                  <option value="PASSED">PASSED — Thông qua cổng</option>
                  <option value="REVISION_REQUIRED">REVISION_REQUIRED — Yêu cầu chỉnh sửa</option>
                  <option value="FAILED">FAILED — Đánh trượt cổng</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-ink-soft">Lý do Override (tối thiểu 20 ký tự)</span>
                <textarea
                  rows={2}
                  aria-label="Lý do Override"
                  value={overrideReason}
                  onChange={e => setOverrideReason(e.target.value)}
                  placeholder="Nêu rõ căn cứ hòa giải hoặc lý do đánh trượt cổng..."
                  className="mt-1 w-full rounded-lg border border-hairline bg-card px-2.5 py-1.5 text-xs text-ink"
                />
              </label>
              <Button
                size="sm"
                variant={overrideDecision === 'FAILED' ? 'danger' : 'primary'}
                disabled={busy || overrideReason.trim().length < 20}
                onClick={() => void handleOverride()}
              >
                Thực hiện Lead Override
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-ink">
                Cổng {selectedGateCode} đang bị khóa bất biến ({gateStatusLabels[gateStatus]}). Để cho nhóm nộp lại vòng sửa, Khoa Chủ trì có thể mở lại cổng có kiểm toán:
              </p>
              <label className="block">
                <span className="text-xs font-semibold text-ink-soft">Lý do mở lại cổng (tối thiểu 20 ký tự)</span>
                <textarea
                  rows={2}
                  aria-label="Lý do mở lại cổng"
                  value={reopenReason}
                  onChange={e => setReopenReason(e.target.value)}
                  placeholder="Nêu rõ lý do học vụ cần mở lại cổng đã khóa..."
                  className="mt-1 w-full rounded-lg border border-hairline bg-card px-2.5 py-1.5 text-xs text-ink"
                />
              </label>
              <Button
                size="sm"
                variant="danger"
                disabled={busy || reopenReason.trim().length < 20}
                onClick={() => void handleReopen()}
              >
                Mở lại cổng (Reopen)
              </Button>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
