import { HttpError } from './http-client'

const EXACT_PHRASE_MAP: Array<[RegExp, string]> = [
  [/^failed to fetch$/i, 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra mạng và thử lại.'],
  [/networkerror|load failed|network request failed/i, 'Kết nối mạng bị gián đoạn. Vui lòng thử lại sau ít phút.'],
  [/^unauthenticated$/i, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'],
  [/administrative accounts without academic department staff authority/i, 'Tài khoản quản trị chưa được gán quyền cán bộ bộ môn nên không thể thao tác mục này.'],
  [/not authorized|forbidden|access denied/i, 'Bạn không có quyền thực hiện thao tác này.'],
  [/concurrency|modified by another|conflict/i, 'Dữ liệu vừa được cập nhật bởi người khác. Vui lòng tải lại trang và thử lại.'],
  [/too many requests|rate limit/i, 'Bạn thao tác quá nhanh. Vui lòng chờ một lát rồi thử lại.'],
  [/session expired/i, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'],
]

function isTechnicalEnglishMessage(raw: string): boolean {
  const trimmed = raw.trim()
  if (!trimmed) return true
  if (/^request failed with status \d+/i.test(trimmed)) return true
  if (/^http \d{3}\b/i.test(trimmed)) return true
  if (/^(bad request|unauthorized|forbidden|not found|conflict|internal server error|service unavailable|gateway timeout)\.?$/i.test(trimmed)) return true
  // Detect pure ASCII sentences lacking Vietnamese diacritics that look like server exception text
  const hasVietnamese = /[àáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]/i.test(trimmed)
  if (!hasVietnamese && /[a-z]{3,}\s+[a-z]{3,}/i.test(trimmed)) return true
  return false
}

function statusFallback(status: number, fallback: string): string {
  switch (status) {
    case 400:
      return 'Thông tin gửi lên chưa hợp lệ. Vui lòng kiểm tra lại dữ liệu đã nhập.'
    case 401:
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    case 403:
      return 'Bạn không có quyền thực hiện thao tác này.'
    case 404:
      return 'Không tìm thấy dữ liệu được yêu cầu. Dữ liệu có thể đã bị xóa hoặc chuyển trạng thái.'
    case 409:
      return 'Dữ liệu đã thay đổi trước đó. Vui lòng tải lại trang để cập nhật bản mới nhất.'
    case 422:
      return 'Yêu cầu chưa đáp ứng điều kiện nghiệp vụ. Vui lòng kiểm tra lại thông tin.'
    case 429:
      return 'Bạn gửi quá nhiều yêu cầu trong thời gian ngắn. Vui lòng thử lại sau ít phút.'
    default:
      if (status >= 500) return 'Hệ thống đang gặp sự cố tạm thời. Vui lòng thử lại sau ít phút.'
      return fallback
  }
}

/**
 * Converts transport, HTTP status, or raw English backend ProblemDetails errors
 * into concise, natural Vietnamese messages safe for end-user alerts and toasts.
 */
export function humanizeHttpError(
  error: unknown,
  fallback = 'Không thể hoàn tất thao tác. Vui lòng thử lại.',
): string {
  if (!error) return fallback

  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'Yêu cầu đã bị hủy.'
  }

  const rawMessage = error instanceof Error
    ? error.message.trim()
    : typeof error === 'string'
      ? error.trim()
      : ''

  for (const [pattern, localized] of EXACT_PHRASE_MAP) {
    if (pattern.test(rawMessage)) return localized
  }

  if (error instanceof HttpError) {
    if (rawMessage && !isTechnicalEnglishMessage(rawMessage)) {
      return rawMessage
    }
    return statusFallback(error.status, fallback)
  }

  if (rawMessage && !isTechnicalEnglishMessage(rawMessage)) {
    return rawMessage
  }

  return fallback
}
