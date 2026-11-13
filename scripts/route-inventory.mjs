import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const routerFile = path.resolve(rootDir, 'src/app/router/index.tsx')
const content = fs.readFileSync(routerFile, 'utf8')

const sf = ts.createSourceFile('index.tsx', content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)

// Controller / API mapping table for AIPMS routes
const ROUTE_API_MAPPING = {
  '/login': 'AuthController (POST /api/v1/auth/login, POST /api/v1/auth/google)',
  '/forgot-password': 'AuthController (POST /api/v1/auth/forgot-password)',
  '/reset-password': 'AuthController (POST /api/v1/auth/reset-password)',
  '/industry/enroll': 'IndustryController (POST /api/v1/industry/enroll)',
  '/industry': 'IndustryController (GET /api/v1/industry/assignments, GET /api/v1/industry/projects)',
  '/industry/workspace': 'IndustryController (GET /api/v1/industry/workspace)',
  '/industry/assignments/:assignmentId': 'IndustryController (GET /api/v1/industry/assignments/{id}, POST feedback)',
  '/profile': 'AcademicProfilesController, UsersController (GET /api/v1/users/me)',
  '/profile/security': 'UsersController (PUT /api/v1/users/me/security)',
  '/notifications': 'NotificationsController (GET /api/v1/notifications, PUT read)',
  '/calendar': 'CalendarController (GET /api/v1/calendar/events)',
  '/messages/:conversationId?': 'ChatController (GET /api/v1/chat/conversations, messages)',
  '/project/overview': 'WorkflowContextController, ActionAggregatorsController (GET /api/v1/student/workflow-context)',
  '/project/workspace': 'WorkflowContextController, ExecutionCapabilitiesController (GET /api/v1/projects/{id}/workspace)',
  '/project/milestones/:milestoneId?': 'MilestonesController (GET /api/v1/projects/{id}/milestones)',
  '/project/tasks': 'TasksController, SprintsController (GET /api/v1/projects/{id}/tasks)',
  '/project/tasks/:taskId': 'TasksController (GET /api/v1/tasks/{id}, PUT)',
  '/project/gantt': 'MilestonesController, TasksController (GET /api/v1/projects/{id}/gantt)',
  '/project/reports': 'ProgressReportsController (GET /api/v1/projects/{id}/progress-reports)',
  '/project/reports/new': 'ProgressReportsController (POST /api/v1/projects/{id}/progress-reports)',
  '/project/reports/:reportId': 'ProgressReportsController (GET /api/v1/progress-reports/{id})',
  '/project/meetings': 'MeetingsController (GET /api/v1/projects/{id}/meetings)',
  '/project/meetings/new': 'MeetingsController (POST /api/v1/projects/{id}/meetings)',
  '/project/meetings/:meetingId/video': 'MeetingsController (GET /api/v1/meetings/{id}/token)',
  '/project/meetings/:meetingId': 'MeetingsController (GET /api/v1/meetings/{id})',
  '/project/deliverables': 'DeliverablesController (GET /api/v1/projects/{id}/deliverables)',
  '/project/files': 'FilesController (GET /api/v1/projects/{id}/files, POST upload)',
  '/project/evidence': 'DisciplineEvidenceController, ReviewGatesController (GET /api/v1/projects/{id}/evidence)',
  '/project/contributions': 'ContributionsController (GET /api/v1/projects/{id}/contributions)',
  '/project/gates': 'ReviewGatesController (GET /api/v1/projects/{id}/review-gates)',
  '/project/defense': 'AcademicTrackingController (GET /api/v1/projects/{id}/defense)',
  '/project/cold-reports': 'ColdSubmissionsController (GET /api/v1/projects/{id}/cold-reports)',
  '/project/peer-evaluation': 'PeerEvaluationsController (GET /api/v1/projects/{id}/peer-evaluations)',
  '/project/ai': 'AiInsightsController, AiAssistantController',
  '/project/agreement': 'WorkingAgreementController (GET /api/v1/projects/{id}/agreement)',
  '/projects/lifecycle': 'ProjectsController (GET /api/v1/projects/lifecycle)',
  '/team': 'TeamsController (GET /api/v1/teams/my-team, GET /api/v1/teams/eligibility)',
  '/project/periods': 'ProjectPeriodsController (GET /api/v1/academic/project-periods)',
  '/team/create': 'TeamsController (POST /api/v1/teams)',
  '/topics': 'TopicsController (GET /api/v1/topics/catalogue)',
  '/project/source': 'ProjectsController, TopicsController (GET /api/v1/projects/registration-sources)',
  '/project/register': 'ProjectsController (POST /api/v1/projects/submit)',
  '/project/edit': 'ProjectsController (PUT /api/v1/projects/{id}/resubmit)',
  '/project/status': 'ProjectsController, WorkflowContextController (GET /api/v1/projects/my-status)',
  '/project/supervisor': 'SupervisorsController (GET /api/v1/supervisors, POST /requests)',
  '/project/final-submission': 'FinalSubmissionsController (POST /api/v1/projects/{id}/final-submission)',
  '/project/result': 'ProjectResultsController (GET /api/v1/projects/{id}/results/student)',
  '/project/timeline': 'ReviewGatesController (GET /api/v1/projects/{id}/review-timeline)',
  '/project/review-gates': 'ReviewGatesController (GET /api/v1/projects/{id}/review-gates)',
  '/academic/assistant': 'AiAssistantController (POST /api/v1/ai/assistant/ask)',
  '/supervisor/workspace': 'SupervisorsController, WorkflowContextController (GET /api/v1/supervisors/workspace)',
  '/supervisor/profile': 'SupervisorsController (GET /api/v1/supervisors/me)',
  '/supervisor/dashboard': 'DashboardsController, SupervisorsController (GET /api/v1/dashboards/supervisor)',
  '/mentor/workspace': 'MentorsController, WorkflowContextController (GET /api/v1/mentors/workspace)',
  '/evaluator/evaluations': 'EvaluationDraftsController, EvaluatorsController (GET /api/v1/evaluators/evaluations)',
  '/evaluator/evaluations/:evaluationId': 'EvaluationDraftsController (GET /api/v1/evaluation-drafts/{id})',
  '/evaluator/projects/:projectId/final-submission': 'FinalSubmissionsController (GET /api/v1/projects/{id}/final-submission)',
  '/evaluator/workspace': 'EvaluatorsController, WorkflowContextController (GET /api/v1/evaluators/workspace)',
  '/evaluator/assignments/:assignmentId': 'EvaluatorsController (GET /api/v1/evaluators/assignments/{id})',
  '/review/gate-assignments': 'ReviewGatesController (GET /api/v1/review-gates/assigned)',
  '/department/workspace': 'DashboardsController, ProjectsController (GET /api/v1/department/workspace)',
  '/department/projects/progress-matrix': 'ReviewGatesController, DashboardsController',
  '/academic': 'AcademicHierarchyController (GET /api/v1/academic/hierarchy)',
  '/academic/governance': 'DisciplineGovernanceController (GET /api/v1/academic/governance)',
  '/academic/project-periods/:periodId/policy': 'PeriodPoliciesController (GET /api/v1/academic/periods/{id}/policy)',
  '/academic/project-periods/:periodId/review-gates': 'ReviewGatesController (GET /api/v1/academic/periods/{id}/gates)',
  '/academic/project-periods/:periodId/room-planner': 'AcademicTrackingController (Room Planner PR #145 / API)',
  '/academic/review-gates': 'ReviewGatesController (GET /api/v1/academic/review-gates)',
  '/academic/profile-verifications': 'StudentQualificationsController (GET /api/v1/academic/verifications)',
  '/academic/rubrics': 'RubricsController (GET /api/v1/rubrics)',
  '/academic/knowledge': 'AcademicKnowledgeController (GET /api/v1/academic/knowledge)',
  '/review/projects/:projectId/corrections': 'ResultAppealsController, ProjectsController',
  '/department/portfolio': 'DashboardsController, ProjectsController (GET /api/v1/department/portfolio)',
  '/department/projects/archived': 'ProjectsController (GET /api/v1/department/projects/archived)',
  '/department/projects/review': 'ProjectsController (GET /api/v1/department/projects/review)',
  '/department/projects/review/:id': 'ProjectsController (GET /api/v1/department/projects/{id}/review)',
  '/department/projects/:projectId/result': 'ProjectResultsController (GET /api/v1/projects/{id}/results/official)',
  '/department/projects/:projectId/corrections': 'ResultAppealsController',
  '/department/projects/:projectId/evaluations': 'EvaluationDraftsController, EvaluatorsController',
  '/department/projects/:projectId/evaluators': 'EvaluatorAssignmentManagementPage API',
  '/department/projects/:projectId/evaluation-schemes': 'EvaluationSchemesController',
  '/department/projects/:projectId/governance': 'DisciplineGovernanceController',
  '/department/projects/:projectId/defense': 'AcademicTrackingController (GET /api/v1/defense/sessions)',
  '/department/projects/:projectId/final-requirements': 'FinalSubmissionsController (GET /api/v1/projects/{id}/final-requirements)',
  '/department/projects/:projectId/final-submission': 'FinalSubmissionsController (GET /api/v1/projects/{id}/final-submission)',
  '/department/projects/:projectId/files': 'FilesController (GET /api/v1/projects/{id}/files)',
  '/department/projects/:projectId/contributions': 'ContributionsController (GET /api/v1/projects/{id}/contributions)',
  '/department/projects/:projectId/risk': 'AiInsightsController (GET /api/v1/department/projects/{id}/risk)',
  '/department/projects/:projectId/archive-view': 'ProjectsController (GET /api/v1/projects/{id}/archive)',
  '/department/supervisors': 'SupervisorsController (GET /api/v1/supervisors/department)',
  '/department/supervisors/:id': 'SupervisorsController (GET /api/v1/supervisors/{id})',
  '/department/student-qualifications': 'StudentQualificationsController (GET /api/v1/academic/student-qualifications)',
  '/department/topics': 'TopicsController (GET /api/v1/topics/department)',
  '/department/topics/:id': 'TopicsController (GET /api/v1/topics/{id})',
  '/department/cold-templates': 'ColdSubmissionsController (GET /api/v1/cold-templates)',
  '/admin/access': 'UsersController, RolesController, AccessEventsController (GET /api/v1/users, GET /api/v1/security/access-events)',
  '/admin/portfolio': 'DashboardsController, ProjectsController (GET /api/v1/admin/portfolio)',
  '/admin/projects/:projectId/evaluation-schemes': 'EvaluationSchemesController',
  '/admin/projects/:projectId/evaluators': 'EvaluatorAssignmentManagementPage API',
  '/admin/projects/:projectId/final-submission': 'FinalSubmissionsController',
  '/admin/projects/:projectId/result': 'ProjectResultsController',
  '/admin/milestone-templates': 'MilestonesController (GET /api/v1/milestone-templates)',
  '/admin/access/rbac': 'RolesController, PermissionsController (GET /api/v1/roles, GET /api/v1/permissions)',
  '/admin/access/users/:userId': 'UsersController (GET /api/v1/users/{id})',
  '/admin/industry': 'IndustryController (GET /api/v1/industry/invitations)',
  '/preview/workflows': 'WorkflowPreviewPage (Mock / Preview)',
  '/*': 'None (Client 404 Catch-all)',
}

