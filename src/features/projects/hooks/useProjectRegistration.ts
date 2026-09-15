import { useCallback, useEffect, useMemo, useState } from 'react'
import { env } from '../../../app/config/env'
import { services } from '../../../services/service-gateway'
import { HttpError } from '../../../services/http/http-client'
import type {
  ProjectDto,
  ProjectStatusHistoryDto,
  ProjectWorkflowActionsDto,
  TeamDto,
  TeamWorkflowActionsDto,
  UserAccountDto,
} from '../../../types/backend'
import { isActionAllowed } from '../../../types/backend'

export interface ProjectRegistrationForm {
  title: string
  description: string
  problemStatement: string
  objectives: string
  expectedOutput: string
  domain: string
  technologies: string
  keywords: string
}

export type ProjectRegistrationErrorKind =
  | 'authentication'
  | 'forbidden'
  | 'not-found'
  | 'conflict'
  | 'validation'
  | 'system'

export interface ProjectRegistrationError {
  kind: ProjectRegistrationErrorKind
  message: string
}

const emptyForm: ProjectRegistrationForm = {
  title: '', description: '', problemStatement: '', objectives: '', expectedOutput: '',
  domain: '', technologies: '', keywords: '',
}

export function normalizeProjectStatus(status?: string | null) {
  return status?.replaceAll('_', '').toUpperCase() ?? ''
}

export function splitProjectTags(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}

export function toProjectForm(project: ProjectDto | null): ProjectRegistrationForm {
  if (!project) return emptyForm
  const tags = (type: string) => project.tags.filter((tag) => tag.tagType.toUpperCase() === type).map((tag) => tag.name).join(', ')
  return {
    title: project.title,
    description: project.description ?? '',
    problemStatement: project.problemStatement ?? '',
    objectives: project.objectives ?? '',
    expectedOutput: project.expectedOutput ?? '',
    domain: tags('DOMAIN'),
    technologies: tags('TECHNOLOGY'),
    keywords: tags('KEYWORD'),
  }
}

