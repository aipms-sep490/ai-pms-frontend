import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAcademicWorkflow } from '../../../app/context/useAcademicWorkflow'
import { useStudentJourney } from '../../../app/context/useStudentJourney'
import { useAuthSession } from '../../../features/auth/context/useAuthSession'
import { services } from '../../../services/service-gateway'
import { HttpError } from '../../../services/http/http-client'
import { isActionAllowed, type ProjectDto } from '../../../types/backend'
import { TopicDetailDrawer } from '../../registration/components/TopicDetailDrawer'
import { useTopicDiscovery } from '../../registration/hooks/useTopicDiscovery'
import { getTopic, type ProjectMode, type Topic } from '../../topics/api/topic-api'

const pageSize = 12

export function TopicCataloguePage() {
  const navigate = useNavigate()
  const { session } = useAuthSession()
  const { academic } = useAcademicWorkflow()
  const journey = useStudentJourney()
  const [search, setSearch] = useState('')
  const [projectMode, setProjectMode] = useState<ProjectMode | undefined>()
  const [compatibleOnly, setCompatibleOnly] = useState(false)
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
  const verifiedMajor = academic?.majors[0] ?? null
  const project = selectionProject?.id === journey.project?.id ? selectionProject : journey.project
  const projectStatus = project?.status.replaceAll('_', '').toUpperCase()
  const isLeader = Boolean(journey.team?.members.some((member) => member.userId === journey.profile?.id && member.isLeader))
  const canSelect = Boolean(project && (projectStatus === 'DRAFT' || projectStatus === 'REVISIONREQUIRED') && isLeader && isActionAllowed(journey.projectActions?.actions ?? [], 'edit_project_draft'))

  const openDetail = useCallback(async (topicId: number) => {
    if (!session?.accessToken) return
    setSelectedTopic(null)
    setDetailError(null)
    setDetailLoading(true)
    try { setSelectedTopic(await getTopic(topicId, session.accessToken)) }
    catch (reason: unknown) { setDetailError(reason instanceof Error ? reason : new Error('Không thể tải chi tiết đề tài.')) }
    finally { setDetailLoading(false) }
  }, [session?.accessToken])

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
          setSelectionError(`Backend từ chối chọn đề tài: ${reason.message}. Dữ liệu Project và Topic đã được tải lại; không tự động thử lại.`)
        } else if (reason.status === 403) setSelectionError(`Backend từ chối quyền chọn đề tài: ${reason.message}`)
        else if (reason.status === 404) setSelectionError(`Project hoặc đề tài không còn khả dụng: ${reason.message}`)
        else setSelectionError(reason.message)
      } else setSelectionError(reason instanceof Error ? reason.message : 'Không thể chọn đề tài từ Backend.')
    } finally { setSelecting(false) }
  }, [canSelect, discovery, journey, project])

  const errorTitle = discovery.errorKind === 'authentication' ? 'Phiên đăng nhập cần được xác thực lại' : discovery.errorKind === 'forbidden' ? 'Bạn không có quyền xem danh mục đề tài này' : 'Không thể tải danh mục đề tài'
  const totalPages = Math.max(1, Math.ceil(discovery.totalCount / pageSize))

  return <div className="mx-auto flex max-w-6xl flex-col gap-6 pb-12">
    <section className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950"><h1 className="font-bold">Danh mục đề tài đã công bố</h1><p className="mt-1 text-xs leading-relaxed">Backend là nguồn quyết định: chỉ bản nháp có thể chỉnh sửa của Trưởng nhóm mới có thể chọn đề tài. Không tạo Project mới, giữ chỗ hoặc lưu nguồn trong trình duyệt.</p>{project?.proposalSource === 'PUBLISHED_TOPIC' && project.selectedTopic ? <p className="mt-2 text-xs font-semibold">Đề tài Backend đã chọn: {project.selectedTopic.code} · {project.selectedTopic.title}</p> : null}</section>
    <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><h2 className="text-2xl font-bold tracking-tight text-slate-900">Danh mục đề tài</h2><p className="mt-1 text-sm text-slate-600">Lọc do Backend thực hiện. Phạm vi học vụ xác thực: {verifiedMajor ? `${verifiedMajor.code} · ${verifiedMajor.name}` : 'chưa có'}.</p></div><button type="button" onClick={() => navigate('/project/source')} className="rounded-xl border border-blue-200 px-4 py-2.5 text-xs font-bold text-blue-700 hover:bg-blue-50">Đề xuất dự án mới</button></header>
    <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs md:grid-cols-[1fr_auto_auto]"><input aria-label="Tìm kiếm đề tài" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Tìm theo mã hoặc tên đề tài" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" /><select aria-label="Lọc chế độ đề tài" value={projectMode ?? ''} onChange={(event) => { setProjectMode(event.target.value ? event.target.value as ProjectMode : undefined); setPage(1) }} className="rounded-xl border border-slate-300 px-3 py-2 text-sm"><option value="">Mọi chế độ</option><option value="SINGLE_MAJOR">Đơn ngành</option><option value="INTERDISCIPLINARY">Liên ngành</option></select><label className="flex items-center gap-2 text-xs font-medium text-slate-700"><input type="checkbox" checked={compatibleOnly} onChange={(event) => { setCompatibleOnly(event.target.checked); setPage(1) }} />Chỉ tương thích theo Backend</label></section>
    {discovery.isLoading ? <TopicLoading /> : null}
    {discovery.error ? <TopicError title={errorTitle} error={discovery.error} onRetry={discovery.retry} /> : null}
    {selectionError ? <section role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{selectionError}</section> : null}
    {!discovery.isLoading && !discovery.error && discovery.topics.length === 0 ? <TopicEmpty /> : null}
    {!discovery.isLoading && !discovery.error && discovery.topics.length > 0 ? <><div className="grid grid-cols-1 gap-4 md:grid-cols-2">{discovery.topics.map((topic) => <TopicCard key={topic.id} topic={topic} onDetail={openDetail} />)}</div><nav className="flex items-center justify-between text-xs"><span>{discovery.totalCount} đề tài</span><div className="flex gap-2"><button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded border px-3 py-1 disabled:opacity-50">Trước</button><span className="self-center">{page}/{totalPages}</span><button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="rounded border px-3 py-1 disabled:opacity-50">Sau</button></div></nav></> : null}
    <TopicDetailDrawer topic={selectedTopic} isLoading={detailLoading} error={detailError} onClose={() => { setSelectedTopic(null); setDetailError(null) }} canSelect={canSelect} selecting={selecting} onSelectTopic={(topic) => void selectTopic(topic)} />
  </div>
}

