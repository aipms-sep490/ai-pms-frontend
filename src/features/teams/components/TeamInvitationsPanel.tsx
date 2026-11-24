import { useState } from 'react'
import type { PagedResult, TeamInvitationCandidateDto, TeamInvitationDto } from '../../../types/backend'
import { Pagination, useClientPagination } from '../../../components/ui'
import { dateTimeLabel } from '../../execution/execution-utils'

interface TeamInvitationsPanelProps {
  sentInvitations: TeamInvitationDto[]
  memberNames?: Record<number, string>
  receivedInvitations: TeamInvitationDto[]
  isLeader: boolean
  rosterLocked: boolean
  /** Presentation-only hint (derived from team.academicScope + current roster) for
   * which interdisciplinary major still needs members. Never a substitute for the
   * server's own eligibility reasons. */
  unfilledMajors?: { majorId: number; majorName?: string; remaining: number }[]
  candidates: PagedResult<TeamInvitationCandidateDto>
  candidateSearch: string
  candidateLoading: boolean
  candidateError?: string | null
  onCandidateSearchChange: (value: string) => void
  onCandidatePageChange: (page: number) => void
  onRetryCandidates: () => void
  isMutationPending: (action: string, id?: number) => boolean
  onSendInvitation?: (invitedUserId: number, message?: string) => Promise<void>
  onCancelInvitation: (invitationId: number) => Promise<void>
  onAcceptInvitation: (invitationId: number) => Promise<void>
  onRejectInvitation: (invitationId: number) => Promise<void>
}

