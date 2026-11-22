import { HttpError } from '../../../services/http/http-client'
import { humanizeHttpError } from '../../../services/http/humanize-http-error'

export function reviewGateError(error: unknown): string {
  if (error instanceof HttpError) {
    switch (error.status) {
      case 401: return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại; nội dung đang nhập được giữ lại.'
      case 403: return `${humanizeHttpError(error, 'Bạn không có quyền thực hiện thao tác này.')} Nội dung đang nhập được giữ lại.`
      case 404: return 'Không tìm thấy cổng kiểm duyệt hoặc minh chứng trong phạm vi của bạn.'
      case 409: return 'Dữ liệu đã thay đổi. Vui lòng tải lại trước khi gửi; nội dung đang nhập được giữ lại.'
      case 413: return `Tệp vượt giới hạn máy chủ${error.problem?.maxBytesLabel ? ` (${error.problem.maxBytesLabel})` : typeof error.problem?.maxBytes === 'number' && Number.isFinite(error.problem.maxBytes) ? ` (${error.problem.maxBytes} byte)` : ''}. Hãy chọn tệp khác; nội dung đang nhập được giữ lại.`
      case 422: return humanizeHttpError(error, 'Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại thông tin.')
      case 429: return 'Quá nhiều yêu cầu. Vui lòng chờ rồi thử lại.'
      default: if (error.status >= 500) return 'Máy chủ chưa xử lý được yêu cầu. Nội dung đang nhập được giữ lại để bạn thử lại sau.'
    }
  }
  if (error instanceof TypeError) return 'Không thể kết nối. Kiểm tra mạng rồi thử lại; nội dung đang nhập được giữ lại.'
  return humanizeHttpError(error, 'Không thể gửi dữ liệu. Vui lòng thử lại.')
}
