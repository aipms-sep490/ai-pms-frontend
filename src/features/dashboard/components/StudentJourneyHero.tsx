import { useNavigate } from 'react-router-dom'
import { useStudentJourney } from '../../../app/context'
import { getActivePrimaryAssignment } from '../../projects/utils/project-resolution.utils'

export function StudentJourneyHero() {
  const navigate = useNavigate()
  const { journeyState, team, project, assignments, semester, period, profile, error, refreshAll } = useStudentJourney()

  const activeSupervisor = getActivePrimaryAssignment(assignments)
  const teamDisplayName = team?.name?.trim() || team?.code?.trim() || 'của bạn'
  const minTeamSize = period?.minTeamSize ?? 4
  const maxTeamSize = period?.maxTeamSize ?? 5
  const projectModeLabel = team?.academicScope?.projectMode === 'INTERDISCIPLINARY' ? 'liên ngành' : 'đơn ngành'

  const getJourneyConfig = () => {
    if (error) {
      return {
        badge: 'Chưa đồng bộ dữ liệu',
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
        title: 'Không thể tải trạng thái đồ án',
        desc: `${error}. Hãy kiểm tra kết nối Backend rồi thử lại.`,
        icon: 'cloud_off',
        iconBg: 'bg-rose-600 text-white',
        ctaText: 'Thử tải lại',
        ctaRoute: '/project/workspace',
        ctaIcon: 'refresh',
      }
    }
    switch (journeyState) {
      case 'NO_TEAM':
        return {
          badge: 'Giai đoạn 1: Tuyển quân',
          badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
          title: 'Bạn chưa tham gia nhóm đồ án nào trong học kỳ này',
          desc: `Học kỳ ${semester?.name ?? 'hiện tại'} đang mở đợt đăng ký đồ án tốt nghiệp (${period?.name ?? 'đợt đăng ký hiện tại'}). Hãy khởi tạo nhóm mới hoặc kiểm tra hộp thư lời mời từ các nhóm khác.`,
          icon: 'group_add',
          iconBg: 'bg-blue-600 text-white',
          ctaText: 'Quản lý Nhóm & Xem Lời mời',
          ctaRoute: '/team',
          ctaIcon: 'arrow_forward',
        }
      case 'TEAM_FORMING':
        return {
          badge: 'Giai đoạn 2: Kiện toàn Đội hình',
          badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
          title: `Nhóm ${teamDisplayName} đang kiện toàn nhân sự`,
          desc: `Hiện có ${team?.members.length ?? 0}/${maxTeamSize} thành viên. Quy chế yêu cầu từ ${minTeamSize} đến ${maxTeamSize} thành viên ${projectModeLabel}. Hãy hoàn thiện đội hình và kiểm tra điều kiện để mở cổng đăng ký đề tài.`,
          icon: 'diversity_3',
          iconBg: 'bg-amber-500 text-white',
          ctaText: 'Kiểm tra Điều kiện & Roster',
          ctaRoute: '/team',
          ctaIcon: 'checklist',
        }
      case 'TEAM_ELIGIBLE':
        return {
          badge: 'Giai đoạn 3: Soạn thảo Đề cương',
          badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          title: 'Đội hình đã đủ điều kiện! Hãy đăng ký đề cương đồ án',
          desc: `Nhóm ${teamDisplayName} đã đạt chuẩn nhân sự ${projectModeLabel}. Bạn có thể tham khảo danh mục đề tài gợi ý từ Khoa hoặc trực tiếp soạn thảo đề cương mới.`,
          icon: 'assignment_turned_in',
          iconBg: 'bg-emerald-600 text-white',
          ctaText: 'Đăng ký Đề cương Đồ án',
          ctaRoute: '/project/register',
          ctaIcon: 'edit_document',
          secondaryText: 'Khám phá Đề tài Tham khảo',
          secondaryRoute: '/topics',
        }
      case 'PROJECT_PENDING':
        return {
          badge: 'Giai đoạn 4: Khoa Thẩm định',
          badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
          title: 'Đề cương đồ án đang được Hội đồng Khoa xét duyệt',
          desc: `Đề tài "${project?.title ?? 'Đang tải...'}" (Mã: ${project?.code ?? 'CP...'}) đã được nộp thành công lên Bộ môn. Vui lòng theo dõi thông báo và trạng thái thẩm định.`,
          icon: 'hourglass_top',
          iconBg: 'bg-purple-600 text-white',
          ctaText: 'Xem Tiến trình Thẩm định',
          ctaRoute: '/project/status',
          ctaIcon: 'visibility',
        }
      case 'REVISION_REQUIRED':
        return {
          badge: 'Cần xử lý: Yêu cầu Chỉnh sửa',
          badgeClass: 'bg-rose-100 text-rose-800 border-rose-200 animate-pulse',
          title: 'Bộ môn yêu cầu nhóm chỉnh sửa lại đề cương đồ án',
          desc: 'Đề cương của bạn đã có phản hồi từ Hội đồng thẩm định. Vui lòng đọc kỹ ý kiến nhận xét của Bộ môn, cập nhật nội dung và nộp lại trước thời hạn.',
          icon: 'warning',
          iconBg: 'bg-rose-600 text-white',
          ctaText: 'Xem Ý kiến & Chỉnh sửa Ngay',
          ctaRoute: '/project/status',
          ctaIcon: 'edit_note',
        }
      case 'PROJECT_REJECTED':
        return {
          badge: 'Kết quả thẩm định',
          badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
          title: 'Đề cương chưa được Bộ môn chấp thuận',
          desc: 'Xem kết quả và lịch sử thẩm định do Backend trả về. Màn hình này không cấp quyền tạo hoặc nộp lại đề cương.',
          icon: 'assignment_late',
          iconBg: 'bg-rose-600 text-white',
          ctaText: 'Xem kết quả thẩm định',
          ctaRoute: '/project/status',
          ctaIcon: 'visibility',
        }
      case 'SUPERVISOR_PENDING':
        return {
          badge: 'Giai đoạn 5: Ghép cặp GVHD',
          badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          title: 'Đề cương đã được duyệt! Hãy chọn Giảng viên Hướng dẫn',
          desc: `Đề tài của nhóm ${teamDisplayName} đã thông qua vòng thẩm định của Bộ môn. Bước tiếp theo là gửi yêu cầu tới giảng viên có chuyên môn phù hợp.`,
          icon: 'school',
          iconBg: 'bg-indigo-600 text-white',
          ctaText: 'Chọn Giảng viên Hướng dẫn',
          ctaRoute: '/project/supervisor',
          ctaIcon: 'person_search',
        }
      case 'ACTIVE':
      default:
        return {
          badge: 'Giai đoạn Thực hiện: Đang hoạt động',
          badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          title: `Đồ án: ${project?.title ?? 'Đang cập nhật thông tin'}`,
          desc: `GVHD: ${activeSupervisor?.supervisorName ?? 'Chưa phân công'} • Học kỳ: ${semester?.name ?? 'Chưa xác định'} • Thành viên: ${team?.members.length ?? 0} bạn • Nhóm: ${team?.code || teamDisplayName}`,
          icon: 'rocket_launch',
          iconBg: 'bg-blue-600 text-white',
          ctaText: 'Xem Cột mốc & Tasks (Kanban)',
          ctaRoute: '/project/milestones/M3',
          ctaIcon: 'view_kanban',
          secondaryText: 'Biểu đồ Gantt',
          secondaryRoute: '/project/gantt',
        }
    }
  }

  const config = getJourneyConfig()

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-slate-700/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div className="flex items-start gap-4 max-w-3xl">
        <div className={`w-12 h-12 rounded-2xl ${config.iconBg} flex items-center justify-center font-bold text-xl shrink-0 shadow-sm mt-0.5`}>
          <span className="material-symbols-outlined text-[26px]">{config.icon}</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${config.badgeClass}`}>
              {config.badge}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              SV: {profile?.fullName ?? 'Sinh viên'}{profile?.studentCode ? ` (${profile.studentCode})` : (profile?.id ? ` (ID #${profile.id})` : '')}
            </span>
          </div>
          <h2 className="text-lg font-bold tracking-tight text-white">{config.title}</h2>
          <p className="text-xs text-slate-300 leading-relaxed">{config.desc}</p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
        {config.secondaryText && config.secondaryRoute && (
          <button
            type="button"
            onClick={() => navigate(config.secondaryRoute!)}
            className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-xl text-xs font-semibold transition-colors"
          >
            {config.secondaryText}
          </button>
        )}
        <button
          type="button"
          onClick={() => error ? void refreshAll() : navigate(config.ctaRoute)}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[18px]">{config.ctaIcon}</span>
          {config.ctaText}
        </button>
      </div>
    </div>
  )
}
