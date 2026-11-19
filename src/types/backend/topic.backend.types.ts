export interface TopicMajorRequirementDto {
  majorId: number
  majorCode: string
  majorName: string
  departmentId: number
  departmentName: string
  minMembers: number
  maxMembers: number
  responsibility: string
}

export interface TopicDto {
  id: number
  code: string
  status: string
  projectPeriodId: number
  academicSemesterId: number
  organizationId: number
  leadDepartmentId: number
  leadDepartmentName: string
  title: string
  description?: string | null
  problemStatement?: string | null
  objectives?: string | null
  expectedOutput?: string | null
  domain?: string | null
  technologies: string[]
  keywords: string[]
  projectMode: string
  primaryMajorId?: number | null
  requirements: TopicMajorRequirementDto[]
  concurrencyToken: string
  matchesMyMajor?: boolean | null
}

export interface TopicSimilarityExactMatchDto {
  id: number
  code?: string | null
  title: string
}

export interface SimilarTopicMatchDto {
  id: number
  title: string
  semesterCode: string
  score: number
}

export interface TopicSimilarityResultDto {
  exactMatch: TopicSimilarityExactMatchDto | null
  similar: SimilarTopicMatchDto[]
}

export interface AiTopicSimilarityRequest {
  teamId: number
  projectId?: number
  title: string
  problemStatement?: string
  objectives?: string
  expectedOutput?: string
  domain?: string
  keywords: string[]
}

export interface AiTopicSimilarityResultDto extends TopicSimilarityResultDto {
  generationStatus: 'COMPLETED' | 'FALLBACK' | 'INSUFFICIENT_DATA'
  matches: {
    id: number
    sourceType: 'TOPIC' | 'PROJECT'
    title: string
    semesterCode: string
    similarityLevel: 'HIGH' | 'MEDIUM' | 'LOW'
    reason: string
    sharedAspects: string[]
    differences: string[]
    candidateExcerpt: string
    proposalExcerpt: string
  }[]
  summary: string
  limitationNote: string
  candidateCount: number
  reviewedCount: number
  truncated: boolean
  generatedAt: string
  modelVersion: string
}
