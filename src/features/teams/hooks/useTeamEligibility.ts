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
  TOO_FEW_MEMBERS: { title: 'Chưa đủ thành viên', detail: 'Nhóm cần thêm thành viên đủ điều kiện trước khi đăng ký.', recovery: 'Mời thêm thành viên phù hợp.' },
  TOO_MANY_MEMBERS: { title: 'Vượt sĩ số tối đa', detail: 'Số thành viên vượt giới hạn của đợt đăng ký.', recovery: 'Trưởng nhóm cần điều chỉnh danh sách thành viên.' },
  EXACTLY_ONE_LEADER_REQUIRED: { title: 'Cần đúng một trưởng nhóm', detail: 'Danh sách hiện tại chưa có duy nhất một trưởng nhóm.', recovery: 'Kiểm tra lại vai trò của các thành viên.' },
  INELIGIBLE_MEMBER: { title: 'Có thành viên chưa đủ điều kiện học vụ', detail: 'Một hoặc nhiều thành viên chưa có hồ sơ học vụ hợp lệ.', recovery: 'Liên hệ bộ môn để kiểm tra hồ sơ hoặc điều chỉnh danh sách thành viên.' },
  TEAM_MUST_BE_SINGLE_MAJOR: { title: 'Thành viên chưa phù hợp với đồ án đơn ngành', detail: 'Các thành viên cần thuộc cùng chuyên ngành đăng ký.', recovery: 'Kiểm tra thành viên và hình thức đồ án đã chọn.' },
  MEMBER_MAJOR_NOT_ALLOWED: { title: 'Có thành viên thuộc ngành chưa được đăng ký', detail: 'Ngành của thành viên nằm ngoài các ngành tham gia đồ án.', recovery: 'Kiểm tra lại danh sách thành viên và phạm vi ngành.' },
  REGISTRATION_WINDOW_UNAVAILABLE: { title: 'Đợt đăng ký chưa mở', detail: 'Hiện chưa có đợt đăng ký phù hợp.', recovery: 'Chờ đợt đăng ký mở hoặc liên hệ bộ môn.' },
  TEAM_POLICY_UNCONFIGURED: { title: 'Chưa có quy định đăng ký', detail: 'Đợt đăng ký chưa được cấu hình đầy đủ.', recovery: 'Liên hệ bộ môn để được hỗ trợ.' },
  TEAM_POLICY_INVALID: { title: 'Cần kiểm tra quy định đăng ký', detail: 'Quy định hiện tại chưa hợp lệ.', recovery: 'Liên hệ bộ môn để điều chỉnh.' },
  ROSTER_LOCKED: { title: 'Danh sách thành viên đã được chốt', detail: 'Không thể thay đổi thành viên ở trạng thái đồ án hiện tại.', recovery: 'Liên hệ bộ môn nếu cần hỗ trợ.' },
  UNSUPPORTED_HYBRID_POLICY: { title: 'Hình thức đồ án chưa phù hợp', detail: 'Các ngành tham gia chưa phù hợp với quy định của đợt đăng ký.', recovery: 'Kiểm tra hình thức đồ án và các ngành tham gia.' },
  INVALID_PROJECT_MODE: { title: 'Hình thức đồ án chưa hợp lệ', detail: 'Cần chọn hình thức đơn ngành hoặc liên ngành phù hợp.', recovery: 'Trưởng nhóm kiểm tra lại cấu hình ngành.' },
  LEAD_DEPARTMENT_REQUIRED: { title: 'Thiếu bộ môn chủ trì', detail: 'Nhóm chưa có bộ môn chủ trì hợp lệ.', recovery: 'Trưởng nhóm kiểm tra lại cấu hình ngành.' },
  MAJOR_REQUIREMENTS_INVALID: { title: 'Các ngành tham gia chưa hợp lệ', detail: 'Cần kiểm tra lại các ngành đã đăng ký cho đồ án.', recovery: 'Trưởng nhóm kiểm tra lại cấu hình ngành.' },
  MAJOR_QUOTA_INVALID: { title: 'Giới hạn thành viên theo ngành chưa hợp lệ', detail: 'Số thành viên tối thiểu hoặc tối đa theo ngành chưa phù hợp.', recovery: 'Trưởng nhóm kiểm tra lại cấu hình ngành.' },
  MAJOR_QUOTAS_INFEASIBLE: { title: 'Giới hạn thành viên theo ngành chưa phù hợp', detail: 'Tổng số thành viên theo ngành chưa khớp với quy định của đợt đăng ký.', recovery: 'Kiểm tra cấu hình ngành hoặc liên hệ bộ môn.' },
  PRIMARY_MAJOR_REQUIRED: { title: 'Thiếu ngành đăng ký', detail: 'Đồ án đơn ngành cần xác định chuyên ngành tham gia.', recovery: 'Trưởng nhóm kiểm tra lại cấu hình ngành.' },
  INTERDISCIPLINARY_MAJORS_REQUIRED: { title: 'Chưa đủ ngành tham gia', detail: 'Đồ án liên ngành cần đủ số ngành theo quy định.', recovery: 'Trưởng nhóm kiểm tra lại cấu hình ngành.' },
}

function issueView(code: string): EligibilityIssueView {
  const matched = /^(MAJOR_MIN_MEMBERS|MAJOR_MAX_MEMBERS):(\d+)$/.exec(code)
  if (matched) {
    const majorId = Number(matched[2])
    const isMinimum = matched[1] === 'MAJOR_MIN_MEMBERS'
    return {
      code,
      majorId,
      title: isMinimum ? 'Một ngành chưa đủ thành viên' : 'Một ngành vượt sĩ số cho phép',
      detail: isMinimum ? 'Số thành viên của ngành chưa đạt mức tối thiểu.' : 'Số thành viên của ngành vượt mức tối đa.',
      recovery: 'Đối chiếu yêu cầu theo ngành bên dưới và điều chỉnh thành viên.',
    }
  }
  const known = issueContent[code]
  return known ? { code, ...known } : {
    code,
    title: 'Có điều kiện đăng ký chưa đạt',
    detail: 'Nhóm chưa đáp ứng đầy đủ điều kiện đăng ký hiện tại.',
    recovery: 'Kiểm tra lại thông tin hoặc liên hệ bộ môn để được hỗ trợ.',
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
