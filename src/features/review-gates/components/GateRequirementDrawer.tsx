import { useState, type FormEvent } from 'react'
import { env } from '../../../app/config/env'
import type {
  GateRequirement,
  RequirementScope,
  RequirementType,
  VerificationMode,
} from '../types/review-gates.types'

interface GateRequirementDrawerProps {
  requirement: GateRequirement | null
  isOpen: boolean
  onClose: () => void
  onSave: (requirement: GateRequirement) => void
}

const requirementTypes: RequirementType[] = [
  'FILE',
  'DOCUMENT',
  'EVIDENCE',
  'DEMO',
  'LINK',
  'PREVIOUS_GATE',
  'MANUAL_DECISION',
  'METRIC',
]

const requirementScopes: RequirementScope[] = [
  'COMMON',
  'MAJOR_SPECIFIC',
  'INDIVIDUAL',
]

const verificationModes: VerificationMode[] = ['HUMAN', 'SYSTEM', 'SYSTEM + HUMAN']

export function GateRequirementDrawer({
  requirement,
  isOpen,
  onClose,
  onSave,
}: GateRequirementDrawerProps) {
  const [title, setTitle] = useState(requirement?.title || '')
  const [code, setCode] = useState(requirement?.code || '')
  const [majorId, setMajorId] = useState(String(requirement?.majorId ?? ''))
  const [studentId, setStudentId] = useState(String(requirement?.targetStudentId ?? ''))
  const [error, setError] = useState<string | null>(null)
  const [type, setType] = useState<RequirementType>(requirement?.type || 'DOCUMENT')
  const [scope, setScope] = useState<RequirementScope>(requirement?.scope || 'COMMON')
  const [verification, setVerification] = useState<VerificationMode>(
    requirement?.verification || 'HUMAN',
  )
  const [required, setRequired] = useState<boolean>(requirement?.required ?? true)

  if (!isOpen) return null

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) return
    const needsMajor = scope === 'MAJOR_SPECIFIC' || scope === 'INDIVIDUAL'
    const isValidId = (value: string) => /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0
    if (!env.reviewGatesMockEnabled && (!code.trim() || (needsMajor && !isValidId(majorId)) || (scope === 'INDIVIDUAL' && !isValidId(studentId)))) {
      setError('Nhập mã yêu cầu và mã ngành/sinh viên đích hợp lệ theo phạm vi đã chọn.')
      return
    }

    onSave({
      id: requirement?.id || `req-${Date.now()}`,
      code: code.trim() || requirement?.code,
      title: title.trim(),
      type,
      scope,
      verification,
      required,
      description: requirement?.description,
      majorId: needsMajor ? Number(majorId) || null : null,
      targetStudentId: scope === 'INDIVIDUAL' ? Number(studentId) || null : null,
    })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-[2px] transition-all"
      onClick={event => {
        if (event.target === event.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="requirement-drawer-title"
    >
      <div className="flex h-full w-full max-w-lg flex-col bg-card p-6 shadow-2xl sm:border-l sm:border-hairline">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary">
              Cấu hình điều kiện học thuật
            </p>
            <h2 id="requirement-drawer-title" className="text-lg font-bold text-ink">
              {requirement ? 'Chỉnh sửa yêu cầu' : 'Thêm yêu cầu mới'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-canvas hover:text-ink-muted"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col justify-between overflow-y-auto py-5">
          <div className="space-y-4">
            <div>
              <label htmlFor="req-code" className="block text-xs font-semibold text-ink-soft">Mã yêu cầu *</label>
              <input id="req-code" required={!env.reviewGatesMockEnabled} value={code} onChange={e => setCode(e.target.value)} className="mt-1 w-full rounded-lg border border-hairline p-2 text-sm" />
            </div>
            {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
            <div>
              <label htmlFor="req-title" className="block text-xs font-semibold text-ink-soft">
                Tên yêu cầu / Tiêu chuẩn đầu ra *
              </label>
              <input
                id="req-title"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ví dụ: Software Requirement Specification (SRS v1.0)"
                className="mt-1.5 w-full rounded-lg border border-hairline p-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="req-type" className="block text-xs font-semibold text-ink-soft">
                  Loại minh chứng *
                </label>
                <select
                  id="req-type"
                  value={type}
                  onChange={e => setType(e.target.value as RequirementType)}
                  className="mt-1.5 w-full rounded-lg border border-hairline p-2.5 text-sm text-ink focus:border-primary focus:outline-none"
                >
                  {requirementTypes.map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="req-scope" className="block text-xs font-semibold text-ink-soft">
                  Phạm vi chuyên ngành *
                </label>
                <select
                  id="req-scope"
                  value={scope}
                  onChange={e => setScope(e.target.value as RequirementScope)}
                  className="mt-1.5 w-full rounded-lg border border-hairline p-2.5 text-sm text-ink focus:border-primary focus:outline-none"
                >
                  {requirementScopes.map(s => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {(scope === 'MAJOR_SPECIFIC' || scope === 'INDIVIDUAL') && <div>
              <label htmlFor="req-major" className="block text-xs font-semibold text-ink-soft">Mã ngành đích *</label>
              <input id="req-major" inputMode="numeric" value={majorId} onChange={e => setMajorId(e.target.value)} className="mt-1 w-full rounded-lg border border-hairline p-2 text-sm" />
            </div>}
            {scope === 'INDIVIDUAL' && <div>
              <label htmlFor="req-student" className="block text-xs font-semibold text-ink-soft">Mã sinh viên đích *</label>
              <input id="req-student" inputMode="numeric" value={studentId} onChange={e => setStudentId(e.target.value)} className="mt-1 w-full rounded-lg border border-hairline p-2 text-sm" />
            </div>}

            <div>
              <label htmlFor="req-verification" className="block text-xs font-semibold text-ink-soft">
                Phương thức xác thực (Verification Mode) *
              </label>
              <select
                id="req-verification"
                value={verification}
                onChange={e => setVerification(e.target.value as VerificationMode)}
                className="mt-1.5 w-full rounded-lg border border-hairline p-2.5 text-sm text-ink focus:border-primary focus:outline-none"
              >
                {verificationModes.map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-ink-muted">
                HUMAN: Phải do Reviewer được phân công xác nhận; SYSTEM: Kiểm tra tự động từ hệ thống.
              </p>
            </div>

            <div className="rounded-lg border border-hairline bg-canvas p-3.5">
              <label className="flex items-center gap-2.5 text-sm font-medium text-ink-soft cursor-pointer">
                <input
                  type="checkbox"
                  checked={required}
                  onChange={e => setRequired(e.target.checked)}
                  className="h-4 w-4 rounded text-primary focus:ring-primary"
                />
                Yêu cầu bắt buộc (Mandatory)
              </label>
              <p className="mt-1 text-xs text-ink-muted">
                Nếu không đạt yêu cầu này, nhóm không đủ điều kiện (Not Eligible) để được Reviewer xét PASS.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-hairline px-4 py-2 text-sm font-semibold text-ink-muted hover:bg-canvas"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover"
            >
              Lưu yêu cầu
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
