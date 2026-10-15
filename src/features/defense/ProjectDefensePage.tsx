import { useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { useStudentJourney } from '../../app/context'
import { HttpError } from '../../services/http/http-client'
import {
  cancelDefense,
  createDefenseCommittee,
  getDefenseCommittees,
  getProjectDefenseSessions,
  scheduleDefense,
} from './defense-api'
import type {
  CommitteeMember,
  DefenseCommittee,
  DefenseSession,
  DefenseSessionStatus,
} from './defense-types'

const statusText: Record<string, string> = { SCHEDULED: 'Đã lên lịch', CANCELLED: 'Đã hủy' }
const statusTone: Record<string, string> = {
  SCHEDULED: 'border-primary/20 bg-primary-subtle text-primary',
  CANCELLED: 'border-status-error-border bg-status-error-bg text-status-error-text',
}
export const describeStatus = (status: DefenseSessionStatus) => statusText[status] ?? status
export const toneFor = (status: DefenseSessionStatus) => statusTone[status] ?? 'border-hairline bg-canvas text-ink-muted'

export const formatRange = (start: string, end: string) => {
  const startDate = new Date(start)
  if (Number.isNaN(startDate.getTime())) return start
  const dayPart = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(startDate)
  const startTime = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(startDate)
  const endDate = new Date(end)
  const endTime = !Number.isNaN(endDate.getTime()) ? new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(endDate) : null
  return `${dayPart} · ${startTime}${endTime ? `–${endTime}` : ''}`
}

function mapConflictReason(reason: unknown, fallback: string): string {
  if (reason instanceof HttpError) {
    const code = (reason.message || '').toUpperCase()
    if (code.includes('DEFENSE_SCHEDULE_CONFLICT')) return 'Xung đột lịch: Đồ án, phòng hoặc giảng viên đã có lịch bảo vệ trùng giờ.'
    if (code.includes('DEFENSE_ALREADY_SCHEDULED')) return 'Đồ án đã có lịch bảo vệ đang hoạt động. Cần hủy lịch trước khi xếp lịch mới.'
    if (code.includes('DEFENSE_MAJOR_COVERAGE_REQUIRED')) return 'Hội đồng phải bao quát đầy đủ tất cả các chuyên ngành trong phạm vi đồ án.'
    if (code.includes('DEFENSE_MEMBER_NOT_QUALIFIED')) return 'Giảng viên chưa đủ điều kiện chuyên môn hoặc không thuộc khoa phụ trách ngành.'
    if (code.includes('DEFENSE_SCHEDULE_BUSY')) return 'Hệ thống đang xử lý lịch bảo vệ khác; vui lòng thử lại sau giây lát.'
    if (reason.status === 403) return 'Bạn không có quyền quản lý lịch bảo vệ hoặc hội đồng của đồ án này.'
    if (reason.status === 409) return reason.message || 'Xung đột phiên làm việc hoặc xung đột lịch bảo vệ. Hãy thử lại.'
  }
  return fallback
}

export function DefenseScheduleView({
  projectId: _projectId,
  sessions,
  onCancelled,
}: {
  projectId: number
  sessions: DefenseSession[] | null
  onCancelled?: () => void
}) {
  const scheduled = sessions?.find((session) => session.status === 'SCHEDULED')
  const mostRecentCancelled = sessions?.filter((session) => session.status === 'CANCELLED').at(-1)
  const highlighted = scheduled ?? mostRecentCancelled ?? null

  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')

  async function handleCancel() {
    if (!scheduled || !cancelReason.trim()) return
    setCancelling(true)
    setCancelError('')
    try {
      await cancelDefense(scheduled.id, {
        concurrencyToken: scheduled.concurrencyToken,
        reason: cancelReason.trim(),
      })
      setShowCancelModal(false)
      setCancelReason('')
      onCancelled?.()
    } catch (err) {
      setCancelError(mapConflictReason(err, 'Không thể hủy lịch bảo vệ. Hãy thử lại.'))
    } finally {
      setCancelling(false)
    }
  }

  if (!highlighted) {
    return <p className="rounded-lg border border-hairline bg-card p-5 text-sm text-ink-muted">Đồ án chưa được xếp lịch bảo vệ. Bạn sẽ được thông báo khi có lịch.</p>
  }

  return (
    <section className="space-y-3 rounded-xl border border-hairline bg-card p-5 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Thời gian</p>
          <h2 className="mt-1 text-base font-bold text-ink">{formatRange(highlighted.startAt, highlighted.endAt)}</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${toneFor(highlighted.status)}`}>
            {describeStatus(highlighted.status)}
          </span>
          {scheduled?.canCancel && !showCancelModal && (
            <button
              type="button"
              className="text-xs font-semibold text-status-error-text underline underline-offset-4"
              onClick={() => setShowCancelModal(true)}
            >
              Hủy lịch
            </button>
          )}
        </div>
      </div>
      <p className="text-sm text-ink-soft"><span className="font-semibold">Phòng:</span> {highlighted.room}</p>
      {highlighted.status === 'CANCELLED' && highlighted.cancellationReason && (
        <p className="text-sm text-status-error-text"><span className="font-semibold">Lý do hủy:</span> {highlighted.cancellationReason}</p>
      )}

      {showCancelModal && scheduled && (
        <div className="mt-4 rounded-lg border border-hairline bg-subtle p-3 space-y-2">
          <label className="block text-xs font-semibold text-ink-soft">
            Lý do hủy lịch bảo vệ (bắt buộc)
            <textarea
              className="mt-1 w-full rounded-md border border-hairline p-2 text-sm"
              rows={2}
              value={cancelReason}
              placeholder="vd: Điều chỉnh phòng bảo vệ theo yêu cầu khoa"
              disabled={cancelling}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </label>
          {cancelError && <p role="alert" className="text-xs text-status-error-text">{cancelError}</p>}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="px-3 py-1 text-xs font-semibold text-ink-muted hover:underline"
              disabled={cancelling}
              onClick={() => { setShowCancelModal(false); setCancelError('') }}
            >
              Đóng
            </button>
            <button
              type="button"
              className="rounded-md bg-status-error-bg border border-status-error-border px-3 py-1 text-xs font-semibold text-status-error-text disabled:opacity-50"
              disabled={cancelling || !cancelReason.trim()}
              onClick={() => void handleCancel()}
            >
              {cancelling ? 'Đang hủy…' : 'Xác nhận hủy lịch'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

export function DefenseManagementPanel({
  projectId,
  hasScheduledSession,
  onSessionScheduled,
}: {
  projectId: number
  hasScheduledSession: boolean
  onSessionScheduled?: () => void
}) {
  const [committees, setCommittees] = useState<DefenseCommittee[]>([])
  const [loadingCommittees, setLoadingCommittees] = useState(false)
  const [committeeError, setCommitteeError] = useState('')

  // Create committee state
  const [committeeName, setCommitteeName] = useState('')
  const [memberRows, setMemberRows] = useState<{ userId: string; majorId: string }[]>([{ userId: '', majorId: '' }])
  const [creatingCommittee, setCreatingCommittee] = useState(false)
  const [createCommitteeError, setCreateCommitteeError] = useState('')

  // Schedule defense state
  const [selectedCommitteeId, setSelectedCommitteeId] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [room, setRoom] = useState('')
  const [scheduling, setScheduling] = useState(false)
  const [scheduleError, setScheduleError] = useState('')
  const [scheduleSuccess, setScheduleSuccess] = useState('')

  useEffect(() => {
    let active = true
    setLoadingCommittees(true)
    getDefenseCommittees(projectId)
      .then((res) => {
        if (active) setCommittees(res.items)
      })
      .catch((err) => {
        if (active) setCommitteeError(mapConflictReason(err, 'Chưa tải được danh sách hội đồng.'))
      })
      .finally(() => {
        if (active) setLoadingCommittees(false)
      })
    return () => { active = false }
  }, [projectId])

  function addMemberRow() {
    setMemberRows((curr) => [...curr, { userId: '', majorId: '' }])
  }
  function updateMemberRow(idx: number, patch: { userId?: string; majorId?: string }) {
    setMemberRows((curr) => curr.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }
  function removeMemberRow(idx: number) {
    setMemberRows((curr) => curr.filter((_, i) => i !== idx))
  }

  async function handleCreateCommittee() {
    if (!committeeName.trim()) return
    const members: CommitteeMember[] = memberRows
      .map((r) => ({ userId: Number(r.userId), majorId: Number(r.majorId) }))
      .filter((m) => m.userId > 0 && m.majorId > 0)

    if (members.length === 0) {
      setCreateCommitteeError('Hội đồng phải có ít nhất 1 thành viên hợp lệ (User ID và Major ID).')
      return
    }

    setCreatingCommittee(true)
    setCreateCommitteeError('')
    try {
      const created = await createDefenseCommittee(projectId, {
        name: committeeName.trim(),
        members,
      })
      setCommittees((curr) => [...curr, created])
      setCommitteeName('')
      setMemberRows([{ userId: '', majorId: '' }])
    } catch (err) {
      setCreateCommitteeError(mapConflictReason(err, 'Không thể tạo hội đồng bảo vệ.'))
    } finally {
      setCreatingCommittee(false)
    }
  }

  async function handleScheduleDefense() {
    const cId = Number(selectedCommitteeId)
    if (!cId || !startAt || !endAt || !room.trim()) return

    setScheduling(true)
    setScheduleError('')
    setScheduleSuccess('')
    try {
      await scheduleDefense(projectId, {
        committeeId: cId,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        room: room.trim().toUpperCase(),
      })
      setScheduleSuccess('Xếp lịch bảo vệ thành công.')
      onSessionScheduled?.()
    } catch (err) {
      setScheduleError(mapConflictReason(err, 'Không thể xếp lịch bảo vệ.'))
    } finally {
      setScheduling(false)
    }
  }

  return (
    <div className="space-y-5 border-t border-hairline pt-5">
      <h2 className="text-base font-bold text-ink">Quản lý hội đồng & Lịch bảo vệ (Khoa / Quản trị)</h2>

      {/* Danh sách hội đồng */}
      <section className="space-y-3 rounded-xl border border-hairline bg-card p-5 shadow-xs">
        <h3 className="text-sm font-bold text-ink">Danh sách hội đồng bảo vệ</h3>
        {loadingCommittees && <p className="text-xs text-ink-muted">Đang tải danh sách hội đồng…</p>}
        {committeeError && <p role="alert" className="text-xs text-status-error-text">{committeeError}</p>}
        {!loadingCommittees && committees.length === 0 && (
          <p className="text-xs text-ink-muted">Chưa có hội đồng nào được tạo cho đồ án này.</p>
        )}
        {committees.length > 0 && (
          <ul className="space-y-2">
            {committees.map((c) => (
              <li key={c.id} className="rounded-lg border border-hairline p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink">{c.name} (#{c.id})</span>
                  <span className="text-ink-muted">{c.members.length} thành viên</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {c.members.map((m, idx) => (
                    <span key={idx} className="rounded bg-subtle px-1.5 py-0.5 border border-hairline text-ink-soft">
                      Giảng viên #{m.userId} · Ngành #{m.majorId}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Tạo hội đồng mới */}
        <div className="mt-4 border-t border-hairline pt-3 space-y-3">
          <h4 className="text-xs font-semibold text-ink uppercase tracking-wide">Tạo hội đồng mới</h4>
          <label className="block text-xs text-ink-soft">
            Tên hội đồng
            <input
              className="mt-1 block w-full rounded-md border border-hairline p-2 text-sm"
              value={committeeName}
              placeholder="vd: Hội đồng bảo vệ Kỹ thuật phần mềm 01"
              disabled={creatingCommittee}
              onChange={(e) => setCommitteeName(e.target.value)}
            />
          </label>
          <div className="space-y-2">
            <span className="text-xs text-ink-soft font-semibold">Danh sách thành viên hội đồng</span>
            {memberRows.map((row, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="User ID (Giảng viên)"
                  className="w-36 rounded-md border border-hairline p-1.5 text-xs"
                  value={row.userId}
                  disabled={creatingCommittee}
                  onChange={(e) => updateMemberRow(idx, { userId: e.target.value })}
                />
                <input
                  type="number"
                  placeholder="Major ID (Ngành)"
                  className="w-36 rounded-md border border-hairline p-1.5 text-xs"
                  value={row.majorId}
                  disabled={creatingCommittee}
                  onChange={(e) => updateMemberRow(idx, { majorId: e.target.value })}
                />
                <button
                  type="button"
                  className="text-xs text-status-error-text hover:underline"
                  disabled={creatingCommittee || memberRows.length === 1}
                  onClick={() => removeMemberRow(idx)}
                >
                  Xóa
                </button>
              </div>
            ))}
            <button
              type="button"
              className="text-xs font-semibold text-primary hover:underline"
              disabled={creatingCommittee}
              onClick={addMemberRow}
            >
              + Thêm giảng viên
            </button>
          </div>
          {createCommitteeError && <p role="alert" className="text-xs text-status-error-text">{createCommitteeError}</p>}
          <button
            type="button"
            className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            disabled={creatingCommittee || !committeeName.trim()}
            onClick={() => void handleCreateCommittee()}
          >
            {creatingCommittee ? 'Đang tạo…' : 'Tạo hội đồng'}
          </button>
        </div>
      </section>

      {/* Xếp lịch bảo vệ */}
      <section className="space-y-3 rounded-xl border border-hairline bg-card p-5 shadow-xs">
        <h3 className="text-sm font-bold text-ink">Xếp lịch bảo vệ</h3>
        {hasScheduledSession ? (
          <p className="text-xs text-ink-muted">
            Đồ án hiện đã có lịch bảo vệ được xếp. Hãy hủy lịch hiện tại nếu cần xếp lại lịch mới.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-xs text-ink-soft">
                Chọn hội đồng bảo vệ
                <select
                  className="mt-1 block w-full rounded-md border border-hairline p-2 text-sm"
                  value={selectedCommitteeId}
                  disabled={scheduling || committees.length === 0}
                  onChange={(e) => setSelectedCommitteeId(e.target.value)}
                >
                  <option value="">-- Chọn hội đồng --</option>
                  {committees.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (#{c.id})
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-ink-soft">
                Phòng bảo vệ
                <input
                  className="mt-1 block w-full rounded-md border border-hairline p-2 text-sm"
                  value={room}
                  placeholder="vd: A1.01 hoặc Online Meet"
                  disabled={scheduling}
                  onChange={(e) => setRoom(e.target.value)}
                />
              </label>
              <label className="text-xs text-ink-soft">
                Thời gian bắt đầu
                <input
                  type="datetime-local"
                  className="mt-1 block w-full rounded-md border border-hairline p-2 text-sm"
                  value={startAt}
                  disabled={scheduling}
                  onChange={(e) => setStartAt(e.target.value)}
                />
              </label>
              <label className="text-xs text-ink-soft">
                Thời gian kết thúc
                <input
                  type="datetime-local"
                  className="mt-1 block w-full rounded-md border border-hairline p-2 text-sm"
                  value={endAt}
                  disabled={scheduling}
                  onChange={(e) => setEndAt(e.target.value)}
                />
              </label>
            </div>
            {scheduleError && <p role="alert" className="text-xs text-status-error-text">{scheduleError}</p>}
            {scheduleSuccess && <p role="status" className="text-xs text-status-success-text">{scheduleSuccess}</p>}
            <button
              type="button"
              className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              disabled={scheduling || !selectedCommitteeId || !startAt || !endAt || !room.trim()}
              onClick={() => void handleScheduleDefense()}
            >
              {scheduling ? 'Đang xếp lịch…' : 'Xác nhận xếp lịch bảo vệ'}
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

export function ProjectDefensePage() {
  const journey = useStudentJourney()
  const projectId = journey.project?.id
  const [sessions, setSessions] = useState<DefenseSession[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    if (!projectId) return
    const controller = new AbortController()
    setLoading(true); setError(null)
    getProjectDefenseSessions(projectId, 1, 20, controller.signal).then((result) => {
      if (controller.signal.aborted) return
      setSessions(result.items)
    }).catch((reason: unknown) => {
      if (controller.signal.aborted) return
      setError(reason instanceof HttpError && reason.status === 403
        ? 'Bạn chưa có quyền xem lịch bảo vệ của đồ án này.'
        : 'Chưa tải được lịch bảo vệ. Hãy thử lại.')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [projectId, revision])

  const retry = () => { setLoading(true); setError(null); setSessions(null); setRevision((value) => value + 1) }
  return (
    <WorkspacePage
      className="space-y-5"
      title="Lịch bảo vệ"
      eyebrow="Hội đồng đánh giá"
      description="Thời gian và phòng bảo vệ của đồ án. Thành phần hội đồng không hiển thị ở đây."
    >
      {!projectId && <p className="rounded-lg border border-hairline bg-card p-5 text-sm text-ink-muted">Không tìm thấy đồ án đang hoạt động để xem lịch bảo vệ.</p>}
      {projectId && loading && <p role="status" className="rounded-lg border border-hairline bg-card p-5 text-sm text-ink-muted">Đang tải lịch bảo vệ…</p>}
      {projectId && !loading && error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text"><span>{error}</span><button type="button" className="min-h-11 font-semibold underline" onClick={retry}>Tải lại</button></div>}

      {projectId && !loading && !error && (
        <DefenseScheduleView
          projectId={projectId}
          sessions={sessions}
          onCancelled={() => setRevision((v) => v + 1)}
        />
      )}

    </WorkspacePage>
  )
}

/** Management is exposed only from lecturer/department routes, never from the student page. */
export function ProjectDefenseManagementPage() {
  const routeProjectId = useParams().projectId
  const pathname = useLocation().pathname
  const projectId = Number(routeProjectId ?? pathname.match(/projects\/(\d+)\/defense/)?.[1])
  const [sessions, setSessions] = useState<DefenseSession[] | null>(null)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    if (!Number.isSafeInteger(projectId) || projectId < 1) return
    const controller = new AbortController()
    setError('')
    getProjectDefenseSessions(projectId, 1, 20, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setSessions(result.items) })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof HttpError && reason.status === 403 ? 'Bạn không có quyền quản lý lịch bảo vệ của đồ án này.' : 'Chưa tải được lịch bảo vệ.')
      })
    return () => controller.abort()
  }, [projectId, revision])

  if (!Number.isSafeInteger(projectId) || projectId < 1) return <WorkspacePage title="Quản lý bảo vệ"><p role="alert">Mã đồ án không hợp lệ.</p></WorkspacePage>
  return (
    <WorkspacePage title="Quản lý hội đồng & lịch bảo vệ" eyebrow={`Đồ án #${projectId}`} description="Khoa hoặc Primary quản lý hội đồng và lịch bảo vệ trong phạm vi được backend cấp.">
      {error && <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">{error}</p>}
      {!error && sessions && <DefenseManagementPanel projectId={projectId} hasScheduledSession={sessions.some((session) => session.status === 'SCHEDULED')} onSessionScheduled={() => setRevision((value) => value + 1)} />}
      {!error && !sessions && <p role="status">Đang tải lịch bảo vệ…</p>}
    </WorkspacePage>
  )
}

