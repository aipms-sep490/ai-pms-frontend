import { HttpError } from '../../../services/http/http-client'

export function classifyAcademicError(
  reason: unknown,
  fallbackMessage = 'Không thể đồng bộ cấu hình học vụ. Hãy thử lại.',
): string {
  if (reason instanceof HttpError) {
    const status = reason.status
    const problem = reason.problem
    const detail = problem?.detail || reason.message || ''
    const detailLower = detail.toLowerCase()
    const code = problem?.code || ''

    if (status === 403) {
      return 'Bạn chưa có quyền quản trị hoặc thay đổi cấu hình học vụ này.'
    }

    if (status === 404) {
      return 'Không tìm thấy thông tin học kỳ, giai đoạn hoặc chính sách tương ứng.'
    }

    if (status === 409) {
      // Overlap detection (UX-01 / ADM-29)
      if (
        code === 'PERIOD_OVERLAP' ||
        code === 'SEMESTER_OVERLAP' ||
        detailLower.includes('overlap') ||
        detailLower.includes('trùng lặp') ||
        detailLower.includes('trùng thời gian')
      ) {
        return 'Khoảng thời gian của giai đoạn bị trùng lặp với một giai đoạn khác cùng loại trong học kỳ. Vui lòng điều chỉnh lại ngày bắt đầu và kết thúc.'
      }

      // Closed semester or period
      if (
        detailLower.includes('closed') ||
        detailLower.includes('archived') ||
        detailLower.includes('đã đóng') ||
        detailLower.includes('lưu trữ')
      ) {
        return 'Học kỳ hoặc giai đoạn đồ án đã đóng hoặc được lưu trữ, không thể thực hiện thay đổi cấu hình.'
      }

      // Existing draft conflict
      if (
        detailLower.includes('edit or publish the existing draft first') ||
        detailLower.includes('existing draft')
      ) {
        return 'Đã tồn tại một bản nháp chính sách chưa công bố. Vui lòng chỉnh sửa hoặc công bố bản nháp hiện có trước khi tạo bản mới.'
      }

      // Successor timing conflict
      if (
        detailLower.includes('successor must start after') ||
        detailLower.includes('immediately effective') ||
        detailLower.includes('already recorded operation')
      ) {
        return 'Thời gian hiệu lực của chính sách kế tiếp phải bắt đầu sau thời điểm của chính sách trước đó.'
      }

      // Concurrency / version conflict
      if (
        detailLower.includes('version changed') ||
        detailLower.includes('draft changed') ||
        detailLower.includes('concurrency')
      ) {
        return 'Chính sách vừa được thay đổi. Dữ liệu mới đã được tải lại; hãy kiểm tra trước khi thao tác tiếp.'
      }

      return 'Chính sách vừa được thay đổi. Dữ liệu mới đã được tải lại; hãy kiểm tra trước khi thao tác tiếp.'
    }

    if (status === 400) {
      // Check field errors if present
      if (problem?.errors) {
        const errorEntries = Object.entries(problem.errors)
        for (const [key, msgs] of errorEntries) {
          const k = key.toLowerCase()
          if (k.includes('start') || k.includes('end') || k.includes('date')) {
            return 'Khoảng thời gian không hợp lệ. Ngày bắt đầu phải diễn ra trước ngày kết thúc.'
          }
          if (Array.isArray(msgs) && msgs.length > 0 && msgs[0]) {
            const m = msgs[0]
            if (/[à-ỹÀ-Ỹ]/.test(m)) return m
          }
        }
      }

      if (
        detailLower.includes('date') ||
        detailLower.includes('time') ||
        detailLower.includes('start') ||
        detailLower.includes('end')
      ) {
        return 'Khoảng thời gian không hợp lệ. Ngày bắt đầu phải diễn ra trước ngày kết thúc.'
      }

      return 'Dữ liệu cấu hình chưa đáp ứng các điều kiện áp dụng. Vui lòng kiểm tra lại biểu mẫu.'
    }

    if (status >= 500) {
      return 'Máy chủ đang gặp sự cố khi xử lý cấu hình học vụ. Vui lòng thử lại sau giây lát.'
    }
  }

  if (reason instanceof Error && reason.message && /[à-ỹÀ-Ỹ]/.test(reason.message)) {
    return reason.message
  }

  return fallbackMessage
}
