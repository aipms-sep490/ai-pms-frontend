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
        desc: `${error}. Hãy kiểm tra kết nối rồi thử lại.`,
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
          badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          title: 'Bạn chưa tham gia nhóm đồ án nào trong học kỳ này',
          desc: `Học kỳ ${semester?.name ?? 'hiện tại'} đang mở đợt đăng ký đồ án tốt nghiệp (${period?.name ?? 'đợt đăng ký hiện tại'}). Hãy khởi tạo nhóm mới hoặc kiểm tra hộp thư lời mời từ các nhóm khác.`,
          icon: 'group_add',
          iconBg: 'bg-[#0f5b4e] text-white',
          ctaText: 'Quản lý nhóm và lời mời',
          ctaRoute: '/team',
          ctaIcon: 'arrow_forward',
        }
      case 'TEAM_FORMING':
        return {
          badge: 'Giai đoạn 2: Hoàn thiện nhóm',
          badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
          title: `Nhóm ${teamDisplayName} đang kiện toàn nhân sự`,
          desc: `Hiện có ${team?.members.length ?? 0}/${maxTeamSize} thành viên. Quy chế yêu cầu từ ${minTeamSize} đến ${maxTeamSize} thành viên ${projectModeLabel}. Hãy hoàn thiện đội hình và kiểm tra điều kiện để mở cổng đăng ký đề tài.`,
          icon: 'diversity_3',
          iconBg: 'bg-amber-500 text-white',
          ctaText: 'Kiểm tra điều kiện nhóm',
          ctaRoute: '/team',
          ctaIcon: 'checklist',
        }
      case 'TEAM_ELIGIBLE':
        return {
          badge: 'Giai đoạn 3: Soạn thảo Đề cương',
          badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          title: 'Nhóm đã đủ điều kiện để đăng ký đề cương',
          desc: `Nhóm ${teamDisplayName} đã đạt chuẩn nhân sự ${projectModeLabel}. Bạn có thể tham khảo danh mục đề tài gợi ý từ Khoa hoặc trực tiếp soạn thảo đề cương mới.`,
          icon: 'assignment_turned_in',
          iconBg: 'bg-emerald-600 text-white',
          ctaText: 'Đăng ký đề cương',
          ctaRoute: '/project/register',
          ctaIcon: 'edit_document',
          secondaryText: 'Xem đề tài tham khảo',
          secondaryRoute: '/topics',
        }
      case 'PROJECT_PENDING':
        return {
          badge: 'Giai đoạn 4: Khoa thẩm định',
          badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
          title: 'Đề cương đang được khoa xét duyệt',
          desc: `Đề tài "${project?.title ?? 'Đang tải...'}" (Mã: ${project?.code ?? 'CP...'}) đã được nộp thành công lên Bộ môn. Vui lòng theo dõi thông báo và trạng thái thẩm định.`,
          icon: 'hourglass_top',
          iconBg: 'bg-amber-600 text-white',
          ctaText: 'Xem tiến trình thẩm định',
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
          desc: 'Xem kết quả và toàn bộ lịch sử thẩm định của đề cương. Bạn có thể theo dõi nhận xét tại đây.',
          icon: 'assignment_late',
          iconBg: 'bg-rose-600 text-white',
          ctaText: 'Xem kết quả thẩm định',
          ctaRoute: '/project/status',
          ctaIcon: 'visibility',
        }
      case 'SUPERVISOR_PENDING':
        return {
          badge: 'Giai đoạn 5: Ghép cặp GVHD',
          badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          title: 'Đề cương đã được duyệt! Hãy chọn Giảng viên Hướng dẫn',
          desc: `Đề tài của nhóm ${teamDisplayName} đã thông qua vòng thẩm định của Bộ môn. Bước tiếp theo là gửi yêu cầu tới giảng viên có chuyên môn phù hợp.`,
          icon: 'school',
          iconBg: 'bg-[#0f5b4e] text-white',
          ctaText: 'Chọn giảng viên hướng dẫn',
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
          iconBg: 'bg-[#0f5b4e] text-white',
          ctaText: 'Xem mốc và công việc',
          ctaRoute: '/project/milestones/M3',
          ctaIcon: 'view_kanban',
          secondaryText: 'Lịch thực hiện',
          secondaryRoute: '/project/gantt',
        }
    }
  }

  const config = getJourneyConfig()

  return (
    <section className="flex flex-col justify-between gap-6 workspace-surface p-6 md:flex-row md:items-center">
      <div className="flex items-start gap-4 min-w-0 max-w-3xl">
        <div className={`w-12 h-12 rounded-2xl ${config.iconBg} flex items-center justify-center font-bold text-xl shrink-0 shadow-sm mt-0.5`}>
          <span className="material-symbols-outlined text-[26px]">{config.icon}</span>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${config.badgeClass}`}>
              {config.badge}
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              SV: {profile?.fullName ?? 'Sinh viên'}{profile?.studentCode ? ` (${profile.studentCode})` : (profile?.id ? ` (ID #${profile.id})` : '')}
            </span>
          </div>
          <h2 className="text-lg font-bold tracking-tight text-slate-950">{config.title}</h2>
          <p className="text-xs text-slate-600 leading-relaxed">{config.desc}</p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
        {config.secondaryText && config.secondaryRoute && (
          <button
            type="button"
            onClick={() => navigate(config.secondaryRoute!)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:border-[#0f5b4e]/30 hover:bg-[#edf3f0]"
          >
            {config.secondaryText}
          </button>
        )}
        <button
          type="button"
          onClick={() => error ? void refreshAll() : navigate(config.ctaRoute)}
          className="flex items-center gap-1.5 rounded-lg bg-[#0f5b4e] px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#0a493f]"
        >
          <span className="material-symbols-outlined text-[18px]">{config.ctaIcon}</span>
          {config.ctaText}
        </button>
      </div>
    </section>
  )
}

