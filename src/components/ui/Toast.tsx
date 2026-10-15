export interface ToastProps {
  message: string
  tone?: 'success' | 'error'
}

const toneClasses: Record<NonNullable<ToastProps['tone']>, string> = {
  success: 'bg-status-success-text text-white',
  error: 'bg-status-error-text text-white',
}

/** Transient confirmation, not durable workflow history — see
 * ai-pms-collaboration-overlays.md. The caller owns visibility and auto-dismiss
 * timing; this renders the fixed, tone-colored snackbar itself. */
export function Toast({ message, tone = 'success' }: ToastProps) {
  return (
    <div
      role="status"
      className={`fixed bottom-6 right-6 z-[var(--z-index-toast)] flex items-center gap-2.5 rounded-md px-4 py-3 text-xs font-semibold shadow-lg ${toneClasses[tone]}`}
    >
      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
        {tone === 'success' ? 'check_circle' : 'error'}
      </span>
      {message}
    </div>
  )
}
