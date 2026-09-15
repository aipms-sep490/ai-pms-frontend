import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAcademicWorkflow } from '../../../app/context/useAcademicWorkflow'
import { registrationSourceBoundary } from '../services/registration-source-boundary'
import type { RegistrationSourceKind } from '../types/registration-source.types'

export function RegistrationSourcePage() {
  const navigate = useNavigate()
  const { academic } = useAcademicWorkflow()
  const [sourceKind, setSourceKind] = useState<RegistrationSourceKind>('PROJECT_TOPIC')
  const capability = registrationSourceBoundary.capability()
  const verifiedMajor = academic?.majors[0] ?? null
  const department = academic?.departments[0] ?? null

  return <div className="mx-auto flex max-w-4xl flex-col gap-6 pb-12">
    <header><button type="button" onClick={() => navigate('/topics')} className="text-xs font-semibold text-blue-700 hover:underline">← Danh mục đề tài</button><h1 className="mt-3 text-2xl font-bold text-slate-900">Registration Source & phạm vi học thuật</h1><p className="mt-1 text-sm text-slate-600">Nguồn đăng ký, ProjectMode và Academic Scope phải được Backend xác nhận trước khi hình thành nhóm.</p></header>
    <section role="status" className={`rounded-xl border p-4 text-sm ${capability.status === 'BE_NEW_CONTRACT_REQUIRED' ? 'border-amber-200 bg-amber-50 text-amber-950' : 'border-blue-200 bg-blue-50 text-blue-950'}`}><strong>{capability.status === 'BE_NEW_CONTRACT_REQUIRED' ? 'BE_NEW_CONTRACT_REQUIRED' : 'MOCK PREVIEW'}</strong><p className="mt-1 text-xs">{capability.message}</p></section>
    <section className="grid gap-4 md:grid-cols-2"><SourceCard active={sourceKind === 'PROJECT_TOPIC'} title="Đề tài đã công bố" detail="ProjectTopic chỉ là catalogue tham khảo cho đến khi Backend cung cấp source aggregate." onSelect={() => setSourceKind('PROJECT_TOPIC')} /><SourceCard active={sourceKind === 'STUDENT_PROPOSAL'} title="Đề xuất dự án mới" detail="Proposal persistence và approval chưa có trong Backend contract." onSelect={() => setSourceKind('STUDENT_PROPOSAL')} /></section>
    {sourceKind === 'PROJECT_TOPIC' ? <TopicSource verifiedMajor={verifiedMajor?.name ?? null} department={department?.name ?? null} /> : <ProposalBoundary verifiedMajor={verifiedMajor?.name ?? null} department={department?.name ?? null} />}
    <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-sm font-bold text-slate-900">Ranh giới tiếp theo</h2><p className="mt-1 text-xs leading-relaxed text-slate-600">F3 không tạo Team, không đánh giá eligibility và không tạo Project Draft. Nút tiếp tục chỉ có thể mở khi Backend cung cấp Registration Source, khóa/trạng thái, concurrency token và authorization scope.</p></section>
  </div>
}

function SourceCard({ active, title, detail, onSelect }: { active: boolean; title: string; detail: string; onSelect: () => void }) { return <button type="button" onClick={onSelect} className={`rounded-2xl border p-5 text-left ${active ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white'}`}><strong className="text-sm text-slate-900">{title}</strong><span className="mt-2 block text-xs leading-relaxed text-slate-600">{detail}</span></button> }
function TopicSource({ verifiedMajor, department }: { verifiedMajor: string | null; department: string | null }) { return <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-base font-bold">ProjectTopic chưa thể trở thành Registration Source</h2><p className="mt-1 text-xs leading-relaxed text-slate-600">Không có Backend contract để lưu Topic, thời điểm chọn, khóa, trạng thái hoặc governed scope trên Team/Project. URL, React state và localStorage không được dùng thay cho quan hệ này.</p><dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2"><Row label="Verified major" value={verifiedMajor ?? 'Backend chưa cung cấp'} /><Row label="Department scope" value={department ?? 'Backend chưa cung cấp'} /></dl></section> }
function ProposalBoundary({ verifiedMajor, department }: { verifiedMajor: string | null; department: string | null }) { return <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><h2 className="text-base font-bold text-amber-950">Student Proposal chưa thể được persist</h2><p className="mt-1 text-xs leading-relaxed text-amber-900">Không có Proposal aggregate, approval workflow hoặc source API hiện hữu. F6 vẫn sở hữu Project Draft; F3 không tạo bản nháp để thay thế source.</p><dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2"><Row label="Verified major (read-only)" value={verifiedMajor ?? 'Backend chưa cung cấp'} /><Row label="LeadDepartment scope (read-only)" value={department ?? 'Backend chưa cung cấp'} /></dl></section> }
function Row({ label, value }: { label: string; value: string }) { return <div><dt className="font-semibold text-slate-600">{label}</dt><dd className="mt-1 text-slate-900">{value}</dd></div> }
