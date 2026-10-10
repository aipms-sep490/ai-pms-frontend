import type { WorkspaceRole } from '../auth/utils/role-access'

/** Per-viewer convenience only: remembers whether someone has already seen the
 * guided tour for their role, so it auto-starts once for a new user. Stored in
 * localStorage, which can be blocked or cleared, so every access is guarded and
 * a failure simply means the tour may show again — never a crash. */
const storageKey = (userId: number, role: WorkspaceRole) => `ai-pms:tour:${userId}:${role}`

export function getSeenTourVersion(userId: number, role: WorkspaceRole): number {
  try {
    const raw = window.localStorage.getItem(storageKey(userId, role))
    if (!raw) return 0
    const value = Number.parseInt(raw, 10)
    return Number.isFinite(value) && value > 0 ? value : 0
  } catch {
    return 0
  }
}

export function markTourSeen(userId: number, role: WorkspaceRole, version: number): void {
  try {
    window.localStorage.setItem(storageKey(userId, role), String(version))
  } catch {
    /* storage unavailable — the tour may simply offer itself again next time */
  }
}
