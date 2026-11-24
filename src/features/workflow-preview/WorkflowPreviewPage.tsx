import { useEffect, useRef, useState, type FormEvent } from 'react'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { env } from '../../app/config/env'
import { coldCriteria, weeklyCriteria, finalizeScores, saveWeekly, uploadReport, submitReport, lockReport, approveLeader, type PreviewReport, type PreviewCriterion } from './preview-model'
import './workflow-preview.css'
import { CollaborationPreview } from './CollaborationPreview'

const tabs = ['Báo cáo COLD', 'Chấm nguội', 'Tổng quan COLD', 'Điểm cá nhân tuần', 'Đổi trưởng nhóm', 'Collaboration'] as const
const tabIcons: Record<(typeof tabs)[number], string> = {
  'Báo cáo COLD': 'upload_file',
  'Chấm nguội': 'grading',
  'Tổng quan COLD': 'insights',
  'Điểm cá nhân tuần': 'calendar_today',
  'Đổi trưởng nhóm': 'swap_horiz',
  Collaboration: 'workspaces',
}
const messages: Record<string, string> = {
  SUBMISSION_DEADLINE_PASSED: 'Đã hết hạn nộp báo cáo trong kịch bản thử nghiệm.',
  MAX_FILES_EXCEEDED: 'Chỉ có 7 vị trí báo cáo trong fixture.', ALREADY_LOCKED: 'Báo cáo đã khóa; không thể thay thế.',
  FILE_TYPE_NOT_ALLOWED: 'Chọn file PDF, DOCX hoặc ZIP.', FILE_TOO_LARGE: 'Fixture cho phép file từ 1 byte đến 10 MiB.',
  SCORES_INCOMPLETE: 'Nhập đủ các tiêu chí trước khi hoàn tất. Điểm thiếu không được coi là 0.',
  SCORE_OUT_OF_RANGE: 'Điểm phải nằm trong khoảng của từng tiêu chí.', TARGET_NOT_TEAM_MEMBER: 'Người kế nhiệm không còn là thành viên.',
}
function errorText(reason: unknown) { const code = reason instanceof Error ? reason.message : 'PREVIEW_ERROR'; return `${code} · ${messages[code] ?? 'Thao tác không phù hợp với trạng thái hiện tại.'}` }

