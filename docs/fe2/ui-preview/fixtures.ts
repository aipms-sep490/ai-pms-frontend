// Local display data for the standalone UI workbook. Never imported by the app.
import { projectCapabilities } from '../../../src/test/project-capabilities'

const now = '2026-10-15T08:00:00Z'
const page = (items: unknown[]) => ({ items, page: 1, pageSize: 100, totalCount: items.length, totalPages: 1 })
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })
const copy = <T,>(value: T): T => structuredClone(value)

const assignment = { id: 41, projectId: 9, evaluatorId: 5, rubricId: 7, projectPeriodId: 3, departmentId: 2, evaluationType: 'LECTURER', status: 'ACTIVE', assignedBy: 3, assignedAt: now, revokedAt: null, concurrencyToken: 'preview-assignment', scope: 'MAJOR_SPECIFIC', majorId: 8, studentId: null, componentId: 11, policyVersionId: 4 }
const criteria = [
  { rubricCriterionId: 12, name: 'Phân tích yêu cầu', description: 'Yêu cầu rõ ràng, có căn cứ đối chiếu với hồ sơ bàn giao.', weightPercent: 40, maxScore: 10, sortOrder: 1, isRequired: true, score: 8, comments: 'Phạm vi và yêu cầu được trình bày rõ.' },
  { rubricCriterionId: 13, name: 'Thiết kế và triển khai', description: 'Thiết kế phù hợp; có sản phẩm và minh chứng kiểm thử.', weightPercent: 40, maxScore: 10, sortOrder: 2, isRequired: true, score: 7.5, comments: '' },
  { rubricCriterionId: 14, name: 'Tài liệu và kiểm chứng', description: 'Tài liệu sử dụng đầy đủ; kết quả được kiểm chứng.', weightPercent: 20, maxScore: 10, sortOrder: 3, isRequired: true, score: 8.5, comments: '' },
]
const draft = { id: 51, assignmentId: 41, projectId: 9, evaluatorId: 5, rubricId: 7, rubricName: 'Đánh giá hồ sơ ngành SE', rootRubricId: 7, rubricVersion: 2, evaluationType: 'LECTURER', status: 'DRAFT', comments: 'Đối chiếu báo cáo phiên bản đã khóa.', totalScore: 7.9, scoreScale: 10, calculationRule: 'WEIGHTED_10', missingCriterionIds: [], missingRequiredCriterionIds: [], concurrencyToken: 'preview-draft', createdAt: now, updatedAt: now, finalization: null as unknown, scores: criteria }
const component = { id: 11, componentId: 11, name: 'Hồ sơ ngành SE', scope: 'MAJOR_SPECIFIC', majorId: 8, rubricId: 7, projectWeightPercent: 50, studentWeightPercent: 50, weightPercent: 50, requiredEvaluators: 1, stage: 'COLD', score: 7.9 }
const breakdown = { isDemo: true, isLegacy: false, approvalStatus: 'PROPOSED', schemeName: 'Phương án minh họa', schemeVersion: 1, commonScore: 8.1, majorAggregate: 7.9, majorBreakdown: [{ majorId: 8, score: 7.9 }], components: [component] }
const result = { id: 1, projectId: 9, studentId: 88, majorId: 8, schemeId: 31, finalSubmissionId: 15, totalScore: 8, passThreshold: 5, outcome: 'PASS', calculationRule: 'Dữ liệu hiển thị minh họa', publishedBy: 3, publishedAt: now, policyConcurrencyToken: 'preview', snapshotJson: '{}', contributions: [], breakdown, version: 2, revisionId: 2, supersedesVersion: 1 }
const scheme = { id: 31, rootId: 31, version: 1, projectId: 9, projectPeriodId: 3, name: 'Phương án minh họa', status: 'PUBLISHED', passThreshold: 5, concurrencyToken: 'preview-scheme', policyVersionId: 4, calculationRule: 'PREVIEW_ONLY', components: [component, { ...component, id: 15, name: 'Phần chung', scope: 'COMMON', majorId: null }], students: [{ studentId: 88, majorId: 8, departmentId: 2 }, { studentId: 89, majorId: 8, departmentId: 2 }] }
const appeal = { id: 7, projectId: 9, source: 'STUDENT_APPEAL', targetType: 'STUDENT', studentId: 88, resultVersion: 2, componentId: 11, scope: 'MAJOR_SPECIFIC', majorId: 8, status: 'PENDING', requestedBy: 88, reviewerId: null as number | null, reason: 'Đề nghị đối chiếu tiêu chí kiểm chứng với báo cáo đã khóa và minh chứng kiểm thử đính kèm.', proposal: null as string | null, reviewReason: null as string | null, decisionReason: null as string | null, concurrencyToken: 'preview-appeal', allowedActions: ['READ'], blockers: [], files: [{ fileId: 101, fileName: 'Minh-chung-kiem-thu.pdf', contentType: 'application/pdf', sizeBytes: 1024, sha256: 'preview', downloadUrl: '' }] }
const window = { id: 5, policyId: 4, status: 'OPEN', opensAt: '2026-10-14T00:00:00Z', closesAt: '2026-10-30T16:59:00Z', concurrencyToken: 'preview-window', targets: [{ targetType: 'STUDENT', studentId: 88, resultVersion: 2 }, { targetType: 'PROJECT', studentId: null, resultVersion: 2 }] }
const industry = { id: 21, projectId: 9, projectCode: 'SE-FA26-09', projectTitle: 'Hệ thống quản lý đồ án liên ngành', expertId: 60, scope: 'MAJOR_SPECIFIC', majorId: 8, startsAt: '2026-10-01T00:00:00Z', endsAt: '2026-12-01T00:00:00Z', status: 'ACTIVE', concurrencyToken: 'preview', allowedActions: ['READ'], advisoryOnly: true }

