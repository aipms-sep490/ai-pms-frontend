import { HttpError } from '../../services/http/http-client'

export interface AcademicError {
  message: string
  action?: 'retry' | 'reload'
  fields?: Record<string, string>
}

// Field names are contract data; backend prose, details and trace IDs are never display text.
const fieldCopy: Record<string, { field: string; message: string }> = {
  code: { field: 'code', message: 'Kiểm tra mã: dùng chữ, số, dấu chấm, gạch dưới hoặc gạch nối, tối đa 50 ký tự.' },
  name: { field: 'name', message: 'Nhập tên hợp lệ, tối đa 255 ký tự.' },
  organizationid: { field: 'organizationId', message: 'Chọn đơn vị tổ chức hợp lệ.' },
  academicsemesterid: { field: 'semesterId', message: 'Chọn học kỳ hợp lệ.' },
  semesterid: { field: 'semesterId', message: 'Chọn học kỳ hợp lệ.' },
  periodtype: { field: 'periodType', message: 'Chọn loại giai đoạn được hỗ trợ.' },
  startdate: { field: 'startDate', message: 'Kiểm tra ngày bắt đầu học kỳ.' },
  enddate: { field: 'endDate', message: 'Kiểm tra ngày kết thúc; ngày này phải sau hoặc bằng ngày bắt đầu.' },
  startat: { field: 'startAt', message: 'Kiểm tra thời gian bắt đầu giai đoạn.' },
  endat: { field: 'endAt', message: 'Kiểm tra thời gian kết thúc; thời điểm này phải sau thời gian bắt đầu.' },
  minteamsize: { field: 'minTeamSize', message: 'Kiểm tra số thành viên tối thiểu và giới hạn tối đa.' },
  maxteamsize: { field: 'maxTeamSize', message: 'Kiểm tra số thành viên tối đa và giới hạn tối thiểu.' },
  mindistinctmajors: { field: 'minDistinctMajors', message: 'Số ngành tối thiểu phải từ 1 đến số thành viên tối đa.' },
  maxprojectspersupervisor: { field: 'maxProjectsPerSupervisor', message: 'Số đồ án tối đa mỗi giảng viên phải từ 1 trở lên.' },
  allowedprojectmodes: { field: 'allowedProjectModes', message: 'Chọn ít nhất một phương thức đồ án được hỗ trợ.' },
  allowedproposalsources: { field: 'allowedProposalSources', message: 'Chọn ít nhất một nguồn đề tài được hỗ trợ.' },
  effectivefrom: { field: 'effectiveFrom', message: 'Kiểm tra thời điểm bắt đầu hiệu lực.' },
  effectiveto: { field: 'effectiveTo', message: 'Kiểm tra thời điểm kết thúc hiệu lực; phải sau thời điểm bắt đầu.' },
  policy: { field: 'policy', message: 'Kiểm tra phương thức, nguồn đề tài, số thành viên và khoảng hiệu lực của chính sách.' },
}

export function academicError(reason: unknown, context: 'governance' | 'policy'): AcademicError {
  if (reason instanceof HttpError) {
    if (reason.status === 403) return { message: context === 'policy' ? 'Bạn chưa có quyền quản lý chính sách của giai đoạn này.' : 'Bạn chưa có quyền quản trị cấu hình này.' }
    if (reason.status === 401) return { message: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.' }
    if (reason.status === 404) return { message: context === 'policy' ? 'Không tìm thấy giai đoạn hoặc chưa có chính sách đang hiệu lực.' : 'Không tìm thấy cấu hình học vụ. Hãy tải lại danh sách để kiểm tra.', action: 'reload' }
    if (reason.status === 409) {
      // This shared identifier exists in the merged BE WorkflowErrorCodes contract.
      if (reason.problem?.code === 'STALE_CONCURRENCY_TOKEN') return { message: 'Dữ liệu đã thay đổi. Hãy tải lại rồi chọn bản mới trước khi sửa tiếp.', action: 'reload' }
      return context === 'policy'
        ? { message: 'Chưa thể lưu chính sách do xung đột với dữ liệu hiện có. Hãy tải lại, đối chiếu phiên bản và điều kiện áp dụng trước khi sửa tiếp.', action: 'reload' }
        : { message: 'Cấu hình chưa thể lưu do xung đột với dữ liệu hiện có. Hãy kiểm tra mã, khoảng thời gian và trạng thái của các giai đoạn hoặc học kỳ trước khi lưu lại.' }
    }
    if (reason.status === 400 || reason.status === 422) {
      const fields: Record<string, string> = {}
      for (const key of Object.keys(reason.problem?.errors ?? {})) {
        const name = key.replace(/^\$\./, '').replace(/^policy\./i, '').toLowerCase()
        if (Object.hasOwn(fieldCopy, name)) {
          const field = fieldCopy[name]
          fields[field.field] = field.message
        }
      }
      return { message: 'Dữ liệu chưa đáp ứng các điều kiện áp dụng. Hãy kiểm tra các trường và điều chỉnh trước khi lưu lại.', fields }
    }
    if (reason.status >= 400 && reason.status < 500) return { message: 'Chưa thể hoàn tất thao tác này. Hãy kiểm tra quyền và điều kiện áp dụng.' }
  }
  return { message: context === 'policy' ? 'Không thể đồng bộ phiên bản chính sách. Hãy thử tải lại.' : 'Không thể đồng bộ cấu hình học vụ. Hãy thử lại.', action: 'retry' }
}

