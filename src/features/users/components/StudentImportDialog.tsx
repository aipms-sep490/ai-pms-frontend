import { useEffect, useRef, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { HttpError } from '../../../services/http/http-client'
import { AcademicScopeFields } from '../../academic/components/AcademicScopeFields'
import { useAuthSession } from '../../auth/context/useAuthSession'
import { getWorkspaceRole } from '../../auth/utils/role-access'
import { commitStudentImport, previewStudentImport, type StudentImportPreview } from '../api/student-import-api'
import './curriculum-import.css'

const errors: Record<string, string> = {
  STUDENT_CODE_INVALID: 'MSSV thiếu hoặc không hợp lệ (tối đa 50 ký tự).', FULL_NAME_INVALID: 'Họ tên thiếu hoặc không hợp lệ (tối đa 255 ký tự).',
  EMAIL_INVALID: 'Email không hợp lệ.', PHONE_INVALID: 'SĐT không hợp lệ (tối đa 30 ký tự).', CURRICULUM_CODE_INVALID: 'Khung không hợp lệ (tối đa 100 ký tự).',
  DUPLICATE_EMAIL: 'Email trùng trong tệp.', DUPLICATE_STUDENT_CODE: 'MSSV trùng trong tệp.', EMAIL_ALREADY_EXISTS: 'Email đã có tài khoản.', STUDENT_CODE_ALREADY_EXISTS: 'MSSV đã có tài khoản.',
  IMPORT_ACTIVE_MAJOR_REQUIRED: 'Chọn chuyên ngành đang hoạt động.', IMPORT_HEADERS_REQUIRE_MSSV_NAME_EMAIL: 'Dòng đầu phải có MSSV, Họ tên, Email và không trùng tên cột.',
  IMPORT_FILE_INVALID: 'Không đọc được tệp. Kiểm tra định dạng CSV UTF-8 hoặc XLSX.', IMPORT_NO_DATA: 'Tệp chưa có dòng dữ liệu.',
  IMPORT_FILE_SIZE_INVALID: 'Tệp phải có dữ liệu và không quá 5 MB.', IMPORT_REQUIRES_1_TO_500_ROWS: 'Tệp cần có từ 1 đến 500 sinh viên.',
  IMPORT_LIMIT_EXCEEDED: 'Tệp vượt giới hạn 500 dòng hoặc 64 cột.', IMPORT_REQUIRES_ONE_WORKSHEET: 'Excel cần đúng một trang tính.',
  IMPORT_FORMULAS_NOT_ALLOWED: 'Tệp không được chứa công thức Excel.', IMPORT_WORKBOOK_UNSUPPORTED: 'Không hỗ trợ macro hoặc liên kết workbook ngoài.',
  IMPORT_FORMAT_REQUIRED_XLSX_OR_CSV: 'Chỉ hỗ trợ CSV hoặc XLSX.',
}
function errorMessage(reason: unknown, saving: boolean) {
  if (reason instanceof HttpError) {
    if (reason.status === 409) return 'Một số tài khoản đã được tạo hoặc dữ liệu đã thay đổi. Xem trước lại trước khi xác nhận.'
    if (reason.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    if (reason.status === 403) return 'Chỉ Admin đang hoạt động được nhập tài khoản sinh viên.'
    if (reason.status === 413) return 'Tệp quá lớn. Giới hạn 5 MB.'
    if (reason.status === 400) {
      const details = (reason.problem as { errors?: unknown } | undefined)?.errors
      const codes = details && typeof details === 'object' ? Object.values(details).flat().filter((code): code is string => typeof code === 'string') : []
      return codes.map(code => errors[code] ?? code).join(' ') || 'Dữ liệu không hợp lệ. Kiểm tra tệp và chuyên ngành.'
    }
  }
  return saving ? 'Chưa xác nhận được kết quả tạo tài khoản. Hãy xem trước lại để đối chiếu dữ liệu trước khi gửi tiếp.' : 'Không đọc được tệp từ máy chủ. Vui lòng thử lại.'
}

export function StudentImportDialog({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const { session } = useAuthSession()
  const isAdmin = getWorkspaceRole(session?.user) === 'admin'
  const [scope, setScope] = useState({ departmentId: '', majorId: '' })
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<StudentImportPreview | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [pending, setPending] = useState<'preview' | 'commit' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [onlyErrors, setOnlyErrors] = useState(false)
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => { request.current?.abort() }, [])
  function resetPreview() { setPreview(null); setConfirmed(false); setError(null); setCreated(null); setPage(1); setOnlyErrors(false) }
  function chooseFile(next: File | null) {
    resetPreview(); setFile(null)
    if (!next) return
    if (!/\.(csv|xlsx)$/i.test(next.name)) { setError('Chọn tệp CSV hoặc XLSX.'); return }
    if (!next.size || next.size > 5 * 1024 * 1024) { setError('Tệp phải có dữ liệu và không quá 5 MB.'); return }
    setFile(next)
  }
  const canCommit = !!preview?.canCommit && preview.majorId === Number(scope.majorId)
    && preview.rows.length > 0 && preview.rows.length <= 500 && preview.rows.every(row => row.errors.length === 0)
  const visibleRows = preview?.rows.filter(row => !onlyErrors || row.errors.length > 0) ?? []
  const pages = Math.max(1, Math.ceil(visibleRows.length / 25))

  async function run(action: 'preview' | 'commit') {
    if (request.current || !session || !isAdmin || !file || !scope.majorId || (action === 'commit' && (!canCommit || !confirmed))) return
    const controller = new AbortController(); request.current = controller
    setPending(action); setError(null); setCreated(null); setConfirmed(false)
    if (action === 'preview') { setPreview(null); setPage(1); setOnlyErrors(false) }
    try {
      if (action === 'preview') {
        const data = await previewStudentImport(file, Number(scope.majorId), session.accessToken, controller.signal)
        if (!controller.signal.aborted) setPreview(data)
      } else {
        const data = await commitStudentImport(preview!.majorId, preview!.rows.map(row => row.account), session.accessToken, controller.signal)
        if (!controller.signal.aborted) { setPreview(null); setCreated(data.created); onImported() }
      }
    } catch (reason) {
      if (!controller.signal.aborted) { setError(errorMessage(reason, action === 'commit')); setPreview(null) }
    } finally {
      if (!controller.signal.aborted) { request.current = null; setPending(null) }
    }
  }

  return <Modal open drawer title="Nhập tài khoản sinh viên từ Excel" description="Tạo tài khoản hàng loạt. Sinh viên đăng nhập bằng Google với đúng email trong file." busy={!!pending} onClose={onClose}>
    <div className="curriculum-import" aria-busy={!!pending}>
      <p className="curriculum-import__guide">Bắt buộc: <strong>MSSV, Họ tên, Email</strong>. Tùy chọn: SĐT, Khung. Tối đa 500 sinh viên, 5 MB; CSV UTF-8 hoặc XLSX một trang tính. <a href="/templates/student-accounts-import.csv" download>Tải mẫu CSV</a></p>
      <p className="curriculum-import__guide">Dùng email Gmail hoặc email trường do Google Workspace quản lý. Mỗi lô thuộc một chuyên ngành. Tài khoản mới có vai trò Sinh viên, hồ sơ học vụ chờ xác minh và chưa được xếp nhóm.</p>
      {!isAdmin || !session ? <p role="alert">Chỉ Admin được nhập tài khoản sinh viên.</p> : <>
        <AcademicScopeFields {...scope} disabled={!!pending} onChange={next => { setScope(next); resetPreview() }} />
        <label className="curriculum-import__file">File danh sách sinh viên<input type="file" accept=".csv,.xlsx" disabled={!!pending} onChange={event => chooseFile(event.target.files?.[0] ?? null)} /></label>
        {file && <p className="curriculum-import__filename">{file.name} · {Math.max(1, Math.ceil(file.size / 1024))} KB</p>}
        <Button variant="outline" icon="preview" disabled={!file || !scope.majorId || !!pending} onClick={() => void run('preview')}>{pending === 'preview' ? 'Đang kiểm tra…' : 'Xem trước danh sách'}</Button>
        {error && <p role="alert" className="curriculum-import__error">{error}</p>}
        {created !== null && <p role="status" className="curriculum-import__success">Đã tạo {created} tài khoản sinh viên. Sinh viên có thể chọn Đăng nhập với Google bằng email đã nhập.</p>}
        {preview && <section aria-label="Danh sách tài khoản sẽ tạo">
          <p><strong>{preview.departmentName} · {preview.majorName}</strong></p>
          <p role="status">{preview.rows.length} sinh viên · {preview.rows.filter(row => row.errors.length > 0).length} dòng lỗi</p>
          <label className="curriculum-import__check"><input type="checkbox" checked={onlyErrors} onChange={event => { setOnlyErrors(event.target.checked); setPage(1) }} />Chỉ hiện dòng lỗi</label>
          <div className="curriculum-import__table" role="region" tabIndex={0} aria-label="Chi tiết sinh viên nhập"><table><caption>Kiểm tra thông tin trước khi tạo tài khoản</caption><thead><tr><th>Dòng / MSSV</th><th>Họ tên / Email</th><th>SĐT / Khung</th><th>Kết quả</th></tr></thead><tbody>
            {visibleRows.slice((page - 1) * 25, page * 25).map(({ account, errors: rowErrors }) => <tr key={account.rowNumber}><td>{account.rowNumber}<br /><strong>{account.studentCode || 'Thiếu MSSV'}</strong></td><td>{account.fullName}<br />{account.email}</td><td>{account.phone || '—'}<br />{account.curriculumCode || '—'}</td><td>{rowErrors.length ? rowErrors.map((code, index) => <p key={index}>{errors[code] ?? code}</p>) : <span className="curriculum-import__status curriculum-import__status--update">Sẽ tạo mới</span>}</td></tr>)}
          </tbody></table></div>
          {!visibleRows.length && <p>Không có dòng phù hợp bộ lọc.</p>}
          {pages > 1 && <div className="curriculum-import__pagination"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Trang trước</Button><span>Trang {page}/{pages}</span><Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(value => value + 1)}>Trang sau</Button></div>}
          {!canCommit ? <p className="curriculum-import__error">Chưa thể tạo tài khoản. Sửa các dòng lỗi rồi chọn lại file; tài khoản đã tồn tại sẽ không bị ghi đè.</p> : <label className="curriculum-import__check"><input type="checkbox" checked={confirmed} disabled={!!pending} onChange={event => setConfirmed(event.target.checked)} />Tôi đã kiểm tra và xác nhận tạo {preview.rows.length} tài khoản sinh viên đăng nhập Google.</label>}
        </section>}
      </>}
      <div className="app-modal__actions"><Button variant="outline" disabled={!!pending} onClick={onClose}>Đóng</Button><Button icon="person_add" disabled={!isAdmin || !session || !canCommit || !confirmed || !!pending} onClick={() => void run('commit')}>{pending === 'commit' ? 'Đang tạo…' : 'Tạo tài khoản sinh viên'}</Button></div>
    </div>
  </Modal>
}
