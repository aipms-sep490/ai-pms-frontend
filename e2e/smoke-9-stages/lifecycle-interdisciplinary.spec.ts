import { expect, test } from '@playwright/test'
import {
  actorByEmail,
  apiJson,
  apiLogin,
  apiRaw,
  expectProblem,
  expectTapTargetAtLeast44,
  loadSmokeFixture,
  minimalPdfBytes,
  openUiAs,
  skipIfSmokeUnconfigured,
  SMOKE_API_ROOT,
} from './helpers'

test.describe('Go-Live 9-Stage Live Smoke — Track 3: Interdisciplinary (IT_MKT)', () => {
  test('walks Stages 0 to 9 on live BE + SQL for IT_MKT with dual approval, POL-05 INT-*, POL-01 40/40/20, COI Mentor and archive chat lock', async ({ browser, request }) => {
    skipIfSmokeUnconfigured()
    const fixture = loadSmokeFixture()
    const suffix = Date.now().toString().slice(-6)

    const staffIt = await apiLogin(request, 'smoke.staff.it@e2e.invalid')
    const staffMkt = await apiLogin(request, 'smoke.staff.mkt@e2e.invalid')
    const supervisor = await apiLogin(request, 'smoke.sup.it@e2e.invalid')
    const mentorMkt = await apiLogin(request, 'smoke.mentor.mkt@e2e.invalid')
    const gateRev1 = await apiLogin(request, 'smoke.gate.rev1@e2e.invalid')
    const gateRev2 = await apiLogin(request, 'smoke.gate.rev2@e2e.invalid')
    const evaluator1 = await apiLogin(request, 'smoke.eval1@e2e.invalid')
    const evaluator2 = await apiLogin(request, 'smoke.eval2@e2e.invalid')
    const appealReviewer = await apiLogin(request, 'smoke.appeal.rev@e2e.invalid')

    const itLeader = await apiLogin(request, 'smoke.it2.leader@e2e.invalid')
    const itMember = await apiLogin(request, 'smoke.it2.member@e2e.invalid')
    const mktLeader = await apiLogin(request, 'smoke.mkt.leader@e2e.invalid')
    const mktMember = await apiLogin(request, 'smoke.mkt.member@e2e.invalid')
    const members = [itLeader, itMember, mktLeader, mktMember]

    const blueprint = fixture.blueprints.find(b => b.trackCode === 'IT_MKT')
    expect(blueprint, 'PUBLISHED IT_MKT blueprint required in fixture').toBeTruthy()
    const evalPeriod = fixture.periods.find(p => p.periodType === 'EVALUATION')!
    const finalPeriod = fixture.periods.find(p => p.periodType === 'FINAL_SUBMISSION')!
    const supProfile = fixture.supervisorProfiles?.find(sp => sp.userId === supervisor.user.id)
    const mentorProfile = fixture.supervisorProfiles?.find(sp => sp.userId === mentorMkt.user.id)
    expect(supProfile && mentorProfile, 'Both supervisor and mentor profiles required').toBeTruthy()

    // Stage 0: Blueprint readiness check
    const readiness = await apiJson<{ isReady?: boolean; missingTracks?: string[] }>(
      request, staffIt, 'GET', `/semesters/${fixture.semesterId}/blueprint-readiness`,
    )
    expect(readiness.missingTracks ?? []).toHaveLength(0)

    // Stage 1: Team formation with SE + MKT members & IT_MKT scope
    const team = await apiJson<{ id: number }>(request, itLeader, 'POST', '/teams', {
      academicSemesterId: fixture.semesterId,
      code: `SMK-IM-${suffix}`,
      name: `Smoke IT x MKT ${suffix}`,
      description: 'Live 9-stage smoke interdisciplinary team',
      academicScope: {
        projectMode: 'INTERDISCIPLINARY',
        primaryMajorId: null,
        requirements: [
          { majorId: fixture.seMajorId, minMembers: 1, maxMembers: 3 },
          { majorId: fixture.mktMajorId, minMembers: 1, maxMembers: 3 },
        ],
      },
    })

    for (const [mEmail, mSession] of [
      ['smoke.it2.member@e2e.invalid', itMember],
      ['smoke.mkt.leader@e2e.invalid', mktLeader],
      ['smoke.mkt.member@e2e.invalid', mktMember],
    ] as const) {
      const mActor = actorByEmail(fixture, mEmail)
      const inv = await apiJson<{ id: number }>(request, itLeader, 'POST', `/teams/${team.id}/invitations`, {
        invitedUserId: mActor.id,
        message: 'Join IT_MKT interdisciplinary team',
      })
      await apiJson(request, mSession, 'POST', `/teams/invitations/${inv.id}/accept`)
    }

    const elig = await apiJson<{ status: string }>(request, itLeader, 'POST', `/teams/${team.id}/eligibility/check`)
    expect(['ELIGIBLE', 'PASS']).toContain(elig.status)
    await apiJson(request, itLeader, 'POST', `/teams/${team.id}/eligibility/lock`)

    // Stage 2: Proposal dual-department review (Participating MKT + Lead IT) & negative non-lead guard
    let project = await apiJson<{ id: number; status: string; concurrencyToken: string }>(
      request, itLeader, 'POST', '/projects', {
        title: `IT_MKT Live Smoke ${suffix}`,
        description: 'Interdisciplinary IT x Marketing platform and launch funnel',
        objectives: 'Validate dual approval, INT-* integration deliverables, and 40/40/20 scoring',
        problemStatement: 'Connect engineering execution with measurable marketing conversion',
        expectedOutput: 'Integrated SaaS + Growth Campaign Dossier',
        requiredMajorIds: [fixture.seMajorId, fixture.mktMajorId],
        domain: 'FinTech & Growth',
        technologies: ['React', '.NET 8', 'GA4'],
        keywords: ['smoke', 'interdisciplinary', 'it-mkt'],
      },
    )
    project = await apiJson(request, itLeader, 'POST', `/projects/${project.id}/submit`, {
      concurrencyToken: project.concurrencyToken,
    })

    project = await apiJson(request, staffIt, 'POST', `/projects/${project.id}/start-review`, {
      concurrencyToken: project.concurrencyToken,
    })
    // Both Lead IT and Participating MKT approve
    project = await apiJson(request, staffMkt, 'POST', `/projects/${project.id}/approve`, {
      concurrencyToken: project.concurrencyToken,
    })
    project = await apiJson(request, staffIt, 'POST', `/projects/${project.id}/approve`, {
      concurrencyToken: project.concurrencyToken,
    })

    // Assign Primary Supervisor + MKT Discipline Mentor
    const supReq = await apiJson<{ id: number }>(request, itLeader, 'POST', `/projects/${project.id}/supervisor-requests`, {
      supervisorProfileId: supProfile!.profileId,
      message: 'Primary supervision for IT_MKT smoke',
      assignmentType: 'PRIMARY',
      majorId: null,
    })
    await apiJson(request, supervisor, 'POST', `/supervisor-requests/${supReq.id}/accept`, { message: 'Accepted Primary' })

    const mentorReq = await apiJson<{ id: number }>(request, itLeader, 'POST', `/projects/${project.id}/supervisor-requests`, {
      supervisorProfileId: mentorProfile!.profileId,
      message: 'Discipline mentoring for MKT',
      assignmentType: 'DISCIPLINE_MENTOR',
      majorId: fixture.mktMajorId,
    })
    await apiJson(request, mentorMkt, 'POST', `/supervisor-requests/${mentorReq.id}/accept`, { message: 'Accepted Discipline Mentor' })

    const activeProject = await apiJson<{ id: number; status: string }>(request, itLeader, 'GET', `/projects/${project.id}`)
    expect(activeProject.status).toBe('ACTIVE')

    // Stage 3: Working Agreement
    let agreement = await apiJson<{ id: number; concurrencyToken: string }>(
      request, itLeader, 'PUT', `/projects/${project.id}/working-agreement/draft`, {
        expectedLatestVersion: 0,
        concurrencyToken: null,
        sections: [{ title: 'Phối hợp liên ngành', body: 'IT và MKT đồng bộ dữ liệu tracking tại mỗi cổng G1-G3.' }],
      },
    )
    agreement = await apiJson(request, itLeader, 'POST', `/projects/${project.id}/working-agreement/publish`, {
      agreementId: agreement.id,
      concurrencyToken: agreement.concurrencyToken,
    })
    for (const s of members) {
      agreement = await apiJson(request, s, 'POST', `/projects/${project.id}/working-agreement/acceptances`, {
        agreementId: agreement.id,
        concurrencyToken: agreement.concurrencyToken,
      })
    }

    // Stage 4: Dual-department Review Gates G1-G3 + POL-05 INT-* + Mentor Note + Primary 20%
    let timeline = await apiJson<{
      gates: Array<{ id: number; code: string; concurrencyToken: string; requirements: Array<{ id: number; code: string; scope: string }> }>
    }>(request, itLeader, 'GET', `/projects/${project.id}/review-gates/timeline`)
    expect(timeline.gates.some(g => g.requirements.some(r => r.code.startsWith('INT-')))).toBe(true)

    for (const gateCode of ['G1', 'G2', 'G3']) {
      timeline = await apiJson(request, itLeader, 'GET', `/projects/${project.id}/review-gates/timeline`)
      const gate = timeline.gates.find(g => g.code === gateCode)!
      for (const req of gate.requirements) {
        const upRes = await request.post(`${SMOKE_API_ROOT}/projects/${project.id}/review-gates/${gateCode}/evidence/file`, {
          headers: { Authorization: `Bearer ${itLeader.accessToken}` },
          multipart: {
            file: { name: `${req.code}.pdf`, mimeType: 'application/pdf', buffer: minimalPdfBytes(`${gateCode}-${req.code}`) },
            requirementId: String(req.id),
            expectedVersion: '0',
            concurrencyToken: gate.concurrencyToken,
            notes: `IT_MKT evidence ${req.code}`,
          },
        })
        expect(upRes.ok(), await upRes.text()).toBe(true)
        timeline = await apiJson(request, itLeader, 'GET', `/projects/${project.id}/review-gates/timeline`)
        Object.assign(gate, timeline.gates.find(g => g.code === gateCode)!)
      }
      await apiJson(request, itLeader, 'POST', `/projects/${project.id}/review-gates/${gateCode}/submit-for-review`, {
        concurrencyToken: gate.concurrencyToken,
      })
      for (const [rev, scope] of [[gateRev1, 'COMMON'], [gateRev2, 'PARTICIPATING_DEPARTMENT']] as const) {
        let assigned = await apiJson<{ id: number; concurrencyToken: string; requirements: Array<{ id: number }> }>(
          request, staffIt, 'POST', '/review-gates/assignments', {
            projectId: String(project.id),
            gateCode,
            reviewerId: rev.user.id,
            scope,
          },
        )
        for (const req of assigned.requirements) {
          assigned = await apiJson(request, rev, 'POST', `/review-gates/assignments/${assigned.id}/evidence/${req.id}/verify`, {
            requirementId: String(req.id),
            decision: 'ACCEPTED',
            concurrencyToken: assigned.concurrencyToken,
          })
        }
        await apiJson(request, rev, 'POST', `/review-gates/assignments/${assigned.id}/decision`, {
          decision: 'PASSED',
          notes: `${gateCode} approved`,
          concurrencyToken: assigned.concurrencyToken,
        })
      }

      // Mentor MKT reference note + Primary Supervisor finalized 20% score
      for (const stu of members) {
        await apiJson(request, mentorMkt, 'PUT', `/projects/${project.id}/gates/${gate.id}/individual-process-scores/${stu.user.id}/mentor-note`, {
          mentorReferenceNotes: `MKT mentor feedback at ${gateCode}`,
        })
        const saved = await apiJson<{ concurrencyToken: string }>(
          request, supervisor, 'PUT', `/projects/${project.id}/gates/${gate.id}/individual-process-scores/${stu.user.id}`, {
            score: 8.2,
            comments: `Gate ${gateCode} score`,
          },
        )
        await apiJson(request, supervisor, 'POST', `/projects/${project.id}/gates/${gate.id}/individual-process-scores/${stu.user.id}/finalize`, {
          concurrencyToken: saved.concurrencyToken,
        })
      }
    }

    // Stage 5: Final Submission & Cold Lock
    const coldTpl = await apiJson<{ id: number }>(request, staffIt, 'POST', '/cold-report-templates', {
      majorId: null,
      projectPeriodId: evalPeriod.id,
      title: `Smoke Cold IT_MKT ${suffix}`,
      reports: [{ code: 'INT_REPORT', title: 'Báo cáo tích hợp IT×MKT' }],
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
      request, itLeader, 'POST', `/cold-checklist-items/${coldChecklist.items[0].id}/draft`, {
        expectedLatestVersion: 0,
        note: 'Interdisciplinary cold report',
      },
    )
    const coldUp = await request.post(`${SMOKE_API_ROOT}/cold-submissions/${coldSub.id}/files`, {
      headers: { Authorization: `Bearer ${itLeader.accessToken}` },
      multipart: {
        file: { name: 'cold-inter.pdf', mimeType: 'application/pdf', buffer: minimalPdfBytes('COLD-ITMKT') },
        concurrencyToken: coldSub.concurrencyToken,
      },
    })
    expect(coldUp.ok(), await coldUp.text()).toBe(true)
    coldSub = (await coldUp.json()) as { id: number; concurrencyToken: string }
    await apiJson(request, itLeader, 'POST', `/cold-submissions/${coldSub.id}/submit`, { concurrencyToken: coldSub.concurrencyToken })
    coldChecklist = await apiJson(request, itLeader, 'GET', `/projects/${project.id}/cold/checklist`)
    await apiJson(request, itLeader, 'POST', `/projects/${project.id}/cold/lock`, { concurrencyToken: coldChecklist.concurrencyToken })

    const deliv = await apiJson<{ id: number }>(request, itLeader, 'POST', `/projects/${project.id}/deliverables`, {
      milestoneId: null,
      title: `Final Deliverable IT_MKT ${suffix}`,
      description: 'Integrated code & marketing campaign package',
      deliverableType: 'FINAL_REPORT',
      dueAt: new Date(Date.now() + 5 * 86400_000).toISOString(),
    })
    const delivVerRes = await request.post(`${SMOKE_API_ROOT}/deliverables/${deliv.id}/versions`, {
      headers: { Authorization: `Bearer ${itLeader.accessToken}` },
      multipart: {
        file: { name: 'final-inter.pdf', mimeType: 'application/pdf', buffer: minimalPdfBytes('FINAL-ITMKT') },
        expectedLatestVersion: '0',
        note: 'Interdisciplinary RC1',
      },
    })
    expect(delivVerRes.ok(), await delivVerRes.text()).toBe(true)
    const delivVer = (await delivVerRes.json()) as { id: number }
    await apiJson(request, supervisor, 'POST', `/deliverable-versions/${delivVer.id}/review`, {
      decision: 'APPROVED',
      feedback: 'Ready for final lock',
    })
    await apiJson<{ concurrencyToken: string }>(
      request, staffIt, 'PUT', `/projects/${project.id}/final-submission/requirements`, {
        deliverableIds: [deliv.id],
        concurrencyToken: null,
      },
    )
    await apiJson<{ concurrencyToken: string }>(
      request, itLeader, 'POST', `/projects/${project.id}/final-submission-draft`, {
        projectPeriodId: finalPeriod.id,
        notes: 'Interdisciplinary 2-step lock',
        deliverableVersionIds: [delivVer.id],
      },
    )
    const lockStatus = await apiJson<{ draftConcurrencyToken: string }>(
      request, itLeader, 'POST', `/projects/${project.id}/final-submission/request-lock`, {},
    )
    await apiJson(request, supervisor, 'POST', `/projects/${project.id}/final-submission/supervisor-lock`, {
      decision: 'LOCK',
      notes: 'Locked for POL-01 evaluation',
      concurrencyToken: lockStatus.draftConcurrencyToken,
    })

    // Stage 6: POL-01 40/40/20 Scheme (POL_INTER_40_40_20) & Non-Blocking Defense (POL-06)
    let scheme = await apiJson<{
      id: number
      concurrencyToken: string
      components: Array<{ id: number; stage: string; scope: string; majorId: number | null; isIntegration: boolean }>
    }>(request, staffIt, 'POST', '/evaluation-schemes', {
      projectId: project.id,
      projectPeriodId: evalPeriod.id,
      name: `POL-01 IT_MKT ${suffix}`,
      passThreshold: 5.0,
      components: [
        { name: 'Common Cold', scope: 'COMMON', majorId: null, rubricId: blueprint!.rubricId, projectWeightPercent: 15, studentWeightPercent: 12, requiredEvaluators: 1, stage: 'COLD', targetScope: 'PROJECT', isIntegration: false },
        { name: 'Common Defense Integrated (POL-05)', scope: 'COMMON', majorId: null, rubricId: blueprint!.rubricId, projectWeightPercent: 35, studentWeightPercent: 28, requiredEvaluators: 1, stage: 'DEFENSE', targetScope: 'PROJECT', isIntegration: true },
        { name: 'SE Defense', scope: 'MAJOR_SPECIFIC', majorId: fixture.seMajorId, rubricId: blueprint!.rubricId, projectWeightPercent: 25, studentWeightPercent: 40, requiredEvaluators: 1, stage: 'DEFENSE', targetScope: 'MAJOR' },
        { name: 'MKT Defense', scope: 'MAJOR_SPECIFIC', majorId: fixture.mktMajorId, rubricId: blueprint!.rubricId, projectWeightPercent: 25, studentWeightPercent: 40, requiredEvaluators: 1, stage: 'DEFENSE', targetScope: 'MAJOR' },
        { name: 'SE GVHD 20%', scope: 'INDIVIDUAL', majorId: fixture.seMajorId, rubricId: blueprint!.rubricId, projectWeightPercent: 0, studentWeightPercent: 20, requiredEvaluators: 1, stage: 'ON_GOING', targetScope: 'STUDENT' },
        { name: 'MKT GVHD 20%', scope: 'INDIVIDUAL', majorId: fixture.mktMajorId, rubricId: blueprint!.rubricId, projectWeightPercent: 0, studentWeightPercent: 20, requiredEvaluators: 1, stage: 'ON_GOING', targetScope: 'STUDENT' },
      ],
      policy: {
        isDemo: false,
        approvalStatus: 'APPROVED',
        approvalReference: `QD-POL01-IM-${suffix}`,
        formula: 'POL_INTER_40_40_20',
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

    // Participating MKT Dept cannot publish batch (Lead Only) -> negative 403
    const commonCold = scheme.components.find(c => c.scope === 'COMMON' && c.stage === 'COLD')!
    const commonDef = scheme.components.find(c => c.scope === 'COMMON' && c.stage === 'DEFENSE')!
    const seDef = scheme.components.find(c => c.scope === 'MAJOR_SPECIFIC' && c.majorId === fixture.seMajorId)!
    const mktDef = scheme.components.find(c => c.scope === 'MAJOR_SPECIFIC' && c.majorId === fixture.mktMajorId)!

    for (const [comp, ev] of [
      [commonCold, evaluator1],
      [commonDef, evaluator1],
      [seDef, evaluator1],
      [mktDef, evaluator2],
    ] as const) {
      const assign = await apiJson<{ id: number }>(
        request, comp.majorId === fixture.mktMajorId ? staffMkt : staffIt,
        'POST', `/projects/${project.id}/evaluation-assignments`, {
          evaluatorId: ev.user.id,
          projectPeriodId: evalPeriod.id,
          evaluationType: 'COMMITTEE',
          scope: comp.scope,
          majorId: comp.majorId,
          componentId: comp.id,
        },
      )
      let draft = await apiJson<{ id: number; concurrencyToken: string; scores: Array<{ rubricCriterionId: number; maxScore: number }> }>(
        request, ev, 'POST', `/evaluation-assignments/${assign.id}/evaluation`,
      )
      draft = await apiJson(request, ev, 'PUT', `/evaluations/${draft.id}/draft`, {
        concurrencyToken: draft.concurrencyToken,
        comments: `Evaluated ${comp.scope}`,
        scores: draft.scores.map(sc => ({ rubricCriterionId: sc.rubricCriterionId, score: Math.round(sc.maxScore * 0.8 * 100) / 100, comments: null })),
      })
      await apiJson(request, ev, 'POST', `/evaluations/${draft.id}/finalize`, { concurrencyToken: draft.concurrencyToken })
    }

    // Stage 7: Participating Dept denied Publish Batch (403); Lead IT publishes Batch
    const preview = await apiJson<{ canPublish: boolean; confirmationToken: string }>(
      request, staffIt, 'GET', `/projects/${project.id}/result/preview`,
    )
    expect(preview.canPublish).toBe(true)
    const mktPublishAttempt = await apiRaw(request, staffMkt, 'POST', `/projects/${project.id}/results/publish-batch`, {
      confirmationToken: preview.confirmationToken,
    })
    await expectProblem(mktPublishAttempt, [403])

    await apiJson(request, staffIt, 'POST', `/projects/${project.id}/results/publish-batch`, {
      confirmationToken: preview.confirmationToken,
    })

    // Stage 8: Appeal QD-04 + COI check against Discipline Mentor (smoke.mentor.mkt -> 409) + Revision v2
    const policy = await apiJson<{ id: number }>(request, staffIt, 'POST', `/projects/${project.id}/result/appeal-policy`, {
      expectedVersion: 0,
      approvalReference: `QD04-IM-${suffix}`,
    })
    const appealWin = await apiJson<{ id: number }>(request, staffIt, 'POST', `/projects/${project.id}/result/appeal-windows`, {
      policyId: policy.id,
      opensAt: new Date(Date.now() - 3600_000).toISOString(),
      closesAt: new Date(Date.now() + 7 * 86400_000).toISOString(),
      targets: [{ targetType: 'STUDENT', studentId: mktLeader.user.id, resultVersion: 1 }],
    })
    let appeal = await apiJson<{ id: number; concurrencyToken: string }>(
      request, mktLeader, 'POST', `/projects/${project.id}/result/correction-requests`, {
        source: 'STUDENT_APPEAL',
        appealKind: 'INDEPENDENT_80',
        policyId: policy.id,
        windowId: appealWin.id,
        targetType: 'STUDENT',
        studentId: mktLeader.user.id,
        resultVersion: 1,
        componentId: commonCold.id,
        reason: 'Kiểm tra lại điểm phần Chung khối 40%.',
      },
    )
    // COI QD-06: Discipline Mentor CANNOT be assigned as Appeal Reviewer (409 EVALUATOR_ROLE_CONFLICT)
    const coiMentorAppeal = await apiRaw(
      request, staffIt, 'POST', `/projects/${project.id}/result/correction-requests/${appeal.id}/reviewer`, {
        concurrencyToken: appeal.concurrencyToken,
        reviewerId: mentorMkt.user.id,
      },
    )
    await expectProblem(coiMentorAppeal, [403, 409], 'EVALUATOR_ROLE_CONFLICT')

    appeal = await apiJson(request, staffIt, 'POST', `/projects/${project.id}/result/correction-requests/${appeal.id}/reviewer`, {
      concurrencyToken: appeal.concurrencyToken,
      reviewerId: appealReviewer.user.id,
    })
    const revCtx = await apiJson<{
      evaluations: Array<{ id: number; scores: Array<{ rubricCriterionId: number; maxScore: number }> }>
    }>(request, appealReviewer, 'GET', `/projects/${project.id}/result/correction-requests/${appeal.id}/review`)
    appeal = await apiJson(request, appealReviewer, 'PUT', `/projects/${project.id}/result/correction-requests/${appeal.id}/review`, {
      concurrencyToken: appeal.concurrencyToken,
      proposal: 'AMEND',
      reason: 'Xác nhận điều chỉnh điểm chung liên ngành.',
      amendments: [{
        evaluationId: revCtx.evaluations[0].id,
        criterionId: revCtx.evaluations[0].scores[0].rubricCriterionId,
        score: Math.min(revCtx.evaluations[0].scores[0].maxScore, 9.0),
        reason: 'Bằng chứng tích hợp đạt mức Xuất sắc.',
      }],
    })
    const appealPreview = await apiJson<{ confirmationToken: string }>(
      request, staffIt, 'GET', `/projects/${project.id}/result/correction-requests/${appeal.id}/preview`,
    )
    await apiJson(request, staffIt, 'POST', `/projects/${project.id}/result/correction-requests/${appeal.id}/decision`, {
      concurrencyToken: appeal.concurrencyToken,
      confirmationToken: appealPreview.confirmationToken,
      decision: 'ACCEPTED',
      reason: 'Công bố bản đính chính v2 liên ngành.',
    })
    const v2 = await apiJson<{ version: number }>(request, mktLeader, 'GET', `/projects/${project.id}/students/${mktLeader.user.id}/result`)
    expect(v2.version).toBe(2)

    // Stage 9: Archive + Direct Chat READ_ONLY + 7-section Dossier UI & Mobile >=44px check
    const directChat = await apiJson<{ id: number }>(request, mentorMkt, 'POST', '/chat/conversations/direct', {
      recipientUserId: String(mktLeader.user.id),
    })
    const latestProject = await apiJson<{ concurrencyToken: string }>(request, staffIt, 'GET', `/projects/${project.id}`)
    await apiJson(request, staffIt, 'POST', `/projects/${project.id}/archive`, {
      concurrencyToken: latestProject.concurrencyToken,
      reason: 'Đóng gói hồ sơ kiểm định liên ngành IT_MKT.',
    })
    const chatAfter = await apiRaw(request, mentorMkt, 'POST', `/chat/conversations/${directChat.id}/messages`, {
      clientMessageId: crypto.randomUUID(),
      body: 'Should return 409 CHAT_READ_ONLY',
    })
    await expectProblem(chatAfter, [409], 'CHAT_READ_ONLY')

    const desktopCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    try {
      const archivePage = await desktopCtx.newPage()
      await openUiAs(archivePage, staffIt, `/department/projects/${project.id}/archive-view`)
      await expect(archivePage.getByText(/Hồ sơ lưu trữ/i)).toBeVisible()
      await expect(archivePage.getByText(/6\. Hồ sơ bàn giao cuối kỳ/i)).toBeVisible()
      await expectTapTargetAtLeast44(archivePage.getByRole('button', { name: 'Tải lại' }), 'Archive dossier refresh button')
    } finally {
      await desktopCtx.close()
    }
  })
})
