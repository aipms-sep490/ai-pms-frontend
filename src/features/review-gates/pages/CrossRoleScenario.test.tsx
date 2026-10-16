import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reviewGatesMockAdapter } from '../api/review-gates-mock-adapter'
import {
  getStudentReviewTimeline,
  submitRevision,
  getAssignedReviews,
  verifyEvidence,
  submitGateDecision,
  publishReviewGateTemplate,
  saveReviewGateTemplate,
  getProjectReviewMatrix,
  getDefenseReadiness,
  updateHybridScopeDecision,
} from '../api/review-gates-api'
import { resolveReviewGateNotificationLink } from '../../notifications/NotificationRow'
import type { ReviewGateTemplate } from '../types/review-gates.types'

describe('Cross-Role QA & Contract Reconciliation (PROMPT 3 E2E Scenario)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    reviewGatesMockAdapter.reset()
  })

  describe('Step 1: Staff / Department Admin Governance & Policy Immutability', () => {
    it('enforces published template immutability (403 on structural modification)', async () => {
      // Step 1: Staff publishes the IT 2026 template
      const published = await publishReviewGateTemplate('tmpl-it-2026')
      expect(published.status).toBe('PUBLISHED')

      // Attempt to modify the gates of an already published policy
      const mutated: ReviewGateTemplate = {
        ...published,
        gates: [
          ...published.gates,
          {
            id: 'gate-rogue',
            code: 'R99',
            title: 'Rogue Gate',
            objective: 'Illegal modification',
            required: true,
            blockNextGate: true,
            start: '2026-12-01',
            end: '2026-12-31',
            reviewerPolicy: 'Admin',
            reviewScope: 'COMMON',
            requirements: [],
          },
        ],
      }

      await expect(saveReviewGateTemplate(mutated)).rejects.toThrow(/403: Không thể sửa đổi cấu trúc đợt thẩm định/)
    })

    it('allows publishing a draft/proposed template and advances version', async () => {
      const published = await publishReviewGateTemplate('tmpl-mkt-2026')
      expect(published.status).toBe('PUBLISHED')
      expect(parseFloat(published.version)).toBeGreaterThan(0.9)
    })
  })

  describe('Step 2 & 3: Student Leader vs Member Submission Authority (ST-01, ST-02)', () => {
    it('blocks regular student member from submitting revision (403)', async () => {
      await expect(
        submitRevision(
          {
            projectId: 'IT-01',
            gateCode: 'R2',
            requirementId: 'req-r2-2',
            artifactName: 'SDD_v2.0_Member.pdf',
            notes: 'Cố tình nộp bởi Member',
            expectedVersion: 1,
          },
          false, // isLeader = false
        ),
      ).rejects.toThrow(/403: Không đủ thẩm quyền. Chỉ trưởng nhóm/)
    })

    it('allows Student Leader to submit revised artifact with version increment', async () => {
      const timelineBefore = await getStudentReviewTimeline('IT-01')
      const gateR2Before = timelineBefore.gates.find((g) => g.code === 'R2')!
      const reqSDD = gateR2Before.requirements.find((r) => r.id === 'req-r2-2')!
      const initialVersion = reqSDD.latestArtifact?.version || 1

      const updatedTimeline = await submitRevision(
        {
          projectId: 'IT-01',
          gateCode: 'R2',
          requirementId: 'req-r2-2',
          artifactName: 'SDD_v2.0_BoundaryClarified.pdf',
          notes: 'Đã bổ sung Architecture Boundary và component interop theo yêu cầu phản hồi từ reviewer.',
          expectedVersion: initialVersion,
        },
        true, // isLeader = true
      )

      const gateR2After = updatedTimeline.gates.find((g) => g.code === 'R2')!
      const reqSDDAfter = gateR2After.requirements.find((r) => r.id === 'req-r2-2')!

      expect(reqSDDAfter.verificationStatus).toBe('SUBMITTED')
      expect(reqSDDAfter.latestArtifact?.version).toBe(initialVersion + 1)
      expect(reqSDDAfter.latestArtifact?.filename).toBe('SDD_v2.0_BoundaryClarified.pdf')
    })

    it('rejects submission with empty artifact filename or empty notes (422)', async () => {
      await expect(
        submitRevision(
          {
            projectId: 'IT-01',
            gateCode: 'R2',
            requirementId: 'req-r2-2',
            artifactName: '',
            notes: 'Có notes nhưng thiếu tệp',
            expectedVersion: 1,
          },
          true,
        ),
      ).rejects.toThrow(/422: Minh chứng nộp và lý do chỉnh sửa không được để trống/)
    })
  })

  describe('Step 4 & 5: Assigned Reviewer Workflow, 409 Concurrency & 422 Mandatory Gate Checks', () => {
    it('verifying evidence alone does NOT auto-PASS the gate (human decision required)', async () => {
      const assignments = await getAssignedReviews()
      const campusReview = assignments.find((a) => a.id === 'rev-it-01-r2')!

      // Reviewer approves the SDD requirement
      const updatedAssignment = await verifyEvidence({
        assignmentId: campusReview.id,
        requirementId: 'req-r2-2',
        decision: 'ACCEPTED',
        feedback: 'Hồ sơ thiết kế kiến trúc đã sửa chuẩn xác.',
        concurrencyToken: campusReview.concurrencyToken,
      })

      // The requirement is now ACCEPTED
      const sddReq = updatedAssignment.requirements.find((r) => r.id === 'req-r2-2')!
      expect(sddReq.verificationStatus).toBe('ACCEPTED')

      // But the Gate status remains unchanged until explicit human decision
      expect(updatedAssignment.status).toBe('IN_REVIEW')
      expect(updatedAssignment.latestDecision).toBe('REVISION_REQUIRED')
    })

    it('rejects Gate PASS if any mandatory evidence item is not ACCEPTED (422)', async () => {
      const assignments = await getAssignedReviews()
      const campusReview = assignments.find((a) => a.id === 'rev-it-01-r2')!

      // SDD is still REJECTED initially
      await expect(
        submitGateDecision({
          assignmentId: campusReview.id,
          decision: 'PASSED',
          notes: 'Duyệt vội khi chưa accept SDD',
          concurrencyToken: campusReview.concurrencyToken,
        }),
      ).rejects.toThrow(/422: Không thể xác nhận Gate PASS vì còn/)
    })

    it('detects concurrent modifications and rejects stale tokens with 409', async () => {
      const assignments = await getAssignedReviews()
      const campusReview = assignments.find((a) => a.id === 'rev-it-01-r2')!
      const staleToken = 'stale-token-from-older-session'

      await expect(
        verifyEvidence({
          assignmentId: campusReview.id,
          requirementId: 'req-r2-2',
          decision: 'ACCEPTED',
          feedback: 'Valid feedback',
          concurrencyToken: staleToken,
        }),
      ).rejects.toThrow(/409: Dữ liệu đã thay đổi bởi phiên làm việc khác/)

      await expect(
        submitGateDecision({
          assignmentId: campusReview.id,
          decision: 'REVISION_REQUIRED',
          notes: 'Yêu cầu làm lại',
          concurrencyToken: staleToken,
        }),
      ).rejects.toThrow(/409: Dữ liệu đã thay đổi bởi phiên làm việc khác/)
    })

    it('completes official PASS decision and transitions next gate to READY', async () => {
      const assignments = await getAssignedReviews()
      const campusReview = assignments.find((a) => a.id === 'rev-it-01-r2')!

      // First verify evidence
      const verified = await verifyEvidence({
        assignmentId: campusReview.id,
        requirementId: 'req-r2-2',
        decision: 'ACCEPTED',
        feedback: 'Đã hoàn thiện tài liệu thiết kế kiến trúc chuẩn.',
        concurrencyToken: campusReview.concurrencyToken,
      })

      // Submit Gate PASS with updated concurrency token
      const decided = await submitGateDecision({
        assignmentId: verified.id,
        decision: 'PASSED',
        notes: 'Hội đồng thống nhất thông qua Review Gate R2. Đồ án đủ điều kiện bước vào giai đoạn cài đặt.',
        concurrencyToken: verified.concurrencyToken,
      })

      expect(decided.status).toBe('DECIDED')
      expect(decided.latestDecision).toBe('PASSED')

      // Verify Student Timeline reflect Gate 2 PASSED and Gate 3 unlocked (READY)
      const studentTimeline = await getStudentReviewTimeline('IT-01')
      const gate2 = studentTimeline.gates.find((g) => g.code === 'R2')!
      const gate3 = studentTimeline.gates.find((g) => g.code === 'R3')!

      expect(gate2.status).toBe('PASSED')
      expect(gate3.reviewEligibility).toBe('READY')
      expect(gate3.blockingReasons).toEqual([])
    })
  })

  describe('Step 6 & 7: Interdisciplinary / Hybrid Scope Governance & Defense Readiness', () => {
    it('allows participating department to record major scope decision without overriding integration', async () => {
      const matrixBefore = await getProjectReviewMatrix('INTERDISCIPLINARY')
      const hybridProject = matrixBefore.find((p) => p.projectId === 'HYB-01')!
      expect(hybridProject.hybridScopes).toBeDefined()

      // Participating department updates IT scope to PASSED
      const updated = await updateHybridScopeDecision('HYB-01', 'IT', 'PASSED')
      expect(updated.hybridScopes?.['IT']).toBe('PASSED')
      // Gate G2 is still in progress because MKT and Design scopes are pending
      expect(updated.gateStatuses['G2']).not.toBe('PASSED')

      // Once all scopes pass, integration Gate G2 transitions
      await updateHybridScopeDecision('HYB-01', 'MKT', 'PASSED')
      const fullyApproved = await updateHybridScopeDecision('HYB-01', 'Design', 'PASSED')
      expect(fullyApproved.gateStatuses['G2']).toBe('PASSED')
      expect(fullyApproved.gateStatuses['G3']).toBe('IN_REVIEW')
    })

    it('blocks Defense Readiness when prerequisite review gates (R4) or checklist are incomplete', async () => {
      const readiness = await getDefenseReadiness('IT-01')
      expect(readiness.isReady).toBe(false)
      expect(readiness.blockedCount).toBeGreaterThan(0)

      const mandatoryUnsatisfied = readiness.conditions.filter((c) => c.isMandatory && !c.satisfied)
      expect(mandatoryUnsatisfied.length).toBeGreaterThan(0)
    })
  })

  describe('Step 8: Notification Center Deep Links & Context Resolution (NT-01)', () => {
    it('resolves correct deep links according to event type and user role', () => {
      expect(
        resolveReviewGateNotificationLink('GATE_REVISION_REQUIRED', ['STUDENT'])?.url,
      ).toBe('/project/timeline')

      expect(
        resolveReviewGateNotificationLink('GATE_REVIEW_ASSIGNED', ['LECTURER'])?.url,
      ).toBe('/review/gate-assignments')

      expect(
        resolveReviewGateNotificationLink('DISCIPLINE_REVIEW_PENDING', ['DEPARTMENT_STAFF'])?.url,
      ).toBe('/department/projects/progress-matrix')

      expect(
        resolveReviewGateNotificationLink('REVIEW_POLICY_PUBLISHED', ['ADMIN'])?.url,
      ).toBe('/department/projects/progress-matrix')

      expect(
        resolveReviewGateNotificationLink('GATE_DECISION_RECORDED', ['STUDENT'])?.url,
      ).toBe('/project/timeline')

      expect(
        resolveReviewGateNotificationLink('GATE_REVISION_SUBMITTED', ['LECTURER'])?.url,
      ).toBe('/review/gate-assignments')
    })
  })
})
