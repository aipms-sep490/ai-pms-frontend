import type { WorkspaceRole } from '../auth/utils/role-access'

/** Where the step popover prefers to sit relative to its target. The engine
 * falls back to another side when there is not enough room. */
export type TourPlacement = 'top' | 'bottom' | 'left' | 'right' | 'center'

export interface TourStep {
  /** Stable id used for keys and tests. */
  id: string
  /** Value of the `data-tour` attribute the step highlights. When the target
   * is absent from the DOM the engine skips the step rather than failing, so a
   * role that hides a control (e.g. department has no quick search) still gets
   * a coherent tour. A step with no `target` is shown centred as a message. */
  target?: string
  title: string
  body: string
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
