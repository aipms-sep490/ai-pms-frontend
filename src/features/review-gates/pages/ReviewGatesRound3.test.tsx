import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { HttpError } from '../../../services/http/http-client'
import { ReviewSubmissionModal } from '../components/ReviewSubmissionModal'
import { EvidenceDownloadButton } from '../components/EvidenceDownloadButton'
import { SupervisorGateFollowupPanel } from '../components/SupervisorGateFollowupPanel'
import { StudentReviewTimeline } from '../components/StudentReviewTimeline'
import { InterdisciplinaryGatePanel } from '../components/InterdisciplinaryGatePanel'
import { ProjectProgressMatrix } from '../components/ProjectProgressMatrix'
import { AssignedReviewQueue } from '../components/AssignedReviewQueue'
import { evidenceLinkLabel } from '../utils/evidence-link'
import type { ProjectReviewMatrixRow, StudentGateRequirement, StudentReviewTimelineDto } from '../types/review-gates.types'

const config = vi.hoisted(() => ({ reviewGatesMockEnabled: false, apiBaseUrl: '/api/v1' }))
vi.mock('../../../app/config/env', () => ({ env: config }))

const requirement: StudentGateRequirement = {
  id: '21', code: 'LINK', title: 'Kho mã nguồn', type: 'EXTERNAL_LINK', scope: 'COMMON',
  isMandatory: true, verificationStatus: 'PENDING', latestArtifact: null,
}
const timeline: StudentReviewTimelineDto = {
  projectId: '40006', projectCode: 'P1', projectName: 'Đồ án đợt 3', projectMode: 'SINGLE_MAJOR',
  major: 'Kỹ thuật phần mềm', effectivePolicyVersion: '1', currentGateCode: 'R1',
  gates: ['R1', 'R2'].map((code, index) => ({
    gateInstanceId: String(index + 4), code, title: `Thẩm định ${code}`, objective: '',
    status: 'PLANNED', reviewEligibility: 'READY', isRequired: true,
    windowStart: null, windowEnd: null, blockingReasons: [], requirements: index === 0 ? [requirement] : [],
  })),
  capabilities: { canSubmitPackage: true, canSubmitRevision: true, blockingReasons: [] },
}
const project: ProjectReviewMatrixRow = {
  projectId: '40008', projectName: 'Đồ án tích hợp P3', mode: 'INTERDISCIPLINARY', major: 'Liên ngành',
  dept: 'IT', taskProgress: 0, hasTasks: false, gateStatuses: { R1: 'REVISION_REQUIRED', R2: 'LOCKED' },
  blockingReasons: { R1: ['Cần bổ sung minh chứng thiết kế.'], R2: ['Chờ kết luận cổng R1.'] },
}

beforeEach(() => { config.reviewGatesMockEnabled = false })
afterEach(() => { cleanup(); vi.restoreAllMocks() })

function renderSubmission(req = requirement) {
  const onSubmit = vi.fn().mockResolvedValue(undefined)
  const onClose = vi.fn()
  render(<ReviewSubmissionModal open requirement={req} gateCode="R1" isLeader canSubmit onSubmit={onSubmit} onClose={onClose} />)
  return { onSubmit, onClose }
}

function linkField(): HTMLInputElement {
  return screen.getByPlaceholderText(/SDD_v3\.pdf hoặc https/) as HTMLInputElement
}

function submitForm() {
  const form = screen.getByRole('button', { name: /^Nộp minh chứng$/ }).closest('form')
  if (!form) throw new Error('Submission form was not rendered')
  fireEvent.submit(form)
}

