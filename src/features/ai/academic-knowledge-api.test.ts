import { afterEach, expect, it, vi } from 'vitest'
import { readAllPages } from '../../services/api/paged-read'
import * as knowledge from './academic-knowledge-api'

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear() })
it('uses the protected knowledge endpoints and preserves server pagination and history', async () => {
  localStorage.setItem('token', 'unit-test-token')
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [], totalCount: 0 })))
  vi.stubGlobal('fetch', fetcher)
  await knowledge.listKnowledgeDocuments(2, 50)
  expect(fetcher).toHaveBeenLastCalledWith('/api/v1/academic/knowledge-documents?page=2&pageSize=50', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer unit-test-token' }) }))
  fetcher.mockResolvedValueOnce(new Response(JSON.stringify([{ id: 4, version: '2' }])))
  expect(await knowledge.getKnowledgeHistory(9)).toEqual([{ id: 4, version: '2' }])
  expect(fetcher).toHaveBeenLastCalledWith('/api/v1/academic/knowledge-documents/9/history', expect.objectContaining({ method: 'GET' }))
})

it('reads all department pages from the actual paged contract', async () => {
  const fetcher = vi.fn().mockImplementation((url: string) => Promise.resolve(new Response(JSON.stringify({ items: [{ id: url.includes('page=1&') ? 7 : 8 }], totalCount: 2 }))))
  vi.stubGlobal('fetch', fetcher)
  expect(await readAllPages(knowledge.listAcademicDepartments)).toEqual([{ id: 7 }, { id: 8 }])
  expect(fetcher.mock.calls.map(call => call[0])).toEqual(['/api/v1/academic/departments?page=1&pageSize=100', '/api/v1/academic/departments?page=2&pageSize=100'])
})

it('keeps draft, version, publish, retire and index as separate server operations', async () => {
  const fetcher = vi.fn().mockImplementation(() => Promise.resolve(new Response('{}')))
  vi.stubGlobal('fetch', fetcher)
  const version = { version: '2', content: 'Nội dung DEMO', sourceFileName: null, effectiveFrom: '2026-10-23T17:00:00.000Z', effectiveTo: null, chunks: null }
  const document = { ...version, title: 'Tài liệu DEMO', documentType: 'DEMO', departmentId: 7, academicSemesterId: null, projectPeriodId: null }
  await knowledge.createKnowledgeDocument(document)
  expect(fetcher).toHaveBeenCalledTimes(1)
  expect(fetcher).toHaveBeenLastCalledWith('/api/v1/academic/knowledge-documents', expect.objectContaining({ method: 'POST', body: JSON.stringify(document) }))
  await knowledge.createKnowledgeVersion(9, version)
  expect(fetcher).toHaveBeenLastCalledWith('/api/v1/academic/knowledge-documents/9/versions', expect.objectContaining({ method: 'POST', body: JSON.stringify(version) }))
  for (const [action, fn] of [['publish', knowledge.publishKnowledgeDocument], ['retire', knowledge.retireKnowledgeDocument], ['reindex', knowledge.reindexKnowledgeDocument]] as const) {
    await fn(9)
    expect(fetcher).toHaveBeenLastCalledWith(`/api/v1/academic/knowledge-documents/9/${action}`, expect.objectContaining({ method: 'POST', body: undefined }))
  }
})
