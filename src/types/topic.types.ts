import type { MajorType } from '../components/ui/MultidisciplinaryTag'

/**
 * Topic item type for Topic Catalogue (Reference only).
 * View model used by the student topic catalogue. API records are mapped to this shape.
 */
export interface TopicItem {
  id: string
  code: string
  titleVi: string
  titleEn: string
  domain: string
  leadMajor: MajorType
  participatingMajors: MajorType[]
  suggestedMajors: MajorType[]
  isInterdisciplinary: boolean
  difficulty: 'STANDARD' | 'ADVANCED' | 'COMPLEX'
  description: string
  objectives: string
  expectedOutput: string
  technologies: string[]
  suggestedSupervisor?: string
  status: 'AVAILABLE' | 'RESERVED' | 'ARCHIVED'
  projectMode?: 'SINGLE_MAJOR' | 'INTERDISCIPLINARY'
  requiredMajorIds?: number[]
}

export interface TopicCatalogueQuery {
  search?: string
  major?: MajorType | 'ALL'
  isInterdisciplinaryOnly?: boolean
  difficulty?: string
  academicSemesterId?: number
  projectPeriodId?: number
  majorId?: number
  compatibleOnly?: boolean
}