function TopicCard({ topic, onDetail }: { topic: Topic; onDetail: (id: number) => Promise<void> }) { return <article className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"><div><div className="flex items-center justify-between gap-2"><span className="font-mono text-xs font-bold text-blue-700">{topic.code}</span><span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold">{topic.projectMode === 'INTERDISCIPLINARY' ? 'LIÊN NGÀNH' : 'ĐƠN NGÀNH'}</span></div><h3 className="mt-3 text-base font-bold text-slate-900">{topic.title}</h3><p className="mt-1 text-xs text-slate-600">Bộ môn chủ trì: {topic.leadDepartmentName}</p><p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-600">{topic.description ?? 'Backend chưa cung cấp mô tả.'}</p>{topic.matchesMyMajor === false ? <p className="mt-3 text-xs font-medium text-amber-800">This topic is not compatible with your verified major or the current project policy.</p> : null}</div><button type="button" onClick={() => void onDetail(topic.id)} className="self-end rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white">Xem chi tiết</button></article> }
function TopicLoading() { return <div className="grid grid-cols-1 gap-4 md:grid-cols-2" aria-label="Đang tải đề tài"><div className="h-52 animate-pulse rounded-2xl bg-slate-200"/><div className="h-52 animate-pulse rounded-2xl bg-slate-200"/></div> }
function TopicEmpty() { return <section className="rounded-2xl border border-slate-200 bg-white p-12 text-center"><h3 className="font-bold">Không có đề tài phù hợp</h3><p className="mt-1 text-xs text-slate-600">Thay đổi bộ lọc hoặc kiểm tra lại bối cảnh học vụ.</p></section> }
function TopicError({ title, error, onRetry }: { title: string; error: Error; onRetry: () => void }) { const isNotFound = error instanceof HttpError && error.status === 404; return <section role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center"><h3 className="font-bold text-rose-900">{isNotFound ? 'Không tìm thấy đề tài hoặc phạm vi học vụ' : title}</h3><p className="mt-1 text-xs text-rose-800">{error.message}</p><button type="button" onClick={onRetry} className="mt-4 rounded bg-rose-700 px-3 py-2 text-xs font-bold text-white">Thử lại</button></section> }
