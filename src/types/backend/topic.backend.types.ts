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