export function TeamInvitationsPanel({
  sentInvitations,
  memberNames = {},
  receivedInvitations,
  isLeader,
  rosterLocked,
  unfilledMajors = [],
  candidates,
  candidateSearch,
  candidateLoading,
  candidateError,
  onCandidateSearchChange,
  onCandidatePageChange,
  onRetryCandidates,
  isMutationPending,
  onSendInvitation,
  onCancelInvitation,
  onAcceptInvitation,
  onRejectInvitation,
}: TeamInvitationsPanelProps) {
  const [activeTab, setActiveTab] = useState<'sent' | 'received'>('sent')
  const [message, setMessage] = useState('')
  const [majorFilter, setMajorFilter] = useState<number | null>(null)
  const sentPagination = useClientPagination(sentInvitations, 8)
  const receivedPagination = useClientPagination(receivedInvitations, 8)
  const visibleCandidates = majorFilter == null ? candidates.items : candidates.items.filter((candidate) => candidate.majorId === majorFilter)
  const personName = (id: number) => memberNames[id] || candidates.items.find(candidate => candidate.userId === id)?.fullName
  const statusLabel = (status: string) => ({ PENDING: 'Đang chờ phản hồi', ACCEPTED: 'Đã chấp nhận', REJECTED: 'Đã từ chối', CANCELLED: 'Đã hủy', EXPIRED: 'Đã hết hạn' }[status] || 'Chưa có thông tin')

  const handleSend = async (candidate: TeamInvitationCandidateDto) => {
    if (!onSendInvitation) return
    try {
      await onSendInvitation(candidate.userId, message.trim() || undefined)
      setMessage('')
    } catch { /* The feature hook exposes safe, classified feedback. */ }
  }

  const handleCancel = async (invitationId: number) => {
    try { await onCancelInvitation(invitationId) } catch { /* handled by feature hook */ }
  }

  const handleAccept = async (invitationId: number) => {
    try { await onAcceptInvitation(invitationId) } catch { /* handled by feature hook */ }
  }

  const handleReject = async (invitationId: number) => {
    try { await onRejectInvitation(invitationId) } catch { /* handled by feature hook */ }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs">
      <div className="flex items-center justify-between gap-4 border-b border-hairline bg-canvas/70 px-5 py-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('sent')}
            className={`min-h-11 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
              activeTab === 'sent'
                ? 'border border-primary/20 bg-primary-subtle text-primary'
                : 'text-ink-muted hover:bg-canvas hover:text-ink'
            }`}
          >
            Lời mời đã gửi ({sentInvitations.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('received')}
            className={`min-h-11 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
              activeTab === 'received'
                ? 'border border-primary/20 bg-primary-subtle text-primary'
                : 'text-ink-muted hover:bg-canvas hover:text-ink'
            }`}
          >
            Lời mời đã nhận ({receivedInvitations.length})
          </button>
        </div>
      </div>

      {activeTab === 'sent' && (
        <div className="flex flex-col gap-5 p-5">
          {/* Invite form (for leader only) */}
          {isLeader && !rosterLocked && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-soft">
                  <span className="material-symbols-outlined text-[16px] text-primary" aria-hidden="true">person_add</span>
                  Mời sinh viên vào nhóm
                </h4>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input value={candidateSearch} onChange={(event) => onCandidateSearchChange(event.target.value)}
                  placeholder="Tìm theo MSSV, họ tên hoặc email..." aria-label="Tìm sinh viên để mời"
                  className="min-h-11 min-w-0 rounded-lg border border-line-strong bg-card px-3 py-2 text-sm text-ink focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20" />
                <input value={message} onChange={(event) => setMessage(event.target.value)}
                  placeholder="Lời nhắn đính kèm (không bắt buộc)" aria-label="Lời nhắn đính kèm"
                  className="min-h-11 min-w-0 rounded-lg border border-line-strong bg-card px-3 py-2 text-sm text-ink focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20" />
              </div>
              {candidateError && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-status-error-border bg-status-error-bg p-3 text-xs font-medium text-status-error-text">
                  <p>{candidateError}</p>
                  <button type="button" onClick={onRetryCandidates} disabled={candidateLoading} className="min-h-11 shrink-0 rounded-lg border border-current px-3 py-1.5 font-semibold disabled:opacity-50">Thử lại</button>
                </div>
              )}
              {unfilledMajors.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-semibold text-ink-muted">Còn thiếu:</span>
                  <button type="button" onClick={() => setMajorFilter(null)}
                    className={`min-h-9 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${majorFilter === null ? 'border border-primary/20 bg-primary-subtle text-primary' : 'text-ink-muted hover:bg-canvas hover:text-ink'}`}>
                    Tất cả ngành
                  </button>
                  {unfilledMajors.map((entry) => (
                    <button key={entry.majorId} type="button" onClick={() => setMajorFilter(entry.majorId)}
                      className={`min-h-9 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${majorFilter === entry.majorId ? 'border border-primary/20 bg-primary-subtle text-primary' : 'text-ink-muted hover:bg-canvas hover:text-ink'}`}>
                      {entry.majorName ?? `Ngành #${entry.majorId}`} (còn thiếu {entry.remaining})
                    </button>
                  ))}
                </div>
              )}
              <div className="divide-y divide-hairline">
                {candidateLoading && candidates.items.length === 0 ? (
                  <p className="p-3 text-xs text-ink-muted">Đang tải ứng viên phù hợp...</p>
                ) : visibleCandidates.length === 0 ? (
                  <p className="p-3 text-xs text-ink-muted">{majorFilter == null ? 'Không có sinh viên phù hợp với điều kiện nhóm.' : 'Không có ứng viên ngành này trong trang hiện tại.'}</p>
                ) : visibleCandidates.map((candidate) => (
                  <div key={candidate.userId} className="flex flex-wrap items-center justify-between gap-3 p-3 sm:flex-nowrap">
                    <div className="min-w-0 text-xs">
                      <p className="truncate font-bold text-ink">{candidate.fullName} · {candidate.studentCode ?? candidate.email}</p>
                      <p className="text-ink-muted">{candidate.majorCode} — {candidate.majorName}</p>
                    </div>
                    <button type="button" onClick={() => handleSend(candidate)}
                      disabled={!candidate.canInvite || isMutationPending('invite', candidate.userId)}
                      className="min-h-11 shrink-0 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-primary-hover active:scale-[0.98] disabled:border disabled:border-hairline disabled:bg-canvas disabled:text-ink-muted disabled:shadow-none">
                      {candidate.invitationStatus === 'PENDING' ? 'Đã mời' : isMutationPending('invite', candidate.userId) ? 'Đang gửi...' : 'Gửi lời mời'}
                    </button>
                  </div>
                ))}
              </div>
              {candidates.totalPages > 1 && (
                <div className="border-t border-hairline pt-3">
                  <Pagination
                    page={candidates.page}
                    pages={candidates.totalPages}
                    total={candidates.totalCount}
                    pageSize={candidates.pageSize}
                    busy={candidateLoading}
                    onPage={onCandidatePageChange}
                  />
                </div>
              )}
            </div>
          )}

          {/* Sent invitations list */}
          <div>
            <h5 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Danh sách lời mời của nhóm
            </h5>
            {sentInvitations.length === 0 ? (
              <div className="rounded-lg border border-dashed border-hairline bg-canvas p-6 text-center text-xs text-ink-muted">
                Chưa có lời mời nào được gửi đi.
              </div>
            ) : (
              <>
                <div className="divide-y divide-hairline">
                  {sentPagination.paginatedItems.map((inv) => {
                    const targetUser = inv.invitedUserName || personName(inv.invitedUserId) || 'Sinh viên được mời'
                    const inviterName = inv.invitedByName || personName(inv.invitedBy)

                    return (
                      <div key={inv.id} className="flex flex-wrap items-center justify-between gap-4 p-3.5 hover:bg-canvas sm:flex-nowrap">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-hairline bg-canvas text-xs font-bold text-ink-muted">
                            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">outgoing_mail</span>
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-xs font-bold text-ink">
                              {targetUser}
                            </div>
                            <div className="text-xs text-ink-muted">
                              {inviterName ? `Người mời: ${inviterName} · ` : ''}Gửi lúc: {dateTimeLabel(inv.createdAt)}
                              {inv.expiresAt && ` • Hết hạn: ${dateTimeLabel(inv.expiresAt)}`}
                            </div>
                            {inv.message && (
                              <p className="mt-1 break-words text-xs italic text-ink-muted">
                                {inv.message}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              inv.status === 'PENDING'
                                ? 'border border-status-warning-border bg-status-warning-bg text-status-warning-text'
                                : inv.status === 'ACCEPTED'
                                  ? 'border border-status-success-border bg-status-success-bg text-status-success-text'
                                  : 'border border-status-error-border bg-status-error-bg text-status-error-text'
                            }`}
                          >
                            {statusLabel(inv.status)}
                          </span>

                          {isLeader && inv.status === 'PENDING' && !rosterLocked && (
                            <button
                              type="button"
                              disabled={isMutationPending('cancel', inv.id)}
                              onClick={() => handleCancel(inv.id)}
                              className="min-h-11 rounded-lg px-3 py-1.5 text-xs font-semibold text-status-error-text transition-colors hover:bg-status-error-bg disabled:opacity-50"
                            >
                              {isMutationPending('cancel', inv.id) ? 'Đang hủy...' : 'Hủy lời mời'}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
                {sentPagination.showPagination && (
                  <div className="mt-3 border-t border-hairline pt-3">
                    <Pagination
                      page={sentPagination.page}
                      pages={sentPagination.totalPages}
                      total={sentPagination.total}
                      pageSize={sentPagination.pageSize}
                      onPage={sentPagination.setPage}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'received' && (
        <div className="p-5">
          {receivedInvitations.length === 0 ? (
            <div className="rounded-lg border border-dashed border-hairline bg-canvas p-6 text-center text-xs text-ink-muted">
              Hộp thư rỗng. Bạn chưa nhận được lời mời nào từ các nhóm khác.
            </div>
          ) : (
            <>
              <div className="divide-y divide-hairline">
                {receivedPagination.paginatedItems.map((inv) => {
                  const teamTitle = inv.teamName
                    ? (inv.teamName.startsWith('Nhóm') ? `Lời mời từ ${inv.teamName}` : `Lời mời từ nhóm ${inv.teamName}`)
                    : `Lời mời từ nhóm #${inv.teamId}`
                  const inviterName = inv.invitedByName || personName(inv.invitedBy)

                  return (
                    <div key={inv.id} className="flex flex-wrap items-center justify-between gap-4 p-4 hover:bg-canvas sm:flex-nowrap">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-xs font-bold text-primary">
                          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">groups</span>
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-xs font-bold text-ink">
                            {teamTitle}
                          </div>
                          <div className="text-xs text-ink-muted">
                            {inviterName ? `Người mời: ${inviterName} · ` : ''}Nhận lúc: {dateTimeLabel(inv.createdAt)}
                            {inv.expiresAt && ` • Hết hạn: ${dateTimeLabel(inv.expiresAt)}`}
                          </div>
                          {inv.message && (
                            <p className="mt-1 break-words rounded border border-hairline bg-canvas p-2 text-xs italic text-ink-muted">
                              {inv.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {inv.status === 'PENDING' ? (
                          <>
                            <button
                              type="button"
                              disabled={isMutationPending('accept', inv.id)}
                              onClick={() => handleAccept(inv.id)}
                              className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
                            >
                              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">check</span>
                              {isMutationPending('accept', inv.id) ? 'Đang chấp nhận...' : 'Chấp nhận'}
                            </button>
                            <button
                              type="button"
                              disabled={isMutationPending('reject', inv.id)}
                              onClick={() => handleReject(inv.id)}
                              className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-hairline bg-card px-3.5 py-2 text-xs font-semibold text-status-error-text transition-colors hover:border-status-error-border hover:bg-status-error-bg disabled:opacity-50"
                            >
                              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">close</span>
                              {isMutationPending('reject', inv.id) ? 'Đang từ chối...' : 'Từ chối'}
                            </button>
                          </>
                        ) : (
                          <span className="rounded-full border border-hairline bg-canvas px-2.5 py-1 text-xs font-semibold text-ink-muted">{statusLabel(inv.status)}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              {receivedPagination.showPagination && (
                <div className="mt-3 border-t border-hairline pt-3">
                  <Pagination
                    page={receivedPagination.page}
                    pages={receivedPagination.totalPages}
                    total={receivedPagination.total}
                    pageSize={receivedPagination.pageSize}
                    onPage={receivedPagination.setPage}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
