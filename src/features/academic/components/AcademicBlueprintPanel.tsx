import { useCallback, useEffect, useState } from 'react'
import * as api from '../api/academic-blueprints-api'
import { HttpError } from '../../../services/http/http-client'
import { BlueprintDraftModal } from './BlueprintDraftModal'

interface AcademicBlueprintPanelProps {
  semesterId: number
  projectId?: number
  actorDepartmentId?: number
  departments?: Array<{ id: number; code: string; name: string }>
}

const TRACK_LABELS: Record<api.AcademicTrackCode, string> = {
  IT_ONLY: 'Đơn ngành IT',
  MKT_ONLY: 'Đơn ngành MKT',
  IT_MKT: 'Liên ngành IT × MKT',
}

export function AcademicBlueprintPanel({ semesterId, projectId, actorDepartmentId, departments = [] }: AcademicBlueprintPanelProps) {
  const [blueprints, setBlueprints] = useState<api.AcademicBlueprintDto[]>([])
  const [readiness, setReadiness] = useState<api.SemesterReadinessDto | null>(null)
  const [dryRun, setDryRun] = useState<api.BlueprintDryRunDiffDto | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBlueprint, setEditingBlueprint] = useState<api.AcademicBlueprintDto | null>(null)

  const load = useCallback(async () => {
    try {
      const [bps, ready] = await Promise.all([
        api.listAcademicBlueprints({ semesterId }),
        api.getSemesterBlueprintReadiness(semesterId),
      ])
      setBlueprints(bps)
      setReadiness(ready)
      setError(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể tải AcademicBlueprint.')
    }
  }, [semesterId])

  useEffect(() => {
    void load()
  }, [load])

  const handleAction = async (id: number, fn: () => Promise<unknown>, okMsg: string) => {
    setBusyId(id)
    setError(null)
    setNotice(null)
    try {
      await fn()
      await load()
      setNotice(okMsg)
    } catch (reason) {
      if (reason instanceof HttpError) {
        setError(reason.message || `Lỗi ${reason.status}`)
      } else {
        setError(reason instanceof Error ? reason.message : 'Thao tác thất bại.')
      }
    } finally {
      setBusyId(null)
    }
  }

  const handleDryRun = async (bpId: number) => {
    if (!projectId) return
    setBusyId(bpId)
    setError(null)
    try {
      const diff = await api.dryRunBlueprintPlan(projectId, bpId)
      setDryRun(diff)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể chạy Dry-Run Diff.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4" aria-label="Academic Blueprint & Readiness">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-slate-900">AcademicBlueprint &amp; Sẵn sàng Mở đợt Học kỳ</h2>
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
              Nguồn chuẩn (QD-01)
            </span>
          </div>
          <p className="text-xs text-slate-600">Đồng duyệt 2 Khoa (Lead + Participating) và mô phỏng Dry-Run Diff lộ trình 4 tháng.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actorDepartmentId && semesterId > 0 && (
            <button
              type="button"
              onClick={() => { setEditingBlueprint(null); setModalOpen(true) }}
              className="rounded-md bg-blue-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-800"
            >
              Tạo Blueprint
            </button>
          )}
          {readiness && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                readiness.isReadyForRegistration
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              {readiness.isReadyForRegistration ? 'Sẵn sàng mở Đăng ký' : 'Chưa đủ Blueprint PUBLISHED'}
            </span>
          )}
        </div>
      </div>

      {readiness && readiness.blockingIssues.length > 0 && (
        <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <ul className="list-disc pl-4 space-y-0.5">
            {readiness.blockingIssues.map(issue => <li key={issue}>{issue}</li>)}
          </ul>
        </div>
      )}

      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</div>}
      {notice && (
        <div className="flex items-center gap-2 rounded-lg border border-hairline border-l-4 border-l-status-success-text bg-card px-3 py-2 text-xs text-ink">
          <span className="material-symbols-outlined shrink-0 text-[16px] text-status-success-text" aria-hidden="true">check_circle</span>
          <span role="status">{notice}</span>
        </div>
      )}

      <div className="divide-y divide-slate-100">
        {blueprints.map(bp => (
          <div key={bp.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-slate-900">{bp.name}</span>
                <span className="text-xs font-mono text-slate-500">{bp.code} v{bp.version}</span>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{TRACK_LABELS[bp.trackCode]}</span>
                <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{bp.status}</span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                {bp.approvals.map(a => (
                  <span key={a.departmentId}>
                    {a.scopeRole}: <strong>{a.decision}</strong>
                  </span>
                ))}
                {bp.status === 'PUBLISHED' && (
                  <span className="text-amber-700 font-medium">· Bản đã công bố bất biến</span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(bp.status === 'DRAFT' || bp.status === 'IN_REVIEW') && actorDepartmentId && (
                <button
                  type="button"
                  disabled={busyId === bp.id}
                  onClick={() => { setEditingBlueprint(bp); setModalOpen(true) }}
                  className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Chỉnh sửa
                </button>
              )}
              {bp.status === 'DRAFT' && (
                <button
                  type="button"
                  disabled={busyId === bp.id}
                  onClick={() => void handleAction(bp.id, () => api.submitAcademicBlueprintForReview(bp.id), 'Đã trình duyệt AcademicBlueprint.')}
                  className="rounded-md border border-indigo-300 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
                >
                  Trình duyệt
                </button>
              )}
              {bp.status !== 'PUBLISHED' && bp.status !== 'RETIRED' && actorDepartmentId && (
                <button
                  type="button"
                  disabled={busyId === bp.id}
                  onClick={() => void handleAction(bp.id, () => api.recordBlueprintApproval(bp.id, { departmentId: actorDepartmentId, decision: 'APPROVED' }), 'Đã ghi nhận đồng duyệt Khoa.')}
                  className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Duyệt Khoa
                </button>
              )}
              {bp.status !== 'PUBLISHED' && bp.status !== 'RETIRED' && (
                <button
                  type="button"
                  disabled={busyId === bp.id}
                  onClick={() => void handleAction(bp.id, () => api.publishAcademicBlueprint(bp.id), 'Đã công bố AcademicBlueprint.')}
                  className="rounded-md bg-blue-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-800"
                >
                  Công bố
                </button>
              )}
              {bp.status === 'PUBLISHED' && (
                <button
                  type="button"
                  disabled={busyId === bp.id}
                  onClick={() => void handleAction(bp.id, () => api.cloneAcademicBlueprint(bp.id), 'Đã nhân bản sang phiên bản nháp mới.')}
                  className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Nhân bản v{bp.version + 1}
                </button>
              )}
              {bp.status === 'PUBLISHED' && projectId && (
                <button
                  type="button"
                  disabled={busyId === bp.id}
                  onClick={() => void handleDryRun(bp.id)}
                  className="rounded-md border border-teal-600 px-2.5 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50"
                >
                  Xem trước Dry-Run Diff
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {dryRun && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs" data-testid="blueprint-dry-run-diff">
          <div className="font-semibold text-slate-900">
            Kết quả Dry-Run Diff (Không ghi DB) — Blueprint v{dryRun.blueprintVersion} · {dryRun.gates.length} Gate · {dryRun.coreTasks.length} Core Task
          </div>
          {dryRun.preservedCustomizedItems.length > 0 && (
            <div className="text-emerald-700">
              Bảo toàn mục đã tùy chỉnh ({dryRun.preservedCustomizedItems.length}): {dryRun.preservedCustomizedItems.join(', ')}
            </div>
          )}
          <div className="grid items-stretch gap-2 md:grid-cols-3">
            {dryRun.gates.map(g => (
              <div key={g.code} className="flex h-full flex-col justify-between rounded border border-slate-200 bg-white p-2">
                <div className="font-medium text-slate-900">{g.code} — {g.title} ({g.action})</div>
                <div className="text-slate-600">Nộp: {g.submissionDueAt.slice(0, 10)} · Chấm: {g.reviewWindowEndAt.slice(0, 10)} · Sửa: {g.revisionDueAt.slice(0, 10)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {modalOpen && actorDepartmentId && (
        <BlueprintDraftModal
          semesterId={semesterId}
          leadDepartmentId={actorDepartmentId}
          departments={departments}
          editing={editingBlueprint}
          onClose={() => { setModalOpen(false); setEditingBlueprint(null) }}
          onSaved={() => {
            setModalOpen(false)
            setEditingBlueprint(null)
            setNotice(editingBlueprint ? 'Đã cập nhật bản nháp AcademicBlueprint.' : 'Đã tạo bản nháp AcademicBlueprint mới.')
            void load()
          }}
        />
      )}
    </section>
  )
}
