import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudentJourney } from '../../../app/context'
import { isActionAllowed } from '../../../types/backend'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { Button } from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/ui'
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

  return (
    <WorkspacePage title="Đăng ký đồ án" eyebrow="Đề tài và đăng ký" description="Chọn đề tài có sẵn hoặc đề xuất đề tài riêng cho nhóm." backTo="/topics" className="space-y-5">
      {journey.isLoading ? (
        <section role="status" className="rounded-xl border border-hairline bg-card p-6 text-sm text-ink-muted shadow-xs">
          Đang tải thông tin đăng ký…
        </section>
      ) : journey.error ? (
        <section role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-6 text-sm text-status-error-text">
          <p>{journey.error}</p>
          <Button variant="outline" className="mt-4 min-h-11" onClick={() => void journey.refreshAll()}>Tải lại</Button>
        </section>
      ) : (
        <div className="flex flex-col gap-5">
          {project ? (
            <Provenance project={project} />
          ) : (
            <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hairline bg-card px-5 py-4 text-sm text-ink-soft shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-primary" aria-hidden="true">info</span>
                <span>Nhóm chưa có bản nháp đồ án.</span>
              </div>
              <StatusBadge tone="neutral" label="Chưa khởi tạo" />
            </section>
          )}

          <section aria-label="Cách đăng ký đề tài" className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <SourceCard
              active={sourceKind === 'PUBLISHED_TOPIC'}
              icon="menu_book"
              badge="Khuyến nghị cho nhóm chưa có ý tưởng"
              title="Đề tài đã công bố"
              detail="Chọn đề tài phù hợp từ danh mục của bộ môn."
              highlights={[
                'Đã được bộ môn rà soát phạm vi ngành và quy mô thành viên',
                'Dễ đối chiếu với mục tiêu học kỳ và chuyên ngành của nhóm',
              ]}
              onSelect={() => setSourceKind('PUBLISHED_TOPIC')}
            />
            <SourceCard
              active={sourceKind === 'STUDENT_PROPOSAL'}
              icon="edit_document"
              badge="Linh hoạt theo ý tưởng nhóm"
              title="Đề xuất đề tài riêng"
              detail="Nhóm tự xây dựng đề cương và gửi bộ môn thẩm định."
              highlights={[
                'Chủ động đề xuất bài toán thực tế, công nghệ và sản phẩm mục tiêu',
                'Hỗ trợ kiểm tra trùng lặp ý tưởng bằng AI trước khi nộp',
              ]}
              onSelect={() => setSourceKind('STUDENT_PROPOSAL')}
            />
          </section>

          {sourceKind === 'PUBLISHED_TOPIC' ? (
            <TopicPath
              hasDraft={Boolean(project)}
              editableDraft={editableDraft}
              onCreateDraft={() => navigate('/project/register')}
              onOpenCatalogue={() => navigate('/topics')}
            />
          ) : (
            <ProposalPath hasDraft={Boolean(project)} onOpenDraft={() => navigate('/project/register')} />
          )}
        </div>
      )}
    </WorkspacePage>
  )
}

