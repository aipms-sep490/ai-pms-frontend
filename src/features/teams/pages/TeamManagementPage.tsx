import { useState, useEffect, useCallback } from 'react'
import { useStudentJourney } from '../../../app/context'
import { services } from '../../../services/service-gateway'
import { isActionAllowed, type TeamInvitationDto } from '../../../types/backend'
import { env } from '../../../app/config/env'
import { EligibilityBanner } from '../components/EligibilityBanner'
import { TeamRosterTable } from '../components/TeamRosterTable'
import { TeamInvitationsPanel } from '../components/TeamInvitationsPanel'
import { CreateTeamModal } from '../components/CreateTeamModal'
import { TransferLeaderModal } from '../components/TransferLeaderModal'
import { AcademicScopePanel } from '../components/AcademicScopePanel'

export function TeamManagementPage() {
  const { team, profile, semester, period, workflowContext, teamActions, refreshAll, isLoading: contextLoading } = useStudentJourney()

  const [sentInvitations, setSentInvitations] = useState<TeamInvitationDto[]>([])
  const [receivedInvitations, setReceivedInvitations] = useState<TeamInvitationDto[]>([])
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 4000)
  }

  const currentUserId = profile?.id ?? 0
  const isLeader = Boolean(team?.members.some((m) => m.userId === currentUserId && m.isLeader))
  const rosterLocked = team?.eligibility?.rosterLocked ?? false
  const actionAllowed = (code: string, mockFallback: boolean) =>
    env.isMockMode ? mockFallback : isActionAllowed(teamActions?.actions ?? workflowContext?.actions ?? [], code)
  const canCreateTeam = actionAllowed('create_team', !team)
  const canInvite = actionAllowed('invite_member', isLeader && !rosterLocked)
  const canManageRoster = actionAllowed('remove_member', isLeader && !rosterLocked)
  const canConfigureScope = actionAllowed('configure_academic_scope', isLeader && !rosterLocked)
  const canLeave = actionAllowed('leave_team', !isLeader && !rosterLocked)
  const maxTeamSize = team?.academicScope?.requirements.reduce((sum, requirement) => sum + requirement.maxMembers, 0)
    || period?.maxTeamSize || 5

  const loadInvitations = useCallback(async () => {
    try {
      if (team) {
        const sent = await services.team.getInvitations(team.id)
        setSentInvitations(sent.items)
      } else {
        setSentInvitations([])
      }
      // Load invitations received by student
      const received = await services.team.getInvitations()
      setReceivedInvitations(received.items.filter((i) => i.invitedUserId === currentUserId && i.status === 'PENDING'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể tải lời mời nhóm.', 'error')
    }
  }, [team, currentUserId])

  useEffect(() => {
    loadInvitations()
  }, [loadInvitations])

  // Actions
  const handleCreateTeam = async (data: { code: string; name: string; description?: string }) => {
    if (!semester) return
    await services.team.createTeam({
      academicSemesterId: semester.id,
      code: data.code,
      name: data.name,
      description: data.description,
    })
    await refreshAll()
    await loadInvitations()
    showToast('Tạo nhóm đồ án thành công!')
  }

  const handleRefreshEligibility = async () => {
    if (!team) return
    await services.team.refreshEligibility(team.id)
    await refreshAll()
    showToast('Đã cập nhật trạng thái thẩm định điều kiện.')
  }

  const handleSendInvitation = async (invitedUserId: number, message?: string) => {
    if (!team) return
    await services.team.inviteMember(team.id, { invitedUserId, message })
    await loadInvitations()
    showToast('Đã gửi lời mời thành công!')
  }

  const handleCancelInvitation = async (invitationId: number) => {
    await services.team.cancelInvitation(invitationId)
    await loadInvitations()
    showToast('Đã hủy lời mời.')
  }

  const handleAcceptInvitation = async (invitationId: number) => {
    await services.team.acceptInvitation(invitationId)
    await refreshAll()
    await loadInvitations()
    showToast('Gia nhập nhóm thành công!')
  }

  const handleRejectInvitation = async (invitationId: number) => {
    await services.team.rejectInvitation(invitationId)
    await loadInvitations()
    showToast('Đã từ chối lời mời.')
  }

  const handleRemoveMember = async (userId: number) => {
    if (!team) return
    await services.team.removeMember(team.id, userId)
    await refreshAll()
    await loadInvitations()
    showToast('Đã xóa thành viên khỏi nhóm.')
  }

  const handleTransferLeader = async (newLeaderUserId: number) => {
    if (!team) return
    await services.team.transferLeader(team.id, newLeaderUserId)
    await refreshAll()
    showToast('Đã bàn giao quyền Trưởng nhóm thành công!')
  }

  const handleLeaveTeam = async () => {
    if (!team) return
    setIsLeaving(true)
    try {
      await services.team.leaveTeam(team.id)
      setIsLeaveConfirmOpen(false)
      await refreshAll()
      await loadInvitations()
      showToast('Bạn đã rời khỏi nhóm.')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Rời nhóm thất bại.', 'error')
    } finally {
      setIsLeaving(false)
    }
  }

  if (contextLoading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse p-6">
        <div className="h-10 bg-slate-200 rounded-xl w-1/3" />
        <div className="h-24 bg-slate-200 rounded-2xl w-full" />
        <div className="h-64 bg-slate-200 rounded-2xl w-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-12">
      {/* Toast Feedback */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-bottom-5 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-700'
              : 'bg-rose-600 text-white border-rose-700'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {toastMessage.type === 'success' ? 'check_circle' : 'error'}
          </span>
          {toastMessage.text}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Quản lý Nhóm Đồ án</h1>
          <p className="text-sm text-slate-500 mt-1">
            Học kỳ: <span className="font-semibold text-slate-700">{semester?.name ?? 'Chưa xác định'}</span> • Sinh viên:{' '}
            <span className="font-semibold text-slate-700">{profile?.fullName ?? 'Sinh viên'}</span>{profile?.studentCode ? ` (${profile.studentCode})` : (profile?.id ? ` (ID #${profile.id})` : '')}
          </p>
        </div>

        {!team && canCreateTeam && (
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            Thành lập Nhóm Mới
          </button>
        )}

        {team && (
          <div className="flex items-center gap-2">
            {canLeave && (
              <button
                type="button"
                onClick={() => setIsLeaveConfirmOpen(true)}
                className="px-3.5 py-2 border border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-600 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                Rời nhóm
              </button>
            )}
          </div>
        )}
      </div>

      {/* When Student Has NO TEAM */}
      {!team ? (
        <div className="flex flex-col gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center flex flex-col items-center gap-4 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[36px]">group_add</span>
            </div>
            <div className="max-w-md">
              <h3 className="text-lg font-bold text-slate-900">Bạn chưa tham gia nhóm đồ án nào</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Để đăng ký đề tài đồ án tốt nghiệp, bạn cần thành lập một nhóm mới hoặc chấp nhận lời mời tham gia từ các nhóm khác.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Bắt đầu tạo nhóm ngay
            </button>
          </div>

          {/* Received invitations box */}
          <TeamInvitationsPanel
            sentInvitations={[]}
            receivedInvitations={receivedInvitations}
            isLeader={false}
            rosterLocked={false}
            onSendInvitation={async () => {}}
            onCancelInvitation={async () => {}}
            onAcceptInvitation={handleAcceptInvitation}
            onRejectInvitation={handleRejectInvitation}
          />
        </div>
      ) : (
        /* When Student HAS A TEAM */
        <div className="flex flex-col gap-6">
          {/* Team Overview Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
            <div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-lg">
                  {team.code}
                </span>
                <h2 className="text-lg font-bold text-slate-900">{team.name}</h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                  {team.status === 'ELIGIBLE' ? 'Đủ điều kiện đăng ký' : 'Đang kiện toàn nhân sự'}
                </span>
              </div>
              {team.description && (
                <p className="text-xs text-slate-500 mt-1.5 max-w-2xl">{team.description}</p>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block">Sĩ số nhóm</span>
                <span className="text-sm font-bold text-slate-800">
              {team.members.length} / {maxTeamSize} thành viên
                </span>
              </div>
            </div>
          </div>

          {/* Eligibility Banner */}
          <EligibilityBanner
            eligibility={team.eligibility}
            onRefresh={handleRefreshEligibility}
          />

          <AcademicScopePanel
            teamId={team.id}
            period={period}
            workflowContext={workflowContext}
            scope={team.academicScope}
            canConfigure={canConfigureScope}
            onSaved={refreshAll}
            fallbackOrganizationId={team.members.find((member) => member.userId === currentUserId)?.organizationId}
            fallbackMajorId={profile?.majorId}
          />

          {/* Roster Table */}
          <TeamRosterTable
            members={team.members}
            currentUserId={currentUserId}
            currentUserStudentCode={profile?.studentCode ?? undefined}
            isLeader={canManageRoster}
            rosterLocked={rosterLocked}
            onRemoveMember={handleRemoveMember}
            onOpenTransferLeader={() => setIsTransferModalOpen(true)}
          />

          {/* Invitations Panel */}
          <TeamInvitationsPanel
            sentInvitations={sentInvitations}
            receivedInvitations={receivedInvitations}
            isLeader={canInvite}
            rosterLocked={rosterLocked}
            teamId={team.id}
            onSendInvitation={handleSendInvitation}
            onCancelInvitation={handleCancelInvitation}
            onAcceptInvitation={handleAcceptInvitation}
            onRejectInvitation={handleRejectInvitation}
          />
        </div>
      )}

      {/* Modals */}
      <CreateTeamModal
        isOpen={isCreateModalOpen}
        semesterName={semester?.name ?? 'Học kỳ hiện tại'}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateTeam}
      />

      {team && (
        <TransferLeaderModal
          isOpen={isTransferModalOpen}
          members={team.members}
          currentUserId={currentUserId}
          onClose={() => setIsTransferModalOpen(false)}
          onSubmit={handleTransferLeader}
        />
      )}

      {/* Leave Team Confirmation Dialog */}
      {isLeaveConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 flex flex-col gap-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">warning</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Rời khỏi nhóm đồ án?</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Bạn sẽ không còn là thành viên của nhóm {team?.name}. Nếu bạn là Trưởng nhóm duy nhất, quyền điều hành sẽ được tự động chuyển giao.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsLeaveConfirmOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleLeaveTeam}
                disabled={isLeaving}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
              >
                {isLeaving ? 'Đang xử lý...' : 'Xác nhận rời nhóm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