export function classifyProjectError(reason: unknown): ProjectRegistrationError {
  if (reason instanceof HttpError) {
    if (reason.status === 401) return { kind: 'authentication', message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' }
    if (reason.status === 403) return { kind: 'forbidden', message: 'Bạn không có quyền hoặc phạm vi truy cập cho thao tác này.' }
    if (reason.status === 404) return { kind: 'not-found', message: 'Không tìm thấy hồ sơ đề tài trong phạm vi truy cập của bạn.' }
    if (reason.status === 409) return { kind: 'conflict', message: 'Hồ sơ đã thay đổi trên backend. Dữ liệu mới đã được tải lại; hãy xem lại và chủ động thực hiện lại thao tác.' }
    if (reason.status === 400 || reason.status === 422) return { kind: 'validation', message: reason.message || 'Dữ liệu chưa thỏa điều kiện backend.' }
  }
  return { kind: 'system', message: reason instanceof Error ? reason.message : 'Không thể kết nối hoặc xử lý yêu cầu. Hãy thử lại.' }
}

interface UseProjectRegistrationOptions {
  project: ProjectDto | null
  team: TeamDto | null
  profile: UserAccountDto | null
  teamActions: TeamWorkflowActionsDto | null
  projectActions: ProjectWorkflowActionsDto | null
  refreshAll: () => Promise<void>
}

/**
 * Feature-local Project draft/submit state. It never persists a client lifecycle:
 * every successful mutation refetches the backend Project and global journey context.
 */
export function useProjectRegistration({
  project, team, profile, teamActions, projectActions, refreshAll,
}: UseProjectRegistrationOptions) {
  const [form, setForm] = useState<ProjectRegistrationForm>(() => toProjectForm(project))
  const [history, setHistory] = useState<ProjectStatusHistoryDto[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [resubmitting, setResubmitting] = useState(false)
  const [error, setError] = useState<ProjectRegistrationError | null>(null)

  useEffect(() => { setForm(toProjectForm(project)) }, [project])

  const status = normalizeProjectStatus(project?.status)
  const isLeader = Boolean(team?.members.some((member) => member.userId === profile?.id && member.isLeader))
  const canRegister = teamActions?.canRegister ?? team?.eligibility?.canRegister ?? false
  const canCreate = env.isMockMode
    ? isLeader && canRegister
    : canRegister && isActionAllowed(teamActions?.actions ?? [], 'create_project_draft')
  const canEdit = project
    ? (env.isMockMode ? isLeader && (status === 'DRAFT' || status === 'REVISIONREQUIRED') : isActionAllowed(projectActions?.actions ?? [], 'edit_project_draft'))
    : canCreate
  const canSubmit = Boolean(project) && (env.isMockMode
    ? isLeader && status === 'DRAFT'
    : isActionAllowed(projectActions?.actions ?? [], 'submit_project'))
  const canResubmit = Boolean(project) && (env.isMockMode
    ? isLeader && status === 'REVISIONREQUIRED'
    : isActionAllowed(projectActions?.actions ?? [], 'resubmit_project'))
  const canContinueToSupervisor = Boolean(project) && !env.isMockMode
    && isActionAllowed(projectActions?.actions ?? [], 'send_supervisor_request')
  const academicScope = project?.academicScope ?? team?.academicScope ?? null
  const requiredMajorIds = useMemo(() => academicScope?.requirements.map((item) => item.majorId)
    ?? project?.majors.map((item) => item.majorId)
    ?? [], [academicScope, project?.majors])
  const latestRevision = useMemo(() => history.filter((item) => normalizeProjectStatus(item.newStatus) === 'REVISIONREQUIRED').at(-1) ?? null, [history])

  const setField = useCallback(<K extends keyof ProjectRegistrationForm>(field: K, value: ProjectRegistrationForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }))
  }, [])

  const loadHistory = useCallback(async () => {
    if (!project) { setHistory([]); return }
    setHistoryLoading(true)
    try { setHistory(await services.project.getHistory(project.id)) }
    catch (reason) { setError(classifyProjectError(reason)) }
    finally { setHistoryLoading(false) }
  }, [project])

  useEffect(() => { void loadHistory() }, [loadHistory])

  const validate = useCallback(() => {
    if (!form.title.trim()) return 'Tên đề tài là bắt buộc.'
    if (!form.domain.trim()) return 'Lĩnh vực (Domain) là bắt buộc theo hợp đồng backend.'
    return null
  }, [form.domain, form.title])

  const payload = useCallback(() => ({
    title: form.title.trim(), description: form.description.trim() || null,
    objectives: form.objectives.trim() || null, problemStatement: form.problemStatement.trim() || null,
    expectedOutput: form.expectedOutput.trim() || null, requiredMajorIds,
    domain: form.domain.trim(), technologies: splitProjectTags(form.technologies), keywords: splitProjectTags(form.keywords),
  }), [form, requiredMajorIds])

  const refetchAuthoritative = useCallback(async (id: number) => {
    await services.project.getProject(id)
    await refreshAll()
    await loadHistory()
  }, [loadHistory, refreshAll])

  const handleFailure = useCallback(async (reason: unknown) => {
    const classified = classifyProjectError(reason)
    if (classified.kind === 'conflict') await refreshAll()
    setError(classified)
  }, [refreshAll])

  const saveDraft = useCallback(async (): Promise<ProjectDto | null> => {
    const validation = validate()
    if (validation) { setError({ kind: 'validation', message: validation }); return null }
    if (!canEdit) { setError({ kind: 'forbidden', message: 'Backend chưa cho phép tạo hoặc chỉnh sửa bản nháp này.' }); return null }
    setError(null)
    const create = !project
    if (create) setCreating(true)
    else setSaving(true)
    try {
      const result = project
        ? await services.project.updateDraft(project.id, { ...payload(), concurrencyToken: project.concurrencyToken })
        : await services.project.createProjectDraft(payload())
      await refetchAuthoritative(result.id)
      return result
    } catch (reason) { await handleFailure(reason); return null }
    finally {
      if (create) setCreating(false)
      else setSaving(false)
    }
  }, [canEdit, handleFailure, payload, project, refetchAuthoritative, validate])

  const transition = useCallback(async (kind: 'submit' | 'resubmit'): Promise<ProjectDto | null> => {
    if (!project) { setError({ kind: 'validation', message: 'Hãy lưu bản nháp thành công trước khi nộp.' }); return null }
    const permitted = kind === 'submit' ? canSubmit : canResubmit
    if (!permitted) { setError({ kind: 'forbidden', message: 'Backend chưa cho phép chuyển trạng thái này.' }); return null }
    setError(null)
    if (kind === 'submit') setSubmitting(true)
    else setResubmitting(true)
    try {
      const result = kind === 'submit'
        ? await services.project.submitProject(project.id, project.concurrencyToken)
        : await services.project.resubmitProject(project.id, project.concurrencyToken)
      await refetchAuthoritative(result.id)
      return result
    } catch (reason) { await handleFailure(reason); return null }
    finally {
      if (kind === 'submit') setSubmitting(false)
      else setResubmitting(false)
    }
  }, [canResubmit, canSubmit, handleFailure, project, refetchAuthoritative])

  return {
    form, setField, status, academicScope, requiredMajorIds, latestRevision, history, historyLoading,
    canRegister, canCreate, canEdit, canSubmit, canResubmit, canContinueToSupervisor, isLeader,
    creating, saving, submitting, resubmitting, error, clearError: () => setError(null),
    saveDraft, submit: () => transition('submit'), resubmit: () => transition('resubmit'), loadHistory,
  }
}