function SourceCard({
  active,
  icon,
  badge,
  title,
  detail,
  highlights,
  onSelect,
}: {
  active: boolean
  icon: string
  badge: string
  title: string
  detail: string
  highlights: readonly string[]
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className={`flex flex-col overflow-hidden rounded-xl border text-left shadow-xs transition-all focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary ${
        active
          ? 'border-primary bg-card ring-2 ring-primary/15'
          : 'border-hairline bg-card hover:border-primary/40 hover:shadow-sm'
      }`}
    >
      <span className={`flex w-full items-center justify-between gap-3 border-b border-hairline px-5 py-3.5 ${active ? 'bg-primary-subtle' : 'bg-canvas/70'}`}>
        <span className="flex items-center gap-2.5">
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border ${active ? 'border-primary/25 bg-card text-primary' : 'border-hairline bg-card text-ink-soft'}`}>
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{icon}</span>
          </span>
          <strong className="text-base font-bold text-ink">{title}</strong>
        </span>
        <span className="material-symbols-outlined text-primary" aria-hidden="true">
          {active ? 'radio_button_checked' : 'radio_button_unchecked'}
        </span>
      </span>
      <span className="flex flex-1 flex-col justify-between gap-4 p-5">
        <span>
          <span className="inline-block rounded-full border border-hairline bg-canvas px-2.5 py-0.5 text-xs font-semibold text-ink-soft">
            {badge}
          </span>
          <span className="mt-3 block text-sm leading-relaxed text-ink-soft">{detail}</span>
        </span>
        <ul className="space-y-1.5 border-t border-hairline pt-3 text-xs text-ink-muted">
          {highlights.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="material-symbols-outlined mt-0.5 text-[15px] text-primary" aria-hidden="true">check_circle</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </span>
    </button>
  )
}

function Provenance({ project }: { project: NonNullable<ReturnType<typeof useStudentJourney>['project']> }) {
  const source = project.proposalSource ?? 'STUDENT_PROPOSAL'
  return (
    <section className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
        <h2 className="text-sm font-bold text-ink">Cách đăng ký hiện tại</h2>
        <StatusBadge
          tone={source === 'PUBLISHED_TOPIC' ? 'success' : 'info'}
          label={source === 'PUBLISHED_TOPIC' ? 'Từ danh mục bộ môn' : 'Tự đề xuất'}
        />
      </div>
      <div className="px-5 py-4 text-sm">
        {source === 'PUBLISHED_TOPIC' ? (
          <p className="leading-relaxed text-ink-soft">
            Đề tài từ danh mục · {project.selectedTopic ? `${project.selectedTopic.code} · ${project.selectedTopic.title}` : 'Chưa có thông tin chi tiết về đề tài đã chọn.'}
          </p>
        ) : (
          <p className="text-ink-soft">Nhóm đang sử dụng đề tài tự đề xuất.</p>
        )}
      </div>
    </section>
  )
}

function TopicPath({ hasDraft, editableDraft, onCreateDraft, onOpenCatalogue }: { hasDraft: boolean; editableDraft: boolean; onCreateDraft: () => void; onOpenCatalogue: () => void }) {
  if (!hasDraft) {
    return (
      <section className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs">
        <div className="border-b border-hairline bg-canvas/70 px-5 py-3.5">
          <h2 className="text-base font-bold text-ink">Tạo bản nháp trước khi chọn đề tài</h2>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          <p className="max-w-3xl text-sm leading-relaxed text-ink-muted">
            Tạo bản nháp đồ án cho nhóm, sau đó chọn đề tài đã công bố trong danh mục.
          </p>
          <Button onClick={onCreateDraft} icon="add" className="min-h-11 shrink-0">Tạo bản nháp đồ án</Button>
        </div>
      </section>
    )
  }
  if (!editableDraft) {
    return (
      <section role="status" className="rounded-xl border border-status-warning-border bg-status-warning-bg p-5 text-sm leading-relaxed text-status-warning-text">
        Bản nháp hiện chưa thể đổi đề tài. Hãy kiểm tra trạng thái đăng ký của nhóm.
      </section>
    )
  }
  return (
    <section className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs">
      <div className="border-b border-hairline bg-canvas/70 px-5 py-3.5">
        <h2 className="text-base font-bold text-ink">Chọn đề tài đã công bố</h2>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 p-5">
        <p className="max-w-3xl text-sm leading-relaxed text-ink-muted">
          Chọn đề tài phù hợp với ngành tham gia của nhóm. Điều kiện đăng ký sẽ được kiểm tra khi lưu.
        </p>
        <Button onClick={onOpenCatalogue} icon="menu_book" className="min-h-11 shrink-0">Xem danh mục đề tài</Button>
      </div>
    </section>
  )
}

function ProposalPath({ hasDraft, onOpenDraft }: { hasDraft: boolean; onOpenDraft: () => void }) {
  return (
    <section className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs">
      <div className="border-b border-hairline bg-canvas/70 px-5 py-3.5">
        <h2 className="text-base font-bold text-ink">Đề tài tự đề xuất</h2>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 p-5">
        <p className="max-w-3xl text-sm leading-relaxed text-ink-muted">
          {hasDraft ? 'Tiếp tục soạn đề cương từ bản nháp hiện tại của nhóm.' : 'Tạo bản nháp để bắt đầu soạn đề cương cho đề tài của nhóm.'}
        </p>
        <Button onClick={onOpenDraft} icon="edit_note" className="min-h-11 shrink-0">
          {hasDraft ? 'Mở bản nháp đồ án' : 'Tạo bản nháp đồ án'}
        </Button>
      </div>
    </section>
  )
}
