import { useEffect, useRef, useState } from 'react'

export function useRegistrationAutosave<T>(
  draft: T,
  onSave: (value: T) => Promise<void>,
  intervalMs = 15000,
) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const latestDraft = useRef(draft)
  const halted = useRef(false)

  useEffect(() => {
    latestDraft.current = draft
    halted.current = false
  }, [draft])

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (halted.current) return
      setStatus('saving')
      void onSave(latestDraft.current)
        .then(() => {
          setStatus('saved')
          setErrorMessage(null)
        })
        .catch(reason => {
          // Preserve local draft and stop hammering backend after 403/409/network error
          halted.current = true
          setStatus('error')
          setErrorMessage(reason instanceof Error ? reason.message : 'Lỗi tự động lưu nháp.')
        })
    }, intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs, onSave])

  return { status, errorMessage, preservedDraft: draft }
}