// Traverse AST to find createBrowserRouter call
function findCreateBrowserRouter(node) {
  if (ts.isCallExpression(node) && node.expression.getText(sf) === 'createBrowserRouter') {
    return node
  }
  return ts.forEachChild(node, findCreateBrowserRouter)
}

const callNode = findCreateBrowserRouter(sf)
if (!callNode) {
  console.error('Could not find createBrowserRouter call in router index.tsx')
  process.exit(1)
}

const routes = []
let globalLineIndex = 0

function extractRoutes(elements, context) {
  for (const el of elements) {
    if (ts.isSpreadElement(el)) {
      let expr = el.expression
      while (ts.isParenthesizedExpression(expr)) {
        expr = expr.expression
      }
      if (ts.isConditionalExpression(expr)) {
        const flagName = expr.condition.getText(sf).trim()
        if (ts.isArrayLiteralExpression(expr.whenTrue)) {
          extractRoutes(expr.whenTrue.elements, {
            ...context,
            featureFlag: flagName,
          })
        }
      }
    } else if (ts.isObjectLiteralExpression(el)) {
      let pathVal = null
      let isIndex = false
      let elementVal = null
      let childrenArray = null
      const startLine = sf.getLineAndCharacterOfPosition(el.getStart(sf)).line + 1

      for (const prop of el.properties) {
        if (!ts.isPropertyAssignment(prop)) continue
        const propName = prop.name.getText(sf)
        if (propName === 'path') {
          pathVal = prop.initializer.getText(sf).replace(/^['"`]|['"`]$/g, '')
        } else if (propName === 'index') {
          isIndex = prop.initializer.getText(sf) === 'true'
        } else if (propName === 'element') {
          elementVal = prop.initializer.getText(sf)
        } else if (propName === 'children' && ts.isArrayLiteralExpression(prop.initializer)) {
          childrenArray = prop.initializer
        }
      }

      let nextRole = context.role
      let nextGuard = context.guard
      let nextPrefix = context.prefix

      // RoleRoute extraction
      if (elementVal && elementVal.includes('RoleRoute')) {
        const roleMatch = elementVal.match(/allowed=\{\[([^\]]+)\]\}/)
        if (roleMatch) {
          nextRole = roleMatch[1].replace(/['"`\s]/g, '')
        }
      }

      // Route Guards extraction
      if (elementVal) {
        if (elementVal.includes('ActiveStudentProjectRoute')) nextGuard = 'ActiveStudentProjectRoute'
        else if (elementVal.includes('SupervisorExecutionRoute')) nextGuard = 'SupervisorExecutionRoute'
        else if (elementVal.includes('MentorExecutionRoute')) nextGuard = 'MentorExecutionRoute'
        else if (elementVal.includes('EvaluatorAssignmentRoute')) nextGuard = 'EvaluatorAssignmentRoute'
        else if (elementVal.includes('DepartmentAcademicScopeRoute')) nextGuard = 'DepartmentAcademicScopeRoute'
        else if (elementVal.includes('AdminEvaluationLayout')) nextGuard = 'AdminEvaluationLayout'
        else if (elementVal.includes('IndustryLayout')) nextGuard = 'IndustryLayout'
        else if (elementVal.includes('IndustryEnrollmentRoute')) nextGuard = 'IndustryEnrollmentRoute'
      }

      // Path Prefix
      let effectivePath = null
      if (pathVal !== null) {
        if (nextPrefix) {
          effectivePath = `${nextPrefix}/${pathVal}`.replace(/\/+/g, '/')
        } else {
          effectivePath = pathVal.startsWith('/') ? pathVal : `/${pathVal}`
        }
      } else if (isIndex) {
        effectivePath = nextPrefix ? (nextPrefix.startsWith('/') ? nextPrefix : `/${nextPrefix}`) : '/'
      }

      // Check Component
      const compMatch = elementVal ? elementVal.match(/<([A-Z][a-zA-Z0-9]+)/) : null
      const componentName = compMatch ? compMatch[1] : (isIndex ? 'HomeRedirect' : 'Layout')

      const isStructuralWrapper = [
        'RouteFrame', 'AppLayout', 'ProtectedRoute', 'AcademicWorkflowGate',
        'StudentJourneyProvider', 'RoleRoute', 'ActiveStudentProjectRoute',
        'SupervisorExecutionRoute', 'MentorExecutionRoute', 'EvaluatorAssignmentRoute',
        'DepartmentAcademicScopeRoute', 'DepartmentProjectLayout'
      ].includes(componentName)

      if ((pathVal !== null || isIndex) && !isStructuralWrapper) {
        globalLineIndex++
        routes.push({
          index: globalLineIndex,
          rawPath: pathVal || (isIndex ? '(index)' : ''),
          fullPath: effectivePath,
          component: componentName,
          role: nextRole,
          guard: nextGuard,
          featureFlag: context.featureFlag,
          line: startLine,
          apiMapping: ROUTE_API_MAPPING[effectivePath] || ROUTE_API_MAPPING[pathVal ? `/${pathVal}` : ''] || 'Workflow / Context Controller'
        })
      }

      if (childrenArray) {
        extractRoutes(childrenArray.elements, {
          role: nextRole,
          guard: nextGuard,
          featureFlag: context.featureFlag,
          prefix: effectivePath || nextPrefix,
        })
      }
    }
  }
}

const rootArg = callNode.arguments[0]
if (ts.isArrayLiteralExpression(rootArg)) {
  extractRoutes(rootArg.elements, {
    role: 'Public / Authenticated',
    guard: 'None',
    featureFlag: 'None',
    prefix: '',
  })
}

console.log(`Parsed ${routes.length} actionable routes via TypeScript AST.`)

// Ensure uniqueness by fullPath + role
const uniqueRoutes = []
const seen = new Set()
for (const r of routes) {
  const key = `${r.fullPath}|${r.role}`
  if (!seen.has(key)) {
    seen.add(key)
    uniqueRoutes.push(r)
  }
}

// 1. Generate Markdown ROUTE_INVENTORY.generated.md
const mdHeader = `# ROUTE INVENTORY — AI-PMS Frontend
> Auto-generated by \`scripts/route-inventory.mjs\` via TypeScript AST from \`src/app/router/index.tsx\`.
> Total Actionable Routes: **${uniqueRoutes.length}**
> Audit Resolution: Correctly isolates feature flags and role guards per AST scope (fixes F-ROUTE-01 / Q-01).

| Index | Resolved Path | Raw Path | Component | Allowed Roles | Guard | Feature Flag | Source Line |
|---|---|---|---|---|---|---|---|
`

const mdRows = uniqueRoutes.map((r, idx) => {
  return `| ${idx + 1} | \`${r.fullPath}\` | \`${r.rawPath}\` | \`${r.component}\` | \`${r.role}\` | \`${r.guard}\` | \`${r.featureFlag}\` | L${r.line} |`
}).join('\n')

const outMdPath = path.resolve(rootDir, 'docs/uiux/ROUTE_INVENTORY.generated.md')
fs.writeFileSync(outMdPath, `${mdHeader}${mdRows}\n`, 'utf8')
console.log(`Written ${outMdPath}`)

// 2. Generate CSV ROUTE_CENSUS.csv
const csvHeader = 'Index,ResolvedPath,RawPath,Component,AllowedRoles,Guard,FeatureFlag,SourceLine\n'
const csvRows = uniqueRoutes.map((r, idx) => {
  return `${idx + 1},"${r.fullPath}","${r.rawPath}","${r.component}","${r.role}","${r.guard}","${r.featureFlag}",${r.line}`
}).join('\n')

const outCsvPath = path.resolve(rootDir, 'docs/uiux/ROUTE_CENSUS.csv')
fs.writeFileSync(outCsvPath, `${csvHeader}${csvRows}\n`, 'utf8')
console.log(`Written ${outCsvPath}`)

// 3. Generate ROUTE_TEST_MATRIX.md (Route x Role x State x API Matrix)
const matrixHeader = `# ROUTE TEST MATRIX — Route × Role × State × API
> Comprehensive test denominator mapping every frontend route to required interaction states, roles, and authoritative backend APIs.
> Governed by AI_PMS_SHARED_GOVERNANCE_RULES.md (Rule 4: 10+ states matrix).

| Index | Route | Primary Role | Enforced Guard | Feature Flag | Authoritative Backend API | Required States to Verify |
|---|---|---|---|---|---|---|
`

const matrixRows = uniqueRoutes.map((r, idx) => {
  const states = 'Loading, Empty/Filtered, Blocked, 401, 403, 404, 409, 5xx/Retry, Success'
  return `| ${idx + 1} | \`${r.fullPath}\` | \`${r.role}\` | \`${r.guard}\` | \`${r.featureFlag}\` | \`${r.apiMapping}\` | ${states} |`
}).join('\n')

const outMatrixPath = path.resolve(rootDir, 'docs/uiux/ROUTE_TEST_MATRIX.md')
fs.writeFileSync(outMatrixPath, `${matrixHeader}${matrixRows}\n`, 'utf8')
console.log(`Written ${outMatrixPath}`)