describe('R3-04 external link evidence using the live contract', () => {
  it('offers link mode for EXTERNAL_LINK while mock mode is disabled and submits a trimmed HTTPS URL', async () => {
    const { onSubmit, onClose } = renderSubmission()
    fireEvent.click(screen.getByRole('button', { name: /Liên kết ngoài/ }))
    fireEvent.change(linkField(), { target: { value: ' https://example.test/review ' } })
    fireEvent.change(screen.getByRole('textbox', { name: /Giải trình|Ghi chú/ }), { target: { value: ' Bản minh chứng mới ' } })
    submitForm()
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'link', linkUrl: 'https://example.test/review', artifactName: 'https://example.test/review', notes: 'Bản minh chứng mới',
    })))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it.each(['http://example.test/review', '', 'https://', 'javascript:alert(1)'])('announces invalid URL %j and preserves the notes draft', async url => {
    const { onSubmit, onClose } = renderSubmission()
    fireEvent.click(screen.getByRole('button', { name: /Liên kết ngoài/ }))
    fireEvent.change(linkField(), { target: { value: url } })
    const notes = screen.getByRole('textbox', { name: /Giải trình|Ghi chú/ }) as HTMLTextAreaElement
    fireEvent.change(notes, { target: { value: 'Giữ nguyên giải trình đang nhập' } })
    submitForm()
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(linkField().value).toBe(url)
    expect(notes.value).toBe('Giữ nguyên giải trình đang nhập')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it.each(['DOCUMENT', 'LINK'] as const)('does not offer the external link contract for requirement type %s', type => {
    renderSubmission({ ...requirement, type })
    expect(screen.queryByRole('button', { name: /Liên kết ngoài/ })).toBeNull()
  })

  it('enables submission for a real EXTERNAL_LINK requirement from server capabilities', () => {
    render(<StudentReviewTimeline timeline={timeline} isLeader onSubmitRevision={vi.fn()} />)
    const submit = screen.getByRole('button', { name: 'Nộp tài liệu' }) as HTMLButtonElement
    expect(submit.disabled).toBe(false)
    fireEvent.click(submit)
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Liên kết ngoài/ })).toBeTruthy()
  })

  it('opens an external artifact safely with its complete URL and no download or fabricated file metadata', () => {
    const url = 'https://example.test/review'
    const linked: StudentGateRequirement = { ...requirement, latestArtifact: {
      version: 1, filename: url, submittedAt: '2026-10-22', submittedBy: 'Student',
      contentType: 'text/uri-list', sizeBytes: 0, sha256: '', linkUrl: url,
    } }
    const { container } = render(<EvidenceDownloadButton projectId="40006" gateCode="R1" requirement={linked} />)
    const link = screen.getByRole('link') as HTMLAnchorElement
    expect(link.href).toBe(url)
    expect(link.target).toBe('_blank')
    expect(link.rel.split(' ')).toEqual(expect.arrayContaining(['noopener', 'noreferrer']))
    expect(`${link.title} ${link.getAttribute('aria-label')}`).toContain(url)
    expect(container.textContent).toMatch(/ngoài hệ thống/i)
    expect(container.textContent).not.toMatch(/0\s*(byte|B)\b|checksum|sha256/i)
    expect(screen.queryByRole('button', { name: /Tải/ })).toBeNull()
  })

  it('renders long external artifact metadata as an abbreviated link rather than a stored file', () => {
    const linkUrl = `https://example.test/${'long-path-'.repeat(18)}`
    render(<AssignedReviewQueue assignments={[{ id: '31', projectId: '40006', projectCode: 'P1', projectName: 'Đồ án metadata',
      gateCode: 'R1', gateTitle: 'Thẩm định', scope: 'COMMON', dueAt: null, status: 'PENDING_REVIEW', concurrencyToken: 'test-token',
      requirements: [{ ...requirement, verificationStatus: 'SUBMITTED', latestArtifact: { version: 1, filename: linkUrl,
        submittedAt: '2026-10-22', submittedBy: 'Student', contentType: 'text/uri-list', linkUrl, sizeBytes: 0, sha256: '' } }],
    }]} onVerifyEvidence={vi.fn()} onSubmitDecision={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: evidenceLinkLabel(linkUrl) }))
    const preview = within(screen.getByRole('dialog'))
    expect(preview.getByText('Liên kết ngoài:')).toBeTruthy()
    expect(preview.getByTitle(linkUrl).textContent).toBe(evidenceLinkLabel(linkUrl))
    expect(preview.queryByText(/Tải tệp qua API/)).toBeNull()
    expect(preview.getByText(/ngoài hệ thống/)).toBeTruthy()
  })

  it.each(['http://example.test/review', 'javascript:alert(1)', '//example.test/review'])('fails closed for an external artifact with unsafe target %s', linkUrl => {
    render(<EvidenceDownloadButton projectId="40006" gateCode="R1" requirement={{ ...requirement, latestArtifact: {
      version: 1, filename: linkUrl, submittedAt: '2026-10-22', submittedBy: 'Student',
      contentType: 'text/uri-list', sizeBytes: 0, sha256: '', linkUrl,
    } }} />)
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.queryByRole('button', { name: /Tải/ })).toBeNull()
    expect(screen.getByRole('alert')).toBeTruthy()
  })
})

function renderSupervisor(onSendFeedback: (feedback: string) => Promise<void>) {
  return render(<SupervisorGateFollowupPanel projectId="40006" projectName="Đồ án đợt 3" projectCode="P1"
    currentGateCode="R1" gateTitle="Thẩm định R1" gateStatus="PLANNED" onSendFeedback={onSendFeedback} />)
}