let store: ReturnType<typeof initial>
let view = 'scoring'
let empty = false
let staleNext = false
let publishReady = false
const uploadedFiles = new Map<number, File>()
export const unhandled: string[] = []
function initial() { return { assignments: [copy(assignment), { ...copy(assignment), id: 42, scope: 'COMMON', majorId: null, componentId: 15 }, { ...copy(assignment), id: 43, scope: 'INDIVIDUAL', studentId: 88 }], draft: copy(draft), requests: [copy(appeal)], windows: [copy(window)], policy: { id: 4, projectId: 9, version: 1, approvalReference: 'Nguồn minh họa trong bản xem giao diện', recordedBy: 3, recordedAt: now }, qualification: { projectPeriodId: 3, qualificationType: 'CAPSTONE_READINESS', requireStudentQualification: true, requireCertificate: true, checkExpiration: false }, published: false } }
export function resetPreview(nextView: string, noData = false) { view = nextView; empty = noData; staleNext = false; publishReady = false; store = initial(); uploadedFiles.clear(); unhandled.length = 0 }
export function conflictNextWrite() { staleNext = true }
export function setPreviewPublicationReady(value: boolean) { publishReady = value }
const actions = () => view === 'assign-reviewer' ? ['READ', 'ASSIGN_REVIEWER'] : view === 'reviewer' ? ['READ', 'REVIEW'] : view === 'decision' ? ['READ', 'PREVIEW', 'ACCEPT', 'REJECT'] : ['READ', 'UPLOAD']
const requestRow = (row: typeof appeal) => ({ ...row, allowedActions: ['ACCEPTED', 'REJECTED'].includes(row.status) ? ['READ'] : actions(), status: ['reviewer', 'decision'].includes(view) && row.status === 'PENDING' ? 'UNDER_REVIEW' : row.status, reviewerId: ['reviewer', 'decision'].includes(view) ? 42 : row.reviewerId })

// Tiny PDF sample for the existing report viewer, not a screenshot of a redesigned UI.
function pdf() {
  const stream = 'BT /F1 22 Tf 45 740 Td (SOFTWARE REQUIREMENT) Tj 0 -38 Td /F1 12 Tf (Preview document - locked version 2) Tj 0 -35 Td (1. Project scope and acceptance criteria) Tj 0 -25 Td (2. Functional requirements and verification) Tj 0 -25 Td (3. Test evidence and traceability matrix) Tj 0 -50 Td (Sample content for trying the FE2 report viewer.) Tj ET'
  const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`]
  let body = '%PDF-1.4\n'; const offsets = [0]
  objs.forEach((obj, index) => { offsets.push(body.length); body += `${index + 1} 0 obj\n${obj}\nendobj\n` })
  const start = body.length; body += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => String(offset).padStart(10, '0') + ' 00000 n ').join('\n')}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`
  return new Response(body, { headers: { 'Content-Type': 'application/pdf' } })
}

