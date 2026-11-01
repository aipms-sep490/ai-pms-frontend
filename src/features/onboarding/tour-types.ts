import type { WorkspaceRole } from '../auth/utils/role-access'
import type { TourAnchor } from './tour-anchors'

/** Where the step popover prefers to sit relative to its target. The engine
 * falls back to another side when there is not enough room. */
export type TourPlacement = 'top' | 'bottom' | 'left' | 'right' | 'center'

export interface TourStep {
  /** Stable id used for keys and tests. */
  id: string
  /** Value of the `data-tour` attribute the step highlights. Missing targets
   * are shown as a centred message instead of silently skipping a step. */
  target?: TourAnchor
  title: string
  body: string
  fallbackBody?: string
  placement?: TourPlacement
}

export interface TourScript {
  role: WorkspaceRole
  /** Short label shown while the tour runs, e.g. "Hướng dẫn sinh viên". */
  label: string
  steps: readonly TourStep[]
}

/** Bump when a script changes materially so returning users see it once more. */
export const TOUR_VERSION = 1

export type TourStartReason = 'auto' | 'manual'
export type TourStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'DISMISSED'
export interface TourProgress { version: number; status: TourStatus; lastStepId: string | null }
