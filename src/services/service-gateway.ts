import * as authApi from './api/auth.api'
import * as academicApi from './api/academic.api'
import * as teamsApi from './api/teams.api'
import * as topicsApi from './api/topics.api'
import * as projectsApi from './api/projects.api'
import * as supervisorsApi from './api/supervisors.api'
import * as workflowApi from './api/workflow.api'
import * as qualificationApi from './api/student-qualifications.api'
import * as milestonesApi from './api/milestones.api'
import * as tasksApi from './api/tasks.api'

export const services = {
  auth: authApi,
  academic: academicApi,
  team: teamsApi,
  topic: topicsApi,
  project: projectsApi,
  supervisor: supervisorsApi,
  workflow: workflowApi,
  qualification: qualificationApi,
  milestone: milestonesApi,
  task: tasksApi,
}

export {
  authApi,
  academicApi,
  teamsApi,
  topicsApi,
  projectsApi,
  supervisorsApi,
  workflowApi,
  qualificationApi,
  milestonesApi,
  tasksApi,
}
