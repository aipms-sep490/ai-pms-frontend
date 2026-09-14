import { env } from '../../app/config/env'
import type { MajorType } from '../../components/ui/MultidisciplinaryTag'
import type { PagedResult, TopicDto } from '../../types/backend'
import type { TopicItem, TopicCatalogueQuery } from '../../types/topic.types'
import { REFERENCE_TOPICS } from '../fixtures/topic-catalogue.fixture'
import { httpGet } from '../http/http-client'

const KNOWN_MAJORS = new Set<MajorType>(['SE', 'UI/UX', 'AI', 'QA', 'IS'])

function toMajor(code?: string): MajorType {
  return code && KNOWN_MAJORS.has(code as MajorType) ? code as MajorType : 'SE'
}

function toTopicItem(topic: TopicDto): TopicItem {
  const majors = topic.requirements.map((requirement) => toMajor(requirement.majorCode))
  const uniqueMajors = [...new Set(majors)]
  return {
    id: String(topic.id), code: topic.code, titleVi: topic.title, titleEn: topic.title,
    domain: topic.domain ?? topic.leadDepartmentName,
    leadMajor: uniqueMajors[0] ?? 'SE', participatingMajors: uniqueMajors.slice(1),
    suggestedMajors: uniqueMajors.length > 0 ? uniqueMajors : ['SE'],
    isInterdisciplinary: topic.projectMode === 'INTERDISCIPLINARY', difficulty: 'STANDARD',
    description: topic.description ?? '', objectives: topic.objectives ?? '',
    expectedOutput: topic.expectedOutput ?? '', technologies: topic.technologies,
    status: topic.status === 'CLOSED' ? 'ARCHIVED' : 'AVAILABLE',
    projectMode: topic.projectMode === 'INTERDISCIPLINARY' ? 'INTERDISCIPLINARY' : 'SINGLE_MAJOR',
    requiredMajorIds: topic.requirements.map((requirement) => requirement.majorId),
  }
}

function filterMockTopics(query?: TopicCatalogueQuery): TopicItem[] {
  let filtered = [...REFERENCE_TOPICS]
  if (query?.search) {
    const q = query.search.toLowerCase()
    filtered = filtered.filter((topic) =>
      [topic.titleVi, topic.titleEn, topic.code, topic.domain, ...topic.technologies]
        .some((value) => value.toLowerCase().includes(q)),
    )
  }
  if (query?.major && query.major !== 'ALL') {
    filtered = filtered.filter((topic) =>
      topic.leadMajor === query.major || topic.participatingMajors.includes(query.major as MajorType),
    )
  }
  if (query?.isInterdisciplinaryOnly) filtered = filtered.filter((topic) => topic.isInterdisciplinary)
  if (query?.difficulty) filtered = filtered.filter((topic) => topic.difficulty === query.difficulty)
  return filtered
}

export async function getTopicCatalogue(query?: TopicCatalogueQuery): Promise<TopicItem[]> {
  if (env.isMockMode) return filterMockTopics(query)
  const params = new URLSearchParams({ status: 'PUBLISHED', page: '1', pageSize: '100' })
  if (query?.academicSemesterId) params.set('academicSemesterId', String(query.academicSemesterId))
  if (query?.projectPeriodId) params.set('projectPeriodId', String(query.projectPeriodId))
  if (query?.majorId) params.set('majorId', String(query.majorId))
  if (query?.search) params.set('search', query.search)
  if (query?.isInterdisciplinaryOnly) params.set('projectMode', 'INTERDISCIPLINARY')
  if (query?.compatibleOnly) params.set('compatibleOnly', 'true')
  const result = await httpGet<PagedResult<TopicDto>>(`/topics?${params.toString()}`)
  const items = result.items.map(toTopicItem)
  if (!query?.major || query.major === 'ALL') return items
  return items.filter((topic) => topic.leadMajor === query.major || topic.participatingMajors.includes(query.major as MajorType))
}

export async function getTopicById(id: string): Promise<TopicItem | null> {
  if (env.isMockMode) return REFERENCE_TOPICS.find((topic) => topic.id === id) ?? null
  const numericId = Number(id)
  if (!Number.isSafeInteger(numericId) || numericId <= 0) return null
  return toTopicItem(await httpGet<TopicDto>(`/topics/${numericId}`))
}
