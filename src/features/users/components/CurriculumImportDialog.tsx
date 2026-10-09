import { useEffect, useRef, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { HttpError } from '../../../services/http/http-client'
import { useAuthSession } from '../../auth/context/useAuthSession'
import { getWorkspaceRole } from '../../auth/utils/role-access'
import { commitCurriculum, curriculumCommitRows, previewCurriculum, type CurriculumPreview, type CurriculumCommitResult } from '../api/curriculum-import-api'
import './curriculum-import.css'

const labels: Record<string, string> = { UPDATE: 'Sẽ cập nhật', UNCHANGED: 'Không đổi', SKIPPED: 'Bỏ qua', ERROR: 'Có lỗi' }
const errorLabels: Record<string, string> = {
  STUDENT_CODE_INVALID: 'MSSV không hợp lệ.', DUPLICATE_STUDENT_CODE: 'MSSV bị trùng trong tệp.',
  CURRICULUM_CODE_INVALID: 'Khung không hợp lệ (tối đa 100 ký tự).', STUDENT_NOT_FOUND: 'Không tìm thấy sinh viên duy nhất khớp MSSV.',
  STUDENT_ROLE_REQUIRED: 'Tài khoản chưa có vai trò sinh viên.', IMPORT_FILE_SIZE_INVALID: 'Tệp phải có dữ liệu và không quá 5 MB.',
  IMPORT_FORMAT_REQUIRED_XLSX_OR_CSV: 'Chỉ hỗ trợ tệp CSV hoặc XLSX.', IMPORT_NO_DATA: 'Tệp chưa có dòng dữ liệu.',
  IMPORT_HEADERS_REQUIRE_UNIQUE_MSSV_AND_CURRICULUM: 'Dòng đầu phải có hai cột MSSV và Khung, không trùng tên cột.',
  IMPORT_REQUIRES_1_TO_500_ROWS: 'Tệp phải có từ 1 đến 500 dòng dữ liệu.', IMPORT_LIMIT_EXCEEDED: 'Tệp vượt giới hạn 500 dòng hoặc 64 cột.',
  IMPORT_REQUIRES_ONE_WORKSHEET: 'Tệp Excel phải có đúng một trang tính.', IMPORT_FORMULAS_NOT_ALLOWED: 'Tệp không được chứa công thức Excel.',
  IMPORT_WORKBOOK_UNSUPPORTED: 'Tệp Excel chứa tính năng không hỗ trợ. Hãy dùng XLSX đơn giản, không macro hoặc liên kết ngoài.',
  IMPORT_FILE_INVALID: 'Không đọc được nội dung tệp. Kiểm tra định dạng CSV UTF-8 hoặc XLSX.', IMPORT_ROWS_INVALID: 'Dữ liệu cập nhật không hợp lệ. Hãy xem trước lại.',
}
function importError(reason: unknown, committing: boolean): string {
  if (reason instanceof HttpError) {
    if (reason.status === 409) return 'Dữ liệu sinh viên đã thay đổi. Hãy xem trước lại để lấy phiên bản mới trước khi xác nhận.'
    if (reason.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    if (reason.status === 403) return 'Chỉ Admin đang hoạt động mới được nhập Khung sinh viên.'
    if (reason.status === 413) return 'Tệp quá lớn. Vui lòng chọn tệp không quá 5 MB.'
    if (reason.status === 400) {
      const errors = (reason.problem as { errors?: unknown } | undefined)?.errors
      const codes = errors && typeof errors === 'object' ? Object.values(errors).flat().filter((code): code is string => typeof code === 'string') : []
      return codes.map(code => errorLabels[code] ?? code).join(' ') || 'Tệp hoặc dữ liệu không hợp lệ. Kiểm tra MSSV, Khung và định dạng tệp.'
    }
  }
  return committing ? 'Chưa xác nhận được kết quả lưu. Hãy xem trước lại để kiểm tra dữ liệu hiện tại trước khi gửi tiếp.' : 'Chưa xem trước được tệp. Vui lòng thử lại.'
}

export function CurriculumImportDialog({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const { session } = useAuthSession()
  const isAdmin = getWorkspaceRole(session?.user) === 'admin'
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<CurriculumPreview | null>(null)
  const [result, setResult] = useState<CurriculumCommitResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<'preview' | 'commit' | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [onlyErrors, setOnlyErrors] = useState(false)
  const [page, setPage] = useState(1)
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => { request.current?.abort() }, [])
  const rows = preview ? curriculumCommitRows(preview) : null
  const filtered = preview?.rows.filter(row => !onlyErrors || row.status === 'ERROR' || row.errors.length > 0) ?? []
  const pages = Math.max(1, Math.ceil(filtered.length / 25))
  const counts = (status: string) => preview?.rows.filter(row => row.status === status).length ?? 0

  function chooseFile(next: File | null) {
    setFile(null); setPreview(null); setResult(null); setError(null); setConfirmed(false); setPage(1); setOnlyErrors(false)
    if (!next) return
    if (!/\.(csv|xlsx)$/i.test(next.name)) { setError('Chỉ hỗ trợ tệp CSV hoặc XLSX.'); return }
    if (!next.size || next.size > 5 * 1024 * 1024) { setError('Tệp phải có dữ liệu và không quá 5 MB.'); return }
    setFile(next)
  }

  async function run(action: 'preview' | 'commit') {
    if (request.current || !isAdmin || !session || !file || (action === 'commit' && (!rows || !confirmed))) return
    const controller = new AbortController()
    request.current = controller
    setPending(action); setError(null); setResult(null); setConfirmed(false)
    if (action === 'preview') { setPreview(null); setPage(1); setOnlyErrors(false) }
    try {
      if (action === 'preview') {
        const data = await previewCurriculum(file, session.accessToken, controller.signal)
        if (!controller.signal.aborted) setPreview(data)
      } else {
        const data = await commitCurriculum(rows!, session.accessToken, controller.signal)
        if (!controller.signal.aborted) { setPreview(null); setResult(data); onImported() }
      }
    } catch (reason) {
      if (!controller.signal.aborted) {
        setError(importError(reason, action === 'commit'))
        // A lost response may have committed; never replay a possibly stale batch.
        setPreview(null)
      }
    } finally {
      if (!controller.signal.aborted) { request.current = null; setPending(null) }
    }
  }

  return <Modal open drawer title="Nhập Khung sinh viên" description="Chọn tệp MSSV + Khung, kiểm tra từng dòng rồi xác nhận cập nhật." busy={!!pending} onClose={onClose}>
    <div className="curriculum-import" aria-busy={!!pending}>
      <p className="curriculum-import__guide">Cập nhật Khung cho sinh viên đã có tài khoản theo MSSV. Khung để trống sẽ được bỏ qua; các thông tin tài khoản và thành viên nhóm được giữ nguyên.</p>
      <p className="curriculum-import__guide">CSV UTF-8 hoặc XLSX một trang tính, tối đa 500 dòng và 5 MB. Dòng đầu gồm <strong>MSSV</strong> và <strong>Khung</strong>. <a href="/templates/student-curriculum-import.csv" download>Tải mẫu CSV</a></p>
      {!isAdmin || !session ? <p role="alert">Chỉ Admin mới được nhập Khung sinh viên.</p> : <>
        <label className="curriculum-import__file">Tệp MSSV + Khung<input type="file" accept=".csv,.xlsx" disabled={!!pending} onChange={event => chooseFile(event.target.files?.[0] ?? null)} /></label>
        {file && <p className="curriculum-import__filename">{file.name} · {Math.max(1, Math.ceil(file.size / 1024))} KB</p>}
        <Button variant="outline" icon="preview" disabled={!file || !!pending} onClick={() => void run('preview')}>{pending === 'preview' ? 'Đang kiểm tra…' : 'Xem trước'}</Button>
        {error && <p className="curriculum-import__error" role="alert">{error}</p>}
        {result && <p className="curriculum-import__success" role="status">Đã cập nhật {result.updated} sinh viên; {result.unchanged} sinh viên không đổi.</p>}
        {preview && <section aria-label="Kết quả xem trước">
          <p role="status">{preview.rows.length} dòng: {counts('UPDATE')} cập nhật · {counts('UNCHANGED')} không đổi · {counts('SKIPPED')} bỏ qua · {counts('ERROR')} lỗi</p>
          <label className="curriculum-import__check"><input type="checkbox" checked={onlyErrors} onChange={event => { setOnlyErrors(event.target.checked); setPage(1) }} />Chỉ hiện dòng lỗi</label>
          <div className="curriculum-import__table" tabIndex={0} role="region" aria-label="Chi tiết từng dòng nhập">
            <table><caption>Đối chiếu dữ liệu hiện tại và Khung trong tệp</caption><thead><tr><th>Dòng</th><th>Sinh viên</th><th>Khung hiện tại</th><th>Khung trong tệp</th><th>Kết quả</th></tr></thead><tbody>
              {filtered.slice((page - 1) * 25, page * 25).map(row => <tr key={row.rowNumber}><td>{row.rowNumber}</td><td><strong>{row.studentCode || 'Thiếu MSSV'}</strong><br />{row.fullName ?? 'Chưa xác định'}</td><td>{row.currentCurriculumCode || '—'}</td><td>{row.curriculumCode || 'Trống'}</td><td><span className={`curriculum-import__status curriculum-import__status--${row.status.toLowerCase()}`}>{labels[row.status] ?? 'Chưa hỗ trợ'}</span>{row.errors.map((code, index) => <p key={`${code}-${index}`}>{errorLabels[code] ?? code}</p>)}</td></tr>)}
            </tbody></table>
          </div>
          {!filtered.length && <p>Không có dòng phù hợp bộ lọc.</p>}
          {pages > 1 && <div className="curriculum-import__pagination"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Trang trước</Button><span>Trang {page}/{pages}</span><Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(value => value + 1)}>Trang sau</Button></div>}
          {!rows && <p className="curriculum-import__error">Chưa thể cập nhật. Hãy sửa các dòng lỗi và chọn lại tệp; lô cần có ít nhất một dòng Khung hợp lệ.</p>}
          {rows && <label className="curriculum-import__check"><input type="checkbox" checked={confirmed} disabled={!!pending} onChange={event => setConfirmed(event.target.checked)} />Tôi đã kiểm tra và xác nhận cập nhật {counts('UPDATE')} sinh viên; giữ nguyên {counts('UNCHANGED')} sinh viên.</label>}
        </section>}
      </>}
      <div className="app-modal__actions"><Button variant="outline" disabled={!!pending} onClick={onClose}>Đóng</Button><Button icon="upload" disabled={!isAdmin || !session || !rows || !confirmed || !!pending} onClick={() => void run('commit')}>{pending === 'commit' ? 'Đang lưu…' : 'Xác nhận cập nhật'}</Button></div>
    </div>
  </Modal>
}
