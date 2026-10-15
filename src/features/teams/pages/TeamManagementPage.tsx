import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TeamRosterTable } from '../components/TeamRosterTable'
import { TeamInvitationsPanel } from '../components/TeamInvitationsPanel'
import { CreateTeamModal } from '../components/CreateTeamModal'
import { TransferLeaderModal } from '../components/TransferLeaderModal'
import { AcademicScopePanel } from '../components/AcademicScopePanel'
import { StructuredResponsibilitiesPanel } from '../components/StructuredResponsibilitiesPanel'
import { UpdateTeamModal } from '../components/UpdateTeamModal'
import { TeamEligibilitySummary } from '../components/TeamEligibilitySummary'
import { useTeamManagement } from '../hooks/useTeamManagement'
import { StudentQualificationCard } from '../../qualifications/components/StudentQualificationCard'
import { Modal } from '../../../components/ui/Modal'
import { PageLoading } from '../../../components/ui/PageLoading'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { Button } from '../../../components/ui/Button'
import { InlineAlert } from '../../../components/ui/InlineAlert'
import { Toast } from '../../../components/ui/Toast'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import type { BadgeTone } from '../../../components/ui/status-badge-tone'
import { services } from '../../../services/service-gateway'
import { EligibilityHistoryPanel } from '../components/EligibilityHistoryPanel'

function teamStatusTone(status: string): { tone: BadgeTone; label: string } {
  switch (status) {
    case 'ELIGIBLE': return { tone: 'success', label: 'Đủ điều kiện đăng ký' }
    case 'LOCKED': return { tone: 'info', label: 'Đã khóa theo đề tài' }
    default: return { tone: 'neutral', label: 'Đang kiện toàn nhân sự' }
  }
}

