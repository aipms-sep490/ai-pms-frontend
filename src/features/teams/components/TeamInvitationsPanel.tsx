import { useState } from 'react'
import type { PagedResult, TeamInvitationCandidateDto, TeamInvitationDto } from '../../../types/backend'

interface TeamInvitationsPanelProps {
  sentInvitations: TeamInvitationDto[]
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
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('sent')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'sent'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Lời mời đã gửi ({sentInvitations.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('received')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'received'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Hộp thư lời mời nhận được ({receivedInvitations.length})
          </button>
        </div>
      </div>

      {activeTab === 'sent' && (
        <div className="p-5 flex flex-col gap-5">
          {/* Invite form (for leader only) */}
          {isLeader && !rosterLocked && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-blue-600">person_add</span>
                  Mời sinh viên vào nhóm
                </h4>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">API BACKEND</span>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input value={candidateSearch} onChange={(event) => onCandidateSearchChange(event.target.value)}
                  placeholder="Tìm theo MSSV, họ tên hoặc email..."
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs" />
                <input value={message} onChange={(event) => setMessage(event.target.value)}
                  placeholder="Lời nhắn đính kèm (không bắt buộc)"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs" />
              </div>
              {candidateError && (
                <div className="flex items-center justify-between gap-2 text-xs font-medium text-rose-700">
                  <p>{candidateError}</p>
                  <button type="button" onClick={onRetryCandidates} disabled={candidateLoading} className="shrink-0 rounded border border-current px-2 py-1 disabled:opacity-50">Thử lại</button>
                </div>
              )}
              <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
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
                      className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white disabled:bg-slate-300">
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
              <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                Chưa có lời mời nào được gửi đi.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {sentInvitations.map((inv) => (
                  <div key={inv.id} className="p-3.5 flex items-center justify-between gap-4 hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
                        <span className="material-symbols-outlined text-[18px]">outgoing_mail</span>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          Sinh viên (User ID #{inv.invitedUserId})
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Người mời: User ID #{inv.invitedBy} • Gửi lúc: {new Date(inv.createdAt).toLocaleString('vi-VN')}
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
                        {inv.status === 'PENDING'
                          ? 'Đang chờ phản hồi'
                          : inv.status === 'ACCEPTED'
                            ? 'Đã chấp thuận'
                            : 'Đã từ chối'}
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
            <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
              Hộp thư rỗng. Bạn chưa nhận được lời mời nào từ các nhóm khác.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {receivedInvitations.map((inv) => (
                <div key={inv.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                      <span className="material-symbols-outlined text-[20px]">groups</span>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        Lời mời gia nhập Nhóm #{inv.teamId}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Người mời: User ID #{inv.invitedBy} • Nhận lúc: {new Date(inv.createdAt).toLocaleString('vi-VN')}
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
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">check</span>
                          {isMutationPending('accept', inv.id) ? 'Đang chấp nhận...' : 'Chấp nhận'}
                        </button>
                        <button
                          type="button"
                          disabled={isMutationPending('reject', inv.id)}
                          onClick={() => handleReject(inv.id)}
                          className="px-3 py-1.5 border border-slate-200 hover:bg-rose-50 text-rose-600 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                          {isMutationPending('reject', inv.id) ? 'Đang từ chối...' : 'Từ chối'}
                        </button>
                      </>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">{inv.status === 'ACCEPTED' ? 'Đã chấp nhận' : 'Đã từ chối'}</span>
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
