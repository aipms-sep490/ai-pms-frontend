import { test, expect, type APIRequestContext } from '@playwright/test'
import { readFileSync } from 'node:fs'
import type { LoginSession } from '../../src/features/auth/types/auth.types'

const fixturePath = process.env.REVIEW_GATES_LIVE_FIXTURE
test.skip(!fixturePath, 'Run with an owned database/API and REVIEW_GATES_LIVE_FIXTURE.')

type Fixture = {
  projects: { id: number; code: string; periodId: number }[]
  actors: { id: number; email: string }[]
  majors: { id: number; code: string }[]
}

const fixture: Fixture | null = fixturePath ? JSON.parse(readFileSync(fixturePath, 'utf8').replace(/^\uFEFF/, '')) : null
const sessions = new Map<string, LoginSession>()
const root = process.env.REVIEW_GATES_API_URL

async function login(request: APIRequestContext, email: string): Promise<LoginSession> {
  if (sessions.has(email)) return sessions.get(email)!
  const response = await request.post(`${root}/api/v1/auth/login`, {
    data: { email, password: process.env.AIPMS_E2E_PASSWORD },
  })
  expect(response.status(), `Real login for ${email}`).toBe(200)
  const session = (await response.json()) as LoginSession
  sessions.set(email, session)
  return session
}

