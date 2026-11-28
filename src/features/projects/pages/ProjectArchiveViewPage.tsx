import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { HttpError } from '../../../services/http/http-client'
import { getArchiveDossier, unarchiveProject, type ProjectArchiveDossier } from '../api/archive-project'
import { projectStatusLabel } from '../utils/project-status'
import { displayLabel } from '../../../components/ui/display-label'
import { Button } from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { StatTileRow } from '../../../components/ui/StatTileRow'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../../../components/ui/Table'

function fmtDate(value: string | null | undefined): string {
  if (!value) return 'Chưa ghi nhận'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
}

export function ProjectArchiveViewPage() {
  const id = Number(useParams().projectId)
  const navigate = useNavigate()
  const [dossier, setDossier] = useState<ProjectArchiveDossier | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [unarchiveOpen, setUnarchiveOpen] = useState(false)
  const [unarchiveReason, setUnarchiveReason] = useState('')
  const [unarchiveBusy, setUnarchiveBusy] = useState(false)

  const load = useCallback(async () => {
    if (!Number.isSafeInteger(id) || id < 1) {
      setError('Đường dẫn đồ án không hợp lệ.')
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await getArchiveDossier(id)
      if (data.status.replaceAll('_', '').toUpperCase() !== 'ARCHIVED') {
        setError('Đồ án này chưa được lưu trữ.')
        setDossier(null)
      } else {
        setDossier(data)
        setError(null)
      }
    } catch (reason) {
      setError(
        reason instanceof HttpError && reason.status === 403
          ? 'Hệ thống không cấp quyền xem đồ án lưu trữ này.'
          : reason instanceof HttpError && reason.status === 404
            ? 'Không tìm thấy đồ án lưu trữ.'
            : reason instanceof HttpError && reason.status === 409
              ? 'Đồ án này chưa chuyển sang trạng thái Đã lưu trữ (ARCHIVED).'
              : 'Không thể tải hồ sơ lưu trữ từ hệ thống.',
      )
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { void load() }, [load])

  async function handleUnarchive(event: React.FormEvent) {
    event.preventDefault()
    if (!dossier || unarchiveBusy || unarchiveReason.trim().length < 10) return
    setUnarchiveBusy(true)
    setError(null)
    try {
      await unarchiveProject(dossier.id, dossier.concurrencyToken, unarchiveReason.trim())
      setUnarchiveOpen(false)
      setNotice('Đã khôi phục đồ án về trạng thái Hoàn thành (COMPLETED). Đang chuyển hướng…')
      navigate(`/department/projects/review/${dossier.id}`)
    } catch (reason) {
      setError(
        reason instanceof HttpError && reason.status === 403
          ? 'Chỉ Khoa chủ trì mới có quyền khôi phục đồ án lưu trữ.'
          : reason instanceof HttpError && reason.status === 409
            ? 'Dữ liệu đồ án đã thay đổi đồng thời. Hãy tải lại trước khi khôi phục.'
            : 'Không thể khôi phục đồ án lưu trữ.',
      )
    } finally {
      setUnarchiveBusy(false)
    }
  }

  return (
    <WorkspacePage
      size="wide"
      className="space-y-5 pb-12"
      eyebrow="Đồ án lưu trữ (Chỉ đọc)"
      title={dossier ? `Hồ sơ lưu trữ · ${dossier.code}` : 'Hồ sơ đồ án lưu trữ'}
      description="Tổng hợp toàn bộ 7 phần hồ sơ học thuật, kết quả công bố, minh chứng bàn giao và lịch sử trạng thái."
      backTo="/department/projects/archived"
      backLabel="Kho lưu trữ"
      action={
        <div className="flex flex-wrap items-center gap-2">
          {dossier?.canUnarchive && (
            <Button variant="secondary" size="sm" icon="unarchive" disabled={loading || unarchiveBusy} onClick={() => setUnarchiveOpen(true)}>
              Khôi phục về Hoàn thành
            </Button>
          )}
          <Button variant="secondary" size="sm" icon="refresh" aria-label="Tải lại" disabled={loading} onClick={() => void load()} />
        </div>
      }
    >
      {loading && (
        <p role="status" className="rounded-xl border border-hairline bg-card p-5 text-sm text-ink-muted">
          Đang tải hồ sơ lưu trữ…
        </p>
      )}

      {notice && (
        <p role="status" className="rounded-xl border border-status-success-border bg-status-success-bg p-4 text-sm text-status-success-text">
          {notice}
        </p>
      )}

      {error && (
        <section role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-5 text-sm text-status-error-text">
          <p>{error}</p>
          <button type="button" className="mt-2 min-h-11 font-semibold underline underline-offset-4" onClick={() => void load()}>
            Tải lại
          </button>
        </section>
      )}

      {unarchiveOpen && dossier && (
        <form onSubmit={(e) => void handleUnarchive(e)} className="rounded-xl border border-status-warning-border bg-status-warning-bg p-5 space-y-3 shadow-xs">
          <h2 className="font-heading text-base font-semibold text-status-warning-text">Xác nhận khôi phục đồ án về Đã hoàn thành (COMPLETED)</h2>
          <p className="text-sm text-status-warning-text">
            Chỉ Khoa chủ trì thực hiện khi cần xử lý hậu kiểm đặc biệt. Mọi mốc thời gian hoàn thành gốc và Audit Log sẽ được bảo toàn.
          </p>
          <label className="block text-sm font-medium text-ink">
            Lý do khôi phục (tối thiểu 10 ký tự)
            <textarea
              required
              minLength={10}
              maxLength={2000}
              rows={3}
              value={unarchiveReason}
              disabled={unarchiveBusy}
              onChange={(e) => setUnarchiveReason(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-hairline bg-card p-3 text-sm text-ink"
              placeholder="Ví dụ: Mở lại hậu kiểm hồ sơ phúc khảo bổ sung theo quyết định hội đồng Khoa…"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" disabled={unarchiveBusy} onClick={() => { setUnarchiveOpen(false); setUnarchiveReason('') }}>
              Hủy
            </Button>
            <Button type="submit" disabled={unarchiveBusy || unarchiveReason.trim().length < 10}>
              {unarchiveBusy ? 'Đang khôi phục…' : 'Xác nhận khôi phục'}
            </Button>
          </div>
        </form>
      )}

      {dossier && (
        <div className="space-y-5">
          {/* Section 1: Overview & Milestones */}
          <section className="rounded-xl border border-hairline border-l-4 border-l-status-success-text bg-card p-5 space-y-3 shadow-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-status-success-text" aria-hidden="true">inventory_2</span>
              <StatusBadge tone="neutral" label={projectStatusLabel(dossier.status)} />
              {dossier.trackCode && <StatusBadge tone="info" label={dossier.trackCode} />}
              {dossier.semesterCode && <span className="text-xs font-medium text-ink-muted">{dossier.semesterCode} · {dossier.semesterName}</span>}
            </div>
            <h2 className="font-heading text-xl font-bold text-ink">{dossier.code} · {dossier.title}</h2>
            <p className="whitespace-pre-wrap text-sm leading-6 text-ink-soft">{dossier.description || 'Hệ thống chưa có mô tả đồ án.'}</p>
            <dl className="grid gap-3 border-t border-hairline pt-3 text-xs text-ink-muted sm:grid-cols-2 lg:grid-cols-4">
              <div><dt className="font-semibold text-ink-soft">Khoa chủ trì</dt><dd>{dossier.leadDepartmentName ?? 'Chưa xác định'}</dd></div>
              <div><dt className="font-semibold text-ink-soft">Ngành tham gia</dt><dd>{dossier.majors.map(m => `${m.majorCode} (${m.majorName})`).join(', ') || '—'}</dd></div>
              <div><dt className="font-semibold text-ink-soft">Hoàn thành lúc</dt><dd>{fmtDate(dossier.completedAt)}</dd></div>
              <div><dt className="font-semibold text-ink-soft">Đóng lưu trữ lúc</dt><dd>{fmtDate(dossier.archivedAt)}</dd></div>
            </dl>
          </section>

          <StatTileRow
            tiles={[
              { icon: 'group', label: 'Sinh viên thực hiện', value: dossier.members.length },
              { icon: 'school', label: 'Giảng viên HD', value: dossier.supervisors.length },
              { icon: 'grade', label: 'Điểm đồ án', value: dossier.results.projectResult?.totalScore ?? '—', tone: 'info' },
              { icon: 'gavel', label: 'Đơn phúc khảo', value: dossier.appeals.totalCount, tone: dossier.appeals.acceptedCount > 0 ? 'warning' : 'neutral' },
            ]}
          />

          {/* Section 2: Members */}
          <section className="rounded-xl border border-hairline bg-card p-5 shadow-xs space-y-3">
            <h2 className="font-heading text-base font-semibold text-ink">2. Thành viên thực hiện ({dossier.members.length})</h2>
            <Table stack aria-label="Thành viên thực hiện">
              <TableHead>
                <TableRow head>
                  <TableHeaderCell>MSSV</TableHeaderCell>
                  <TableHeaderCell>Họ và tên</TableHeaderCell>
                  <TableHeaderCell>Email</TableHeaderCell>
                  <TableHeaderCell>Chuyên ngành</TableHeaderCell>
                  <TableHeaderCell>Vai trò</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dossier.members.map(m => (
                  <TableRow key={m.userId}>
                    <TableCell label="MSSV" className="font-mono text-xs">{m.studentCode ?? '—'}</TableCell>
                    <TableCell label="Họ và tên" className="font-medium text-ink">{m.fullName}</TableCell>
                    <TableCell label="Email" className="text-xs text-ink-muted">{m.email}</TableCell>
                    <TableCell label="Chuyên ngành" className="text-xs">{m.majorName ?? '—'}</TableCell>
                    <TableCell label="Vai trò" className="text-xs">{m.isLeader ? 'Trưởng nhóm' : 'Thành viên'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>

          {/* Section 3: Supervisors & Mentors */}
          <section className="rounded-xl border border-hairline bg-card p-5 shadow-xs space-y-3">
            <h2 className="font-heading text-base font-semibold text-ink">3. Giảng viên hướng dẫn & Mentor ({dossier.supervisors.length})</h2>
            {dossier.supervisors.length === 0 ? (
              <p className="text-sm text-ink-muted">Chưa ghi nhận phân công hướng dẫn.</p>
            ) : (
              <ul className="divide-y divide-hairline text-sm">
                {dossier.supervisors.map((s, idx) => (
                  <li key={`${s.userId}-${idx}`} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <div>
                      <p className="font-medium text-ink">{s.fullName} <span className="text-xs text-ink-muted">({s.email})</span></p>
                      <p className="text-xs text-ink-muted">
                        {displayLabel(s.assignmentType)}{s.majorName ? ` · Ngành ${s.majorName}` : ''} · Nhận HD: {fmtDate(s.assignedAt)}
                        {s.endedAt ? ` · Kết thúc: ${fmtDate(s.endedAt)}` : ''}
                      </p>
                    </div>
                    <StatusBadge tone={s.isActive ? 'success' : 'neutral'} label={s.isActive ? 'Hoạt động đến khi kết thúc' : 'Đã kết thúc trước'} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Section 4: Published Results & Revision History */}
          <section className="rounded-xl border border-hairline bg-card p-5 shadow-xs space-y-3">
            <h2 className="font-heading text-base font-semibold text-ink">4. Kết quả công bố & Lịch sử đính chính</h2>
            {dossier.results.projectResult ? (
              <div className="rounded-lg border border-hairline bg-canvas p-3 text-sm">
                <p className="font-semibold text-ink">
                  Kết quả chung đồ án (v{dossier.results.projectResult.version}): {dossier.results.projectResult.totalScore} / 10 · {displayLabel(dossier.results.projectResult.outcome)}
                </p>
                <p className="text-xs text-ink-muted">Công bố lúc: {fmtDate(dossier.results.projectResult.publishedAt)}</p>
              </div>
            ) : (
              <p className="text-sm text-ink-muted">Chưa có kết quả đồ án.</p>
            )}
            {dossier.results.studentResults.length > 0 && (
              <Table stack aria-label="Kết quả từng sinh viên">
                <TableHead>
                  <TableRow head>
                    <TableHeaderCell>Sinh viên</TableHeaderCell>
                    <TableHeaderCell>Phiên bản</TableHeaderCell>
                    <TableHeaderCell numeric>Điểm</TableHeaderCell>
                    <TableHeaderCell>Kết luận</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dossier.results.studentResults.map(sr => {
                    const member = dossier.members.find(m => m.userId === sr.studentId)
                    return (
                      <TableRow key={sr.id}>
                        <TableCell label="Sinh viên" className="font-medium text-ink">{member ? `${member.fullName} (${member.studentCode ?? sr.studentId})` : `Sinh viên #${sr.studentId}`}</TableCell>
                        <TableCell label="Phiên bản" className="font-mono text-xs">v{sr.version}</TableCell>
                        <TableCell label="Điểm" numeric className="font-semibold">{sr.totalScore}</TableCell>
                        <TableCell label="Kết luận" className="text-xs">{displayLabel(sr.outcomeDetail ?? sr.outcome)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </section>

          {/* Section 5: Defense Committee & Optional Room Session (POL-06 Non-Blocking) */}
          <section className="rounded-xl border border-hairline bg-card p-5 shadow-xs space-y-3">
            <h2 className="font-heading text-base font-semibold text-ink">5. Hội đồng & Lịch bảo vệ</h2>
            {!dossier.defense ? (
              <p className="text-sm text-ink-muted">Đồ án không sử dụng phiên chia phòng bảo vệ (tùy chọn theo quy chế POL-06).</p>
            ) : (
              <div className="space-y-2 text-sm">
                <p className="font-medium text-ink">
                  {dossier.defense.committeeName ?? 'Hội đồng bảo vệ'}
                  {dossier.defense.committeeStatus ? ` · ${displayLabel(dossier.defense.committeeStatus)}` : ''}
                </p>
                <p className="text-xs text-ink-muted">
                  {dossier.defense.room
                    ? `Phòng ${dossier.defense.room} · ${fmtDate(dossier.defense.startAt)} → ${fmtDate(dossier.defense.endAt)}`
                    : 'Chưa xếp lịch phòng bảo vệ (chấm điểm độc lập theo POL-06)'}
                </p>
                {dossier.defense.members.length > 0 && (
                  <ul className="flex flex-wrap gap-2 pt-1">
                    {dossier.defense.members.map(cm => (
                      <li key={`${cm.userId}-${cm.majorId}`} className="rounded-lg border border-hairline bg-canvas px-3 py-1.5 text-xs">
                        {cm.fullName} · {displayLabel(cm.role)}{cm.majorName ? ` (${cm.majorName})` : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>

          {/* Section 6: Final Submission Snapshot */}
          <section className="rounded-xl border border-hairline bg-card p-5 shadow-xs space-y-3">
            <h2 className="font-heading text-base font-semibold text-ink">6. Hồ sơ bàn giao cuối kỳ</h2>
            {!dossier.finalSubmission ? (
              <p className="text-sm text-ink-muted">Không có gói bàn giao cuối kỳ.</p>
            ) : (
              <div className="space-y-2 text-sm">
                <p className="text-xs text-ink-muted">
                  Nộp/khóa lúc: {fmtDate(dossier.finalSubmission.lockedAt ?? dossier.finalSubmission.submittedAt)}
                  {dossier.finalSubmission.lockedByName ? ` · Xác nhận khóa bởi: ${dossier.finalSubmission.lockedByName}` : ''}
                </p>
                <ul className="space-y-2">
                  {dossier.finalSubmission.items.map(item => (
                    <li key={item.deliverableId} className="rounded-lg border border-hairline bg-canvas p-3">
                      <p className="font-medium text-ink">{item.title}</p>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-ink-muted">
                        {item.files.length === 0 ? 'Không có tệp' : item.files.map(f => (
                          <span key={f.fileId} className="rounded bg-card px-2 py-1 border border-hairline">
                            {f.fileName} ({(f.sizeBytes / 1024).toFixed(1)} KB)
                          </span>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Section 7: Appeals & Status History */}
          <section className="rounded-xl border border-hairline bg-card p-5 shadow-xs space-y-3">
            <h2 className="font-heading text-base font-semibold text-ink">7. Tổng hợp Phúc khảo ({dossier.appeals.totalCount}) & Lịch sử trạng thái</h2>
            <p className="text-xs text-ink-muted">
              Chấp thuận: {dossier.appeals.acceptedCount} · Từ chối: {dossier.appeals.rejectedCount} · Đã rút: {dossier.appeals.withdrawnCount} · Đang mở: {dossier.appeals.pendingCount}
            </p>
            {dossier.appeals.items.length > 0 && (
              <ul className="divide-y divide-hairline text-xs">
                {dossier.appeals.items.map(a => (
                  <li key={a.id} className="py-2">
                    <span className="font-semibold text-ink">{a.targetLabel}</span> · {displayLabel(a.appealKind)} · {displayLabel(a.status)} · v{a.resultVersion}
                    {a.decisionReason ? ` — ${a.decisionReason}` : ''}
                  </li>
                ))}
              </ul>
            )}
            <h3 className="pt-2 text-sm font-semibold text-ink">Nhật ký chuyển trạng thái</h3>
            {dossier.statusHistory.length ? (
              <ol className="divide-y divide-hairline">
                {dossier.statusHistory.map((item) => (
                  <li key={item.id} className="py-2.5 text-sm">
                    <p className="font-semibold text-ink">{item.oldStatus ? projectStatusLabel(item.oldStatus) : 'Khởi tạo'} → {projectStatusLabel(item.newStatus)}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">{item.changedByName || 'Hệ thống'}{item.reason ? ` · ${item.reason}` : ''}</p>
                    <time className="mt-0.5 block font-mono text-xs text-ink-muted">{fmtDate(item.changedAt)}</time>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-ink-muted">Chưa có lịch sử thay đổi trạng thái.</p>
            )}
          </section>
        </div>
      )}
    </WorkspacePage>
  )
}
