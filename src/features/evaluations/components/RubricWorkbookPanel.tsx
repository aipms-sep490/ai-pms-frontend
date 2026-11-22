import { useEffect, useMemo, useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../../../components/ui/Table'
import { HttpError } from '../../../services/http/http-client'
import * as api from '../rubrics-api'
import type { CriterionInput, Rubric, RubricWorkbookStagedRow } from '../rubrics-api'

const WEIGHT_TOLERANCE = 0.001

function validateStagedRows(rows: RubricWorkbookStagedRow[]): { issues: Array<{ cell: string; message: string }>; errorRowIndices: Set<number> } {
  const issues: Array<{ cell: string; message: string }> = []
  const errorRowIndices = new Set<number>()
  if (!rows.length) {
    issues.push({ cell: 'Tiêu chí', message: 'Cần ít nhất một dòng tiêu chí hợp lệ.' })
    return { issues, errorRowIndices }
  }
  const codes = new Map<string, number>()
  rows.forEach((row, idx) => {
    const code = row.code.trim().toUpperCase()
    if (!code || !/^[A-Z0-9_]{1,40}$/.test(code) || codes.has(code)) {
      errorRowIndices.add(idx)
      issues.push({ cell: `Dòng ${idx + 1}`, message: `Mã tiêu chí "${row.code}" phải duy nhất (A-Z, 0-9, _).` })
    } else {
      codes.set(code, idx)
    }
    if (!row.name.trim()) {
      errorRowIndices.add(idx)
      issues.push({ cell: `Dòng ${idx + 1}`, message: 'Tên tiêu chí không được để trống.' })
    }
    if (!Number.isFinite(row.weightPercent) || row.weightPercent <= 0 || row.weightPercent > 100) {
      errorRowIndices.add(idx)
      issues.push({ cell: `Dòng ${idx + 1}`, message: 'Trọng số phải lớn hơn 0 và ≤ 100.' })
    }
  })

  const groups = new Map<string, Array<{ row: RubricWorkbookStagedRow; idx: number }>>()
  rows.forEach((row, idx) => {
    const parent = row.parentCode.trim().toUpperCase()
    if (parent && (!codes.has(parent) || parent === row.code.trim().toUpperCase())) {
      errorRowIndices.add(idx)
      issues.push({ cell: `Dòng ${idx + 1}`, message: `Mã cha "${row.parentCode}" không hợp lệ.` })
    }
    const bucket = groups.get(parent) ?? []
    bucket.push({ row, idx })
    groups.set(parent, bucket)
  })

  groups.forEach((entries, parentKey) => {
    const sum = entries.reduce((acc, entry) => acc + Number(entry.row.weightPercent || 0), 0)
    if (Math.abs(sum - 100) > WEIGHT_TOLERANCE) {
      entries.forEach(entry => errorRowIndices.add(entry.idx))
      issues.push({
        cell: parentKey ? `Nhóm ${parentKey}` : 'Nhóm gốc',
        message: `Tổng trọng số hiện tại ${sum.toFixed(3)}% phải bằng 100% (±0.001).`,
      })
    }
    const parentCodes = new Set(rows.map(r => r.parentCode.trim().toUpperCase()).filter(Boolean))
    entries.forEach(({ row, idx }) => {
      const isParent = parentCodes.has(row.code.trim().toUpperCase())
      if (!isParent && (row.maxScore == null || !Number.isFinite(row.maxScore) || row.maxScore <= 0)) {
        errorRowIndices.add(idx)
        issues.push({ cell: `Dòng ${idx + 1}`, message: `Tiêu chí lá "${row.name || row.code}" cần điểm tối đa > 0.` })
      }
    })
  })
  return { issues, errorRowIndices }
}

function buildCriteriaTree(rows: RubricWorkbookStagedRow[]): CriterionInput[] {
  const byParent = new Map<string, RubricWorkbookStagedRow[]>()
  rows.forEach(row => {
    const key = row.parentCode.trim().toUpperCase()
    const list = byParent.get(key) ?? []
    list.push(row)
    byParent.set(key, list)
  })
  const build = (parentKey: string): CriterionInput[] =>
    (byParent.get(parentKey) ?? [])
      .map((row, index) => {
        const children = build(row.code.trim().toUpperCase())
        return {
          name: row.name.trim(),
          description: row.description?.trim() || null,
          weightPercent: Number(row.weightPercent),
          maxScore: children.length ? null : Number(row.maxScore ?? 10),
          sortOrder: index,
          isRequired: children.length ? false : row.isRequired,
          learningOutcome: row.learningOutcome?.trim() || null,
          evidenceGuidance: row.evidenceGuidance?.trim() || null,
          targetScope: row.targetScope ?? null,
          isIntegration: row.isIntegration,
          levels: [],
          children,
        }
      })
  return build('')
}

export function RubricWorkbookPanel({ rubric, dirty, onCommitted }: {
  rubric: Rubric
  dirty: boolean
  onCommitted: (preview: api.RubricWorkbookPreview) => Promise<void>
}) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<api.RubricWorkbookPreview | null>(null)
  const [stagedRows, setStagedRows] = useState<RubricWorkbookStagedRow[]>([])
  const [editedLocally, setEditedLocally] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setFile(null)
    setPreview(null)
    setStagedRows([])
    setEditedLocally(false)
    setError('')
  }, [rubric.id, rubric.concurrencyToken])

  const localValidation = useMemo(() => (stagedRows.length ? validateStagedRows(stagedRows) : null), [stagedRows])
  const effectiveIssues = editedLocally && localValidation ? localValidation.issues : (preview?.issues ?? [])

  async function download() {
    setBusy(true); setError('')
    try {
      const blob = await api.downloadRubricWorkbook(rubric.id)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url; anchor.download = `rubric-${rubric.code}-v${rubric.version}.xlsx`
      document.body.append(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url)
    } catch { setError('Không tải được workbook. Hãy thử lại.') }
    finally { setBusy(false) }
  }

  async function inspect() {
    if (!file || dirty || !rubric.canEdit) return
    if (!file.name.toLowerCase().endsWith('.xlsx') || file.size === 0 || file.size > 5 * 1024 * 1024) {
      setError('Chọn tệp .xlsx từ 1 byte đến 5 MB.')
      setPreview(null)
      setStagedRows([])
      return
    }
    setBusy(true); setError(''); setPreview(null); setStagedRows([]); setEditedLocally(false)
    try {
      const result = await api.previewRubricWorkbook(rubric.id, file)
      setPreview(result)
      setStagedRows(result.stagedRows ?? [])
    } catch (reason) {
      setError(reason instanceof HttpError && reason.status === 409
        ? 'Workbook đã cũ hoặc thuộc bản tiêu chí khác. Tải lại bản mới để nhập.'
        : 'Không đọc được workbook. Kiểm tra định dạng XLSX và giới hạn 5 MB.')
    } finally { setBusy(false) }
  }

  function updateStagedRow(index: number, patch: Partial<RubricWorkbookStagedRow>) {
    setEditedLocally(true)
    setStagedRows(current => current.map((row, idx) => (idx === index ? { ...row, ...patch } : row)))
  }

  function addStagedRow() {
    setEditedLocally(true)
    setStagedRows(current => [
      ...current,
      {
        rowNumber: current.length + 2,
        code: `C${current.length + 1}`,
        parentCode: '',
        name: 'Tiêu chí mới',
        description: null,
        weightPercent: 0,
        maxScore: 10,
        sortOrder: current.length,
        isRequired: true,
        learningOutcome: null,
        evidenceGuidance: null,
        targetScope: null,
        isIntegration: false,
        hasError: false,
      },
    ])
  }

  function removeStagedRow(index: number) {
    setEditedLocally(true)
    setStagedRows(current => current.filter((_, idx) => idx !== index))
  }

  const canCommit = Boolean(
    preview && !dirty && effectiveIssues.length === 0 && (editedLocally ? stagedRows.length > 0 : Boolean(preview.draft)),
  )

  async function commit() {
    if (!preview || !canCommit) return
    setBusy(true); setError('')
    try {
      const payload: api.RubricWorkbookPreview = editedLocally
        ? {
            draft: {
              name: preview.draft?.name ?? rubric.name,
              description: preview.draft?.description ?? rubric.description,
              majorId: rubric.majorId,
              projectMode: rubric.projectMode,
              evaluationStage: rubric.evaluationStage,
              evaluationScope: rubric.evaluationScope,
              effectiveFrom: rubric.effectiveFrom,
              effectiveTo: rubric.effectiveTo,
              criteria: buildCriteriaTree(stagedRows),
              concurrencyToken: rubric.concurrencyToken,
            },
            issues: [],
            changes: [`Đã chỉnh sửa trực tiếp ${stagedRows.length} dòng trên Staging Grid.`],
            stagedRows,
          }
        : preview
      await onCommitted(payload)
      setPreview(null); setFile(null); setStagedRows([]); setEditedLocally(false)
    } catch {
      setError('Chưa lưu được bản nháp; workbook và nội dung xem trước vẫn được giữ để đối chiếu.')
    } finally { setBusy(false) }
  }

  return <section className="rounded-xl border border-hairline bg-card p-4" aria-label="Nhập xuất tiêu chí bằng Excel">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-sm font-bold text-ink">Nhập xuất tiêu chí bằng Excel</h2>
        <p className="text-xs text-ink-muted">Workbook có sẵn Data Validation và hỗ trợ Staging Preview Grid để sửa lỗi trực tiếp trước khi lưu.</p></div>
      <button type="button" className="min-h-11 rounded-lg border border-primary px-3 text-sm font-semibold text-primary disabled:opacity-50"
        disabled={busy} onClick={() => void download()}>Tải workbook .xlsx</button>
    </div>
    {rubric.canEdit && <div className="mt-3 flex flex-wrap items-end gap-2">
      <label className="text-sm text-ink-soft">Tệp Excel đã điền
        <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="mt-1 block max-w-full text-sm" disabled={busy || dirty}
          onChange={event => { setFile(event.target.files?.[0] ?? null); setPreview(null); setStagedRows([]); setEditedLocally(false); setError('') }} />
      </label>
      <button type="button" className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
        disabled={!file || busy || dirty} onClick={() => void inspect()}>{busy ? 'Đang xử lý…' : 'Xem lỗi và thay đổi'}</button>
    </div>}
    {dirty && rubric.canEdit && <p role="status" className="mt-2 text-xs text-status-warning-text">Lưu thay đổi trên màn hình trước khi nhập Excel.</p>}
    {error && <p role="alert" className="mt-2 text-sm text-danger-text">{error}</p>}
    {preview && <div className="mt-3 space-y-3 rounded-lg border border-hairline bg-subtle p-3 text-sm">
      {effectiveIssues.length > 0 ? <><strong>Chưa thể nhập</strong><ul className="mt-2 list-inside list-disc space-y-1 text-danger-text">
        {effectiveIssues.map((issue, index) => <li key={index}>{issue.cell}: {issue.message}</li>)}
      </ul></> : <><strong>Thay đổi sẽ lưu vào bản nháp</strong><ul className="mt-2 list-inside list-disc space-y-1">
        {(editedLocally ? [`Sẵn sàng lưu ${stagedRows.length} tiêu chí đã chuẩn hóa từ Staging Grid (±0.001).`] : preview.changes).map((change, index) => <li key={index}>{change}</li>)}
      </ul></>}

      {stagedRows.length > 0 && <div className="overflow-x-auto rounded-lg border border-hairline bg-card p-2">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-ink">Staging Preview Grid ({stagedRows.length} dòng)</span>
          <button type="button" className="rounded border border-hairline px-2 py-1 text-xs font-semibold text-ink" onClick={addStagedRow}>+ Thêm dòng</button>
        </div>
        <Table className="text-xs">
          <TableHead>
            <TableRow head>
              <TableHeaderCell>Mã</TableHeaderCell>
              <TableHeaderCell>Tên tiêu chí</TableHeaderCell>
              <TableHeaderCell>Trọng số %</TableHeaderCell>
              <TableHeaderCell>Điểm tối đa</TableHeaderCell>
              <TableHeaderCell>Phạm vi</TableHeaderCell>
              <TableHeaderCell>INT</TableHeaderCell>
              <TableHeaderCell>Xóa</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stagedRows.map((row, index) => {
              const rowError = editedLocally ? Boolean(localValidation?.errorRowIndices.has(index)) : row.hasError
              return <TableRow key={`${row.code}-${index}`} className={rowError ? 'border-status-error-border bg-status-error-bg' : ''}>
                <TableCell className="p-1"><input aria-label={`Mã dòng ${index + 1}`} className="w-20 rounded border border-hairline bg-card px-1.5 py-1 text-xs" value={row.code} onChange={e => updateStagedRow(index, { code: e.target.value })} /></TableCell>
                <TableCell className="p-1"><input aria-label={`Tên tiêu chí dòng ${index + 1}`} className="w-44 rounded border border-hairline bg-card px-1.5 py-1 text-xs" value={row.name} onChange={e => updateStagedRow(index, { name: e.target.value })} /></TableCell>
                <TableCell className="p-1"><input aria-label={`Trọng số dòng ${index + 1}`} type="number" step="0.001" className="w-24 rounded border border-hairline bg-card px-1.5 py-1 text-xs" value={row.weightPercent} onChange={e => updateStagedRow(index, { weightPercent: Number(e.target.value) })} /></TableCell>
                <TableCell className="p-1"><input aria-label={`Điểm tối đa dòng ${index + 1}`} type="number" step="0.01" className="w-20 rounded border border-hairline bg-card px-1.5 py-1 text-xs" value={row.maxScore ?? ''} onChange={e => updateStagedRow(index, { maxScore: e.target.value ? Number(e.target.value) : null })} /></TableCell>
                <TableCell className="p-1"><select aria-label={`Phạm vi dòng ${index + 1}`} className="rounded border border-hairline bg-card px-1.5 py-1 text-xs" value={row.targetScope ?? ''} onChange={e => updateStagedRow(index, { targetScope: (e.target.value || null) as RubricWorkbookStagedRow['targetScope'] })}>
                  <option value="">Mặc định</option><option value="PROJECT">PROJECT</option><option value="MAJOR">MAJOR</option><option value="STUDENT">STUDENT</option>
                </select></TableCell>
                <TableCell className="p-1"><input aria-label={`Tích hợp INT dòng ${index + 1}`} type="checkbox" checked={row.isIntegration} onChange={e => updateStagedRow(index, { isIntegration: e.target.checked })} /></TableCell>
                <TableCell className="p-1"><button type="button" className="rounded border border-danger px-2 py-1 text-xs text-danger-text" onClick={() => removeStagedRow(index)}>Bỏ</button></TableCell>
              </TableRow>
            })}
          </TableBody>
        </Table>
      </div>}

      {canCommit && <button type="button" className="mt-3 min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
        disabled={busy} onClick={() => void commit()}>Xác nhận lưu tiêu chí</button>}
    </div>}
  </section>
}
