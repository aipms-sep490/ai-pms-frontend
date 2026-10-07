/** Event payloads are invalidation hints only. REST remains the data authority. */
export function createChatEventFilter() {
  const seen = new Set<string>()
  const versions = new Map<string, bigint>()
  return (value: unknown): boolean => {
    if (!value || typeof value !== 'object') return false
    const e = value as Record<string, unknown>
    if (e.schemaVersion !== 1 || typeof e.eventId !== 'string' || !e.eventId ||
      typeof e.conversationId !== 'string' || !/^[1-9]\d*$/.test(e.conversationId) ||
      typeof e.version !== 'string' || !/^\d+$/.test(e.version)) return false
    if (seen.has(e.eventId)) return false
    seen.add(e.eventId)
    if (seen.size > 1000) seen.delete(seen.values().next().value!)
    const version = BigInt(e.version)
    if (version <= (versions.get(e.conversationId) ?? -1n)) return false
    versions.delete(e.conversationId)
    versions.set(e.conversationId, version)
    if (versions.size > 1000) versions.delete(versions.keys().next().value!)
    return true
  }
}

export function chatConnectionLabel(state: string) {
  switch (state) {
    case 'connected': return 'Đã kết nối realtime'
    case 'connecting': return 'Đang kết nối realtime…'
    case 'reconnecting': return 'Đang kết nối lại…'
    default: return 'Realtime gián đoạn · tự đồng bộ mỗi 30 giây'
  }
}