export function TeamManagementPage() {
  const navigate = useNavigate()
  const management = useTeamManagement()
  const {
    team, profile, semester, period, workflowContext, isLoading: contextLoading,
    currentUserId, rosterLocked, permissions, sentInvitations, receivedInvitations,
    candidates, leaderChangeRequests, requiresMentorApproval, activeMentor,
    candidateSearch, candidateError, isRefreshing, isLoadingCandidates,
    setCandidateSearch, setCandidatePage, retryCandidates, isMutationPending, error, retry,
    createTeam, updateTeam, inviteMember, cancelInvitation, acceptInvitation, rejectInvitation,
    removeMember, transferLeader, leaveTeam,
    refreshEligibility,
  } = management
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const organizationId = workflowContext?.academic.organization?.id ?? team?.members.find(member => member.organizationId)?.organizationId
  const [majorNames, setMajorNames] = useState<Record<number, string>>({})
  useEffect(() => {
    let current = true
    setMajorNames({})
    if (organizationId) services.academic.getMajors(organizationId).then(majors => { if (current) setMajorNames(Object.fromEntries(majors.map(major => [major.id, major.name]))) }).catch(() => {})
    return () => { current = false }
  }, [organizationId])

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false)

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 4000)
  }

  const maxTeamSize = team?.academicScope?.requirements.reduce((sum, requirement) => sum + requirement.maxMembers, 0)
    || period?.maxTeamSize || 5

  // Presentation-only grouping hint for the invite candidate list; the server's
  // eligibility reasons (MAJOR_MIN_MEMBERS:<majorId>) remain the authority on PASS/FAIL.
  const unfilledMajors = team?.academicScope?.projectMode === 'INTERDISCIPLINARY'
    ? team.academicScope.requirements
      .map((requirement) => ({
        majorId: requirement.majorId,
        majorName: majorNames[requirement.majorId],
        remaining: requirement.minMembers - team.members.filter((member) => member.majorId === requirement.majorId).length,
      }))
      .filter((entry) => entry.remaining > 0)
    : []

  // Actions
  const handleCreateTeam = async (data: { code: string; name: string; description?: string }) => {
    await createTeam(data)
    showToast('Tạo nhóm đồ án thành công!')
  }

  const handleUpdateTeam = async (data: { name: string; description?: string }) => {
    await updateTeam(data)
    showToast('Đã cập nhật thông tin nhóm.')
  }

  const handleRefreshEligibility = async () => {
    await refreshEligibility()
    showToast('Đã cập nhật điều kiện đăng ký của nhóm.')
  }

  const handleSendInvitation = async (invitedUserId: number, message?: string) => {
    await inviteMember(invitedUserId, message)
    showToast('Đã gửi lời mời thành công!')
  }

  const handleCancelInvitation = async (invitationId: number) => {
    await cancelInvitation(invitationId)
    showToast('Đã hủy lời mời.')
  }

  const handleAcceptInvitation = async (invitationId: number) => {
    await acceptInvitation(invitationId)
    showToast('Gia nhập nhóm thành công!')
  }

  const handleRejectInvitation = async (invitationId: number) => {
    await rejectInvitation(invitationId)
    showToast('Đã từ chối lời mời.')
  }

  const handleRemoveMember = async (userId: number) => {
    await removeMember(userId)
    showToast('Đã xóa thành viên khỏi nhóm.')
  }

  const handleTransferLeader = async (newLeaderUserId: number, message?: string) => {
    await transferLeader(newLeaderUserId, message)
    showToast(
      requiresMentorApproval
        ? 'Đã gửi yêu cầu đổi trưởng nhóm tới giảng viên hướng dẫn. Trưởng nhóm hiện tại vẫn giữ quyền cho đến khi yêu cầu được chấp thuận.'
        : 'Đã bàn giao quyền Trưởng nhóm thành công!',
    )
  }

  const handleLeaveTeam = async () => {
    try {
      await leaveTeam()
      setIsLeaveConfirmOpen(false)
      showToast('Bạn đã rời khỏi nhóm.')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Rời nhóm thất bại.', 'error')
    }
  }

  if (contextLoading) {
    return <PageLoading />
  }

  const headerDescription = (
    <>
      Học kỳ: <span className="font-semibold text-ink-soft">{semester?.name ?? 'Chưa xác định'}</span> • Sinh viên:{' '}
      <span className="font-semibold text-ink-soft">{profile?.fullName ?? 'Sinh viên'}</span>{profile?.studentCode ? ` (${profile.studentCode})` : ''}
    </>
  )
  const headerAction = (
    <>
      {!team && permissions.canCreateTeam && (
        <Button icon="add_circle" onClick={() => setIsCreateModalOpen(true)}>Thành lập Nhóm Mới</Button>
      )}
      {team && permissions.canLeave && (
        <Button variant="outline" icon="logout" onClick={() => setIsLeaveConfirmOpen(true)}>Rời nhóm</Button>
      )}
    </>
  )

  return (
    <WorkspacePage title="Thành viên nhóm" description={headerDescription} action={headerAction} className="flex flex-col gap-6">
      {toastMessage && <Toast message={toastMessage.text} tone={toastMessage.type} />}

      {error && (
        <InlineAlert tone={error.kind === 'conflict' ? 'warning' : 'danger'} onRetry={error.kind !== 'authentication' ? () => void retry() : undefined} retryPending={isRefreshing}>
          {error.message}
        </InlineAlert>
      )}

      {!rosterLocked && <StudentQualificationCard key={currentUserId} onSubmitted={management.refreshAll} />}

      {/* When Student Has NO TEAM */}
      {!team ? (
        <div className="flex flex-col gap-6">
          <div className="bg-card border border-hairline rounded-md p-8 text-center flex flex-col items-center gap-4 ">
            <div className="w-16 h-16 rounded-md bg-primary-subtle text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[36px]">group_add</span>
            </div>
            <div className="max-w-md">
              <h3 className="text-lg font-bold text-ink">Bạn chưa tham gia nhóm đồ án nào</h3>
              <p className="text-xs text-ink-muted mt-1.5 leading-relaxed">
                Để đăng ký đề tài đồ án tốt nghiệp, bạn cần thành lập một nhóm mới hoặc chấp nhận lời mời tham gia từ các nhóm khác.
              </p>
            </div>
            <Button icon="add" onClick={() => setIsCreateModalOpen(true)}>Bắt đầu tạo nhóm ngay</Button>
          </div>

          {/* Received invitations box */}
          <TeamInvitationsPanel
            sentInvitations={[]}
            receivedInvitations={receivedInvitations}
            isLeader={false}
            rosterLocked={false}
            candidates={candidates}
            candidateSearch={candidateSearch}
            candidateLoading={isLoadingCandidates}
            candidateError={candidateError?.message}
            onCandidateSearchChange={setCandidateSearch}
            onCandidatePageChange={setCandidatePage}
            onRetryCandidates={() => void retryCandidates()}
            isMutationPending={isMutationPending}
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
          <div className="bg-card border border-hairline rounded-md p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 ">
            <div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold bg-primary-subtle text-primary border border-status-success-border px-2.5 py-0.5 rounded-lg">
                  {team.code}
                </span>
                <h2 className="text-lg font-bold text-ink">{team.name}</h2>
                <StatusBadge {...teamStatusTone(team.status)} />
              </div>
              {team.description && (
                <p className="text-xs text-ink-muted mt-1.5 max-w-2xl">{team.description}</p>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {permissions.canEditTeam && (
                <Button variant="outline" size="sm" onClick={() => setIsUpdateModalOpen(true)}>Chỉnh sửa nhóm</Button>
              )}
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Sĩ số nhóm</span>
                <span className="text-sm font-bold text-ink-soft">
              {team.members.length} / {maxTeamSize} thành viên
                </span>
              </div>
            </div>
          </div>

          {!rosterLocked && <TeamEligibilitySummary
            team={team}
            majorNames={majorNames}
            canRefresh={permissions.canRefreshEligibility}
            refreshPending={isMutationPending('refresh-eligibility', team.id)}
            canContinueToRegistration={team.eligibility.canRegister && permissions.canCreateProjectDraft}
            onRefresh={handleRefreshEligibility}
            onContinueToRegistration={() => navigate('/project/register')}
          />}

          <EligibilityHistoryPanel teamId={team.id} canCheck={permissions.canRefreshEligibility} canLock={!rosterLocked && team.status === 'ELIGIBLE' && team.members.some(member => member.isLeader && member.userId === currentUserId)} onChanged={() => { retry() }} />
          {!rosterLocked && <AcademicScopePanel
            
            teamId={team.id}
            period={period}
            workflowContext={workflowContext}
            scope={team.academicScope}
            canConfigure={permissions.canConfigureScope}
            onSaved={retry}
            fallbackOrganizationId={team.members.find((member) => member.userId === currentUserId)?.organizationId}
            fallbackMajorId={profile?.majorId}
          />}
          {!rosterLocked && team.academicScope && <StructuredResponsibilitiesPanel teamId={team.id} scope={team.academicScope} onSaved={retry} />}

          {rosterLocked && <p className="text-sm text-ink-muted">Danh sách thành viên đã được chốt theo hồ sơ đồ án.</p>}

          {leaderChangeRequests.some((request) => request.status === 'PENDING') && (
            <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
              <div className="flex items-center gap-2 font-bold">
                <span className="material-symbols-outlined text-[18px]">hourglass_top</span>
                Yêu cầu đổi trưởng nhóm đang chờ người phụ trách duyệt
              </div>
              {leaderChangeRequests.filter((request) => request.status === 'PENDING').map((request) => {
                const target = team.members.find((member) => member.userId === request.newLeaderUserId)
                return (
                  <p key={request.id} className="mt-2">
                    {target?.fullName ?? 'Thành viên #' + request.newLeaderUserId}
                    {' · Mentor: ' + request.mentorName}
                    {' · gửi lúc ' + new Date(request.requestedAt).toLocaleString('vi-VN')}
                  </p>
                )
              })}
            </section>
          )}

          {/* Roster Table */}
          <TeamRosterTable
            members={team.members}
            currentUserId={currentUserId}
            currentUserStudentCode={profile?.studentCode ?? undefined}
            majorNames={majorNames}
            isLeader={permissions.canManageRoster}
            rosterLocked={rosterLocked}
            onRemoveMember={handleRemoveMember}
            onOpenTransferLeader={() => setIsTransferModalOpen(true)}
          />

          {/* Invitations Panel */}
          {(!rosterLocked || sentInvitations.length > 0 || receivedInvitations.length > 0) && <TeamInvitationsPanel
            sentInvitations={sentInvitations}
            memberNames={Object.fromEntries(team.members.map(member => [member.userId, member.fullName]))}
            receivedInvitations={receivedInvitations}
            isLeader={permissions.canInvite}
            rosterLocked={rosterLocked}
            unfilledMajors={unfilledMajors}
            candidates={candidates}
            candidateSearch={candidateSearch}
            candidateLoading={isLoadingCandidates}
            candidateError={candidateError?.message}
            onCandidateSearchChange={setCandidateSearch}
            onCandidatePageChange={setCandidatePage}
            onRetryCandidates={() => void retryCandidates()}
            isMutationPending={isMutationPending}
            onSendInvitation={handleSendInvitation}
            onCancelInvitation={handleCancelInvitation}
            onAcceptInvitation={handleAcceptInvitation}
            onRejectInvitation={handleRejectInvitation}
          />}
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
        <UpdateTeamModal
          isOpen={isUpdateModalOpen}
          team={team}
          onClose={() => setIsUpdateModalOpen(false)}
          onSubmit={handleUpdateTeam}
          isPending={isMutationPending('update', team.id)}
        />
      )}

      {team && (
        <TransferLeaderModal
          isOpen={isTransferModalOpen}
          members={team.members}
          currentUserId={currentUserId}
          requiresMentorApproval={requiresMentorApproval}
          mentorName={activeMentor?.supervisorName ?? null}
          onClose={() => setIsTransferModalOpen(false)}
          onSubmit={handleTransferLeader}
        />
      )}

      {/* Leave Team Confirmation Dialog */}
      {isLeaveConfirmOpen && (
        <Modal open title="Rời khỏi nhóm đồ án?" description={`Bạn sẽ không còn là thành viên của nhóm ${team?.name ?? ''}. Trưởng nhóm cần bàn giao trước khi rời nhóm.`} busy={isMutationPending('leave', team?.id)} onClose={() => setIsLeaveConfirmOpen(false)}>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsLeaveConfirmOpen(false)}
                disabled={isMutationPending('leave', team?.id)}
                className="app-modal__button"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleLeaveTeam}
                disabled={isMutationPending('leave', team?.id)}
                className="app-modal__button app-modal__button--danger"
              >
                {isMutationPending('leave', team?.id) ? 'Đang xử lý...' : 'Xác nhận rời nhóm'}
              </button>
            </div>
        </Modal>
      )}
    </WorkspacePage>
  )
}

