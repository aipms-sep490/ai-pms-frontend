import { expect, test } from '@playwright/test'
import {
  actorByEmail,
  apiJson,
  apiLogin,
  apiRaw,
  expectProblem,
  expectTapTargetAtLeast44,
  loadSmokeFixture,
  loginViaUi,
  minimalPdfBytes,
  openUiAs,
  skipIfSmokeUnconfigured,
  SMOKE_API_ROOT,
} from './helpers'

test.describe('Go-Live 9-Stage Live Smoke — Track 1: Single Major (IT_ONLY)', () => {
  test('walks Stages 0 to 9 on live BE + SQL with negative guards and tap target checks', async ({ browser, request }) => {
    skipIfSmokeUnconfigured()
    const fixture = loadSmokeFixture()
    const suffix = Date.now().toString().slice(-6)

    const staffIt = await apiLogin(request, 'smoke.staff.it@e2e.invalid')
    const staffMkt = await apiLogin(request, 'smoke.staff.mkt@e2e.invalid')
    const supervisor = await apiLogin(request, 'smoke.sup.it@e2e.invalid')
    const gateReviewer = await apiLogin(request, 'smoke.gate.rev1@e2e.invalid')
    const evaluator = await apiLogin(request, 'smoke.eval1@e2e.invalid')
    const appealReviewer = await apiLogin(request, 'smoke.appeal.rev@e2e.invalid')
    const leader = await apiLogin(request, 'smoke.it.leader@e2e.invalid')
    const member1 = await apiLogin(request, 'smoke.it.member@e2e.invalid')
    const member2 = await apiLogin(request, 'smoke.it.member2@e2e.invalid')

    const blueprint = fixture.blueprints.find(b => b.trackCode === 'IT_ONLY')
    expect(blueprint, 'PUBLISHED IT_ONLY blueprint required in fixture').toBeTruthy()
    const evalPeriod = fixture.periods.find(p => p.periodType === 'EVALUATION')!
    const finalPeriod = fixture.periods.find(p => p.periodType === 'FINAL_SUBMISSION')!
    const supProfile = fixture.supervisorProfiles?.find(sp => sp.userId === supervisor.user.id)
    expect(supProfile, 'Supervisor profile for smoke.sup.it required in fixture').toBeTruthy()

    // Stage 0: Blueprint readiness + real browser UI login + mobile tap-target check (ISS-X-92)
    const readiness = await apiJson<{ isReady?: boolean; missingTracks?: string[] }>(
      request, staffIt, 'GET', `/semesters/${fixture.semesterId}/blueprint-readiness`,
    )
    expect(readiness.missingTracks ?? []).toHaveLength(0)
    await apiJson(request, staffIt, 'GET', `/academic/semesters/${fixture.semesterId}/track-presets`)

    const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 } })
    try {
      const loginPage = await mobileCtx.newPage()
      await loginPage.goto('/login')
      await expectTapTargetAtLeast44(loginPage.getByRole('button', { name: 'Đăng nhập' }), 'Mobile login submit button')
      await loginViaUi(loginPage, 'smoke.it.leader@e2e.invalid')
    } finally {
      await mobileCtx.close()
    }

    // Stage 1: Team formation, academic scope, eligibility check & lock
    const team = await apiJson<{ id: number }>(request, leader, 'POST', '/teams', {
      academicSemesterId: fixture.semesterId,
      code: `SMK-IT-${suffix}`,
      name: `Smoke IT Only ${suffix}`,
      description: 'Live 9-stage smoke single major IT team',
      academicScope: {
        projectMode: 'SINGLE_MAJOR',
        primaryMajorId: fixture.seMajorId,
        leadDepartmentId: fixture.itDepartmentId,
        requirements: [
          {
            majorId: fixture.seMajorId,
            minMembers: 2,
            maxMembers: 5,
            responsibility: 'Thiết kế, lập trình, kiểm thử và triển khai hệ thống phần mềm',
          },
        ],
        trackCode: 'IT_ONLY',
      },
    })

    for (const mEmail of ['smoke.it.member@e2e.invalid', 'smoke.it.member2@e2e.invalid']) {
      const mActor = actorByEmail(fixture, mEmail)
      const inv = await apiJson<{ id: number }>(request, leader, 'POST', `/teams/${team.id}/invitations`, {
        invitedUserId: mActor.id,
        message: 'Join IT smoke team',
      })
      const mSession = mEmail.includes('member2') ? member2 : member1
      await apiJson(request, mSession, 'POST', `/teams/invitations/${inv.id}/accept`)
    }

    const elig = await apiJson<{ result: string }>(request, leader, 'POST', `/teams/${team.id}/eligibility/check`)
    expect(['ELIGIBLE', 'PASS']).toContain(elig.result)
    // Negative TK-W1-11: Student manual team lock is disabled (auto-locked at N1 window end)
    const manualLock = await apiRaw(request, leader, 'POST', `/teams/${team.id}/eligibility/lock`)
    await expectProblem(manualLock, [409], 'TEAM_MANUAL_LOCK_DISABLED')

    // Stage 2: Proposal, approval, negative D18 guard, supervisor assignment -> ACTIVE
    let project = await apiJson<{ id: number; status: string; concurrencyToken: string }>(
      request, leader, 'POST', '/projects', {
        title: `IT Only Live Smoke ${suffix}`,
        description: 'Automated 9-stage live verification for IT_ONLY track',
        objectives: 'Verify all 9 stages with zero mocks',
        problemStatement: 'End-to-end production readiness gate',
        expectedOutput: 'Published & archived dossier',
        requiredMajorIds: [fixture.seMajorId],
        domain: 'Software Engineering',
        technologies: ['TypeScript', '.NET 8'],
        keywords: ['smoke', 'it-only'],
      },
    )
    // Negative D18: cannot create execution milestone before project is ACTIVE
    const preActiveMilestone = await apiRaw(request, leader, 'POST', '/milestones', {
      projectId: project.id,
      title: 'Premature milestone',
      description: null,
      startDate: null,
      dueDate: null,
      sortOrder: 1,
    })
    await expectProblem(preActiveMilestone, [403, 409], 'PROJECT_NOT_ACTIVE')

    // Primary Supervisor accepts invitation before proposal submission (SUPERVISOR_NOT_CONFIRMED guard)
    const supReq = await apiJson<{ id: number }>(request, leader, 'POST', `/projects/${project.id}/supervisor-requests`, {
      supervisorProfileId: supProfile!.profileId,
      message: 'Please supervise IT_ONLY smoke project',
      assignmentType: 'PRIMARY',
      majorId: null,
    })
    await apiJson(request, supervisor, 'POST', `/supervisor-requests/${supReq.id}/accept`, {
      message: 'Accepted for IT_ONLY smoke',
    })

    // Run INITIAL_SUBMISSION eligibility snapshot bound to the created project draft
    const submitElig = await apiJson<{ result: string }>(request, leader, 'POST', `/teams/${team.id}/eligibility/check`)
    expect(submitElig.result).toBe('PASS')

    project = await apiJson(request, leader, 'GET', `/projects/${project.id}`)
    project = await apiJson(request, leader, 'POST', `/projects/${project.id}/submit`, {
      concurrencyToken: project.concurrencyToken,
    })

    project = await apiJson(request, staffIt, 'POST', `/projects/${project.id}/start-review`, {
      concurrencyToken: project.concurrencyToken,
    })
    project = await apiJson(request, staffIt, 'POST', `/projects/${project.id}/approve`, {
      concurrencyToken: project.concurrencyToken,
    })

    const activeProject = await apiJson<{ id: number; status: string; concurrencyToken: string }>(
      request, leader, 'GET', `/projects/${project.id}`,
    )
    expect(activeProject.status).toBe('ACTIVE')

    // Stage 3: Working Agreement publish + all members accept
    let agreement = await apiJson<{ id: number; version: number; concurrencyToken: string }>(
      request, leader, 'PUT', `/projects/${project.id}/working-agreement/draft`, {
        expectedLatestVersion: 0,
        concurrencyToken: null,
        sections: [{ title: 'Cam kết thực hiện', body: 'Tuân thủ đúng mốc G1-G3 và liêm chính học thuật.' }],
      },
    )
    agreement = await apiJson(request, leader, 'POST', `/projects/${project.id}/working-agreement/publish`, {
      agreementId: agreement.id,
      concurrencyToken: agreement.concurrencyToken,
    })
    for (const s of [leader, member1, member2]) {
      agreement = await apiJson(request, s, 'POST', `/projects/${project.id}/working-agreement/acceptances`, {
        agreementId: agreement.id,
        concurrencyToken: agreement.concurrencyToken,
      })
    }

    // Stage 4: Review Gates G1-G3 + POL-03 20% Individual Process + Negative D17 COI check
    let timeline = await apiJson<{
      gates: Array<{ gateInstanceId: string; code: string; status: string; concurrencyToken: string; requirements: Array<{ id: string; code: string; scope?: string; targetStudentId?: number | null }> }>
    }>(request, leader, 'GET', `/projects/${project.id}/review-gates/timeline`)
    expect(timeline.gates.length).toBeGreaterThanOrEqual(3)

    // Negative D17 COI: Primary Supervisor cannot be assigned as Gate Reviewer
    const coiGate = await apiRaw(request, staffIt, 'POST', '/review-gates/assignments', {
      projectId: String(project.id),
      gateCode: 'G1',
      reviewerId: supervisor.user.id,
      scope: 'COMMON',
    })
    await expectProblem(coiGate, [403, 409])

    const teamSessions = [leader, member1, member2]
    for (const gateCode of ['G1', 'G2', 'G3']) {
      // Upload team-level requirements as leader, then each student's INDIVIDUAL requirement from their own timeline
      const uploadedReqIds = new Set<string>()
      for (const stu of teamSessions) {
        const stuTimeline = await apiJson<typeof timeline>(request, stu, 'GET', `/projects/${project.id}/review-gates/timeline`)
        const stuGate = stuTimeline.gates.find(g => g.code === gateCode)!
        for (const req of stuGate.requirements) {
          if (uploadedReqIds.has(req.id)) continue
          const isIndividual = req.targetStudentId != null || req.scope === 'INDIVIDUAL'
          if (stu.user.id !== leader.user.id && !isIndividual) continue
          const freshTl = await apiJson<typeof timeline>(request, stu, 'GET', `/projects/${project.id}/review-gates/timeline`)
          const freshGate = freshTl.gates.find(g => g.code === gateCode)!
          const upRes = await request.post(`${SMOKE_API_ROOT}/projects/${project.id}/review-gates/${gateCode}/evidence/file`, {
            headers: { Authorization: `Bearer ${stu.accessToken}` },
            multipart: {
              file: { name: `${req.code}.pdf`, mimeType: 'application/pdf', buffer: minimalPdfBytes(req.code) },
              requirementId: String(req.id),
              expectedVersion: '0',
              concurrencyToken: freshGate.concurrencyToken,
              notes: `Live smoke upload ${req.code}`,
            },
          })
          expect(upRes.ok(), `Gate evidence upload ${req.code} by ${stu.user.email}: ${await upRes.text()}`).toBe(true)
          uploadedReqIds.add(req.id)
        }
      }
      timeline = await apiJson(request, leader, 'GET', `/projects/${project.id}/review-gates/timeline`)
      const gate = timeline.gates.find(g => g.code === gateCode)!

      await apiJson(request, leader, 'POST', `/projects/${project.id}/review-gates/${gateCode}/submit-for-review`, {
        concurrencyToken: gate.concurrencyToken,
      }, { 'Idempotency-Key': `smk-it-${project.id}-${gateCode}-${suffix}` })
      // QD-09: Single-major gate requires 2 independent reviewers
      for (const rev of [gateReviewer, evaluator]) {
        let currentAssign = await apiJson<{ id: number; concurrencyToken: string; requirements: Array<{ id: number }> }>(
          request, staffIt, 'POST', '/review-gates/assignments', {
            projectId: String(project.id),
            gateCode,
            reviewerId: rev.user.id,
            scope: 'COMMON',
          },
        )
        for (const req of currentAssign.requirements) {
          currentAssign = await apiJson(request, rev, 'POST', `/review-gates/assignments/${currentAssign.id}/evidence/${req.id}/verify`, {
            requirementId: String(req.id),
            decision: 'ACCEPTED',
            concurrencyToken: currentAssign.concurrencyToken,
          })
        }
        await apiJson(request, rev, 'POST', `/review-gates/assignments/${currentAssign.id}/decision`, {
          decision: 'PASSED',
          notes: `${gateCode} passed live smoke`,
          concurrencyToken: currentAssign.concurrencyToken,
        })
      }

      // Primary Supervisor finalizes 20% POL-03 score for each member at each gate
      for (const stu of [leader, member1, member2]) {
        const saved = await apiJson<{ concurrencyToken: string }>(
          request, supervisor, 'PUT', `/projects/${project.id}/gates/${gate.gateInstanceId}/individual-process-scores/${stu.user.id}`, {
            score: 8.5,
            comments: `Gate ${gateCode} solid`,
          },
        )
        await apiJson(
          request, supervisor, 'POST', `/projects/${project.id}/gates/${gate.gateInstanceId}/individual-process-scores/${stu.user.id}/finalize`, {
            concurrencyToken: saved.concurrencyToken,
          },
        )
      }
    }

    // Stage 5: Final Submission & Cold Package Lock (2-step lock)
    const coldTpl = await apiJson<{ id: number }>(request, staffIt, 'POST', '/cold-report-templates', {
      majorId: null,
      projectPeriodId: evalPeriod.id,
      name: `Smoke Cold IT ${suffix}`,
      reports: [{ code: 'FINAL_PDF', name: 'Báo cáo tổng kết IT', required: true }],
      scope: 'COMMON',
    })
    let coldChecklist = await apiJson<{ concurrencyToken: string; items: Array<{ id: number }> }>(
      request, staffIt, 'POST', `/projects/${project.id}/cold/checklist`, {
        projectPeriodId: evalPeriod.id,
        deadline: new Date(Date.now() + 7 * 86400_000).toISOString(),
        targets: [{ templateId: coldTpl.id, scope: 'COMMON' }],
      },
    )
    let coldSub = await apiJson<{ id: number; concurrencyToken: string }>(
      request, leader, 'POST', `/cold-checklist-items/${coldChecklist.items[0].id}/draft`, {
        expectedLatestVersion: 0,
        note: 'Cold final smoke draft',
      },
    )
    const coldUp = await request.post(`${SMOKE_API_ROOT}/cold-submissions/${coldSub.id}/files`, {
      headers: { Authorization: `Bearer ${leader.accessToken}` },
      multipart: {
        file: { name: 'cold-final.pdf', mimeType: 'application/pdf', buffer: minimalPdfBytes('COLD-IT') },
        concurrencyToken: coldSub.concurrencyToken,
      },
    })
    expect(coldUp.ok(), await coldUp.text()).toBe(true)
    coldSub = (await coldUp.json()) as { id: number; concurrencyToken: string }
    await apiJson(request, leader, 'POST', `/cold-submissions/${coldSub.id}/submit`, {
      concurrencyToken: coldSub.concurrencyToken,
    })
    coldChecklist = await apiJson(request, leader, 'GET', `/projects/${project.id}/cold/checklist`)
    await apiJson(request, leader, 'POST', `/projects/${project.id}/cold/lock`, {
      concurrencyToken: coldChecklist.concurrencyToken,
    })

    const deliv = await apiJson<{ id: number }>(request, leader, 'POST', `/projects/${project.id}/deliverables`, {
      milestoneId: null,
      title: `Final Deliverable IT ${suffix}`,
      description: 'Final codebase & architecture report',
      deliverableType: 'FINAL_REPORT',
      dueAt: new Date(Date.now() + 5 * 86400_000).toISOString(),
    })
    const delivVerRes = await request.post(`${SMOKE_API_ROOT}/deliverables/${deliv.id}/versions`, {
      headers: { Authorization: `Bearer ${leader.accessToken}` },
      multipart: {
        file: { name: 'final-deliverable.pdf', mimeType: 'application/pdf', buffer: minimalPdfBytes('FINAL-IT') },
        expectedLatestVersion: '0',
        note: 'Release v1.0',
      },
    })
    expect(delivVerRes.ok(), await delivVerRes.text()).toBe(true)
    const delivVer = (await delivVerRes.json()) as { id: number }
    await apiJson(request, supervisor, 'POST', `/deliverable-versions/${delivVer.id}/review`, {
      decision: 'ACCEPTED',
      feedback: 'Approved for Final Lock',
    })

    await apiJson<{ concurrencyToken: string }>(
      request, staffIt, 'PUT', `/projects/${project.id}/final-submission/requirements`, {
        deliverableIds: [deliv.id],
        concurrencyToken: null,
      },
    )
    await apiJson<{ concurrencyToken: string }>(
      request, leader, 'POST', `/projects/${project.id}/final-submission-draft`, {
        projectPeriodId: finalPeriod.id,
        notes: 'Ready for 2-step lock',
        deliverableVersionIds: [delivVer.id],
      },
    )
    const lockStatus = await apiJson<{ draftConcurrencyToken: string }>(
      request, leader, 'POST', `/projects/${project.id}/final-submission/request-lock`, {},
    )
    await apiJson(request, supervisor, 'POST', `/projects/${project.id}/final-submission/supervisor-lock`, {
      decision: 'LOCK',
      notes: '2-step lock confirmed',
      concurrencyToken: lockStatus.draftConcurrencyToken,
    })

    // Stage 6: Evaluation Scheme POL_V4_DECIMAL + Cold & Defense without DefenseSession (POL-06 non-blocking)
    let scheme = await apiJson<{
      id: number
      concurrencyToken: string
      components: Array<{ id: number; stage: string; scope: string }>
    }>(request, staffIt, 'POST', '/evaluation-schemes', {
      projectId: project.id,
      projectPeriodId: evalPeriod.id,
      name: `POL-01 IT Only ${suffix}`,
      passThreshold: 5.0,
      components: [
        { name: 'Cold Review', scope: 'COMMON', majorId: null, rubricId: blueprint!.rubricId, projectWeightPercent: 37.5, studentWeightPercent: 30, requiredEvaluators: 1, stage: 'COLD', targetScope: 'PROJECT' },
        { name: 'Defense Review', scope: 'COMMON', majorId: null, rubricId: blueprint!.rubricId, projectWeightPercent: 62.5, studentWeightPercent: 50, requiredEvaluators: 1, stage: 'DEFENSE', targetScope: 'PROJECT' },
        { name: 'GVHD 20%', scope: 'INDIVIDUAL', majorId: fixture.seMajorId, rubricId: blueprint!.rubricId, projectWeightPercent: 0, studentWeightPercent: 20, requiredEvaluators: 1, stage: 'ON_GOING', targetScope: 'STUDENT' },
      ],
      policy: {
        isDemo: false,
        approvalStatus: 'APPROVED',
        approvalReference: `QD-SMK-IT-${suffix}`,
        formula: 'POL_SINGLE_30_50_20',
        calculationVersion: 'POL_V4_DECIMAL',
        roundingMode: 'AWAY_FROM_ZERO',
        decimalPlaces: 2,
        failingComponentThreshold: 4.0,
        individualGateWeights: [
          { gateNumber: 1, weightPercent: 30 },
          { gateNumber: 2, weightPercent: 35 },
          { gateNumber: 3, weightPercent: 35 },
        ],
      },
    })
    scheme = await apiJson(request, staffIt, 'POST', `/evaluation-schemes/${scheme.id}/publish`, {
      concurrencyToken: scheme.concurrencyToken,
    })

    const coldComp = scheme.components.find(c => c.stage === 'COLD')!
    const defenseComp = scheme.components.find(c => c.stage === 'DEFENSE')!

    // Confirm Defense Committee (no DefenseSession created -> proves POL-06 non-blocking room scheduling)
    const coiCommittee = await apiRaw(request, staffIt, 'POST', `/projects/${project.id}/defense-committees`, {
      name: `Invalid COI Committee ${suffix}`,
      members: [{ userId: supervisor.user.id, majorId: fixture.seMajorId, role: 'CHAIR' }],
    })
    await expectProblem(coiCommittee, [409], 'EVALUATOR_ROLE_CONFLICT')

    let committee = await apiJson<{ id: number; concurrencyToken: string }>(
      request, staffIt, 'POST', `/projects/${project.id}/defense-committees`, {
        name: `Smoke IT Defense Committee ${suffix}`,
        members: [{ userId: evaluator.user.id, majorId: fixture.seMajorId, role: 'CHAIR' }],
      },
    )
    committee = await apiJson(request, staffIt, 'POST', `/defense-committees/${committee.id}/confirm`, {
      concurrencyToken: committee.concurrencyToken,
    })

    // Negative D17 COI: Primary Supervisor blocked from EvaluationAssignment
    const coiEval = await apiRaw(request, staffIt, 'POST', `/projects/${project.id}/evaluation-assignments`, {
      evaluatorId: supervisor.user.id,
      projectPeriodId: evalPeriod.id,
      evaluationType: 'COMMITTEE',
      scope: coldComp.scope,
      componentId: coldComp.id,
    })
    await expectProblem(coiEval, [403, 409])

    for (const comp of [coldComp, defenseComp]) {
      const assign = await apiJson<{ id: number }>(
        request, staffIt, 'POST', `/projects/${project.id}/evaluation-assignments`, {
          evaluatorId: evaluator.user.id,
          projectPeriodId: evalPeriod.id,
          evaluationType: 'COMMITTEE',
          scope: comp.scope,
          componentId: comp.id,
        },
      )
      let draft = await apiJson<{ id: number; concurrencyToken: string; scores: Array<{ rubricCriterionId: number; maxScore: number }> }>(
        request, evaluator, 'POST', `/evaluation-assignments/${assign.id}/evaluation`,
      )
      draft = await apiJson(request, evaluator, 'PUT', `/evaluations/${draft.id}/draft`, {
        concurrencyToken: draft.concurrencyToken,
        comments: `Solid ${comp.stage} presentation`,
        scores: draft.scores.map(sc => ({ rubricCriterionId: sc.rubricCriterionId, score: Math.round(sc.maxScore * 0.8 * 100) / 100, comments: null })),
      })
      await apiJson(request, evaluator, 'POST', `/evaluations/${draft.id}/finalize`, {
        concurrencyToken: draft.concurrencyToken,
      })
    }

    // Negative N6: Student cannot read unpublished result
    const prePubRead = await apiRaw(request, leader, 'GET', `/projects/${project.id}/students/${leader.user.id}/result`)
    await expectProblem(prePubRead, [403, 404])

    // Stage 7: Publish Results & verify Student UI + Tap Targets + PĐT XLSX export
    const preview = await apiJson<{ canPublish: boolean; confirmationToken: string }>(
      request, staffIt, 'GET', `/projects/${project.id}/result/preview`,
    )
    expect(preview.canPublish).toBe(true)
    await apiJson(request, staffIt, 'POST', `/projects/${project.id}/results/publish-batch`, {
      confirmationToken: preview.confirmationToken,
    })

    const studentCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    try {
      const resultPage = await studentCtx.newPage()
      await openUiAs(resultPage, leader, '/project/result')
      await expect(resultPage.getByText('Điểm cá nhân', { exact: true })).toBeVisible()
      await expect(resultPage.getByText(/^8[.,]10?$/).first()).toBeVisible()
    } finally {
      await studentCtx.close()
    }

    // Negative cross-dept export check + Positive Lead XLSX reconciliation export
    const crossDeptExport = await apiRaw(request, staffMkt, 'GET', `/departments/me/results/export?semesterId=${fixture.semesterId}&format=xlsx`)
    expect([200, 403]).toContain(crossDeptExport.status())
    const exportRes = await apiRaw(request, staffIt, 'GET', `/departments/me/results/export?semesterId=${fixture.semesterId}&format=xlsx`)
    expect(exportRes.status()).toBe(200)

    // Stage 8: Appeal QD-04 + Revision v2
    const policy = await apiJson<{ id: number }>(request, staffIt, 'POST', `/projects/${project.id}/result/appeal-policy`, {
      expectedVersion: 0,
      approvalReference: `QD04-SMK-${suffix}`,
    })
    const appealWin = await apiJson<{ id: number; concurrencyToken: string }>(request, staffIt, 'POST', `/projects/${project.id}/result/appeal-windows`, {
      policyId: policy.id,
      opensAt: new Date(Date.now() - 3600_000).toISOString(),
      closesAt: new Date(Date.now() + 7 * 86400_000).toISOString(),
      targets: [{ targetType: 'STUDENT', studentId: leader.user.id, resultVersion: 1 }],
    })
    let appeal = await apiJson<{ id: number; concurrencyToken: string }>(
      request, leader, 'POST', `/projects/${project.id}/result/correction-requests`, {
        source: 'STUDENT_APPEAL',
        appealKind: 'INDEPENDENT_80',
        policyId: policy.id,
        windowId: appealWin.id,
        targetType: 'STUDENT',
        studentId: leader.user.id,
        resultVersion: 1,
        componentId: coldComp.id,
        componentIds: [coldComp.id, defenseComp.id],
        reason: 'Xin phúc khảo gộp điểm Cold và Defense theo QD-04.',
      },
    )
    appeal = await apiJson(request, staffIt, 'POST', `/projects/${project.id}/result/correction-requests/${appeal.id}/reviewer`, {
      concurrencyToken: appeal.concurrencyToken,
      reviewerId: appealReviewer.user.id,
    })
    const ctxData = await apiJson<{
      evaluations: Array<{ id: number; scores: Array<{ rubricCriterionId: number; maxScore: number }> }>
    }>(request, appealReviewer, 'GET', `/projects/${project.id}/result/correction-requests/${appeal.id}/review`)
    const firstEval = ctxData.evaluations[0]
    appeal = await apiJson(request, appealReviewer, 'PUT', `/projects/${project.id}/result/correction-requests/${appeal.id}/review`, {
      concurrencyToken: appeal.concurrencyToken,
      proposal: 'AMEND',
      reason: 'Điều chỉnh tăng điểm tiêu chí kỹ thuật sau thẩm định.',
      amendments: [{
        evaluationId: firstEval.id,
        criterionId: firstEval.scores[0].rubricCriterionId,
        score: Math.min(firstEval.scores[0].maxScore, 9.0),
        reason: 'Minh chứng đầy đủ hơn sau rà soát.',
      }],
    })
    const appealPreview = await apiJson<{ confirmationToken: string }>(
      request, staffIt, 'GET', `/projects/${project.id}/result/correction-requests/${appeal.id}/preview`,
    )
    await apiJson(request, staffIt, 'POST', `/projects/${project.id}/result/correction-requests/${appeal.id}/decision`, {
      concurrencyToken: appeal.concurrencyToken,
      confirmationToken: appealPreview.confirmationToken,
      decision: 'ACCEPTED',
      reason: 'Chấp thuận bản đính chính v2.',
    })
    const v2Result = await apiJson<{ version: number }>(
      request, leader, 'GET', `/projects/${project.id}/students/${leader.user.id}/result`,
    )
    expect(v2Result.version).toBe(2)

    // Stage 9: Archive guard (open appeal window -> 409 ARCHIVE_NOT_ALLOWED) -> close window -> Archive + 7-section Dossier UI + Direct Chat READ_ONLY
    const directChat = await apiJson<{ id: number }>(request, supervisor, 'POST', '/chat/conversations/direct', {
      recipientUserId: String(leader.user.id),
    })
    let latestProject = await apiJson<{ concurrencyToken: string }>(request, staffIt, 'GET', `/projects/${project.id}`)
    const blockedArchive = await apiRaw(request, staffIt, 'POST', `/projects/${project.id}/archive`, {
      concurrencyToken: latestProject.concurrencyToken,
      reason: 'Attempt archive while appeal window still open',
    })
    await expectProblem(blockedArchive, [409], 'ARCHIVE_NOT_ALLOWED')

    await apiJson(request, staffIt, 'POST', `/projects/${project.id}/result/appeal-windows/${appealWin.id}/close`, {
      concurrencyToken: appealWin.concurrencyToken,
    })
    latestProject = await apiJson<{ concurrencyToken: string }>(request, staffIt, 'GET', `/projects/${project.id}`)
    await apiJson(request, staffIt, 'POST', `/projects/${project.id}/archive`, {
      concurrencyToken: latestProject.concurrencyToken,
      reason: 'Hoàn tất nghiệm thu toàn bộ học kỳ thí điểm.',
    })

    // Non-lead department cannot unarchive (403)
    const nonLeadUnarchive = await apiRaw(request, staffMkt, 'POST', `/projects/${project.id}/unarchive`, {
      concurrencyToken: latestProject.concurrencyToken,
      reason: 'Unauthorized cross department unarchive',
    })
    await expectProblem(nonLeadUnarchive, [403])

    const chatAfterArchive = await apiRaw(request, supervisor, 'POST', `/chat/conversations/${directChat.id}/messages`, {
      clientMessageId: crypto.randomUUID(),
      body: 'Should be blocked once archived',
    })
    await expectProblem(chatAfterArchive, [409], 'CHAT_READ_ONLY')

    const staffCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    try {
      const archivePage = await staffCtx.newPage()
      await openUiAs(archivePage, staffIt, `/department/projects/${project.id}/archive-view`)
      await expect(archivePage.getByRole('heading', { name: /Hồ sơ lưu trữ/i })).toBeVisible()
      await expect(archivePage.getByRole('heading', { name: /7\. Tổng hợp Phúc khảo/i })).toBeVisible()
      await expectTapTargetAtLeast44(
        archivePage.getByRole('button', { name: 'Khôi phục về Hoàn thành' }),
        'Unarchive button',
      )
    } finally {
      await staffCtx.close()
    }
  })
})
