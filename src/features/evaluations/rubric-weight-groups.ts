import type { CriterionInput } from './rubrics-api'

export interface WeightGroupIssue {
  parentPath: number[]
  parentName: string | null
  sum: number
  duplicateSortOrder: boolean
}

/** Editing aid over the sibling groups sent to BE. BE remains scoring authority. */
export function rubricWeightGroupIssues(criteria: CriterionInput[]): WeightGroupIssue[] {
  const issues: WeightGroupIssue[] = []
  const visit = (siblings: CriterionInput[], parentPath: number[], parentName: string | null) => {
    if (!siblings.length) return
    const sum = siblings.reduce((total, item) => total + Number(item.weightPercent), 0)
    const duplicateSortOrder = new Set(siblings.map(item => item.sortOrder)).size !== siblings.length
    if (!Number.isFinite(sum) || Math.abs(sum - 100) >= 0.01 || duplicateSortOrder) {
      issues.push({ parentPath, parentName, sum, duplicateSortOrder })
    }
    siblings.forEach((item, index) => visit(item.children, [...parentPath, index], item.name))
  }
  visit(criteria, [], null)
  return issues
}

export function weightGroupIssueLabel(issue: WeightGroupIssue): string {
  const group = issue.parentName === null ? 'Nhóm tiêu chí chính' : `Nhóm con của ${issue.parentName}`
  const weight = Number.isFinite(issue.sum)
    ? `${issue.sum.toFixed(2)}% — ${issue.sum < 100 ? `còn thiếu ${(100 - issue.sum).toFixed(2)}%` : `đang vượt ${(issue.sum - 100).toFixed(2)}%`}`
    : 'trọng số không hợp lệ'
  return `${group}: ${weight}${issue.duplicateSortOrder ? '; có hai tiêu chí cùng thứ tự' : ''}`
}
