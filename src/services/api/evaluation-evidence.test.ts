import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadEvaluationEvidenceFile, evaluationEvidenceFiles, type EvaluationAssignmentEvidence } from './evaluations.api'
vi.mock('../../app/config/env', () => ({ env: { apiBaseUrl: '/api/v1' } }))
afterEach(() => vi.unstubAllGlobals())
describe('assignment evidence wire contract', () => {
  it('adapts wire items using fileId and keeps the locked version metadata', () => {
    const evidence = { items: [
      { id: 900, fileId: 41, fileName: 'locked.pdf', contentType: 'application/pdf', fileSizeBytes: 2048, title: 'COLD', deliverableVersionId: 70, versionNumber: 2, sha256: 'abc', coldSubmissionId: 12 },
      { id: 901, fileId: null, title: 'Metadata only' },
    ] } as EvaluationAssignmentEvidence
    expect(evaluationEvidenceFiles(evidence)).toEqual([{ evidenceItemId: 900, id: 41, fileName: 'locked.pdf', contentType: 'application/pdf', sizeBytes: 2048, reportType: 'COLD', deliverableVersionId: 70, versionNumber: 2, sha256: 'abc', coldSubmissionId: 12 }])
    expect(evaluationEvidenceFiles(null)).toEqual([])
  })
  it('downloads through the assignment boundary without the nonexistent download suffix', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('pdf'))
    vi.stubGlobal('fetch', fetch)
    await downloadEvaluationEvidenceFile(9, 41)
    expect(fetch.mock.calls[0][0]).toBe('/api/v1/evaluation-assignments/9/evidence/files/41')
  })
})
