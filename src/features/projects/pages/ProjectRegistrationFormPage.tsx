import { useState, useEffect, type FormEvent } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useStudentJourney } from '../../../app/context'
import { services } from '../../../services/service-gateway'
import { ProjectModeSelector, type ProjectRegistrationMode } from '../components/ProjectModeSelector'
import { RevisionAlert } from '../components/RevisionAlert'
import type { ProjectStatusHistoryDto } from '../../../types/backend'
import { isActionAllowed } from '../../../types/backend'
import { env } from '../../../app/config/env'

export function ProjectRegistrationFormPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const topicId = searchParams.get('topicId')

  const { team, project, profile, teamActions, projectActions, refreshAll, isLoading: contextLoading } = useStudentJourney()

  const [mode, setMode] = useState<ProjectRegistrationMode>('SINGLE_MAJOR')
  const [title, setTitle] = useState('')
  const [problemStatement, setProblemStatement] = useState('')
  const [objectives, setObjectives] = useState('')
  const [expectedOutput, setExpectedOutput] = useState('')
  const [domain, setDomain] = useState('Software Engineering')
  const [technologies, setTechnologies] = useState('.NET 9, React, TypeScript, Tailwind CSS')
  const [keywords, setKeywords] = useState('Capstone, AI, Clean Architecture')

  const [concurrencyToken, setConcurrencyToken] = useState('token_v1')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [latestRevision, setLatestRevision] = useState<ProjectStatusHistoryDto | null>(null)
  const [topicMajorIds, setTopicMajorIds] = useState<number[]>([])

  const normalizedProjectStatus = project?.status.replaceAll('_', '').toUpperCase()
  const isRevisionRequired = normalizedProjectStatus === 'REVISIONREQUIRED'
  const isRejected = normalizedProjectStatus === 'REJECTED'

  // If previous project was rejected and user is on /project/register, they are registering a new proposal
  const isRegisteringNewAfterRejection = isRejected && location.pathname.includes('/project/register')

  const isEditableLifecycle = !project || normalizedProjectStatus === 'DRAFT' || isRevisionRequired || isRegisteringNewAfterRejection
  const isEditMode = !isRegisteringNewAfterRejection && (location.pathname.includes('/project/edit') || (Boolean(project?.id) && !isRejected))
  const isLeader = Boolean(team?.members.some((m) => m.userId === profile?.id && m.isLeader))
  const canRegister = teamActions?.canRegister ?? team?.eligibility?.canRegister ?? false
  const requiredMajorIds = team?.academicScope?.requirements.map((requirement) => requirement.majorId)
    ?? (topicMajorIds.length > 0 ? topicMajorIds : undefined)
    ?? (project?.majors.length && !isRegisteringNewAfterRejection ? project.majors.map((major) => major.majorId) : undefined)
    ?? (profile?.majorId ? [profile.majorId] : [])
  const canEdit = env.isMockMode
    ? isLeader
    : isEditMode && project
      ? isActionAllowed(projectActions?.actions ?? [], 'edit_project_draft')
      : isActionAllowed(teamActions?.actions ?? [], 'create_project_draft')
  const canSubmit = env.isMockMode
    ? isLeader && (canRegister || isRevisionRequired)
    : isEditMode && project
      ? isActionAllowed(projectActions?.actions ?? [], isRevisionRequired ? 'resubmit_project' : 'submit_project')
      : canEdit && canRegister

  // Pre-fill from topic or existing project draft
  useEffect(() => {
    async function initForm() {
      if (topicId) {
        const topic = await services.topic.getTopicById(topicId)
        if (topic) {
          setTitle(topic.titleVi)
          setObjectives(topic.objectives)
          setExpectedOutput(topic.expectedOutput)
          setDomain(topic.domain)
          setTechnologies(topic.technologies.join(', '))
          setMode(topic.projectMode ?? 'SINGLE_MAJOR')
          setTopicMajorIds(topic.requiredMajorIds ?? [])
        }
      } else if (isEditMode && project) {
        setTitle(project.title)
        setProblemStatement(project.problemStatement ?? '')
        setObjectives(project.objectives ?? '')
        setExpectedOutput(project.expectedOutput ?? '')
        setConcurrencyToken(project.concurrencyToken)
        setMode(team?.academicScope?.projectMode === 'INTERDISCIPLINARY' ? 'INTERDISCIPLINARY' : 'SINGLE_MAJOR')
      }

      // Check for revision reason if revision required
      if (isEditMode && project && normalizedProjectStatus === 'REVISIONREQUIRED') {
        const history = await services.project.getHistory(project.id)
        const rev = history.filter((h) => h.newStatus.replaceAll('_', '').toUpperCase() === 'REVISIONREQUIRED').pop()
        if (rev) setLatestRevision(rev)
      }
    }
    initForm()
  }, [topicId, project, isEditMode, normalizedProjectStatus, team?.academicScope?.projectMode])

  const handleSaveDraft = async () => {
    if (!title.trim()) {
      setErrorMessage('Tên đề tài không được để trống.')
      return
    }

    setIsSavingDraft(true)
    setErrorMessage(null)
    try {
      const techList = technologies.split(',').map((t) => t.trim()).filter(Boolean)
      const kwList = keywords.split(',').map((k) => k.trim()).filter(Boolean)

      if (isEditMode && project?.id) {
        const updated = await services.project.updateDraft(project.id, {
          concurrencyToken,
          title: title.trim(),
          description: objectives.trim(),
          objectives: objectives.trim(),
          problemStatement: problemStatement.trim(),
          expectedOutput: expectedOutput.trim(),
          requiredMajorIds,
          domain: domain.trim(),
          technologies: techList,
          keywords: kwList,
        })
        setConcurrencyToken(updated.concurrencyToken)
      } else {
        const created = await services.project.createDraft({
          title: title.trim(),
          description: objectives.trim(),
          objectives: objectives.trim(),
          problemStatement: problemStatement.trim(),
          expectedOutput: expectedOutput.trim(),
          requiredMajorIds,
          domain: domain.trim(),
          technologies: techList,
          keywords: kwList,
        })
        setConcurrencyToken(created.concurrencyToken)
      }

      await refreshAll()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Lưu bản nháp thất bại.')
    } finally {
      setIsSavingDraft(false)
    }
  }

  const handleSubmitProposal = async (e: FormEvent) => {
    e.preventDefault()

    if (!canSubmit) {
      setErrorMessage('Nhóm của bạn chưa đủ điều kiện nộp đề cương. Vui lòng kiểm tra lại trang Quản lý Nhóm.')
      return
    }

    if (!isLeader) {
      setErrorMessage('Chỉ Trưởng nhóm mới có quyền nộp đề cương đồ án.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)
    try {
      // 1. Save latest edits first
      const techList = technologies.split(',').map((t) => t.trim()).filter(Boolean)
      const kwList = keywords.split(',').map((k) => k.trim()).filter(Boolean)

      let currentProjectId: number
      let token = concurrencyToken

      if (isEditMode && project?.id) {
        const updated = await services.project.updateDraft(project.id, {
          concurrencyToken: token,
          title: title.trim(),
          description: objectives.trim(),
          objectives: objectives.trim(),
          problemStatement: problemStatement.trim(),
          expectedOutput: expectedOutput.trim(),
          requiredMajorIds,
          domain: domain.trim(),
          technologies: techList,
          keywords: kwList,
        })
        currentProjectId = updated.id
        token = updated.concurrencyToken
      } else {
        const created = await services.project.createDraft({
          title: title.trim(),
          description: objectives.trim(),
          objectives: objectives.trim(),
          problemStatement: problemStatement.trim(),
          expectedOutput: expectedOutput.trim(),
          requiredMajorIds,
          domain: domain.trim(),
          technologies: techList,
          keywords: kwList,
        })
        currentProjectId = created.id
        token = created.concurrencyToken
      }

      // 2. Submit or Resubmit
      if (isRevisionRequired && isEditMode) {
        await services.project.resubmit(currentProjectId, token)
      } else {
        await services.project.submit(currentProjectId, token)
      }

      await refreshAll()
      navigate('/project/status')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Nộp đề cương thất bại.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (contextLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto flex flex-col gap-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/3" />
        <div className="h-40 bg-slate-200 rounded-2xl w-full" />
        <div className="h-96 bg-slate-200 rounded-2xl w-full" />
      </div>
    )
  }

  if (!isEditableLifecycle) {
    return (
      <div className="max-w-3xl mx-auto pb-16">
        <section className="rounded-2xl border border-blue-200 bg-white p-8 text-center shadow-xs">
          <span className="material-symbols-outlined text-4xl text-blue-600" aria-hidden="true">task_alt</span>
          <h1 className="mt-3 text-xl font-bold text-slate-900">Đề cương đã rời giai đoạn chỉnh sửa</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Project hiện ở trạng thái <strong>{project?.status}</strong>. Mọi bước tiếp theo cần thực hiện theo lifecycle hiện tại để tránh ghi đè hồ sơ đã nộp.
          </p>
          <button
            type="button"
            onClick={() => navigate('/project/status')}
            className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-700"
          >
            Xem trạng thái đề cương
          </button>
        </section>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto pb-16 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Quay lại
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {isRevisionRequired
              ? 'Chỉnh sửa & Nộp lại Đề cương'
              : isEditMode
                ? 'Chỉnh sửa Đề cương Đồ án Tốt nghiệp'
                : 'Đăng ký Đề cương Đồ án Tốt nghiệp'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Nhóm: <span className="font-semibold text-slate-700">{team?.name || 'Chưa có nhóm'}</span> • Người thực hiện:{' '}
            <span className="font-semibold text-slate-700">
              {team?.members.find((m) => m.isLeader)?.fullName || 'Trưởng nhóm'}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/topics')}
            className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">lightbulb</span>
            Xem đề tài gợi ý
          </button>
        </div>
      </div>

      {/* Revision Alert (When RevisionRequired) */}
      {isRevisionRequired && latestRevision && (
        <RevisionAlert
          reason={latestRevision.reason}
          reviewerName={latestRevision.changedByName || 'Hội đồng Khoa'}
          timestamp={latestRevision.changedAt}
          onEdit={() => {}}
        />
      )}

      {/* Notice when registering new project after rejection */}
      {isRegisteringNewAfterRejection && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 flex items-center gap-3 text-rose-800 text-xs">
          <span className="material-symbols-outlined text-rose-600 text-[22px] shrink-0">info</span>
          <div>
            <p className="font-bold">Đăng ký Đề tài Mới (Sau khi Đề tài trước bị Từ chối)</p>
            <p className="mt-0.5 text-rose-700">Đề cương trước của nhóm đã bị Hội đồng Khoa từ chối. Nhóm đang tạo và nộp một đề tài mới hoàn toàn để Hội đồng thẩm định lại.</p>
          </div>
        </div>
      )}

      {/* Form Container */}
      <form
        onSubmit={handleSubmitProposal}
        className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-6 shadow-xs"
      >
        {/* Project Mode Selector */}
        <ProjectModeSelector
          selectedMode={mode}
          onSelectMode={setMode}
          disabled
        />

        {!team?.academicScope && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <span>Nhóm đang dùng quy tắc đơn ngành mặc định. Muốn chọn liên ngành, hãy cấu hình phạm vi ngành trước.</span>
            <button type="button" onClick={() => navigate('/team')} className="shrink-0 font-bold text-blue-700 hover:underline">
              Cấu hình nhóm
            </button>
          </div>
        )}

        {/* Project Title */}
        <div>
          <label htmlFor="project-title" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Tên Đề tài Đồ án (Tiếng Việt) *
          </label>
          <input
            id="project-title"
            name="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Ví dụ: Hệ thống Quản trị Vòng đời Đồ án Tốt nghiệp Thông minh..."
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>

        {/* Problem Statement */}
        <div>
          <label htmlFor="project-problem" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Bối cảnh & Vấn đề Cần giải quyết (Problem Statement) *
          </label>
          <textarea
            id="project-problem"
            name="problemStatement"
            value={problemStatement}
            onChange={(e) => setProblemStatement(e.target.value)}
            required
            rows={3}
            placeholder="Mô tả thực trạng, nỗi đau của người dùng/doanh nghiệp và lý do cần thực hiện đề tài..."
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>

        {/* Objectives */}
        <div>
          <label htmlFor="project-objectives" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Mục tiêu Đề tài (Objectives) *
          </label>
          <textarea
            id="project-objectives"
            name="objectives"
            value={objectives}
            onChange={(e) => setObjectives(e.target.value)}
            required
            rows={3}
            placeholder="Các mục tiêu cụ thể cần đạt được về mặt công nghệ, sản phẩm và giá trị ứng dụng..."
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>

        {/* Expected Output */}
        <div>
          <label htmlFor="project-expected-output" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Sản phẩm Kỳ vọng & Phạm vi Bàn giao (Deliverables) *
          </label>
          <textarea
            id="project-expected-output"
            name="expectedOutput"
            value={expectedOutput}
            onChange={(e) => setExpectedOutput(e.target.value)}
            required
            rows={3}
            placeholder="Các sản phẩm phần mềm, tài liệu đặc tả SAD/SRS, báo cáo nghiệm thu và bộ test..."
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>

        {/* Technologies, Domain & Keywords */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="project-domain" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Lĩnh vực Nghiên cứu (Domain)
            </label>
            <input
              id="project-domain"
              name="domain"
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="Software Engineering, EdTech..."
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          <div>
            <label htmlFor="project-technologies" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Công nghệ Dự kiến
            </label>
            <input
              id="project-technologies"
              name="technologies"
              type="text"
              value={technologies}
              onChange={(e) => setTechnologies(e.target.value)}
              placeholder=".NET 9, React, TypeScript..."
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white font-mono text-xs"
            />
          </div>
          <div>
            <label htmlFor="project-keywords" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Từ khóa (Keywords)
            </label>
            <input
              id="project-keywords"
              name="keywords"
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="Capstone, AI, Clean Architecture..."
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white font-mono text-xs"
            />
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-rose-700 font-medium">
            <span className="material-symbols-outlined text-[20px] shrink-0">error</span>
            {errorMessage}
          </div>
        )}

        {/* Actions Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSavingDraft || isSubmitting || !canEdit || requiredMajorIds.length === 0}
            className="px-4 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            {isSavingDraft ? 'Đang lưu nháp...' : 'Lưu bản nháp'}
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/team')}
              className="px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isSavingDraft || !canSubmit || requiredMajorIds.length === 0}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              {isSubmitting
                ? 'Đang gửi...'
                : isRevisionRequired
                  ? 'Nộp lại Đề cương sau Chỉnh sửa'
                  : isEditMode
                    ? 'Cập nhật & Nộp Đề cương'
                    : 'Nộp Đề cương Sơ bộ'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
