import type * as api from '../../../services/api/evaluations.api'
import type { EvaluationDraft, EvaluationScore } from '../evaluation-types'

export type FieldValues = Record<number, { score: string; comments: string }>

export function valuesFor(draft: EvaluationDraft): FieldValues {
  return Object.fromEntries(draft.scores.map((criterion) => [criterion.rubricCriterionId, {
    score: criterion.score === null ? '' : String(criterion.score),
    comments: criterion.comments ?? '',
  }]))
}

export function scoreGroups(scores: EvaluationScore[]) {
  const groups: Array<{ key: string; parentId: number | null; parentName: string | null; scores: EvaluationScore[] }> = []
  const byParent = new Map<number, (typeof groups)[number]>()
  for (const score of [...scores].sort((a, b) => a.sortOrder - b.sortOrder)) {
    if (score.parentId == null) {
      groups.push({ key: `leaf-${score.rubricCriterionId}`, parentId: null, parentName: null, scores: [score] })
      continue
    }
    let group = byParent.get(score.parentId)
    if (!group) {
      group = { key: `parent-${score.parentId}`, parentId: score.parentId, parentName: score.parentName ?? null, scores: [] }
      byParent.set(score.parentId, group)
      groups.push(group)
    }
    group.scores.push(score)
  }
  return groups
}

export function scopeDescription(scope: string, majorName: string | null | undefined, studentName: string | null | undefined): string {
  if (scope === 'COMMON') return 'Thành phần chung của đồ án; không thể chuyển sang ngành hoặc sinh viên khác.'
  if (scope === 'MAJOR_SPECIFIC') return `Ngành: ${majorName ?? 'Chưa tải được tên ngành'}; không thể đổi ngành trong giao diện.`
  if (scope === 'INDIVIDUAL') return `Sinh viên: ${studentName ?? 'Chưa tải được tên sinh viên'}; không thể đổi người được đánh giá.`
  return 'Phạm vi phân công chưa hợp lệ; không có thao tác chấm điểm.'
}

export function computeLivePreviewScore(draft: EvaluationDraft | null, values: FieldValues): number | null {
  if (!draft || draft.scores.length === 0) return null
  let weightedSum = 0
  let totalWeight = 0
  let allFilled = true
  for (const c of draft.scores) {
    const raw = values[c.rubricCriterionId]?.score.trim() ?? ''
    const weight = c.effectiveWeightPercent ?? c.weightPercent
    totalWeight += weight
    if (raw === '') { allFilled = false; continue }
    const n = Number(raw)
    if (!Number.isFinite(n) || n < 0 || n > c.maxScore) return null
    weightedSum += (n / c.maxScore) * weight
  }
  if (!allFilled || totalWeight <= 0) return null
  return Math.round(((weightedSum * (draft.scoreScale || 10)) / totalWeight) * 100) / 100
}

export function collectBatchDraftTargets(workbench: api.ProjectScoringWorkbench | null) {
  if (!workbench) return []
  const allSummaries = [
    ...workbench.projectLevelAssignments,
    ...workbench.roster.flatMap(m => m.assignments),
  ]
  const seen = new Set<number>()
  return allSummaries.filter(a => {
    if (!a.evaluationId || !a.evaluationConcurrencyToken || a.status !== 'DRAFT' || seen.has(a.evaluationId)) return false
    seen.add(a.evaluationId)
    return true
  })
}
