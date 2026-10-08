import { useEffect, useId, type ReactNode, type RefObject } from 'react'
import { useEntranceMotion } from './useEntranceMotion'
import './modal.css'

/** Native dialog supplies focus containment and restores focus to its opener. */
export function Modal({ open, title, description, busy = false, onClose, children, drawer = false, initialFocusRef }: {
  open: boolean; title: string; description?: string; busy?: boolean; onClose: () => void; children: ReactNode; drawer?: boolean; initialFocusRef?: RefObject<HTMLElement | null>
}) {
  const ref = useEntranceMotion<HTMLDialogElement>(open, drawer ? 'drawer' : 'dialog')
  const heading = useId()
  const detail = useId()
  useEffect(() => {
    const dialog = ref.current
    if (!dialog || !open) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const originalOverflow = document.body.style.overflow
    dialog.showModal()
    initialFocusRef?.current?.focus()
    document.body.style.overflow = 'hidden'
    return () => { dialog.close(); document.body.style.overflow = originalOverflow; if (opener?.isConnected) opener.focus() }
  }, [open, ref, initialFocusRef])
  return <dialog ref={ref} className={`app-modal ${drawer ? 'app-modal--drawer' : ''}`} aria-labelledby={heading} aria-describedby={description ? detail : undefined}
    onCancel={event => { event.preventDefault(); if (!busy) onClose() }}>
    <header className="app-modal__header"><div><h2 id={heading}>{title}</h2>{description && <p id={detail}>{description}</p>}</div><button type="button" className="app-modal__close" aria-label="Đóng hộp thoại" disabled={busy} onClick={onClose}><span className="material-symbols-outlined" aria-hidden="true">close</span></button></header>
    <div className="app-modal__body">{children}</div>
  </dialog>
}
