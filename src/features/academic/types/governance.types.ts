export const governanceStatuses = ['DRAFT', 'UPCOMING', 'ACTIVE', 'CLOSED', 'ARCHIVED'] as const
export const projectPeriodTypes = ['REGISTRATION', 'PROJECT_REVIEW', 'SUPERVISOR_SELECTION', 'EXECUTION', 'FINAL_SUBMISSION', 'EVALUATION'] as const
export type GovernanceStatus = (typeof governanceStatuses)[number]
export type ProjectPeriodType = (typeof projectPeriodTypes)[number]
export interface Semester { id:number; organizationId:number; organizationCode:string; organizationName:string; code:string; name:string; startDate:string; endDate:string; status:GovernanceStatus; createdAt:string; updatedAt:string }
export interface ProjectPeriod { id:number; academicSemesterId:number; semesterCode:string; semesterName:string; code:string; name:string; periodType:ProjectPeriodType; startAt:string; endAt:string; status:GovernanceStatus; minTeamSize:number|null; maxTeamSize:number|null; minDistinctMajors:number|null; maxProjectsPerSupervisor:number|null; milestoneTemplateId:number|null; rubricId:number|null; createdAt:string; updatedAt:string }
export interface PagedResult<T> { items:T[]; page:number; pageSize:number; totalCount:number }
export interface GovernanceFilters { semesterId?:number; search:string; status?:GovernanceStatus }
export type SemesterDraft = Pick<Semester, 'code'|'name'|'startDate'|'endDate'> & { organizationId?:number; id?:number }
export type ProjectPeriodDraft = Pick<ProjectPeriod, 'code'|'name'|'periodType'|'startAt'|'endAt'|'minTeamSize'|'maxTeamSize'|'minDistinctMajors'|'maxProjectsPerSupervisor'|'rubricId'> & { academicSemesterId?:number; id?:number }
