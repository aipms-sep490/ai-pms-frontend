/** Proposed fixture semantics only. These are not backend DTOs or persisted grades. */
export interface PreviewReport { slot: number; name: string; version: number; status: 'DRAFT' | 'SUBMITTED' | 'LOCKED'; type: string }
export interface PreviewCriterion { id: number; name: string; max: number; weight?: number }
export const coldCriteria: PreviewCriterion[] = [
  { id: 1, name: 'Project Introduction', max: 5 }, { id: 2, name: 'Project Management', max: 5 },
  { id: 3, name: 'Software Requirement', max: 15 }, { id: 4, name: 'User Guide', max: 5 },
]
export const weeklyCriteria: PreviewCriterion[] = [
  { id: 1, name: 'Professional Ownership', max: 10, weight: 35 },
  { id: 2, name: 'Defense / Q&A', max: 10, weight: 40 }, { id: 3, name: 'Contribution', max: 10, weight: 25 },
]
export const previewError = (code: string) => new Error(code)
export function uploadReport(reports: PreviewReport[], slot: number, file: Pick<File, 'name' | 'size' | 'type'>, expired: boolean): PreviewReport[] {
  if (expired) throw previewError('SUBMISSION_DEADLINE_PASSED')
  if (!Number.isInteger(slot) || slot < 1 || slot > 7) throw previewError('MAX_FILES_EXCEEDED')
  if (!/\.(pdf|docx|zip)$/i.test(file.name)) throw previewError('FILE_TYPE_NOT_ALLOWED')
  // 10 MiB is a sandbox limit only; the real upload limit must come from policy.
  if (file.size <= 0 || file.size > 10 * 1024 * 1024) throw previewError('FILE_TOO_LARGE')
  const existing = reports.find(item => item.slot === slot)
  if (existing?.status === 'LOCKED') throw previewError('ALREADY_LOCKED')
  const next: PreviewReport = { slot, name: file.name, version: (existing?.version ?? 0) + 1, status: 'DRAFT', type: file.type }
  return [...reports.filter(item => item.slot !== slot), next].sort((a, b) => a.slot - b.slot)
}
export function submitReport(reports: PreviewReport[], slot: number, expired: boolean): PreviewReport[] {
  if (expired) throw previewError('SUBMISSION_DEADLINE_PASSED')
  if (!reports.some(item => item.slot === slot && item.status === 'DRAFT')) throw previewError('DRAFT_REQUIRED')
  return reports.map(item => item.slot === slot ? { ...item, status: 'SUBMITTED' } : item)
}
export function lockReport(reports: PreviewReport[], slot: number): PreviewReport[] {
  if (!reports.some(item => item.slot === slot && item.status === 'SUBMITTED')) throw previewError('SUBMIT_REQUIRED')
  return reports.map(item => item.slot === slot ? { ...item, status: 'LOCKED' } : item)
}
export function finalizeScores(criteria: PreviewCriterion[], values: Record<number, string>): number {
  const scores = criteria.map(criterion => {
    const raw = values[criterion.id]?.trim()
    if (!raw) throw previewError('SCORES_INCOMPLETE')
    const value = Number(raw)
    if (!Number.isFinite(value) || value < 0 || value > criterion.max) throw previewError('SCORE_OUT_OF_RANGE')
    return value
  })
  return scores.reduce((sum, score) => sum + score, 0)
}
export function saveWeekly(values: Record<number, string>, submitted: boolean) {
  let total: number | null = null
  // Validate supplied draft scores as well as complete submissions.
  for (const criterion of weeklyCriteria) {
    const raw = values[criterion.id]?.trim()
    if (raw && (!Number.isFinite(Number(raw)) || Number(raw) < 0 || Number(raw) > criterion.max)) throw previewError('SCORE_OUT_OF_RANGE')
  }
  if (submitted || weeklyCriteria.every(item => values[item.id]?.trim())) {
    finalizeScores(weeklyCriteria, values)
    total = weeklyCriteria.reduce((sum, item) => sum + Number(values[item.id]) * (item.weight ?? 0) / 100, 0)
  }
  return { values: { ...values }, total, status: submitted ? 'SUBMITTED' as const : 'DRAFT' as const }
}
export function approveLeader(request: { targetId: number; status: string }, activeMemberIds: number[]) {
  if (request.status !== 'PENDING') throw previewError('ALREADY_PROCESSED')
  if (!activeMemberIds.includes(request.targetId)) throw previewError('TARGET_NOT_TEAM_MEMBER')
  return request.targetId
}
