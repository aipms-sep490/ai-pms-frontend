import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AcademicWorkflowContext } from '../../../app/context/academic-workflow-context'
import { Button } from '../../../components/ui/Button'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { Modal } from '../../../components/ui/Modal'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import type { BadgeTone } from '../../../components/ui/status-badge-tone'
import { FilterToolbar, type ActiveFilterChip } from '../../../components/ui/FilterToolbar'
import { ListLoading } from '../../../components/ui/ListLoading'
import { Pagination } from '../../../components/ui/Pagination'
import { useTopics } from '../hooks/useTopics'
import { TopicContentForm } from '../components/TopicContentForm'
import { useTopicCatalog } from '../hooks/useTopicCatalog'
import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'
import { topicErrorMessage, type Topic } from '../api/topic-api'
import { TopicAiBatchModal } from '../components/TopicAiBatchModal'
import './topic-management.css'

const statusLabels = { DRAFT: 'Bản nháp', PUBLISHED: 'Đã công bố', CLOSED: 'Đã đóng' } as const
const statusTone: Record<'DRAFT' | 'PUBLISHED' | 'CLOSED', BadgeTone> = {
  DRAFT: 'warning',
  PUBLISHED: 'success',
  CLOSED: 'neutral',
}
const modeLabels: Record<'SINGLE_MAJOR' | 'INTERDISCIPLINARY', string> = { SINGLE_MAJOR: 'Một ngành', INTERDISCIPLINARY: 'Liên ngành' }
type TopicSort = 'default' | 'title_asc' | 'code_asc'

function readinessChecks(topic: Topic) {
  return [
    { key: 'problem', label: 'Bối cảnh và vấn đề', ok: Boolean(topic.problemStatement?.trim()) },
    { key: 'objectives', label: 'Mục tiêu đề tài', ok: Boolean(topic.objectives?.trim()) },
    { key: 'output', label: 'Sản phẩm kỳ vọng', ok: Boolean(topic.expectedOutput?.trim()) },
    { key: 'domain', label: 'Lĩnh vực ứng dụng', ok: Boolean(topic.domain?.trim()) },
    { key: 'tech', label: 'Công nghệ sử dụng', ok: topic.technologies.length > 0 },
    { key: 'keywords', label: 'Từ khóa tìm kiếm', ok: topic.keywords.length > 0 },
    {
      key: 'reqs',
      label: topic.projectMode === 'INTERDISCIPLINARY' ? 'Tối thiểu 2 ngành yêu cầu' : 'Ngành yêu cầu hợp lệ',
      ok: topic.projectMode === 'INTERDISCIPLINARY' ? topic.requirements.length >= 2 : topic.requirements.length === 1,
    },
  ]
}

