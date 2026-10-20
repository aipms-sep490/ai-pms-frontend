import type { ReviewGateTemplate } from '../types/review-gates.types'

/** The BE accepts a write DTO, not client draft IDs or display-only fields. */
export function toTemplateRequest(template: ReviewGateTemplate) {
  return {
    projectPeriodId: template.projectPeriodId ?? null,
    code: template.code,
    name: template.name,
    mode: template.mode,
    major: template.major,
    version: template.version,
    concurrencyToken: template.concurrencyToken || null,
    gates: template.gates.map((gate, index) => ({
      code: gate.code,
      sequence: index + 1,
      title: gate.title,
      objective: gate.objective,
      required: gate.required,
      blockNextGate: gate.blockNextGate,
      blocksDefense: gate.blocksDefense ?? false,
      start: gate.start || null,
      end: gate.end || null,
      reviewerPolicy: gate.reviewerPolicy,
      reviewScope: gate.reviewScope,
      requirements: gate.requirements.map((requirement) => {
        if (!requirement.code?.trim()) throw new Error('Vui lòng nhập mã yêu cầu minh chứng trước khi lưu.')
        if (!['COMMON', 'MAJOR_SPECIFIC', 'INDIVIDUAL'].includes(requirement.scope)) {
          throw new Error('Vui lòng chọn phạm vi COMMON, MAJOR_SPECIFIC hoặc INDIVIDUAL và mã ngành tương ứng.')
        }
        return {
          code: requirement.code.trim(), title: requirement.title, description: requirement.description ?? null,
          type: requirement.type, scope: requirement.scope,
          majorId: requirement.majorId ?? null, targetStudentId: requirement.targetStudentId ?? null,
          verification: requirement.verification, required: requirement.required,
        }
      }),
    })),
  }
}

export function requireGateToken(token?: string): string {
  if (!token) throw new Error('Vui lòng tải lại dữ liệu để lấy phiên bản Review Gate mới nhất.')
  return token
}
