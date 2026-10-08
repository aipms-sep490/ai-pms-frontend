import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudentJourney } from '../../../app/context'
import { isActionAllowed } from '../../../types/backend'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { Button } from '../../../components/ui/Button'
import type { RegistrationSourceKind } from '../types/registration-source.types'

/** Renders only the provenance returned by the current Backend Project Draft. */
export function RegistrationSourcePage() {
  const navigate = useNavigate()
  const journey = useStudentJourney()
  const [sourceKind, setSourceKind] = useState<RegistrationSourceKind>('PUBLISHED_TOPIC')
  const project = journey.project
  const status = project?.status.replaceAll('_', '').toUpperCase()
  const isLeader = Boolean(journey.team?.members.some((member) => member.userId === journey.profile?.id && member.isLeader))
  const editableDraft = Boolean(project && isLeader && (status === 'DRAFT' || status === 'REVISIONREQUIRED') && isActionAllowed(journey.projectActions?.actions ?? [], 'edit_project_draft'))

  return <WorkspacePage title="Đăng ký đồ án" eyebrow="Đề tài và đăng ký" description="Chọn đề tài có sẵn hoặc đề xuất đề tài riêng cho nhóm." backTo="/topics" className="space-y-6">
    {journey.isLoading ? <section role="status" className="workspace-surface p-6 text-sm">Đang tải thông tin đăng ký…</section> : journey.error ? <section role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800"><p>{journey.error}</p><Button variant="outline" className="mt-4" onClick={() => void journey.refreshAll()}>Tải lại</Button></section> : <>
    {project ? <Provenance project={project} /> : <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">Nhóm chưa có bản nháp đồ án.</section>}
    <section aria-label="Cách đăng ký đề tài" className="grid gap-4 md:grid-cols-2"><SourceCard active={sourceKind === 'PUBLISHED_TOPIC'} title="Đề tài đã công bố" detail="Chọn đề tài phù hợp từ danh mục của bộ môn." onSelect={() => setSourceKind('PUBLISHED_TOPIC')} /><SourceCard active={sourceKind === 'STUDENT_PROPOSAL'} title="Đề xuất đề tài riêng" detail="Nhóm tự xây dựng đề cương và gửi bộ môn thẩm định." onSelect={() => setSourceKind('STUDENT_PROPOSAL')} /></section>
    {sourceKind === 'PUBLISHED_TOPIC' ? <TopicPath hasDraft={Boolean(project)} editableDraft={editableDraft} onCreateDraft={() => navigate('/project/register')} onOpenCatalogue={() => navigate('/topics')} /> : <ProposalPath hasDraft={Boolean(project)} onOpenDraft={() => navigate('/project/register')} />}
    </>}
  </WorkspacePage>
}

function SourceCard({ active, title, detail, onSelect }: { active: boolean; title: string; detail: string; onSelect: () => void }) { return <button type="button" aria-pressed={active} onClick={onSelect} className={`rounded-xl border p-6 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary ${active ? 'border-primary/40 bg-primary-subtle' : 'border-slate-200 bg-white hover:border-primary/40'}`}><span className="flex items-center justify-between gap-4"><strong className="text-base text-slate-900">{title}</strong><span className="material-symbols-outlined text-primary" aria-hidden="true">{active ? 'radio_button_checked' : 'radio_button_unchecked'}</span></span><span className="mt-2 block text-sm leading-relaxed text-slate-600">{detail}</span></button> }

function Provenance({ project }: { project: NonNullable<ReturnType<typeof useStudentJourney>['project']> }) {
  const source = project.proposalSource ?? 'STUDENT_PROPOSAL'
  return <section className="border-l-2 border-primary/40 pl-5 text-sm"><h2 className="font-semibold text-slate-900">Cách đăng ký hiện tại</h2>{source === 'PUBLISHED_TOPIC' ? <p className="mt-2 leading-relaxed text-slate-600">Đề tài từ danh mục · {project.selectedTopic ? `${project.selectedTopic.code} · ${project.selectedTopic.title}` : 'Chưa có thông tin chi tiết về đề tài đã chọn.'}</p> : <p className="mt-2 text-slate-600">Nhóm đang sử dụng đề tài tự đề xuất.</p>}</section>
}

function TopicPath({ hasDraft, editableDraft, onCreateDraft, onOpenCatalogue }: { hasDraft: boolean; editableDraft: boolean; onCreateDraft: () => void; onOpenCatalogue: () => void }) {
  if (!hasDraft) return <section className="workspace-surface p-6"><h2 className="text-base font-bold">Tạo bản nháp trước khi chọn đề tài</h2><p className="mt-2 text-sm leading-relaxed text-slate-600">Tạo bản nháp đồ án cho nhóm, sau đó chọn đề tài đã công bố trong danh mục.</p><Button onClick={onCreateDraft} className="mt-5">Tạo bản nháp đồ án</Button></section>
  if (!editableDraft) return <section role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm leading-relaxed text-amber-950">Bản nháp hiện chưa thể đổi đề tài. Hãy kiểm tra trạng thái đăng ký của nhóm.</section>
  return <section className="workspace-surface p-6"><h2 className="text-base font-bold">Chọn đề tài đã công bố</h2><p className="mt-2 text-sm leading-relaxed text-slate-600">Chọn đề tài phù hợp với ngành tham gia của nhóm. Điều kiện đăng ký sẽ được kiểm tra khi lưu.</p><Button onClick={onOpenCatalogue} className="mt-5">Xem danh mục đề tài</Button></section>
}

function ProposalPath({ hasDraft, onOpenDraft }: { hasDraft: boolean; onOpenDraft: () => void }) { return <section className="workspace-surface p-6"><h2 className="text-base font-bold">Đề tài tự đề xuất</h2><p className="mt-2 text-sm leading-relaxed text-slate-600">{hasDraft ? 'Tiếp tục soạn đề cương từ bản nháp hiện tại của nhóm.' : 'Tạo bản nháp để bắt đầu soạn đề cương cho đề tài của nhóm.'}</p><Button onClick={onOpenDraft} className="mt-5">{hasDraft ? 'Mở bản nháp đồ án' : 'Tạo bản nháp đồ án'}</Button></section> }
