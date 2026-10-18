import { useState } from 'react'
import { Modal } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import type { StudentGateRequirement } from '../types/review-gates.types'

interface ReviewSubmissionModalProps {
  open: boolean
  onClose: () => void
  requirement: StudentGateRequirement | null
  gateCode: string
  isLeader: boolean
  onSubmit: (artifactName: string, notes: string) => Promise<void>
}

export function ReviewSubmissionModal({
  open,
  onClose,
  requirement,
  gateCode,
  isLeader,
  onSubmit,
}: ReviewSubmissionModalProps) {
  const [artifactName, setArtifactName] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!requirement) return null

  const currentVer = requirement.latestArtifact?.version ?? 0
  const nextVer = currentVer + 1
  const isRevision = requirement.verificationStatus === 'REJECTED'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLeader) {
      setError('Chỉ trưởng nhóm (Student Leader) mới có thẩm quyền nộp hồ sơ review.')
      return
    }
    if (!artifactName.trim()) {
      setError('Vui lòng nhập tên tài liệu hoặc liên kết minh chứng.')
      return
    }
    if (!notes.trim()) {
      setError('Vui lòng nhập ghi chú hoặc giải trình nội dung nộp.')
      return
    }

    try {
      setBusy(true)
      setError(null)
      await onSubmit(artifactName.trim(), notes.trim())
      setArtifactName('')
      setNotes('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi nộp hồ sơ.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${isRevision ? 'Nộp bản sửa đổi' : 'Nộp minh chứng'} · ${requirement.code}`}
      description={`Cập nhật minh chứng học thuật cho đợt thẩm định ${gateCode}`}
      busy={busy}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLeader && (
          <div className="rounded-lg border border-status-warning-border bg-status-warning-bg p-3 text-xs font-semibold text-status-warning-text">
            ⚠️ <strong>Quyền hạn:</strong> Bạn đang đăng nhập với vai trò Thành viên (Student Member). Quyền nộp hồ sơ review và bản sửa đổi chính thức thuộc về Trưởng nhóm (Student Leader).
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700 space-y-1.5">
          <div className="flex justify-between">
            <span className="font-semibold text-slate-600">Yêu cầu:</span>
            <span className="font-bold text-slate-900">{requirement.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-slate-600">Loại minh chứng:</span>
            <span className="font-medium text-slate-800">{requirement.type} · Scope: {requirement.scope}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-slate-600">Phiên bản sẽ tạo:</span>
            <span className="font-bold text-primary">v{nextVer} (Bản mới)</span>
          </div>
          {requirement.reviewerFeedback && (
            <div className="mt-2 rounded-md border border-rose-200 bg-rose-50 p-2 text-rose-800">
              <strong>Phản hồi của Reviewer:</strong> {requirement.reviewerFeedback}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700">
            Tên tệp minh chứng hoặc liên kết (URL / Git PR) <span className="text-rose-600">*</span>
          </label>
          <input
            type="text"
            required
            aria-required="true"
            disabled={!isLeader || busy}
            value={artifactName}
            onChange={(e) => setArtifactName(e.target.value)}
            placeholder="Ví dụ: SDD_v3.pdf hoặc https://github.com/.../pull/42"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-primary focus:outline-hidden disabled:bg-slate-100"
          />
          <p className="mt-1 text-xs text-slate-500">
            Hỗ trợ các định dạng PDF, DOCX, ZIP hoặc liên kết Git PR / Google Drive công khai.
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700">
            Giải trình nội dung thay đổi / Ghi chú <span className="text-rose-600">*</span>
          </label>
          <textarea
            required
            aria-required="true"
            rows={3}
            disabled={!isLeader || busy}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Mô tả cụ thể những điểm đã chỉnh sửa theo phản hồi của reviewer..."
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-primary focus:outline-hidden disabled:bg-slate-100"
          />
          <p className="mt-1 text-xs text-slate-500">
            Nêu rõ các nội dung hoặc tài liệu đã cập nhật để Hội đồng dễ dàng đối chiếu và thẩm định lại.
          </p>
        </div>

        {error && (
          <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2.5 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button type="submit" disabled={!isLeader || busy}>
            {busy ? 'Đang gửi...' : isRevision ? 'Xác nhận nộp bản sửa' : 'Nộp minh chứng'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
