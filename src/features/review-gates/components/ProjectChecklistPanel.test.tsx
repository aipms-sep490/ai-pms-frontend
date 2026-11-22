import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ProjectChecklistPanel } from './ProjectChecklistPanel'
import * as api from '../api/project-checklists-api'

vi.mock('../api/project-checklists-api')

describe('ProjectChecklistPanel', () => {
  it('renders normalized 0-10 score excluding N/A, Review 3 pending consensus, and Master vs Tailored Diff preview', async () => {
    vi.mocked(api.getProjectGateChecklist).mockResolvedValue({
      id: 7,
      projectId: 10,
      gateInstanceId: 3,
      gateCode: 'G3',
      templateId: 1,
      version: 1,
      status: 'DRAFT',
      advisorRecommendation: 'RECOMMEND_DEFENSE',
      reviewerRecommendation: 'PENDING',
      review3ConsensusStatus: 'PENDING_RECOMMENDATIONS',
      concurrencyToken: 'tok',
      scoreSummary: {
        totalApplicableWeight: 2.0,
        earnedWeightedScore: 1.5,
        normalizedScoreOutOf10: 7.5,
        ratingBand: 'Good',
        applicableCount: 2,
        scoredCount: 2,
        naCount: 1,
      },
      items: [
        {
          id: 1,
          itemCode: 'IT-01',
          section: 'Core',
          trackScope: 'IT',
          conditionTag: 'NONE',
          coreQuestion: 'CI/CD and UAT tests pass?',
          priority: 'Mandatory',
          weight: 1.0,
          isApplicable: true,
          tailoredCheckpoints: 'Check Swagger + SQL integration tests',
          tailoredEvidence: 'CI log',
        },
        {
          id: 2,
          itemCode: 'AI-01',
          section: 'AI',
          trackScope: 'IT',
          conditionTag: 'AI',
          coreQuestion: 'Benchmark AI model?',
          priority: 'Conditional',
          weight: 0.5,
          isApplicable: false,
          naReason: 'Project has no AI scope',
        },
      ],
    })
    vi.mocked(api.getChecklistDiffPreview).mockResolvedValue({
      checklistId: 7,
      version: 1,
      status: 'DRAFT',
      totalItems: 2,
      applicableItems: 1,
      naItems: 1,
      tailoredItems: 2,
      entries: [],
    })

    render(<ProjectChecklistPanel projectId={10} gateCode="G3" canTailor />)

    await waitFor(() => expect(screen.getByTestId('checklist-normalized-score').textContent).toContain('7.50/10'))
    expect(screen.getByText(/Chờ đủ xác nhận GVHD & Phản biện/)).toBeTruthy()
    expect(screen.getByText(/N\/A: Project has no AI scope/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Xem Diff Master vs Nhóm' }))
    await waitFor(() => expect(screen.getByTestId('checklist-diff-preview').textContent).toContain('N/A (Conditional): 1'))
  })
})
