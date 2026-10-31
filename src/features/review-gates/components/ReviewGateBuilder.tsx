import { useEffect, useRef, useState } from 'react'
import type {
  GateRequirement,
  ReviewGate,
  ReviewGateTemplate,
} from '../types/review-gates.types'
import { GateRequirementDrawer } from './GateRequirementDrawer'
import { env } from '../../../app/config/env'
import { gateWeightTotal, validateGateWeights } from '../api/review-gates-contract'

interface ReviewGateBuilderProps {
  template: ReviewGateTemplate
  onChange: (updated: ReviewGateTemplate) => void
  onSaveDraft: () => void
  onPublish: () => void
  onClone?: (template: ReviewGateTemplate) => void
  busy?: boolean
  formError?: string | null
}

export function ReviewGateBuilder({
  template,
  onChange,
  onSaveDraft,
  onPublish,
  onClone,
  busy = false,
  formError,
}: ReviewGateBuilderProps) {
  const [selectedGateIndex, setSelectedGateIndex] = useState(0)
  const [editingRequirementIndex, setEditingRequirementIndex] = useState<number | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const currentGate = template.gates[selectedGateIndex] || template.gates[0]
  const weightsError = validateGateWeights(template.gates)
  const readOnly = busy || template.status === 'PUBLISHED'
  const formErrorRef = useRef<HTMLParagraphElement>(null)
  useEffect(() => { if (formError) formErrorRef.current?.focus() }, [formError])

  function updateCurrentGate(field: keyof ReviewGate, value: unknown) {
    if (template.status === 'PUBLISHED') return
    const nextGates = [...template.gates]
    nextGates[selectedGateIndex] = {
      ...nextGates[selectedGateIndex],
      [field]: value,
    }
    onChange({
      ...template,
      gates: nextGates,
    })
  }

  function handleAddGate() {
    if (template.status === 'PUBLISHED') return
    if (template.gates.length >= 8) return
    const nextIndex = template.gates.length + 1
    const prefix = template.mode === 'INTERDISCIPLINARY' ? 'G' : 'R'
    const newGate: ReviewGate = {
      id: `gate-${Date.now()}`,
      code: `${prefix}${nextIndex}`,
      title: `Review ${nextIndex} (Bản nháp)`,
      objective: 'Chưa cấu hình mục tiêu học thuật',
      required: true,
      blockNextGate: true,
      start: env.reviewGatesMockEnabled ? '2026-11-15' : null,
      end: env.reviewGatesMockEnabled ? '2026-11-30' : null,
      reviewerPolicy: 'Assigned Reviewer',
      reviewScope: 'COMMON',
      requirements: [],
    }
    onChange({
      ...template,
      gates: [...template.gates, newGate],
      gatesCount: template.gates.length + 1,
    })
    setSelectedGateIndex(template.gates.length)
  }

  function handleSaveRequirement(req: GateRequirement) {
    if (template.status === 'PUBLISHED') return
    if (!currentGate) return
    const nextRequirements = [...currentGate.requirements]
    if (editingRequirementIndex !== null) {
      nextRequirements[editingRequirementIndex] = req
    } else {
      nextRequirements.push(req)
    }
    updateCurrentGate('requirements', nextRequirements)
  }

  function handleDeleteRequirement(index: number) {
    if (template.status === 'PUBLISHED') return
    if (!currentGate) return
    const nextRequirements = currentGate.requirements.filter((_, i) => i !== index)
    updateCurrentGate('requirements', nextRequirements)
  }

  return (
    <div className="review-gates-surface min-w-0 space-y-6">
      {/* Top Banner / Template Context */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-800">{template.name}</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 border border-slate-200">
              v{template.version}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                template.status === 'PUBLISHED'
                  ? 'bg-status-success-bg text-status-success-text border border-status-success-border'
                  : 'bg-status-warning-bg text-status-warning-text border border-status-warning-border'
              }`}
            >
              {template.status === 'PUBLISHED' ? 'ĐÃ CÔNG BỐ' : 'BẢN NHÁP'}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Chế độ: <strong className="text-slate-700">{template.mode === 'SINGLE_MAJOR' ? 'Đơn ngành' : 'Liên ngành'}</strong> · Ngành: {template.major} · Mã: {template.code}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {(template.status === 'PUBLISHED' || formError?.includes('nhân bản')) && onClone && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onClone(template)}
              className="rounded-lg border border-primary/30 bg-primary-subtle px-3 py-2 text-xs font-bold text-primary hover:bg-primary/20"
              title="Nhân bản tạo phiên bản nháp mới"
            >
              Nhân bản bản nháp mới
            </button>
          )}
          <button
            type="button"
            disabled={readOnly || Boolean(weightsError)}
            onClick={onSaveDraft}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-50"
          >
            Lưu bản nháp
          </button>
          <button
            type="button"
            disabled={readOnly || Boolean(weightsError)}
            onClick={onPublish}
            className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-primary-hover disabled:opacity-50"
          >
            Công bố chính sách
          </button>
        </div>
      </div>

      <div id="gate-weights-help" className="rounded-lg border border-hairline bg-card p-4 text-sm text-ink-soft" aria-live="polite">
        <p>Trọng số học vụ: để trống tất cả hoặc nhập đủ các cổng, mỗi cổng 0–100%, tổng đúng 100%.</p>
        <p className="mt-1 font-semibold">Tổng hiện tại: {gateWeightTotal(template.gates)}% · {template.gates.filter(gate => gate.weight != null).length}/{template.gates.length} cổng đã nhập.</p>
        {(weightsError || formError) && <p ref={formErrorRef} tabIndex={-1} id="gate-weights-error" role="alert" className="mt-2 text-status-error-text">{weightsError || formError}</p>}
      </div>

      {template.status === 'PUBLISHED' && (
        <div className="rounded-xl border border-status-success-border bg-status-success-bg p-3.5 text-xs text-status-success-text flex items-center justify-between">
          <span>
            🔒 <strong>Mẫu tiến trình đã công bố chính thức:</strong> Cấu trúc các Review Gate đã được khóa bất biến. Để thay đổi yêu cầu hoặc bổ sung Gate cho đợt thẩm định tiếp theo, vui lòng chọn <strong>Nhân bản bản nháp mới</strong>.
          </span>
        </div>
      )}

      {/* Main Builder Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Gates Sequence List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">Trình tự Review Gates</h3>
              <button
                type="button"
                onClick={handleAddGate}
                disabled={readOnly || template.gates.length >= 8}
                className="inline-flex items-center gap-1 rounded-md bg-primary-subtle px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary/20"
              >
                ＋ Thêm Gate
              </button>
            </div>

            <div className="space-y-2">
              {template.gates.map((gate, index) => {
                const isSelected = selectedGateIndex === index
                return (
                  <button
                    key={gate.id || gate.code}
                    type="button"
                    onClick={() => setSelectedGateIndex(index)}
                    className={`flex w-full items-center justify-between rounded-lg p-3 text-left transition-all ${
                      isSelected
                        ? 'border border-primary/40 bg-primary-subtle/60 shadow-2xs'
                        : 'border border-slate-200 bg-slate-50/50 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                          isSelected ? 'bg-primary text-white' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {gate.code}
                      </span>
                      <div>
                        <strong className="block text-xs font-semibold text-slate-900">
                          {gate.title}
                        </strong>
                        <span className="text-xs text-slate-600">
                          {gate.requirements.length} yêu cầu · {gate.required ? 'Bắt buộc' : 'Tùy chọn'}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400">{isSelected ? '●' : '›'}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-xl border border-status-warning-border bg-status-warning-bg/70 p-4 text-xs text-status-warning-text">
            <strong>Nguyên tắc ràng buộc học thuật:</strong>
            <p className="mt-1 leading-relaxed text-status-warning-text">
              Mỗi Gate có thể chặn các Gate kế tiếp nếu nhóm sinh viên nhận kết luận <code>REVISION_REQUIRED</code>.
              Sinh viên vẫn được quyền xem workspace và nộp minh chứng mới; chỉ bị chặn các hành động bảo vệ/chuyển giai đoạn.
            </p>
          </div>
        </div>

        {/* Right Column: Selected Gate Configuration & Requirements */}
        <div className="lg:col-span-8 space-y-5">
          {currentGate ? (
            <fieldset disabled={readOnly} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs space-y-5">
              <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    Chi tiết đợt thẩm định
                  </span>
                  <h3 className="text-base font-bold text-slate-800">
                    {currentGate.code} · {currentGate.title}
                  </h3>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {currentGate.requirements.length} minh chứng
                </span>
              </div>

              {/* Form Fields */}
              <div>
                <label htmlFor="gate-weight" className="block text-xs font-semibold text-ink-soft">Trọng số học vụ của {currentGate.code} (%)</label>
                <input id="gate-weight" type="number" min="0" max="100" step="any" value={currentGate.weight ?? ''}
                  aria-describedby={`gate-weights-help${weightsError || formError ? ' gate-weights-error' : ''}`}
                  aria-invalid={Boolean(weightsError)}
                  onChange={event => updateCurrentGate('weight', event.target.value === '' ? undefined : event.target.valueAsNumber)}
                  className="mt-1.5 w-full rounded-lg border border-line-strong p-2 text-sm text-ink" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="gate-code" className="block text-xs font-semibold text-slate-700">Mã Gate</label>
                  <input id="gate-code"
                    value={currentGate.code}
                    readOnly
                    className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-100 p-2 text-xs font-mono text-slate-600"
                  />
                </div>
                <div>
                  <label htmlFor="gate-title" className="block text-xs font-semibold text-slate-700">Tên đợt thẩm định *</label>
                  <input id="gate-title"
                    value={currentGate.title}
                    onChange={e => updateCurrentGate('title', e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-900 focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="gate-objective" className="block text-xs font-semibold text-slate-700">Mục tiêu học thuật *</label>
                <textarea id="gate-objective"
                  rows={2}
                  value={currentGate.objective}
                  onChange={e => updateCurrentGate('objective', e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-900 focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="gate-start" className="block text-xs font-semibold text-slate-700">Bắt đầu nhận hồ sơ</label>
                  <input id="gate-start"
                    type="date"
                    value={currentGate.start?.slice(0, 10) ?? ''}
                    onChange={e => updateCurrentGate('start', e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label htmlFor="gate-end" className="block text-xs font-semibold text-slate-700">Kết thúc nhận hồ sơ</label>
                  <input id="gate-end"
                    type="date"
                    value={currentGate.end?.slice(0, 10) ?? ''}
                    onChange={e => updateCurrentGate('end', e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentGate.required}
                    onChange={e => updateCurrentGate('required', e.target.checked)}
                    className="h-4 w-4 rounded text-primary"
                  />
                  Gate bắt buộc (Mandatory Gate)
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentGate.blockNextGate}
                    onChange={e => updateCurrentGate('blockNextGate', e.target.checked)}
                    className="h-4 w-4 rounded text-primary"
                  />
                  Chặn Gate tiếp theo nếu chưa PASS
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentGate.blocksDefense ?? false}
                    onChange={e => updateCurrentGate('blocksDefense', e.target.checked)}
                    className="h-4 w-4 rounded text-primary"
                  />
                  Điều kiện bắt buộc để được bảo vệ (Blocks Defense)
                </label>
              </div>

              {/* Requirements Checklist */}
              <div className="border-t border-slate-100 pt-5">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Danh mục minh chứng đầu ra ({currentGate.requirements.length})
                    </h4>
                    <p className="text-xs text-slate-600">
                      Sinh viên nộp đủ các yêu cầu bắt buộc mới được phân công Reviewer thẩm định.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingRequirementIndex(null)
                      setIsDrawerOpen(true)
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-primary-hover"
                  >
                    ＋ Thêm yêu cầu
                  </button>
                </div>

                <div className="space-y-2">
                  {currentGate.requirements.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                      Chưa có yêu cầu nào trong Gate này. Bấm &quot;Thêm yêu cầu&quot; để thiết lập tiêu chí thẩm định.
                    </div>
                  ) : (
                    currentGate.requirements.map((req, rIdx) => (
                      <div
                        key={req.id || rIdx}
                        className="flex flex-wrap items-center justify-between rounded-lg border border-slate-200 bg-white p-3 hover:border-slate-300"
                      >
                        <div className="min-w-0 flex-1">
                          <strong className="block text-xs font-semibold text-slate-900">
                            {req.title}
                          </strong>
                          <span className="text-xs text-slate-600">
                            Loại: {req.type} · Ngành: {req.scope} · Thẩm định: {req.verification}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                              req.required
                                ? 'bg-status-error-bg text-danger-text border border-status-error-border'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {req.required ? 'BẮT BUỘC' : 'TÙY CHỌN'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRequirementIndex(rIdx)
                              setIsDrawerOpen(true)
                            }}
                            className="rounded px-2 py-1 text-xs font-semibold text-primary hover:bg-primary-subtle"
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRequirement(rIdx)}
                            className="rounded px-2 py-1 text-xs font-semibold text-danger-text hover:bg-status-error-bg"
                          >
                            Xóa
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </fieldset>
          ) : null}
        </div>
      </div>

      <GateRequirementDrawer
        isOpen={isDrawerOpen}
        requirement={editingRequirementIndex !== null && currentGate ? currentGate.requirements[editingRequirementIndex] : null}
        onClose={() => {
          setIsDrawerOpen(false)
          setEditingRequirementIndex(null)
        }}
        onSave={handleSaveRequirement}
      />
    </div>
  )
}
