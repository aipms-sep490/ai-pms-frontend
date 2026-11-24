import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { Pagination, StatTileRow, StatusBadge } from '../../../components/ui'
import { useTopics } from '../hooks/useTopics'
import { TopicContentForm } from '../components/TopicContentForm'
import { useTopicCatalog } from '../hooks/useTopicCatalog'
import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'
import { topicErrorMessage } from '../api/topic-api'
import './topic-management.css'

const statusLabels = { DRAFT: 'Bản nháp', PUBLISHED: 'Đã công bố', CLOSED: 'Đã đóng' } as const
const statusTones = { DRAFT: 'warning', PUBLISHED: 'success', CLOSED: 'neutral' } as const
const modeLabels: Record<'SINGLE_MAJOR' | 'INTERDISCIPLINARY', string> = { SINGLE_MAJOR: 'Một ngành', INTERDISCIPLINARY: 'Liên ngành' }

export function TopicManagementPage() {
  const { id } = useParams()
  const topics = useTopics(id ? Number(id) : undefined)
  const catalog = useTopicCatalog()
  const [draftDirty, setDraftDirty] = useState(false)
  const decisionVersion = useRef(0)
  useEffect(() => { decisionVersion.current++; setDraftDirty(false) }, [id, topics.current?.concurrencyToken])
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()
  const [message, setMessage] = useState<string | null>(null)

  if (topics.isUnauthorized) return <div className="workspace-page topic mk-page-enter"><div className="rounded-xl border border-hairline bg-card p-5 text-sm text-ink-soft"><Link className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4" to="/login">Đăng nhập</Link></div></div>
  if (topics.loading) return <div className="workspace-page topic mk-page-enter"><p role="status" className="rounded-xl border border-hairline bg-card p-5 text-sm text-ink-muted">Đang tải danh mục đề tài…</p></div>
  if (topics.isForbidden) return <div className="workspace-page topic mk-page-enter"><p role="alert" className="rounded-xl border border-status-warning-border bg-status-warning-bg p-5 text-sm text-status-warning-text">Bạn không có quyền quản lý đề tài trong bộ môn này.</p></div>
  if (topics.error) return <div className="workspace-page topic mk-page-enter"><div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-status-error-border bg-status-error-bg p-5 text-sm text-status-error-text"><p>Không thể tải danh mục đề tài.</p><Button className="min-h-11" onClick={() => void topics.refresh()}>Thử lại</Button></div></div>

  const decide = async (close = false) => {
    const version = decisionVersion.current
    const decision = await requestConfirmation({ title: close ? 'Đóng đề tài?' : 'Công bố đề tài?', description: close ? 'Ghi rõ lý do đóng đề tài.' : 'Công bố phiên bản đã lưu. Hãy lưu các chỉnh sửa bản nháp trước, rồi kiểm tra nội dung đề cương, ngành, kỳ đăng ký và chính sách.', confirmLabel: close ? 'Đóng đề tài' : 'Công bố đề tài', danger: close, ...(close ? { reasonLabel: 'Lý do đóng' } : {}) })
    if (decision === null || version !== decisionVersion.current) return
    try { if (close) await topics.close(decision); else await topics.publish(); setMessage(close ? 'Đã đóng đề tài.' : 'Đã công bố đề tài.') }
    catch (reason) { setMessage(topicErrorMessage(reason)) }
  }

  if (id && topics.current) {
    const topic = topics.current
    const canEditDraft = topic.status === 'DRAFT' && catalog.department?.id === topic.leadDepartmentId
    const canCloseTopic = topic.status !== 'CLOSED' && catalog.department?.id === topic.leadDepartmentId

    return (
      <div className="workspace-page topic mk-page-enter">
        <Link className="topic__back inline-flex min-h-11 items-center" to="/department/topics">← Danh mục đề tài</Link>
        <header className="workspace-heading topic__header">
          <div className="workspace-heading-copy">
            <span className="workspace-kicker">Đề tài {topic.code}</span>
            <h1>{topic.title}</h1>
            <p className="mt-1 text-sm text-ink-muted">{statusLabels[topic.status]} · {topic.leadDepartmentName}</p>
          </div>
          <div className="workspace-heading-actions">
            <StatusBadge status={topic.status} tone={statusTones[topic.status]} label={statusLabels[topic.status]} />
            {canCloseTopic && <Button variant="danger" className="min-h-11" disabled={topics.saving} onClick={() => void decide(true)}>Đóng đề tài</Button>}
          </div>
        </header>

        {confirmationDialog}
        {message && <p className="topic__message" role="status">{message}</p>}
        {topics.mutationError && <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">{topicErrorMessage(topics.mutationError)}</p>}

        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
          <section className={`topic__detail ${canEditDraft ? 'xl:col-span-5' : 'xl:col-span-12'}`}>
            <div className="topic__card-header">
              <h2>Thông tin đề tài</h2>
              <span className="rounded-md border border-primary/20 bg-primary-subtle px-2 py-0.5 font-mono text-xs font-bold text-primary">
                {topic.code}
              </span>
            </div>
            <div className="topic__card-body">
              <p>{topic.description || 'Chưa có mô tả.'}</p>
              <dl>
                <div><dt>Hình thức</dt><dd>{modeLabels[topic.projectMode]}</dd></div>
                <div>
                  <dt>Ngành chính</dt>
                  <dd>
                    {topic.primaryMajorId
                      ? (catalog.majors.find((m) => m.id === topic.primaryMajorId)?.name
                        ?? topic.requirements.find((r) => r.majorId === topic.primaryMajorId)?.majorName
                        ?? 'Chưa xác định')
                      : 'Không áp dụng'}
                  </dd>
                </div>
              </dl>
              <div>
                <h2 className="mb-2 text-sm font-bold text-ink">Yêu cầu theo ngành</h2>
                {topic.requirements.length ? (
                  <ul className="space-y-1.5 text-sm text-ink-soft">
                    {topic.requirements.map((requirement) => (
                      <li key={requirement.majorId} className="rounded-lg border border-hairline bg-canvas px-3 py-2">
                        {requirement.majorName || `Ngành #${requirement.majorId}`}: {requirement.minMembers}–{requirement.maxMembers} · {requirement.responsibility}
                      </li>
                    ))}
                  </ul>
                ) : <p>Chưa có yêu cầu theo ngành.</p>}
              </div>
              <div>
                <h2 className="mb-1 text-sm font-bold text-ink">Bối cảnh và vấn đề</h2>
                <p>{topic.problemStatement || 'Chưa có nội dung.'}</p>
              </div>
              <div>
                <h2 className="mb-1 text-sm font-bold text-ink">Mục tiêu</h2>
                <p>{topic.objectives || 'Chưa có nội dung.'}</p>
              </div>
              <div>
                <h2 className="mb-1 text-sm font-bold text-ink">Sản phẩm kỳ vọng</h2>
                <p>{topic.expectedOutput || 'Chưa có nội dung.'}</p>
              </div>
              <div>
                <h2 className="mb-1 text-sm font-bold text-ink">Lĩnh vực và công nghệ</h2>
                <p>{topic.domain || 'Chưa có lĩnh vực'} · {topic.technologies.join(', ') || 'Chưa có công nghệ'}</p>
              </div>
              <div>
                <h2 className="mb-1 text-sm font-bold text-ink">Từ khóa</h2>
                <p>{topic.keywords.join(', ') || 'Chưa có từ khóa'}</p>
              </div>
            </div>
          </section>

          {canEditDraft && (
            <section className="topic__edit xl:col-span-7">
              <div className="topic__card-header">
                <h2>Chỉnh sửa bản nháp</h2>
                <Button variant="secondary" className="min-h-11" disabled={topics.saving || draftDirty} onClick={() => void decide()}>Công bố</Button>
              </div>
              <div className="topic__card-body">
                {draftDirty && <p role="status" className="rounded-lg border border-status-warning-border bg-status-warning-bg px-3.5 py-2.5 text-sm text-status-warning-text">Có chỉnh sửa chưa lưu. Lưu bản nháp trước khi công bố.</p>}
                <TopicContentForm key={`${topic.id}:${topic.concurrencyToken}`} initial={topic} onDirtyChange={setDraftDirty} catalog={catalog} busy={topics.saving} onSave={async content => { const result = await topics.update(content); setMessage('Đã lưu đầy đủ nội dung đề cương.'); return result }} />
              </div>
            </section>
          )}
        </div>
      </div>
    )
  }

  const activeStatus = topics.filters.status ?? 'DRAFT'
  const totalPages = Math.max(1, Math.ceil(topics.totalCount / Math.max(1, topics.pageSize)))
  const publishedCount = topics.statusCounts?.PUBLISHED ?? (activeStatus === 'PUBLISHED' ? topics.totalCount : topics.items.filter((item) => item.status === 'PUBLISHED').length)
  const draftCount = topics.statusCounts?.DRAFT ?? (activeStatus === 'DRAFT' ? topics.totalCount : topics.items.filter((item) => item.status === 'DRAFT').length)
  const closedCount = topics.statusCounts?.CLOSED ?? (activeStatus === 'CLOSED' ? topics.totalCount : topics.items.filter((item) => item.status === 'CLOSED').length)
  const allTopicsTotal = topics.statusCounts
    ? topics.statusCounts.DRAFT + topics.statusCounts.PUBLISHED + topics.statusCounts.CLOSED
    : topics.totalCount

  return (
    <div className="workspace-page topic mk-page-enter">
      <header className="workspace-heading topic__header">
        <div className="workspace-heading-copy">
          <span className="workspace-kicker">Danh mục học vụ</span>
          <h1>Quản lý đề tài</h1>
          <p className="mt-1 max-w-3xl text-sm text-ink-muted">Tạo, công bố và theo dõi các đề tài dùng cho kỳ đồ án.</p>
        </div>
        <Button variant="secondary" className="min-h-11" onClick={() => void topics.refresh()}>Làm mới</Button>
      </header>

      <StatTileRow
        tiles={[
          {
            icon: 'library_books',
            label: 'Tổng đề tài danh mục',
            value: allTopicsTotal,
            caption: `Đang lọc: ${statusLabels[activeStatus]} (${topics.totalCount})`,
            hero: true,
          },
          {
            icon: 'public',
            label: 'Đã công bố',
            value: publishedCount,
            caption: activeStatus === 'PUBLISHED' ? 'Sẵn sàng để sinh viên chọn' : 'Nhấn để lọc đề tài đã công bố',
            tone: 'success',
            active: activeStatus === 'PUBLISHED',
            onClick: () => topics.setFilters({ ...topics.filters, status: 'PUBLISHED', page: 1 }),
          },
          {
            icon: 'edit_note',
            label: 'Bản nháp',
            value: draftCount,
            caption: activeStatus === 'DRAFT' ? 'Đang soạn thảo nội dung' : 'Nhấn để lọc bản nháp',
            tone: 'warning',
            active: activeStatus === 'DRAFT',
            onClick: () => topics.setFilters({ ...topics.filters, status: 'DRAFT', page: 1 }),
          },
          {
            icon: 'archive',
            label: 'Đã đóng',
            value: closedCount,
            caption: activeStatus === 'CLOSED' ? 'Ngừng nhận đăng ký' : 'Nhấn để lọc đề tài đã đóng',
            tone: 'neutral',
            active: activeStatus === 'CLOSED',
            onClick: () => topics.setFilters({ ...topics.filters, status: 'CLOSED', page: 1 }),
          },
        ]}
      />

      <form className="rounded-xl border border-hairline bg-card p-4 shadow-xs" onSubmit={event => { event.preventDefault(); topics.setFilters({ ...topics.filters, page: 1 }) }}>
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[240px] flex-1">
            <span>Tìm đề tài</span>
            <input placeholder="Mã hoặc tên đề tài" value={topics.filters.search ?? ''} onChange={event => topics.setFilters({ ...topics.filters, search: event.target.value || undefined, page: 1 })} />
          </label>
          <label className="w-full sm:w-56">
            <span>Trạng thái</span>
            <select aria-label="Trạng thái đề tài" value={activeStatus} onChange={event => topics.setFilters({ ...topics.filters, status: event.target.value as 'DRAFT' | 'PUBLISHED' | 'CLOSED', page: 1 })}>
              <option value="DRAFT">Bản nháp</option>
              <option value="PUBLISHED">Đã công bố</option>
              <option value="CLOSED">Đã đóng</option>
            </select>
          </label>
        </div>
      </form>

      <details className="topic__create-disclosure">
        <summary>
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary" aria-hidden="true">add_circle</span>
            Tạo đề tài mới
          </span>
          <span className="material-symbols-outlined text-ink-muted" aria-hidden="true">expand_more</span>
        </summary>
        <div className="topic__create-disclosure-body">
          <h2>Tạo bản nháp đề tài</h2>
          <TopicContentForm catalog={catalog} busy={topics.saving} onSave={async () => undefined} create={{ onCreate: async input => { const result = await topics.create(input); setMessage('Đã tạo bản nháp đề tài.'); return result } }} />
        </div>
      </details>

      {topics.mutationError && <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">{topicErrorMessage(topics.mutationError)}</p>}
      {message && <p className="topic__message" role="status">{message}</p>}

      <section className="topic__list" aria-labelledby="topic-list-title">
        <div className="topic__section-heading">
          <div className="flex items-center gap-2.5">
            <h2 id="topic-list-title">Đề tài hiện có</h2>
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary-subtle px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums text-primary">
              {topics.totalCount}
            </span>
          </div>
          <span className="text-xs font-medium text-ink-muted">Trạng thái: {statusLabels[activeStatus]}</span>
        </div>

        {topics.items.length > 0 ? (
          <div className="topic__list-body">
            {topics.items.map(topic => (
              <article key={topic.id}>
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <StatusBadge status={topic.status} tone={statusTones[topic.status]} label={statusLabels[topic.status]} />
                    <span className="rounded-md border border-hairline bg-canvas px-2 py-0.5 font-mono text-xs font-semibold text-ink-soft">
                      {topic.code}
                    </span>
                  </div>
                  <Link to={`/department/topics/${topic.id}`}>{topic.title}</Link>
                  <p>{topic.leadDepartmentName}</p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-2.5 text-xs text-ink-muted">
                  <span>{modeLabels[topic.projectMode]} · {topic.requirements.map(requirement => requirement.majorName || requirement.majorId).join(', ') || 'Chưa cấu hình ngành'}</span>
                  <Link className="!mt-0 !inline-flex !text-xs !font-semibold !text-primary hover:underline" to={`/department/topics/${topic.id}`}>Mở chi tiết →</Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="topic__empty">Không có đề tài trong trạng thái đã chọn.</p>
        )}

        {topics.totalCount > topics.pageSize && (
          <div className="topic__pagination">
            <Pagination
              page={topics.page}
              pages={totalPages}
              total={topics.totalCount}
              pageSize={topics.pageSize}
              onPage={(nextPage) => topics.setFilters({ ...topics.filters, page: nextPage })}
            />
          </div>
        )}
      </section>
    </div>
  )
}
