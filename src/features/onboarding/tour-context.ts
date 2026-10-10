import { createContext, useContext } from 'react'
import type { TourStartReason } from './tour-types'

export interface TourContextValue {
  /** True when a tour script exists for the current role (controls the Help button). */
  hasTour: boolean
  /** True while the guided tour overlay is visible. */
  isActive: boolean
  /** Short label of the active/available script, e.g. "Hướng dẫn sinh viên". */
  label: string | null
  startTour: (reason?: TourStartReason) => void
}

export const TourContext = createContext<TourContextValue | null>(null)

export function useTour(): TourContextValue {
  const value = useContext(TourContext)
  if (!value) return { hasTour: false, isActive: false, label: null, startTour: () => {} }
  return value
}
