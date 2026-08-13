import { useCallback, useEffect, useState } from 'react'
import { getProjectLifecycle } from '../api/get-project-lifecycle'
import type { ProjectLifecycle } from '../types/project.types'

export function useProjectLifecycle() {
  const [data, setData] = useState<ProjectLifecycle | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [requestVersion, setRequestVersion] = useState(0)

  const retry = useCallback(() => setRequestVersion((version) => version + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    setIsLoading(true)
    setError(null)

    getProjectLifecycle(controller.signal)
      .then((lifecycle) => setData(lifecycle))
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : 'Unable to load project lifecycle.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      })

    return () => controller.abort()
  }, [requestVersion])

  return { data, error, isLoading, retry }
}
