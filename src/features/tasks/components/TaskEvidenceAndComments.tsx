import { dateTimeLabel } from '../../execution/execution-utils'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { HttpError } from '../../../services/http/http-client'
import * as api from '../task-evidence-api'
import type { TaskComment, TaskFile } from '../task-evidence-api'
import { createProjectEvidence } from '../../projects/api/project-governance-api'
import { DocumentPreviewModal, getFileCategory } from '../../../components/ui/DocumentPreviewModal'
import { getUploadPolicy, uploadPolicyLabel, validateUploadFile, type UploadPolicy } from '../../../services/api/upload-policies.api'
import { Modal } from '../../../components/ui/Modal'
import { Pagination, useClientPagination } from '../../../components/ui'
import { cancelProjectFileUpload, currentUploadOwner, type ProjectFileUploadSession } from '../../files/project-file-uploads'

function getFileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf') return 'picture_as_pdf'
  if (['png', 'jpg', 'jpeg', 'svg', 'webp'].includes(ext)) return 'image'
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'folder_zip'
  if (['doc', 'docx'].includes(ext)) return 'description'
  if (['xls', 'xlsx'].includes(ext)) return 'table_chart'
  return 'draft'
}

export function TaskEvidenceAndComments({ taskId, projectId, majors, mentorMajorId, canAddEvidence }: { taskId: number; projectId: number; majors: Array<{ majorId: number; majorCode: string; majorName: string }>; mentorMajorId: number | null; canAddEvidence: boolean }) {
  const [selectedFileName, setSelectedFileName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadPolicy, setUploadPolicy] = useState<UploadPolicy | null>(null)
  const [preview, setPreview] = useState<{ kind: 'local'; file: File } | { kind: 'stored'; file: TaskFile } | null>(null)
  const [files, setFiles] = useState<TaskFile[]>([])
  const [comments, setComments] = useState<TaskComment[]>([])
  const [filePage, setFilePage] = useState(1)
  const [commentPage, setCommentPage] = useState(1)
  const [fileTotal, setFileTotal] = useState(0)
  const [commentTotal, setCommentTotal] = useState(0)
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [evidenceNotes, setEvidenceNotes] = useState('')
  const [evidenceMajorId, setEvidenceMajorId] = useState<number | null>(mentorMajorId ?? null)
  const [evidenceBusy, setEvidenceBusy] = useState(false)
  const [evidenceNotice, setEvidenceNotice] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<TaskFile | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const deletePending = useRef(false)
  const cancelDelete = useRef<HTMLButtonElement>(null)
  const uploadController = useRef<AbortController | null>(null)
  const [uploadProgress, setUploadProgress] = useState<ProjectFileUploadSession | null>(null)

  useEffect(() => { setDeleteTarget(null); setDeleteError(null) }, [taskId])
  useEffect(() => {
    setUploadProgress(null); setBusy(false)
    return () => { uploadController.current?.abort(); uploadController.current = null }
  }, [taskId])

  useEffect(() => {
    if (!canAddEvidence) return
    let active = true
    void getUploadPolicy('TASK').then(policy => { if (active) setUploadPolicy(policy) }).catch(() => undefined)
    return () => { active = false }
  }, [canAddEvidence])

  const load = useCallback(async () => {
    setLoading(true)
    setLoaded(false); setFiles([]); setComments([])
    try {
      const [evidence, discussion] = await Promise.all([api.getTaskEvidence(taskId, filePage), api.getTaskComments(taskId, commentPage)])
      setFiles(evidence.items); setFileTotal(evidence.totalCount)
      setComments(discussion.items); setCommentTotal(discussion.totalCount)
      setLoaded(true)
      setError(null)
    } catch (reason) { setError(reason instanceof HttpError && reason.status === 403 ? 'Hệ thống không cấp quyền xem minh chứng hoặc bình luận công việc này.' : 'Không thể tải minh chứng và bình luận.') }
    finally { setLoading(false) }
  }, [taskId, filePage, commentPage])
  useEffect(() => { void load() }, [load])

  const mutate = async (operation: () => Promise<unknown>, onSuccess?: () => void) => {
    setBusy(true)
    try { await operation(); onSuccess?.(); await load() }
    catch (reason) {
      if (reason instanceof HttpError && reason.status === 409) await load()
      setError(reason instanceof HttpError && reason.status === 409 ? 'Dữ liệu đã thay đổi. Danh sách đã được tải lại; hãy kiểm tra trước khi thử tiếp.' : 'Hệ thống từ chối thao tác hoặc tệp không hợp lệ.')
    } finally { setBusy(false) }
  }

  const upload = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy || uploadController.current) return
    const input = event.currentTarget.elements.namedItem('file')
    const file = selectedFile
    if (!file) { setError('Hãy chọn tệp minh chứng.'); return }
    const problem = validateUploadFile(file, uploadPolicy)
    if (problem) { setError(problem); return }
    if (file.size > (uploadPolicy?.singleRequestMaxBytes ?? 20 * 1024 * 1024)) {
      const controller = new AbortController()
      uploadController.current = controller
      setBusy(true); setError(null); setEvidenceNotice('')
      void api.uploadTaskEvidence(taskId, file, { signal: controller.signal, onProgress: value => { if (uploadController.current === controller) setUploadProgress(value) } })
        .then(async () => {
          if (uploadController.current !== controller) return
          if (input instanceof HTMLInputElement) input.value = ''
          setSelectedFile(null); setSelectedFileName(''); setUploadProgress(null); await load()
        }).catch(reason => {
          if (uploadController.current !== controller) return
          if (controller.signal.aborted) setEvidenceNotice('Đã tạm dừng. Giữ hoặc chọn lại đúng tệp rồi bấm Tải lên để tiếp tục.')
          else setError(reason instanceof Error ? reason.message : 'Chưa tải được tệp. Nội dung đã chọn được giữ lại để bạn tiếp tục.')
        }).finally(() => { if (uploadController.current === controller) { uploadController.current = null; setBusy(false) } })
      return
    }
    void mutate(() => api.uploadTaskEvidence(taskId, file), () => {
      if (input instanceof HTMLInputElement) input.value = ''
      setSelectedFile(null); setSelectedFileName('')
    })
  }
  const submitEvidence = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canAddEvidence) return
    setEvidenceBusy(true); setEvidenceNotice(''); setError(null)
    try {
      await createProjectEvidence(projectId, { sourceType: 'TASK', sourceId: taskId, majorId: mentorMajorId ?? evidenceMajorId, notes: evidenceNotes.trim() || null })
      setEvidenceNotes(''); setEvidenceNotice('Minh chứng của công việc đã được hệ thống ghi nhận hoặc đã tồn tại.')
      await load()
    } catch (reason) {
      if (reason instanceof HttpError && reason.status === 409) {
        setError('Minh chứng đã thay đổi hoặc trùng với dữ liệu khác. Danh sách đã được tải lại để bạn kiểm tra.')
        await load()
      } else if (reason instanceof HttpError && reason.status === 403) setError('Hệ thống không cấp quyền ghi minh chứng cho công việc này.')
      else setError('Không thể ghi minh chứng. Hãy kiểm tra lại và thử lại.')
    } finally { setEvidenceBusy(false) }
  }
  const comment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!content.trim()) return
    void mutate(() => api.addTaskComment(taskId, content.trim()), () => setContent(''))
  }
  const download = async (file: TaskFile) => {
    try {
      await api.saveTaskEvidence(file)
    } catch (reason) { if (!(reason instanceof Error && reason.name === 'AbortError')) setError('Không thể tải tệp minh chứng.') }
  }
  const removeFile = async () => {
    if (!deleteTarget || !files.some(file => file.id === deleteTarget.id && file.canDelete) || !canAddEvidence || deletePending.current) return
    deletePending.current = true; setDeleteBusy(true); setDeleteError(null); setEvidenceNotice('')
    try {
      await api.deleteTaskEvidence(deleteTarget.id)
      setDeleteTarget(null)
      setEvidenceNotice(`Đã xóa tệp ${deleteTarget.fileName}.`)
      if (files.length === 1 && filePage > 1) setFilePage(page => page - 1)
      else await load()
    } catch (reason) {
      if (reason instanceof HttpError && [403, 404, 409].includes(reason.status)) await load()
      setDeleteError(reason instanceof HttpError && reason.status === 409
        ? 'Tệp hoặc trạng thái công việc đã thay đổi. Tệp đang dùng làm minh chứng hoặc đã khóa có thể không được xóa. Hãy kiểm tra danh sách mới.'
        : reason instanceof HttpError && reason.status === 403
          ? 'Bạn không còn quyền xóa tệp minh chứng này.'
          : reason instanceof HttpError && reason.status === 404
            ? 'Tệp không còn tồn tại hoặc bạn không còn quyền truy cập.'
            : 'Chưa xóa được tệp. Hãy kiểm tra kết nối và thử lại; các nội dung đang soạn vẫn được giữ.')
    } finally { deletePending.current = false; setDeleteBusy(false) }
  }

  const filesPagination = useClientPagination(files, 8)
  const commentsPagination = useClientPagination(comments, 8)

  if (!loading && !loaded) return <section role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm">{error ?? 'Không thể tải minh chứng và bình luận.'} <button type="button" className="font-semibold underline" onClick={() => void load()}>Tải lại</button></section>

  return <section className="task-evidence-comments grid gap-5">
    {error && <p role="alert" className="lg:col-span-2 rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm">{error} <button type="button" className="font-semibold underline" onClick={() => void load()}>Tải lại</button></p>}
    {loading && <p role="status" className="lg:col-span-2 text-sm">Đang tải minh chứng và bình luận…</p>}
    {uploadProgress && <div className="rounded-lg border border-hairline bg-canvas p-4 text-sm">
      <p role="status" aria-live="polite">{uploadProgress.state === 'PROCESSING' ? 'Đã gửi đủ dữ liệu. Máy chủ đang kiểm tra và lưu tệp…' : `${busy ? 'Đang tải' : 'Đã tạm dừng'} ${uploadProgress.fileName}: ${Math.floor(uploadProgress.nextOffset * 100 / Math.max(1, uploadProgress.totalBytes))}%`}</p>
      <progress aria-label="Tiến độ tải minh chứng" className="mt-2 h-2 w-full accent-primary" max={uploadProgress.totalBytes} value={uploadProgress.nextOffset} />
      {busy && <button type="button" className="mt-2 min-h-11 rounded-md border border-hairline px-3 font-semibold text-primary" onClick={() => uploadController.current?.abort()}>Tạm dừng</button>}
      {!busy && uploadProgress.state !== 'PROCESSING' && <button type="button" className="mt-2 min-h-11 rounded-md px-3 font-semibold text-status-error-text" onClick={() => {
        const owner = currentUploadOwner()
        if (!owner) { setError('Hãy đăng nhập lại để hủy phiên tải.'); return }
        setBusy(true)
        void cancelProjectFileUpload(uploadProgress.sessionId, owner).then(() => { setUploadProgress(null); setEvidenceNotice('Đã hủy phiên tải.') }).catch(() => setError('Chưa hủy được phiên tải. Hãy kiểm tra lại kết nối.')).finally(() => setBusy(false))
      }}>Hủy phiên tải</button>}
    </div>}
    <div className="overflow-hidden rounded-xl border border-hairline bg-card">
      <div className="flex items-center justify-between gap-2 bg-canvas/70 border-b border-hairline px-5 py-3.5">
        <h2 className="text-[15px] font-bold text-ink">Minh chứng công việc</h2>
        <span className="rounded-full border border-hairline bg-card px-2 py-0.5 text-xs font-semibold text-ink-soft tabular-nums">{fileTotal || files.length}</span>
      </div>
      <div className="p-5">
        {canAddEvidence ? <><form onSubmit={submitEvidence} className="space-y-3"><p className="text-sm text-ink-muted">Đính kèm tài liệu hoặc kết quả để ghi nhận phần việc đã thực hiện.</p>{mentorMajorId ? <p className="text-sm text-ink-muted">Ngành được hướng dẫn: {majors.find(item => item.majorId === mentorMajorId)?.majorName ?? mentorMajorId}</p> : majors.length > 0 && <label className="block text-sm font-medium text-ink-soft">Chuyên ngành (nếu áp dụng)<select value={evidenceMajorId ?? ''} onChange={event => setEvidenceMajorId(event.target.value ? Number(event.target.value) : null)} className="mt-1 block min-h-11 w-full rounded-lg border border-hairline bg-card px-3 py-2 text-sm font-normal text-ink" disabled={evidenceBusy}><option value="">Không gắn chuyên ngành</option>{majors.map(major => <option key={major.majorId} value={major.majorId}>{major.majorCode} · {major.majorName}</option>)}</select></label>}<label className="block text-sm font-medium text-ink-soft">Ghi chú minh chứng<textarea value={evidenceNotes} maxLength={2000} onChange={event => setEvidenceNotes(event.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-hairline bg-card p-3 text-sm font-normal text-ink" disabled={evidenceBusy} /></label><button disabled={evidenceBusy} className="min-h-11 rounded-lg bg-primary hover:bg-primary-hover px-4 text-sm font-semibold text-white disabled:opacity-50">{evidenceBusy ? 'Đang ghi nhận…' : 'Ghi nhận minh chứng'}</button></form>{evidenceNotice && <p role="status" className="mt-3 text-sm text-status-success-text">{evidenceNotice}</p>}<form onSubmit={upload} className="mt-4 flex flex-wrap items-end gap-2 border-t border-hairline pt-4"><label className="task-evidence-file text-sm">Ảnh hoặc tệp minh chứng<input type="file" name="file" aria-label="Ảnh hoặc tệp minh chứng" className="sr-only" accept={uploadPolicy?.allowedExtensions.join(',')} disabled={busy} onChange={event => { const file = event.target.files?.[0] ?? null; setSelectedFile(file); setSelectedFileName(file?.name ?? ''); setError(null) }} /><span className="task-evidence-file-choice"><span>Chọn tệp</span><span>{selectedFileName || 'Chưa chọn tệp'}</span></span></label><button disabled={busy || !selectedFile} className="min-h-11 rounded-lg bg-primary hover:bg-primary-hover px-4 text-sm font-semibold text-white disabled:opacity-50">Tải lên</button>{selectedFile && getFileCategory(selectedFile.name, selectedFile.type) !== 'archive' && <button type="button" className="min-h-11 rounded-lg border border-hairline px-4 text-sm font-semibold text-primary" onClick={() => setPreview({ kind: 'local', file: selectedFile })}>Xem trước</button>}<p className="w-full text-xs text-ink-muted">{uploadPolicy ? uploadPolicyLabel(uploadPolicy) : 'Giới hạn và định dạng do máy chủ xác nhận khi tải lên.'}</p></form></> : <p className="text-sm leading-6 text-ink-muted">Bạn chưa được cấp quyền bổ sung minh chứng cho công việc này.</p>}
        {!loading && files.length === 0 && <p className="mt-4 text-sm text-ink-muted">Chưa có tệp đính kèm.</p>}
        <ul className="mt-4 space-y-2">{filesPagination.paginatedItems.map(file => (
          <li key={file.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-hairline bg-canvas p-3 text-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="material-symbols-outlined text-primary text-base" aria-hidden="true">{getFileIcon(file.fileName)}</span>
              <span className="truncate max-w-xs sm:max-w-md font-medium text-ink">{file.fileName} · {Math.ceil(file.sizeBytes / 1024)} KB</span>
            </div>
            <span className="flex flex-wrap gap-3"><button type="button" className="min-h-11 font-semibold text-primary" onClick={() => setPreview({ kind: 'stored', file })}>Xem trước</button><button type="button" className="min-h-11 font-semibold text-primary" onClick={() => void download(file)}>Tải xuống</button>{canAddEvidence && file.canDelete === true && <button type="button" aria-label={`Xóa tệp ${file.fileName}`} disabled={busy || deleteBusy} className="min-h-11 font-semibold text-status-error-text disabled:opacity-50" onClick={() => { setDeleteTarget(file); setDeleteError(null) }}>Xóa</button>}</span>
          </li>
        ))}</ul>
        {filesPagination.showPagination && (
          <Pagination
            className="mt-4"
            page={filesPagination.page}
            pages={filesPagination.totalPages}
            total={filesPagination.total}
            pageSize={filesPagination.pageSize}
            onPage={filesPagination.setPage}
          />
        )}
        {fileTotal > 20 && <Pager page={filePage} total={fileTotal} onChange={setFilePage} />}
      </div>
    </div>
    <div className="overflow-hidden rounded-xl border border-hairline bg-card">
      <div className="flex items-center justify-between gap-2 bg-canvas/70 border-b border-hairline px-5 py-3.5">
        <h2 className="text-[15px] font-bold text-ink">Bình luận</h2>
        <span className="rounded-full border border-hairline bg-card px-2 py-0.5 text-xs font-semibold text-ink-soft tabular-nums">{commentTotal || comments.length}</span>
      </div>
      <div className="p-5">
        <form onSubmit={comment} className="space-y-2"><label className="block text-sm font-medium text-ink-soft">Nội dung<textarea value={content} maxLength={5000} onChange={event => setContent(event.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-hairline bg-card p-3 text-sm font-normal text-ink" disabled={busy} /></label><button disabled={busy || !content.trim()} className="min-h-11 rounded-lg bg-primary hover:bg-primary-hover px-4 text-sm font-semibold text-white disabled:opacity-50">Gửi bình luận</button></form>
        {!loading && comments.length === 0 && <p className="mt-4 text-sm text-ink-muted">Chưa có bình luận.</p>}
        <ul className="mt-4 space-y-3">{commentsPagination.paginatedItems.map(item => (
          <li key={item.id} className="flex items-start gap-3 rounded-lg border border-hairline bg-canvas p-3 text-sm">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-xs font-bold text-primary">
              {item.authorName.trim().split(' ').pop()?.slice(0, 2).toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <strong className="text-ink">{item.authorName}</strong>
                <span className="text-xs text-ink-muted">{dateTimeLabel(item.createdAt)}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-ink-soft">{item.content}</p>
            </div>
          </li>
        ))}</ul>
        {commentsPagination.showPagination && (
          <Pagination
            className="mt-4"
            page={commentsPagination.page}
            pages={commentsPagination.totalPages}
            total={commentsPagination.total}
            pageSize={commentsPagination.pageSize}
            onPage={commentsPagination.setPage}
          />
        )}
        {commentTotal > 20 && <Pager page={commentPage} total={commentTotal} onChange={setCommentPage} />}
      </div>
    </div>
    {preview && <DocumentPreviewModal key={preview.kind === 'stored' ? preview.file.id : preview.file.name} open fileName={preview.kind === 'local' ? preview.file.name : preview.file.fileName} fileSize={preview.kind === 'local' ? preview.file.size : preview.file.sizeBytes} contentType={preview.kind === 'local' ? preview.file.type : preview.file.contentType} loadBlob={signal => preview.kind === 'local' ? Promise.resolve(preview.file) : api.downloadTaskEvidence(preview.file.id, signal)} onDownload={preview.kind === 'stored' ? () => download(preview.file) : undefined} onClose={() => setPreview(null)} />}
    {deleteTarget && <Modal open title="Xóa tệp minh chứng" busy={deleteBusy} initialFocusRef={cancelDelete} onClose={() => { setDeleteTarget(null); setDeleteError(null) }}>
      <p className="text-sm leading-6">Xóa tệp <strong>{deleteTarget.fileName}</strong> khỏi công việc? Tệp sẽ không còn xem hoặc tải xuống được. Thao tác xóa được lưu trong lịch sử hệ thống.</p>
      {deleteError && <p role="alert" className="mt-3 text-sm text-status-error-text">{deleteError}</p>}
      <div className="mt-5 flex justify-end gap-3"><button ref={cancelDelete} type="button" disabled={deleteBusy} className="min-h-11 rounded-lg border border-hairline px-4 font-semibold" onClick={() => { setDeleteTarget(null); setDeleteError(null) }}>Hủy</button><button type="button" disabled={deleteBusy || loading || !canAddEvidence || !files.some(file => file.id === deleteTarget.id && file.canDelete)} className="min-h-11 rounded-lg bg-status-error-text hover:opacity-90 px-4 font-semibold text-white disabled:opacity-50" onClick={() => void removeFile()}>{deleteBusy ? 'Đang xóa…' : 'Xác nhận xóa'}</button></div>
    </Modal>}
  </section>
}

function Pager({ page, total, onChange }: { page: number; total: number; onChange: (page: number) => void }) { return <nav aria-label="Phân trang" className="mt-3 flex items-center justify-between gap-2 text-xs"><button type="button" disabled={page <= 1} className="min-h-11 underline disabled:opacity-40" onClick={() => onChange(page - 1)}>Trước</button><span>{page} / {Math.ceil(total / 20)}</span><button type="button" disabled={page >= Math.ceil(total / 20)} className="min-h-11 underline disabled:opacity-40" onClick={() => onChange(page + 1)}>Sau</button></nav> }
