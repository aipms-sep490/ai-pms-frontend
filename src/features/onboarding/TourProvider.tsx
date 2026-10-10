import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuthSession } from '../auth/context/useAuthSession'
import { getWorkspaceRole } from '../auth/utils/role-access'
import { TourContext, type TourContextValue } from './tour-context'
import { getTourScript } from './tour-scripts'
import { getSeenTourVersion, markTourSeen } from './tour-persistence'
import { TOUR_VERSION, type TourStartReason } from './tour-types'
import { TourOverlay } from './TourOverlay'

export function TourProvider({ children }: { children: ReactNode }) {
  const { session } = useAuthSession()
  const user = session?.user
  const role = getWorkspaceRole(user)
  const script = getTourScript(role)
  const [active, setActive] = useState(false)
  const attemptedFor = useRef<string | null>(null)

  const startTour = useCallback((_reason: TourStartReason = 'manual') => {
    if (script) setActive(true)
  }, [script])

  const handleClose = useCallback((_completed: boolean) => {
    setActive(false)
    if (user && script) markTourSeen(user.id, script.role, TOUR_VERSION)
  }, [user, script])

  // Auto-start once for a new user: wait for the shell to render, then open.
  useEffect(() => {
    if (!user || !script) return
    const key = `${user.id}:${script.role}`
    if (attemptedFor.current === key) return
    if (getSeenTourVersion(user.id, script.role) >= TOUR_VERSION) { attemptedFor.current = key; return }
    attemptedFor.current = key
    let tries = 0
    let timer: ReturnType<typeof setTimeout>
    const attempt = () => {
      if (document.querySelector('[data-tour="sidebar"]')) { setActive(true); return }
      if (tries++ < 12) timer = setTimeout(attempt, 250)
    }
    timer = setTimeout(attempt, 400)
    return () => clearTimeout(timer)
  }, [user, script])

  const value = useMemo<TourContextValue>(() => ({
    hasTour: Boolean(script),
    isActive: active,
    label: script?.label ?? null,
    startTour,
  }), [script, active, startTour])

  return (
    <TourContext.Provider value={value}>
      {children}
      {active && script && <TourOverlay steps={script.steps} label={script.label} onClose={handleClose} />}
    </TourContext.Provider>
  )
}
