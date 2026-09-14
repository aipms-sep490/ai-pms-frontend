import * as authApi from './api/auth.api'
import * as academicApi from './api/academic.api'
import * as teamsApi from './api/teams.api'
import * as topicsApi from './api/topics.api'
import * as projectsApi from './api/projects.api'
import * as supervisorsApi from './api/supervisors.api'
import * as workflowApi from './api/workflow.api'

export const services = {
  auth: authApi,
  academic: academicApi,
  team: teamsApi,
  topic: topicsApi,
  project: projectsApi,
  supervisor: supervisorsApi,
  workflow: workflowApi,
}

export {
  authApi,
  academicApi,
  teamsApi,
  topicsApi,
  projectsApi,
  supervisorsApi,
  workflowApi,
}
