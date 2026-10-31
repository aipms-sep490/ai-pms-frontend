import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ReviewSubmissionModal } from './ReviewSubmissionModal'

const policyApi = vi.hoisted(() => ({ getUploadPolicy: vi.fn() }))
vi.mock('../../../services/api/upload-policies.api', async original => ({ ...await original<typeof import('../../../services/api/upload-policies.api')>(), getUploadPolicy: policyApi.getUploadPolicy }))
vi.mock('../../../app/config/env', () => ({ env: { reviewGatesMockEnabled: false } }))

const requirement = { id: '21', code: 'DOC', title: 'Báo cáo', type: 'DOCUMENT' as const, scope: 'COMMON' as const, isMandatory: true,
  verificationStatus: 'PENDING' as const, latestArtifact: null }
const show = (onSubmit = vi.fn().mockResolvedValue(undefined)) => render(<ReviewSubmissionModal open onClose={vi.fn()} requirement={requirement} gateCode="R1" isLeader onSubmit={onSubmit} />)
const largeFile = (size: number) => { const file = new File(['x'], 'report.pdf', { type: 'application/pdf' }); Object.defineProperty(file, 'size', { value: size }); return file }

beforeEach(() => policyApi.getUploadPolicy.mockReset())
afterEach(cleanup)

it('shows the BE limit before selection and rejects an oversized file locally', async () => {
  policyApi.getUploadPolicy.mockResolvedValue({ parentType: 'REVIEW_GATE_EVIDENCE', maxBytes: 6 * 1_048_576,
    maxBytesLabel: '6 MiB', allowedMimeTypes: ['application/pdf'], allowedExtensions: ['.pdf'], maxFilesPerRequest: 1, requiresVersionAnchor: true })
  const onSubmit = vi.fn()
  show(onSubmit)
  expect(await screen.findAllByText('PDF · tối đa 6 MiB')).toHaveLength(2)
  fireEvent.change(screen.getByLabelText('Tệp minh chứng'), { target: { files: [largeFile(10 * 1_048_576)] } })
  expect(screen.getByText(/Tệp vượt giới hạn 6 MiB/)).toBeTruthy()
  expect(onSubmit).not.toHaveBeenCalled()
})

it('keeps file selection available when policy cannot be loaded', async () => {
  policyApi.getUploadPolicy.mockResolvedValue(null)
  show()
  await waitFor(() => expect(screen.getByText(/Chưa tải được chính sách tệp/)).toBeTruthy())
  fireEvent.change(screen.getByLabelText('Tệp minh chứng'), { target: { files: [largeFile(21 * 1_048_576)] } })
  expect(screen.getByText('report.pdf')).toBeTruthy()
})
