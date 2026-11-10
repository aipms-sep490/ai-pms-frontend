import { useEffect, useRef, useState } from 'react'
import { ImportDialog } from '../../../components/ui/ImportDialog'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { TableCell } from '../../../components/ui/Table'
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
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => { request.current?.abort() }, [])
  function resetPreview() { setPreview(null); setConfirmed(false); setError(null); setCreated(null) }
  function chooseFile(next: File | null) {
    resetPreview(); setFile(null)
    if (!next) return
    if (!/\.(csv|xlsx)$/i.test(next.name)) { setError('Chọn tệp CSV hoặc XLSX.'); return }
    if (!next.size || next.size > 5 * 1024 * 1024) { setError('Tệp phải có dữ liệu và không quá 5 MB.'); return }
    setFile(next)
  }
  const canCommit = !!preview?.canCommit && preview.majorId === Number(scope.majorId)
    && preview.rows.length > 0 && preview.rows.length <= 500 && preview.rows.every(row => row.errors.length === 0)

  async function run(action: 'preview' | 'commit') {
    if (request.current || !session || !isAdmin || !file || !scope.majorId || (action === 'commit' && (!canCommit || !confirmed))) return
    const controller = new AbortController(); request.current = controller
    setPending(action); setError(null); setCreated(null); setConfirmed(false)
    if (action === 'preview') setPreview(null)
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

  return <ImportDialog<StudentImportPreview['rows'][number]> title="Nhập tài khoản sinh viên từ Excel"
    description="Tạo tài khoản hàng loạt. Sinh viên đăng nhập bằng Google với đúng email trong file."
    onClose={onClose} authorized={isAdmin && !!session} unauthorizedMessage="Chỉ Admin được nhập tài khoản sinh viên."
    busy={!!pending} notice={<><p>Bắt buộc: <strong>MSSV, Họ tên, Email</strong>. Tùy chọn: SĐT, Khung. Tối đa 500 sinh viên, 5 MB; CSV UTF-8 hoặc XLSX một trang tính.</p><p>Dùng email Gmail hoặc email trường do Google Workspace quản lý. Mỗi lô thuộc một chuyên ngành. Tài khoản mới có vai trò Sinh viên, hồ sơ học vụ chờ xác minh và chưa được xếp nhóm.</p></>}
    templateHref="/templates/student-accounts-import.csv" fileLabel="File danh sách sinh viên" file={file}
    accept=".csv,.xlsx" limits="5 MB · 500 dòng" onFileChange={chooseFile}
    beforeFile={<AcademicScopeFields {...scope} disabled={!!pending} onChange={next => { setScope(next); resetPreview() }} />}
    previewButtonLabel="Xem trước danh sách" previewDisabled={!file || !scope.majorId}
    onPreview={() => void run('preview')} error={error}
    success={created === null ? null : `Đã tạo ${created} tài khoản sinh viên. Sinh viên có thể chọn Đăng nhập với Google bằng email đã nhập.`}
    preview={preview && { rows: preview.rows, label: 'Danh sách tài khoản sẽ tạo', regionLabel: 'Chi tiết sinh viên nhập',
      columns: ['Dòng / MSSV', 'Họ tên / Email', 'SĐT / Khung', 'Kết quả'],
      getKey: row => row.account.rowNumber, getStatus: row => row.errors.length ? 'error' : 'valid',
      renderRow: ({ account, errors: rowErrors }) => <>
        <TableCell label="Dòng / MSSV">{account.rowNumber}<br /><strong>{account.studentCode || 'Thiếu MSSV'}</strong></TableCell>
        <TableCell label="Họ tên / Email">{account.fullName}<br />{account.email}</TableCell>
        <TableCell label="SĐT / Khung">{account.phone || '—'}<br />{account.curriculumCode || '—'}</TableCell>
        <TableCell label="Kết quả">{rowErrors.length ? rowErrors.map((code, index) => <p key={index} className="text-status-error-text">{errors[code] ?? code}</p>) : <StatusBadge tone="success" label="Sẽ tạo mới" />}</TableCell>
      </>, validLabel: 'sẽ tạo mới', warningLabel: 'sẽ cập nhật', canCommit, commitCount: preview.rows.length,
      confirmationLabel: `Tôi đã kiểm tra và xác nhận tạo ${preview.rows.length} tài khoản sinh viên đăng nhập Google.`,
      invalidMessage: 'Chưa thể tạo tài khoản. Sửa các dòng lỗi rồi chọn lại file; tài khoản đã tồn tại sẽ không bị ghi đè.',
      extra: <p><strong>{preview.departmentName} · {preview.majorName}</strong></p> }}
    confirmed={confirmed} onConfirmedChange={setConfirmed} onCommit={() => void run('commit')}
    commitLabel="Tạo tài khoản sinh viên" commitAccessibleName="Tạo tài khoản sinh viên" commitBusyLabel="Đang tạo…" commitIcon="person_add" />
}
