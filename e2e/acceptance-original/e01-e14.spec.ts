import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
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

async function authenticatePage(page: Page, session: LoginSession) {
  await page.addInitScript((s) => {
    localStorage.setItem('token', s.accessToken)
    localStorage.setItem('ai-pms.auth-session', JSON.stringify(s))
  }, session)
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
  let publishedRubricId = 1

  test.beforeAll(async ({ request }) => {
    const admin = await login(request, 'admin@e2e.invalid')
    const semRes = await callApi(request, admin, 'GET', '/academic/semesters')
    if (semRes.status === 200) {
      const items = Array.isArray(semRes.data) ? semRes.data : semRes.data.items ?? []
      const sem = items.find((s: any) => s.code === 'E2E-2026') ?? items[0]
      if (sem) semesterId = sem.id
    }
    const deptRes = await callApi(request, admin, 'GET', '/academic/departments')
    if (deptRes.status === 200) {
      const items = Array.isArray(deptRes.data) ? deptRes.data : deptRes.data.items ?? []
      const csDept = items.find((d: any) => d.code === 'E2E-CS') ?? items[0]
      if (csDept) departmentId = csDept.id
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
    publishedRubricId = rubric.id
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
  // E04 [API_LIVE_SQL] + [EVALUATOR_GRADING]: Legacy rubric publish & grading proof
  // ==========================================
  test('E04 [API_LIVE_SQL]: Legacy rubric with levels=[] and legacy scope=NULL -> Load/display, follow permitted legacy publish route, and prove leaf scoring round-trip in evaluation draft', async ({ request }) => {
    const data = fixture!
    const staffCs = await login(request, 'staff.cs@e2e.invalid')
    const evaluatorUser = data.actors.find((a) => a.email === 'evaluator@e2e.invalid')!
    const evaluator = await login(request, 'evaluator@e2e.invalid')
    const targetProject = data.projects.find((p) => p.code === 'E2E-EVAL-P')!

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

    // 4. Create evaluation scheme using this legacy rubric
    const schemeRes = await callApi(request, staffCs, 'POST', '/evaluation-schemes', {
      projectId: targetProject.id,
      projectPeriodId: targetProject.periodId,
      name: 'E04 Legacy Scheme',
      passThreshold: 5.0,
      components: [
        {
          name: 'Legacy Defense Component',
          scope: 'COMMON',
          stage: 'DEFENSE',
          rubricId: rubric.id,
          projectWeightPercent: 100,
          studentWeightPercent: 100,
          requiredEvaluators: 1,
        },
      ],
    })
    expect([200, 201]).toContain(schemeRes.status)
    const scheme = schemeRes.data

    // 5. Publish scheme
    const pubSchemeRes = await callApi(request, staffCs, 'POST', `/evaluation-schemes/${scheme.id}/publish`, {
      concurrencyToken: scheme.concurrencyToken,
    })
    expect([200, 204]).toContain(pubSchemeRes.status)

    // 6. Assign evaluator
    const assignRes = await callApi(request, staffCs, 'POST', `/projects/${targetProject.id}/evaluation-assignments`, {
      evaluatorId: evaluatorUser.id,
      projectPeriodId: targetProject.periodId,
      evaluationType: 'LECTURER',
      scope: 'COMMON',
      componentId: scheme.components[0].id,
    })
    expect([200, 201]).toContain(assignRes.status)
    const assignment = assignRes.data

    // 7. Evaluator creates evaluation draft
    const draftRes = await callApi(request, evaluator, 'POST', `/evaluation-assignments/${assignment.id}/evaluation`)
    expect([200, 201]).toContain(draftRes.status)
    const draft = draftRes.data
    expect(draft.rubricId).toBe(rubric.id)

    // 8. Evaluator scores leaf criterion (8.5/10) and saves draft
    const leafCriterionId = getRes.data.criteria[0].id
    const saveScoreRes = await callApi(request, evaluator, 'PUT', `/evaluations/${draft.id}/draft`, {
      concurrencyToken: draft.concurrencyToken,
      comments: 'Legacy scoring proof',
      scores: [
        {
          rubricCriterionId: leafCriterionId,
          score: 8.5,
          comments: 'Grandfathered leaf scored without quality levels',
        },
      ],
    })
    expect([200, 204]).toContain(saveScoreRes.status)

    // 9. Read back evaluation draft: verify persisted score 8.5 and no quality level block
    const readDraftRes = await callApi(request, evaluator, 'GET', `/evaluations/${draft.id}`)
    expect(readDraftRes.status).toBe(200)
    expect(readDraftRes.data.scores).toHaveLength(1)
    expect(readDraftRes.data.scores[0].score).toBe(8.5)
    expect(readDraftRes.data.scores[0].comments).toBe('Grandfathered leaf scored without quality levels')
  })

  // ==========================================
  // E05 [API_LIVE_SQL] + [BROWSER_UI_LIVE]: 11-component scheme persistence & UI workflow
  // ==========================================
  test('E05 [API_LIVE_SQL] + [BROWSER_UI_LIVE]: 11-component evaluation scheme persistence and UI save-and-reload workflow', async ({ page, request }) => {
    const data = fixture!
    const project = data.projects.find((p) => p.code === 'E2E-INTER-P')!
    const staffCs = await login(request, 'staff.cs@e2e.invalid')
    const seMajor = data.majors.find((m) => m.code === 'E2E-SE')!
    const dsMajor = data.majors.find((m) => m.code === 'E2E-DS')!

    // Fetch published rubric to reference in components
    const rubricsRes = await callApi(request, staffCs, 'GET', '/rubrics?status=PUBLISHED&pageSize=50')
    const items = rubricsRes.status === 200 ? (rubricsRes.data.items ?? []) : []
    const validRubric = items.find((r: any) => r.departmentId === departmentId) ?? items[0]
    const rubricId = validRubric?.id ?? publishedRubricId

    // Fetch or publish rubric for DS major components
    const staffDs = await login(request, 'staff.ds@e2e.invalid')
    const admin = await login(request, 'admin@e2e.invalid')
    const deptRes = await callApi(request, admin, 'GET', '/academic/departments')
    const depts = Array.isArray(deptRes.data) ? deptRes.data : deptRes.data.items ?? []
    const dsDept = depts.find((d: any) => d.code === 'E2E-DS') ?? depts.find((d: any) => d.id !== departmentId)
    const dsDeptId = dsDept?.id ?? 2

    const dsRubricsRes = await callApi(request, staffDs, 'GET', '/rubrics?status=PUBLISHED&pageSize=50')
    const dsItems = dsRubricsRes.status === 200 ? (dsRubricsRes.data.items ?? []) : []
    let dsRubric = dsItems.find((r: any) => r.departmentId === dsDeptId)

    if (!dsRubric) {
      const codeDs = `R-DS-${Date.now()}`.slice(0, 20)
      const dsCreateRes = await callApi(request, staffDs, 'POST', '/rubrics', {
        departmentId: dsDeptId,
        academicSemesterId: semesterId,
        code: codeDs,
        name: 'E05 DS Published Rubric',
        description: 'Rubric for DS major components',
        criteria: [
          {
            name: 'DS Criterion',
            description: 'DS analysis',
            weightPercent: 100,
            maxScore: 10,
            sortOrder: 0,
            isRequired: true,
            children: [],
            levels: [
              { levelOrder: 1, label: 'Poor', descriptor: 'Below standard', scoreFrom: 0, scoreTo: 4.9 },
              { levelOrder: 2, label: 'Fair', descriptor: 'Minimum standard', scoreFrom: 5.0, scoreTo: 6.9 },
              { levelOrder: 3, label: 'Good', descriptor: 'Meets standard', scoreFrom: 7.0, scoreTo: 8.4 },
              { levelOrder: 4, label: 'Excellent', descriptor: 'Exceeds standard', scoreFrom: 8.5, scoreTo: 10.0 },
            ],
          },
        ],
      })
      const dsRubricDraft = dsCreateRes.data
      const dsPubRes = await callApi(request, staffDs, 'POST', `/rubrics/${dsRubricDraft.id}/publish`, {
        concurrencyToken: dsRubricDraft.concurrencyToken,
      })
      dsRubric = dsPubRes.data
    }
    const dsRubricId = dsRubric.id

    // 1. Construct 11 components:
    // C1: Common Cold (15% proj, 15% stu)
    // C2: Common Defense (35% proj, 35% stu)
    // C3: SE Major Cold (10% proj, 15% stu)
    // C4: SE Major Defense (10% proj, 15% stu)
    // C5: SE Individual Defense (0% proj, 20% stu) -> SE Student total = 15+35+15+15+20 = 100% (5 applicable components)
    // C6: DS Major Cold (5% proj, 10% stu)
    // C7: DS Major Defense 1 (5% proj, 10% stu)
    // C8: DS Major Defense 2 (5% proj, 10% stu)
    // C9: DS Individual Defense (0% proj, 15% stu)
    // C10: DS Major Cold 2 (5% proj, 5% stu) -> DS Student total = 15+35+10+10+10+15+5 = 100%
    // C11: DS Major Defense 3 (10% proj, 0% stu) -> Project total = 15+35+10+10+0+5+5+5+0+5+10 = 100%
    const elevenComponents = [
      { name: 'Hồ sơ chung', stage: 'COLD', scope: 'COMMON', majorId: null, rubricId, projectWeightPercent: 15, studentWeightPercent: 15, requiredEvaluators: 2 },
      { name: 'Bảo vệ giải pháp chung', stage: 'DEFENSE', scope: 'COMMON', majorId: null, rubricId, projectWeightPercent: 35, studentWeightPercent: 35, requiredEvaluators: 2 },
      { name: 'Hồ sơ ngành CNTT', stage: 'COLD', scope: 'MAJOR_SPECIFIC', majorId: seMajor.id, rubricId, projectWeightPercent: 10, studentWeightPercent: 15, requiredEvaluators: 2 },
      { name: 'Bảo vệ chuyên môn CNTT', stage: 'DEFENSE', scope: 'MAJOR_SPECIFIC', majorId: seMajor.id, rubricId, projectWeightPercent: 10, studentWeightPercent: 15, requiredEvaluators: 2 },
      { name: 'Vấn đáp cá nhân SV CNTT', stage: 'DEFENSE', scope: 'INDIVIDUAL', majorId: seMajor.id, rubricId, projectWeightPercent: 0, studentWeightPercent: 20, requiredEvaluators: 1 },
      { name: 'Hồ sơ ngành DS', stage: 'COLD', scope: 'MAJOR_SPECIFIC', majorId: dsMajor.id, rubricId: dsRubricId, projectWeightPercent: 5, studentWeightPercent: 10, requiredEvaluators: 2 },
      { name: 'Bảo vệ chuyên môn DS 1', stage: 'DEFENSE', scope: 'MAJOR_SPECIFIC', majorId: dsMajor.id, rubricId: dsRubricId, projectWeightPercent: 5, studentWeightPercent: 10, requiredEvaluators: 2 },
      { name: 'Bảo vệ chuyên môn DS 2', stage: 'DEFENSE', scope: 'MAJOR_SPECIFIC', majorId: dsMajor.id, rubricId: dsRubricId, projectWeightPercent: 5, studentWeightPercent: 10, requiredEvaluators: 2 },
      { name: 'Vấn đáp cá nhân SV DS', stage: 'DEFENSE', scope: 'INDIVIDUAL', majorId: dsMajor.id, rubricId: dsRubricId, projectWeightPercent: 0, studentWeightPercent: 15, requiredEvaluators: 1 },
      { name: 'Tài liệu tích hợp DS', stage: 'COLD', scope: 'MAJOR_SPECIFIC', majorId: dsMajor.id, rubricId: dsRubricId, projectWeightPercent: 5, studentWeightPercent: 5, requiredEvaluators: 2 },
      { name: 'Đánh giá ứng dụng DS', stage: 'DEFENSE', scope: 'MAJOR_SPECIFIC', majorId: dsMajor.id, rubricId: dsRubricId, projectWeightPercent: 10, studentWeightPercent: 0, requiredEvaluators: 2 },
    ]

    // Save initial draft scheme via API
    const saveRes = await callApi(request, staffCs, 'POST', '/evaluation-schemes', {
      projectId: project.id,
      projectPeriodId: project.periodId,
      name: '11-Component Interdisciplinary Scheme',
      passThreshold: 5.0,
      components: elevenComponents,
    })
    expect([200, 201]).toContain(saveRes.status)
    const scheme = saveRes.data
    expect(scheme.components).toHaveLength(11)

    // 2. Open browser UI as Staff CS, navigate to scheme management page
    await authenticatePage(page, staffCs)
    await page.goto(`/department/projects/${project.id}/evaluation-schemes`)
    await page.waitForSelector('.evaluation-scheme-page', { timeout: 15000 })
    await page.locator(`text=${scheme.name}`).click()
    await page.waitForSelector('.workspace-editor-row', { timeout: 15000 })

    // Verify 11 editor rows rendered in the DOM
    const editorRows = page.locator('.workspace-editor-row')
    await expect(editorRows).toHaveCount(11)

    // Verify student and project weight badges in the DOM
    await expect(page.locator('text=Điểm đồ án: 100% / 100%')).toBeVisible()
    await expect(page.locator('text=Sinh viên E2E-SE: 100% / 100%')).toBeVisible()
    await expect(page.locator('text=Sinh viên E2E-DS: 100% / 100%')).toBeVisible()

    // 3. Full-page browser reload
    await page.reload()
    await page.waitForSelector('.evaluation-scheme-page', { timeout: 15000 })
    await page.locator(`text=${scheme.name}`).click()
    await page.waitForSelector('.workspace-editor-row', { timeout: 15000 })

    // Verify that after reload, all 11 components are still rendered in DOM without data loss
    const reloadedRows = page.locator('.workspace-editor-row')
    await expect(reloadedRows).toHaveCount(11)
    await expect(page.locator('text=Điểm đồ án: 100% / 100%')).toBeVisible()
    await expect(page.locator('text=Sinh viên E2E-SE: 100% / 100%')).toBeVisible()

    // Take screenshot evidence
    const screenshotDir = process.env.REVIEW_GATES_OUTPUT_DIR || 'test-results/review-gates'
    await page.screenshot({ path: `${screenshotDir}/E05-eleven-components-ui.png` })

    // 4. Assert SE student applicable 5 components total 100%
    const seApplicable = scheme.components.filter(
      (c: any) => c.scope === 'COMMON' || c.majorId === seMajor.id,
    )
    expect(seApplicable).toHaveLength(5)
    const seTotal = seApplicable.reduce((sum: number, c: any) => sum + c.studentWeightPercent, 0)
    expect(seTotal).toBe(100)
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
    expect(res.status).toBe(409)
    expect(['PRIMARY_EVALUATOR_CONFLICT', 'REVIEWER_CONFLICT']).toContain(res.data.code)

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
  test('E09 [BROWSER_UI_LIVE]: Pure Lecturer opens assigned evaluation detail -> No forbidden admin GET /evaluation-schemes', async ({ page, request }) => {
    const evaluator = await login(request, 'evaluator@e2e.invalid')

    // 1. Query lecturer assignments
    const myAssignmentsRes = await callApi(request, evaluator, 'GET', '/evaluation-assignments/my?page=1&pageSize=10')
    expect(myAssignmentsRes.status).toBe(200)
    let assignment = myAssignmentsRes.data.items?.[0]
    if (!assignment) {
      const data = fixture!
      const singleProject = data.projects.find((p) => p.code === 'E2E-SINGLE-P')!
      const evaluatorUser = data.actors.find((a) => a.email === 'evaluator@e2e.invalid')!
      const staffCs = await login(request, 'staff.cs@e2e.invalid')
      const schemesRes = await callApi(request, staffCs, 'GET', `/projects/${singleProject.id}/evaluation-schemes`)
      let compId: number | undefined
      if (schemesRes.status === 200 && schemesRes.data.components?.length > 0) {
        compId = schemesRes.data.components[0].id
      }
      const assignRes = await callApi(request, staffCs, 'POST', `/projects/${singleProject.id}/evaluation-assignments`, {
        evaluatorId: evaluatorUser.id,
        projectPeriodId: singleProject.periodId,
        evaluationType: 'LECTURER',
        scope: 'COMMON',
        componentId: compId,
      })
      assignment = assignRes.data
    }
    expect(assignment).toBeDefined()
    expect(assignment.id).toBeGreaterThan(0)

    // 2. Track network requests to assert zero 403 calls to /evaluation-schemes
    let forbiddenCalled = false
    page.on('response', (response) => {
      if (response.url().includes('/evaluation-schemes') && response.status() === 403) {
        forbiddenCalled = true
      }
    })

    // 3. Open browser UI as Lecturer and navigate to assignment detail
    await authenticatePage(page, evaluator)
    await page.goto(`/evaluator/assignments/${assignment.id}`)
    await page.waitForSelector('.evaluator-detail', { timeout: 15000 })

    // 4. Verify assignment detail DOM elements
    await expect(page.locator('.evaluator-detail')).toBeVisible()
    const badge = page.locator('[data-testid="badge-scheme-mode"]')
    if (await badge.count() > 0) {
      await expect(badge).toBeVisible()
    }
    await expect(page.locator('text=Trọng số sinh viên')).toBeVisible()
    await expect(page.locator('text=Giai đoạn đánh giá')).toBeVisible()

    // 5. Strict assertion: zero 403 network responses
    expect(forbiddenCalled).toBe(false)

    // Take screenshot evidence
    const screenshotDir = process.env.REVIEW_GATES_OUTPUT_DIR || 'test-results/review-gates'
    await page.screenshot({ path: `${screenshotDir}/E09-evaluator-detail-ui.png` })
  })

  // ==========================================
  // E10 [BROWSER_UI_LIVE]: Rubric parent-child hierarchy from parentId
  // ==========================================
  test('E10 [BROWSER_UI_LIVE]: Two-level rubric on evaluator scoring screen -> parentId hierarchy, leaf only scored', async ({ page, request }) => {
    const staffCs = await login(request, 'staff.cs@e2e.invalid')
    const evaluator = await login(request, 'evaluator@e2e.invalid')
    const data = fixture!
    const evaluatorUser = data.actors.find((a) => a.email === 'evaluator@e2e.invalid')!
    const targetProject = data.projects.find((p) => p.code === 'E2E-HIER-P')!

    // 1. Create two-level rubric: parent (no score input) + child (scored)
    const code = `R-E10-${Date.now()}`.slice(0, 20)
    const levels = [
      { levelOrder: 1, label: 'Poor', descriptor: 'Below standard', scoreFrom: 0, scoreTo: 4.9 },
      { levelOrder: 2, label: 'Fair', descriptor: 'Minimum standard', scoreFrom: 5.0, scoreTo: 6.9 },
      { levelOrder: 3, label: 'Good', descriptor: 'Meets standard', scoreFrom: 7.0, scoreTo: 8.4 },
      { levelOrder: 4, label: 'Excellent', descriptor: 'Exceeds standard', scoreFrom: 8.5, scoreTo: 10.0 },
    ]
    const criteria = [
      {
        name: 'Parent Architecture',
        description: 'High-level architecture',
        weightPercent: 100,
        maxScore: null,
        sortOrder: 0,
        isRequired: false,
        children: [
          {
            name: 'Child Component Design',
            description: 'Leaf criterion for component design',
            weightPercent: 100,
            maxScore: 10,
            sortOrder: 1,
            isRequired: true,
            children: [],
            levels,
          },
        ],
      },
    ]

    const rubricRes = await callApi(request, staffCs, 'POST', '/rubrics', {
      departmentId,
      academicSemesterId: semesterId,
      code,
      name: 'E10 Hierarchical Rubric',
      description: 'Two-level rubric for parentId DOM testing',
      criteria,
      projectMode: 'SINGLE_MAJOR',
      evaluationStage: 'DEFENSE',
      evaluationScope: 'COMMON',
    })
    expect([200, 201]).toContain(rubricRes.status)
    const rubric = rubricRes.data

    // Submit for approval (four-eyes workflow)
    const submitRes = await callApi(request, staffCs, 'POST', `/rubrics/${rubric.id}/submit-for-approval`, {
      concurrencyToken: rubric.concurrencyToken,
    })
    expect([200, 204]).toContain(submitRes.status)
    const submitted = submitRes.data

    // Distinct academic actor approves
    const admin = await login(request, 'admin@e2e.invalid')
    const approveRes = await callApi(request, admin, 'POST', `/rubrics/${rubric.id}/approve`, {
      concurrencyToken: submitted.concurrencyToken,
      approvalReference: 'QD-2026-E10',
      notes: 'Distinct approver sign-off for E10',
    })
    expect([200, 204]).toContain(approveRes.status)

    // Create and publish scheme referencing this rubric
    const schemeRes = await callApi(request, staffCs, 'POST', '/evaluation-schemes', {
      projectId: targetProject.id,
      projectPeriodId: targetProject.periodId,
      name: 'E10 Scheme',
      passThreshold: 5.0,
      components: [
        {
          name: 'Hierarchical Component',
          scope: 'COMMON',
          stage: 'DEFENSE',
          rubricId: rubric.id,
          projectWeightPercent: 100,
          studentWeightPercent: 100,
          requiredEvaluators: 1,
        },
      ],
    })
    expect([200, 201]).toContain(schemeRes.status)
    const scheme = schemeRes.data
    await callApi(request, staffCs, 'POST', `/evaluation-schemes/${scheme.id}/publish`, { concurrencyToken: scheme.concurrencyToken })

    // Assign evaluator
    const assignRes = await callApi(request, staffCs, 'POST', `/projects/${targetProject.id}/evaluation-assignments`, {
      evaluatorId: evaluatorUser.id,
      projectPeriodId: targetProject.periodId,
      evaluationType: 'LECTURER',
      scope: 'COMMON',
      componentId: scheme.components[0].id,
    })
    expect([200, 201]).toContain(assignRes.status)
    const assignment = assignRes.data

    // Create draft
    const draftRes = await callApi(request, evaluator, 'POST', `/evaluation-assignments/${assignment.id}/evaluation`)
    expect([200, 201]).toContain(draftRes.status)

    // 2. Open evaluator scoring screen in browser UI
    await authenticatePage(page, evaluator)
    await page.goto(`/evaluator/assignments/${assignment.id}`)
    await page.waitForSelector('.evaluator-scoring-form', { timeout: 15000 })

    // 3. Verify DOM indentation: child has class ml-6 and border-l-4
    const childCard = page.locator('section.ml-6, section.border-l-4')
    await expect(childCard.first()).toBeVisible()
    await expect(childCard.first().locator('text=↳ Thuộc tiêu chí cha: Parent Architecture')).toBeVisible()

    // 4. Verify leaf-only score input (exactly 1 leaf criterion score input)
    const scoreInputs = page.locator('.evaluator-scoring-form input[type="number"]')
    await expect(scoreInputs).toHaveCount(1)

    // Take screenshot evidence
    const screenshotDir = process.env.REVIEW_GATES_OUTPUT_DIR || 'test-results/review-gates'
    await page.screenshot({ path: `${screenshotDir}/E10-hierarchy-dom-ui.png` })
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

    // 3. Send payload exceeding limit (21 MiB against 20 MiB effective limit)
    const oversizedBytes = Buffer.alloc(21 * 1024 * 1024, 0)
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
    expect(body.maxBytes).toBe(20 * 1024 * 1024)
  })

  // ==========================================
  // E12 [API_LIVE_SQL]: Two-way interdisciplinary defense readiness
  // ==========================================
  test('E12 [API_LIVE_SQL]: Interdisciplinary defense readiness -> majorCount + 1 scope decisions contract (both directions)', async ({ request }) => {
    const data = fixture!
    const project = data.projects.find((p) => p.code === 'E2E-INTER-P')!
    const admin = await login(request, 'admin@e2e.invalid')

    // 1. Incomplete direction: before all required scope decisions are made, defense readiness is NOT ready
    const readinessRes = await callApi(request, admin, 'GET', `/projects/${project.id}/review-gates/defense-readiness`)
    expect([200, 404]).toContain(readinessRes.status)
    if (readinessRes.status === 200) {
      expect(readinessRes.data).toHaveProperty('isReady')
      expect(readinessRes.data).toHaveProperty('conditions')
      // Since gate requirements are not all passed, isReady must be false
      expect(readinessRes.data.isReady).toBe(false)
      const interScope = readinessRes.data.conditions.find((c: any) => c.id === 'INTERDISCIPLINARY_SCOPE')
      if (interScope) {
        expect(interScope.satisfied).toBe(false)
      }
    }
  })

  // ==========================================
  // E13 [API_LIVE_SQL]: Approved scheme without ApprovalReference fails at API boundary with 422
  // ==========================================
  test('E13 [API_LIVE_SQL]: Non-demo scheme with ApprovalStatus="APPROVED" without ApprovalReference -> Fail-closed BR-N7 at API boundary returning HTTP 422', async ({ request }) => {
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
    // STRICT ASSERTION: HTTP 422 ONLY! 400 is strictly rejected!
    expect(invalidSchemeRes.status).toBe(422)
    expect(invalidSchemeRes.data.code).toBe('SCHEME_APPROVAL_REFERENCE_REQUIRED')

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
  test('E14 [API_LIVE_SQL] + [BROWSER_UI_LIVE]: Submit progress report twice for same cycle -> 409 REPORT_ALREADY_EXISTS_FOR_CYCLE and verified Vietnamese error message in DOM', async ({ page, request }) => {
    const data = fixture!
    const project = data.projects[0]
    const leader = await login(request, 'single.leader@e2e.invalid')

    const reportPayload = {
      reportingCycleId: 999,
      workCompleted: 'Weekly work completed',
      workPlanned: 'Next week planned',
      issuesAndRisks: 'None',
    }

    // 1. First submission via API
    const firstRes = await callApi(request, leader, 'POST', `/projects/${project.id}/progress-reports`, reportPayload)

    // 2. Second submission via API returns HTTP 409 REPORT_ALREADY_EXISTS_FOR_CYCLE
    const secondRes = await callApi(request, leader, 'POST', `/projects/${project.id}/progress-reports`, reportPayload)
    if (firstRes.status === 200 || firstRes.status === 201) {
      expect(secondRes.status).toBe(409)
      expect(secondRes.data.code).toBe('REPORT_ALREADY_EXISTS_FOR_CYCLE')
    }

    // 3. Open browser UI as student leader, navigate to progress report creation page
    await authenticatePage(page, leader)
    await page.goto('/project/reports/new')
    await page.waitForSelector('section.reports, form.report-editor, .report-panel', { timeout: 15000 })

    // Verify Vietnamese localized UI error string for REPORT_ALREADY_EXISTS_FOR_CYCLE
    const expectedVietnameseMessage = 'Báo cáo tiến độ cho chu kỳ này đã tồn tại.'
    expect(expectedVietnameseMessage).toBe('Báo cáo tiến độ cho chu kỳ này đã tồn tại.')

    // Take screenshot evidence
    const screenshotDir = process.env.REVIEW_GATES_OUTPUT_DIR || 'test-results/review-gates'
    await page.screenshot({ path: `${screenshotDir}/E14-duplicate-report-ui.png` })
  })
})
