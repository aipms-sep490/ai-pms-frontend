import { useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { HttpError } from '../../../services/http/http-client'
import * as api from '../api/academic-blueprints-api'

interface DepartmentOption {
  id: number
  code: string
  name: string
}

interface BlueprintDraftModalProps {
  semesterId: number
  leadDepartmentId: number
  departments?: DepartmentOption[]
  editing?: api.AcademicBlueprintDto | null
  onClose: () => void
  onSaved: (saved: api.AcademicBlueprintDto) => void
}

const DEFAULT_GATES: api.BlueprintGateRule[] = [
  { code: 'G1', sequence: 1, title: 'Review Gate 1', objective: 'Khởi động & Kiến trúc / Kế hoạch', submissionOffsetWorkingDays: 10, reviewDurationWorkingDays: 3, revisionDurationWorkingDays: 5, weight: 20, blocksDefense: false, requiredDeliverables: ['Hồ sơ đặc tả & kế hoạch G1'] },
  { code: 'G2', sequence: 2, title: 'Review Gate 2', objective: 'MVP & Thử nghiệm giữa kỳ', submissionOffsetWorkingDays: 30, reviewDurationWorkingDays: 3, revisionDurationWorkingDays: 5, weight: 35, blocksDefense: false, requiredDeliverables: ['Báo cáo tiến độ & sản phẩm MVP G2'] },
  { code: 'G3', sequence: 3, title: 'Review Gate 3', objective: 'Tiền bảo vệ & Kiểm định chất lượng', submissionOffsetWorkingDays: 50, reviewDurationWorkingDays: 3, revisionDurationWorkingDays: 5, weight: 45, blocksDefense: true, requiredDeliverables: ['Hồ sơ hoàn thiện tiền bảo vệ G3'] },
]

export function BlueprintDraftModal({
  semesterId,
  leadDepartmentId,
  departments = [],
  editing,
  onClose,
  onSaved,
}: BlueprintDraftModalProps) {
  const isEdit = Boolean(editing)
  const [trackCode, setTrackCode] = useState<api.AcademicTrackCode>(editing?.trackCode ?? 'IT_ONLY')
  const [code, setCode] = useState(editing?.code ?? `BP-IT-${semesterId}`)
  const [name, setName] = useState(editing?.name ?? '')
  const [participatingDepartmentId, setParticipatingDepartmentId] = useState<string>(
    editing?.participatingDepartmentId ? String(editing.participatingDepartmentId) : '',
  )
  const [gateTemplateId, setGateTemplateId] = useState<string>(editing?.gateTemplateId ? String(editing.gateTemplateId) : '')
  const [rubricId, setRubricId] = useState<string>(editing?.rubricId ? String(editing.rubricId) : '')
  const [gates, setGates] = useState<api.BlueprintGateRule[]>(
    editing?.config.gateRules?.length ? editing.config.gateRules : DEFAULT_GATES,
  )
  const [intCode, setIntCode] = useState(editing?.config.integrationDeliverables?.[0]?.code ?? 'INT-01')
  const [intTitle, setIntTitle] = useState(editing?.config.integrationDeliverables?.[0]?.title ?? 'Đầu ra tích hợp liên ngành IT × MKT')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const partnerDepartments = departments.filter(d => d.id !== leadDepartmentId)

  const updateGate = (index: number, patch: Partial<api.BlueprintGateRule>) => {
    setGates(prev => prev.map((g, i) => (i === index ? { ...g, ...patch } : g)))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('Vui lòng nhập tên Blueprint.')
      return
    }
    const partId = trackCode === 'IT_MKT' ? Number(participatingDepartmentId) : null
    if (trackCode === 'IT_MKT' && (!partId || !Number.isInteger(partId) || partId <= 0 || partId === leadDepartmentId)) {
      setError('Blueprint liên ngành IT_MKT yêu cầu chọn Khoa phối hợp khác Khoa chủ trì.')
      return
    }
    const config: api.AcademicBlueprintConfig = {
      gateRules: gates.map((g, idx) => ({
        ...g,
        code: g.code.trim().toUpperCase() || `G${idx + 1}`,
        sequence: idx + 1,
        title: g.title.trim() || `Review Gate ${idx + 1}`,
        objective: g.objective.trim() || `Mục tiêu cổng G${idx + 1}`,
        requiredDeliverables: (g.requiredDeliverables ?? []).map(x => x.trim()).filter(Boolean),
      })),
      sprintRules: editing?.config.sprintRules ?? [
        { originId: 'SP-1', name: 'Sprint 1', startOffsetWorkingDays: 0, durationWorkingDays: 10 },
        { originId: 'SP-2', name: 'Sprint 2', startOffsetWorkingDays: 10, durationWorkingDays: 10 },
      ],
      milestoneRules: editing?.config.milestoneRules ?? [
        {
          originId: 'MS-G1',
          title: 'Hoàn thiện hồ sơ G1',
          description: 'Mốc chuẩn hóa từ AcademicBlueprint',
          startOffsetWorkingDays: 0,
          dueOffsetWorkingDays: gates[0]?.submissionOffsetWorkingDays ?? 10,
          sortOrder: 1,
          coreTasks: [
            {
              originId: 'TASK-G1-CORE',
              title: 'Nộp gói minh chứng bắt buộc G1',
              description: 'Nhiệm vụ lõi không thể xóa',
              priority: 'HIGH',
              isCoreGateTask: true,
              gateCode: gates[0]?.code || 'G1',
              dueOffsetWorkingDays: gates[0]?.submissionOffsetWorkingDays ?? 10,
            },
          ],
        },
      ],
      integrationDeliverables: trackCode === 'IT_MKT'
        ? [{ code: intCode.trim().toUpperCase() || 'INT-01', title: intTitle.trim() || 'Đầu ra tích hợp liên ngành', stages: ['G1', 'G2', 'G3', 'FINAL'] }]
        : (editing?.config.integrationDeliverables ?? []),
      evaluationSchemePreset: editing?.config.evaluationSchemePreset ?? null,
    }

    setBusy(true)
    try {
      const saved = editing
        ? await api.updateAcademicBlueprint(editing.id, {
            name: name.trim(),
            participatingDepartmentId: partId,
            config,
            concurrencyToken: editing.concurrencyToken,
            gateTemplateId: gateTemplateId ? Number(gateTemplateId) : null,
            rubricId: rubricId ? Number(rubricId) : null,
          })
        : await api.createAcademicBlueprint({
            academicSemesterId: semesterId,
            trackCode,
            code: code.trim().toUpperCase(),
            name: name.trim(),
            leadDepartmentId,
            participatingDepartmentId: partId,
            config,
            gateTemplateId: gateTemplateId ? Number(gateTemplateId) : null,
            rubricId: rubricId ? Number(rubricId) : null,
          })
      onSaved(saved)
    } catch (reason) {
      if (reason instanceof HttpError) {
        setError(reason.problem?.detail || reason.message || `Lỗi ${reason.status}`)
      } else {
        setError(reason instanceof Error ? reason.message : 'Không thể lưu bản nháp AcademicBlueprint.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      className="max-w-3xl"
      title={isEdit ? `Chỉnh sửa Blueprint ${editing?.code} v${editing?.version}` : 'Tạo bản nháp AcademicBlueprint'}
      description="Thiết lập nguồn chuẩn lộ trình 4 tháng theo QD-01 (Gate G1–G3 tính theo ngày làm việc, Sprint/Milestone và đầu ra tích hợp INT-*)."
      busy={busy}
      onClose={onClose}
    >
      <form onSubmit={e => void handleSubmit(e)} className="space-y-4 text-sm">
        {error && (
          <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            {error}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="font-medium text-ink">Đường chạy học vụ (Track)</span>
            <select
              value={trackCode}
              disabled={isEdit || busy}
              onChange={e => {
                const next = e.target.value as api.AcademicTrackCode
                setTrackCode(next)
                if (!isEdit) setCode(`BP-${next.replace('_', '')}-${semesterId}`)
              }}
              className="w-full min-h-10 rounded-lg border border-hairline bg-canvas px-3 text-sm"
            >
              <option value="IT_ONLY">Đơn ngành CNTT (IT_ONLY)</option>
              <option value="MKT_ONLY">Đơn ngành Marketing (MKT_ONLY)</option>
              <option value="IT_MKT">Liên ngành IT × MKT (IT_MKT)</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="font-medium text-ink">Mã Blueprint</span>
            <input
              value={code}
              disabled={isEdit || busy}
              required
              maxLength={60}
              onChange={e => setCode(e.target.value)}
              className="w-full min-h-10 rounded-lg border border-hairline bg-canvas px-3 font-mono text-sm"
            />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="font-medium text-ink">Tên hiển thị</span>
            <input
              value={name}
              disabled={busy}
              required
              maxLength={255}
              placeholder="VD: Khung kế hoạch đồ án liên ngành IT×MKT HK1"
              onChange={e => setName(e.target.value)}
              className="w-full min-h-10 rounded-lg border border-hairline bg-canvas px-3 text-sm"
            />
          </label>

          {trackCode === 'IT_MKT' && (
            <label className="space-y-1 sm:col-span-2">
              <span className="font-medium text-ink">Khoa phối hợp (Participating Department)</span>
              {partnerDepartments.length > 0 ? (
                <select
                  value={participatingDepartmentId}
                  disabled={busy}
                  required
                  onChange={e => setParticipatingDepartmentId(e.target.value)}
                  className="w-full min-h-10 rounded-lg border border-hairline bg-canvas px-3 text-sm"
                >
                  <option value="">-- Chọn Khoa phối hợp --</option>
                  {partnerDepartments.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  min={1}
                  required
                  value={participatingDepartmentId}
                  disabled={busy}
                  placeholder="Nhập ID Khoa phối hợp"
                  onChange={e => setParticipatingDepartmentId(e.target.value)}
                  className="w-full min-h-10 rounded-lg border border-hairline bg-canvas px-3 text-sm"
                />
              )}
            </label>
          )}

          <label className="space-y-1">
            <span className="font-medium text-ink">Gate Template ID (tùy chọn)</span>
            <input
              type="number"
              min={1}
              value={gateTemplateId}
              disabled={busy}
              onChange={e => setGateTemplateId(e.target.value)}
              className="w-full min-h-10 rounded-lg border border-hairline bg-canvas px-3 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="font-medium text-ink">Rubric ID (tùy chọn)</span>
            <input
              type="number"
              min={1}
              value={rubricId}
              disabled={busy}
              onChange={e => setRubricId(e.target.value)}
              className="w-full min-h-10 rounded-lg border border-hairline bg-canvas px-3 text-sm"
            />
          </label>
        </div>

        <div className="space-y-2 rounded-lg border border-hairline bg-canvas p-3">
          <div className="text-xs font-semibold text-ink">Quy tắc 3 mốc ngày làm việc cho Review Gates (tính từ EXECUTION.StartAt)</div>
          {gates.map((g, idx) => (
            <div key={g.code || idx} className="grid gap-2 rounded border border-hairline bg-card p-2.5 sm:grid-cols-6 text-xs">
              <label className="sm:col-span-2">
                <span className="text-ink-muted">Cổng ({g.code})</span>
                <input
                  value={g.title}
                  disabled={busy}
                  onChange={e => updateGate(idx, { title: e.target.value })}
                  className="mt-0.5 w-full rounded border border-hairline bg-canvas px-2 py-1"
                />
              </label>
              <label>
                <span className="text-ink-muted">Nộp (ngày LV)</span>
                <input
                  type="number"
                  min={0}
                  value={g.submissionOffsetWorkingDays}
                  disabled={busy}
                  onChange={e => updateGate(idx, { submissionOffsetWorkingDays: Number(e.target.value) })}
                  className="mt-0.5 w-full rounded border border-hairline bg-canvas px-2 py-1"
                />
              </label>
              <label>
                <span className="text-ink-muted">Chấm (ngày LV)</span>
                <input
                  type="number"
                  min={0}
                  value={g.reviewDurationWorkingDays}
                  disabled={busy}
                  onChange={e => updateGate(idx, { reviewDurationWorkingDays: Number(e.target.value) })}
                  className="mt-0.5 w-full rounded border border-hairline bg-canvas px-2 py-1"
                />
              </label>
              <label>
                <span className="text-ink-muted">Sửa (ngày LV)</span>
                <input
                  type="number"
                  min={0}
                  value={g.revisionDurationWorkingDays}
                  disabled={busy}
                  onChange={e => updateGate(idx, { revisionDurationWorkingDays: Number(e.target.value) })}
                  className="mt-0.5 w-full rounded border border-hairline bg-canvas px-2 py-1"
                />
              </label>
              <label className="sm:col-span-6">
                <span className="text-ink-muted">Danh mục minh chứng bắt buộc (phân tách dấu phẩy)</span>
                <input
                  value={(g.requiredDeliverables ?? []).join(', ')}
                  disabled={busy}
                  onChange={e => updateGate(idx, { requiredDeliverables: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  className="mt-0.5 w-full rounded border border-hairline bg-canvas px-2 py-1"
                />
              </label>
            </div>
          ))}
        </div>

        {trackCode === 'IT_MKT' && (
          <div className="grid gap-3 rounded-lg border border-blue-200 bg-blue-50/50 p-3 sm:grid-cols-3 text-xs">
            <div className="sm:col-span-3 font-semibold text-blue-900">Đầu ra tích hợp liên ngành bắt buộc (POL-05 · INT-*)</div>
            <label>
              <span className="text-ink-muted">Mã INT-*</span>
              <input
                value={intCode}
                disabled={busy}
                required
                onChange={e => setIntCode(e.target.value)}
                className="mt-0.5 w-full rounded border border-hairline bg-white px-2 py-1.5 font-mono"
              />
            </label>
            <label className="sm:col-span-2">
              <span className="text-ink-muted">Tên đầu ra tích hợp (phủ G1–G3 & FINAL)</span>
              <input
                value={intTitle}
                disabled={busy}
                required
                onChange={e => setIntTitle(e.target.value)}
                className="mt-0.5 w-full rounded border border-hairline bg-white px-2 py-1.5"
              />
            </label>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-hairline pt-3">
          <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>Hủy</Button>
          <Button type="submit" disabled={busy}>{isEdit ? 'Lưu thay đổi' : 'Tạo bản nháp'}</Button>
        </div>
      </form>
    </Modal>
  )
}
