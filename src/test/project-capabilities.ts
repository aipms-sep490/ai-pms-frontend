import type { ProjectCapabilities } from '../features/capabilities/capabilities-types'

/** Contract-shaped test data; production authority always comes from BE. */
export function projectCapabilities(projectId: number, allowed = true): ProjectCapabilities {
  return {
    projectId, projectStatus: 'FINAL_SUBMISSION', concurrencyToken: 'project-token',
    academicScopeProvenance: 'FROZEN_REGISTRATION_SNAPSHOT', leadDepartmentId: 2,
    managedDepartmentIds: allowed ? [2] : [], registrationSnapshotId: 3,
    schemeId: 31, schemeConcurrencyToken: 'scheme-token', policyVersionId: 6,
    actions: [
      { code: 'manage_evaluation_scheme', allowed, reasons: allowed ? [] : ['LEAD_DEPARTMENT_REQUIRED'] },
      { code: 'manage_evaluators', allowed, reasons: allowed ? [] : ['ACADEMIC_COMPONENT_SCOPE_REQUIRED'] },
      { code: 'publish_project_result', allowed, reasons: allowed ? [] : ['LEAD_DEPARTMENT_REQUIRED_FOR_PUBLICATION'] },
    ],
  }
}
