import { useMemo } from 'react'
import type { MajorRequirementDto, TeamDto } from '../../../types/backend'

export type EligibilityStatus = 'PASS' | 'FAIL'

export interface EligibilityIssueView {
  code: string
  title: string
  detail: string
  recovery: string
  majorId?: number
}

const issueContent: Record<string, Omit<EligibilityIssueView, 'code' | 'majorId'>> = {
  TOO_FEW_MEMBERS: { title: 'Chưa đủ thành viên', detail: 'Backend yêu cầu nhóm có thêm thành viên hợp lệ trước khi đăng ký.', recovery: 'Mời thêm ứng viên phù hợp nếu backend còn cho phép.' },
  TOO_MANY_MEMBERS: { title: 'Vượt sĩ số tối đa', detail: 'Backend báo roster hiện vượt chính sách của đợt đăng ký.', recovery: 'Trưởng nhóm có thể xóa thành viên nếu action backend cho phép.' },
  EXACTLY_ONE_LEADER_REQUIRED: { title: 'Cần đúng một Trưởng nhóm', detail: 'Backend không xác nhận roster có duy nhất một Trưởng nhóm.', recovery: 'Kiểm tra hoặc chuyển quyền Trưởng nhóm theo action backend.' },
  INELIGIBLE_MEMBER: { title: 'Có thành viên chưa có hồ sơ học vụ hợp lệ', detail: 'Backend không xác nhận tư cách học vụ hoặc tổ chức của một thành viên.', recovery: 'Không thể sửa Major đã xác thực trên màn hình này; điều chỉnh roster hoặc liên hệ bộ môn.' },
  TEAM_MUST_BE_SINGLE_MAJOR: { title: 'Roster không phù hợp chế độ đơn ngành', detail: 'Backend yêu cầu các thành viên hợp lệ thuộc cùng Major đã xác thực.', recovery: 'Điều chỉnh roster hoặc cấu hình phạm vi ngành nếu backend cho phép.' },
  MEMBER_MAJOR_NOT_ALLOWED: { title: 'Có Major ngoài phạm vi nhóm', detail: 'Backend phát hiện Major đã xác thực của thành viên không thuộc MajorRequirements.', recovery: 'Điều chỉnh roster hoặc phạm vi ngành; không chỉnh Major thành viên trong trình duyệt.' },
  REGISTRATION_WINDOW_UNAVAILABLE: { title: 'Đợt đăng ký chưa khả dụng', detail: 'Backend không tìm thấy cửa sổ đăng ký hợp lệ tại thời điểm kiểm tra.', recovery: 'Chờ đợt đăng ký mở hoặc liên hệ bộ môn.' },
  TEAM_POLICY_UNCONFIGURED: { title: 'Chính sách formation chưa được cấu hình', detail: 'Backend chưa có chính sách eligibility hợp lệ cho đợt đăng ký.', recovery: 'Đây là cấu hình học vụ, sinh viên không thể tự sửa.' },
  TEAM_POLICY_INVALID: { title: 'Chính sách formation không hợp lệ', detail: 'Backend đánh dấu chính sách eligibility hiện tại không hợp lệ.', recovery: 'Liên hệ bộ môn để điều chỉnh chính sách.' },
  ROSTER_LOCKED: { title: 'Roster đã bị khóa', detail: 'Backend không cho phép thay đổi roster ở trạng thái dự án hiện tại.', recovery: 'Xem lifecycle dự án hoặc liên hệ bộ môn nếu cần hỗ trợ.' },
  UNSUPPORTED_HYBRID_POLICY: { title: 'Hybrid policy chưa được backend hỗ trợ', detail: 'Team không có academic scope phù hợp với chính sách liên ngành hiện tại.', recovery: 'Cấu hình academic scope hợp lệ theo action backend.' },
  INVALID_PROJECT_MODE: { title: 'Project mode không hợp lệ', detail: 'Backend không nhận diện chế độ academic scope hiện tại.', recovery: 'Trưởng nhóm cần kiểm tra lại academic scope.' },
  LEAD_DEPARTMENT_REQUIRED: { title: 'Thiếu bộ môn chủ trì', detail: 'Academic scope chưa có Lead Department hợp lệ.', recovery: 'Trưởng nhóm cần kiểm tra lại academic scope.' },
  MAJOR_REQUIREMENTS_INVALID: { title: 'Major requirements không hợp lệ', detail: 'Backend không chấp nhận danh sách MajorRequirements hiện tại.', recovery: 'Trưởng nhóm cần kiểm tra lại academic scope.' },
  MAJOR_QUOTA_INVALID: { title: 'Major quota không hợp lệ', detail: 'Backend không chấp nhận min/max quota của scope.', recovery: 'Trưởng nhóm cần kiểm tra lại academic scope.' },
  MAJOR_QUOTAS_INFEASIBLE: { title: 'Major quota không khả thi', detail: 'Tổng quota không tương thích chính sách formation của backend.', recovery: 'Đây là cấu hình scope; không thể sửa bằng roster đơn thuần.' },
  PRIMARY_MAJOR_REQUIRED: { title: 'Thiếu Primary Major', detail: 'SINGLE_MAJOR cần Primary Major đúng với requirement được backend xác nhận.', recovery: 'Trưởng nhóm cần kiểm tra lại academic scope.' },
  INTERDISCIPLINARY_MAJORS_REQUIRED: { title: 'Thiếu MajorRequirements liên ngành', detail: 'INTERDISCIPLINARY cần đủ major requirements theo chính sách backend.', recovery: 'Trưởng nhóm cần kiểm tra lại academic scope.' },
}

