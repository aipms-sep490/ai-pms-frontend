import { useCallback, useEffect, useRef, useState } from 'react'
import { HttpError } from '../../../services/http/http-client'
import { useAuthSession } from '../../auth/context/useAuthSession'
import { closeTopic, createTopic, getTopic, listTopics, publishTopic, updateTopic, type CreateTopic, type Topic, type TopicFilters, type TopicPage, type TopicContent } from '../api/topic-api'

const empty: TopicPage = { items: [], page: 1, pageSize: 20, totalCount: 0 }
export type TopicStatusCounts = { DRAFT: number; PUBLISHED: number; CLOSED: number }
export function useTopics(id?: number) {
  const { session } = useAuthSession(); const [directory, setDirectory] = useState<TopicPage>(empty); const [statusCounts, setStatusCounts] = useState<TopicStatusCounts | null>(null); const [current, setCurrent] = useState<Topic | null>(null); const [filters, setFilters] = useState<TopicFilters>({ status: 'DRAFT', page: 1, pageSize: 20 }); const [loading, setLoading] = useState(Boolean(session)); const [error, setError] = useState<Error | null>(null); const [saving, setSaving] = useState(false); const [mutationError, setMutationError] = useState<Error | null>(null); const requestVersion = useRef(0), mutationLock = useRef(false)
  const token = session?.accessToken
  const refresh = useCallback(async () => {
    if (!token) return
    const version = ++requestVersion.current
    setLoading(true); setError(null); setCurrent(null)
    try {
      if (id) {
        const topic = await getTopic(id, token)
        if (version === requestVersion.current) setCurrent(topic)
      } else {
        const activeStatus = filters.status ?? 'DRAFT'
        const otherStatuses = (['DRAFT', 'PUBLISHED', 'CLOSED'] as const).filter((s) => s !== activeStatus)
        const [items, ...others] = await Promise.all([
          listTopics(token, filters),
          ...otherStatuses.map((status) => listTopics(token, { search: filters.search, status, page: 1, pageSize: 1 }).catch(() => null)),
        ])
        if (version === requestVersion.current) {
          setDirectory(items)
          const nextCounts: TopicStatusCounts = { DRAFT: 0, PUBLISHED: 0, CLOSED: 0 }
          nextCounts[activeStatus] = items.totalCount
          otherStatuses.forEach((status, index) => {
            nextCounts[status] = others[index]?.totalCount ?? 0
          })
          setStatusCounts(nextCounts)
        }
      }
    } catch (caught) {
      if (version === requestVersion.current) setError(caught as Error)
    } finally {
      if (version === requestVersion.current) setLoading(false)
    }
  }, [id, token, filters])
  useEffect(() => { const version = requestVersion; void refresh(); return () => { version.current++ } }, [refresh])
  const mutate = async (operation: () => Promise<Topic>) => { if (mutationLock.current) throw new Error('Một thao tác đề tài đang được xử lý.'); mutationLock.current = true; setSaving(true); setMutationError(null); const version = requestVersion.current; try { const topic = await operation(); if (version === requestVersion.current) await refresh(); return topic } catch (caught) { if (version === requestVersion.current) { if (caught instanceof HttpError && caught.status === 409) await refresh(); setMutationError(caught as Error) }; throw caught } finally { mutationLock.current = false; setSaving(false) } }
  return { items: directory.items, page: directory.page, pageSize: directory.pageSize, totalCount: directory.totalCount, statusCounts, current, filters, setFilters, loading, error, mutationError, saving, refresh, create: (input: CreateTopic) => session ? mutate(() => createTopic(input, session.accessToken)) : Promise.reject(new Error('Unauthenticated')), update: (content: TopicContent) => session && current ? mutate(() => updateTopic(current.id, content, current.concurrencyToken, session.accessToken)) : Promise.reject(new Error('Topic unavailable')), publish: () => session && current ? mutate(() => publishTopic(current.id, current.concurrencyToken, session.accessToken)) : Promise.reject(new Error('Topic unavailable')), close: (reason: string) => session && current ? mutate(() => closeTopic(current.id, current.concurrencyToken, reason, session.accessToken)) : Promise.reject(new Error('Topic unavailable')), isUnauthorized: !session || (error instanceof HttpError && error.status === 401), isForbidden: error instanceof HttpError && error.status === 403 }
}
