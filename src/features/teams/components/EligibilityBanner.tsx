import { useState } from 'react'
import type { TeamEligibilityDto } from '../../../types/backend'

interface EligibilityBannerProps {
  eligibility?: TeamEligibilityDto | null
  onRefresh: () => Promise<void>
}

const REASON_MESSAGES: Record<string, { title: string; hint: string }> = {
  TOO_FEW_MEMBERS: {
    title: 'Chưa đủ số lượng thành viên tối thiểu',
    hint: 'Nhóm cần tối thiểu 4 thành viên chính thức để được phép nộp đề tài.',
  },
  TOO_MANY_MEMBERS: {
    title: 'Vượt quá số lượng thành viên cho phép',
    hint: 'Nhóm không được vượt quá 5 thành viên theo quy chế của Khoa.',
  },
  EXACTLY_ONE_LEADER_REQUIRED: {
    title: 'Cần duy nhất 1 Trưởng nhóm',
    hint: 'Vui lòng chỉ định một thành viên làm Trưởng nhóm điều phối.',
  },
  TEAM_MUST_BE_SINGLE_MAJOR: {
    title: 'Vi phạm quy chế chuyên ngành đơn ngành',
    hint: 'Theo chính sách hiện hành của đợt này, toàn bộ thành viên nhóm phải thuộc cùng chuyên ngành.',
  },
  INELIGIBLE_MEMBER: {
    title: 'Có thành viên chưa đủ điều kiện làm đồ án',
    hint: 'Vui lòng kiểm tra lại điều kiện tín chỉ hoặc trạng thái học vụ của các thành viên.',
  },
  REGISTRATION_WINDOW_UNAVAILABLE: {
    title: 'Đợt đăng ký đồ án hiện chưa mở',
    hint: 'Vui lòng quay lại trong khung thời gian đăng ký đồ án quy định.',
  },
  TEAM_POLICY_UNCONFIGURED: {
    title: 'Chính sách nhóm chưa được thiết lập',
    hint: 'Liên hệ Giáo vụ Khoa để kiểm tra cấu hình chính sách đợt đồ án.',
  },
  ROSTER_LOCKED: {
    title: 'Danh sách thành viên đã bị khóa',
    hint: 'Nhóm đã nộp đề tài hoặc đang trong giai đoạn thẩm định nên không thể thay đổi thành viên.',
  },
}

export function EligibilityBanner({ eligibility, onRefresh }: EligibilityBannerProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
    }
  }

  const canRegister = eligibility?.canRegister ?? false
  const reasons = eligibility?.reasons ?? []

  if (canRegister) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">verified</span>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-emerald-900">
              Nhóm đủ điều kiện đăng ký đề tài (Eligibility Passed)
            </h4>
            <p className="text-xs text-emerald-700">
              Các tiêu chuẩn về sĩ số, cơ cấu chuyên ngành và tư cách thành viên đều đạt yêu cầu.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-[16px] ${isRefreshing ? 'animate-spin' : ''}`}>
            refresh
          </span>
          {isRefreshing ? 'Đang kiểm tra...' : 'Kiểm tra lại'}
        </button>
      </div>
    )
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">warning</span>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-amber-900">
              Nhóm chưa đủ điều kiện đăng ký đề tài ({reasons.length} tiêu chí chưa đạt)
            </h4>
            <p className="text-xs text-amber-700">
              Cần khắc phục các vấn đề bên dưới trước khi Trưởng nhóm có thể nộp đề cương sơ bộ.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 shrink-0"
        >
          <span className={`material-symbols-outlined text-[16px] ${isRefreshing ? 'animate-spin' : ''}`}>
            refresh
          </span>
          {isRefreshing ? 'Đang thẩm định...' : 'Thẩm định lại'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
        {reasons.map((reason) => {
          const info = REASON_MESSAGES[reason] ?? {
            title: reason,
            hint: 'Vui lòng kiểm tra lại cấu hình và thông tin nhóm.',
          }
          return (
            <div
              key={reason}
              className="bg-white/70 border border-amber-200/80 rounded-lg p-2.5 flex items-start gap-2"
            >
              <span className="material-symbols-outlined text-amber-600 text-[18px] mt-0.5 shrink-0">
                error_outline
              </span>
              <div>
                <p className="text-xs font-semibold text-amber-950">{info.title}</p>
                <p className="text-[11px] text-amber-800/90 leading-relaxed">{info.hint}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
