import { createContext, useContext, useId, type ReactNode } from 'react'
import type { WorkflowActionDto } from '../../types/backend'
import { WorkflowActionGate, type WorkflowActionGateState } from './WorkflowActionGate'
import { badgeToneClass, type BadgeTone } from './status-badge-tone'

type VerdictContextValue = { state: WorkflowActionGateState; explanationId: string }
const VerdictContext = createContext<VerdictContextValue | null>(null)

type ActionVerdictProps = {
  actions: readonly WorkflowActionDto[] | null
  actionCode: string
  status: 'ready' | 'loading' | 'unknown' | 'unavailable'
  okLabel?: string
  blockedLabel?: string
  children?: ReactNode
}

const verdictPresentation: Record<WorkflowActionGateState, { tone: BadgeTone; role: 'alert' | 'status'; icon: string }> = {
  allowed: { tone: 'success', role: 'status', icon: 'check_circle' },
  denied: { tone: 'danger', role: 'alert', icon: 'block' },
  loading: { tone: 'neutral', role: 'status', icon: 'hourglass_top' },
  unavailable: { tone: 'warning', role: 'status', icon: 'warning' },
}

function ActionVerdictPanel({ actions, actionCode, status, okLabel = 'Điều kiện hợp lệ', blockedLabel = 'Không thể thực hiện phê duyệt', children }: ActionVerdictProps) {
  const explanationId = useId()

  return (
    <WorkflowActionGate actions={actions} actionCode={actionCode} status={status}>
      {({ state, reasons }) => {
        const { tone, role, icon } = verdictPresentation[state]
        const heading = state === 'allowed' ? okLabel : state === 'denied' ? blockedLabel : state === 'loading' ? 'Đang kiểm tra điều kiện' : 'Chưa thể kiểm tra điều kiện'
        return (
          <VerdictContext.Provider value={{ state, explanationId }}>
            <section className="overflow-hidden rounded-lg border border-hairline bg-card" aria-label="Xử lý yêu cầu">
              <div id={explanationId} role={role} className={`border-b px-4 py-3 text-sm ${badgeToneClass[tone]}`}>
                <div className="flex items-center gap-2 font-semibold">
                  <span className="material-symbols-outlined" aria-hidden="true">{icon}</span>
                  <span>{heading}</span>
                </div>
                {state === 'denied' && (
                  reasons.length > 0
                    ? <ul className="mt-2 list-disc space-y-1 pl-8">{reasons.map((reason, index) => <li key={`${reason}-${index}`}>{reason}</li>)}</ul>
                    : <p className="mt-2 pl-8">Hệ thống chặn thao tác này nhưng không nêu lý do. Tải lại quyền thao tác hoặc liên hệ quản trị.</p>
                )}
              </div>
              {children}
            </section>
          </VerdictContext.Provider>
        )
      }}
    </WorkflowActionGate>
  )
}

type DecisionAction = { label: string; onClick: () => void; disabled?: boolean }
type DecisionNote = { value: string; onChange: (value: string) => void; label?: string; disabled?: boolean }

function Decision({ primary, secondary, note }: { primary: DecisionAction; secondary: Omit<DecisionAction, 'disabled'>; note?: DecisionNote }) {
  const verdict = useContext(VerdictContext)
  if (!verdict) throw new Error('ActionVerdict.Decision must be inside ActionVerdict')

  return (
    <div className="space-y-4 p-4">
      {note && (
        <label className="block text-sm font-medium text-ink">
          {note.label ?? 'Ghi chú / Phản hồi'}
          <textarea
            className="mt-2 min-h-24 w-full rounded-lg border border-hairline bg-card p-3 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            value={note.value}
            onChange={(event) => note.onChange(event.target.value)}
            disabled={note.disabled}
          />
        </label>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className="min-h-10 rounded-lg border border-hairline px-4 py-2 text-sm font-semibold text-ink hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" onClick={secondary.onClick}>
          {secondary.label}
        </button>
        <button type="button" className="min-h-10 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50" onClick={primary.onClick} disabled={verdict.state !== 'allowed' || primary.disabled} aria-describedby={verdict.state === 'allowed' ? undefined : verdict.explanationId}>
          {primary.label}
        </button>
      </div>
    </div>
  )
}

export const ActionVerdict = Object.assign(ActionVerdictPanel, { Decision })
