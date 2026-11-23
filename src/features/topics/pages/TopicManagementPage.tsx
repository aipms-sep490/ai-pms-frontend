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
import { useTopics } from '../hooks/useTopics'
import { TopicContentForm } from '../components/TopicContentForm'
import { useTopicCatalog } from '../hooks/useTopicCatalog'
import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'
import { topicErrorMessage } from '../api/topic-api'
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
  const [sortBy, setSortBy] = useState<TopicSort>('default')
  const decisionVersion = useRef(0)
  useEffect(() => { decisionVersion.current++; setDraftDirty(false) }, [id, topics.current?.concurrencyToken])
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()
  const [message, setMessage] = useState<string | null>(null)

  const visibleTopics = useMemo(() => {
    const list = topics.items.filter(topic => {
      if (modeFilter !== 'ALL' && topic.projectMode !== modeFilter) return false
      if (majorFilter !== 'ALL') {
        const majorId = Number(majorFilter)
        const matchesPrimary = topic.primaryMajorId === majorId
        const matchesReq = topic.requirements.some(req => req.majorId === majorId)
        if (!matchesPrimary && !matchesReq) return false
      }
      return true
    })
    if (sortBy === 'title_asc') return [...list].sort((a, b) => a.title.localeCompare(b.title, 'vi'))
    if (sortBy === 'code_asc') return [...list].sort((a, b) => a.code.localeCompare(b.code, 'vi'))
    return list
  }, [topics.items, modeFilter, majorFilter, sortBy])

  if (topics.isUnauthorized) return <WorkspacePage size="wide" className="topic mk-page-enter" title="Quản lý đề tài" eyebrow="Danh mục học vụ"><div className="rounded-xl border border-hairline bg-card p-5 text-sm text-ink-soft"><Link className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4" to="/login">Đăng nhập</Link></div></WorkspacePage>
  if (topics.loading && id) return <WorkspacePage size="wide" className="topic mk-page-enter" title="Chi tiết đề tài" eyebrow="Danh mục học vụ"><ListLoading label="Đang tải danh mục đề tài…" /></WorkspacePage>
  if (topics.isForbidden) return <WorkspacePage size="wide" className="topic mk-page-enter" title="Quản lý đề tài" eyebrow="Danh mục học vụ"><p role="alert" className="rounded-xl border border-status-warning-border bg-status-warning-bg p-5 text-sm text-status-warning-text">Bạn không có quyền quản lý đề tài trong bộ môn này.</p></WorkspacePage>
  if (topics.error) return <WorkspacePage size="wide" className="topic mk-page-enter" title="Quản lý đề tài" eyebrow="Danh mục học vụ"><div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-status-error-border bg-status-error-bg p-5 text-sm text-status-error-text"><p>Không thể tải danh mục đề tài.</p><Button className="min-h-11" onClick={() => void topics.refresh()}>Thử lại</Button></div></WorkspacePage>

  const decide = async (close = false) => {
    const version = decisionVersion.current
    const decision = await requestConfirmation({ title: close ? 'Đóng đề tài?' : 'Công bố đề tài?', description: close ? 'Ghi rõ lý do đóng đề tài.' : 'Công bố phiên bản đã lưu. Hãy lưu các chỉnh sửa bản nháp trước, rồi kiểm tra nội dung đề cương, ngành, kỳ đăng ký và chính sách.', confirmLabel: close ? 'Đóng đề tài' : 'Công bố đề tài', danger: close, ...(close ? { reasonLabel: 'Lý do đóng' } : {}) })
    if (decision === null || version !== decisionVersion.current) return
    try { if (close) await topics.close(decision); else await topics.publish(); setMessage(close ? 'Đã đóng đề tài.' : 'Đã công bố đề tài.') }
    catch (reason) { setMessage(topicErrorMessage(reason)) }
  }

  const resolveMajorName = (majorId: number | null | undefined, fallbackReqs?: Array<{ majorId: number; majorName?: string | null }>) => {
    if (!majorId) return 'Không áp dụng'
    return catalog.majors.find(m => m.id === majorId)?.name
      ?? fallbackReqs?.find(r => r.majorId === majorId)?.majorName
      ?? 'Chuyên ngành thuộc bộ môn'
  }

  if (id && topics.current) {
    const topic = topics.current
    return (
      <WorkspacePage
        size="wide"
        className="topic mk-page-enter"
        eyebrow={`Đề tài ${topic.code}`}
        title={topic.title}
        description={topic.leadDepartmentName}
        backTo="/department/topics"
        backLabel="Danh mục đề tài"
        action={<StatusBadge tone={statusTone[topic.status]} label={statusLabels[topic.status]} />}
      >
        <section className="topic__detail">
          <h2>Thông tin đề tài</h2>
          <p>{topic.description || 'Chưa có mô tả.'}</p>
          <dl>
            <div><dt>Hình thức</dt><dd>{modeLabels[topic.projectMode]}</dd></div>
            <div><dt>Ngành chính</dt><dd>{resolveMajorName(topic.primaryMajorId, topic.requirements)}</dd></div>
          </dl>
          <h2>Yêu cầu theo ngành</h2>
          {topic.requirements.length ? <ul>{topic.requirements.map((requirement) => <li key={requirement.majorId}>{requirement.majorName || resolveMajorName(requirement.majorId)}: {requirement.minMembers}–{requirement.maxMembers} · {requirement.responsibility}</li>)}</ul> : <p>Chưa có yêu cầu theo ngành.</p>}
          <h2>Bối cảnh và vấn đề</h2><p>{topic.problemStatement || 'Chưa có nội dung.'}</p>
          <h2>Mục tiêu</h2><p>{topic.objectives || 'Chưa có nội dung.'}</p>
          <h2>Sản phẩm kỳ vọng</h2><p>{topic.expectedOutput || 'Chưa có nội dung.'}</p>
          <h2>Lĩnh vực và công nghệ</h2><p>{topic.domain || 'Chưa có lĩnh vực'} · {topic.technologies.join(', ') || 'Chưa có công nghệ'}</p>
          <h2>Từ khóa</h2><p>{topic.keywords.join(', ') || 'Chưa có từ khóa'}</p>
        </section>
        {confirmationDialog}
        {message && <p className="topic__message" role="status">{message}</p>}
        {topics.mutationError && <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">{topicErrorMessage(topics.mutationError)}</p>}
        {topic.status === 'DRAFT' && catalog.department?.id === topic.leadDepartmentId && <section className="topic__edit"><h2>Chỉnh sửa bản nháp</h2><TopicContentForm key={`${topic.id}:${topic.concurrencyToken}`} initial={topic} onDirtyChange={setDraftDirty} catalog={catalog} busy={topics.saving} onSave={async content => { const result = await topics.update(content); setMessage('Đã lưu đầy đủ nội dung đề cương.'); return result }} />{draftDirty && <p role="status" className="text-sm text-status-warning-text">Có chỉnh sửa chưa lưu. Lưu bản nháp trước khi công bố.</p>}<Button variant="secondary" className="min-h-11" disabled={topics.saving || draftDirty} onClick={() => void decide()}>Công bố</Button></section>}
        {topic.status !== 'CLOSED' && catalog.department?.id === topic.leadDepartmentId && <div className="flex justify-start"><Button variant="danger" className="min-h-11" disabled={topics.saving} onClick={() => void decide(true)}>Đóng đề tài</Button></div>}
      </WorkspacePage>
    )
  }

  const totalPages = Math.max(1, Math.ceil(topics.totalCount / topics.pageSize))
  const hasActiveFilters = Boolean(topics.filters.search || topics.filters.status || modeFilter !== 'ALL' || majorFilter !== 'ALL')
  const activeChips: ActiveFilterChip[] = []
  if (topics.filters.status) activeChips.push({ id: 'status', label: 'Trạng thái', value: statusLabels[topics.filters.status] })
  if (modeFilter !== 'ALL') activeChips.push({ id: 'mode', label: 'Chế độ', value: modeLabels[modeFilter] })
  if (majorFilter !== 'ALL') {
    const majorName = catalog.majors.find(m => String(m.id) === majorFilter)?.name ?? 'Ngành đã chọn'
    activeChips.push({ id: 'major', label: 'Ngành', value: majorName })
  }

  return (
    <WorkspacePage
      size="wide"
      className="topic mk-page-enter"
      eyebrow="Danh mục học vụ"
      title="Quản lý đề tài"
      description="Tạo, công bố và theo dõi các đề tài dùng cho kỳ đồ án."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" icon="auto_awesome" onClick={() => setAiBatchOpen(true)}>
            Nhập / Soạn hàng loạt bằng AI
          </Button>
          <Button icon="add" onClick={() => setCreateOpen(true)}>Tạo đề tài mới</Button>
        </div>
      }
    >
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
                onChange={event => topics.setFilters({ ...topics.filters, status: (event.target.value || undefined) as 'DRAFT' | 'PUBLISHED' | 'CLOSED' | undefined, page: 1 })}
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
        }}
        onClearAll={() => {
          topics.setFilters({ ...topics.filters, search: undefined, status: undefined, page: 1 })
          setModeFilter('ALL')
          setMajorFilter('ALL')
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
              `Đã tạo ${result.createdCount} bản nháp đề tài (DRAFT)${result.skippedCount > 0 ? `, bỏ qua ${result.skippedCount} dòng không hợp lệ` : ''}. Hãy kiểm tra chi tiết từng đề tài trước khi công bố.`,
            )
            if (topics.filters.status && topics.filters.status !== 'DRAFT') {
              topics.setFilters({ ...topics.filters, status: 'DRAFT', page: 1 })
            } else {
              void topics.refresh()
            }
          }}
        />
      )}

      {topics.mutationError && <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">{topicErrorMessage(topics.mutationError)}</p>}
      {message && <p className="topic__message" role="status">{message}</p>}
      <section className="topic__list" aria-labelledby="topic-list-title">
        <div className="topic__section-heading"><div><p>DANH SÁCH</p><h2 id="topic-list-title">Đề tài hiện có</h2></div><span>{topics.totalCount} đề tài</span></div>
        {topics.loading ? <ListLoading label="Đang tải danh mục đề tài…" /> : <>
          {visibleTopics.map(topic => (
            <article key={topic.id}>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={statusTone[topic.status]} label={statusLabels[topic.status]} />
                  <span className="font-mono text-xs font-semibold text-ink-muted">{topic.code}</span>
                </div>
                <Link to={`/department/topics/${topic.id}`}>{topic.title}</Link>
                <p>{topic.leadDepartmentName}</p>
              </div>
              <p className="text-right">{modeLabels[topic.projectMode]} · {topic.requirements.map(requirement => requirement.majorName || resolveMajorName(requirement.majorId)).join(', ')}</p>
            </article>
          ))}
          {!visibleTopics.length && <p className="topic__empty">Không có đề tài trong trạng thái đã chọn.</p>}
        </>}
      </section>
      {!topics.loading && totalPages > 1 && <nav className="topic__pagination" aria-label="Phân trang danh mục đề tài"><Button variant="secondary" className="min-h-11" disabled={topics.page <= 1} onClick={() => topics.setFilters({ ...topics.filters, page: topics.page - 1 })}>Trang trước</Button><span className="text-xs text-ink-muted">Trang {topics.page} / {totalPages}</span><Button variant="secondary" className="min-h-11" disabled={topics.page >= totalPages} onClick={() => topics.setFilters({ ...topics.filters, page: topics.page + 1 })}>Trang sau</Button></nav>}
    </WorkspacePage>
  )
}