function issueView(code: string): EligibilityIssueView {
  const matched = /^(MAJOR_MIN_MEMBERS|MAJOR_MAX_MEMBERS):(\d+)$/.exec(code)
  if (matched) {
    const majorId = Number(matched[2])
    const isMinimum = matched[1] === 'MAJOR_MIN_MEMBERS'
    return {
      code,
      majorId,
      title: isMinimum ? 'Chưa đạt quota Major' : 'Vượt quota Major',
      detail: `Backend đánh dấu Major #${majorId} ${isMinimum ? 'chưa đạt số thành viên tối thiểu' : 'vượt số thành viên tối đa'}.`,
      recovery: isMinimum ? 'Mời thành viên có Major đã xác thực phù hợp nếu backend cho phép.' : 'Điều chỉnh roster nếu backend cho phép.',
    }
  }
  const known = issueContent[code]
  return known ? { code, ...known } : {
    code,
    title: 'Backend báo một điều kiện chưa đạt',
    detail: `Mã điều kiện từ backend: ${code}.`,
    recovery: 'Tải lại dữ liệu hoặc liên hệ bộ môn nếu mã này tiếp tục xuất hiện.',
  }
}

function requirementStatus(requirement: MajorRequirementDto, issues: readonly string[]) {
  const minCode = `MAJOR_MIN_MEMBERS:${requirement.majorId}`
  const maxCode = `MAJOR_MAX_MEMBERS:${requirement.majorId}`
  if (issues.includes(minCode) || issues.includes(maxCode)) return 'FAIL' as const
  return 'NO_BACKEND_VIOLATION' as const
}

/** Presentation-only adapter for the eligibility facts already returned inside TeamDto. */
export function useTeamEligibility(team: TeamDto | null) {
  return useMemo(() => {
    if (!team) return null
    const issues = team.eligibility.reasons.map(issueView)
    const requirements = (team.academicScope?.requirements ?? []).map((requirement) => ({
      ...requirement,
      status: requirementStatus(requirement, team.eligibility.reasons),
    }))
    return {
      status: (team.eligibility.canRegister ? 'PASS' : 'FAIL') as EligibilityStatus,
      policyVersion: team.eligibility.policyVersion ?? null,
      registrationPeriodId: team.eligibility.registrationPeriodId ?? null,
      mode: team.academicScope?.projectMode ?? 'SINGLE_MAJOR',
      primaryMajorId: team.academicScope?.primaryMajorId ?? null,
      requirements,
      issues,
      members: team.members,
      rosterLocked: team.eligibility.rosterLocked,
    }
  }, [team])
}
