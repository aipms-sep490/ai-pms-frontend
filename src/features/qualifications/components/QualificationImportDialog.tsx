import { useEffect, useRef, useState } from 'react'
import { ImportDialog } from '../../../components/ui/ImportDialog'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { TableCell } from '../../../components/ui/Table'
import { HttpError } from '../../../services/http/http-client'
import {
  commitQualificationImport,
  previewQualificationImport,
  type StudentQualificationImportPreview,
} from '../../../services/api/student-qualifications.api'
import { useAuthSession } from '../../auth/context/useAuthSession'

const ERROR_LABELS: Record<string, string> = {
  STUDENT_CODE_INVALID: 'MSSV không hợp lệ.',
  INVALID_QUALIFICATION_TYPE: 'Mã loại chứng chỉ không thuộc danh mục chuẩn (CAPSTONE_READINESS, CREDITS_THRESHOLD, ENGLISH_PROFICIENCY, INTERNSHIP_COMPLETED).',
  STUDENT_NOT_FOUND: 'Không tìm thấy sinh viên theo MSSV.',
  STUDENT_OUTSIDE_DEPARTMENT: 'Sinh viên thuộc khoa khác.',
  STUDENT_NOT_ACTIVE: 'Tài khoản sinh viên chưa hoạt động.',
  DUPLICATE_ROW: 'Trùng MSSV và loại chứng chỉ trong tệp.',
  EXPIRATION_BEFORE_ISSUED: 'Ngày hết hạn phải sau ngày cấp.',
  IMPORT_HEADERS_REQUIRE_MSSV_AND_TYPE: 'File cần có cột MSSV (và tùy chọn Mã loại chứng chỉ, Số chứng nhận, Ngày cấp, Ngày hết hạn).',
  IMPORT_REQUIRES_1_TO_500_ROWS: 'Tệp cần có từ 1 đến 500 dòng dữ liệu.',
  IMPORT_FILE_SIZE_INVALID: 'Tệp phải có dữ liệu và không quá 5 MB.',
  IMPORT_FORMAT_REQUIRED_XLSX_OR_CSV: 'Chỉ hỗ trợ CSV UTF-8 hoặc XLSX.',
}