export function TopicManagementPage() {
  const { id } = useParams()
  const workflow = useContext(AcademicWorkflowContext)
  const topics = useTopics(id ? Number(id) : undefined)
  const catalog = useTopicCatalog()
  const [draftDirty, setDraftDirty] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [aiBatchOpen, setAiBatchOpen] = useState(false)
  const [modeFilter, setModeFilter] = useState<'ALL' | 'SINGLE_MAJOR' | 'INTERDISCIPLINARY'>('ALL')
  const [majorFilter, setMajorFilter] = useState<string>('ALL')
  const [domainFilter, setDomainFilter] = useState<string>('ALL')
  const [sortBy, setSortBy] = useState<TopicSort>('default')
  const [selectedDraftIds, setSelectedDraftIds] = useState<Set<number>>(() => new Set())
  const decisionVersion = useRef(0)
  useEffect(() => { decisionVersion.current++; setDraftDirty(false) }, [id, topics.current?.concurrencyToken])
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()
  const [message, setMessage] = useState<string | null>(null)
  const [batchErrors, setBatchErrors] = useState<Array<{ code: string; title: string; reason: string }>>([])

  const domainOptions = useMemo(() => {
    const names = new Set<string>()
    for (const item of topics.items) {
      if (item.domain?.trim()) names.add(item.domain.trim())
    }
    return [...names].sort((a, b) => a.localeCompare(b, 'vi'))
  }, [topics.items])

  const visibleTopics = useMemo(() => {
    const list = topics.items.filter(topic => {
      if (modeFilter !== 'ALL' && topic.projectMode !== modeFilter) return false
      if (majorFilter !== 'ALL') {
        const majorId = Number(majorFilter)
        const matchesPrimary = topic.primaryMajorId === majorId
        const matchesReq = topic.requirements.some(req => req.majorId === majorId)
        if (!matchesPrimary && !matchesReq) return false
      }
      if (domainFilter !== 'ALL' && (topic.domain?.trim() ?? '') !== domainFilter) return false
      return true
    })
    if (sortBy === 'title_asc') return [...list].sort((a, b) => a.title.localeCompare(b.title, 'vi'))
    if (sortBy === 'code_asc') return [...list].sort((a, b) => a.code.localeCompare(b.code, 'vi'))
    return list
  }, [topics.items, modeFilter, majorFilter, domainFilter, sortBy])

  const publishableVisibleDrafts = useMemo(
    () => visibleTopics.filter(t => t.status === 'DRAFT' && catalog.department?.id === t.leadDepartmentId),
    [visibleTopics, catalog.department?.id],
  )
  const selectedPublishTargets = useMemo(
    () => publishableVisibleDrafts.filter(t => selectedDraftIds.has(t.id)),
    [publishableVisibleDrafts, selectedDraftIds],
  )

  if (topics.isUnauthorized) return <WorkspacePage size="wide" className="topic mk-page-enter" title="Quản lý đề tài" eyebrow="Danh mục học vụ"><div className="rounded-xl border border-hairline bg-card p-5 text-sm text-ink-soft"><Link className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4" to="/login">Đăng nhập</Link></div></WorkspacePage>
  if (topics.loading && id) return <WorkspacePage size="wide" className="topic mk-page-enter" title="Chi tiết đề tài" eyebrow="Danh mục học vụ"><ListLoading label="Đang tải danh mục đề tài…" /></WorkspacePage>
  if (topics.isForbidden) return <WorkspacePage size="wide" className="topic mk-page-enter" title="Quản lý đề tài" eyebrow="Danh mục học vụ"><p role="alert" className="rounded-xl border border-status-warning-border bg-status-warning-bg p-5 text-sm text-status-warning-text">Bạn không có quyền quản lý đề tài trong bộ môn này.</p></WorkspacePage>
  if (topics.error) return <WorkspacePage size="wide" className="topic mk-page-enter" title="Quản lý đề tài" eyebrow="Danh mục học vụ"><div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-status-error-border bg-status-error-bg p-5 text-sm text-status-error-text"><p>Không thể tải danh mục đề tài.</p><Button className="min-h-11" onClick={() => void topics.refresh()}>Thử lại</Button></div></WorkspacePage>

  const decide = async (close = false) => {
    const version = decisionVersion.current
    const decision = await requestConfirmation({
      title: close ? 'Đóng đề tài?' : 'Công bố đề tài?',
      description: close
        ? 'Ghi rõ lý do đóng đề tài.'
        : 'Công bố phiên bản đã lưu. Hãy lưu các chỉnh sửa bản nháp trước, rồi kiểm tra nội dung đề cương, ngành, kỳ đăng ký và chính sách.',
      confirmLabel: close ? 'Đóng đề tài' : 'Công bố đề tài',
      danger: close,
      ...(close ? { reasonLabel: 'Lý do đóng' } : {}),
    })
    if (decision === null || version !== decisionVersion.current) return
    try {
      if (close) await topics.close(decision)
      else await topics.publish()
      setMessage(close ? 'Đã đóng đề tài.' : 'Đã công bố đề tài thành công.')
    } catch (reason) {
      setMessage(topicErrorMessage(reason))
    }
  }

  const quickPublishRow = async (item: Topic) => {
    if (!topics.publishById) return
    const decision = await requestConfirmation({
      title: `Công bố đề tài ${item.code}?`,
      description: `Công bố "${item.title}" ra danh mục chính thức để sinh viên có thể đăng ký. Sau khi công bố, nội dung đề cương sẽ được khóa.`,
      confirmLabel: 'Công bố đề tài',
    })
    if (decision === null) return
    setBatchErrors([])
    try {
      await topics.publishById(item.id, item.concurrencyToken)
      setSelectedDraftIds(prev => { const next = new Set(prev); next.delete(item.id); return next })
      setMessage(`Đã công bố đề tài ${item.code} (${item.title}).`)
    } catch (reason) {
      setMessage(topicErrorMessage(reason))
    }
  }

  const batchPublishSelected = async () => {
    if (!topics.publishMany || selectedPublishTargets.length === 0) return
    const decision = await requestConfirmation({
      title: `Công bố ${selectedPublishTargets.length} đề tài đã chọn?`,
      description: 'Hệ thống sẽ kiểm tra chính sách kỳ, độ đầy đủ đề cương và trùng tiêu đề 3 kỳ cho từng bản nháp trước khi công bố.',
      confirmLabel: `Công bố ${selectedPublishTargets.length} đề tài`,
    })
    if (decision === null) return
    setBatchErrors([])
    const result = await topics.publishMany(
      selectedPublishTargets.map(t => ({ id: t.id, code: t.code, title: t.title, concurrencyToken: t.concurrencyToken })),
    )
    setSelectedDraftIds(new Set())
    if (result.publishedCount > 0) {
      setMessage(
        `Đã công bố ${result.publishedCount}/${selectedPublishTargets.length} đề tài${result.failed.length > 0 ? ` (${result.failed.length} đề tài chưa đạt điều kiện công bố)` : ''}.`,
      )
    } else {
      setMessage(null)
    }
    setBatchErrors(result.failed)
  }

  const resolveMajorName = (majorId: number | null | undefined, fallbackReqs?: Array<{ majorId: number; majorName?: string | null }>) => {
    if (!majorId) return 'Không áp dụng'
    return catalog.majors.find(m => m.id === majorId)?.name
      ?? fallbackReqs?.find(r => r.majorId === majorId)?.majorName
      ?? 'Chuyên ngành thuộc bộ môn'
  }

  if (id && topics.current) {
    const topic = topics.current
    const canManage = catalog.department?.id === topic.leadDepartmentId
    const checks = readinessChecks(topic)
    const completedChecks = checks.filter(c => c.ok).length

    return (
      <WorkspacePage
        size="wide"
        className="topic mk-page-enter"
        eyebrow={`Đề tài ${topic.code}`}
        title={topic.title}
        description={topic.leadDepartmentName}
        backTo="/department/topics"
        backLabel="Danh mục đề tài"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={statusTone[topic.status]} label={statusLabels[topic.status]} />
            {topic.status === 'DRAFT' && canManage && (
              <Button
                icon="publish"
                className="min-h-10"
                disabled={topics.saving || draftDirty}
                title={draftDirty ? 'Hãy lưu các chỉnh sửa bản nháp trước khi công bố.' : 'Công bố đề tài ra danh mục chính thức'}
                onClick={() => void decide()}
              >
                Công bố
              </Button>
            )}
            {topic.status !== 'CLOSED' && canManage && (
              <Button variant="danger" className="min-h-10" disabled={topics.saving} onClick={() => void decide(true)}>
                Đóng đề tài
              </Button>
            )}
          </div>
        }
      >
        {confirmationDialog}

        {draftDirty && topic.status === 'DRAFT' && canManage && (
          <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-status-warning-border bg-status-warning-bg px-4 py-3 text-sm text-status-warning-text">
            <span>Có chỉnh sửa chưa lưu. Lưu bản nháp trước khi công bố.</span>
            <button
              type="button"
              onClick={() => document.getElementById('topic-form-save-btn')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              className="rounded-lg border border-status-warning-border bg-card px-3 py-1.5 text-xs font-semibold text-status-warning-text hover:bg-canvas"
            >
              Tới nút Lưu bản nháp
            </button>
          </div>
        )}

        {message && <p className="topic__message" role="status">{message}</p>}
        {topics.mutationError && (
          <p role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-3.5 text-sm text-status-error-text">
            {topicErrorMessage(topics.mutationError)}
          </p>
        )}

        <div className="grid gap-5 lg:grid-cols-12">
          {/* Cột nội dung đề cương chính */}
          <section className="space-y-5 rounded-2xl border border-hairline bg-card p-5 lg:col-span-8">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-primary">Đề cương chi tiết</p>
                <h2 className="mt-0.5 text-base font-bold text-ink">Thông tin đề tài</h2>
              </div>
              {topic.status === 'DRAFT' && canManage && (
                <button
                  type="button"
                  onClick={() => document.getElementById('topic-draft-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-hairline bg-canvas px-3 text-xs font-semibold text-ink-soft hover:border-primary hover:text-primary"
                >
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">edit</span>
                  Chỉnh sửa nhanh
                </button>
              )}
            </div>

            <div className="rounded-xl border border-hairline bg-canvas/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Mô tả tổng quan</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{topic.description || 'Chưa có mô tả.'}</p>
            </div>

            <div className="grid items-stretch gap-3 md:grid-cols-2">
              <div className="flex h-full flex-col rounded-xl border border-hairline bg-canvas/50 p-4">
                <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-muted">
                  <span className="material-symbols-outlined text-[16px] text-primary" aria-hidden="true">psychology_alt</span>
                  Bối cảnh và vấn đề
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{topic.problemStatement || 'Chưa có nội dung.'}</p>
              </div>
              <div className="flex h-full flex-col rounded-xl border border-hairline bg-canvas/50 p-4">
                <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-muted">
                  <span className="material-symbols-outlined text-[16px] text-primary" aria-hidden="true">flag</span>
                  Mục tiêu
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{topic.objectives || 'Chưa có nội dung.'}</p>
              </div>
              <div className="rounded-xl border border-hairline bg-canvas/50 p-4 md:col-span-2">
                <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-muted">
                  <span className="material-symbols-outlined text-[16px] text-primary" aria-hidden="true">inventory_2</span>
                  Sản phẩm kỳ vọng
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{topic.expectedOutput || 'Chưa có nội dung.'}</p>
              </div>
            </div>

            <div className="space-y-2.5 border-t border-hairline pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">Yêu cầu theo ngành</h3>
              {topic.requirements.length ? (
                <ul className="space-y-2">
                  {topic.requirements.map(requirement => (
                    <li
                      key={requirement.majorId}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-hairline bg-canvas/60 px-4 py-3 text-sm text-ink-soft"
                    >
                      <span>{requirement.majorName || resolveMajorName(requirement.majorId)}: {requirement.minMembers}–{requirement.maxMembers} · {requirement.responsibility}</span>
                      <span className="rounded-full border border-hairline bg-card px-2.5 py-0.5 text-xs font-semibold text-ink-muted">
                        {requirement.minMembers}–{requirement.maxMembers} sinh viên
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-muted">Chưa có yêu cầu theo ngành.</p>
              )}
            </div>
          </section>

          {/* Cột thông tin metadata & checklist sẵn sàng công bố */}
          <aside className="space-y-4 lg:col-span-4">
            <section className="space-y-4 rounded-2xl border border-hairline bg-card p-5">
              <h2 className="border-b border-hairline pb-3 text-sm font-bold text-ink">Phạm vi &amp; Thuộc tính</h2>
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-xs font-medium text-ink-muted">Mã đề tài</dt>
                  <dd className="rounded-md bg-canvas px-2 py-0.5 font-mono text-xs font-bold text-ink">{topic.code}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-xs font-medium text-ink-muted">Hình thức</dt>
                  <dd className="font-semibold text-ink">{modeLabels[topic.projectMode]}</dd>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <dt className="shrink-0 text-xs font-medium text-ink-muted">Ngành chính</dt>
                  <dd className="text-right font-semibold text-ink">{resolveMajorName(topic.primaryMajorId, topic.requirements)}</dd>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <dt className="shrink-0 text-xs font-medium text-ink-muted">Lĩnh vực</dt>
                  <dd className="text-right font-medium text-ink-soft">{topic.domain || 'Chưa có lĩnh vực'}</dd>
                </div>
              </dl>

              <div className="space-y-2 border-t border-hairline pt-3">
                <p className="text-xs font-semibold text-ink-muted">Công nghệ</p>
                {topic.technologies.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {topic.technologies.map((tech, idx) => (
                      <span key={`${tech}-${idx}`} className="rounded-full border border-hairline bg-canvas px-2.5 py-1 text-xs font-medium text-ink-soft">
                        {tech}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-ink-muted">Chưa có công nghệ</p>
                )}
              </div>

              <div className="space-y-2 border-t border-hairline pt-3">
                <p className="text-xs font-semibold text-ink-muted">Từ khóa</p>
                {topic.keywords.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {topic.keywords.map((kw, idx) => (
                      <span key={`${kw}-${idx}`} className="rounded-full bg-primary-subtle px-2.5 py-1 text-xs font-medium text-primary">
                        #{kw}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-ink-muted">Chưa có từ khóa</p>
                )}
              </div>
            </section>

            {topic.status === 'DRAFT' && (
              <section className="space-y-3 rounded-2xl border border-hairline bg-card p-5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-ink">Sẵn sàng công bố</h2>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${completedChecks === checks.length ? 'bg-status-success-bg text-status-success-text' : 'bg-status-warning-bg text-status-warning-text'}`}>
                    {completedChecks}/{checks.length}
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {checks.map(item => (
                    <li key={item.key} className="flex items-center gap-2 text-xs">
                      <span
                        className={`material-symbols-outlined text-[16px] ${item.ok ? 'text-status-success-text' : 'text-status-warning-text'}`}
                        aria-hidden="true"
                      >
                        {item.ok ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      <span className={item.ok ? 'text-ink-soft' : 'font-medium text-status-warning-text'}>{item.label}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>

        {topic.status === 'DRAFT' && canManage && (
          <section id="topic-draft-editor" className="topic__edit">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-primary">Biên tập nội dung</p>
                <h2 className="mt-0.5 text-base font-bold text-ink">Chỉnh sửa bản nháp</h2>
              </div>
              <span className="text-xs text-ink-muted">Lưu bản nháp sau khi sửa rồi nhấn “Công bố” ở góc trên cùng</span>
            </div>
            <TopicContentForm
              key={`${topic.id}:${topic.concurrencyToken}`}
              initial={topic}
              onDirtyChange={setDraftDirty}
              catalog={catalog}
              busy={topics.saving}
              onSave={async content => {
                const result = await topics.update(content)
                setMessage('Đã lưu đầy đủ nội dung đề cương.')
                return result
              }}
            />
          </section>
        )}
      </WorkspacePage>
    )
  }

  const totalPages = Math.max(1, Math.ceil(topics.totalCount / Math.max(1, topics.pageSize)))
  const hasActiveFilters = Boolean(topics.filters.search || topics.filters.status || modeFilter !== 'ALL' || majorFilter !== 'ALL' || domainFilter !== 'ALL')
  const activeChips: ActiveFilterChip[] = []
  if (topics.filters.status) activeChips.push({ id: 'status', label: 'Trạng thái', value: statusLabels[topics.filters.status] })
  if (modeFilter !== 'ALL') activeChips.push({ id: 'mode', label: 'Chế độ', value: modeLabels[modeFilter] })
  if (majorFilter !== 'ALL') {
    const majorName = catalog.majors.find(m => String(m.id) === majorFilter)?.name ?? 'Ngành đã chọn'
    activeChips.push({ id: 'major', label: 'Ngành', value: majorName })
  }
  if (domainFilter !== 'ALL') activeChips.push({ id: 'domain', label: 'Lĩnh vực', value: domainFilter })
  const allVisibleDraftsSelected = publishableVisibleDrafts.length > 0 && selectedPublishTargets.length === publishableVisibleDrafts.length

  return (
    <WorkspacePage
      size="wide"
      className="topic mk-page-enter"
      eyebrow="Danh mục học vụ"
      title="Quản lý đề tài"
      description="Tạo, kiểm duyệt, công bố và theo dõi các đề tài dùng cho kỳ đồ án."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" icon="refresh" aria-label="Tải lại" disabled={topics.loading} onClick={() => void topics.refresh()} />
          <Button variant="secondary" icon="auto_awesome" onClick={() => setAiBatchOpen(true)}>
            Nhập / Soạn hàng loạt bằng AI
          </Button>
          <Button icon="add" onClick={() => setCreateOpen(true)}>Tạo đề tài mới</Button>
        </div>
      }
    >
      {confirmationDialog}

      <FilterToolbar
        search={topics.filters.search ?? ''}
        onSearchChange={value => topics.setFilters({ ...topics.filters, search: value || undefined, page: 1 })}
        searchLabel="Tìm đề tài"
        searchPlaceholder="Mã hoặc tên đề tài"
        debounceMs={0}
        controls={
          <>
            <label className="ft-select-wrap">
              <span className="sr-only">Trạng thái đề tài</span>
              <select
                className="ft-select"
                aria-label="Trạng thái đề tài"
                value={topics.filters.status ?? ''}
                onChange={event => {
                  setSelectedDraftIds(new Set())
                  topics.setFilters({ ...topics.filters, status: (event.target.value || undefined) as 'DRAFT' | 'PUBLISHED' | 'CLOSED' | undefined, page: 1 })
                }}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="DRAFT">Bản nháp</option>
                <option value="PUBLISHED">Đã công bố</option>
                <option value="CLOSED">Đã đóng</option>
              </select>
            </label>
            <label className="ft-select-wrap">
              <span className="sr-only">Chế độ đồ án</span>
              <select
                className="ft-select"
                aria-label="Lọc theo chế độ đồ án"
                value={modeFilter}
                onChange={event => setModeFilter(event.target.value as 'ALL' | 'SINGLE_MAJOR' | 'INTERDISCIPLINARY')}
              >
                <option value="ALL">Tất cả chế độ</option>
                <option value="SINGLE_MAJOR">Một ngành</option>
                <option value="INTERDISCIPLINARY">Liên ngành</option>
              </select>
            </label>
            {catalog.majors.length > 0 && (
              <label className="ft-select-wrap">
                <span className="sr-only">Chuyên ngành</span>
                <select
                  className="ft-select"
                  aria-label="Lọc theo chuyên ngành"
                  value={majorFilter}
                  onChange={event => setMajorFilter(event.target.value)}
                >
                  <option value="ALL">Tất cả chuyên ngành</option>
                  {catalog.majors.map(major => (
                    <option key={major.id} value={String(major.id)}>{major.name}</option>
                  ))}
                </select>
              </label>
            )}
            {domainOptions.length > 1 && (
              <label className="ft-select-wrap">
                <span className="sr-only">Lĩnh vực</span>
                <select
                  className="ft-select"
                  aria-label="Lọc theo lĩnh vực"
                  value={domainFilter}
                  onChange={event => setDomainFilter(event.target.value)}
                >
                  <option value="ALL">Tất cả lĩnh vực</option>
                  {domainOptions.map(domain => (
                    <option key={domain} value={domain}>{domain}</option>
                  ))}
                </select>
              </label>
            )}
          </>
        }
        sort={{
          value: sortBy,
          onChange: value => setSortBy(value as TopicSort),
          options: [
            { value: 'default', label: 'Mặc định hệ thống' },
            { value: 'title_asc', label: 'Tên đề tài A–Z' },
            { value: 'code_asc', label: 'Mã đề tài A–Z' },
          ],
        }}
        activeChips={activeChips}
        onRemoveChip={chipId => {
          if (chipId === 'status') topics.setFilters({ ...topics.filters, status: undefined, page: 1 })
          if (chipId === 'mode') setModeFilter('ALL')
          if (chipId === 'major') setMajorFilter('ALL')
          if (chipId === 'domain') setDomainFilter('ALL')
        }}
        onClearAll={() => {
          topics.setFilters({ ...topics.filters, search: undefined, status: undefined, page: 1 })
          setModeFilter('ALL')
          setMajorFilter('ALL')
          setDomainFilter('ALL')
        }}
        hasActiveFilters={hasActiveFilters}
        resultSummary={`${visibleTopics.length} / ${topics.totalCount} đề tài`}
      />

      {createOpen && (
        <Modal open className="max-w-3xl" title="Tạo bản nháp đề tài" busy={topics.saving} onClose={() => setCreateOpen(false)}>
          <TopicContentForm
            catalog={catalog}
            busy={topics.saving}
            onSave={async () => undefined}
            create={{
              onCreate: async input => {
                const result = await topics.create(input)
                setMessage('Đã tạo bản nháp đề tài.')
                setCreateOpen(false)
                return result
              },
            }}
          />
        </Modal>
      )}

      {aiBatchOpen && (
        <TopicAiBatchModal
          open
          onClose={() => setAiBatchOpen(false)}
          periods={catalog.periods}
          majors={catalog.majors}
          leadDepartmentId={catalog.department?.id ?? null}
          activeSemesterId={workflow?.academic?.selectedSemester?.id ?? workflow?.academic?.currentSemesters[0]?.id ?? null}
          onCreated={result => {
            if (result.createdCount <= 0) return
            setMessage(
              `Đã tạo ${result.createdCount} bản nháp đề tài (DRAFT)${result.skippedCount > 0 ? `, bỏ qua ${result.skippedCount} dòng không hợp lệ` : ''}. Bạn có thể bấm Công bố trực tiếp ngoài danh sách hoặc mở chi tiết để chỉnh sửa.`,
            )
            if (topics.filters.status && topics.filters.status !== 'DRAFT') {
              topics.setFilters({ ...topics.filters, status: 'DRAFT', page: 1 })
            } else {
              void topics.refresh()
            }
          }}
        />
      )}

      {topics.mutationError && <p role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-3.5 text-sm text-status-error-text">{topicErrorMessage(topics.mutationError)}</p>}
      {message && <p className="topic__message" role="status">{message}</p>}
      {batchErrors.length > 0 && (
        <div role="alert" className="space-y-1.5 rounded-xl border border-status-error-border bg-status-error-bg p-4 text-xs text-status-error-text">
          <p className="font-semibold">Một số đề tài chưa thể công bố (cần kiểm tra lại điều kiện):</p>
          <ul className="space-y-1">
            {batchErrors.map((err, idx) => (
              <li key={idx}>• <strong>{err.code}</strong> ({err.title}): {err.reason}</li>
            ))}
          </ul>
        </div>
      )}

      {selectedPublishTargets.length > 0 && typeof topics.publishMany === 'function' && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary-subtle px-4 py-3">
          <span className="text-sm font-semibold text-primary">
            Đã chọn {selectedPublishTargets.length} bản nháp sẵn sàng công bố
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" className="min-h-9" disabled={topics.saving} onClick={() => setSelectedDraftIds(new Set())}>
              Bỏ chọn
            </Button>
            <Button icon="publish" className="min-h-9" disabled={topics.saving} onClick={() => void batchPublishSelected()}>
              Công bố {selectedPublishTargets.length} đề tài
            </Button>
          </div>
        </div>
      )}

      <section className="topic__list" aria-labelledby="topic-list-title">
        <div className="topic__section-heading">
          <div className="flex flex-wrap items-center gap-3">
            {publishableVisibleDrafts.length > 0 && typeof topics.publishMany === 'function' && (
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-ink-soft">
                <input
                  type="checkbox"
                  aria-label="Chọn tất cả bản nháp hiển thị"
                  checked={allVisibleDraftsSelected}
                  onChange={() => {
                    if (allVisibleDraftsSelected) setSelectedDraftIds(new Set())
                    else setSelectedDraftIds(new Set(publishableVisibleDrafts.map(t => t.id)))
                  }}
                />
                Chọn tất cả nháp
              </label>
            )}
            <div>
              <p>DANH SÁCH</p>
              <h2 id="topic-list-title">Đề tài hiện có</h2>
            </div>
          </div>
          <span>{topics.totalCount} đề tài</span>
        </div>

        {topics.loading ? <ListLoading label="Đang tải danh mục đề tài…" /> : (
          <>
            {visibleTopics.length > 0 ? (
              <div className="grid grid-cols-1 items-stretch gap-3.5 md:grid-cols-2">
                {visibleTopics.map(topic => {
                  const canQuickPublish = topic.status === 'DRAFT' && catalog.department?.id === topic.leadDepartmentId && typeof topics.publishById === 'function'
                  const isSelected = selectedDraftIds.has(topic.id)
                  return (
                    <article
                      key={topic.id}
                      className="flex h-full flex-col justify-between gap-4 rounded-xl border border-hairline bg-card p-4 shadow-xs transition-all hover:border-primary/40 hover:shadow-sm"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        {canQuickPublish && typeof topics.publishMany === 'function' && (
                          <input
                            type="checkbox"
                            className="mt-1.5"
                            aria-label={`Chọn bản nháp ${topic.title}`}
                            checked={isSelected}
                            disabled={topics.saving}
                            onChange={() => {
                              setSelectedDraftIds(prev => {
                                const next = new Set(prev)
                                if (next.has(topic.id)) next.delete(topic.id)
                                else next.add(topic.id)
                                return next
                              })
                            }}
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge tone={statusTone[topic.status]} label={statusLabels[topic.status]} />
                            <span className="rounded bg-canvas px-1.5 py-0.5 font-mono text-xs font-semibold text-ink-muted">{topic.code}</span>
                            <span className="rounded-full border border-hairline bg-canvas px-2 py-0.5 text-xs font-medium text-ink-soft">
                              {modeLabels[topic.projectMode]}
                            </span>
                          </div>
                          <Link className="topic__row-title" to={`/department/topics/${topic.id}`}>{topic.title}</Link>
                          <p className="mt-1 text-xs text-ink-muted">
                            {topic.leadDepartmentName}
                            {topic.requirements.length > 0 && ` · ${topic.requirements.map(r => r.majorName || resolveMajorName(r.majorId)).join(', ')}`}
                          </p>
                          {topic.technologies.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {topic.technologies.slice(0, 5).map((tech, idx) => (
                                <span key={`${tech}-${idx}`} className="rounded-full border border-hairline bg-canvas px-2 py-0.5 text-xs text-ink-soft">
                                  {tech}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-auto flex flex-wrap items-center justify-end gap-2 border-t border-hairline pt-3">
                        {canQuickPublish && (
                          <Button
                            icon="publish"
                            className="min-h-9"
                            disabled={topics.saving}
                            onClick={() => void quickPublishRow(topic)}
                          >
                            Công bố
                          </Button>
                        )}
                        <Link
                          to={`/department/topics/${topic.id}`}
                          className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-hairline bg-canvas px-3 text-xs font-semibold text-ink-soft transition-colors hover:border-primary hover:text-primary"
                        >
                          {topic.status === 'DRAFT' ? 'Xem & Sửa' : 'Chi tiết'}
                        </Link>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <p className="topic__empty">Không có đề tài trong trạng thái đã chọn.</p>
            )}
          </>
        )}
      </section>

      {!topics.loading && totalPages > 1 && (
        <Pagination
          page={topics.page}
          pages={totalPages}
          total={topics.totalCount}
          pageSize={topics.pageSize}
          pageSizeOptions={[12, 24, 36]}
          onPage={nextPage => topics.setFilters({ ...topics.filters, page: nextPage })}
          onPageSizeChange={nextSize => topics.setFilters({ ...topics.filters, page: 1, pageSize: nextSize })}
        />
      )}
    </WorkspacePage>
  )
}
