export const projectModes = ['SINGLE_MAJOR', 'INTERDISCIPLINARY'] as const
export type ProjectMode = (typeof projectModes)[number]

export const registrationSourceKinds = ['PUBLISHED_TOPIC', 'STUDENT_PROPOSAL'] as const
export type RegistrationSourceKind = (typeof registrationSourceKinds)[number]

export interface MajorRequirementDraft {
  majorId: number
  minMembers: number
  maxMembers?: number | null
  responsibility: string
}

/** Local UX draft only. It is never a persisted Team or Project academic scope. */
export interface AcademicScopeDraft {
  projectMode: ProjectMode
  primaryMajorId?: number | null
  leadDepartmentId?: number | null
  requirements: readonly MajorRequirementDraft[]
}
