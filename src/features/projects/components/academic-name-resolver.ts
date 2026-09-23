import type { AcademicHierarchyOrganization } from '../../academic/types/academic.types'

export interface AcademicNameResolver {
  department: (departmentId: number) => string
  major: (majorId: number) => string
}

const fallbackDepartment = (id: number) => `Department #${id}`
const fallbackMajor = (id: number) => `Major #${id}`

/**
 * Builds display labels from the already-loaded academic hierarchy. This is a
 * presentation lookup only; it never infers academic scope or eligibility.
 */
export function createAcademicNameResolver(hierarchy: readonly AcademicHierarchyOrganization[] | null | undefined): AcademicNameResolver {
  const departments = new Map<number, string>()
  const majors = new Map<number, string>()

  hierarchy?.forEach(({ departments: hierarchyDepartments }) => hierarchyDepartments.forEach(({ department, majors: departmentMajors }) => {
    departments.set(department.id, `${department.name} (${department.code})`)
    departmentMajors.forEach((major) => majors.set(major.id, `${major.name} (${major.code})`))
  }))

  return {
    department: (id) => departments.get(id) ?? fallbackDepartment(id),
    major: (id) => majors.get(id) ?? fallbackMajor(id),
  }
}
