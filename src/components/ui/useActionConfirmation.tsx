import { useCallback, useEffect, useRef, useState } from 'react'
import { Modal } from './Modal'

type Confirmation = { title: string; description: string; confirmLabel: string; danger?: boolean; reasonLabel?: string }

/** Resolve with null on cancel, a trimmed reason (or empty string) on confirm. */
export function useActionConfirmation() {
  const [request, setRequest] = useState<Confirmation | null>(null)
  const [reason, setReason] = useState('')
  const resolve = useRef<((value: string | null) => void) | null>(null)
  useEffect(() => () => { resolve.current?.(null); resolve.current = null }, [])
  const requestConfirmation = useCallback((next: Confirmation): Promise<string | null> => {
    if (resolve.current) return Promise.resolve(null)
    setReason(''); setRequest(next)
    return new Promise(done => { resolve.current = done })
  }, [])
  function finish(value: string | null) { resolve.current?.(value); resolve.current = null; setRequest(null) }
  const confirmationDialog = request && <Modal open title={request.title} description={request.description} onClose={() => finish(null)}>
    <form onSubmit={event => { event.preventDefault(); if (!request.reasonLabel || reason.trim()) finish(reason.trim()) }}>
      {request.reasonLabel && <label className="app-confirmation__reason">{request.reasonLabel}<textarea autoFocus required rows={4} value={reason} onChange={event => setReason(event.target.value)} /></label>}
      <div className="app-modal__actions"><button autoFocus={!request.reasonLabel} type="button" className="app-modal__button" onClick={() => finish(null)}>Hủy</button><button type="submit" className={`app-modal__button ${request.danger ? 'app-modal__button--danger' : 'app-modal__button--primary'}`} disabled={Boolean(request.reasonLabel && !reason.trim())}>{request.confirmLabel}</button></div>
    </form>
  </Modal>
  return { requestConfirmation, confirmationDialog }
}
