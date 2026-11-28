import React, { useEffect, useState } from 'react'
import { HttpError } from '../../../services/http/http-client'
import { getGateSessionScript, getStudentReviewTimeline, saveGateSessionScript } from '../api/review-gates-api'
import type { GateDeliveryMode, GateSessionScript } from '../types/gate-session-script.types'
import { GateSessionScriptModal } from './GateSessionScriptModal'

export interface GateModeItem {
  gateInstanceId: number
  gateCode: string
  gateTitle: string
  mode: GateDeliveryMode | null
  roomCode?: string | null
  liveKitRoomName?: string | null
  scheduledStartAt?: string | null
  scheduledEndAt?: string | null
  status: string
  script: GateSessionScript | null
}

export interface ReviewGateModeConfigPanelProps {
  projectId: number | string
  projectCode: string
  projectTitle: string
  onOpenRoomCanvas?: (roomCode: string) => void
  onJoinLiveKit?: (roomName: string) => void
}

export const ReviewGateModeConfigPanel: React.FC<ReviewGateModeConfigPanelProps> = ({
  projectId,
  projectCode,
  projectTitle,
  onOpenRoomCanvas,
  onJoinLiveKit,
}) => {
  const [gates, setGates] = useState<GateModeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGateId, setSelectedGateId] = useState<number | null>(null)
  const [selectedScript, setSelectedScript] = useState<GateSessionScript | null>(null)
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    void getStudentReviewTimeline(String(projectId))
      .then(async timeline => {
        if (!active) return
        const items = await Promise.all(
          timeline.gates.map(async gate => {
            const gateId = Number(gate.gateInstanceId)
            let script: GateSessionScript | null = null
            if (Number.isSafeInteger(gateId) && gateId > 0) {
              try {
                script = await getGateSessionScript(gateId)
              } catch (err) {
                if (!(err instanceof HttpError && err.status === 404)) {
                  script = null
                }
              }
            }
            return {
              gateInstanceId: gateId,
              gateCode: gate.code,
              gateTitle: gate.title,
              mode: script?.mode ?? null,
              roomCode: script?.roomCode ?? null,
              liveKitRoomName: script?.liveKitRoomName ?? null,
              scheduledStartAt: script?.scheduledStartAt ?? gate.windowStart,
              scheduledEndAt: script?.scheduledEndAt ?? gate.windowEnd,
              status: gate.status,
              script,
            } satisfies GateModeItem
          }),
        )
        if (active) setGates(items)
      })
      .catch(() => {
        if (active) setError('Không thể tải danh sách cổng kiểm duyệt của đồ án.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [projectId])

  const handleOpenScript = (gate: GateModeItem) => {
    const existing = gate.script
    const scriptData: GateSessionScript = existing ?? {
      gateCode: gate.gateCode,
      gateTitle: gate.gateTitle,
      projectId,
      projectCode,
      projectTitle,
      mode: 'ONLINE',
      scheduledStartAt: gate.scheduledStartAt ?? '',
      scheduledEndAt: gate.scheduledEndAt ?? '',
      presences: [],
      agendaStages: [],
      qaLog: [],
      remediationItems: [],
      generalNotes: '',
      verdict: 'PENDING',
    }
    setSelectedGateId(gate.gateInstanceId)
    setSelectedScript(scriptData)
    setIsScriptModalOpen(true)
  }

  return (
    <div className="rounded-2xl border border-hairline bg-card p-6 shadow-xs space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <h3 className="text-base font-bold text-ink">
            Hình thức &amp; Kịch bản Phiên Thẩm định (G1 – G3 · Tùy chọn)
          </h3>
          <p className="text-xs text-ink-muted">
            Cả 3 cổng G1–G3 hỗ trợ linh hoạt Online (LiveKit) hoặc Offline (bất kỳ phòng hoạt động đủ sức chứa). Kịch bản phiên là tùy chọn và không chặn quyết định của phản biện.
          </p>
        </div>
        <span className="rounded-full bg-canvas border border-hairline px-3 py-1 text-xs text-ink-soft">
          Đồ án: <strong className="text-ink">[{projectCode}] {projectTitle}</strong>
        </span>
      </div>

      {notice && (
        <div role="status" className="rounded-lg border border-status-success-border bg-status-success-bg p-3 text-xs font-semibold text-status-success-text">
          {notice}
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-xs font-semibold text-status-error-text">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-xs text-ink-muted">Đang tải thông tin phiên thẩm định từ máy chủ…</p>
      ) : gates.length === 0 ? (
        <p className="text-xs text-ink-muted">Đồ án chưa có cổng kiểm duyệt nào được khởi tạo.</p>
      ) : (
        <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-3">
          {gates.map((gate) => (
            <div key={gate.gateCode} className="flex h-full flex-col justify-between gap-3 rounded-xl border border-hairline bg-canvas p-4">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-md bg-primary-subtle px-2 py-0.5 text-xs font-bold text-primary">{gate.gateCode}</span>
                  <span className="text-xs font-semibold text-ink-muted">{gate.mode ?? 'Chưa tạo kịch bản'}</span>
                </div>
                <h4 className="mt-2 text-sm font-bold text-ink">{gate.gateTitle}</h4>
                <p className="mt-1 text-xs text-ink-muted">
                  {gate.script
                    ? gate.mode === 'OFFLINE'
                      ? `Offline · Phòng ${gate.roomCode ?? 'Chưa gán'}`
                      : `Online · ${gate.liveKitRoomName ?? 'LiveKit'}`
                    : 'Chưa tạo kịch bản phiên — tùy chọn (không chặn xác minh/quyết định cổng).'}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-2.5">
                {gate.mode === 'ONLINE' && gate.liveKitRoomName && onJoinLiveKit && (
                  <button
                    type="button"
                    onClick={() => onJoinLiveKit(gate.liveKitRoomName!)}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    Vào phòng LiveKit ↗
                  </button>
                )}
                {gate.mode === 'OFFLINE' && gate.roomCode && onOpenRoomCanvas && (
                  <button
                    type="button"
                    onClick={() => onOpenRoomCanvas(gate.roomCode!)}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    Xem phòng {gate.roomCode} ↗
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleOpenScript(gate)}
                  className="ml-auto inline-flex min-h-9 items-center gap-1 rounded-lg border border-hairline bg-card px-3 py-1 text-xs font-semibold text-ink hover:bg-canvas"
                >
                  <span className="material-symbols-outlined text-[15px]" aria-hidden="true">edit_note</span>
                  <span>{gate.script ? 'Xem / Sửa biên bản' : 'Tạo biên bản (Tùy chọn)'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedScript && (
        <GateSessionScriptModal
          isOpen={isScriptModalOpen}
          script={selectedScript}
          gateInstanceId={selectedGateId ?? undefined}
          onClose={() => setIsScriptModalOpen(false)}
          onSaveScript={async (updated) => {
            if (selectedGateId && selectedGateId > 0) {
              try {
                const saved = await saveGateSessionScript(selectedGateId, updated)
                setSelectedScript(saved)
                setGates(prev => prev.map(g => (g.gateInstanceId === selectedGateId ? { ...g, mode: saved.mode, roomCode: saved.roomCode, liveKitRoomName: saved.liveKitRoomName, script: saved } : g)))
                setNotice(`Đã lưu biên bản phiên ${saved.gateCode}.`)
                setError(null)
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Không thể lưu biên bản phiên lên máy chủ.')
              }
            } else {
              setSelectedScript(updated)
            }
          }}
          onViewRoomCanvas={onOpenRoomCanvas}
          onJoinLiveKit={onJoinLiveKit}
        />
      )}
    </div>
  )
}
