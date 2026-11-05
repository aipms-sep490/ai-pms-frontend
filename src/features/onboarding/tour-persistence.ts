import type { WorkspaceRole } from '../auth/utils/role-access'
import type { TourProgress, TourStatus } from './tour-types'

/** Per-viewer convenience only: remembers whether someone has already seen the
 * guided tour for their role, so it auto-starts once for a new user. Stored in
 * localStorage, which can be blocked or cleared, so every access is guarded and
 * a failure simply means the tour may show again — never a crash. */
const storageKey = (userId: number, role: WorkspaceRole) => `ai-pms:tour:${userId}:${role}`

const statuses: readonly TourStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'DISMISSED']

export function getTourProgress(userId: number, role: WorkspaceRole, version: number): TourProgress {
  const empty: TourProgress = { version, status: 'NOT_STARTED', lastStepId: null }
  try {
    const raw = window.localStorage.getItem(storageKey(userId, role))
    if (!raw) return empty
    // The previous format stored only a number and treated both Skip and Xong
    // as seen. Preserve its no-auto-open behavior on upgrade.
    const legacyVersion = Number(raw)
    if (Number.isInteger(legacyVersion) && legacyVersion > 0) {
      return legacyVersion === version ? { version, status: 'COMPLETED', lastStepId: null } : empty
    }
    const saved = JSON.parse(raw) as Partial<TourProgress>
    if (saved.version !== version || !statuses.includes(saved.status as TourStatus)) return empty
    return { version, status: saved.status as TourStatus, lastStepId: typeof saved.lastStepId === 'string' ? saved.lastStepId : null }
  } catch {
    return empty
  }
}

export function saveTourProgress(userId: number, role: WorkspaceRole, progress: TourProgress): void {
  try {
    window.localStorage.setItem(storageKey(userId, role), JSON.stringify(progress))
  } catch {
    /* local storage is optional */
  }
}

export function getSeenTourVersion(userId: number, role: WorkspaceRole): number {
  try {
    const raw = window.localStorage.getItem(storageKey(userId, role))
    if (!raw) return 0
    const value = Number.parseInt(raw, 10)
    if (Number.isFinite(value) && value > 0) return value
    const saved = JSON.parse(raw) as Partial<TourProgress>
    return saved.status === 'COMPLETED' || saved.status === 'DISMISSED' ? saved.version ?? 0 : 0
  } catch {
    return 0
  }
}

export function markTourSeen(userId: number, role: WorkspaceRole, version: number): void {
  saveTourProgress(userId, role, { version, status: 'COMPLETED', lastStepId: null })
}
