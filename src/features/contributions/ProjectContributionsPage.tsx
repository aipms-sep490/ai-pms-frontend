import { dateTimeLabel } from '../execution/execution-utils'
import { Avatar } from '../../components/ui/Avatar'
import { DocumentPreviewModal } from '../../components/ui/DocumentPreviewModal'
import { FilterToolbar } from '../../components/ui/FilterToolbar'
import { InlineAlert } from '../../components/ui/InlineAlert'
import { Modal } from '../../components/ui/Modal'
import { StatTileRow } from '../../components/ui/StatTileRow'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { ListLoading } from '../../components/ui/ListLoading'
import { useActionConfirmation } from '../../components/ui/useActionConfirmation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useStudentJourney } from '../../app/context'
import { useAuthSession } from '../auth/context/useAuthSession'
import { getWorkspaceRole } from '../auth/utils/role-access'
import { HttpError } from '../../services/http/http-client'
import { downloadProjectFile } from '../files/project-files-api'
import * as api from './contributions-api'
import type { ContributionEvidence, ContributionSummary } from './contributions-api'
import { ContributionFairnessPanel } from '../ai-suite/ContributionFairnessPanel'

type MemberSort = 'score_desc' | 'tasks_desc' | 'evidence_desc' | 'name_asc'

export function ProjectContributionsPage() {
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()
  const location = useLocation()
  const routeId = Number(useParams().projectId)
  const journey = useStudentJourney()
  const { session } = useAuthSession()
  const role = getWorkspaceRole(session?.user)
  const projectId = Number.isInteger(routeId) && routeId > 0 ? routeId : journey.project?.id
  const canSnapshot = role === 'department' || role === 'admin'
  const [previewEvidenceFile, setPreviewEvidenceFile] = useState<{ id: number; fileName: string } | null>(null)
  const [snapshot, setSnapshot] = useState(false)
  const [page, setPage] = useState(1)
  const [memberSearch, setMemberSearch] = useState('')
  const [memberSort, setMemberSort] = useState<MemberSort>('score_desc')
  const [summary, setSummary] = useState<ContributionSummary | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [evidencePage, setEvidencePage] = useState(1)
  const [sourceType, setSourceType] = useState('')
  const [evidenceSearch, setEvidenceSearch] = useState('')
  const [evidence, setEvidence] = useState<ContributionEvidence[]>([])
  const [evidenceTotal, setEvidenceTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [evidenceLoading, setEvidenceLoading] = useState(false)
  const [evidenceError, setEvidenceError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!projectId) { setLoading(false); return }
    setLoading(true); setSummary(null)
    try {
      setSummary(await api.getContributions(projectId, page, snapshot))
      setError(null)
    } catch (reason) {
      setError(reason instanceof HttpError && reason.status === 403 ? 'Bạn chưa có quyền xem đóng góp của đồ án này.' : 'Chưa tải được dữ liệu đóng góp.')
    } finally {
      setLoading(false)
    }
  }, [projectId, page, snapshot])

  useEffect(() => { if (role !== 'student' || !journey.isLoading) void load() }, [load, role, journey.isLoading])

  useEffect(() => {
    if (!projectId || !selectedUserId) return
    let active = true
    setEvidenceLoading(true); setEvidence([]); setEvidenceError(null)
    void api.getContributionEvidence(projectId, selectedUserId, evidencePage, sourceType || undefined).then(result => {
      if (active) { setEvidence(result.items); setEvidenceTotal(result.totalCount); setEvidenceError(null) }
    }).catch(reason => {
      if (active) setEvidenceError(reason instanceof HttpError && reason.status === 403 ? 'Bạn chưa có quyền xem minh chứng đóng góp.' : 'Không thể tải chứng cứ đóng góp.')
    }).finally(() => {
      if (active) setEvidenceLoading(false)
    })
    return () => { active = false }
  }, [projectId, selectedUserId, evidencePage, sourceType])

  const rebuild = async () => {
    if (!projectId || await requestConfirmation({ title: 'Lưu bản tổng hợp đóng góp?', description: 'Ghi lại hoạt động của các thành viên theo dữ liệu hiện tại để đối chiếu sau này.', confirmLabel: 'Lưu bản tổng hợp' }) === null) return
    setBusy(true)
    try {
      const next = await api.rebuildContributionSnapshot(projectId)
      setSummary(next); setSnapshot(true); setPage(1); setError(null)
    } catch (reason) {
      if (reason instanceof HttpError && reason.status === 409) await load()
      setError(reason instanceof HttpError && reason.status === 409 ? 'Dữ liệu đã thay đổi. Đã tải lại đóng góp; hãy kiểm tra trước khi tạo bản tổng hợp mới.' : 'Hệ thống không thể tạo bản tổng hợp đóng góp trong phạm vi này.')
    } finally {
      setBusy(false)
    }
  }

  const exportCsv = () => {
    if (!summary?.members.length) return
    const headers = [
      'Mã thành viên', 'Họ và tên', 'Công việc hoàn tất', 'Công việc được giao',
      'Báo cáo đã nộp', 'Cuộc họp tham gia', 'Bản nộp hoàn tất', 'Tệp tải lên',
      'Tổng minh chứng', 'Điểm hoạt động',
    ]
    const rows = summary.members.map((m) => [
      m.userId, `"${m.displayName.replace(/"/g, '""')}"`, m.completedTasks, m.assignedTasks,
      m.submittedReports, m.attendedMeetings, m.submittedDeliverableVersions, m.uploadedFiles,
      m.evidenceCount, m.activityScore,
    ])
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `bao-cao-dong-gop-do-an-${projectId ?? 'summary'}.csv`
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 60000)
  }

  const selectedMember = summary?.members.find(member => member.userId === selectedUserId)
  const totalEvidence = summary?.members.reduce((total, member) => total + member.evidenceCount, 0) ?? 0
  const completedTasks = summary?.members.reduce((total, member) => total + member.completedTasks, 0) ?? 0
  const assignedTasks = summary?.members.reduce((total, member) => total + member.assignedTasks, 0) ?? 0
  const completionRate = assignedTasks > 0 ? `${Math.round((completedTasks / assignedTasks) * 100)}%` : '—'

  const filteredMembers = useMemo(() => {
    const list = summary?.members ?? []
    const needle = memberSearch.trim().toLowerCase()
    const matching = needle ? list.filter(m => m.displayName.toLowerCase().includes(needle)) : list
    return [...matching].sort((a, b) => {
      if (memberSort === 'tasks_desc') return b.completedTasks - a.completedTasks || b.activityScore - a.activityScore
      if (memberSort === 'evidence_desc') return b.evidenceCount - a.evidenceCount || b.activityScore - a.activityScore
      if (memberSort === 'name_asc') return a.displayName.localeCompare(b.displayName, 'vi-VN')
      return b.activityScore - a.activityScore || b.evidenceCount - a.evidenceCount
    })
  }, [summary, memberSearch, memberSort])

  const filteredEvidence = useMemo(() => {
    const needle = evidenceSearch.trim().toLowerCase()
    if (!needle) return evidence
    return evidence.filter(item => item.label.toLowerCase().includes(needle) || sourceLabel(item.sourceType).toLowerCase().includes(needle))
  }, [evidence, evidenceSearch])

  const executionBase = useMemo(() => {
    const mentorMatch = location.pathname.match(/^(\/mentor\/projects\/\d+\/majors\/\d+)/)
    if (mentorMatch) return mentorMatch[1]
    if (location.pathname.startsWith('/supervisor/projects/') && projectId) return `/supervisor/projects/${projectId}`
    if (location.pathname.startsWith('/project/')) return '/project'
    if (role === 'student') return '/project'
    if (role === 'lecturer' && projectId) return `/supervisor/projects/${projectId}`
    return null
  }, [location.pathname, projectId, role])

  const resolveEvidenceLink = useCallback((item: ContributionEvidence): string | null => {
    if (item.sourceType === 'FILE') {
      if (executionBase) return `${executionBase}/files`
      if (projectId && (role === 'department' || role === 'admin')) return `/department/projects/${projectId}/files`
      return null
    }
    if (!executionBase) return null
    switch (item.sourceType) {
      case 'TASK': return `${executionBase}/tasks/${item.sourceId}`
      case 'PROGRESS_REPORT': return `${executionBase}/reports/${item.sourceId}`
      case 'MEETING': return `${executionBase}/meetings/${item.sourceId}`
      case 'DELIVERABLE_VERSION':
      case 'DELIVERABLE': return `${executionBase}/deliverables`
      default: return null
    }
  }, [executionBase, projectId, role])

  const downloadEvidenceFile = async (fileId: number, fileName: string) => {
    try {
      const blob = await downloadProjectFile(fileId)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = fileName
      anchor.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch {
      setEvidenceError('Không thể tải tệp minh chứng này.')
    }
  }

  const projectEyebrow = journey.project?.code ? `Theo dõi đóng góp · ${journey.project.code}` : 'Theo dõi đóng góp'
  const backTo = Number.isInteger(routeId) && routeId > 0
    ? (role === 'department' || role === 'admin' ? '/department/portfolio' : `/supervisor/projects/${routeId}/workspace`)
    : undefined
  const backLabel = role === 'department' || role === 'admin' ? 'Danh mục đồ án' : 'Tổng quan đồ án'

  return (
    <WorkspacePage
      className="space-y-5"
      title="Đóng góp của thành viên"
      eyebrow={projectEyebrow}
      backTo={backTo}
      backLabel={backLabel}
      description="Theo dõi hoạt động và mở từng chứng cứ do hệ thống ghi nhận. Chỉ số hoạt động hỗ trợ đối chiếu, không thay thế điểm học phần."
      action={summary ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-md border border-hairline bg-card px-3 text-sm font-semibold text-ink-soft hover:bg-canvas hover:text-ink transition-colors shadow-2xs">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">refresh</span>Làm mới
          </button>
          <button type="button" onClick={exportCsv} className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-md border border-hairline bg-card px-3 text-sm font-semibold text-ink-soft hover:bg-canvas hover:text-ink transition-colors shadow-2xs">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">download</span>Xuất báo cáo (CSV)
          </button>
          {canSnapshot && (
            <button type="button" disabled={busy} className="min-h-11 whitespace-nowrap rounded-md bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover shadow-primary disabled:cursor-not-allowed disabled:opacity-50" onClick={() => void rebuild()}>
              {busy ? 'Đang tạo…' : 'Lưu bản tổng hợp'}
            </button>
          )}
        </div>
      ) : undefined}
    >
      {confirmationDialog}
      {error && (
        <InlineAlert
          tone="error"
          action={<button type="button" className="inline-flex min-h-8 items-center rounded-md px-2.5 py-1 text-xs font-bold text-primary hover:bg-card/80" onClick={() => void load()}>Tải lại</button>}
        >
          {error}
        </InlineAlert>
      )}
      {loading && <ListLoading label="Đang tải dữ liệu đóng góp…" />}
      {!loading && !projectId && <div className="rounded-lg border border-hairline bg-card p-5 text-sm text-ink-muted">Không tìm thấy đồ án để xem đóng góp.</div>}

      {!loading && summary && (
        <>
          <StatTileRow
            tiles={[
              { icon: 'groups', label: 'Thành viên', value: summary.totalCount, caption: snapshot ? 'Bản tổng hợp đã lưu' : 'Dữ liệu hiện tại', hero: true },
              { icon: 'task_alt', label: 'Công việc hoàn tất', value: `${completedTasks}/${assignedTasks}`, caption: 'Theo nhiệm vụ được giao', tone: 'success' },
              { icon: 'fact_check', label: 'Tổng chứng cứ', value: totalEvidence, caption: 'Ghi nhận trong trang hiện tại', tone: 'info' },
              {
                icon: 'donut_large',
                label: 'Tỷ lệ hoàn thành việc',
                value: completionRate,
                caption: summary.snapshotAt ? `Lưu lúc ${formatDate(summary.snapshotAt)}` : ({ SUFFICIENT: 'Đủ dữ liệu đối chiếu', INSUFFICIENT_DATA: 'Chưa đủ dữ liệu' }[summary.dataStatus] ?? 'Dữ liệu trực tiếp'),
                tone: summary.dataStatus === 'INSUFFICIENT_DATA' ? 'warning' : 'neutral',
              },
            ]}
          />

          {summary.dataStatus === 'INSUFFICIENT_DATA' && (
            <InlineAlert tone="warning">
              Chưa đủ chứng cứ để so sánh hoạt động giữa các thành viên. Đây không phải là đánh giá hoặc điểm học phần.
            </InlineAlert>
          )}

          <section className="overflow-hidden rounded-lg border border-hairline bg-card" aria-labelledby="contribution-members-heading">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-4 py-4 sm:px-5">
              <div>
                <h2 id="contribution-members-heading" className="font-semibold text-ink">Hoạt động theo thành viên</h2>
                <p className="mt-1 text-xs text-ink-muted">{summary.snapshotHash ? `Bản lưu đối chiếu · ${formatDate(summary.snapshotAt ?? '')}` : 'Cập nhật theo hoạt động hiện tại'}</p>
              </div>
              <span className="rounded-full border border-primary/20 bg-primary-subtle px-2.5 py-1 text-xs font-bold text-primary">
                {filteredMembers.length} thành viên
              </span>
            </div>

            <FilterToolbar
              embedded
              search={memberSearch}
              onSearchChange={setMemberSearch}
              searchPlaceholder="Tìm theo tên thành viên…"
              controls={
                <select
                  aria-label="Nguồn dữ liệu"
                  value={snapshot ? 'snapshot' : 'live'}
                  onChange={event => { setSnapshot(event.target.value === 'snapshot'); setPage(1); setSelectedUserId(null); setSourceType('') }}
                >
                  <option value="live">Dữ liệu hiện tại</option>
                  <option value="snapshot">Bản tổng hợp đã lưu</option>
                </select>
              }
              sort={{
                value: memberSort,
                onChange: (val) => setMemberSort(val as MemberSort),
                options: [
                  { value: 'score_desc', label: 'Điểm hoạt động cao nhất' },
                  { value: 'tasks_desc', label: 'Hoàn thành việc nhiều nhất' },
                  { value: 'evidence_desc', label: 'Nhiều chứng cứ nhất' },
                  { value: 'name_asc', label: 'Tên A–Z' },
                ],
              }}
              hasActiveFilters={Boolean(memberSearch.trim()) || memberSort !== 'score_desc'}
              onClearAll={() => { setMemberSearch(''); setMemberSort('score_desc') }}
            />

            {filteredMembers.length === 0 ? (
              <div className="p-8 text-center text-sm text-ink-muted">Chưa có dữ liệu đóng góp phù hợp.</div>
            ) : (
              <ul className="divide-y divide-hairline">
                {filteredMembers.map(member => (
                  <li key={member.userId} className={`grid gap-4 p-4 transition-colors sm:p-5 xl:grid-cols-[minmax(12rem,1.1fr)_minmax(16rem,1.8fr)_auto] xl:items-center ${selectedUserId === member.userId ? 'bg-primary-subtle/70' : 'hover:bg-canvas/80'}`}>
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={member.displayName} size="md" shape="circle" />
                      <div className="min-w-0">
                        <strong className="block truncate text-sm text-ink">{member.displayName}</strong>
                        <span className="text-xs text-ink-muted">Thành viên nhóm</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-5 gap-y-2 text-xs sm:grid-cols-3">
                      <ContributionStat label="Công việc" value={`${member.completedTasks}/${member.assignedTasks}`} />
                      <ContributionStat label="Báo cáo" value={member.submittedReports} />
                      <ContributionStat label="Cuộc họp" value={member.attendedMeetings} />
                      <ContributionStat label="Bản nộp" value={member.submittedDeliverableVersions} />
                      <ContributionStat label="Tệp" value={member.uploadedFiles} />
                      <ContributionStat label="Hoạt động" value={member.activityScore} />
                    </div>
                    <button
                      type="button"
                      aria-label="Xem chứng cứ"
                      title={`Xem ${member.evidenceCount} chứng cứ của ${member.displayName}`}
                      className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-hairline bg-card px-3.5 text-sm font-semibold text-primary transition-colors hover:border-primary/30 hover:bg-primary-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      onClick={() => { setSelectedUserId(member.userId); setEvidencePage(1); setSourceType(''); setEvidenceSearch(''); setEvidenceError(null) }}
                    >
                      <span className="font-mono text-xs font-bold">{member.evidenceCount}</span> Xem chứng cứ
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {summary.totalCount > 20 && <Pager page={page} total={summary.totalCount} onChange={setPage} />}
          </section>

          {projectId && <ContributionFairnessPanel projectId={projectId} />}

          {selectedUserId && (
            <Modal open drawer title="Minh chứng đóng góp" description={selectedMember?.displayName ?? 'Thành viên nhóm'} onClose={() => { setSelectedUserId(null); setEvidenceError(null) }}>
              <div className="space-y-4">
                {evidenceError && <InlineAlert tone="error">{evidenceError}</InlineAlert>}
                <FilterToolbar
                  embedded
                  className="rounded-lg border border-hairline"
                  search={evidenceSearch}
                  onSearchChange={setEvidenceSearch}
                  searchPlaceholder="Tìm tiêu đề minh chứng…"
                  controls={
                    <select
                      aria-label="Nguồn chứng cứ"
                      value={sourceType}
                      onChange={event => { setSourceType(event.target.value); setEvidencePage(1) }}
                    >
                      <option value="">Tất cả nguồn</option>
                      <option value="TASK">Công việc</option>
                      <option value="PROGRESS_REPORT">Báo cáo tiến độ</option>
                      <option value="MEETING">Cuộc họp</option>
                      <option value="DELIVERABLE_VERSION">Phiên bản hạng mục</option>
                      <option value="FILE">Tệp</option>
                    </select>
                  }
                  hasActiveFilters={Boolean(sourceType || evidenceSearch.trim())}
                  onClearAll={() => { setSourceType(''); setEvidenceSearch(''); setEvidencePage(1) }}
                />
                {evidenceLoading && <ListLoading label="Đang tải chứng cứ…" />}
                {!evidenceLoading && filteredEvidence.length === 0 && (
                  <div className="p-8 text-center text-sm text-ink-muted">
                    <span className="material-symbols-outlined mb-2 block text-3xl text-ink-muted" aria-hidden="true">inventory_2</span>
                    Chưa có chứng cứ phù hợp.
                  </div>
                )}
                {!evidenceLoading && filteredEvidence.length > 0 && (
                  <ul className="divide-y divide-hairline">
                    {filteredEvidence.map(item => {
                      const titleText = item.sourceType === 'PROGRESS_REPORT'
                        ? ({ WEEKLY: 'Báo cáo tuần', MONTHLY: 'Báo cáo tháng' }[item.label] ?? item.label)
                        : item.label
                      const href = resolveEvidenceLink(item)
                      const isFile = item.sourceType === 'FILE'
                      const sourceIcon = item.sourceType === 'TASK'
                        ? 'checklist'
                        : item.sourceType === 'MEETING'
                          ? 'groups'
                          : item.sourceType === 'PROGRESS_REPORT'
                            ? 'assignment'
                            : item.sourceType === 'DELIVERABLE_VERSION'
                              ? 'inventory_2'
                              : 'description'
                      return (
                        <li key={`${item.sourceType}-${item.sourceId}`} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 py-3.5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
                          <span className="grid size-9 place-items-center rounded-md bg-primary-subtle text-primary">
                            <span className="material-symbols-outlined text-[19px]" aria-hidden="true">{sourceIcon}</span>
                          </span>
                          <div className="min-w-0">
                            {isFile ? (
                              <button
                                type="button"
                                onClick={() => setPreviewEvidenceFile({ id: item.sourceId, fileName: titleText })}
                                className="block max-w-full text-left font-semibold break-words text-sm text-ink transition-colors hover:text-primary hover:underline"
                              >
                                {titleText}
                              </button>
                            ) : href ? (
                              <Link
                                to={href}
                                onClick={() => setSelectedUserId(null)}
                                className="block max-w-full font-semibold break-words text-sm text-ink transition-colors hover:text-primary hover:underline"
                              >
                                {titleText}
                              </Link>
                            ) : (
                              <strong className="block break-words text-sm text-ink">{titleText}</strong>
                            )}
                            <span className="mt-1 block text-xs text-ink-muted">{sourceLabel(item.sourceType)}</span>
                          </div>
                          <div className="col-start-2 flex flex-wrap items-center justify-between gap-2 text-left sm:col-start-auto sm:flex-col sm:items-end sm:text-right">
                            <div>
                              <span className="block text-xs text-ink-muted">{formatDate(item.occurredAt)}</span>
                              {item.credit !== 1 && <span className="mt-0.5 block font-mono text-xs text-ink-muted">Mức đóng góp: {item.credit}</span>}
                            </div>
                            {isFile ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setPreviewEvidenceFile({ id: item.sourceId, fileName: titleText })}
                                  className="inline-flex min-h-8 items-center gap-1 rounded-md border border-primary/25 bg-primary-subtle px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
                                >
                                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">visibility</span>
                                  Xem
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void downloadEvidenceFile(item.sourceId, titleText)}
                                  className="inline-flex min-h-8 items-center gap-1 rounded-md border border-hairline bg-card px-2 py-1 text-xs font-semibold text-ink-soft transition-colors hover:border-primary/35 hover:text-primary"
                                  title="Tải xuống"
                                >
                                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">download</span>
                                  Tải
                                </button>
                              </div>
                            ) : href ? (
                              <Link
                                to={href}
                                onClick={() => setSelectedUserId(null)}
                                className="inline-flex min-h-8 items-center gap-1 rounded-md border border-hairline bg-card px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:border-primary/35 hover:bg-primary-subtle"
                              >
                                <span>Mở nguồn</span>
                                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">open_in_new</span>
                              </Link>
                            ) : null}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
                {evidenceTotal > 20 && <Pager page={evidencePage} total={evidenceTotal} onChange={setEvidencePage} />}
              </div>
            </Modal>
          )}
          {previewEvidenceFile && (
            <DocumentPreviewModal
              open
              fileId={previewEvidenceFile.id}
              fileName={previewEvidenceFile.fileName}
              loadBlob={(signal) => downloadProjectFile(previewEvidenceFile.id, signal)}
              onDownload={() => void downloadEvidenceFile(previewEvidenceFile.id, previewEvidenceFile.fileName)}
              onClose={() => setPreviewEvidenceFile(null)}
            />
          )}
        </>
      )}
    </WorkspacePage>
  )
}

function Pager({ page, total, onChange }: { page: number; total: number; onChange: (next: number) => void }) {
  return (
    <nav aria-label="Phân trang đóng góp" className="flex items-center justify-between border-t border-hairline px-4 py-3 text-sm sm:px-5">
      <button type="button" disabled={page <= 1} className="min-h-10 rounded-md border border-hairline px-3 font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-40" onClick={() => onChange(page - 1)}>Trang trước</button>
      <span className="font-mono text-xs text-ink-muted">{page} / {Math.ceil(total / 20)}</span>
      <button type="button" disabled={page >= Math.ceil(total / 20)} className="min-h-10 rounded-md border border-hairline px-3 font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-40" onClick={() => onChange(page + 1)}>Trang sau</button>
    </nav>
  )
}

function ContributionStat({ label, value }: { label: string; value: string | number }) {
  return <p className="flex items-baseline justify-between gap-2 border-b border-line pb-1 text-ink-muted"><span>{label}</span><strong className="font-mono text-xs text-ink-soft">{value}</strong></p>
}

function sourceLabel(value: string) {
  return ({ TASK: 'Công việc', PROGRESS_REPORT: 'Báo cáo', MEETING: 'Cuộc họp', DELIVERABLE_VERSION: 'Bản nộp', FILE: 'Tệp' } as Record<string, string>)[value] ?? value
}

function formatDate(value: string) {
  return dateTimeLabel(value)
}
