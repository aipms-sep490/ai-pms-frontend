export function formatPresenceDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 60) return 'Dưới 1 phút'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} phút`
  return `${Math.floor(minutes / 60)} giờ${minutes % 60 ? ` ${minutes % 60} phút` : ''}`
}

export function formatPresenceTime(value: string | null, unavailable = 'Chưa có dữ liệu'): string {
  if (!value) return unavailable
  const parsed = new Date(value)
  if (Number.isNaN(parsed.valueOf())) return unavailable
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }).format(parsed)
}
