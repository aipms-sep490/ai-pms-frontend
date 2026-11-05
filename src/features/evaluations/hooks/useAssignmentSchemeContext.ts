import { useEffect, useState } from 'react'
import { getEvaluationSchemes } from '../../../services/api/evaluations.api'
import { useAuthSession } from '../../auth/context/useAuthSession'
import type { EvaluationSchemeComponent, SchemePolicy } from '../evaluation-types'

type SchemeContext = {
  policy: SchemePolicy | null
  component: EvaluationSchemeComponent | null
  state: 'loading' | 'ready' | 'unavailable'
}

/** Best effort: the current BE scheme list requires academic project scope, which
 * a lecturer may lack even with a valid scoring assignment. BE-09 detail wins. */
export function useAssignmentSchemeContext(projectId: number, componentId: number | null): SchemeContext {
  const { session } = useAuthSession()
  const mayReadScheme = session?.user.roles.some(role => role === 'DEPARTMENT_STAFF' || role === 'ADMIN') ?? false
  const key = `${projectId}:${componentId ?? 'legacy'}`
  const [context, setContext] = useState<SchemeContext & { key: string }>({ key: '', policy: null, component: null, state: 'loading' })

  useEffect(() => {
    if (componentId == null || !mayReadScheme) return
    const controller = new AbortController()
    void getEvaluationSchemes(projectId, controller.signal).then(schemes => {
      if (controller.signal.aborted) return
      const scheme = schemes.find(item => item.components.some(component => component.id === componentId))
      const component = scheme?.components.find(item => item.id === componentId) ?? null
      setContext(scheme && component
        ? { key, policy: scheme.policy ?? null, component, state: 'ready' }
        : { key, policy: null, component: null, state: 'unavailable' })
    }).catch(() => {
      if (!controller.signal.aborted) setContext({ key, policy: null, component: null, state: 'unavailable' })
    })
    return () => controller.abort()
  }, [projectId, componentId, key, mayReadScheme])

  if (componentId == null || !mayReadScheme) return { policy: null, component: null, state: 'unavailable' }
  return context.key === key ? context : { policy: null, component: null, state: 'loading' }
}
