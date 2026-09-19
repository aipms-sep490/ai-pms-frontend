import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAcademicWorkflow } from '../../../app/context/useAcademicWorkflow'
import { registrationSourceBoundary } from '../services/registration-source-boundary'
import type { RegistrationSourceKind } from '../types/registration-source.types'

/**
 * This page is a navigation boundary, not a registration-source state store.
 * Its selected card changes only the explanation shown on this page; no choice
 * is passed to another route or persisted until Backend publishes the contract.
 */
export function RegistrationSourcePage() {
  const navigate = useNavigate()
  const { academic } = useAcademicWorkflow()
  const [sourceKind, setSourceKind] = useState<RegistrationSourceKind>('PROJECT_TOPIC')
  const capability = registrationSourceBoundary.capability()
  const verifiedMajor = academic?.majors[0] ?? null
  const department = academic?.departments[0] ?? null

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 pb-12">
      <header>
        <button type="button" onClick={() => navigate('/topics')} className="text-xs font-semibold text-blue-700 hover:underline">
          ← Danh mục đề tài
        </button>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">Registration Source & phạm vi học thuật</h1>
        <p className="mt-1 text-sm text-slate-600">Chọn một hướng để xem bước kế tiếp. Mọi Registration Source, ProjectMode và Academic Scope vẫn phải được Backend xác nhận.</p>
      </header>

      <section
        role="status"
        className={`rounded-xl border p-4 text-sm ${capability.status === 'BE_NEW_CONTRACT_REQUIRED' ? 'border-amber-200 bg-amber-50 text-amber-950' : 'border-blue-200 bg-blue-50 text-blue-950'}`}
      >
        <strong>{capability.status === 'BE_NEW_CONTRACT_REQUIRED' ? 'BE_NEW_CONTRACT_REQUIRED' : 'MOCK PREVIEW'}</strong>
        <p className="mt-1 text-xs">{capability.message}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <SourceCard
          active={sourceKind === 'PROJECT_TOPIC'}
          title="Đề tài đã công bố"
          detail="Mở danh mục đề tài đã được Backend công bố; việc chọn đề tài chưa tạo hay lưu Project."
          onSelect={() => setSourceKind('PROJECT_TOPIC')}
        />
        <SourceCard
          active={sourceKind === 'STUDENT_PROPOSAL'}
          title="Đề xuất dự án mới"
          detail="Mở biểu mẫu Project Draft hiện có; đây không tạo một Student Proposal source riêng."
          onSelect={() => setSourceKind('STUDENT_PROPOSAL')}
        />
      </section>

      {sourceKind === 'PROJECT_TOPIC'
        ? <TopicSource verifiedMajor={verifiedMajor?.name ?? null} department={department?.name ?? null} onOpenCatalogue={() => navigate('/topics')} />
        : <ProposalBoundary verifiedMajor={verifiedMajor?.name ?? null} department={department?.name ?? null} onOpenDraft={() => navigate('/project/register')} />}
    </div>
  )
}

function SourceCard({ active, title, detail, onSelect }: { active: boolean; title: string; detail: string; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} className={`rounded-2xl border p-5 text-left ${active ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white'}`}>
      <strong className="text-sm text-slate-900">{title}</strong>
      <span className="mt-2 block text-xs leading-relaxed text-slate-600">{detail}</span>
    </button>
  )
}

function TopicSource({ verifiedMajor, department, onOpenCatalogue }: { verifiedMajor: string | null; department: string | null; onOpenCatalogue: () => void }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-base font-bold">Published Topic chỉ có thể được đọc từ Topic Catalogue</h2>
      <p className="mt-1 text-xs leading-relaxed text-slate-600">Backend chưa có Registration Source để lưu Topic, thời điểm chọn, khóa, trạng thái hoặc governed scope trên Team/Project. Topic choice vẫn bị chặn khỏi canonical Project creation cho đến khi source/provenance contract được phát hành. URL, React state và localStorage không được dùng thay cho quan hệ này.</p>
      <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
        <Row label="Verified major" value={verifiedMajor ?? 'Backend chưa cung cấp'} />
        <Row label="Department scope" value={department ?? 'Backend chưa cung cấp'} />
      </dl>
      <button type="button" onClick={onOpenCatalogue} className="mt-5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-700">Mở Topic Catalogue</button>
    </section>
  )
}

function ProposalBoundary({ verifiedMajor, department, onOpenDraft }: { verifiedMajor: string | null; department: string | null; onOpenDraft: () => void }) {
  return (
    <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
      <h2 className="text-base font-bold text-blue-950">Student Proposal dùng Project Draft hiện có</h2>
      <p className="mt-1 text-xs leading-relaxed text-blue-900">Backend hiện đã persist Project Draft theo quyền <code>create_project_draft</code>. Biểu mẫu này là nội dung đề cương do sinh viên nhập, không phải một Proposal aggregate hoặc Registration Source được persist. Project Draft vẫn không thể chứng minh provenance từ Published Topic hay Student Proposal.</p>
      <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
        <Row label="Verified major (read-only)" value={verifiedMajor ?? 'Backend chưa cung cấp'} />
        <Row label="LeadDepartment scope (read-only)" value={department ?? 'Backend chưa cung cấp'} />
      </dl>
      <button type="button" onClick={onOpenDraft} className="mt-5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-800">Mở Project Draft</button>
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return <div><dt className="font-semibold text-slate-600">{label}</dt><dd className="mt-1 text-slate-900">{value}</dd></div>
}
