import type { StudentJourneyState } from '../types/student-journey.types'
import { studentNavigation } from '../constants/student-navigation'

export interface StudentNextActionInput {
  journeyState: StudentJourneyState
  /** The Project status is backend data. It only refines the eligible-team CTA for an existing draft. */
  projectStatus?: string | null
}

export interface StudentNextAction {
  label: string
  route: string
  detail: string
}

const details: Record<StudentJourneyState, Omit<StudentNextAction, 'route'>> = {
  NO_TEAM: { label: 'Tạo hoặc tham gia nhóm', detail: 'Tạo nhóm hoặc phản hồi lời mời đang chờ.' },
  TEAM_FORMING: { label: 'Hoàn thiện đội hình', detail: 'Cấu hình ngành, mời thành viên và kiểm tra điều kiện do Backend trả về.' },
  TEAM_ELIGIBLE: { label: 'Soạn đề cương', detail: 'Nhóm đã sẵn sàng để mở hoặc tiếp tục bản đăng ký.' },
  PROJECT_PENDING: { label: 'Theo dõi thẩm định', detail: 'Xem trạng thái và phản hồi mới nhất từ Bộ môn.' },
  REVISION_REQUIRED: { label: 'Xử lý yêu cầu sửa', detail: 'Đọc phản hồi, cập nhật đề cương và nộp lại theo quyền Backend.' },
  PROJECT_REJECTED: { label: 'Xem kết quả thẩm định', detail: 'Đề cương không được chấp thuận. Xem kết quả và lịch sử do Backend trả về.' },
  SUPERVISOR_PENDING: { label: 'Chọn giảng viên', detail: 'Tìm và gửi yêu cầu tới giảng viên phù hợp.' },
  ACTIVE: { label: 'Mở không gian đồ án', detail: 'Project đã ACTIVE theo trạng thái và phân công được Backend xác nhận.' },
  FINAL_SUBMISSION: { label: 'Hoàn thiện bàn giao', detail: 'Kiểm tra hồ sơ và sản phẩm trước khi nộp bản cuối.' },
  COMPLETED: { label: 'Xem hồ sơ đồ án', detail: 'Đồ án đã hoàn thành; hồ sơ và kết quả vẫn được lưu tại đây.' },
}

/**
 * The sole client-side next-action resolver. It interprets data already loaded
 * from Backend; it neither changes Project state nor grants an action.
 */
export function resolveStudentNextAction({ journeyState, projectStatus }: StudentNextActionInput): StudentNextAction {
  const configured = studentNavigation.find((step) => step.state === journeyState)
  if (!configured) throw new Error(`No student destination is configured for ${journeyState}.`)

  const isDraft = projectStatus?.replaceAll('_', '').toUpperCase() === 'DRAFT'
  if (journeyState === 'TEAM_ELIGIBLE' && isDraft) {
    return { label: 'Tiếp tục bản nháp', route: '/project/edit', detail: 'Bản nháp hiện hữu được Backend trả về; hãy cập nhật trước khi nộp.' }
  }

  return { ...details[journeyState], route: configured.route }
}
