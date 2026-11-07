import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ReviewGateModeConfigPanel } from './ReviewGateModeConfigPanel'
import { GateSessionScriptModal } from './GateSessionScriptModal'
import type { GateSessionScript } from '../types/gate-session-script.types'

afterEach(() => {
  cleanup()
})

describe('ReviewGateModeConfigPanel', () => {
  it('renders all 4 gates R1 to R4 with initial online/offline modes', () => {
    render(
      <ReviewGateModeConfigPanel
        projectId={12}
        projectCode="PRJ-012"
        projectTitle="AI-PMS Demo"
      />
    )

    expect(screen.getByText('R1')).toBeTruthy()
    expect(screen.getByText('R2')).toBeTruthy()
    expect(screen.getByText('R3')).toBeTruthy()
    expect(screen.getByText('R4')).toBeTruthy()

    // R1 is ONLINE
    expect(screen.getByText('livekit-gate-r1-prj012')).toBeTruthy()
    // R3 is OFFLINE
    expect(screen.getByText('A-201')).toBeTruthy()
  })

  it('allows toggling gate from Online to Offline and shows room allocation', () => {
    render(
      <ReviewGateModeConfigPanel
        projectId={12}
        projectCode="PRJ-012"
        projectTitle="AI-PMS Demo"
      />
    )

    // Find the toggle buttons for R1 and click Offline
    const offlineButtons = screen.getAllByRole('button', { name: 'Offline' })
    fireEvent.click(offlineButtons[0]) // Toggle R1 to Offline

    expect(screen.getByText(/Đã chuyển Cổng R1 sang OFFLINE/)).toBeTruthy()
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