describe('R3-05 supervisor advice', () => {
  it('associates the visible feedback label with its textarea', () => {
    renderSupervisor(vi.fn())
    expect(screen.getByRole('textbox', { name: /Nhận xét hướng dẫn/ })).toBeTruthy()
  })

  it('preserves advice after a 403 and announces the authorization error', async () => {
    renderSupervisor(vi.fn().mockRejectedValue(new HttpError('Bạn không phải giảng viên hướng dẫn của đồ án.', 403)))
    const field = screen.getByRole('textbox') as HTMLTextAreaElement
    fireEvent.change(field, { target: { value: 'Nháp nhận xét cần được giữ lại' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi nhận xét hướng dẫn' }))
    expect((await screen.findByRole('alert')).textContent).toContain('không phải giảng viên hướng dẫn')
    expect(field.value).toBe('Nháp nhận xét cần được giữ lại')
    expect(screen.queryByText(/Đã gửi nhận xét hướng dẫn.*thành công/)).toBeNull()
  })

  it('blocks duplicate submits while pending and shows success only after the request resolves', async () => {
    let finish!: () => void
    const onSend = vi.fn(() => new Promise<void>(resolve => { finish = resolve }))
    renderSupervisor(onSend)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Rà soát thiết kế ERD' } })
    const button = screen.getByRole('button', { name: 'Gửi nhận xét hướng dẫn' }) as HTMLButtonElement
    const form = button.closest('form')!
    fireEvent.submit(form)
    expect(button.disabled).toBe(true)
    fireEvent.submit(form)
    expect(onSend).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(/Đã gửi nhận xét hướng dẫn.*thành công/)).toBeNull()
    await act(async () => { finish() })
    expect(await screen.findByText(/Đã gửi nhận xét hướng dẫn.*thành công/)).toBeTruthy()
  })

  it('shows only supervisor feedback for the currently selected gate', () => {
    render(<StudentReviewTimeline timeline={{ ...timeline, supervisorFeedbacks: [
      { gateCode: 'R1', feedback: 'Nhận xét chỉ dành cho R1', submittedAt: '2026-10-22', supervisorName: 'GV A' },
      { gateCode: 'R2', feedback: 'Nhận xét chỉ dành cho R2', submittedAt: '2026-10-22', supervisorName: 'GV B' },
    ] }} isLeader onSubmitRevision={vi.fn()} />)
    expect(screen.getByText('Nhận xét chỉ dành cho R1')).toBeTruthy()
    expect(screen.queryByText('Nhận xét chỉ dành cho R2')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /R2.*Thẩm định R2/ }))
    expect(screen.getByText('Nhận xét chỉ dành cho R2')).toBeTruthy()
    expect(screen.queryByText('Nhận xét chỉ dành cho R1')).toBeNull()
  })
})

describe('R3-06 backend scope labels and governance', () => {
  const scopeProps = { projectId: '40008', hybridScopes: { '12': 'IN_REVIEW' as const, IT: 'PASSED' as const },
    hybridScopeLabels: { '12': 'Thiết kế đồ họa', IT: 'Kỹ thuật phần mềm do BE trả' } }

  it('prefers backend labels, including numeric major keys, on a live read-only panel', () => {
    const onUpdate = vi.fn()
    render(<InterdisciplinaryGatePanel {...scopeProps} onUpdateScopeDecision={onUpdate} />)
    expect(screen.getAllByText('Thiết kế đồ họa').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Kỹ thuật phần mềm do BE trả').length).toBeGreaterThan(0)
    expect(screen.queryByText('Chuyên ngành 12')).toBeNull()
    expect(screen.queryByText(/KHÔNG THỂ PASS/)).toBeNull()
    expect(screen.queryByText('READY FOR PASS')).toBeNull()
    screen.queryAllByRole('combobox').forEach(select => expect((select as HTMLSelectElement).disabled).toBe(true))
    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('keeps the numeric scope key when submitting a sandbox decision', async () => {
    config.reviewGatesMockEnabled = true
    const onUpdate = vi.fn().mockResolvedValue(undefined)
    render(<InterdisciplinaryGatePanel {...scopeProps} onUpdateScopeDecision={onUpdate} />)
    const row = screen.getAllByText('Thiết kế đồ họa')[0].closest('tr')!
    fireEvent.change(within(row).getByRole('combobox'), { target: { value: 'PASSED' } })
    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith('40008', '12', 'PASSED'))
  })
})

describe('R3-07 and R3-08 matrix task presence and server blockers', () => {
  it('shows no-task text without a percentage or progress bar', () => {
    render(<ProjectProgressMatrix projects={[project]} onUpdateDecision={vi.fn()} />)
    const row = screen.getByText(project.projectName).closest('tr')!
    expect(within(row).getByText('Chưa có công việc')).toBeTruthy()
    expect(within(row).queryByText('0%')).toBeNull()
    expect(within(row).queryByRole('progressbar')).toBeNull()
    expect(row.querySelector('[style*="width"]')).toBeNull()
  })

  it('retains real zero progress when tasks exist', () => {
    render(<ProjectProgressMatrix projects={[{ ...project, hasTasks: true }]} onUpdateDecision={vi.fn()} />)
    expect(screen.getByText('0%')).toBeTruthy()
    expect(screen.queryByText('Chưa có công việc')).toBeNull()
  })

  it('shows backend reasons keyed by gate in the project drawer without enabling live decisions', () => {
    const onUpdate = vi.fn()
    render(<ProjectProgressMatrix projects={[project]} onUpdateDecision={onUpdate} />)
    fireEvent.click(screen.getByText(project.projectName))
    const drawer = screen.getByRole('dialog')
    expect(within(drawer).getByText('Cần bổ sung minh chứng thiết kế.')).toBeTruthy()
    expect(within(drawer).getByText('Chờ kết luận cổng R1.')).toBeTruthy()
    expect(within(drawer).queryByRole('button', { name: 'Cập nhật quyết định Reviewer' })).toBeNull()
    expect(onUpdate).not.toHaveBeenCalled()
  })
})
