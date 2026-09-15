import { useCallback, useEffect, useState } from 'react'
import { HttpError } from '../../../services/http/http-client'
import { listTopics, type Topic, type TopicFilters } from '../../topics/api/topic-api'

export type TopicDiscoveryErrorKind = 'authentication' | 'forbidden' | 'system' | null

export function useTopicDiscovery(accessToken: string | undefined, filters: TopicFilters) {
  const [topics, setTopics] = useState<Topic[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(Boolean(accessToken))
  const [error, setError] = useState<Error | null>(null)
  const [errorKind, setErrorKind] = useState<TopicDiscoveryErrorKind>(null)
  const [version, setVersion] = useState(0)

  const retry = useCallback(() => setVersion((value) => value + 1), [])

  useEffect(() => {
    if (!accessToken) {
      setTopics([])
      setTotalCount(0)
      setIsLoading(false)
      return
    }

    let active = true
    setIsLoading(true)
    setError(null)
    setErrorKind(null)
    listTopics(accessToken, filters)
      .then((result) => {
        if (!active) return
        setTopics(result.items)
        setTotalCount(result.totalCount)
      })
      .catch((reason: unknown) => {
        if (!active) return
        const nextError = reason instanceof Error ? reason : new Error('Không thể tải danh mục đề tài.')
        setTopics([])
        setTotalCount(0)
        setError(nextError)
        setErrorKind(reason instanceof HttpError && reason.status === 401
          ? 'authentication'
          : reason instanceof HttpError && reason.status === 403 ? 'forbidden' : 'system')
      })
      .finally(() => active && setIsLoading(false))

    return () => { active = false }
  }, [accessToken, filters, version])

  return { topics, totalCount, isLoading, error, errorKind, retry }
}
