export type ReadinessSeverity = 'blocked' | 'warning'

export interface ReadinessItem {
  code: string
  label: string
  severity: ReadinessSeverity
}

const reasonLabels: Record<string, string> = {
  PROPOSAL_FIELDS_REQUIRED: 'Điền đầy đủ mô tả, bối cảnh, mục tiêu và sản phẩm kỳ vọng.',
  PROPOSAL_TAGS_REQUIRED: 'Điền lĩnh vực, công nghệ và từ khóa cho đề tài.',
  PROJECT_MAJOR_SCOPE_MISMATCH: 'Ngành đăng ký chưa khớp với phạm vi học thuật của nhóm.',
  SUPERVISOR_NOT_CONFIRMED: 'Chưa có giảng viên hướng dẫn chính xác nhận lời mời.',
  SUPERVISOR_CAPACITY_FULL: 'Giảng viên vừa chọn đã đủ số lượng hướng dẫn. Hãy chọn giảng viên khác.',
  DUPLICATE_TOPIC_TITLE: 'Tên đề tài trùng với đề tài đã có trong 3 kỳ gần nhất.',
}

const proposalFieldLabels: Record<string, string> = {
  problemStatement: 'Bối cảnh / vấn đề cần giải quyết',
  objectives: 'Mục tiêu đề tài',
  expectedOutput: 'Sản phẩm kỳ vọng',
  domain: 'Lĩnh vực',
  technologies: 'Công nghệ',
  keywords: 'Từ khóa',
}

/**
 * Some reason codes carry a dynamic suffix (`MENTOR_NOT_CONFIRMED:<majorId>`,
 * `PROPOSAL_CONTENT_INCOMPLETE:<field>`) — resolve those before falling back
 * to the static label table, and finally to the raw code so an unmapped
 * future reason still renders something readable instead of disappearing.
 */
export function describeReadinessReason(code: string, resolveMajorName?: (majorId: number) => string | undefined): ReadinessItem {
  const [prefix, suffix] = code.split(':')

  if (prefix === 'MENTOR_NOT_CONFIRMED' && suffix) {
    const majorId = Number(suffix)
    const majorName = resolveMajorName?.(majorId) ?? `#${majorId}`
    return { code, severity: 'blocked', label: `Chưa có Mentor xác nhận cho ngành ${majorName}.` }
  }
  if (prefix === 'PROPOSAL_CONTENT_INCOMPLETE' && suffix) {
    return { code, severity: 'blocked', label: `Thiếu nội dung: ${proposalFieldLabels[suffix] ?? suffix}.` }
  }
  return { code, severity: 'blocked', label: reasonLabels[code] ?? `Điều kiện chưa đáp ứng (${code}).` }
}

export function buildReadinessChecklist(reasons: string[], resolveMajorName?: (majorId: number) => string | undefined): ReadinessItem[] {
  return reasons.map((code) => describeReadinessReason(code, resolveMajorName))
}

export interface ProposalContentDraft {
  problemStatement: string
  objectives: string
  expectedOutput: string
  domain: string
  technologies: string
  keywords: string
}

/**
 * Client-side mirror of the backend's `TopicRules.ProposalCompletenessIssues` (BE only
 * runs this check against the saved Project, on submit). Letting the student see the
 * same `PROPOSAL_CONTENT_INCOMPLETE:<field>` codes while still typing — before they save
 * a draft and round-trip to the backend — catches the gap sooner, but BE stays the only
 * enforcer; this never blocks typing or saving, only informs.
 */
export function proposalContentIssues(draft: ProposalContentDraft): string[] {
  const issues: string[] = []
  if (!draft.problemStatement.trim()) issues.push('PROPOSAL_CONTENT_INCOMPLETE:problemStatement')
  if (!draft.objectives.trim()) issues.push('PROPOSAL_CONTENT_INCOMPLETE:objectives')
  if (!draft.expectedOutput.trim()) issues.push('PROPOSAL_CONTENT_INCOMPLETE:expectedOutput')
  if (!draft.domain.trim()) issues.push('PROPOSAL_CONTENT_INCOMPLETE:domain')
  if (!draft.technologies.trim()) issues.push('PROPOSAL_CONTENT_INCOMPLETE:technologies')
  if (!draft.keywords.trim()) issues.push('PROPOSAL_CONTENT_INCOMPLETE:keywords')
  return issues
}
