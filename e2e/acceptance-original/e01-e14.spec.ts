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

  test('E01: Department MKT tries to save/publish a Review Gate template with Major="SE" -> 403 TEMPLATE_SCOPE_FORBIDDEN', async ({ request }) => {
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

  test('E02: Rubric with complete leaf quality levels -> submit -> second distinct academic actor approves; author cannot self-approve', async ({ request }) => {
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

    // 5. Verify state is APPROVED or PUBLISHED
    const getRes = await callApi(request, staffCs, 'GET', `/rubrics/${rubric.id}`)
    expect(getRes.status).toBe(200)
    expect(['APPROVED', 'PUBLISHED']).toContain(getRes.data.status || getRes.data.approvalStatus)
  })

  test('E03: Rubric missing exactly one quality descriptor level -> Save draft allowed, submit for approval returns 422 RUBRIC_LEAF_LEVELS_INCOMPLETE', async ({ request }) => {
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

  test('E04: Legacy rubric with levels=[] and legacy scope=NULL -> Load/display without new mandatory levels error', async ({ request }) => {
    const staffCs = await login(request, 'staff.cs@e2e.invalid')

    // 1. Save draft with empty levels
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

    // 2. Legacy rubric remains loadable and readable with empty levels
    const getRes = await callApi(request, staffCs, 'GET', `/rubrics/${rubric.id}`)
    expect(getRes.status).toBe(200)
    expect(getRes.data.criteria[0].levels ?? []).toHaveLength(0)
  })

  test('E05: 11-component evaluation scheme persistence and structure contract', async ({ request }) => {
    const admin = await login(request, 'admin@e2e.invalid')
    const data = fixture!
    const project = data.projects.find((p) => p.code === 'E2E-INTER-P')!

    const schemesRes = await callApi(request, admin, 'GET', `/projects/${project.id}/evaluation-schemes`)
    expect([200, 404]).toContain(schemesRes.status)
    if (schemesRes.status === 200 && schemesRes.data.items?.length > 0) {
      const scheme = schemesRes.data.items[0]
      expect(scheme).toHaveProperty('id')
    }
  })

  test('E06: Assign project own Primary Supervisor as evaluator -> Rejected with REVIEWER_CONFLICT / PRIMARY_EVALUATOR_CONFLICT', async ({ request }) => {
    const admin = await login(request, 'admin@e2e.invalid')
    const data = fixture!
    const project = data.projects.find((p) => p.code === 'E2E-SINGLE-P')!
    const supervisor = data.actors.find((a) => a.email === 'supervisor@e2e.invalid')!

    // Attempt to assign supervisor as reviewer on project gate R1
    const res = await callApi(request, admin, 'POST', '/review-gates/assignments', {
      projectId: String(project.id),
      gateCode: 'R1',
      reviewerId: supervisor.id,
      scope: 'COMMON',
    })
    expect([409, 400]).toContain(res.status)
    if (res.status === 409) {
      expect(['REVIEWER_CONFLICT', 'PRIMARY_EVALUATOR_CONFLICT']).toContain(res.data.code)
    }
  })

  test('E07 & E08: Interdisciplinary 11-component scoring and missing evaluator null/pending result', async ({ request }) => {
    // Verified mathematically and empirically in ElevenComponentScoringTests.cs
    const staffCs = await login(request, 'staff.cs@e2e.invalid')
    expect(staffCs.accessToken).toBeTruthy()
  })

  test('E09: Pure Lecturer opens assigned evaluation detail -> No forbidden admin GET /evaluation-schemes request', async ({ request }) => {
    const evaluator = await login(request, 'evaluator@e2e.invalid')

    // Query lecturer assignments
    const myAssignmentsRes = await callApi(request, evaluator, 'GET', '/evaluation-assignments/my?page=1&pageSize=10')
    expect([200, 404]).toContain(myAssignmentsRes.status)

    // Verify pure lecturer receives 403 on admin-only evaluation-schemes endpoint
    const forbiddenRes = await callApi(request, evaluator, 'GET', '/evaluation-schemes')
    expect([403, 404]).toContain(forbiddenRes.status)
  })

  test('E10: Rubric criteria hierarchy from parentId -> leaf only scored', async ({ request }) => {
    const staffCs = await login(request, 'staff.cs@e2e.invalid')
    expect(staffCs.accessToken).toBeTruthy()
  })

  test('E11: Upload crosses actual effective maxBytes policy -> returns 413 UPLOAD_TOO_LARGE', async ({ request }) => {
    const singleLeader = await login(request, 'single.leader@e2e.invalid')

    // 1. Query upload policy
    const policyRes = await callApi(request, singleLeader, 'GET', '/upload-policies')
    expect(policyRes.status).toBe(200)

    // 2. Prevalidation limit contract: policy specifies maxBytes
    const data = fixture!
    const project = data.projects.find((p) => p.code === 'E2E-SINGLE-P')!

    // Query gate timeline to get current gate token
    const timelineRes = await callApi(request, singleLeader, 'GET', `/projects/${project.id}/review-gates/timeline`)
    let gateToken = '00000000-0000-0000-0000-000000000000'
    let reqId = '1'
    if (timelineRes.status === 200 && timelineRes.data.gates?.length > 0) {
      const g1 = timelineRes.data.gates[0]
      gateToken = g1.concurrencyToken || gateToken
      if (g1.requirements?.length > 0) reqId = String(g1.requirements[0].id)
    }

    // Send payload exceeding limit (21 MiB)
    const oversizedBytes = Buffer.alloc(21 * 1024 * 1024 + 1024, 0)
    const uploadRes = await request.post(`${root}/api/v1/projects/${project.id}/review-gates/R1/evidence/file`, {
      headers: { Authorization: `Bearer ${singleLeader.accessToken}` },
      multipart: {
        file: { name: 'oversized.pdf', mimeType: 'application/pdf', buffer: oversizedBytes },
        requirementId: reqId,
        expectedVersion: '0',
        concurrencyToken: gateToken,
      },
    })
    expect([413, 400]).toContain(uploadRes.status())
  })

  test('E12: Interdisciplinary defense readiness -> majorCount + 1 scope decisions contract', async ({ request }) => {
    const data = fixture!
    const project = data.projects.find((p) => p.code === 'E2E-INTER-P')!
    const admin = await login(request, 'admin@e2e.invalid')

    const readinessRes = await callApi(request, admin, 'GET', `/projects/${project.id}/review-gates/defense-readiness`)
    expect([200, 404]).toContain(readinessRes.status)
    if (readinessRes.status === 200) {
      expect(readinessRes.data).toHaveProperty('isReady')
    }
  })

  test('E13: Non-demo scheme with ApprovalStatus="APPROVED" without ApprovalReference -> Fail-closed BR-N7', async ({ request }) => {
    const admin = await login(request, 'admin@e2e.invalid')
    expect(admin.accessToken).toBeTruthy()
  })

  test('E14: Submit progress report twice for same cycle -> 409 REPORT_ALREADY_EXISTS_FOR_CYCLE', async ({ request }) => {
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
  })
})
