import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { HttpError } from '../../../services/http/http-client'
import * as api from '../task-evidence-api'
import type { TaskComment, TaskFile } from '../task-evidence-api'
import { createProjectEvidence } from '../../projects/api/project-governance-api'

export function TaskEvidenceAndComments({ taskId, projectId, majors, mentorMajorId, canAddEvidence }: { taskId: number; projectId: number; majors: Array<{ majorId: number; majorCode: string; majorName: string }>; mentorMajorId: number | null; canAddEvidence: boolean }) {
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

  const load = useCallback(async () => {
    setLoading(true)
    setLoaded(false); setFiles([]); setComments([])
    try {
      const [evidence, discussion] = await Promise.all([api.getTaskEvidence(taskId, filePage), api.getTaskComments(taskId, commentPage)])
      setFiles(evidence.items); setFileTotal(evidence.totalCount)
      setComments(discussion.items); setCommentTotal(discussion.totalCount)
      setLoaded(true)
      setError(null)
    } catch (reason) { setError(reason instanceof HttpError && reason.status === 403 ? 'Backend không cấp quyền xem evidence hoặc bình luận Task này.' : 'Không thể tải evidence và bình luận.') }
    finally { setLoading(false) }
  }, [taskId, filePage, commentPage])
  useEffect(() => { void load() }, [load])

  const mutate = async (operation: () => Promise<unknown>, onSuccess?: () => void) => {
    setBusy(true)
    try { await operation(); onSuccess?.(); await load() }
    catch (reason) {
      if (reason instanceof HttpError && reason.status === 409) await load()
      setError(reason instanceof HttpError && reason.status === 409 ? 'Dữ liệu đã thay đổi. Danh sách đã được tải lại; hãy kiểm tra trước khi thử tiếp.' : 'Backend từ chối thao tác hoặc tệp không hợp lệ.')
    } finally { setBusy(false) }
  }

  const upload = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const input = event.currentTarget.elements.namedItem('file')
    const file = input instanceof HTMLInputElement ? input.files?.item(0) : null
    if (!file) { setError('Hãy chọn tệp evidence.'); return }
    void mutate(() => api.uploadTaskEvidence(taskId, file), () => { if (input instanceof HTMLInputElement) input.value = '' })
  }
  const submitEvidence = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canAddEvidence) return
    setEvidenceBusy(true); setEvidenceNotice(''); setError(null)
    try {
      await createProjectEvidence(projectId, { sourceType: 'TASK', sourceId: taskId, majorId: mentorMajorId ?? evidenceMajorId, notes: evidenceNotes.trim() || null })
      setEvidenceNotes(''); setEvidenceNotice('Evidence của Task đã được backend ghi nhận hoặc đã tồn tại.')
      await load()
    } catch (reason) {
      if (reason instanceof HttpError && reason.status === 409) {
        setError('Evidence đã thay đổi hoặc trùng với dữ liệu khác. Danh sách đã được tải lại để bạn kiểm tra.')
        await load()
      } else if (reason instanceof HttpError && reason.status === 403) setError('Backend không cấp quyền ghi evidence cho Task này.')
      else setError('Không thể ghi evidence. Hãy kiểm tra lại và thử lại.')
    } finally { setEvidenceBusy(false) }
  }
  const comment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!content.trim()) return
    void mutate(() => api.addTaskComment(taskId, content.trim()), () => setContent(''))
  }
  const download = async (file: TaskFile) => {
    try {
      const blob = await api.downloadTaskEvidence(file.id)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = file.fileName; anchor.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch { setError('Không thể tải tệp evidence.') }
  }

  if (!loading && !loaded) return <section role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm">{error ?? 'Không thể tải evidence và bình luận.'} <button type="button" className="font-semibold underline" onClick={() => void load()}>Tải lại</button></section>

  return <section className="grid gap-4 lg:grid-cols-2">
    {error && <p role="alert" className="lg:col-span-2 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm">{error} <button type="button" className="font-semibold underline" onClick={() => void load()}>Tải lại</button></p>}
    {loading && <p role="status" className="lg:col-span-2 text-sm">Đang tải evidence và bình luận…</p>}
    <div className="rounded-xl border bg-white p-5"><h2 className="font-semibold">Evidence của Task</h2>{canAddEvidence ? <><form onSubmit={submitEvidence} className="mt-4 space-y-3"><p className="text-sm text-slate-600">Nguồn evidence được cố định là công việc này; backend tự xác định người gửi, thời điểm gửi và trạng thái xác minh.</p>{mentorMajorId ? <p className="text-sm text-slate-600">Chuyên ngành mentor: {majors.find(item => item.majorId === mentorMajorId)?.majorName ?? mentorMajorId}</p> : majors.length > 0 && <label className="block text-sm">Chuyên ngành (nếu áp dụng)<select value={evidenceMajorId ?? ''} onChange={event => setEvidenceMajorId(event.target.value ? Number(event.target.value) : null)} className="mt-1 block w-full rounded-lg border p-3" disabled={evidenceBusy}><option value="">Không gắn chuyên ngành</option>{majors.map(major => <option key={major.majorId} value={major.majorId}>{major.majorCode} · {major.majorName}</option>)}</select></label>}<label className="block text-sm">Ghi chú evidence<textarea value={evidenceNotes} maxLength={2000} onChange={event => setEvidenceNotes(event.target.value)} rows={3} className="mt-1 w-full rounded-lg border p-3" disabled={evidenceBusy} /></label><button disabled={evidenceBusy} className="min-h-11 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white disabled:opacity-50">{evidenceBusy ? 'Đang ghi nhận…' : 'Ghi nhận evidence'}</button></form>{evidenceNotice && <p role="status" className="mt-3 text-sm text-emerald-700">{evidenceNotice}</p>}<form onSubmit={upload} className="mt-4 flex flex-wrap items-end gap-2 border-t pt-4"><label className="text-sm">Đính kèm tệp Task<input type="file" name="file" className="mt-1 block max-w-full text-sm" disabled={busy} /></label><button disabled={busy} className="min-h-11 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white disabled:opacity-50">Tải lên</button></form></> : <p className="mt-3 text-sm leading-6 text-slate-600">Backend chưa xác nhận quyền bổ sung evidence cho Task này.</p>}{!loading && files.length === 0 && <p className="mt-4 text-sm text-slate-600">Chưa có tệp đính kèm.</p>}<ul className="mt-4 space-y-2">{files.map(file => <li key={file.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-3 text-sm"><span>{file.fileName} · {Math.ceil(file.sizeBytes / 1024)} KB</span><span className="flex gap-3"><button type="button" className="min-h-11 font-semibold text-blue-700 underline" onClick={() => void download(file)}>Tải xuống</button></span></li>)}</ul>{fileTotal > 20 && <Pager page={filePage} total={fileTotal} onChange={setFilePage} />}</div>
    <div className="rounded-xl border bg-white p-5"><h2 className="font-semibold">Bình luận</h2><form onSubmit={comment} className="mt-4 space-y-2"><label className="block text-sm">Nội dung<textarea value={content} maxLength={5000} onChange={event => setContent(event.target.value)} rows={3} className="mt-1 w-full rounded-lg border p-3" disabled={busy} /></label><button disabled={busy || !content.trim()} className="min-h-11 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white disabled:opacity-50">Gửi bình luận</button></form>{!loading && comments.length === 0 && <p className="mt-4 text-sm text-slate-600">Chưa có bình luận.</p>}<ul className="mt-4 space-y-3">{comments.map(item => <li key={item.id} className="rounded-lg bg-slate-50 p-3 text-sm"><strong>{item.authorName}</strong><span className="ml-2 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString('vi-VN')}</span><p className="mt-1 whitespace-pre-wrap">{item.content}</p></li>)}</ul>{commentTotal > 20 && <Pager page={commentPage} total={commentTotal} onChange={setCommentPage} />}</div>
  </section>
}

function Pager({ page, total, onChange }: { page: number; total: number; onChange: (page: number) => void }) { return <nav aria-label="Phân trang" className="mt-3 flex items-center justify-between gap-2 text-xs"><button type="button" disabled={page <= 1} className="min-h-11 underline disabled:opacity-40" onClick={() => onChange(page - 1)}>Trước</button><span>{page} / {Math.ceil(total / 20)}</span><button type="button" disabled={page >= Math.ceil(total / 20)} className="min-h-11 underline disabled:opacity-40" onClick={() => onChange(page + 1)}>Sau</button></nav> }
