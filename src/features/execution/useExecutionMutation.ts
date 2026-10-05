import { useCallback, useRef, useState } from 'react'
import { executionError } from './execution-utils'
import { HttpError } from '../../services/http/http-client'

/** Mutations remain server-authoritative; a stale 403 refreshes the observed capability/resource, never replays. */
export function useExecutionMutation(options: { onForbidden?: () => Promise<void> | void } = {}) {
  const lock = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  async function run(operation: () => Promise<unknown>, onSaved: () => Promise<void> | void, success = 'Đã lưu thay đổi.'): Promise<boolean> {
    if (lock.current) return false
    lock.current = true; setBusy(true); setError(''); setNotice('')
    try {
      await operation()
      setNotice(success)
      await onSaved()
      return true
    } catch (reason) {
      if (reason instanceof HttpError && reason.status === 403) {
        await options.onForbidden?.()
        setError('Quyền thao tác đã thay đổi trên máy chủ. Dữ liệu và capability đã được tải lại; thao tác không được gửi lại tự động.')
      } else setError(executionError(reason, 'lưu thay đổi'))
      return false
    }
    finally { lock.current = false; setBusy(false) }
  }
  const clear = useCallback(() => { setError(''); setNotice('') }, [])
  return { busy, error, notice, run, clear }
}