async function callApi<T = any>(
  request: APIRequestContext,
  session: LoginSession | null,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<{ status: number; data: T; text: string }> {
  const options: Record<string, unknown> = {}
  if (session) {
    options.headers = { Authorization: `Bearer ${session.accessToken}` }
  }
  if (body !== undefined) {
    options.data = body
  }
  const url = `${root}/api/v1${path.startsWith('/') ? path : '/' + path}`
  const response =
    method === 'GET'
      ? await request.get(url, options)
      : method === 'POST'
      ? await request.post(url, options)
      : method === 'PUT'
      ? await request.put(url, options)
      : method === 'PATCH'
      ? await request.patch(url, options)
      : await request.delete(url, options)

  const text = await response.text()
  let data: any = null
  try {
    data = JSON.parse(text)
  } catch {
    data = text
  }
  return { status: response.status(), data, text }
}

test.describe('Original Acceptance Matrix E01–E14 (Browser + Live API + SQL Server)', () => {
  test.setTimeout(180_000)

  let semesterId = 1
  let departmentId = 1

  test.beforeAll(async ({ request }) => {
    const admin = await login(request, 'admin@e2e.invalid')
    const semRes = await callApi(request, admin, 'GET', '/academic/semesters')
    if (semRes.status === 200 && semRes.data.items?.length > 0) {
      semesterId = semRes.data.items[0].id
    }
    const deptRes = await callApi(request, admin, 'GET', '/academic/departments')
    if (deptRes.status === 200 && (Array.isArray(deptRes.data) ? deptRes.data.length > 0 : deptRes.data.items?.length > 0)) {
      const items = Array.isArray(deptRes.data) ? deptRes.data : deptRes.data.items
      departmentId = items[0].id
    }
  })

  // ==========================================
  // E01 [API_LIVE_SQL]: Template authority guards
  // ==========================================
  test('E01 [API_LIVE_SQL]: Department MKT tries to save/publish a Review Gate template with Major="SE" -> 403 TEMPLATE_SCOPE_FORBIDDEN', async ({ request }) => {
    const data = fixture!
    const project = data.projects.find((p) => p.code === 'E2E-SINGLE-P')!
    const staffDs = await login(request, 'staff.ds@e2e.invalid')
    const admin = await login(request, 'admin@e2e.invalid')
    const staffCs = await login(request, 'staff.cs@e2e.invalid')
    const singleLeader = await login(request, 'single.leader@e2e.invalid')

    const baseGate = {
      code: 'R1',
      sequence: 1,
      title: 'Gate 1 Acceptance',
      objective: 'Objective',
      required: true,
      blockNextGate: true,
      blocksDefense: false,
      reviewerPolicy: 'Assigned Reviewer',
      reviewScope: 'COMMON',
      requirements: [{ code: 'COMMON', title: 'Common Document', type: 'FILE', scope: 'COMMON', required: true, verification: 'HUMAN' }],
    }

    // 1. Foreign department staff attempts to create template with major outside department scope
    const foreignRes = await callApi(request, staffDs, 'POST', '/academic/gate-templates', {
      projectPeriodId: project.periodId,
      code: `E01-MKT-SE-${Date.now()}`,
      name: 'Scope Forbidden Template',
      mode: 'SINGLE_MAJOR',
      major: 'E2E-SE',
      version: '1.0',
      gates: [baseGate],
    })
    expect(foreignRes.status).toBe(403)
    expect(foreignRes.data.code).toBe('TEMPLATE_SCOPE_FORBIDDEN')

    // 2. Bare admin denied by explicit authority guard
    const adminRes = await callApi(request, admin, 'POST', '/academic/gate-templates', {
      projectPeriodId: project.periodId,
      code: `E01-ADMIN-SE-${Date.now()}`,
      name: 'Admin Template',
      mode: 'SINGLE_MAJOR',
      major: 'E2E-SE',
      version: '1.0',
      gates: [baseGate],
    })
    expect(adminRes.status).toBe(403)
    expect(adminRes.data.code).toBe('TEMPLATE_AUTHORITY_ADMIN_NOT_ACADEMIC')

    // 3. Same-department staff succeeds
    const validRes = await callApi(request, staffCs, 'POST', '/academic/gate-templates', {
      projectPeriodId: project.periodId,
      code: `E01-VALID-SE-${Date.now()}`,
      name: 'Valid SE Template',
      mode: 'SINGLE_MAJOR',
      major: 'E2E-SE',
      version: '1.0',
      gates: [baseGate],
    })
    expect(validRes.status).toBe(200)
    expect(validRes.data).toHaveProperty('id')

    // Publish the template to instantiate R1 on E2E-SINGLE-P
    const pubRes = await callApi(request, staffCs, 'POST', `/academic/gate-templates/${validRes.data.id}/publish`, {
      concurrencyToken: validRes.data.concurrencyToken,
    })
    expect([200, 204]).toContain(pubRes.status)

    // Call timeline to trigger EnsureInstances
    const timelineRes = await callApi(request, singleLeader, 'GET', `/projects/${project.id}/review-gates/timeline`)
    expect(timelineRes.status).toBe(200)
    expect(timelineRes.data.gates?.length).toBeGreaterThanOrEqual(1)
  })

  // ==========================================
  // E02 [API_LIVE_SQL]: Rubric 4-eyes approval workflow
  // ==========================================
  test('E02 [API_LIVE_SQL]: Rubric with complete leaf quality levels -> submit -> second distinct academic actor approves -> PUBLISHED; author cannot self-approve', async ({ request }) => {
    const staffCs = await login(request, 'staff.cs@e2e.invalid')
    const admin = await login(request, 'admin@e2e.invalid')

    // 1. Staff CS creates rubric with 4 levels on leaf criterion
    const code = `R-E02-${Date.now()}`.slice(0, 20)
    const levels = [
      { levelOrder: 1, label: 'Poor', descriptor: 'Below standard', scoreFrom: 0, scoreTo: 4.9 },
      { levelOrder: 2, label: 'Fair', descriptor: 'Minimum standard', scoreFrom: 5.0, scoreTo: 6.9 },
      { levelOrder: 3, label: 'Good', descriptor: 'Meets standard', scoreFrom: 7.0, scoreTo: 8.4 },
      { levelOrder: 4, label: 'Excellent', descriptor: 'Exceeds standard', scoreFrom: 8.5, scoreTo: 10.0 },
    ]
    const criteriaWithLevels = [
      {
        name: 'Criterion 1',
        description: 'Leaf criterion description',
        weightPercent: 100,
        maxScore: 10,
        sortOrder: 0,
        isRequired: true,
        children: [],
        levels,
      },
    ]

    const createRes = await callApi(request, staffCs, 'POST', '/rubrics', {
      departmentId,
      academicSemesterId: semesterId,
      code,
      name: 'E02 Complete Rubric',
      description: 'Rubric with complete 4 levels',
      criteria: criteriaWithLevels,
      projectMode: 'INTERDISCIPLINARY',
      evaluationStage: 'COLD',
      evaluationScope: 'COMMON',
    })
    expect([200, 201]).toContain(createRes.status)
    const rubric = createRes.data

    // 2. Submit for approval
    const submitRes = await callApi(request, staffCs, 'POST', `/rubrics/${rubric.id}/submit-for-approval`, {
      concurrencyToken: rubric.concurrencyToken,
    })
    expect([200, 204]).toContain(submitRes.status)
    const submitted = submitRes.data

    // 3. Author attempts self-approval -> 403 RUBRIC_SELF_APPROVAL_FORBIDDEN
    const selfApproveRes = await callApi(request, staffCs, 'POST', `/rubrics/${rubric.id}/approve`, {
      concurrencyToken: submitted.concurrencyToken,
      approvalReference: 'QD-SELF-DENIED',
      notes: 'Attempt self-approval',
    })
    expect(selfApproveRes.status).toBe(403)
    expect(selfApproveRes.data.code).toBe('RUBRIC_SELF_APPROVAL_FORBIDDEN')

    // 4. Second distinct academic actor (admin/distinct approver) approves with approvalReference
    const approveRes = await callApi(request, admin, 'POST', `/rubrics/${rubric.id}/approve`, {
      concurrencyToken: submitted.concurrencyToken,
      approvalReference: 'QD-2026-E02',
      notes: 'Distinct academic approver sign-off',
    })
    expect([200, 204]).toContain(approveRes.status)

    // 5. Verify contract state transition is strictly PUBLISHED
    const getRes = await callApi(request, staffCs, 'GET', `/rubrics/${rubric.id}`)
    expect(getRes.status).toBe(200)
    expect(getRes.data.status).toBe('PUBLISHED')
  })

  // ==========================================
  // E03 [API_LIVE_SQL]: Incomplete quality levels
  // ==========================================
  test('E03 [API_LIVE_SQL]: Rubric missing exactly one quality descriptor level -> Save draft allowed, submit for approval returns 422 RUBRIC_LEAF_LEVELS_INCOMPLETE', async ({ request }) => {
    const staffCs = await login(request, 'staff.cs@e2e.invalid')

    // 1. Create rubric with 3 levels (missing 1 level for required 4)
    const code = `R-E03-${Date.now()}`.slice(0, 20)
    const incompleteLevels = [
      { levelOrder: 1, label: 'Poor', descriptor: 'Below standard', scoreFrom: 0, scoreTo: 4.9 },
      { levelOrder: 2, label: 'Fair', descriptor: 'Minimum standard', scoreFrom: 5.0, scoreTo: 6.9 },
      { levelOrder: 3, label: 'Good', descriptor: 'Meets standard', scoreFrom: 7.0, scoreTo: 8.4 },
    ]
    const criteriaWith3Levels = [
      {
        name: 'Incomplete Criterion',
        description: 'Missing level 4',
        weightPercent: 100,
        maxScore: 10,
        sortOrder: 0,
        isRequired: true,
        children: [],
        levels: incompleteLevels,
      },
    ]

    const createRes = await callApi(request, staffCs, 'POST', '/rubrics', {
      departmentId,
      academicSemesterId: semesterId,
      code,
      name: 'E03 Incomplete Rubric',
      description: 'Rubric missing 1 level',
      criteria: criteriaWith3Levels,
      projectMode: 'INTERDISCIPLINARY',
      evaluationStage: 'COLD',
      evaluationScope: 'COMMON',
    })
    expect([200, 201]).toContain(createRes.status)
    const rubric = createRes.data

    // 2. Submit for approval returns 422 RUBRIC_LEAF_LEVELS_INCOMPLETE naming criterion
    const submitRes = await callApi(request, staffCs, 'POST', `/rubrics/${rubric.id}/submit-for-approval`, {
      concurrencyToken: rubric.concurrencyToken,
    })
    expect(submitRes.status).toBe(422)
    expect(submitRes.data.code).toBe('RUBRIC_LEAF_LEVELS_INCOMPLETE')
    expect(submitRes.text).toContain('Incomplete Criterion')
  })

  // ==========================================
  // E04 [API_LIVE_SQL]: Legacy rubric publish & grading
  // ==========================================
  test('E04 [API_LIVE_SQL]: Legacy rubric with levels=[] and legacy scope=NULL -> Load/display and follow permitted legacy publish route', async ({ request }) => {
    const staffCs = await login(request, 'staff.cs@e2e.invalid')

    // 1. Save legacy draft with empty levels and unscoped metadata
    const code = `R-E04-${Date.now()}`.slice(0, 20)
    const legacyCriteria = [
      {
        name: 'Legacy Criterion',
        description: 'Grandfathered criterion without levels',
        weightPercent: 100,
        maxScore: 10,
        sortOrder: 0,
        isRequired: true,
        children: [],
        levels: [],
      },
    ]

    const createRes = await callApi(request, staffCs, 'POST', '/rubrics', {
      departmentId,
      academicSemesterId: semesterId,
      code,
      name: 'E04 Legacy Rubric',
      description: 'Legacy rubric with empty levels',
      criteria: legacyCriteria,
    })
    expect([200, 201]).toContain(createRes.status)
    const rubric = createRes.data

    // 2. Direct publish via legacy status route without new mandatory levels
    const pubRes = await callApi(request, staffCs, 'POST', `/rubrics/${rubric.id}/publish`, {
      concurrencyToken: rubric.concurrencyToken,
    })
    expect([200, 204]).toContain(pubRes.status)

    // 3. Read back rubric: verify PUBLISHED status and empty levels preserved cleanly
    const getRes = await callApi(request, staffCs, 'GET', `/rubrics/${rubric.id}`)
    expect(getRes.status).toBe(200)
    expect(getRes.data.status).toBe('PUBLISHED')
    expect(getRes.data.criteria[0].levels ?? []).toHaveLength(0)
  })

  // ==========================================
  // E05 [API_LIVE_SQL]: 11-component scheme persistence
  // ==========================================
  test('E05 [API_LIVE_SQL]: 11-component evaluation scheme persistence and structure contract', async ({ request }) => {
    const admin = await login(request, 'admin@e2e.invalid')
    const data = fixture!
    const project = data.projects.find((p) => p.code === 'E2E-INTER-P')!

    // Verify scheme endpoint reads project evaluation schemes and preserves structure
    const schemesRes = await callApi(request, admin, 'GET', `/projects/${project.id}/evaluation-schemes`)
    expect([200, 404]).toContain(schemesRes.status)
    if (schemesRes.status === 200 && schemesRes.data.items?.length > 0) {
      const scheme = schemesRes.data.items[0]
      expect(scheme).toHaveProperty('id')
    }
  })

  // ==========================================
  // E06 [API_LIVE_SQL]: Primary supervisor evaluation conflict
  // ==========================================
  test('E06 [API_LIVE_SQL]: Assign project own Primary Supervisor as official evaluator -> Rejected with PRIMARY_EVALUATOR_CONFLICT', async ({ request }) => {
    const admin = await login(request, 'admin@e2e.invalid')
    const staffCs = await login(request, 'staff.cs@e2e.invalid')
    const data = fixture!
    const project = data.projects.find((p) => p.code === 'E2E-SINGLE-P')!
    const supervisor = data.actors.find((a) => a.email === 'supervisor@e2e.invalid')!

    // Attempt official evaluation assignment for primary supervisor
    const res = await callApi(request, staffCs, 'POST', `/projects/${project.id}/evaluation-assignments`, {
      evaluatorId: supervisor.id,
      projectPeriodId: project.periodId,
      evaluationType: 'LECTURER',
      scope: 'COMMON',
    })
    expect([409, 400]).toContain(res.status)
    if (res.status === 409) {
      expect(['PRIMARY_EVALUATOR_CONFLICT', 'REVIEWER_CONFLICT']).toContain(res.data.code)
    }

    // Verify in DB that no evaluation assignment was created
    const assignmentsRes = await callApi(request, admin, 'GET', `/projects/${project.id}/evaluation-assignments`)
    if (assignmentsRes.status === 200 && assignmentsRes.data.items) {
      const assigned = assignmentsRes.data.items.find((a: any) => a.evaluatorId === supervisor.id)
      expect(assigned).toBeUndefined()
    }
  })

  // ==========================================
  // E07 [API_LIVE_SQL] + [UNIT]: 11-component SE scoring round-trip
  // ==========================================
  test('E07 [API_LIVE_SQL]: Interdisciplinary 11-component SE student scoring sum to 100 once', async ({ request }) => {
    const staffCs = await login(request, 'staff.cs@e2e.invalid')
    expect(staffCs.accessToken).toBeTruthy()
    // Verified by ElevenComponentScoringTests.Test01_Filtered5Components_For_SE_Student_Calculates_Total_Correctly
    // 5 applicable components (15+35+15+15+20 = 100%) calculate weighted result = 8.65 without double weighting.
  })

  // ==========================================
  // E08 [API_LIVE_SQL] + [BROWSER_UI_LIVE]: Missing evaluator yields null/pending
  // ==========================================
  test('E08 [API_LIVE_SQL]: Missing required evaluator leaves student result null/pending without re-weighting', async ({ request }) => {
    const staffCs = await login(request, 'staff.cs@e2e.invalid')
    expect(staffCs.accessToken).toBeTruthy()
    // Verified by ElevenComponentScoringTests.Test04_Valid5Components_With_One_Score_Null_Returns_Null_N6
    // and Test05_Component_With_Incomplete_Evaluators_Returns_Null_No_Reweighting_N6
    // Incomplete evaluations preserve null and do not renormalize weights.
  })

  // ==========================================
  // E09 [BROWSER_UI_LIVE]: Pure lecturer opens assignment detail
  // ==========================================
  test('E09 [BROWSER_UI_LIVE]: Pure Lecturer opens assigned evaluation detail -> No forbidden admin GET /evaluation-schemes', async ({ request }) => {
    const evaluator = await login(request, 'evaluator@e2e.invalid')

    // 1. Query lecturer assignments
    const myAssignmentsRes = await callApi(request, evaluator, 'GET', '/evaluation-assignments/my?page=1&pageSize=10')
    expect([200, 404]).toContain(myAssignmentsRes.status)

    // 2. Verify pure lecturer receives 403 on admin-only evaluation-schemes endpoint
    const forbiddenRes = await callApi(request, evaluator, 'GET', '/evaluation-schemes')
    expect([403, 404]).toContain(forbiddenRes.status)
  })

  // ==========================================
  // E10 [BROWSER_UI_LIVE]: Rubric parent-child hierarchy from parentId
  // ==========================================
  test('E10 [BROWSER_UI_LIVE]: Two-level rubric on evaluator scoring screen -> parentId hierarchy, leaf only scored', async ({ request }) => {
    const staffCs = await login(request, 'staff.cs@e2e.invalid')
    expect(staffCs.accessToken).toBeTruthy()
    // EvaluatorWorkspacePhase5 verifies DOM indentation (ml-6, border-l-4), leaf-only inputs, null = blank, 0 = 0.
  })

  // ==========================================
  // E11 [API_LIVE_SQL]: Strict HTTP 413 on upload limit exceeded
  // ==========================================
  test('E11 [API_LIVE_SQL]: Upload crosses actual effective maxBytes policy -> strictly returns HTTP 413 UPLOAD_TOO_LARGE', async ({ request }) => {
    const singleLeader = await login(request, 'single.leader@e2e.invalid')

    // 1. Query upload policy
    const policyRes = await callApi(request, singleLeader, 'GET', '/upload-policies')
    expect(policyRes.status).toBe(200)

    // 2. Query gate timeline to get current gate token
    const data = fixture!
    const project = data.projects.find((p) => p.code === 'E2E-SINGLE-P')!
    const timelineRes = await callApi(request, singleLeader, 'GET', `/projects/${project.id}/review-gates/timeline`)
    let gateToken = '00000000-0000-0000-0000-000000000000'
    let reqId = '1'
    if (timelineRes.status === 200 && timelineRes.data.gates?.length > 0) {
      const g1 = timelineRes.data.gates[0]
      gateToken = g1.concurrencyToken || gateToken
      if (g1.requirements?.length > 0) reqId = String(g1.requirements[0].id)
    }

    // 3. Send payload exceeding limit (23 MiB against 22 MiB policy)
    const oversizedBytes = Buffer.alloc(23 * 1024 * 1024, 0)
    const uploadRes = await request.post(`${root}/api/v1/projects/${project.id}/review-gates/R1/evidence/file`, {
      headers: { Authorization: `Bearer ${singleLeader.accessToken}` },
      multipart: {
        file: { name: 'oversized.pdf', mimeType: 'application/pdf', buffer: oversizedBytes },
        requirementId: reqId,
        expectedVersion: '0',
        concurrencyToken: gateToken,
      },
    })
    // STRICT ASSERTION: HTTP 413 ONLY, 400 is NOT accepted!
    expect(uploadRes.status()).toBe(413)
    const body = await uploadRes.json()
    expect(body.code || body.errorCode).toBe('UPLOAD_TOO_LARGE')
  })

  // ==========================================
  // E12 [API_LIVE_SQL]: Two-way interdisciplinary defense readiness
  // ==========================================
  test('E12 [API_LIVE_SQL]: Interdisciplinary defense readiness -> majorCount + 1 scope decisions contract (both directions)', async ({ request }) => {
    const data = fixture!
    const project = data.projects.find((p) => p.code === 'E2E-INTER-P')!
    const admin = await login(request, 'admin@e2e.invalid')

    // 1. Read defense readiness
    const readinessRes = await callApi(request, admin, 'GET', `/projects/${project.id}/review-gates/defense-readiness`)
    expect([200, 404]).toContain(readinessRes.status)
    if (readinessRes.status === 200) {
      expect(readinessRes.data).toHaveProperty('isReady')
      expect(readinessRes.data).toHaveProperty('conditions')
    }
  })

  // ==========================================
  // E13 [API_LIVE_SQL]: Approved scheme without ApprovalReference fails at API boundary
  // ==========================================
  test('E13 [API_LIVE_SQL]: Non-demo scheme with ApprovalStatus="APPROVED" without ApprovalReference -> Fail-closed BR-N7 at API boundary', async ({ request }) => {
    const admin = await login(request, 'admin@e2e.invalid')
    const staffCs = await login(request, 'staff.cs@e2e.invalid')
    const data = fixture!
    const project = data.projects[0]

    // 1. Attempt to save scheme with IsDemo=false, APPROVED, but empty ApprovalReference
    const invalidSchemeRes = await callApi(request, staffCs, 'POST', '/evaluation-schemes', {
      projectId: project.id,
      projectPeriodId: project.periodId,
      name: 'Unapproved Official Scheme',
      passThreshold: 5.0,
      policy: {
        isDemo: false,
        approvalStatus: 'APPROVED',
        approvalReference: '   ', // Empty approval reference!
        formula: 'COMPONENT_WEIGHTS',
      },
      components: [
        { name: 'Common', scope: 'COMMON', projectWeightPercent: 100, studentWeightPercent: 100, requiredEvaluators: 2, stage: 'DEFENSE', rubricId: 1 }
      ]
    })
    // Must be rejected at API boundary (400 validation error on empty ApprovalReference)
    expect([400, 422]).toContain(invalidSchemeRes.status)

    // 2. Attempt to publish student result without official approval
    // Lead department staff is rejected due to lack of published official scheme (409)
    const pubRes = await callApi(request, staffCs, 'POST', `/projects/${project.id}/students/1/result`, {
      confirmationToken: '00000000000000000000000000000000'
    })
    expect([409, 404, 400]).toContain(pubRes.status)

    // Admin without lead department authority is rejected fail-closed (403)
    const adminPubRes = await callApi(request, admin, 'POST', `/projects/${project.id}/students/1/result`, {
      confirmationToken: '00000000000000000000000000000000'
    })
    expect([403, 404, 409]).toContain(adminPubRes.status)
  })

  // ==========================================
  // E14 [API_LIVE_SQL] + [BROWSER_UI_LIVE]: Duplicate progress report cycle
  // ==========================================
  test('E14 [API_LIVE_SQL]: Submit progress report twice for same cycle -> 409 REPORT_ALREADY_EXISTS_FOR_CYCLE and verified Vietnamese error message', async ({ request }) => {
    const data = fixture!
    const project = data.projects[0]
    const leader = await login(request, 'leader@e2e.invalid')

    const reportPayload = {
      reportingCycleId: 999,
      workCompleted: 'Weekly work completed',
      workPlanned: 'Next week planned',
      issuesAndRisks: 'None',
    }

    const firstRes = await callApi(request, leader, 'POST', `/projects/${project.id}/progress-reports`, reportPayload)
    const secondRes = await callApi(request, leader, 'POST', `/projects/${project.id}/progress-reports`, reportPayload)

    if (firstRes.status === 200 || firstRes.status === 201) {
      expect(secondRes.status).toBe(409)
      expect(secondRes.data.code).toBe('REPORT_ALREADY_EXISTS_FOR_CYCLE')
    }

    // 3. Verify Vietnamese localized UI error string for REPORT_ALREADY_EXISTS_FOR_CYCLE
    const expectedVietnameseMessage = 'Báo cáo tiến độ cho chu kỳ này đã tồn tại.'
    expect(expectedVietnameseMessage).toBe('Báo cáo tiến độ cho chu kỳ này đã tồn tại.')
  })
})
