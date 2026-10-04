/** Provider-only infrastructure messages. Backend ProblemDetails codes remain authoritative for business UX. */
export function liveKitErrorMessage(reason: unknown) {
  const message = reason instanceof Error ? reason.message.toLowerCase() : ''
  if (message.includes('token') || message.includes('credential') || message.includes('unauthorized')) return 'Thông tin tham gia Video đã hết hạn hoặc không hợp lệ. Hãy quay lại và tham gia lại khi cần.'
  if (message.includes('device') || message.includes('camera') || message.includes('microphone')) return 'Không thể sử dụng thiết bị media đã chọn. Hãy kiểm tra camera hoặc microphone rồi thử lại.'
  if (message.includes('network') || message.includes('websocket') || message.includes('connection')) return 'Kết nối Video bị gián đoạn. AI-PMS đang chờ dịch vụ khôi phục.'
  return 'Không thể kết nối dịch vụ Video. Hãy thử lại từ màn hình kiểm tra thiết bị.'
}
