import { useState } from 'react'
import type { TeamMemberDto } from '../../../types/backend'
import { Avatar } from '../../../components/ui/Avatar'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../../../components/ui/Table'
import { badgeToneClass } from '../../../components/ui/status-badge-tone'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { displayLabel } from '../../../components/ui/display-label'

interface TeamRosterTableProps {
  members: TeamMemberDto[]
  currentUserId: number
  currentUserStudentCode?: string
  majorNames?: Record<number, string>
  isLeader: boolean
  rosterLocked: boolean
  onRemoveMember: (userId: number) => Promise<void>
  onOpenTransferLeader: () => void
}

export function TeamRosterTable({
  members,
  currentUserId,
  currentUserStudentCode,
  majorNames = {},
  isLeader,
  rosterLocked,
  onRemoveMember,
  onOpenTransferLeader,
}: TeamRosterTableProps) {
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [confirmKickId, setConfirmKickId] = useState<number | null>(null)
  const showActions = isLeader && !rosterLocked

  const handleKick = async (userId: number) => {
    setRemovingId(userId)
    try {
      await onRemoveMember(userId)
    } finally {
      setRemovingId(null)
      setConfirmKickId(null)
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-hairline bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <h3 className="text-base font-bold text-ink">Danh sách thành viên</h3>
          <span className="inline-flex items-center rounded-full border border-hairline bg-canvas px-2.5 py-0.5 font-mono text-xs font-semibold text-ink-soft">
            {members.length} thành viên
          </span>
        </div>
        {isLeader && !rosterLocked && members.length > 1 && (
          <button
            type="button"
            onClick={onOpenTransferLeader}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-hairline bg-card px-3.5 py-2 text-xs font-semibold text-ink-soft transition-colors hover:border-primary hover:bg-primary-subtle hover:text-primary"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">swap_horiz</span>
            Chuyển quyền Trưởng nhóm
          </button>
        )}
      </div>

      <Table stack aria-label="Danh sách thành viên nhóm">
        <TableHead>
          <TableRow head>
            <TableHeaderCell className="w-[34%]">Thành viên</TableHeaderCell>
            <TableHeaderCell className="w-[26%]">Chuyên ngành</TableHeaderCell>
            <TableHeaderCell className="w-[18%]">Vai trò</TableHeaderCell>
            <TableHeaderCell className="w-[22%]">Tư cách đồ án</TableHeaderCell>
            {showActions && <TableHeaderCell align="right">Thao tác</TableHeaderCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {members.map((member) => {
            const isSelf = member.userId === currentUserId

            return (
              <TableRow key={member.userId} className={isSelf ? 'bg-primary-subtle/35' : ''}>
                <TableCell label="Thành viên" className="font-medium text-ink">
                  <div className="flex items-center gap-3">
                    <Avatar name={member.fullName} size="sm" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-ink">{member.fullName}</span>
                        {isSelf && (
                          <span className="rounded-full bg-primary-subtle px-1.5 py-0.5 text-xs font-semibold text-primary">
                            (Bạn)
                          </span>
                        )}
                      </div>
                      {isSelf && currentUserStudentCode && (
                        <span className="mt-0.5 block font-mono text-xs text-ink-muted">{currentUserStudentCode}</span>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell label="Chuyên ngành">
                  <span className="inline-flex items-center rounded-md border border-hairline bg-canvas px-2.5 py-1 text-xs font-semibold text-ink-soft">
                    {member.majorId && majorNames[member.majorId] ? majorNames[member.majorId] : 'Chưa có thông tin'}
                  </span>
                </TableCell>
                <TableCell label="Vai trò">
                  {member.isLeader ? (
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeToneClass.warning}`}>
                      <span className="material-symbols-outlined text-[14px]" aria-hidden="true">star</span>
                      Trưởng nhóm
                    </span>
                  ) : (
                    <StatusBadge tone="neutral" label="Thành viên" />
                  )}
                </TableCell>
                <TableCell label="Tư cách đồ án">
                  {member.isEligibleStudent && member.isProjectQualificationEligible !== false ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-status-success-text">
                      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">verified</span>
                      Đủ điều kiện{member.qualificationStatus === 'VERIFIED' ? ' · Đã xác minh' : ''}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-status-error-text">
                      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">cancel</span>
                      Chưa đủ điều kiện{member.qualificationStatus ? ' · ' + displayLabel(member.qualificationStatus) : ''}
                    </span>
                  )}
                </TableCell>
                {showActions && (
                  <TableCell label="Thao tác" align="right">
                    {!member.isLeader && (
                      <div>
                        {confirmKickId === member.userId ? (
                          <div className="inline-flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-medium text-status-error-text">Xác nhận xóa?</span>
                            <button
                              type="button"
                              onClick={() => handleKick(member.userId)}
                              disabled={removingId === member.userId}
                              className="min-h-9 rounded-lg bg-status-error-text px-2.5 py-1 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                            >
                              {removingId === member.userId ? '...' : 'Xóa'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmKickId(null)}
                              className="min-h-9 rounded-lg border border-hairline bg-canvas px-2.5 py-1 text-xs font-semibold text-ink-soft hover:bg-card"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmKickId(member.userId)}
                            className="min-h-9 rounded-lg px-2.5 py-1 text-xs font-semibold text-status-error-text transition-colors hover:bg-status-error-bg"
                          >
                            Xóa khỏi nhóm
                          </button>
                        )}
                      </div>
                    )}
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