export function QualificationImportDialog({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const { session } = useAuthSession()
  const isStaff = session?.user.roles.some(r => r.toUpperCase() === 'DEPARTMENT_STAFF') === true
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<StudentQualificationImportPreview | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [pending, setPending] = useState<'preview' | 'commit' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => () => { controllerRef.current?.abort() }, [])

  function chooseFile(next: File | null) {
    setPreview(null); setConfirmed(false); setError(null); setSummary(null); setFile(null)
    if (!next) return
    if (!/\.(csv|xlsx)$/i.test(next.name)) { setError('Chỉ hỗ trợ CSV hoặc XLSX.'); return }
    if (!next.size || next.size > 5 * 1024 * 1024) { setError('Tệp phải có dữ liệu và không quá 5 MB.'); return }
    setFile(next)
  }

  async function run(action: 'preview' | 'commit') {
    if (controllerRef.current || !file || !isStaff || (action === 'commit' && (!preview?.canCommit || !confirmed))) return
    const controller = new AbortController()
    controllerRef.current = controller
    setPending(action); setError(null); setSummary(null); setConfirmed(false)
    if (action === 'preview') setPreview(null)
    try {
      if (action === 'preview') {
        const result = await previewQualificationImport(file, controller.signal)
        if (!controller.signal.aborted) setPreview(result)
      } else {
        const result = await commitQualificationImport(preview!.rows.map(r => r.row), controller.signal)
        if (!controller.signal.aborted) {
          setPreview(null)
          setSummary(`Đã xác nhận đủ điều kiện cho ${result.upsertedCount} sinh viên (${result.createdCount} tạo mới, ${result.updatedCount} cập nhật).`)
          onImported()
        }
      }
    } catch (reason) {
      if (!controller.signal.aborted) {
        setError(reason instanceof HttpError ? (reason.problem?.detail || 'Không xử lý được tệp nhập.') : 'Chưa kết nối được máy chủ.')
        setPreview(null)
      }
    } finally {
      if (!controller.signal.aborted) { controllerRef.current = null; setPending(null) }
    }
  }

  return (
    <ImportDialog<StudentQualificationImportPreview['rows'][number]>
      title="Nhập danh sách sinh viên đủ điều kiện (Excel/CSV)"
      description="Xác nhận hàng loạt điều kiện tham gia đồ án cho sinh viên thuộc Khoa của bạn mà không cần sinh viên nộp PDF lẻ."
      onClose={onClose}
      authorized={isStaff && Boolean(session)}
      unauthorizedMessage="Chỉ Cán bộ bộ môn (DEPARTMENT_STAFF) được nhập danh sách sinh viên đủ điều kiện."
      busy={Boolean(pending)}
      notice={<p>Cột bắt buộc: <strong>MSSV</strong>. Tùy chọn: <strong>Mã loại chứng chỉ</strong> (mặc định <code>CAPSTONE_READINESS</code>), Số chứng nhận, Ngày cấp, Ngày hết hạn (YYYY-MM-DD). Tối đa 500 dòng.</p>}
      templateHref="/templates/student-qualifications-import.csv"
      fileLabel="File danh sách đủ điều kiện"
      file={file}
      accept=".csv,.xlsx"
      limits="5 MB · 500 dòng"
      onFileChange={chooseFile}
      previewButtonLabel="Xem trước danh sách"
      previewDisabled={!file}
      onPreview={() => void run('preview')}
      error={error}
      success={summary}
      preview={preview && {
        rows: preview.rows,
        label: `Danh sách sinh viên đủ điều kiện (${preview.departmentName})`,
        regionLabel: 'Chi tiết danh sách đủ điều kiện',
        columns: ['Dòng / MSSV', 'Sinh viên', 'Loại chứng chỉ / Số CN', 'Kết quả'],
        getKey: item => item.row.rowNumber,
        getStatus: item => item.errors.length ? 'error' : 'valid',
        renderRow: ({ row, studentFullName, errors: rowErrors }) => (
          <>
            <TableCell label="Dòng / MSSV">{row.rowNumber}<br /><strong>{row.studentCode || 'Thiếu MSSV'}</strong></TableCell>
            <TableCell label="Sinh viên">{studentFullName || '—'}</TableCell>
            <TableCell label="Loại chứng chỉ / Số CN"><code>{row.qualificationType}</code>{row.certificateNumber ? ` · ${row.certificateNumber}` : ''}</TableCell>
            <TableCell label="Kết quả">
              {rowErrors.length
                ? rowErrors.map((code, idx) => <p key={idx} className="text-status-error-text">{ERROR_LABELS[code] ?? code}</p>)
                : <StatusBadge tone="success" label="Hợp lệ (VERIFIED)" />}
            </TableCell>
          </>
        ),
        validLabel: 'hợp lệ',
        warningLabel: 'cập nhật',
        canCommit: preview.canCommit,
        commitCount: preview.rows.length,
        confirmationLabel: `Tôi xác nhận đánh dấu VERIFIED cho ${preview.rows.length} dòng điều kiện tham gia đồ án thuộc Khoa ${preview.departmentName}.`,
        invalidMessage: 'Có dòng dữ liệu không hợp lệ hoặc ngoài phạm vi Khoa. Vui lòng chỉnh sửa file rồi xem trước lại.',
      }}
      confirmed={confirmed}
      onConfirmedChange={setConfirmed}
      onCommit={() => void run('commit')}
      commitLabel="Xác nhận nhập đủ điều kiện"
      commitAccessibleName="Xác nhận nhập đủ điều kiện"
      commitBusyLabel="Đang nhập…"
      commitIcon="upload_file"
    />
  )
}
