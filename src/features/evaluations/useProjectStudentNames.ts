import { useCallback, useEffect, useState } from 'react'
import { HttpError } from '../../services/http/http-client'
import { getReviewDetail } from '../projects/api/project-review-api'

interface NamesState { projectId: number; accessToken: string; reload: number; names: Record<number, string>; error: string | null }

/** Names come from the authorized frozen roster, not from the presence of individual assignments. */
export function useProjectStudentNames(projectId: number, accessToken?: string) {
  const [reload, setReload] = useState(0)
  const [state, setState] = useState<NamesState | null>(null)
  const retry = useCallback(() => setReload(value => value + 1), [])
  useEffect(() => {
    let active = true
    if (!accessToken || !Number.isSafeInteger(projectId) || projectId <= 0) return
    const empty = { projectId, accessToken, reload, names: {}, error: null }
    void getReviewDetail(projectId, accessToken).then(review => {
      if (active) setState({ ...empty, names: Object.fromEntries((review.latestSubmission?.evidence.members ?? []).filter(member => Number.isSafeInteger(member.userId) && member.userId > 0 && typeof member.fullName === 'string').map(member => [member.userId, member.fullName])) })
    }).catch(reason => {
      if (active) setState({ ...empty, error: reason instanceof HttpError && reason.status === 403
        ? 'Bạn chưa được cấp quyền xem tên sinh viên từ hồ sơ đã chốt. Danh sách đang dùng định danh sinh viên.'
        : 'Chưa thể tải tên sinh viên từ hồ sơ đã chốt. Danh sách đang dùng định danh sinh viên; hãy thử tải lại.' })
    })
    return () => { active = false }
  }, [projectId, accessToken, reload])
  const current = state?.projectId === projectId && state.accessToken === accessToken && state.reload === reload
  return { names: current ? state.names : {}, loading: Boolean(accessToken) && Number.isSafeInteger(projectId) && projectId > 0 && !current, error: current ? state.error : null, retry }
}

export function studentChoiceLabel(id: number, name?: string) {
  return `Sinh viên #${id}${name?.trim() ? ` · ${name.trim()}` : ''}`
}

export function majorChoiceLabel(id: number, name?: string) {
  return `Ngành #${id}${name?.trim() ? ` · ${name.trim()}` : ''}`
}
