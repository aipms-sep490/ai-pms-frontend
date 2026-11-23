/**
 * Unified Vietnamese-aware initials & deterministic avatar tone utilities.
 *
 * Replaces 4 conflicting ad-hoc algorithms across Sidebar, TaskBoard,
 * Contributions, TeamRoster, ProfileAvatar, and AdminUserDetail.
 */

const PARENTHETICAL_RE = /\s*\([^)]*\)\s*/g
const BRACKETED_RE = /\s*\[[^\]]*\]\s*/g

/**
 * Computes 1–2 uppercase initials from a display name.
 *
 * Rules:
 * - Strips parenthetical/bracketed tags like `(Flow IT)`, `(Flow MKT)`, `[TEST]`
 *   so `"Lê Hoàng Long (Flow IT)"` → `"LL"` instead of `"LI"` or `"L("`.
 * - For multi-word names, prefers the first and last alphabetic tokens
 *   (`"Nguyễn Đức Minh"` → `"NM"`, `"Phạm Thùy Linh (Flow MKT)"` → `"PL"`).
 * - For single-word names, takes the first two characters (`"Admin"` → `"AD"`).
 * - Uses `'vi-VN'` locale casing so `đ` → `Đ` properly.
 */
export function getInitials(name: string | null | undefined, fallback = '?'): string {
  const cleaned = (name ?? '')
    .replace(PARENTHETICAL_RE, ' ')
    .replace(BRACKETED_RE, ' ')
    .trim()

  if (!cleaned) {
    const raw = (name ?? '').trim()
    if (!raw) return fallback
    return Array.from(raw).slice(0, 2).join('').toLocaleUpperCase('vi-VN')
  }

  const tokens = cleaned.split(/\s+/).filter(Boolean)
  const alphaTokens = tokens.filter((token) => /\p{L}/u.test(token))
  const parts = alphaTokens.length > 0 ? alphaTokens : tokens

  if (parts.length === 1) {
    return Array.from(parts[0]).slice(0, 2).join('').toLocaleUpperCase('vi-VN')
  }

  const firstChar = Array.from(parts[0])[0] ?? ''
  const lastChar = Array.from(parts[parts.length - 1])[0] ?? ''
  return `${firstChar}${lastChar}`.toLocaleUpperCase('vi-VN') || fallback
}

export type AvatarTone = 'primary' | 'se' | 'success' | 'uiux' | 'warning'

const AVATAR_TONES: readonly AvatarTone[] = ['primary', 'se', 'success', 'uiux', 'warning']

/** Deterministic semantic FAMS tone derived from user name or ID. */
export function getAvatarTone(seed: string | number | null | undefined): AvatarTone {
  const key = String(seed ?? '').trim().toLowerCase()
  if (!key) return 'primary'
  let hash = 0
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  }
  return AVATAR_TONES[hash % AVATAR_TONES.length]
}
