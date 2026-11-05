import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuthSession } from '../auth/context/useAuthSession'
import { getWorkspaceRole } from '../auth/utils/role-access'
import { TourContext, type TourContextValue } from './tour-context'
import { getTourScript } from './tour-scripts'
import { getTourProgress, saveTourProgress } from './tour-persistence'
import { TOUR_VERSION, type TourStartReason } from './tour-types'
import { TourOverlay } from './TourOverlay'

export function TourProvider({ children }: { children: ReactNode }) {
  const { session } = useAuthSession()
  const user = session?.user
  const role = getWorkspaceRole(user)
  const script = getTourScript(role)
  const [active, setActive] = useState(false)
  const [startStepId, setStartStepId] = useState<string | null>(null)
  const [guideId, setGuideId] = useState<string | null>(null)
  const attemptedFor = useRef<string | null>(null)

  const startTour = useCallback((_reason: TourStartReason = 'manual') => {
    if (!user || !script) return
    const previous = getTourProgress(user.id, script.role, TOUR_VERSION)
    const resume = previous.status === 'DISMISSED' || previous.status === 'IN_PROGRESS'
    const stepId = resume && script.steps.some(step => step.id === previous.lastStepId) ? previous.lastStepId : null
    setStartStepId(stepId)
    saveTourProgress(user.id, script.role, { version: TOUR_VERSION, status: 'IN_PROGRESS', lastStepId: stepId ?? script.steps[0]?.id ?? null })
    setActive(true)
  }, [user, script])

  const handleClose = useCallback((completed: boolean, lastStepId: string) => {
    setActive(false)
    if (user && script) saveTourProgress(user.id, script.role, {
      version: TOUR_VERSION, status: completed ? 'COMPLETED' : 'DISMISSED', lastStepId: completed ? null : lastStepId,
    })
  }, [user, script])

  const handleStepChange = useCallback((stepId: string) => {
    if (user && script) saveTourProgress(user.id, script.role, { version: TOUR_VERSION, status: 'IN_PROGRESS', lastStepId: stepId })
  }, [user, script])

  // Auto-start once for a new user: wait for the shell to render, then open.
  useEffect(() => {
    if (!user || !script) return
    const key = `${user.id}:${script.role}:${TOUR_VERSION}`
    if (attemptedFor.current === key) return
    const previous = getTourProgress(user.id, script.role, TOUR_VERSION)
    if (previous.status === 'COMPLETED' || previous.status === 'DISMISSED') { attemptedFor.current = key; return }
    attemptedFor.current = key
    let tries = 0
    let timer: ReturnType<typeof setTimeout>
    const attempt = () => {
      if (document.querySelector('[data-tour="sidebar"]')) { startTour('auto'); return }
      if (tries++ < 12) timer = setTimeout(attempt, 250)
    }
    timer = setTimeout(attempt, 400)
    return () => clearTimeout(timer)
  }, [user, script, startTour])

  const value = useMemo<TourContextValue>(() => ({
    hasTour: Boolean(script),
    isActive: active,
    label: script?.label ?? null,
    guideId,
    setGuideId,
    startTour,
  }), [script, active, guideId, startTour])

  return (
    <TourContext.Provider value={value}>
      {children}
      {active && script && <TourOverlay steps={script.steps} label={script.label} initialStepId={startStepId} onStepChange={handleStepChange} onClose={handleClose} />}
    </TourContext.Provider>
  )
}
