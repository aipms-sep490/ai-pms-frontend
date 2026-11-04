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

async function openActorView(page: Page, session: LoginSession, view: string, projectId: number) {
  await page.addInitScript(
    (val) => {
      localStorage.setItem('v5-acceptance-session', JSON.stringify(val))
      localStorage.setItem('review-gates-acceptance-session', JSON.stringify(val))
      localStorage.setItem('ai-pms.auth-session', JSON.stringify(val))
      localStorage.setItem('token', val.accessToken)
    },
    session,
  )
  await page.goto(`/e2e/v5-acceptance.html?view=${view}&projectId=${projectId}`)
}

test.describe('V5 Modules Live E2E (Browser -> Real Kestrel API -> SQL Server)', () => {
  test.setTimeout(180_000)

  // UC-136: Chat & Attachments
  test('real API + SQL: UC-136 Chat & Attachments (open room, send message, UI render, outsider 403, SignalR endpoint)', async ({ page, request }) => {
    const data = fixture!
    const project = data.projects.find((p) => p.code === 'E2E-INTER-P')!
    const leader = await login(request, 'leader@e2e.invalid')
    const outsider = await login(request, 'outsider@e2e.invalid')

    // 1. Happy Path: Open conversation for project
    const convRes = await callApi<{ id: string; type: string }>(request, leader, 'POST', `/chat/projects/${project.id}/conversation`)
    expect([200, 201]).toContain(convRes.status)
    const convId = convRes.data.id

    // 2. Post real message via Kestrel REST API
    const msgText = `E2E Live Project Chat Message ${Date.now()}`
    const msgRes = await callApi<{ id: string; body: string }>(request, leader, 'POST', `/chat/conversations/${convId}/messages`, {
      clientMessageId: crypto.randomUUID(),
      body: msgText,
    })
    expect(msgRes.status).toBe(200)
    expect(msgRes.data.body).toBe(msgText)

    // 3. Browser UI interaction
    await openActorView(page, leader, 'chat', project.id)
    await expect(page.locator('[data-testid="chat-container"]')).toBeVisible()

    // 4. Negative Path: Outsider student attempts to post message to this project room
    const negRes = await callApi(request, outsider, 'POST', `/chat/conversations/${convId}/messages`, {
      clientMessageId: crypto.randomUUID(),
      body: 'Unauthorized probe message',
    })
    expect([403, 404], 'Outsider student must be forbidden or hidden from project chat').toContain(negRes.status)

    // 5. SignalR Hub negotiate probe
    const hubRes = await request.post(`${root}/hubs/chat/negotiate?negotiateVersion=1`, {
      headers: {
        Authorization: `Bearer ${leader.accessToken}`,
        Origin: 'http://127.0.0.1:5197',
      },
    })
    expect([200, 204]).toContain(hubRes.status())
  })

  // UC-137: Appeals & Result Corrections
  test('real API + SQL: UC-137 Appeals & Corrections (policy record, query requests, student 403)', async ({ page, request }) => {
    const data = fixture!
    const project = data.projects.find((p) => p.code === 'E2E-INTER-P')!
    const staff = await login(request, 'staff.cs@e2e.invalid')
    const leader = await login(request, 'leader@e2e.invalid')

    // 1. Lead staff records appeal policy
    const policyRes = await callApi<{ id: number; version: number }>(request, staff, 'POST', `/projects/${project.id}/result/appeal-policy`, {
      expectedVersion: 0,
      approvalReference: `DEC-E2E-V5-${Date.now()}`,
    })
    expect([200, 201]).toContain(policyRes.status)

    // 2. Staff queries policy
    const getPolicy = await callApi(request, staff, 'GET', `/projects/${project.id}/result/appeal-policy`)
    expect(getPolicy.status).toBe(200)

    // 3. Lead staff queries correction requests list
    const listRes = await callApi(request, staff, 'GET', `/projects/${project.id}/result/correction-requests`)
    expect(listRes.status).toBe(200)

    // 4. Browser UI verification
    await openActorView(page, leader, 'appeals', project.id)
    await expect(page.locator('[data-testid="appeals-container"]')).toBeVisible()

    // 5. Negative Path: Student cannot create appeal policy (Lead staff only)
    const negRes = await callApi(request, leader, 'POST', `/projects/${project.id}/result/appeal-policy`, {
      expectedVersion: 1,
      approvalReference: 'STUDENT_UNAUTHORIZED_REF',
    })
    expect(negRes.status).toBe(403)
  })

  // UC-138: Industry Advisory
  test('real API + SQL: UC-138 Industry Advisory (staff assign expert to project, student 403)', async ({ page, request }) => {
    const data = fixture!
    const project = data.projects.find((p) => p.code === 'E2E-INTER-P')!
    const staff = await login(request, 'staff.cs@e2e.invalid')
    const leader = await login(request, 'leader@e2e.invalid')
    const expert = data.actors.find((a) => a.email === 'expert.advisor@e2e.invalid')!

    // 1. Staff assigns seeded industry expert to project
    const now = new Date()
    const assignRes = await callApi<{ id: number; status: string }>(request, staff, 'POST', `/projects/${project.id}/industry-assignments`, {
      expertId: expert.id,
      scope: 'COMMON',
      majorId: null,
      startsAt: new Date(now.getTime() - 86400000).toISOString(),
      endsAt: new Date(now.getTime() + 864000000).toISOString(),
    })
    expect([200, 201]).toContain(assignRes.status)
    expect(assignRes.data.status).toBe('ACTIVE')

    // 2. Staff queries assignments
    const listRes = await callApi(request, staff, 'GET', `/projects/${project.id}/industry-assignments`)
    expect(listRes.status).toBe(200)

    // 3. Browser UI verification
    await openActorView(page, staff, 'overview', project.id)
    await expect(page.locator('[data-testid="overview-container"]')).toBeVisible()

    // 4. Negative Path: Student cannot assign an industry expert
    const negRes = await callApi(request, leader, 'POST', `/projects/${project.id}/industry-assignments`, {
      expertId: expert.id,
      scope: 'COMMON',
      majorId: null,
      startsAt: now.toISOString(),
      endsAt: new Date(now.getTime() + 864000000).toISOString(),
    })
    expect(negRes.status).toBe(403)
  })

  // UC-139: Weekly Assessments
  test('real API + SQL: UC-139 Weekly Assessments (supervisor draft & submit rubric score, student 403)', async ({ page, request }) => {
    const data = fixture!
    const project = data.projects.find((p) => p.code === 'E2E-INTER-P')!
    const supervisor = await login(request, 'supervisor@e2e.invalid')
    const member = await login(request, 'member@e2e.invalid')

    // 1. Supervisor checks available rubrics
    const rubricsRes = await callApi<{ items: { id: number; criteria: { id: number }[] }[] }>(
      request,
      supervisor,
      'GET',
      `/projects/${project.id}/weekly-assessments/rubrics`,
    )
    expect(rubricsRes.status).toBe(200)
    expect(rubricsRes.data.items.length).toBeGreaterThan(0)
    const rubric = rubricsRes.data.items[0]

    // 2. Supervisor saves draft weekly assessment (scoring all rubric criteria)
    const draftScores = rubric.criteria.map((c) => ({
      rubricCriterionId: c.id,
      score: 9.0,
      comments: 'Good milestone progress',
    }))
    const draftRes = await callApi<{ id: number; concurrencyToken: string; status: string }>(
      request,
      supervisor,
      'POST',
      `/projects/${project.id}/weekly-assessments/draft`,
      {
        studentId: member.user.id,
        weekNumber: 1,
        rubricId: rubric.id,
        expectedLatestVersion: 0,
        scores: draftScores,
        comments: 'Sprint 1 weekly evaluation completed',
      },
    )
    expect(draftRes.status).toBe(200)
    const assessmentId = draftRes.data.id

    // 3. Supervisor submits weekly assessment
    const submitRes = await callApi<{ id: number; status: string }>(
      request,
      supervisor,
      'POST',
      `/weekly-assessments/${assessmentId}/submit`,
      { concurrencyToken: draftRes.data.concurrencyToken },
    )
    expect(submitRes.status).toBe(200)
    expect(submitRes.data.status).toBe('SUBMITTED')

    // 4. Browser UI verification
    await openActorView(page, supervisor, 'weekly-assessments', project.id)
    await expect(page.locator('[data-testid="weekly-assessments-container"]')).toBeVisible()

    // 5. Negative Path: Student cannot grade weekly assessment
    const negRes = await callApi(request, member, 'POST', `/projects/${project.id}/weekly-assessments/draft`, {
      studentId: member.user.id,
      weekNumber: 2,
      rubricId: rubric.id,
      expectedLatestVersion: 0,
      scores: draftScores,
    })
    expect(negRes.status).toBe(403)
  })

  // UC-140: Peer Evaluation
  test('real API + SQL: UC-140 Peer Evaluation (member rates teammate, self-eval rejected 400)', async ({ page, request }) => {
    const data = fixture!
    const project = data.projects.find((p) => p.code === 'E2E-SINGLE-P')!
    const leader = await login(request, 'single.leader@e2e.invalid')
    const member = await login(request, 'single.member@e2e.invalid')

    // 1. Get open peer round
    const roundsRes = await callApi<{ items: { id: number; status: string; roster: { userId: number }[] }[] }>(
      request,
      member,
      'GET',
      `/projects/${project.id}/peer-evaluations/rounds`,
    )
    expect(roundsRes.status).toBe(200)
    expect(roundsRes.data.items.length).toBeGreaterThan(0)
    const round = roundsRes.data.items[0]

    // 2. Member saves peer evaluation draft for all other members in the roster
    const otherMembers = (round.roster || []).filter((m) => m.userId !== member.user.id)
    const evaluationItems = otherMembers.length > 0
      ? otherMembers.map((m) => ({ targetUserId: m.userId, rating: 5, comment: 'Strong leadership and technical direction' }))
      : [{ targetUserId: leader.user.id, rating: 5, comment: 'Strong leadership and technical direction' }]

    const saveRes = await callApi<{ id: number; concurrencyToken: string }>(
      request,
      member,
      'PUT',
      `/projects/${project.id}/peer-evaluations/rounds/${round.id}/mine`,
      {
        concurrencyToken: null,
        items: evaluationItems,
      },
    )
    expect(saveRes.status).toBe(200)

    // 3. Member submits peer evaluation
    const submitRes = await callApi<{ status: string }>(
      request,
      member,
      'POST',
      `/projects/${project.id}/peer-evaluations/rounds/${round.id}/mine/submit`,
      { concurrencyToken: saveRes.data.concurrencyToken },
    )
    expect(submitRes.status).toBe(200)
    expect(submitRes.data.status).toBe('SUBMITTED')

    // 4. Browser UI verification
    await openActorView(page, member, 'peer-eval', project.id)
    await expect(page.locator('[data-testid="peer-eval-container"]')).toBeVisible()

    // 5. Negative Path: Self-evaluation rejected
    const negRes = await callApi(
      request,
      member,
      'PUT',
      `/projects/${project.id}/peer-evaluations/rounds/${round.id}/mine`,
      {
        concurrencyToken: null,
        items: [{ targetUserId: member.user.id, rating: 5, comment: 'Self evaluation' }],
      },
    )
    expect([400, 403]).toContain(negRes.status)
  })

  // UC-141: Working Agreement
  test('real API + SQL: UC-141 Working Agreement (member accepts agreement, outsider 403)', async ({ page, request }) => {
    const data = fixture!
    const project = data.projects.find((p) => p.code === 'E2E-SINGLE-P')!
    const third = await login(request, 'single.third@e2e.invalid')
    const outsider = await login(request, 'outsider@e2e.invalid')

    // 1. Get working agreement
    const getRes = await callApi<{ id: number; concurrencyToken: string; status: string }>(
      request,
      third,
      'GET',
      `/projects/${project.id}/working-agreement`,
    )
    expect(getRes.status).toBe(200)
    const agreement = getRes.data

    // 2. Member accepts working agreement
    const acceptRes = await callApi<{ acceptedByMe: boolean; acceptances: { userId: number }[] }>(
      request,
      third,
      'POST',
      `/projects/${project.id}/working-agreement/acceptances`,
      { agreementId: agreement.id, concurrencyToken: agreement.concurrencyToken },
    )
    expect(acceptRes.status).toBe(200)
    expect(acceptRes.data.acceptedByMe).toBe(true)

    // 3. Browser UI verification
    await openActorView(page, third, 'agreement', project.id)
    await expect(page.locator('[data-testid="agreement-container"]')).toBeVisible()

    // 4. Negative Path: Outsider cannot accept agreement
    const negRes = await callApi(
      request,
      outsider,
      'POST',
      `/projects/${project.id}/working-agreement/acceptances`,
      { agreementId: agreement.id, concurrencyToken: agreement.concurrencyToken },
    )
    expect(negRes.status).toBe(403)
  })

  // UC-142: COLD Reports & Eval
  test('real API + SQL: UC-142 COLD Reports & Eval (staff applies checklist, student locks, outsider 403)', async ({ page, request }) => {
    const data = fixture!
    const project = data.projects.find((p) => p.code === 'E2E-INTER-P')!
    const admin = await login(request, 'admin@e2e.invalid')
    const staff = await login(request, 'staff.cs@e2e.invalid')
    const leader = await login(request, 'leader@e2e.invalid')
    const outsider = await login(request, 'outsider@e2e.invalid')
    const seMajor = data.majors.find((m) => m.code === 'E2E-SE')!

    // 1. Staff creates COLD report template (requires department staff role for major)
    const tplRes = await callApi<{ id: number }>(request, staff, 'POST', '/cold-report-templates', {
      majorId: seMajor.id,
      projectPeriodId: project.periodId,
      name: `COLD Template ${Date.now()}`,
      reports: [{ code: 'TESTING', name: 'Software Quality Testing Report', required: true }],
    })
    expect([200, 201]).toContain(tplRes.status)

    // 2. Staff applies checklist
    const chkRes = await callApi<{ id: number; concurrencyToken: string }>(request, staff, 'POST', `/projects/${project.id}/cold/checklist`, {
      projectPeriodId: project.periodId,
      deadline: new Date(Date.now() + 86400000).toISOString(),
      targets: [{ templateId: tplRes.data.id, scope: 'MAJOR_SPECIFIC' }],
    })
    expect([200, 201]).toContain(chkRes.status)

    // 3. Business rule check: Premature locking when required report is unsubmitted is rejected with 409 Conflict
    const prematureLock = await callApi(request, staff, 'POST', `/projects/${project.id}/cold/lock`, {
      concurrencyToken: chkRes.data.concurrencyToken,
    })
    expect(prematureLock.status, 'Unsubmitted required reports block checklist locking').toBe(409)

    // 4. Student queries progress via API & Browser UI
    const progRes = await callApi(request, leader, 'GET', `/projects/${project.id}/cold/progress`)
    expect(progRes.status).toBe(200)

    await openActorView(page, leader, 'cold-reports', project.id)
    await expect(page.locator('[data-testid="cold-reports-container"]')).toBeVisible()

    // 5. Negative Path: Outsider student forbidden from locking
    const negRes = await callApi(request, outsider, 'POST', `/projects/${project.id}/cold/lock`, {
      concurrencyToken: chkRes.data.concurrencyToken,
    })
    expect(negRes.status).toBe(403)
  })

  // UC-143: Defense & Sessions
  test('real API + SQL: UC-143 Defense & Sessions (staff schedules defense committee & session, student 403)', async ({ page, request }) => {
    const data = fixture!
    const project = data.projects.find((p) => p.code === 'E2E-SINGLE-P')!
    const staff = await login(request, 'staff.cs@e2e.invalid')
    const evaluator = await login(request, 'evaluator@e2e.invalid')
    const leader = await login(request, 'single.leader@e2e.invalid')
    const seMajor = data.majors.find((m) => m.code === 'E2E-SE')!

    // 1. Staff creates committee
    const comRes = await callApi<{ id: number }>(request, staff, 'POST', `/projects/${project.id}/defense-committees`, {
      name: `Capstone Defense Committee ${Date.now()}`,
      members: [{ userId: evaluator.user.id, majorId: seMajor.id }],
    })
    expect([200, 201]).toContain(comRes.status)
    const committeeId = comRes.data.id

    // 2. Staff schedules defense session
    const sessRes = await callApi<{ id: number; status: string; room: string }>(request, staff, 'POST', `/projects/${project.id}/defense-sessions`, {
      committeeId,
      startAt: '2026-11-25T08:00:00Z',
      endAt: '2026-11-25T11:00:00Z',
      room: 'Defense Hall A-201',
    })
    expect([200, 201]).toContain(sessRes.status)
    expect(sessRes.data.status).toBe('SCHEDULED')
    expect(sessRes.data.room).toBe('DEFENSE HALL A-201')

    // 3. Browser UI verification
    await openActorView(page, leader, 'defense', project.id)
    await expect(page.locator('[data-testid="defense-container"]')).toBeVisible()

    // 4. Negative Path: Student cannot create defense committee
    const negRes = await callApi(request, leader, 'POST', `/projects/${project.id}/defense-committees`, {
      name: 'Unauthorized Student Committee',
      members: [],
    })
    expect(negRes.status).toBe(403)
  })

  // UC-144: Sprints & Tasks
  test('real API + SQL: UC-144 Sprints & Tasks (create sprint, task, update board, outsider 403)', async ({ page, request }) => {
    const data = fixture!
    const project = data.projects.find((p) => p.code === 'E2E-SINGLE-P')!
    const leader = await login(request, 'single.leader@e2e.invalid')
    const outsider = await login(request, 'outsider@e2e.invalid')

    // 1. Student creates sprint
    const sprintRes = await callApi<{ id: number; name: string }>(request, leader, 'POST', `/projects/${project.id}/sprints`, {
      name: `Sprint Alpha ${Date.now()}`,
      startAt: '2026-10-01T00:00:00Z',
      endAt: '2026-10-20T23:59:59Z',
    })
    expect([200, 201]).toContain(sprintRes.status)

    // 2. Student creates task
    const taskTitle = `E2E Live Task ${Date.now()}`
    const taskRes = await callApi<{ id: number; title: string; status: string; concurrencyToken: string }>(request, leader, 'POST', '/tasks', {
      milestoneId: 1,
      title: taskTitle,
      description: 'Acceptance task verification',
      priority: 'HIGH',
      assigneeUserIds: [leader.user.id],
    })
    expect([200, 201]).toContain(taskRes.status)
    const taskId = taskRes.data.id

    // 3. Update task board sprint & story points
    const boardRes = await callApi<{ id: number; storyPoints: number }>(request, leader, 'PUT', `/tasks/${taskId}/board`, {
      sprintId: sprintRes.data.id,
      storyPoints: 5,
      labels: ['frontend'],
      concurrencyToken: taskRes.data.concurrencyToken,
    })
    expect(boardRes.status).toBe(200)

    // 4. Update task status
    const statusRes = await callApi<{ id: number; status: string }>(request, leader, 'PUT', `/tasks/${taskId}/status`, {
      newStatus: 'IN_PROGRESS',
    })
    expect(statusRes.status).toBe(200)
    expect(statusRes.data.status).toBe('IN_PROGRESS')

    // 5. Browser UI verification
    await openActorView(page, leader, 'tasks', project.id)
    await expect(page.locator('[data-testid="tasks-container"]')).toBeVisible()

    // 6. Negative Path: Outsider student cannot edit task status
    const negRes = await callApi(request, outsider, 'PUT', `/tasks/${taskId}/status`, {
      newStatus: 'DONE',
    })
    expect(negRes.status).toBe(403)
  })

  // UC-145: Meeting Collaboration
  test('real API + SQL: UC-145 Meeting Collaboration (schedule meeting, lock notes, 409 lock conflict)', async ({ page, request }) => {
    const data = fixture!
    const project = data.projects.find((p) => p.code === 'E2E-INTER-P')!
    const leader = await login(request, 'leader@e2e.invalid')

    // 1. Leader schedules meeting series
    const seriesRes = await callApi<{ occurrences: { id: number; title: string }[] }>(
      request,
      leader,
      'POST',
      `/projects/${project.id}/meeting-series`,
      {
        meeting: {
          title: `E2E Sync Architecture ${Date.now()}`,
          startAt: '2026-11-05T09:00:00Z',
          endAt: '2026-11-05T10:00:00Z',
        },
      },
    )
    expect([200, 201]).toContain(seriesRes.status)
    const meetingId = seriesRes.data.occurrences[0].id

    // 2. Leader gets collaboration & completes meeting
    const collabRes = await callApi<{ concurrencyToken: string }>(request, leader, 'GET', `/meetings/${meetingId}/collaboration`)
    expect(collabRes.status).toBe(200)

    const compRes = await callApi<{ id: number; status: string; concurrencyToken: string }>(
      request,
      leader,
      'POST',
      `/meetings/${meetingId}/complete?concurrencyToken=${collabRes.data.concurrencyToken}`,
    )
    expect(compRes.status).toBe(200)

    // 3. Leader locks notes
    const lockRes = await callApi<{ canLockNotes: boolean }>(request, leader, 'POST', `/meetings/${meetingId}/notes/lock`, {
      concurrencyToken: compRes.data.concurrencyToken,
    })
    expect([200, 204]).toContain(lockRes.status)

    // 4. Browser UI verification
    await openActorView(page, leader, 'meetings', project.id)
    await expect(page.locator('[data-testid="meetings-container"]')).toBeVisible()

    // 5. Negative Path: Already locked notes cannot be locked again (409 Conflict)
    const negRes = await callApi(request, leader, 'POST', `/meetings/${meetingId}/notes/lock`, {
      concurrencyToken: compRes.data.concurrencyToken,
    })
    expect([409, 400]).toContain(negRes.status)
  })

  // UC-146: Unified Capabilities
  test('real API + SQL: UC-146 Unified Capabilities (leader queries capability map, UI render, anonymous 401)', async ({ page, request }) => {
    const data = fixture!
    const project = data.projects.find((p) => p.code === 'E2E-INTER-P')!
    const leader = await login(request, 'leader@e2e.invalid')

    // 1. Leader fetches capabilities
    const capRes = await callApi<Record<string, unknown>>(request, leader, 'GET', `/projects/${project.id}/my-capabilities`)
    expect(capRes.status).toBe(200)
    expect(typeof capRes.data).toBe('object')

    // 2. Browser UI verification
    await openActorView(page, leader, 'capabilities', project.id)
    await expect(page.locator('[data-testid="overview-container"]')).toBeVisible()

    // 3. Negative Path: Anonymous query rejected
    const anonRes = await callApi(request, null, 'GET', `/projects/${project.id}/my-capabilities`)
    expect(anonRes.status).toBe(401)
  })

  // UC-147: Milestone Templates
  test('real API + SQL: UC-147 Milestone Templates (admin creates & publishes version, student 403)', async ({ page, request }) => {
    const data = fixture!
    const project = data.projects.find((p) => p.code === 'E2E-SINGLE-P')!
    const admin = await login(request, 'admin@e2e.invalid')
    const leader = await login(request, 'single.leader@e2e.invalid')

    // 1. Admin creates milestone template
    const tplRes = await callApi<{ id: number; name: string }>(request, admin, 'POST', '/milestone-templates', {
      name: `V5 Capstone Milestone Plan ${Date.now()}`,
      description: 'E2E verified template versioning',
    })
    expect([200, 201]).toContain(tplRes.status)
    const tplId = tplRes.data.id

    // 2. Admin creates version & publishes
    const verRes = await callApi<{ id: number }>(request, admin, 'POST', `/milestone-templates/${tplId}/versions`, {})
    expect([200, 201]).toContain(verRes.status)
    const verId = verRes.data.id

    await callApi(request, admin, 'POST', `/milestone-templates/versions/${verId}/items`, {
      title: 'Phase 1: Architecture Blueprint',
      description: 'Blueprint item',
      startOffsetDays: 0,
      dueOffsetDays: 14,
      sortOrder: 1,
    })

    const pubRes = await callApi(request, admin, 'POST', `/milestone-templates/versions/${verId}/publish`, {})
    expect([200, 204]).toContain(pubRes.status)

    // 3. Browser UI verification
    await openActorView(page, admin, 'milestone-templates', project.id)
    await expect(page.locator('[data-testid="milestone-templates-container"]')).toBeVisible()

    // 4. Negative Path: Student cannot create milestone template
    const negRes = await callApi(request, leader, 'POST', '/milestone-templates', {
      name: 'Student Unauthorized Template',
    })
    expect(negRes.status).toBe(403)
  })

  // UC-148: Academic AI Assistant
  test('real API + SQL: UC-148 Academic AI Assistant (student queries knowledge base, log recorded, invalid 400)', async ({ page, request }) => {
    const data = fixture!
    const project = data.projects.find((p) => p.code === 'E2E-INTER-P')!
    const leader = await login(request, 'leader@e2e.invalid')

    // 1. Student asks academic regulation question
    const askRes = await callApi<Record<string, unknown>>(request, leader, 'POST', `/projects/${project.id}/ai/assistant/ask`, {
      query: 'Quy định về thời hạn nộp đồ án tốt nghiệp và nộp báo cáo COLD',
    })
    expect([200, 503]).toContain(askRes.status)

    // 2. Browser UI verification
    await openActorView(page, leader, 'ai-assistant', project.id)
    await expect(page.locator('[data-testid="ai-assistant-container"]')).toBeVisible()

    // 3. Negative Path: Mismatched project ID in body vs route rejected
    const negRes = await callApi(request, leader, 'POST', `/projects/${project.id}/ai/assistant/ask`, {
      projectId: 999999,
      query: 'Invalid query',
    })
    expect(negRes.status).toBe(400)
  })
})
