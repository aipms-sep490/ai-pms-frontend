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

  if (journey.isLoading) return <section role="status" className="mx-auto max-w-3xl p-5 text-sm">Đang tải Project và Registration Source từ Backend…</section>
  if (journey.error) return <section role="alert" className="mx-auto max-w-3xl rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">{journey.error}<button type="button" onClick={() => void journey.refreshAll()} className="ml-3 font-bold underline">Tải lại</button></section>

  return <div className="mx-auto flex max-w-4xl flex-col gap-6 pb-12">
    <header><button type="button" onClick={() => navigate('/topics')} className="text-xs font-semibold text-blue-700 hover:underline">← Danh mục đề tài</button><h1 className="mt-3 text-2xl font-bold text-slate-900">Registration Source</h1><p className="mt-1 text-sm text-slate-600">Nguồn đăng ký được Backend lưu trên Project Draft; lựa chọn trên trang này không được persist ở trình duyệt.</p></header>
    {project ? <Provenance project={project} /> : <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">Backend chưa trả Project Draft cho nhóm hiện tại.</section>}
    <section className="grid gap-4 md:grid-cols-2"><SourceCard active={sourceKind === 'PUBLISHED_TOPIC'} title="Đề tài đã công bố" detail="Chọn từ danh mục bằng Project Draft hiện có; Backend xác minh toàn bộ điều kiện." onSelect={() => setSourceKind('PUBLISHED_TOPIC')} /><SourceCard active={sourceKind === 'STUDENT_PROPOSAL'} title="Đề xuất dự án mới" detail="Project Draft do sinh viên đề xuất giữ nguồn STUDENT_PROPOSAL do Backend trả về." onSelect={() => setSourceKind('STUDENT_PROPOSAL')} /></section>
    {sourceKind === 'PUBLISHED_TOPIC' ? <TopicPath hasDraft={Boolean(project)} editableDraft={editableDraft} onCreateDraft={() => navigate('/project/register')} onOpenCatalogue={() => navigate('/topics')} /> : <ProposalPath hasDraft={Boolean(project)} onOpenDraft={() => navigate('/project/register')} />}
  </div>
}

function SourceCard({ active, title, detail, onSelect }: { active: boolean; title: string; detail: string; onSelect: () => void }) { return <button type="button" onClick={onSelect} className={`rounded-2xl border p-5 text-left ${active ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white'}`}><strong className="text-sm text-slate-900">{title}</strong><span className="mt-2 block text-xs leading-relaxed text-slate-600">{detail}</span></button> }

function Provenance({ project }: { project: NonNullable<ReturnType<typeof useStudentJourney>['project']> }) {
  const source = project.proposalSource ?? 'STUDENT_PROPOSAL'
  return <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-950"><h2 className="font-bold">Nguồn đã được Backend xác nhận</h2>{source === 'PUBLISHED_TOPIC' ? <p className="mt-2 text-xs">PUBLISHED_TOPIC · {project.selectedTopic ? `${project.selectedTopic.code} · ${project.selectedTopic.title}` : 'Backend chưa trả chi tiết đề tài đã chọn.'}</p> : <p className="mt-2 text-xs">STUDENT_PROPOSAL · Đề tài do sinh viên đề xuất.</p>}</section>
}

function TopicPath({ hasDraft, editableDraft, onCreateDraft, onOpenCatalogue }: { hasDraft: boolean; editableDraft: boolean; onCreateDraft: () => void; onOpenCatalogue: () => void }) {
  if (!hasDraft) return <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><h2 className="text-base font-bold">Cần Project Draft trước khi chọn đề tài</h2><p className="mt-1 text-xs text-amber-950">Backend chưa có endpoint tạo Project trực tiếp từ Topic. Hãy tạo Project Draft trước, sau đó chọn đề tài đã công bố.</p><button type="button" onClick={onCreateDraft} className="mt-4 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-bold text-white">Tạo Project Draft trước</button></section>
  if (!editableDraft) return <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-xs text-amber-950">Project Draft hiện không thể chọn đề tài theo quyền hoặc trạng thái Backend hiện tại.</section>
  return <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-base font-bold">Chọn Published Topic</h2><p className="mt-1 text-xs text-slate-600">Mỗi lựa chọn gửi concurrency token hiện tại đến Backend; Frontend không suy diễn tương thích hoặc giữ chỗ.</p><button type="button" onClick={onOpenCatalogue} className="mt-4 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-bold text-white">Mở Topic Catalogue</button></section>
}

function ProposalPath({ hasDraft, onOpenDraft }: { hasDraft: boolean; onOpenDraft: () => void }) { return <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5"><h2 className="text-base font-bold text-blue-950">Student Proposal</h2><p className="mt-1 text-xs text-blue-900">{hasDraft ? 'Project Draft hiện tại vẫn giữ provenance do Backend trả về. Frontend không có thao tác xóa hoặc đổi ngược Topic.' : 'Hãy mở Project Draft để Backend tạo và trả về provenance STUDENT_PROPOSAL.'}</p><button type="button" onClick={onOpenDraft} className="mt-4 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-bold text-white">Mở Project Draft</button></section> }
