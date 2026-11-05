import { describe, expect, it } from 'vitest'
import type { CriterionInput } from './rubrics-api'
import { rubricWeightGroupIssues, weightGroupIssueLabel } from './rubric-weight-groups'

const leaf = (name: string, weightPercent: number, sortOrder: number): CriterionInput => ({
  name, description: null, weightPercent, sortOrder, maxScore: 10, isRequired: true, children: [],
})
const parent = (name: string, weightPercent: number, sortOrder: number, children: CriterionInput[]): CriterionInput => ({
  name, description: null, weightPercent, sortOrder, maxScore: null, isRequired: false, children,
})

describe('rubric sibling weight groups', () => {
  it('reports every invalid group in a three-level tree by parent path', () => {
    const tree = [
      parent('Tích hợp', 50, 0, [parent('Kiến trúc', 60, 0, [leaf('API', 55, 0), leaf('CSDL', 35, 1)]), leaf('Đầu ra', 30, 1)]),
      parent('Trình bày', 40, 1, [leaf('Rõ ràng', 110, 0)]),
    ]
    const issues = rubricWeightGroupIssues(tree)
    expect(issues.map(issue => issue.parentPath)).toEqual([[], [0], [0, 0], [1]])
    expect(issues.map(weightGroupIssueLabel)).toEqual([
      'Nhóm tiêu chí chính: 90.00% — còn thiếu 10.00%',
      'Nhóm con của Tích hợp: 90.00% — còn thiếu 10.00%',
      'Nhóm con của Kiến trúc: 90.00% — còn thiếu 10.00%',
      'Nhóm con của Trình bày: 110.00% — đang vượt 10.00%',
    ])
  })

  it('detects duplicate order inside one sibling group even when its weight is 100', () => {
    const issues = rubricWeightGroupIssues([parent('Chất lượng', 100, 0, [leaf('A', 50, 0), leaf('B', 50, 0)])])
    expect(issues).toHaveLength(1)
    expect(issues[0].parentPath).toEqual([0])
    expect(weightGroupIssueLabel(issues[0])).toContain('có hai tiêu chí cùng thứ tự')
  })

  it('accepts each sibling group within the existing 0.01 tolerance', () => {
    expect(rubricWeightGroupIssues([parent('A', 100, 0, [leaf('A1', 49.995, 0), leaf('A2', 50, 1)])])).toEqual([])
  })
})