/** No HTTP adapter: proposed fixture UX only, isolated from live project state. */
export function WorkflowPreviewPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]>(tabs[0])
  const [reports, setReports] = useState<PreviewReport[]>([])
  const [reportHistory, setReportHistory] = useState<PreviewReport[]>([])
  const [comments, setComments] = useState<Record<number, string>>({})
  const [savedComments, setSavedComments] = useState<Record<number, string>>({})
  const [expired, setExpired] = useState(false)
  const [scenario, setScenario] = useState<'ready' | 'loading' | 'error'>('ready')
  const [score, setScore] = useState<Record<number, string>>({})
  const [savedScore, setSavedScore] = useState<Record<number, string>>({})
  const [finalized, setFinalized] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [slot, setSlot] = useState(1)
  const [file, setFile] = useState<File | null>(null)
  const [selectedReport, setSelectedReport] = useState(1)
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null)
  const [weekly, setWeekly] = useState<Record<string, ReturnType<typeof saveWeekly>>>({})
  const [student, setStudent] = useState('1')
  const [week, setWeek] = useState('1')
  const [weeklyDraft, setWeeklyDraft] = useState<Record<number, string>>({})
  const [leader, setLeader] = useState(1)
  const [target, setTarget] = useState(2)
  const [reason, setReason] = useState('')
  const [request, setRequest] = useState<{ targetId: number; reason: string; status: 'PENDING' | 'APPROVED' | 'REJECTED' } | null>(null)
  const [persona, setPersona] = useState<'leader' | 'supervisor'>('leader')
  const fileInput = useRef<HTMLInputElement>(null)
  const urls = useRef<Record<number, string>>({})
  useEffect(() => () => { Object.values(urls.current).forEach(url => URL.revokeObjectURL(url)) }, [])
  if (!env.workflowPreviewEnabled) return <WorkspacePage title="Preview chưa bật"><p>Khu thử nghiệm chỉ mở trong chế độ mock với feature flag đã bật.</p></WorkspacePage>

  const act = (action: () => void, text: string) => {
    try { action(); setNotice({ text, error: false }) } catch (failure) { setNotice({ text: errorText(failure), error: true }) }
  }
  const upload = (event: FormEvent) => {
    event.preventDefault()
    if (!file) { setNotice({ text: 'Chọn file để tải lên fixture.', error: true }); return }
    act(() => {
      const next = uploadReport(reports, slot, file, expired)
      const previous = reports.find(item => item.slot === slot)
      if (previous) setReportHistory(current => [...current, previous])
      const oldUrl = urls.current[slot]
      if (oldUrl) URL.revokeObjectURL(oldUrl)
      delete urls.current[slot]
      if (/\.pdf$/i.test(file.name)) urls.current[slot] = URL.createObjectURL(new Blob([file], { type: 'application/pdf' }))
      setPdfUrl(urls.current[selectedReport] ?? null)
      setReports(next); setFile(null)
      if (fileInput.current) fileInput.current.value = ''
    }, 'Đã tải file vào phiên thử nghiệm. Dữ liệu sẽ mất khi tải lại trang.')
  }
  const saved = weekly[`${student}:${week}`]
  const dirty = JSON.stringify(score) !== JSON.stringify(savedScore) || JSON.stringify(comments) !== JSON.stringify(savedComments)
  let previewTotal: number | null = null
  try { previewTotal = finalizeScores(coldCriteria, score) } catch { /* Incomplete stays pending. */ }
  const studentWeeklyEntries = Object.entries(weekly).filter(([key]) => key.startsWith(`${student}:`))

  return (
    <WorkspacePage title="Preview quy trình FE v5" eyebrow="MOCK · IT SEP490" description="Thử nghiệm luồng trước khi BE chốt contract; không tạo điểm hoặc hồ sơ thật." className="v5-preview space-y-4">
      <section className="v5-banner" aria-label="Giới hạn thử nghiệm">
        <strong>Fixture riêng — không nối API/DB</strong>
        <p className="mt-1">Tiêu chí, trọng số và giới hạn upload dưới đây là dữ liệu minh họa. Reload sẽ xóa mọi thao tác. Stage COLD khác scope INDIVIDUAL; điểm tuần chưa được đưa vào kết quả chính thức.</p>
      </section>

      <div className="workspace-surface flex flex-wrap items-end justify-between gap-4 px-5 py-3.5">
        <div className="v5-controls !m-0">
          <label className="!mb-0">
            Kịch bản hiển thị
            <select value={scenario} onChange={event => setScenario(event.target.value as typeof scenario)}>
              <option value="ready">Sẵn sàng</option>
              <option value="loading">Đang tải (fixture)</option>
              <option value="error">Lỗi tải (fixture)</option>
            </select>
          </label>
          <label className="v5-check">
            <input type="checkbox" checked={expired} onChange={event => setExpired(event.target.checked)} />
            Mô phỏng hết deadline nộp
          </label>
        </div>
        <StatusBadge tone={expired ? 'danger' : 'success'} label={expired ? 'Hết hạn nộp (mock)' : 'Đang mở nộp (mock)'} />
      </div>

      <nav aria-label="Quy trình thử nghiệm" className="v5-nav">
        {tabs.map(item => (
          <button key={item} type="button" aria-pressed={tab === item} onClick={() => { setTab(item); setNotice(null) }}>
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{tabIcons[item]}</span>
            {item}
          </button>
        ))}
      </nav>

      {notice && <p role={notice.error ? 'alert' : 'status'} className={notice.error ? 'v5-error' : 'v5-success'}>{notice.text}</p>}

      {scenario === 'loading' ? (
        <section className="v5-card">
          <div className="v5-card-head"><h2>Trạng thái đang tải</h2></div>
          <div className="v5-card-body space-y-3">
            <p role="status">Đang tải dữ liệu fixture…</p>
            <button type="button" onClick={() => setScenario('ready')}>Hoàn tất tải fixture</button>
          </div>
        </section>
      ) : scenario === 'error' ? (
        <section className="v5-card">
          <div className="v5-card-head"><h2>Trạng thái lỗi tải</h2></div>
          <div className="v5-card-body space-y-3">
            <p role="alert">PREVIEW_LOAD_FAILED · Không tải được dữ liệu minh họa.</p>
            <button type="button" onClick={() => setScenario('ready')}>Thử lại</button>
          </div>
        </section>
      ) : <>
        {tab === 'Báo cáo COLD' && (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-12 items-start">
            <section className="v5-card xl:col-span-8">
              <div className="v5-card-head">
                <h2>Báo cáo chấm nguội</h2>
                <span className="text-xs font-semibold text-ink-muted">Deadline: {expired ? 'Đã hết hạn (fixture)' : 'Cửa sổ nộp đang mở (fixture)'}</span>
              </div>
              <div className="v5-card-body space-y-4">
                <p className="text-xs text-ink-muted">Tối đa 7 loại, mỗi loại một phiên bản hiện hành.</p>
                <div className="v5-table-scroll">
                  <table>
                    <caption className="sr-only">Bảy vị trí báo cáo</caption>
                    <thead><tr><th>Loại</th><th>File / phiên bản</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
                    <tbody>
                      {Array.from({ length: 7 }, (_, index) => {
                        const item = reports.find(report => report.slot === index + 1)
                        return (
                          <tr key={index}>
                            <th scope="row">Báo cáo {index + 1}</th>
                            <td>{item ? `${item.name} · v${item.version}` : 'Chưa nộp'}</td>
                            <td><StatusBadge tone={item?.status === 'LOCKED' ? 'info' : item?.status === 'SUBMITTED' ? 'success' : item?.status === 'DRAFT' ? 'warning' : 'neutral'} label={item?.status ?? 'EMPTY'} /></td>
                            <td>
                              {item?.status === 'DRAFT' && <button type="button" disabled={expired} onClick={() => act(() => setReports(submitReport(reports, item.slot, expired)), 'Đã nộp bản nháp fixture.')}>Nộp báo cáo {index + 1}</button>}
                              {item?.status === 'SUBMITTED' && <button type="button" onClick={() => act(() => setReports(lockReport(reports, item.slot)), 'Đã khóa báo cáo fixture; không thể thay thế.')}>Khóa báo cáo {index + 1} (fixture hội đồng)</button>}
                              {item?.status === 'LOCKED' && <span className="text-xs text-ink-muted">Chỉ xem</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <div className="xl:col-span-4 space-y-5">
              <section className="v5-card">
                <div className="v5-card-head"><h3>Tải lên báo cáo fixture</h3></div>
                <div className="v5-card-body">
                  <form onSubmit={upload} className="space-y-3">
                    <label>Loại báo cáo<select value={slot} onChange={event => setSlot(Number(event.target.value))}>{Array.from({ length: 7 }, (_, i) => <option key={i} value={i + 1}>Báo cáo {i + 1} (fixture)</option>)}</select></label>
                    <label>File báo cáo<input ref={fileInput} type="file" accept=".pdf,.docx,.zip" disabled={expired || reports.some(item => item.slot === slot && item.status === 'LOCKED')} onChange={event => setFile(event.target.files?.[0] ?? null)} /></label>
                    <button type="submit" disabled={expired || reports.some(item => item.slot === slot && item.status === 'LOCKED')}>Tải lên fixture</button>
                  </form>
                </div>
              </section>

              <section className="v5-card">
                <div className="v5-card-head">
                  <h3>Lịch sử phiên bản đã thay thế</h3>
                  <span className="text-xs font-bold tabular-nums text-ink-muted">{reportHistory.length}</span>
                </div>
                <div className="v5-card-body">
                  {reportHistory.length ? (
                    <ul className="divide-y divide-hairline text-xs text-ink-soft">
                      {reportHistory.map(item => <li key={`${item.slot}:${item.version}`} className="py-2 first:pt-0">Báo cáo {item.slot} · {item.name} · v{item.version} · {item.status}</li>)}
                    </ul>
                  ) : (
                    <p className="text-xs text-ink-muted">Chưa có phiên bản cũ trong fixture.</p>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}

        {tab === 'Chấm nguội' && (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-12 items-start">
            <section className="v5-card xl:col-span-7">
              <div className="v5-card-head"><h2>Đối chiếu báo cáo</h2></div>
              <div className="v5-card-body space-y-3">
                <label>Báo cáo đang xem<select value={selectedReport} onChange={event => { const next = Number(event.target.value); setSelectedReport(next); setPdfUrl(urls.current[next] ?? null) }}>{Array.from({ length: 7 }, (_, i) => <option key={i} value={i + 1}>Báo cáo {i + 1}</option>)}</select></label>
                {pdfUrl ? <iframe sandbox="allow-same-origin" title={`PDF báo cáo ${selectedReport} do bạn chọn`} src={pdfUrl} className="v5-pdf" /> : <p className="rounded-xl border border-hairline bg-canvas p-5 text-xs text-ink-muted">Chưa có PDF trong phiên này. Tải PDF ở tab Báo cáo COLD; DOCX/ZIP chỉ hiển thị metadata.</p>}
              </div>
            </section>
            <section className="v5-card xl:col-span-5">
              <div className="v5-card-head">
                <h2>Chấm COLD — rubric fixture</h2>
                <StatusBadge tone={finalized ? 'success' : 'warning'} label={finalized ? 'Đã chốt điểm' : 'Bản nháp'} />
              </div>
              <div className="v5-card-body space-y-3">
                <p className="text-xs text-ink-muted">Assignment #fixture-1 · {finalized ? 'FINALIZED — chỉ xem' : 'DRAFT'}</p>
                <ScoreFields criteria={coldCriteria} values={score} disabled={finalized} onChange={setScore} comments={comments} onCommentChange={setComments} />
                <p className="text-sm font-semibold tabular-nums text-ink">Tổng preview: {previewTotal === null ? 'Chờ đủ điểm' : `${previewTotal}/30`}. Không phải kết quả chính thức.</p>
                <div className="v5-controls !mb-0">
                  <button type="button" disabled={finalized} onClick={() => act(() => {
                    for (const criterion of coldCriteria) { const raw = score[criterion.id]?.trim(); if (raw) finalizeScores([criterion], score) }
                    setSavedScore({ ...score }); setSavedComments({ ...comments })
                  }, 'Đã lưu nháp fixture.')}>Lưu nháp</button>
                  <button type="button" disabled={finalized || dirty} title={dirty ? 'Lưu nháp trước khi hoàn tất' : undefined} onClick={() => act(() => { finalizeScores(coldCriteria, savedScore); setFinalized(true) }, 'Đã hoàn tất fixture. Form chuyển chỉ đọc.')}>Hoàn tất</button>
                </div>
              </div>
            </section>
          </div>
        )}

        {tab === 'Tổng quan COLD' && (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-12 items-start">
            <section className="v5-card xl:col-span-7">
              <div className="v5-card-head"><h2>Tiến độ fixture hội đồng</h2><StatusBadge tone={finalized ? 'success' : 'warning'} label={finalized ? 'FINALIZED' : 'DRAFT'} /></div>
              <div className="v5-card-body space-y-3">
                <p className="text-sm text-ink-soft">Đồ án IT SEP490 · 1 phân công minh họa</p>
                <progress aria-label="Tiến độ hoàn tất assignment" value={finalized ? 1 : 0} max={1} className="w-full" />
                <p className="font-mono text-sm font-bold text-ink">{finalized ? '1/1 FINALIZED' : '0/1 FINALIZED · DRAFT'}</p>
              </div>
            </section>
            <section className="v5-card xl:col-span-5">
              <div className="v5-card-head"><h3>Điểm tổng hợp fixture</h3></div>
              <div className="v5-card-body space-y-4">
                <p className="text-sm font-semibold text-ink tabular-nums">Điểm tổng hợp fixture: {finalized ? `${previewTotal}/30` : 'PENDING — chưa hiển thị điểm khi chưa hoàn tất'}</p>
                <button type="button" onClick={() => setTab('Chấm nguội')}>Xem chi tiết chấm nguội</button>
              </div>
            </section>
          </div>
        )}

        {tab === 'Điểm cá nhân tuần' && (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-12 items-start">
            <section className="v5-card xl:col-span-7">
              <div className="v5-card-head">
                <h2>Supervisor — điểm tuần riêng</h2>
                <StatusBadge tone={saved?.status === 'SUBMITTED' ? 'success' : 'neutral'} label={saved?.status ?? 'Chưa chấm'} />
              </div>
              <div className="v5-card-body space-y-3">
                <div className="v5-controls !mt-0">
                  <label>Sinh viên<select value={student} onChange={event => { setStudent(event.target.value); setWeeklyDraft(weekly[`${event.target.value}:${week}`]?.values ?? {}) }}><option value="1">Nguyễn An — IT (fixture)</option><option value="2">Trần Bình — IT (fixture)</option></select></label>
                  <label>Tuần báo cáo<select value={week} onChange={event => { setWeek(event.target.value); setWeeklyDraft(weekly[`${student}:${event.target.value}`]?.values ?? {}) }}>{[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>Tuần {value}</option>)}</select></label>
                </div>
                <p className="text-xs text-ink-muted">Trạng thái: {saved?.status ?? 'Chưa chấm'}</p>
                <ScoreFields criteria={weeklyCriteria} values={weeklyDraft} disabled={saved?.status === 'SUBMITTED'} onChange={setWeeklyDraft} />
                <p className="text-sm font-semibold tabular-nums text-ink">Điểm preview đã lưu: {saved?.total ?? 'Chờ đủ dữ liệu'}</p>
                <div className="v5-controls !mb-0">{[false, true].map(submitted => <button key={String(submitted)} type="button" disabled={saved?.status === 'SUBMITTED'} onClick={() => act(() => setWeekly(current => ({ ...current, [`${student}:${week}`]: saveWeekly(weeklyDraft, submitted) })), submitted ? 'Đã gửi điểm tuần fixture.' : 'Đã lưu nháp điểm tuần fixture.')}>{submitted ? 'Gửi điểm tuần' : 'Lưu nháp tuần'}</button>)}</div>
              </div>
            </section>

            <section className="v5-card xl:col-span-5">
              <div className="v5-card-head">
                <h3>Lịch sử tuần của sinh viên đã chọn</h3>
                <span className="text-xs font-bold tabular-nums text-ink-muted">{studentWeeklyEntries.length}</span>
              </div>
              <div className="v5-card-body">
                {studentWeeklyEntries.length ? (
                  <ul className="divide-y divide-hairline text-xs text-ink-soft">
                    {studentWeeklyEntries.map(([key, value]) => <li key={key} className="py-2 first:pt-0">Tuần {key.split(':')[1]} · {value.status} · {value.total ?? 'Chờ đủ dữ liệu'}</li>)}
                  </ul>
                ) : (
                  <p className="text-xs text-ink-muted">Chưa có lịch sử trong fixture.</p>
                )}
              </div>
            </section>
          </div>
        )}

        {tab === 'Đổi trưởng nhóm' && (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-12 items-start">
            <section className="v5-card xl:col-span-7">
              <div className="v5-card-head">
                <h2>Yêu cầu đổi trưởng nhóm</h2>
                <StatusBadge tone="info" label={persona === 'leader' ? 'Leader fixture' : 'Supervisor fixture'} />
              </div>
              <div className="v5-card-body space-y-3">
                <p className="text-sm font-semibold text-ink">Trưởng nhóm hiện tại: {leader === 1 ? 'Nguyễn An' : 'Trần Bình'} (fixture)</p>
                <label>Vai trò thử nghiệm<select value={persona} onChange={event => setPersona(event.target.value as typeof persona)}><option value="leader">Leader fixture</option><option value="supervisor">Supervisor fixture</option></select></label>
                {persona === 'leader' && (
                  <form className="space-y-3 border-t border-hairline pt-3" onSubmit={event => {
                    event.preventDefault()
                    if (!reason.trim()) { setNotice({ text: 'REASON_REQUIRED · Nhập lý do đổi trưởng nhóm.', error: true }); return }
                    if (target === leader || request?.status === 'PENDING') return
                    setRequest({ targetId: target, reason: reason.trim(), status: 'PENDING' }); setNotice({ text: 'Đã gửi yêu cầu fixture; trưởng nhóm chưa thay đổi.', error: false })
                  }}>
                    <label>Thành viên kế nhiệm<select value={target} onChange={event => setTarget(Number(event.target.value))}><option value="1">Nguyễn An</option><option value="2">Trần Bình</option></select></label>
                    <label>Lý do đổi trưởng nhóm<textarea value={reason} maxLength={2000} required onChange={event => setReason(event.target.value)} /></label>
                    <button type="submit" disabled={request?.status === 'PENDING' || target === leader}>Gửi yêu cầu</button>
                  </form>
                )}
              </div>
            </section>

            <section className="v5-card xl:col-span-5" aria-label="Yêu cầu đổi leader">
              <div className="v5-card-head">
                <h3>Trạng thái yêu cầu</h3>
                {request && <StatusBadge tone={request.status === 'APPROVED' ? 'success' : request.status === 'REJECTED' ? 'danger' : 'warning'} label={request.status} />}
              </div>
              <div className="v5-card-body space-y-3">
                {request ? (
                  <>
                    <p className="text-sm text-ink-soft">{request.status} · {request.reason}</p>
                    {persona === 'supervisor' && request.status === 'PENDING' && (
                      <div className="v5-controls !mb-0">
                        <button type="button" onClick={() => act(() => { setLeader(approveLeader(request, [1, 2])); setRequest({ ...request, status: 'APPROVED' }) }, 'Đã duyệt fixture; badge trưởng nhóm đã cập nhật.')}>Duyệt</button>
                        <button type="button" onClick={() => { setRequest({ ...request, status: 'REJECTED' }); setNotice({ text: 'Đã từ chối fixture; trưởng nhóm được giữ nguyên.', error: false }) }}>Từ chối</button>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-ink-muted">Chưa có yêu cầu đổi trưởng nhóm.</p>
                )}
              </div>
            </section>
          </div>
        )}
      </>}
      <div hidden={tab !== 'Collaboration' || scenario !== 'ready'}><CollaborationPreview /></div>
    </WorkspacePage>
  )
}

function ScoreFields({ criteria, values, disabled, onChange, comments, onCommentChange }: { comments?: Record<number, string>; onCommentChange?: (values: Record<number, string>) => void; criteria: PreviewCriterion[]; values: Record<number, string>; disabled: boolean; onChange: (values: Record<number, string>) => void }) {
  return <fieldset disabled={disabled}><legend>Tiêu chí minh họa</legend>{criteria.map(item => <div key={item.id}><label>{item.name} {item.weight ? `(${item.weight}%)` : `(max ${item.max})`}<input type="number" min={0} max={item.max} step="0.1" value={values[item.id] ?? ''} onChange={event => onChange({ ...values, [item.id]: event.target.value })} /></label>{onCommentChange && <label>Nhận xét {item.name}<textarea value={comments?.[item.id] ?? ''} onChange={event => onCommentChange({ ...comments, [item.id]: event.target.value })} /></label>}</div>)}</fieldset>
}
