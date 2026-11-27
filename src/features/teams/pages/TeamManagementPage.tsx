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
import { StatTileRow, WorkspaceTabs } from '../../../components/ui'
import { services } from '../../../services/service-gateway'
import { EligibilityHistoryPanel } from '../components/EligibilityHistoryPanel'
import { humanizeHttpError } from '../../../services/http/humanize-http-error'
import { TeamSkillGapPanel } from '../../ai-suite/TeamAgreementAiPanels'

export function TeamManagementPage() {
  const navigate = useNavigate()
  const management = useTeamManagement()
  const {
    team, project, profile, semester, period, workflowContext, isLoading: contextLoading,
    currentUserId, isLeader: hookIsLeader, rosterLocked, permissions, sentInvitations, sentInvitationError, receivedInvitations,
    candidates, leaderChangeRequests, requiresMentorApproval, activeMentor,
    candidateSearch, candidateError, isRefreshing, isLoadingCandidates,
    setCandidateSearch, setCandidatePage, retryCandidates, isMutationPending, error, retry,
    createTeam, updateTeam, inviteMember, cancelInvitation, acceptInvitation, rejectInvitation,
    removeMember, transferLeader, leaveTeam, disbandTeam, cancelLeaderChange,
    refreshEligibility,
  } = management
  const isLeader = Boolean(hookIsLeader ?? team?.members.some(m => m.userId === currentUserId && m.isLeader))
  const hasNonRejectedProject = Boolean(project && project.status !== 'REJECTED')
  const canDisbandTeam = Boolean(
    team
    && isLeader
    && team.members.length === 1
    && !rosterLocked
    && !hasNonRejectedProject
    && team.status !== 'DISBANDED',
  )
  const canTransferLeader = Boolean(
    team
    && isLeader
    && team.members.length > 1
    && team.status !== 'DISBANDED'
    && project?.status !== 'COMPLETED'
    && project?.status !== 'ARCHIVED',
  )
  const isN1ClosedReadOnly = Boolean(
    team
    && team.status === 'FORMING'
    && team.eligibility.reasons.includes('REGISTRATION_WINDOW_UNAVAILABLE'),
  )
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const organizationId = workflowContext?.academic.organization?.id ?? team?.members.find(member => member.organizationId)?.organizationId
  const [majorNames, setMajorNames] = useState<Record<number, string>>({})
  const [academicMajors, setAcademicMajors] = useState<Array<{ id: number; name: string; departmentId?: number | null }>>([])
  useEffect(() => {
    let current = true
    setMajorNames({})
    if (organizationId) services.academic.getMajors(organizationId).then(majors => { if (current) { setAcademicMajors(majors); setMajorNames(Object.fromEntries(majors.map(major => [major.id, major.name]))) } }).catch(() => {})
    return () => { current = false }
  }, [organizationId])

  // Modals & Tabs
  const [activeTab, setActiveTab] = useState<'roster' | 'invitations' | 'eligibility' | 'ai'>('roster')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false)
  const [isDisbandConfirmOpen, setIsDisbandConfirmOpen] = useState(false)

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 4000)
  }

  const majorCapacity = team?.academicScope?.requirements.reduce((sum, requirement) => sum + requirement.maxMembers, 0)
  const maxTeamSize = period?.maxTeamSize
    ? Math.min(period.maxTeamSize, majorCapacity || period.maxTeamSize)
    : null

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
  const handleCreateTeam = async (data: Parameters<typeof createTeam>[0]) => {
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
      showToast(humanizeHttpError(err, 'Rời nhóm thất bại.'), 'error')
    }
  }

  const handleDisbandTeam = async () => {
    if (!disbandTeam) return
    try {
      await disbandTeam()
      setIsDisbandConfirmOpen(false)
      showToast('Đã giải tán nhóm thành công.')
    } catch (err) {
      showToast(humanizeHttpError(err, 'Giải tán nhóm thất bại.'), 'error')
    }
  }

  const handleCancelLeaderChange = async (requestId: number) => {
    if (!cancelLeaderChange) return
    try {
      await cancelLeaderChange(requestId)
      showToast('Đã hủy yêu cầu đổi Trưởng nhóm.')
    } catch (err) {
      showToast(humanizeHttpError(err, 'Không thể hủy yêu cầu đổi Trưởng nhóm.'), 'error')
    }
  }

  if (contextLoading) {
    return <PageLoading />
  }

  const showInvitationsTab = !rosterLocked || sentInvitations.length > 0 || receivedInvitations.length > 0
  const pendingInviteCount = sentInvitations.filter(i => i.status === 'PENDING').length + receivedInvitations.filter(i => i.status === 'PENDING').length
  const effectiveTab = activeTab === 'invitations' && !showInvitationsTab ? 'roster' : activeTab

  return (
    <WorkspacePage
      size="wide"
      className="space-y-5"
      title="Thành viên nhóm"
      eyebrow="Khởi tạo và quản trị nhóm"
      description={`Học kỳ: ${semester?.name ?? 'Chưa xác định'} • Sinh viên: ${profile?.fullName ?? 'Sinh viên'}${profile?.studentCode ? ` (${profile.studentCode})` : ''}`}
      action={
        <>
          {!team && permissions.canCreateTeam && (
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-primary transition-colors hover:bg-primary-hover"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">add_circle</span>
              Thành lập Nhóm Mới
            </button>
          )}
          {team && permissions.canEditTeam && (
            <button type="button" onClick={() => setIsUpdateModalOpen(true)} className="inline-flex min-h-11 items-center rounded-lg border border-hairline bg-card px-3.5 py-2 text-xs font-semibold text-ink-soft transition-colors hover:border-primary hover:bg-primary-subtle hover:text-primary">
              Chỉnh sửa nhóm
            </button>
          )}
          {team && canDisbandTeam && (
            <button
              type="button"
              onClick={() => setIsDisbandConfirmOpen(true)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-status-error-border bg-card px-3.5 py-2 text-xs font-semibold text-status-error-text transition-colors hover:bg-status-error-bg"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">delete_forever</span>
              Giải tán nhóm
            </button>
          )}
          {team && permissions.canLeave && (
            <button
              type="button"
              onClick={() => setIsLeaveConfirmOpen(true)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-hairline bg-card px-3.5 py-2 text-xs font-semibold text-ink-muted transition-colors hover:border-status-error-border hover:bg-status-error-bg hover:text-status-error-text"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">logout</span>
              Rời nhóm
            </button>
          )}
        </>
      }
    >
      {/* Toast Feedback */}
      {toastMessage && (
        <div
          role={toastMessage.type === 'error' ? 'alert' : 'status'}
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-[min(92vw,480px)] px-4 py-3 rounded-lg border shadow-lg flex items-center gap-2.5 text-xs font-semibold ${
            toastMessage.type === 'success'
              ? 'bg-primary text-white border-primary-hover'
              : 'bg-status-error-text text-white border-status-error-text'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {toastMessage.type === 'success' ? 'check_circle' : 'error'}
          </span>
          {toastMessage.text}
        </div>
      )}

      {error && (
        <div role="alert" className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 text-xs ${
          error.kind === 'conflict' ? 'border-status-warning-border bg-status-warning-bg text-status-warning-text' : 'border-status-error-border bg-status-error-bg text-status-error-text'
        }`}>
          <p>{error.message}</p>
          {error.kind !== 'authentication' && (
            <button type="button" onClick={() => void retry()} disabled={isRefreshing} className="min-h-11 shrink-0 rounded-lg border border-current px-3.5 py-2 font-semibold disabled:opacity-50">
              {isRefreshing ? 'Đang tải lại...' : 'Tải lại'}
            </button>
          )}
        </div>
      )}

      {sentInvitationError && (
        <div role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">
          Chưa tải được lời mời đã gửi. {sentInvitationError.message}{' '}
          <button type="button" onClick={() => void retry()} disabled={isRefreshing} className="font-semibold underline disabled:opacity-50">Tải lại</button>
        </div>
      )}

      {/* When Student Has NO TEAM */}
      {!team ? (
        <div className="flex flex-col gap-5">
          {!rosterLocked && <StudentQualificationCard key={currentUserId} onSubmitted={management.refreshAll} />}
          <div className="flex flex-col items-center gap-4 rounded-xl border border-hairline bg-card p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary-subtle text-primary">
              <span className="material-symbols-outlined text-[36px]" aria-hidden="true">group_add</span>
            </div>
            <div className="max-w-md">
              <h3 className="text-lg font-bold text-ink">Bạn chưa tham gia nhóm đồ án nào</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
                Để đăng ký đề tài đồ án tốt nghiệp, bạn cần thành lập một nhóm mới hoặc chấp nhận lời mời tham gia từ các nhóm khác.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-primary transition-colors hover:bg-primary-hover"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>
              Bắt đầu tạo nhóm ngay
            </button>
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
        <div className="flex flex-col gap-5">
          {/* Compact Team Identity Bar (metrics live in StatTileRow below to avoid duplication) */}
          <div className="flex flex-col justify-between gap-3 rounded-xl border border-hairline bg-card px-5 py-4 shadow-xs md:flex-row md:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="rounded-lg border border-primary/20 bg-primary-subtle px-2.5 py-0.5 font-mono text-xs font-bold text-primary">
                  {team.code}
                </span>
                <h2 className="text-lg font-bold text-ink">{team.name}</h2>
              </div>
              {team.description && (
                <p className="mt-1 max-w-3xl text-xs text-ink-muted">{team.description}</p>
              )}
              {rosterLocked && <p className="mt-1 text-xs text-ink-muted">Danh sách thành viên đã được chốt theo hồ sơ đồ án.</p>}
              {isN1ClosedReadOnly && (
                <p role="status" className="mt-1 text-xs font-medium text-status-warning-text">
                  Hết hạn đăng ký (N1) — Nhóm đang ở chế độ chỉ đọc; liên hệ Khoa nếu cần hỗ trợ ngoại lệ.
                </p>
              )}
            </div>

            {!rosterLocked && team.eligibility.canRegister && permissions.canCreateProjectDraft && (
              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/project/register')}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-bold text-white transition-colors hover:bg-primary-hover"
                >
                  Đăng ký đề tài
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_forward</span>
                </button>
              </div>
            )}
          </div>

          {leaderChangeRequests.some((request) => request.status === 'PENDING') && (
            <section className="rounded-xl border border-status-warning-border bg-status-warning-bg p-4 text-xs text-status-warning-text">
              <div className="flex items-center gap-2 font-bold">
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">hourglass_top</span>
                Yêu cầu đổi trưởng nhóm đang chờ người phụ trách duyệt
              </div>
              {leaderChangeRequests.filter((request) => request.status === 'PENDING').map((request) => {
                const target = team.members.find((member) => member.userId === request.newLeaderUserId)
                const approverLabel = request.mentorName ? `GVHD: ${request.mentorName}` : 'Khoa chủ trì'
                return (
                  <div key={request.id} className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <p>
                      {target?.fullName ?? 'Thành viên được đề cử'}
                      {' · ' + approverLabel}
                      {' · gửi lúc ' + new Date(request.requestedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                    {isLeader && (
                      <button
                        type="button"
                        disabled={isMutationPending('cancel-leader-change', request.id)}
                        onClick={() => void handleCancelLeaderChange(request.id)}
                        className="rounded-md border border-current px-2.5 py-1 text-xs font-semibold hover:bg-white/40 disabled:opacity-50"
                      >
                        Hủy yêu cầu
                      </button>
                    )}
                  </div>
                )
              })}
            </section>
          )}

          {/* Top 4-tile V2 KPI Row */}
          <StatTileRow
            tiles={[
              {
                icon: 'groups',
                label: 'Sĩ số nhóm',
                value: `${team.members.length} / ${maxTeamSize ?? '—'}`,
                caption: `${team.members.length} / ${maxTeamSize ?? '—'} thành viên`,
                hero: true,
              },
              {
                icon: 'category',
                label: 'Hình thức đồ án',
                value: team.academicScope?.projectMode === 'INTERDISCIPLINARY' ? 'Liên ngành' : 'Đơn ngành',
                caption: team.academicScope?.requirements?.length ? `${team.academicScope.requirements.length} chuyên ngành tham gia` : 'Theo cấu hình kỳ đồ án',
                tone: 'info',
              },
              {
                icon: 'mail',
                label: 'Lời mời đang chờ',
                value: pendingInviteCount,
                caption: rosterLocked ? 'Danh sách thành viên đã chốt' : 'Lời mời gửi đi & nhận được',
                tone: pendingInviteCount > 0 ? 'warning' : 'neutral',
              },
              {
                icon: 'verified',
                label: 'Trạng thái điều kiện',
                value: team.status === 'ELIGIBLE' ? 'Đủ điều kiện' : team.status === 'LOCKED' ? 'Đã khóa' : 'Đang kiện toàn',
                caption: team.eligibility.canRegister ? 'Sẵn sàng đăng ký đề tài' : 'Xem tab Điều kiện & Chứng chỉ',
                tone: team.status === 'ELIGIBLE' ? 'success' : 'warning',
              },
            ]}
          />

          {/* High-Contrast V2 Section Tabs */}
          <WorkspaceTabs
            ariaLabel="Phân mục quản lý nhóm"
            activeId={effectiveTab}
            onChange={(next) => setActiveTab(next)}
            tabs={[
              { id: 'roster' as const, label: 'Thành viên & Phân công', icon: 'group', count: team.members.length },
              ...(showInvitationsTab
                ? [{ id: 'invitations' as const, label: 'Lời mời & Ứng viên', icon: 'mail', count: pendingInviteCount > 0 ? pendingInviteCount : null, badgeTone: pendingInviteCount > 0 ? ('warning' as const) : ('default' as const) }]
                : []),
              { id: 'eligibility' as const, label: 'Điều kiện & Chứng chỉ', icon: 'verified' },
              { id: 'ai' as const, label: 'Phân tích kỹ năng AI', icon: 'auto_awesome' },
            ]}
          />

          {effectiveTab === 'roster' && (
            <div className="space-y-5">
              <TeamRosterTable
                members={team.members}
                currentUserId={currentUserId}
                currentUserStudentCode={profile?.studentCode ?? undefined}
                majorNames={majorNames}
                isLeader={permissions.canManageRoster}
                rosterLocked={rosterLocked}
                canTransferLeader={canTransferLeader}
                requiresLeaderApproval={Boolean(requiresMentorApproval)}
                onRemoveMember={handleRemoveMember}
                onOpenTransferLeader={() => setIsTransferModalOpen(true)}
              />
              {!rosterLocked && team.academicScope && (
                <StructuredResponsibilitiesPanel teamId={team.id} scope={team.academicScope} majorNames={majorNames} canEdit={permissions.canConfigureScope} onSaved={retry} />
              )}
            </div>
          )}

          {effectiveTab === 'invitations' && showInvitationsTab && (
            <TeamInvitationsPanel
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
            />
          )}

          {effectiveTab === 'eligibility' && (
            <div className="space-y-5">
              {!rosterLocked && <StudentQualificationCard key={currentUserId} onSubmitted={management.refreshAll} />}
              {!rosterLocked && <TeamEligibilitySummary
                team={team}
                majorNames={majorNames}
                canRefresh={permissions.canRefreshEligibility}
                refreshPending={isMutationPending('refresh-eligibility', team.id)}
                canContinueToRegistration={team.eligibility.canRegister && permissions.canCreateProjectDraft}
                onRefresh={handleRefreshEligibility}
                onContinueToRegistration={() => navigate('/project/register')}
              />}
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
              <EligibilityHistoryPanel teamId={team.id} canCheck={permissions.canRefreshEligibility} onChanged={() => { retry() }} />
            </div>
          )}

          {effectiveTab === 'ai' && (
            <TeamSkillGapPanel teamId={team.id} />
          )}
        </div>
      )}

      {/* Modals */}
      <CreateTeamModal
        isOpen={isCreateModalOpen}
        semesterId={semester?.id}
        semesterName={semester?.name ?? 'Học kỳ hiện tại'}
        maxTeamSize={period?.maxTeamSize}
        majors={academicMajors}
        defaultMajorId={profile?.majorId}
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

      {/* Disband Team Confirmation Dialog */}
      {isDisbandConfirmOpen && (
        <Modal
          open
          title="Giải tán nhóm đồ án?"
          description={`Nhóm ${team?.name ?? ''} chỉ còn 1 thành viên. Sau khi giải tán, toàn bộ lời mời đang chờ sẽ tự hủy và bạn có thể tạo nhóm mới hoặc gia nhập nhóm khác trong kỳ đăng ký (N1).`}
          busy={isMutationPending('disband', team?.id)}
          onClose={() => setIsDisbandConfirmOpen(false)}
        >
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setIsDisbandConfirmOpen(false)}
              disabled={isMutationPending('disband', team?.id)}
              className="app-modal__button"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => void handleDisbandTeam()}
              disabled={isMutationPending('disband', team?.id)}
              className="app-modal__button app-modal__button--danger"
            >
              {isMutationPending('disband', team?.id) ? 'Đang xử lý...' : 'Xác nhận giải tán nhóm'}
            </button>
          </div>
        </Modal>
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

