import type { ReviewGate, ReviewGateTemplate } from '../types/review-gates.types'

export function gateWeightTotal(gates: readonly ReviewGate[]): string {
  const decimals = gates.map(gate => gate.weight ?? 0).filter(Number.isFinite).map(value => {
    const [coefficient, exponent = '0'] = String(value).split('e')
    const [whole, fraction = ''] = coefficient.split('.')
    return { units: BigInt(whole + fraction), scale: fraction.length - Number(exponent) }
  })
  const scale = Math.max(0, ...decimals.map(value => value.scale))
  const total = decimals.reduce((sum, value) => sum + value.units * 10n ** BigInt(scale - value.scale), 0n)
  const digits = (total < 0n ? -total : total).toString().padStart(scale + 1, '0')
  return `${total < 0n ? '-' : ''}${scale ? `${digits.slice(0, -scale)}.${digits.slice(-scale)}`.replace(/\.?0+$/, '') : digits}`
}

export function validateGateWeights(gates: readonly ReviewGate[]): string | null {
  if (gates.every(gate => gate.weight == null)) return null
  const total = gateWeightTotal(gates)
  if (gates.some(gate => gate.weight == null || !Number.isFinite(gate.weight) || gate.weight < 0 || gate.weight > 100) || total !== '100') {
    return `Nhập trọng số cho tất cả cổng (mỗi cổng từ 0–100%, tổng đúng 100%) hoặc để trống tất cả. Tổng hiện tại: ${total}%.`
  }
  return null
}

/** The BE accepts a write DTO, not client draft IDs or display-only fields. */
export function toTemplateRequest(template: ReviewGateTemplate) {
  const weightsError = validateGateWeights(template.gates)
  if (weightsError) throw new Error(weightsError)
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
      weight: gate.weight ?? null,
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
