export const endpoints = {
  system: '/system',
  projectLifecycle: '/projects/lifecycle',
  progressAnalysis: '/ai/insights/progress',
  authLogin: '/v1/auth/login',
  authCurrentUser: '/v1/auth/me',
  authWorkflowContext: '/v1/auth/me/context',
  academicHierarchy: '/v1/academic/hierarchy',
  academicOrganizations: '/v1/academic/organizations',
  academicDepartments: '/v1/academic/departments',
  academicMajors: '/v1/academic/majors',
  academicSemesters: '/v1/academic/semesters',
  academicProjectPeriods: '/v1/academic/project-periods',
} as const
