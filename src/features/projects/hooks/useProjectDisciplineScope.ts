import { useEffect, useState } from 'react'
import type { ProjectDto } from '../../../types/backend'
import { getProjectMajorRequirements } from '../api/project-review-api'

export function useProjectDisciplineScope(project: ProjectDto) {
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState<{ key: string; majors: { majorId: number; majorName: string }[]; error: string | null } | null>(null)
  const scope = project.academicScope
  const known = project.academicScopeProvenance === 'FROZEN_REGISTRATION_SNAPSHOT'
    && !!scope && ['SINGLE_MAJOR', 'INTERDISCIPLINARY'].includes(scope.projectMode)
  const key = JSON.stringify([project.id, project.academicScopeProvenance, scope, project.majors, revision])
  useEffect(() => {
    if (!known || !scope) return
    const controller = new AbortController()
    void getProjectMajorRequirements(project.id, undefined, controller.signal).then(value => {
      if (controller.signal.aborted) return
      // ACTIVE project requirements are immutable; empty legacy requirements use the frozen scope, as BE does.
      const ids = (value.requirements.length ? value.requirements : scope.requirements).map(item => item.majorId)
      if (!ids.length || ids.some(id => !Number.isSafeInteger(id) || id <= 0 || !scope.requirements.some(item => item.majorId === id)) || new Set(ids).size !== ids.length) {
        setState({ key, majors: [], error: 'Phạm vi ngành chưa khớp hồ sơ đăng ký. Cần đối chiếu dữ liệu đồ án.' }); return
      }
      setState({ key, error: null, majors: ids.map(majorId => ({ majorId, majorName: project.majors.find(item => item.majorId === majorId)?.majorName || `Ngành #${majorId}` })) })
    }).catch(() => { if (!controller.signal.aborted) setState({ key, majors: [], error: 'Chưa tải được phạm vi ngành của đồ án. Hãy tải lại.' }) })
    return () => controller.abort()
  }, [key, known, project.id, project.majors, scope])
  const current = state?.key === key ? state : null
  return { majors: current?.majors ?? [], ready: known && !!current && !current.error,
    error: known ? current?.error ?? null : 'Chưa có phạm vi học thuật đã xác minh. Cần hoàn thiện hồ sơ trước khi tạo công việc.',
    loading: known && !current, retry: () => setRevision(value => value + 1),
    interdisciplinary: scope?.projectMode === 'INTERDISCIPLINARY' }
}
