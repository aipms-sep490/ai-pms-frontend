import { useEffect, useRef } from 'react'
import { useBlocker } from 'react-router-dom'
import { Modal } from '../../components/ui/Modal'

export function MeetingUnsavedNotice({ dirty, busy }: { dirty: boolean; busy: boolean }) {
  const blocker = useBlocker(dirty && !busy)
  const stayButtonRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!dirty && !busy) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, busy])
  if (blocker.state !== 'blocked') return null
  return (
    <Modal
      open
      title="Rời trang hiện tại?"
      description="Bạn đang có thay đổi chưa được lưu lại."
      busy={busy}
      initialFocusRef={stayButtonRef}
      onClose={() => blocker.reset()}
    >
      <div role="alert" className="mtg-unsaved-modal">
        <div className="mtg-unsaved-modal__body">
          <span className="material-symbols-outlined mtg-unsaved-modal__icon" aria-hidden="true">warning</span>
          <p>Nội dung chưa được lưu. Rời trang sẽ bỏ các thay đổi đang soạn.</p>
        </div>
        <div className="mtg-actions mtg-unsaved-modal__actions">
          <button
            ref={stayButtonRef}
            type="button"
            className="mtg-button"
            onClick={() => blocker.reset()}
          >
            Ở lại soạn tiếp
          </button>
          <button
            type="button"
            className="mtg-button mtg-button--danger"
            onClick={() => blocker.proceed()}
          >
            Bỏ thay đổi và rời trang
          </button>
        </div>
      </div>
    </Modal>
  )
}
