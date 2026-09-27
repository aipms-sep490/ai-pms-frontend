import { useCallback, useRef, useState } from 'react'
import { executionError } from './execution-utils'

export function useExecutionMutation() {
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
    } catch (reason) { setError(executionError(reason, 'lưu thay đổi')); return false }
    finally { lock.current = false; setBusy(false) }
  }
  const clear = useCallback(() => { setError(''); setNotice('') }, [])
  return { busy, error, notice, run, clear }
}
