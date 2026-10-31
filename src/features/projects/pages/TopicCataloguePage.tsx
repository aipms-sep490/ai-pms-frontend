import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAcademicWorkflow } from '../../../app/context/useAcademicWorkflow'
import { useStudentJourney } from '../../../app/context/useStudentJourney'
import { FilterToolbar } from '../../../components/ui/FilterToolbar'
import { Pagination } from '../../../components/ui/Pagination'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { useAuthSession } from '../../../features/auth/context/useAuthSession'
import { services } from '../../../services/service-gateway'
import { HttpError } from '../../../services/http/http-client'
import { isActionAllowed, type ProjectDto } from '../../../types/backend'
import { TopicDetailDrawer } from '../../registration/components/TopicDetailDrawer'
import { useTopicDiscovery } from '../../registration/hooks/useTopicDiscovery'
import { getTopic, type ProjectMode, type Topic } from '../../topics/api/topic-api'

const pageSize = 12
type TopicSort = 'default' | 'title_asc' | 'code_asc'

export function TopicCataloguePage() {
  const navigate = useNavigate()
  const { session } = useAuthSession()
  const accessToken = session?.accessToken
  const { academic } = useAcademicWorkflow()
  const journey = useStudentJourney()
  const [search, setSearch] = useState('')
  const [projectMode, setProjectMode] = useState<ProjectMode | undefined>()
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [compatibleOnly, setCompatibleOnly] = useState(false)
  const [sortBy, setSortBy] = useState<TopicSort>('default')
  const [page, setPage] = useState(1)
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<Error | null>(null)
  const [selectionProject, setSelectionProject] = useState<ProjectDto | null>(null)
  const [selectionError, setSelectionError] = useState<string | null>(null)
  const [selecting, setSelecting] = useState(false)

  const filters = useMemo(() => ({
    academicSemesterId: academic?.selectedSemester?.id,
    projectPeriodId: academic?.periods.find((period) => period.isOpen)?.id,
    projectMode,
    compatibleOnly,
    status: 'PUBLISHED' as const,
    search: search.trim() || undefined,
    page,
    pageSize,
  }), [academic?.periods, academic?.selectedSemester?.id, compatibleOnly, page, projectMode, search])
  const discovery = useTopicDiscovery(session?.accessToken, filters)
  const verifiedMajor = academic?.majors.find((m) => m.id === journey.profile?.majorId) ?? academic?.majors[0] ?? null
  const project = selectionProject?.id === journey.project?.id ? selectionProject : journey.project
  const projectStatus = project?.status.replaceAll('_', '').toUpperCase()
  const isLeader = Boolean(journey.team?.members.some((member) => member.userId === journey.profile?.id && member.isLeader))
  const canSelect = Boolean(project && (projectStatus === 'DRAFT' || projectStatus === 'REVISIONREQUIRED') && isLeader && isActionAllowed(journey.projectActions?.actions ?? [], 'edit_project_draft'))

  const departmentOptions = useMemo(() => {
    const names = new Set<string>()
    discovery.topics.forEach((t) => { if (t.leadDepartmentName) names.add(t.leadDepartmentName) })
    return [...names].sort((a, b) => a.localeCompare(b, 'vi-VN'))
  }, [discovery.topics])

  const visibleTopics = useMemo(() => {
    const filtered = departmentFilter
      ? discovery.topics.filter((t) => t.leadDepartmentName === departmentFilter)
      : discovery.topics
    if (sortBy === 'default') return filtered
    return [...filtered].sort((a, b) =>
      sortBy === 'code_asc'
        ? a.code.localeCompare(b.code, 'vi-VN')
        : a.title.localeCompare(b.title, 'vi-VN'),
    )
  }, [discovery.topics, departmentFilter, sortBy])

  const hasFilters = Boolean(search.trim() || projectMode || departmentFilter || compatibleOnly || sortBy !== 'default')
  const clearAll = () => { setSearch(''); setProjectMode(undefined); setDepartmentFilter(''); setCompatibleOnly(false); setSortBy('default'); setPage(1) }

  const openDetail = useCallback(async (topicId: number) => {
    if (!accessToken) return
    setSelectedTopic(null)
    setDetailError(null)
    setDetailLoading(true)
    try { setSelectedTopic(await getTopic(topicId, accessToken)) }
    catch (reason: unknown) { setDetailError(reason instanceof Error ? reason : new Error('Không thể tải chi tiết đề tài.')) }
    finally { setDetailLoading(false) }
  }, [accessToken])

  const selectTopic = useCallback(async (topic: Topic) => {
    if (!project || !canSelect) return
    setSelectionError(null)
    setSelecting(true)
    try {
      const updated = await services.project.selectTopic(project.id, { topicId: topic.id, concurrencyToken: project.concurrencyToken })
      setSelectionProject(updated)
      await journey.refreshAll()
    } catch (reason) {
      if (reason instanceof HttpError) {
        if (reason.status === 409) {
          await Promise.all([journey.refreshAll(), discovery.retry()])
          setSelectionError('Thông tin đã thay đổi. Đã tải lại hồ sơ và đề tài; hãy kiểm tra trước khi chọn lại.')
        } else if (reason.status === 403) setSelectionError('Bạn chưa có quyền chọn đề tài cho đồ án này.')
        else if (reason.status === 404) setSelectionError('Hồ sơ hoặc đề tài không còn khả dụng. Hãy tải lại danh sách.')
        else setSelectionError('Thông tin chưa hợp lệ hoặc chưa thể chọn đề tài. Kiểm tra hồ sơ rồi thử lại.')
      } else setSelectionError('Chưa chọn được đề tài. Hãy thử lại.')
    } finally { setSelecting(false) }
  }, [canSelect, discovery, journey, project])

  const errorTitle = discovery.errorKind === 'authentication' ? 'Phiên đăng nhập cần được xác thực lại' : discovery.errorKind === 'forbidden' ? 'Bạn không có quyền xem danh mục đề tài này' : 'Không thể tải danh mục đề tài'
  const totalPages = Math.max(1, Math.ceil(discovery.totalCount / pageSize))

  return <WorkspacePage
    size="wide"
    className="space-y-5"
    title="Danh mục đề tài đã công bố"
    eyebrow="Danh mục học vụ"
    description={`Chuyên ngành của bạn: ${verifiedMajor ? `${verifiedMajor.code} · ${verifiedMajor.name}` : 'chưa có'}.`}
    action={
      <button type="button" onClick={() => navigate('/project/source')} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-card px-4 py-2.5 text-xs font-bold text-primary transition-colors hover:bg-primary-subtle">
        Đề xuất đề tài riêng
      </button>
    }
  >
    <section className="rounded-xl border border-hairline border-l-4 border-l-status-success-text bg-card p-4 text-sm text-ink shadow-xs">
      <div className="flex items-start gap-2.5">
        <span className="material-symbols-outlined mt-0.5 shrink-0 text-[18px] text-status-success-text" aria-hidden="true">menu_book</span>
        <div>
          <p className="text-xs leading-relaxed text-ink-soft">Tham khảo các đề tài đã công bố. Trưởng nhóm có thể chọn đề tài khi hồ sơ còn ở dạng bản nháp.</p>
          {project?.proposalSource === 'PUBLISHED_TOPIC' && project.selectedTopic ? (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-status-success-border bg-status-success-bg px-2.5 py-0.5 text-xs font-semibold text-status-success-text">
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">check_circle</span>
              Đề tài đã chọn: {project.selectedTopic.code} · {project.selectedTopic.title}
            </p>
          ) : null}
        </div>
      </div>
    </section>
    <FilterToolbar
      tabs={[
        { value: '', label: 'Mọi chế độ' },
        { value: 'SINGLE_MAJOR', label: 'Đơn ngành' },
        { value: 'INTERDISCIPLINARY', label: 'Liên ngành' },
      ]}
      activeTab={projectMode ?? ''}
      onTabChange={(val) => { setProjectMode(val ? val as ProjectMode : undefined); setPage(1) }}
      search={search}
      onSearchChange={(val) => { setSearch(val); setPage(1) }}
      searchLabel="Tìm kiếm đề tài"
      searchPlaceholder="Tìm theo mã hoặc tên đề tài…"
      controls={
        <>
          {departmentOptions.length > 1 && (
            <select aria-label="Bộ môn chủ trì" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
              <option value="">Tất cả bộ môn</option>
              {departmentOptions.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
            </select>
          )}
          <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-line-strong bg-card px-3 text-xs font-semibold text-ink-soft">
            <input type="checkbox" checked={compatibleOnly} onChange={(event) => { setCompatibleOnly(event.target.checked); setPage(1) }} className="accent-primary" />
            Phù hợp với ngành của tôi
          </label>
        </>
      }
      sort={{
        value: sortBy,
        onChange: (val) => setSortBy(val as TopicSort),
        options: [
          { value: 'default', label: 'Mặc định' },
          { value: 'title_asc', label: 'Tên A–Z' },
          { value: 'code_asc', label: 'Mã đề tài A–Z' },
        ],
      }}
      hasActiveFilters={hasFilters}
      onClearAll={clearAll}
      resultSummary={`${visibleTopics.length} / ${discovery.totalCount} đề tài`}
    />
    {discovery.isLoading ? <TopicLoading /> : null}
    {discovery.error ? <TopicError title={errorTitle} error={discovery.error} onRetry={discovery.retry} /> : null}
    {selectionError ? <section role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">{selectionError}</section> : null}
    {!discovery.isLoading && !discovery.error && visibleTopics.length === 0 ? <TopicEmpty /> : null}
    {!discovery.isLoading && !discovery.error && visibleTopics.length > 0 ? (
      <>
        <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleTopics.map((topic) => <TopicCard key={topic.id} topic={topic} onDetail={openDetail} />)}
        </div>
        {discovery.totalCount > pageSize ? (
          <Pagination
            page={page}
            pages={totalPages}
            total={discovery.totalCount}
            pageSize={pageSize}
            onPage={setPage}
          />
        ) : null}
      </>
    ) : null}
    <TopicDetailDrawer topic={selectedTopic} isLoading={detailLoading} error={detailError} onClose={() => { setSelectedTopic(null); setDetailError(null) }} canSelect={canSelect} selecting={selecting} onSelectTopic={(topic) => void selectTopic(topic)} />
  </WorkspacePage>
}

function TopicCard({ topic, onDetail }: { topic: Topic; onDetail: (id: number) => Promise<void> }) {
  const isInterdisciplinary = topic.projectMode === 'INTERDISCIPLINARY'
  return (
    <article className="flex h-full flex-col justify-between gap-4 rounded-xl border border-hairline bg-card p-5 shadow-xs transition-all hover:border-primary/40 hover:shadow-md">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-md border border-primary/20 bg-primary-subtle px-2 py-0.5 font-mono text-xs font-bold text-primary">{topic.code}</span>
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${isInterdisciplinary ? 'border-tag-ai/20 bg-tag-ai-bg text-tag-ai' : 'border-hairline bg-canvas text-ink-soft'}`}>
            {isInterdisciplinary ? 'LIÊN NGÀNH' : 'ĐƠN NGÀNH'}
          </span>
        </div>
        <h3 className="mt-3 text-base font-bold leading-snug text-ink">{topic.title}</h3>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
          <span className="material-symbols-outlined text-[15px] text-ink-muted" aria-hidden="true">apartment</span>
          Bộ môn chủ trì: <span className="font-medium text-ink-soft">{topic.leadDepartmentName}</span>
        </p>
        <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-ink-soft">{topic.description ?? 'Chưa có mô tả.'}</p>
        {topic.matchesMyMajor === false ? (
          <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-status-warning-border bg-status-warning-bg p-2 text-xs font-medium text-status-warning-text">
            <span className="material-symbols-outlined text-sm" aria-hidden="true">warning</span>
            Đề tài này chưa phù hợp với chuyên ngành hoặc điều kiện đăng ký của bạn.
          </div>
        ) : null}
      </div>
      <div className="flex items-center justify-end border-t border-hairline pt-3">
        <button
          type="button"
          onClick={() => void onDetail(topic.id)}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white shadow-primary transition-colors hover:bg-primary-hover"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[16px]">visibility</span>
          Xem chi tiết
        </button>
      </div>
    </article>
  )
}
function TopicLoading() { return <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Đang tải đề tài"><div className="h-52 rounded-xl border border-hairline bg-canvas motion-safe:animate-pulse"/><div className="h-52 rounded-xl border border-hairline bg-canvas motion-safe:animate-pulse"/><div className="h-52 rounded-xl border border-hairline bg-canvas motion-safe:animate-pulse"/></div> }
function TopicEmpty() { return <section className="rounded-xl border border-dashed border-hairline bg-card p-12 text-center"><h3 className="font-bold text-ink">Không có đề tài phù hợp</h3><p className="mt-1 text-xs text-ink-muted">Thay đổi bộ lọc hoặc kiểm tra lại bối cảnh học vụ.</p></section> }
function TopicError({ title, error, onRetry }: { title: string; error: Error; onRetry: () => void }) { const isNotFound = error instanceof HttpError && error.status === 404; return <section role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-8 text-center"><h3 className="font-bold text-status-error-text">{isNotFound ? 'Không tìm thấy đề tài hoặc phạm vi học vụ' : title}</h3><p className="mt-1 text-xs text-status-error-text">{error.message}</p><button type="button" onClick={onRetry} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-primary-hover">Thử lại</button></section> }
