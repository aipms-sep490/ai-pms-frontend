import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import {
  forceTeamLeader,
  getLeaderChangeRequests,
  getTeam,
  respondToLeaderChange,
  unlockTeam,
} from '../../../services/api/teams.api'
import { HttpError } from '../../../services/http/http-client'
import type { TeamDto, TeamLeaderChangeRequestDto } from '../../../types/backend'

interface TeamLeaderGovernancePanelProps {
  projectId: number
  teamId?: number | null
  projectStatus?: string | null
  canManage: boolean
  onChanged?: () => void
}

const ROSTER_LOCKING_STATUSES = new Set([
  'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'SUPERVISOR_PENDING', 'ACTIVE', 'FINAL_SUBMISSION', 'COMPLETED', 'ARCHIVED',
])

export function TeamLeaderGovernancePanel({
  projectId,
  teamId,
  projectStatus,
  canManage,
  onChanged,
}: TeamLeaderGovernancePanelProps) {
  const [team, setTeam] = useState<TeamDto | null>(null)
  const [requests, setRequests] = useState<TeamLeaderChangeRequestDto[]>([])
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [forceModalOpen, setForceModalOpen] = useState(false)
  const [targetUserId, setTargetUserId] = useState<number>(0)
  const [forceReason, setForceReason] = useState('')
  const [unlockModalOpen, setUnlockModalOpen] = useState(false)
  const [unlockReason, setUnlockReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!projectId || projectId <= 0) return
    try {
      const [teamData, reqData] = await Promise.all([
        teamId && teamId > 0 ? getTeam(teamId).catch(() => null) : Promise.resolve(null),
        getLeaderChangeRequests(undefined, undefined, 1, 20, projectId).catch(() => ({ items: [], page: 1, pageSize: 20, totalCount: 0, totalPages: 0 })),
      ])
      setTeam(teamData)
      setRequests(reqData.items ?? [])
      const nonLeader = teamData?.members.find(m => !m.isLeader)
      if (nonLeader) setTargetUserId(prev => prev > 0 ? prev : nonLeader.userId)
    } catch {
      // Non-blocking in partially mocked views
    }
  }, [projectId, teamId])

  useEffect(() => {
    void load()
  }, [load])

  const handleRespond = async (req: TeamLeaderChangeRequestDto, decision: 'approve' | 'reject') => {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await respondToLeaderChange(req.id, decision, notes[req.id]?.trim() || undefined)
      setNotice(decision === 'approve' ? 'Đã phê duyệt đổi Trưởng nhóm.' : 'Đã từ chối yêu cầu đổi Trưởng nhóm.')
      await load()
      onChanged?.()
    } catch (err) {
      setError(err instanceof HttpError ? (err.problem?.detail || err.message) : 'Không thể xử lý yêu cầu đổi Trưởng nhóm.')
    } finally {
      setBusy(false)
    }
  }

  const handleForceLeader = async () => {
    if (!team || !targetUserId) return
    if (forceReason.trim().length < 15) {
      setError('Lý do cưỡng chế đổi Trưởng nhóm cần tối thiểu 15 ký tự.')
      return
    }
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await forceTeamLeader(team.id, targetUserId, forceReason.trim())
      setForceModalOpen(false)
      setForceReason('')
      setNotice('Đã cưỡng chế chuyển quyền Trưởng nhóm và thông báo tới nhóm & GVHD.')
      await load()
      onChanged?.()
    } catch (err) {
      setError(err instanceof HttpError ? (err.problem?.detail || err.message) : 'Không thể cưỡng chế đổi Trưởng nhóm.')
    } finally {
      setBusy(false)
    }
  }

  const handleUnlockTeam = async () => {
    if (!team || !unlockReason.trim()) {
      setError('Vui lòng nhập lý do mở khóa nhóm.')
      return
    }
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await unlockTeam(team.id, unlockReason.trim())
      setUnlockModalOpen(false)
      setUnlockReason('')
      setNotice('Đã mở khóa đội hình nhóm.')
      await load()
      onChanged?.()
    } catch (err) {
      setError(err instanceof HttpError ? (err.problem?.detail || err.message) : 'Không thể mở khóa nhóm.')
    } finally {
      setBusy(false)
    }
  }

  const canForceLeader = Boolean(
    canManage
    && team
    && team.members.length > 1
    && team.status !== 'DISBANDED'
    && projectStatus !== 'COMPLETED'
    && projectStatus !== 'ARCHIVED',
  )
  const canUnlock = Boolean(
    canManage
    && team
    && team.status === 'LOCKED'
    && (!projectStatus || !ROSTER_LOCKING_STATUSES.has(projectStatus)),
  )

  if (!canManage && requests.length === 0) return null

  return (
    <section aria-label="Quản lý Trưởng nhóm và Đội hình" className="rounded-xl border border-hairline bg-card p-5 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-ink">Quản lý Trưởng nhóm &amp; Đơn đổi Trưởng nhóm</h2>
          <p className="text-xs text-ink-muted">
            Khoa chủ trì duyệt đơn đổi Trưởng nhóm (khi chưa có GVHD hoặc GVHD không phản hồi), cưỡng chế đổi Trưởng nhóm ngoại lệ và mở khóa nhóm khi cần.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canUnlock && (
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => setUnlockModalOpen(true)}>
              Mở khóa nhóm
            </Button>
          )}
          {canForceLeader && (
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => setForceModalOpen(true)}>
              Cưỡng chế đổi Trưởng nhóm
            </Button>
          )}
        </div>
      </div>

      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</div>}
      {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{notice}</div>}

      {requests.length === 0 ? (
        <p className="text-xs text-ink-muted">Chưa có yêu cầu đổi Trưởng nhóm nào cho đồ án này.</p>
      ) : (
        <ul className="divide-y divide-hairline text-xs">
          {requests.map(req => {
            const target = team?.members.find(m => m.userId === req.newLeaderUserId)
            return (
              <li key={req.id} className="py-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <strong className="text-sm text-ink">Đề cử: {target?.fullName ?? `SV #${req.newLeaderUserId}`}</strong>
                    <StatusBadge
                      tone={req.status === 'APPROVED' ? 'success' : req.status === 'REJECTED' ? 'danger' : req.status === 'CANCELLED' ? 'neutral' : 'warning'}
                      label={req.status}
                    />
                  </div>
                  <span className="text-ink-muted">
                    {req.mentorName ? `GVHD: ${req.mentorName}` : 'Chưa có GVHD — định tuyến Khoa chủ trì'}
                  </span>
                </div>
                {req.requestMessage && <p className="text-ink-soft">Lý do nhóm gửi: {req.requestMessage}</p>}
                {req.responseMessage && <p className="text-ink-muted">Phản hồi: {req.responseMessage}</p>}
                {canManage && req.status === 'PENDING' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      placeholder={req.mentorProfileId ? 'Lý do Khoa duyệt thay GVHD (bắt buộc)' : 'Ghi chú xử lý (tùy chọn)'}
                      value={notes[req.id] ?? ''}
                      disabled={busy}
                      onChange={e => setNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
                      className="min-h-9 flex-1 rounded-lg border border-hairline bg-canvas px-2.5 text-xs"
                    />
                    <Button size="sm" disabled={busy} onClick={() => void handleRespond(req, 'approve')}>Phê duyệt</Button>
                    <Button size="sm" variant="danger" disabled={busy} onClick={() => void handleRespond(req, 'reject')}>Từ chối</Button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {forceModalOpen && team && (
        <Modal open title="Cưỡng chế đổi Trưởng nhóm (Q-X-21)" busy={busy} onClose={() => setForceModalOpen(false)}>
          <div className="space-y-3 text-sm">
            <p className="text-xs text-ink-muted">
              Chuyển quyền Trưởng nhóm ngay lập tức, tự hủy các đơn đang chờ và gửi thông báo cho Trưởng nhóm cũ, Trưởng nhóm mới và GVHD.
            </p>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-ink">Thành viên nhận quyền Trưởng nhóm</span>
              <select
                value={targetUserId}
                disabled={busy}
                onChange={e => setTargetUserId(Number(e.target.value))}
                className="w-full min-h-10 rounded-lg border border-hairline bg-canvas px-3 text-sm"
              >
                {team.members.filter(m => !m.isLeader).map(m => (
                  <option key={m.userId} value={m.userId}>{m.fullName}</option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-ink">Lý do cưỡng chế (tối thiểu 15 ký tự) *</span>
              <textarea
                rows={3}
                value={forceReason}
                disabled={busy}
                onChange={e => setForceReason(e.target.value)}
                placeholder="VD: Trưởng nhóm cũ bảo lưu / bị khóa tài khoản, cần chỉ định thành viên kế nhiệm."
                className="w-full rounded-lg border border-hairline bg-canvas p-2.5 text-sm"
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" disabled={busy} onClick={() => setForceModalOpen(false)}>Hủy</Button>
              <Button type="button" disabled={busy} onClick={() => void handleForceLeader()}>Xác nhận cưỡng chế</Button>
            </div>
          </div>
        </Modal>
      )}

      {unlockModalOpen && team && (
        <Modal open title="Mở khóa nhóm (TK-W1-11)" busy={busy} onClose={() => setUnlockModalOpen(false)}>
          <div className="space-y-3 text-sm">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-ink">Lý do mở khóa *</span>
              <textarea
                rows={3}
                value={unlockReason}
                disabled={busy}
                onChange={e => setUnlockReason(e.target.value)}
                placeholder="Nhập lý do mở khóa đội hình nhóm..."
                className="w-full rounded-lg border border-hairline bg-canvas p-2.5 text-sm"
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" disabled={busy} onClick={() => setUnlockModalOpen(false)}>Hủy</Button>
              <Button type="button" disabled={busy} onClick={() => void handleUnlockTeam()}>Mở khóa nhóm</Button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  )
}