export async function previewFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (init?.signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  const url = new URL(input instanceof Request ? input.url : String(input), 'http://preview.invalid')
  const path = url.pathname.replace(/^\/api\/v1/, ''), method = init?.method ?? 'GET'
  const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {}
  const uploadedId = Number(path.match(/\/files\/(\d+)$/)?.[1])
  if (uploadedFiles.has(uploadedId)) return new Response(uploadedFiles.get(uploadedId)!)
  if (/\/files\/202$/.test(path)) return new Response('USER GUIDE\n\nIllustrative evidence for the FE2 interface preview.\n1. Choose a project.\n2. Read the locked evidence.\n3. Enter rubric scores and save the draft.\n', { headers: { 'Content-Type': 'text/plain' } })
  if (method !== 'GET' && staleNext) { staleNext = false; return json({ title: 'Dữ liệu đã thay đổi', detail: 'Dữ liệu đã thay đổi. Hãy tải lại và đối chiếu trước khi gửi lại.' }, 409) }
  if (/\/files\/201$/.test(path)) return new Response('<svg xmlns="http://www.w3.org/2000/svg" width="595" height="842" viewBox="0 0 595 842"><rect width="595" height="842" fill="white"/><g font-family="Arial,sans-serif" fill="#173d35"><text x="45" y="68" font-size="12">SE-FA26-09 / SAMPLE DOCUMENT</text><text x="45" y="108" font-size="25" font-weight="bold">SOFTWARE REQUIREMENT</text><text x="45" y="138" font-size="13">Locked version 2 / sample content for the report viewer</text><path d="M45 163H550" stroke="#ccdcd2"/><text x="45" y="211" font-size="18" font-weight="bold">1. Scope and acceptance criteria</text><text x="45" y="243" font-size="14">Manage project registration, evidence and evaluation.</text><text x="45" y="303" font-size="18" font-weight="bold">2. Review workflow</text><rect x="45" y="328" width="150" height="60" rx="6" fill="#edf3f0"/><rect x="220" y="328" width="150" height="60" rx="6" fill="#edf3f0"/><rect x="395" y="328" width="150" height="60" rx="6" fill="#edf3f0"/><g font-size="14"><text x="70" y="364">Locked evidence</text><text x="245" y="364">Rubric scores</text><text x="420" y="364">Review result</text></g><path d="M195 358H220M370 358H395" stroke="#17665c" stroke-width="2"/><text x="45" y="455" font-size="18" font-weight="bold">3. Verification</text><g font-size="14"><text x="45" y="488">Requirements linked to test cases and deliverables.</text><text x="45" y="516">Each criterion keeps its score and reviewer comment.</text><text x="45" y="544">Versions remain available for later comparison.</text></g><path d="M45 750H550" stroke="#ccdcd2"/><text x="45" y="779" font-size="12">Illustrative evidence / not a real student submission</text></g></svg>', { headers: { 'Content-Type': 'image/svg+xml' } })
  if (/\/files\/\d+$/.test(path) || /\/evidence\/\d+$/.test(path)) return pdf()
  if (path === '/evaluation-assignments/my') return json(page(empty ? [] : store.assignments))
  const assignmentId = path.match(/^\/evaluation-assignments\/(\d+)$/)
  if (assignmentId) return json({ assignment: store.assignments.find(a => a.id === +assignmentId[1]) ?? assignment, canScore: true, legacyReadOnly: false, denialReason: null })
  if (/^\/evaluation-assignments\/\d+\/evidence$/.test(path)) return json({ assignmentId: 41, projectId: 9, scope: 'MAJOR_SPECIFIC', majorId: 8, studentId: null, finalSubmissionId: 15, submittedAt: now, itemCount: 2, isReadOnly: true, stage: 'COLD', coldPackageId: 4, items: empty ? [] : [
    { id: 1, title: 'Software Requirement', description: '', sourceType: 'COLD', sourceId: 15, fileId: 201, fileName: 'Software-Requirement-v2.svg', contentType: 'image/svg+xml', fileSizeBytes: 2048, majorId: 8, studentId: null, submittedAt: now, downloadUrl: '', deliverableVersionId: 302, versionNumber: 2, sha256: 'preview', coldSubmissionId: 4 },
    { id: 2, title: 'User Guide', description: '', sourceType: 'COLD', sourceId: 16, fileId: 202, fileName: 'User-Guide-v1.txt', contentType: 'text/plain', fileSizeBytes: 256, majorId: 8, studentId: null, submittedAt: now, downloadUrl: '', deliverableVersionId: 303, versionNumber: 1, sha256: 'preview', coldSubmissionId: 4 },
  ] })
  if (path === '/projects/9/evaluations') return json(page(empty ? [] : [store.draft]))
  if (/^\/evaluation-assignments\/\d+\/evaluation$/.test(path)) { empty = false; return json(store.draft) }
  if (path === '/evaluations/51/draft') {
    store.draft.scores = store.draft.scores.map(c => ({ ...c, score: body.scores.find((s: { rubricCriterionId: number }) => s.rubricCriterionId === c.rubricCriterionId)?.score ?? null, comments: body.scores.find((s: { rubricCriterionId: number }) => s.rubricCriterionId === c.rubricCriterionId)?.comments ?? '' }))
    store.draft.comments = body.comments ?? ''; store.draft.missingCriterionIds = store.draft.scores.filter(c => c.score == null).map(c => c.rubricCriterionId) as never[]
    store.draft.totalScore = store.draft.missingCriterionIds.length ? null as never : Math.round(store.draft.scores.reduce((sum, c) => sum + (c.score ?? 0) * c.weightPercent / 100, 0) * 100) / 100
    return json(store.draft)
  }
  if (path === '/evaluations/51/finalize') { store.draft.status = 'FINALIZED'; store.draft.finalization = { finalizedBy: 5, finalizedAt: now, evidence: { finalSubmissionId: 15, artifactCount: 2, fileCount: 2 } }; return json(store.draft) }
  if (path === '/projects/9/evaluation-schemes' || path === '/evaluation-schemes') return json(empty ? [] : [scheme])
  if (path === '/projects/9/my-capabilities') return json(projectCapabilities(9))
  if (path === '/projects/9') return json({ id: 9, teamId: 10, title: industry.projectTitle, status: 'FINAL_SUBMISSION' })
  if (path === '/academic/project-periods') return json(page([{ id: 3, name: 'Đợt đánh giá cuối kỳ', code: 'EVAL-FA26', semesterName: 'Fall 2026', periodType: 'EVALUATION', status: 'ACTIVE', rubricId: 7 }]))
  if (path === '/projects/9/eligible-evaluators') return json(page([{ userId: 5, displayName: 'Giảng viên Nguyễn Minh', departmentId: 2, departmentName: 'Khoa CNTT', evaluationTypes: ['LECTURER'] }]))
  if (path === '/projects/9/evaluation-assignments') {
    if (method === 'POST') { const next = { ...assignment, ...body, id: 44 }; store.assignments.push(next); return json(next) }
    return json(page(empty ? [] : store.assignments.filter(a => !url.searchParams.get('status') || a.status === url.searchParams.get('status'))))
  }
  if (/\/evaluation-assignments\/\d+\/revoke$/.test(path)) { const item = store.assignments.find(a => a.id === Number(path.split('/')[2])); if (item) item.status = 'REVOKED'; return json(item) }
  if (path === '/academic/project-periods/3/qualification-policy') { if (method === 'PUT') Object.assign(store.qualification, body); return json(store.qualification) }
  if (path === '/projects/9/result/appeal-policy') { if (method === 'POST') Object.assign(store.policy, { ...body, version: store.policy.version + 1 }); return json(store.policy) }
  if (path === '/projects/9/result/appeal-windows') { if (method === 'POST') store.windows.push({ ...window, ...body, id: 6 }); return json(method === 'POST' ? store.windows.at(-1) : page(empty ? [] : store.windows)) }
  if (/\/appeal-windows\/\d+\/close$/.test(path)) { const item = store.windows.find(w => w.id === Number(path.split('/').at(-2))); if (item) item.status = 'CLOSED'; return json(item) }
  if (path === '/projects/9/result/correction-requests') {
    if (method === 'POST') { const next = { ...copy(appeal), ...body, id: 8 }; store.requests.push(next); return json(requestRow(next)) }
    return json(page(empty ? [] : store.requests.map(requestRow)))
  }
  const requestMatch = path.match(/^\/projects\/9\/result\/correction-requests\/(\d+)(.*)$/)
  if (requestMatch) {
    const row = store.requests.find(r => r.id === +requestMatch[1]) ?? store.requests[0], suffix = requestMatch[2]
    if (suffix === '/history') return json(page([{ id: 1, action: 'SUBMITTED', actorId: 88, at: now, reason: 'Gửi yêu cầu phúc khảo', bundleId: null, amendments: [] }, ...(row.proposal ? [{ id: 2, action: 'REVIEWED', actorId: 42, at: now, reason: row.reviewReason, bundleId: null, amendments: [] }] : []), ...(['ACCEPTED', 'REJECTED'].includes(row.status) ? [{ id: 3, action: row.status, actorId: 3, at: now, reason: row.decisionReason, bundleId: 1, amendments: [] }] : [])]))
    if (suffix === '/evidence') return json(appeal.files)
    if (suffix === '/review' && method === 'GET') return json({ requestId: row.id, componentId: 11, scope: 'MAJOR_SPECIFIC', majorId: 8, studentId: 88, calculationVersion: 'frozen-preview-v1', evaluations: [{ ...draft, scores: criteria }], amendments: [] })
    if (suffix === '/review') { row.proposal = body.proposal; row.reviewReason = body.reason; row.status = 'UNDER_REVIEW' }
    if (suffix === '/reviewer') { row.reviewerId = body.reviewerId; row.status = 'UNDER_REVIEW' }
    if (suffix === '/preview') return json({ confirmationToken: 'preview-only', affectedResults: [{ ...result, version: 3, supersedesVersion: 2, totalScore: 8.2 }] })
    if (suffix === '/decision') { row.status = body.decision; row.decisionReason = body.reason }
    if (suffix === '/files' && init?.body instanceof FormData) { const file = init.body.get('File') as File | null; if (file) { const fileId = 102 + uploadedFiles.size; uploadedFiles.set(fileId, file); row.files.push({ fileId, fileName: file.name, contentType: file.type, sizeBytes: file.size, sha256: 'preview', downloadUrl: '' }) } }
    return json(requestRow(row))
  }
  if (/\/result\/history$/.test(path)) return json(page(empty ? [] : [{ ...result, studentId: path.includes('/students/') ? 88 : null }, { ...result, version: 1, supersedesVersion: null, totalScore: 7.8, publishedAt: '2026-10-14T08:00:00Z' }]))
  const version = path.match(/\/result\/versions\/(\d+)$/)
  if (version) return json({ ...result, version: +version[1], totalScore: +version[1] === 1 ? 7.8 : 8 })
  if (/\/result\/preview$/.test(path)) return json({ ...result, canPublish: publishReady, blockers: publishReady ? [] : ['DEMO_SCHEME_NOT_OFFICIAL'], confirmationToken: 'preview-only' })
  if (/\/students\/\d+\/result$/.test(path)) return json(result)
  if (path === '/projects/9/result') {
    if (method === 'POST') { store.published = true; return json({ ...result, version: 1 }) }
    return view === 'publication' && !store.published ? json({ title: 'Chưa công bố' }, 404) : json(result)
  }
  if (path === '/industry/assignments') return json(page(empty ? [] : [industry]))
  if (path === '/industry/assignments/21') return json(industry)
  unhandled.push(method + ' ' + path)
  return json({ title: 'Không có dữ liệu mẫu cho thao tác này.' }, 404)
}
