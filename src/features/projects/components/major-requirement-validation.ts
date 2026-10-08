import type { MajorRequirementDto } from '../../../types/backend'

export interface MajorRequirementValidation {
  valid: boolean
  issues: string[]
}

export function validateMajorRequirements(
  requirements: readonly MajorRequirementDto[],
  projectMode: string,
): MajorRequirementValidation {
  const issues: string[] = []
  const seen = new Set<number>()

  requirements.forEach((requirement) => {
    if (!Number.isInteger(requirement.majorId) || requirement.majorId <= 0) issues.push('Hãy chọn chuyên ngành hợp lệ cho từng yêu cầu.')
    if (seen.has(requirement.majorId)) issues.push('Mỗi chuyên ngành chỉ được chọn một lần.')
    seen.add(requirement.majorId)
    if (!Number.isInteger(requirement.minMembers) || requirement.minMembers < 1) issues.push('Số thành viên tối thiểu phải từ 1 trở lên.')
    if (!Number.isInteger(requirement.maxMembers) || requirement.maxMembers < requirement.minMembers) issues.push('Số thành viên tối đa không được nhỏ hơn tối thiểu.')
    if (!requirement.responsibility.trim()) issues.push('Hãy ghi phần việc phụ trách cho từng chuyên ngành.')
  })

  if (projectMode === 'INTERDISCIPLINARY' && requirements.length < 2) {
    issues.push('Đồ án liên ngành cần yêu cầu cho ít nhất hai chuyên ngành.')
  }

  return { valid: issues.length === 0, issues: [...new Set(issues)] }
}
