import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ReviewGateModeConfigPanel } from './ReviewGateModeConfigPanel'
import { GateSessionScriptModal } from './GateSessionScriptModal'
import * as reviewGatesApi from '../api/review-gates-api'
import type { GateSessionScript } from '../types/gate-session-script.types'

vi.mock('../api/review-gates-api', () => ({
  getStudentReviewTimeline: vi.fn(),
  getGateSessionScript: vi.fn(),
  saveGateSessionScript: vi.fn(),
}))

afterEach(() => {
  cleanup()
})

describe('ReviewGateModeConfigPanel (TK-W2-12)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(reviewGatesApi.getStudentReviewTimeline).mockResolvedValue({
      projectId: '12',
      projectCode: 'PRJ-012',
      projectName: 'AI-PMS Demo',
      projectMode: 'SINGLE_MAJOR',
      major: 'SE',
      effectivePolicyVersion: '1',
      currentGateCode: 'G1',
      gates: [
        { gateInstanceId: '101', code: 'G1', title: 'Cổng 1', objective: '', status: 'PASSED', reviewEligibility: 'READY', isRequired: true, windowStart: null, windowEnd: null, blockingReasons: [], requirements: [] },
        { gateInstanceId: '102', code: 'G2', title: 'Cổng 2', objective: '', status: 'IN_REVIEW', reviewEligibility: 'READY', isRequired: true, windowStart: null, windowEnd: null, blockingReasons: [], requirements: [] },
        { gateInstanceId: '103', code: 'G3', title: 'Cổng 3', objective: '', status: 'PLANNED', reviewEligibility: 'BLOCKED', isRequired: true, windowStart: null, windowEnd: null, blockingReasons: [], requirements: [] },
      ],
      capabilities: { canSubmitPackage: true, canSubmitRevision: false, blockingReasons: [] },
    })
    vi.mocked(reviewGatesApi.getGateSessionScript).mockImplementation(async (rawGateId: string | number) => {
      const gateId = Number(rawGateId)
      return {
        gateCode: gateId === 101 ? 'G1' : gateId === 102 ? 'G2' : 'G3',
        gateTitle: `Cổng ${gateId - 100}`,
        projectId: 12,
        projectCode: 'PRJ-012',
        projectTitle: 'AI-PMS Demo',
        mode: gateId === 103 ? 'OFFLINE' : 'ONLINE',
        roomCode: gateId === 103 ? 'A-101' : undefined,
        liveKitRoomName: gateId === 103 ? undefined : `livekit-gate-g${gateId - 100}-prj012`,
        scheduledStartAt: '',
        scheduledEndAt: '',
        presences: [],
        agendaStages: [],
        qaLog: [],
        remediationItems: [],
        generalNotes: '',
        verdict: 'PENDING',
      }
    })
  })

  it('loads G1–G3 timeline and optional scripts without static mock names or hardcoded room floor rules', async () => {
    render(
      <ReviewGateModeConfigPanel
        projectId={12}
        projectCode="PRJ-012"
        projectTitle="AI-PMS Demo"
      />
    )

    expect(await screen.findByText('G1')).toBeTruthy()
    expect(screen.getByText('G2')).toBeTruthy()
    expect(screen.getByText('G3')).toBeTruthy()
    expect(screen.getByText(/Online · livekit-gate-g1-prj012/)).toBeTruthy()
    expect(screen.getByText(/Offline · Phòng A-101/)).toBeTruthy()
  })

  it('allows opening script modal and saving a Gate 3 ONLINE/OFFLINE script to BE', async () => {
    vi.mocked(reviewGatesApi.saveGateSessionScript).mockImplementation(async (_id, script) => script as GateSessionScript)
    render(
      <ReviewGateModeConfigPanel
        projectId={12}
        projectCode="PRJ-012"
        projectTitle="AI-PMS Demo"
      />
    )

    await screen.findByText('G1')
    const scriptBtns = screen.getAllByRole('button', { name: 'Xem / Sửa biên bản' })
    fireEvent.click(scriptBtns[0])

    expect(await screen.findByText(/Kịch bản & Biên bản thẩm định G1/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Lưu biên bản & Phán quyết' }))
    expect(await screen.findByText('Đã lưu biên bản phiên G1.')).toBeTruthy()
  })
})

describe('GateSessionScriptModal', () => {
  const sampleScript: GateSessionScript = {
    gateCode: 'R2',
    gateTitle: 'Kiến trúc hệ thống (SDD)',
    projectId: 12,
    projectCode: 'PRJ-012',
    projectTitle: 'AI-PMS Demo',
    mode: 'ONLINE',
    liveKitRoomName: 'livekit-gate-r2-prj012',
    scheduledStartAt: '2026-11-20 09:30',
    scheduledEndAt: '2026-11-20 10:45',
    totalElapsedMinutes: 52,
    presences: [
      { userId: 1, name: 'TS. Phạm Quốc Dũng', role: 'Chủ tịch HĐ', isPresent: true, durationMinutes: 50 },
    ],
    agendaStages: [
      { stage: '1. Khai mạc phiên thẩm định', durationMinutes: 5, status: 'COMPLETED' },
      { stage: '2. Nhóm sinh viên trình bày Slide & Demo', durationMinutes: 25, status: 'IN_PROGRESS' },
    ],
    qaLog: [
      {
        id: 'qa-1',
        askerName: 'TS. Phạm Quốc Dũng',
        askerRole: 'CHAIR',
        question: 'Giải pháp bảo mật API ra sao?',
        answeredBy: 'Nguyễn Văn A',
        evaluation: 'SATISFACTORY',
      },
    ],
    remediationItems: [],
    generalNotes: '',
    verdict: 'PENDING',
  }

  it('renders online LiveKit header, agenda stages, and Q&A log', () => {
    const handleSave = vi.fn()
    render(
      <GateSessionScriptModal
        isOpen={true}
        script={sampleScript}
        onClose={vi.fn()}
        onSaveScript={handleSave}
      />
    )

    expect(screen.getByText(/Kịch bản & Biên bản thẩm định R2/)).toBeTruthy()
    expect(screen.getByText('ONLINE (LiveKit)')).toBeTruthy()
    expect(screen.getByText('1. Khai mạc phiên thẩm định')).toBeTruthy()

    // Switch to Q&A Log tab
    fireEvent.click(screen.getByText(/3\. Sổ ghi chép Vấn đáp Q&A/))
    expect(screen.getByText(/Giải pháp bảo mật API ra sao\?/i)).toBeTruthy()
    expect(screen.getByText('Nguyễn Văn A')).toBeTruthy()

    // Switch to Verdict tab and select PASSED
    fireEvent.click(screen.getByText(/5\. Kết luận & Chữ ký/))
    fireEvent.click(screen.getByText('ĐẠT (PASSED)'))

    // Save
    fireEvent.click(screen.getByText('Lưu biên bản & Phán quyết'))
    expect(handleSave).toHaveBeenCalled()
  })
})
