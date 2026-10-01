import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudentJourney } from '../../../app/context'
import { isActionAllowed } from '../../../types/backend'
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

  if (journey.isLoading) return <section role="status" className="mx-auto max-w-3xl p-5 text-sm">Đang tải thông tin đăng ký…</section>
  if (journey.error) return <section role="alert" className="mx-auto max-w-3xl rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">{journey.error}<button type="button" onClick={() => void journey.refreshAll()} className="ml-3 font-bold underline">Tải lại</button></section>

  return <div className="mx-auto flex max-w-4xl flex-col gap-6 pb-12">
    <header><button type="button" onClick={() => navigate('/topics')} className="text-xs font-semibold text-primary hover:underline">← Danh mục đề tài</button><h1 className="mt-3 text-2xl font-bold text-slate-900">Đăng ký đồ án</h1><p className="mt-1 text-sm text-slate-600">Chọn đề tài có sẵn hoặc đề xuất đề tài riêng cho nhóm.</p></header>
    {project ? <Provenance project={project} /> : <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">Nhóm chưa có bản nháp đồ án.</section>}
    <section className="grid gap-4 md:grid-cols-2"><SourceCard active={sourceKind === 'PUBLISHED_TOPIC'} title="Đề tài đã công bố" detail="Chọn đề tài phù hợp từ danh mục của bộ môn." onSelect={() => setSourceKind('PUBLISHED_TOPIC')} /><SourceCard active={sourceKind === 'STUDENT_PROPOSAL'} title="Đề xuất đề tài riêng" detail="Nhóm tự xây dựng đề cương và gửi bộ môn thẩm định." onSelect={() => setSourceKind('STUDENT_PROPOSAL')} /></section>
    {sourceKind === 'PUBLISHED_TOPIC' ? <TopicPath hasDraft={Boolean(project)} editableDraft={editableDraft} onCreateDraft={() => navigate('/project/register')} onOpenCatalogue={() => navigate('/topics')} /> : <ProposalPath hasDraft={Boolean(project)} onOpenDraft={() => navigate('/project/register')} />}
  </div>
}

function SourceCard({ active, title, detail, onSelect }: { active: boolean; title: string; detail: string; onSelect: () => void }) { return <button type="button" onClick={onSelect} className={`rounded-2xl border p-5 text-left ${active ? 'border-primary/25 bg-primary-subtle' : 'border-slate-200 bg-white'}`}><strong className="text-sm text-slate-900">{title}</strong><span className="mt-2 block text-xs leading-relaxed text-slate-600">{detail}</span></button> }

function Provenance({ project }: { project: NonNullable<ReturnType<typeof useStudentJourney>['project']> }) {
  const source = project.proposalSource ?? 'STUDENT_PROPOSAL'
  return <section className="rounded-2xl border border-primary/25 bg-primary-subtle p-5 text-sm text-primary"><h2 className="font-bold">Cách đăng ký hiện tại</h2>{source === 'PUBLISHED_TOPIC' ? <p className="mt-2 text-xs">Đề tài từ danh mục · {project.selectedTopic ? `${project.selectedTopic.code} · ${project.selectedTopic.title}` : 'Hệ thống chưa trả chi tiết đề tài đã chọn.'}</p> : <p className="mt-2 text-xs">Nhóm đang sử dụng đề tài tự đề xuất.</p>}</section>
}

function TopicPath({ hasDraft, editableDraft, onCreateDraft, onOpenCatalogue }: { hasDraft: boolean; editableDraft: boolean; onCreateDraft: () => void; onOpenCatalogue: () => void }) {
  if (!hasDraft) return <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><h2 className="text-base font-bold">Tạo bản nháp trước khi chọn đề tài</h2><p className="mt-1 text-xs text-amber-950">Tạo bản nháp đồ án cho nhóm, sau đó chọn đề tài đã công bố trong danh mục.</p><button type="button" onClick={onCreateDraft} className="mt-4 rounded-lg bg-primary hover:bg-primary-hover px-3.5 py-2 text-xs font-bold text-white">Tạo bản nháp đồ án</button></section>
  if (!editableDraft) return <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-xs text-amber-950">Bản nháp hiện chưa thể đổi đề tài. Hãy kiểm tra trạng thái đăng ký của nhóm.</section>
  return <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-base font-bold">Chọn đề tài đã công bố</h2><p className="mt-1 text-xs text-slate-600">Chọn đề tài phù hợp với ngành tham gia của nhóm. Hệ thống kiểm tra điều kiện khi lưu.</p><button type="button" onClick={onOpenCatalogue} className="mt-4 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-bold text-white">Xem danh mục đề tài</button></section>
}

function ProposalPath({ hasDraft, onOpenDraft }: { hasDraft: boolean; onOpenDraft: () => void }) { return <section className="rounded-2xl border border-primary/25 bg-primary-subtle p-5"><h2 className="text-base font-bold text-primary">Đề tài tự đề xuất</h2><p className="mt-1 text-xs text-primary">{hasDraft ? 'Tiếp tục soạn đề cương từ bản nháp hiện tại của nhóm.' : 'Tạo bản nháp để bắt đầu soạn đề cương cho đề tài của nhóm.'}</p><button type="button" onClick={onOpenDraft} className="mt-4 rounded-lg bg-primary hover:bg-primary-hover px-3.5 py-2 text-xs font-bold text-white">Mở bản nháp đồ án</button></section> }
