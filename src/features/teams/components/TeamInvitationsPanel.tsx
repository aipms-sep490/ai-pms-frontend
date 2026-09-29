import { useState } from 'react'
import type { PagedResult, TeamInvitationCandidateDto, TeamInvitationDto } from '../../../types/backend'
import { dateTimeLabel } from '../../execution/execution-utils'

interface TeamInvitationsPanelProps {
  sentInvitations: TeamInvitationDto[]
  memberNames?: Record<number, string>
  receivedInvitations: TeamInvitationDto[]
  isLeader: boolean
  rosterLocked: boolean
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
    <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('sent')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeTab === 'sent'
                ? 'bg-[#edf3f0] text-[#0f5b4e] border border-[#a7f3d0]'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Lời mời đã gửi ({sentInvitations.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('received')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeTab === 'received'
                ? 'bg-[#edf3f0] text-[#0f5b4e] border border-[#a7f3d0]'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Lời mời đã nhận ({receivedInvitations.length})
          </button>
        </div>
      </div>

      {activeTab === 'sent' && (
        <div className="p-5 flex flex-col gap-5">
          {/* Invite form (for leader only) */}
          {isLeader && !rosterLocked && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#0f5b4e]">person_add</span>
                  Mời sinh viên vào nhóm
                </h4>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input value={candidateSearch} onChange={(event) => onCandidateSearchChange(event.target.value)}
                  placeholder="Tìm theo MSSV, họ tên hoặc email..." aria-label="Tìm sinh viên để mời"
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs" />
                <input value={message} onChange={(event) => setMessage(event.target.value)}
                  placeholder="Lời nhắn đính kèm (không bắt buộc)" aria-label="Lời nhắn đính kèm"
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs" />
              </div>
              {candidateError && (
                <div className="flex items-center justify-between gap-2 text-xs font-medium text-rose-700">
                  <p>{candidateError}</p>
                  <button type="button" onClick={onRetryCandidates} disabled={candidateLoading} className="shrink-0 rounded border border-current px-2 py-1 disabled:opacity-50">Thử lại</button>
                </div>
              )}
              <div className="divide-y divide-slate-200">
                {candidateLoading ? (
                  <p className="p-3 text-xs text-slate-500">Đang tải ứng viên phù hợp...</p>
                ) : candidates.items.length === 0 ? (
                  <p className="p-3 text-xs text-slate-500">Không có sinh viên phù hợp với điều kiện nhóm.</p>
                ) : candidates.items.map((candidate) => (
                  <div key={candidate.userId} className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0 text-xs">
                      <p className="truncate font-bold text-slate-900">{candidate.fullName} · {candidate.studentCode ?? candidate.email}</p>
                      <p className="text-slate-500">{candidate.majorCode} — {candidate.majorName}</p>
                    </div>
                    <button type="button" onClick={() => handleSend(candidate)}
                      disabled={!candidate.canInvite || isMutationPending('invite', candidate.userId)}
                      className="shrink-0 rounded-lg bg-[#0f5b4e] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#0a493f] active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-500">
                      {candidate.invitationStatus === 'PENDING' ? 'Đã mời' : isMutationPending('invite', candidate.userId) ? 'Đang gửi...' : 'Gửi lời mời'}
                    </button>
                  </div>
                ))}
              </div>
              {candidates.totalPages > 1 && (
                <div className="flex items-center justify-end gap-2 text-xs text-slate-600">
                  <button type="button" onClick={() => onCandidatePageChange(candidates.page - 1)} disabled={candidates.page <= 1 || candidateLoading}
                    className="rounded border border-slate-200 px-2 py-1 disabled:opacity-50">Trước</button>
                  <span>Trang {candidates.page}/{candidates.totalPages}</span>
                  <button type="button" onClick={() => onCandidatePageChange(candidates.page + 1)} disabled={candidates.page >= candidates.totalPages || candidateLoading}
                    className="rounded border border-slate-200 px-2 py-1 disabled:opacity-50">Sau</button>
                </div>
              )}
            </div>
          )}

          {/* Sent invitations list */}
          <div>
            <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
              Danh sách lời mời của nhóm
            </h5>
            {sentInvitations.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-md">
                Chưa có lời mời nào được gửi đi.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {sentInvitations.map((inv) => (
                  <div key={inv.id} className="p-3.5 flex items-center justify-between gap-4 hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
                        <span className="material-symbols-outlined text-[18px]">outgoing_mail</span>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          {personName(inv.invitedUserId) || 'Sinh viên được mời'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {personName(inv.invitedBy) ? `Người mời: ${personName(inv.invitedBy)} · ` : ''}Gửi lúc: {dateTimeLabel(inv.createdAt)}
                          {inv.expiresAt && ` • Hết hạn: ${new Date(inv.expiresAt).toLocaleDateString('vi-VN')}`}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          inv.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : inv.status === 'ACCEPTED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {statusLabel(inv.status)}
                      </span>

                      {isLeader && inv.status === 'PENDING' && !rosterLocked && (
                        <button
                          type="button"
                          disabled={isMutationPending('cancel', inv.id)}
                          onClick={() => handleCancel(inv.id)}
                          className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-md font-semibold transition-colors disabled:opacity-50"
                        >
                          {isMutationPending('cancel', inv.id) ? 'Đang hủy...' : 'Hủy lời mời'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'received' && (
        <div className="p-5">
          {receivedInvitations.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-md">
              Hộp thư rỗng. Bạn chưa nhận được lời mời nào từ các nhóm khác.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {receivedInvitations.map((inv) => (
                <div key={inv.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#edf3f0] text-[#0f5b4e] flex items-center justify-center font-bold text-xs">
                      <span className="material-symbols-outlined text-[20px]">groups</span>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        Lời mời từ nhóm #{inv.teamId}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {personName(inv.invitedBy) ? `Người mời: ${personName(inv.invitedBy)} · ` : ''}Nhận lúc: {dateTimeLabel(inv.createdAt)}
                        {inv.expiresAt && ` • Hết hạn: ${new Date(inv.expiresAt).toLocaleDateString('vi-VN')}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {inv.status === 'PENDING' ? (
                      <>
                        <button
                          type="button"
                          disabled={isMutationPending('accept', inv.id)}
                          onClick={() => handleAccept(inv.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">check</span>
                          {isMutationPending('accept', inv.id) ? 'Đang chấp nhận...' : 'Chấp nhận'}
                        </button>
                        <button
                          type="button"
                          disabled={isMutationPending('reject', inv.id)}
                          onClick={() => handleReject(inv.id)}
                          className="px-3 py-1.5 border border-slate-200 hover:bg-rose-50 text-rose-600 rounded-md text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                          {isMutationPending('reject', inv.id) ? 'Đang từ chối...' : 'Từ chối'}
                        </button>
                      </>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">{statusLabel(inv.status)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
