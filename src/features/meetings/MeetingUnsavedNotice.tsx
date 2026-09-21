import { useEffect, useRef } from 'react'
import { useBlocker } from 'react-router-dom'

export function MeetingUnsavedNotice({ dirty, busy }: { dirty: boolean; busy: boolean }) {
  const blocker = useBlocker(dirty && !busy)
  const notice = useRef<HTMLDivElement>(null)
  useEffect(() => { if (blocker.state === 'blocked') notice.current?.focus() }, [blocker.state])
  useEffect(() => {
    if (!dirty && !busy) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, busy])
  if (blocker.state !== 'blocked') return null
  return <div ref={notice} tabIndex={-1} role="alert" className="mtg-notice mtg-notice--error mtg-unsaved"><p>Nội dung chưa được lưu. Rời trang sẽ bỏ các thay đổi đang soạn.</p><div className="mtg-actions"><button className="mtg-button mtg-button--secondary" onClick={() => blocker.reset()}>Ở lại soạn tiếp</button><button className="mtg-button" onClick={() => blocker.proceed()}>Bỏ thay đổi và rời trang</button></div></div>
}
