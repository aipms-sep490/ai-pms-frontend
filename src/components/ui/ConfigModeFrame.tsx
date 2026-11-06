import type { ReactNode } from 'react'
import { UnsavedChangesNotice } from './UnsavedChangesNotice'
import { useActionConfirmation } from './useActionConfirmation'

export function ConfigModeFrame({ mode, dirty, busy, onEdit, onCancel, onSave, blastRadius, saveLabel = 'Lưu cấu hình', breadcrumb, navigationGuard = true, editDisabled = false, allowSaveUnchanged = false, saveDisabled = false, children }: {
  mode: 'view' | 'edit'
  dirty: boolean
  busy: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: () => void
  blastRadius: ReactNode
  saveLabel?: string
  breadcrumb?: ReactNode
  navigationGuard?: boolean
  editDisabled?: boolean
  allowSaveUnchanged?: boolean
  saveDisabled?: boolean
  children: ReactNode
}) {
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()

  async function handleCancel() {
    if (dirty) {
      const result = await requestConfirmation({
        title: 'Hủy các thay đổi chưa lưu?',
        description: 'Những chỉnh sửa trên trang này sẽ bị bỏ. Dữ liệu đã lưu vẫn được giữ nguyên.',
        confirmLabel: 'Hủy thay đổi',
        danger: true,
      })
      if (result === null) return
    }
    onCancel()
  }

  return (
    <section className="min-w-0">
      <div className="sticky top-0 z-10 mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-canvas py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          {breadcrumb}
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${mode === 'edit' ? 'border-attention-border bg-attention-bg text-ink' : 'border-hairline bg-card text-ink-soft'}`}>
            {mode === 'edit' ? 'ĐANG CHỈNH SỬA' : 'Chế độ xem'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {mode === 'view' ? (
            <button type="button" onClick={onEdit} disabled={busy || editDisabled} className="min-h-10 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50">Chỉnh sửa</button>
          ) : (
            <>
              <button type="button" onClick={() => { void handleCancel() }} disabled={busy} className="min-h-10 rounded-lg border border-hairline bg-card px-4 py-2 text-sm font-semibold text-ink hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50">Hủy thay đổi</button>
              <button type="button" onClick={onSave} disabled={busy || saveDisabled || (!dirty && !allowSaveUnchanged)} className="min-h-10 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50">{saveLabel}</button>
            </>
          )}
        </div>
      </div>
      {mode === 'edit' && navigationGuard && <UnsavedChangesNotice dirty={dirty} busy={busy} />}
      <fieldset disabled={mode === 'view'} className="min-w-0 border-0 p-0">
        {children}
      </fieldset>
      <aside className="mt-5 rounded-lg border border-l-4 border-hairline border-l-attention-border bg-attention-bg p-4 text-sm text-ink-soft">
        <strong className="block text-ink">Lưu ý quan trọng</strong>
        <div className="mt-1">{blastRadius}</div>
      </aside>
      {confirmationDialog}
    </section>
  )
}
