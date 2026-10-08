import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { useTopics } from '../hooks/useTopics'
import { TopicContentForm } from '../components/TopicContentForm'
import { useTopicCatalog } from '../hooks/useTopicCatalog'
import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'
import { topicErrorMessage } from '../api/topic-api'
import './topic-management.css'

const statusLabels = { DRAFT: 'Bản nháp', PUBLISHED: 'Đã công bố', CLOSED: 'Đã đóng' } as const
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

  if (topics.isUnauthorized) return <Link to="/login">Đăng nhập</Link>
  if (topics.loading) return <p>Đang tải danh mục đề tài…</p>
  if (topics.isForbidden) return <p>Bạn không có quyền quản lý đề tài trong bộ môn này.</p>
  if (topics.error) return <p>Không thể tải danh mục đề tài. <Button onClick={() => void topics.refresh()}>Thử lại</Button></p>

  const decide = async (close = false) => {
    const version = decisionVersion.current
    const decision = await requestConfirmation({ title: close ? 'Đóng đề tài?' : 'Công bố đề tài?', description: close ? 'Ghi rõ lý do đóng đề tài.' : 'Công bố phiên bản đã lưu. Hãy lưu các chỉnh sửa bản nháp trước, rồi kiểm tra nội dung đề cương, ngành, kỳ đăng ký và chính sách.', confirmLabel: close ? 'Đóng đề tài' : 'Công bố đề tài', danger: close, ...(close ? { reasonLabel: 'Lý do đóng' } : {}) })
    if (decision === null || version !== decisionVersion.current) return
    try { if (close) await topics.close(decision); else await topics.publish(); setMessage(close ? 'Đã đóng đề tài.' : 'Đã công bố đề tài.') }
    catch (reason) { setMessage(topicErrorMessage(reason)) }
  }

  if (id && topics.current) {
    const topic = topics.current
    return (
      <main className="topic mk-page-enter">
        <Link className="topic__back" to="/department/topics">← Danh mục đề tài</Link>
        <header className="topic__header">
          <p>ĐỀ TÀI {topic.code}</p>
          <h1>{topic.title}</h1>
          <span>{statusLabels[topic.status]} · {topic.leadDepartmentName}</span>
        </header>
        <section className="topic__detail">
          <h2>Thông tin đề tài</h2>
          <p>{topic.description || 'Chưa có mô tả.'}</p>
          <dl>
            <div><dt>Hình thức</dt><dd>{modeLabels[topic.projectMode]}</dd></div>
            <div><dt>Ngành chính</dt><dd>{topic.primaryMajorId ? `#${topic.primaryMajorId}` : 'Không áp dụng'}</dd></div>
          </dl>
          <h2>Yêu cầu theo ngành</h2>
          {topic.requirements.length ? <ul>{topic.requirements.map((requirement) => <li key={requirement.majorId}>{requirement.majorName || `Ngành #${requirement.majorId}`}: {requirement.minMembers}–{requirement.maxMembers} · {requirement.responsibility}</li>)}</ul> : <p>Chưa có yêu cầu theo ngành.</p>}
          <h2>Bối cảnh và vấn đề</h2><p>{topic.problemStatement || 'Chưa có nội dung.'}</p>
          <h2>Mục tiêu</h2><p>{topic.objectives || 'Chưa có nội dung.'}</p>
          <h2>Sản phẩm kỳ vọng</h2><p>{topic.expectedOutput || 'Chưa có nội dung.'}</p>
          <h2>Lĩnh vực và công nghệ</h2><p>{topic.domain || 'Chưa có lĩnh vực'} · {topic.technologies.join(', ') || 'Chưa có công nghệ'}</p>
          <h2>Từ khóa</h2><p>{topic.keywords.join(', ') || 'Chưa có từ khóa'}</p>
        </section>
        {confirmationDialog}
        {message && <p className="topic__message" role="status">{message}</p>}
        {topics.mutationError && <p role="alert">{topicErrorMessage(topics.mutationError)}</p>}
        {topic.status === 'DRAFT' && catalog.department?.id === topic.leadDepartmentId && <section className="topic__edit"><h2>Chỉnh sửa bản nháp</h2><TopicContentForm key={`${topic.id}:${topic.concurrencyToken}`} initial={topic} onDirtyChange={setDraftDirty} catalog={catalog} busy={topics.saving} onSave={async content => { const result = await topics.update(content); setMessage('Đã lưu đầy đủ nội dung đề cương.'); return result }} />{draftDirty && <p role="status">Có chỉnh sửa chưa lưu. Lưu bản nháp trước khi công bố.</p>}<Button variant="secondary" disabled={topics.saving || draftDirty} onClick={() => void decide()}>Công bố</Button></section>}
        {topic.status !== 'CLOSED' && catalog.department?.id === topic.leadDepartmentId && <Button variant="danger" disabled={topics.saving} onClick={() => void decide(true)}>Đóng đề tài</Button>}

      </main>
    )
  }

  return (
    <main className="topic mk-page-enter">
      <header className="topic__header">
        <p>DANH MỤC HỌC VỤ</p>
        <h1>Quản lý đề tài</h1>
        <span>Tạo, công bố và theo dõi các đề tài dùng cho kỳ đồ án.</span>
      </header>
      <form className="topic__filters" onSubmit={event => { event.preventDefault(); topics.setFilters({ ...topics.filters, page: 1 }) }}>
        <label><span>Tìm đề tài</span><input placeholder="Mã hoặc tên đề tài" value={topics.filters.search ?? ''} onChange={event => topics.setFilters({ ...topics.filters, search: event.target.value || undefined, page: 1 })} /></label>
        <label><span>Trạng thái</span><select aria-label="Trạng thái đề tài" value={topics.filters.status ?? 'DRAFT'} onChange={event => topics.setFilters({ ...topics.filters, status: event.target.value as 'DRAFT' | 'PUBLISHED' | 'CLOSED', page: 1 })}><option value="DRAFT">Bản nháp</option><option value="PUBLISHED">Đã công bố</option><option value="CLOSED">Đã đóng</option></select></label>
      </form>
      <details className="topic__create-disclosure"><summary>Tạo đề tài mới<span className="material-symbols-outlined" aria-hidden="true">add</span></summary><h2>Tạo bản nháp đề tài</h2><TopicContentForm catalog={catalog} busy={topics.saving} onSave={async () => undefined} create={{ onCreate: async input => { const result = await topics.create(input); setMessage('Đã tạo bản nháp đề tài.'); return result } }} /></details>
      {topics.mutationError && <p role="alert">{topicErrorMessage(topics.mutationError)}</p>}
      {message && <p className="topic__message" role="status">{message}</p>}
      <section className="topic__list" aria-labelledby="topic-list-title">
        <div className="topic__section-heading"><div><p>DANH SÁCH</p><h2 id="topic-list-title">Đề tài hiện có</h2></div><span>{topics.totalCount} đề tài</span></div>
        {topics.items.map(topic => <article key={topic.id}><div><span className="topic__status">{statusLabels[topic.status]}</span><Link to={`/department/topics/${topic.id}`}>{topic.title}</Link><p>{topic.code} · {topic.leadDepartmentName}</p></div><p>{modeLabels[topic.projectMode]} · {topic.requirements.map(requirement => requirement.majorName || requirement.majorId).join(', ')}</p></article>)}
        {!topics.items.length && <p className="topic__empty">Không có đề tài trong trạng thái đã chọn.</p>}
      </section>
      {topics.totalCount > topics.pageSize && <nav className="topic__pagination" aria-label="Phân trang danh mục đề tài"><Button disabled={topics.page <= 1} onClick={() => topics.setFilters({ ...topics.filters, page: topics.page - 1 })}>Trang trước</Button><span>Trang {topics.page}</span><Button disabled={topics.page * topics.pageSize >= topics.totalCount} onClick={() => topics.setFilters({ ...topics.filters, page: topics.page + 1 })}>Trang sau</Button></nav>}
    </main>
  )
}
