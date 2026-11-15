const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh'

export function todayVietnam(now = Date.now()) {
  return new Date(now).toLocaleDateString('sv-SE', { timeZone: VIETNAM_TIME_ZONE })
}

/** The date input is guidance; the backend remains authoritative for academic windows and conflicts. */
export function isFutureOfficeSlot(date: string, start: string, now = Date.now()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(start)) return false
  const timestamp = Date.parse(`${date}T${start}:00+07:00`)
  return Number.isFinite(timestamp) && todayVietnam(timestamp) === date && timestamp > now
}
