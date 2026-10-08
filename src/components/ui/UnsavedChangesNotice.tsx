import { useEffect, useRef } from 'react'
import { useBlocker } from 'react-router-dom'
import { Button } from './Button'

export function UnsavedChangesNotice({ dirty, busy }: { dirty: boolean; busy: boolean }) {
  const blocker = useBlocker(dirty || busy)
  const notice = useRef<HTMLElement>(null)
  useEffect(() => { if (blocker.state === 'blocked') notice.current?.focus() }, [blocker.state])
  useEffect(() => {
    if (!dirty && !busy) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, busy])
  if (blocker.state !== 'blocked') return null
  return <section ref={notice} tabIndex={-1} role="alert" className="rounded-xl border border-status-warning-border bg-status-warning-bg p-4 text-sm text-status-warning-text">
    <p>{busy ? 'Đang lưu dữ liệu. Hãy đợi thao tác hoàn tất trước khi rời trang.' : 'Bạn có thay đổi chưa lưu. Rời trang sẽ bỏ điểm và nhận xét vừa sửa.'}</p>
    <div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" onClick={() => blocker.reset()}>Ở lại</Button>{!busy && <Button onClick={() => blocker.proceed()}>Bỏ thay đổi và rời trang</Button>}</div>
  </section>
}
