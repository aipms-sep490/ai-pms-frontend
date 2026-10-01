import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { useTopics } from '../hooks/useTopics'
import type { CreateTopic, ProjectMode, TopicContent } from '../api/topic-api'
import './topic-management.css'

const numberValue = (value: string) => Number(value)
const initialContent: TopicContent = { title: '', description: null, problemStatement: null, objectives: null, expectedOutput: null, domain: null, technologies: [], keywords: [], projectMode: 'SINGLE_MAJOR', primaryMajorId: null, requirements: [] }
const statusLabels = { DRAFT: 'Bản nháp', PUBLISHED: 'Đã công bố', CLOSED: 'Đã đóng' } as const
const modeLabels: Record<ProjectMode, string> = { SINGLE_MAJOR: 'Một ngành', INTERDISCIPLINARY: 'Liên ngành' }

export function TopicManagementPage() {
  const { id } = useParams()
  const topics = useTopics(id ? Number(id) : undefined)
  const [message, setMessage] = useState<string | null>(null)
  const [create, setCreate] = useState({ projectPeriodId: '', code: '', leadDepartmentId: '', title: '', projectMode: 'SINGLE_MAJOR' as ProjectMode, primaryMajorId: '', requirementMajorId: '' })
  const [reason, setReason] = useState('')
  const [editedTitle, setEditedTitle] = useState('')

  if (topics.isUnauthorized) return <Link to="/login">Đăng nhập</Link>
  if (topics.loading) return <p>Đang tải danh mục đề tài…</p>
  if (topics.isForbidden) return <p>Bạn không có quyền quản lý đề tài trong bộ môn này.</p>
  if (topics.error) return <p>Không thể tải danh mục đề tài. <Button onClick={() => void topics.refresh()}>Thử lại</Button></p>

  const createDraft = async (event: React.FormEvent) => {
    event.preventDefault()
    setMessage(null)
    try {
      const input: CreateTopic = {
        projectPeriodId: numberValue(create.projectPeriodId),
        code: create.code,
        leadDepartmentId: numberValue(create.leadDepartmentId),
        content: {
          ...initialContent,
          title: create.title,
          projectMode: create.projectMode,
          primaryMajorId: create.primaryMajorId ? numberValue(create.primaryMajorId) : null,
          requirements: [{ majorId: numberValue(create.requirementMajorId), minMembers: 1, maxMembers: 1, responsibility: 'Required member' }],
        },
      }
      await topics.create(input)
      setMessage('Đã tạo bản nháp đề tài.')
      setCreate({ projectPeriodId: '', code: '', leadDepartmentId: '', title: '', projectMode: 'SINGLE_MAJOR', primaryMajorId: '', requirementMajorId: '' })
    } catch {
      setMessage('Không thể tạo bản nháp. Vui lòng kiểm tra thông tin và thử lại.')
    }
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
        </section>
        {topic.status === 'DRAFT' && <section className="topic__edit"><h2>Chỉnh sửa bản nháp</h2><label>Tên đề tài<input aria-label="Tên đề tài" value={editedTitle || topic.title} onChange={event => setEditedTitle(event.target.value)} /></label><div className="topic__actions"><Button disabled={topics.saving} onClick={() => void topics.update({ ...topic, title: editedTitle || topic.title }).catch(() => undefined)}>Lưu bản nháp</Button><Button variant="secondary" disabled={topics.saving} onClick={() => void topics.publish().catch(() => undefined)}>Công bố</Button></div></section>}
        {topic.status !== 'CLOSED' && <form className="topic__close" onSubmit={event => { event.preventDefault(); if (reason.trim()) void topics.close(reason).catch(() => undefined) }}><label>Lý do đóng<input aria-label="Lý do đóng" value={reason} onChange={event => setReason(event.target.value)} /></label><Button type="submit" variant="danger" disabled={topics.saving || !reason.trim()}>Đóng đề tài</Button></form>}
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
      <details className="topic__create-disclosure"><summary>Tạo đề tài mới<span className="material-symbols-outlined" aria-hidden="true">add</span></summary><form className="topic__create" onSubmit={createDraft}>
        <div className="topic__section-heading"><div><p>TẠO MỚI</p><h2>Tạo bản nháp đề tài</h2></div><span>Điền các thông tin nền tảng. Nội dung chi tiết có thể cập nhật sau khi tạo.</span></div>
        <div className="topic__form-grid">
          <label>Kỳ đồ án ID<input required inputMode="numeric" placeholder="Ví dụ: 12" value={create.projectPeriodId} onChange={event => setCreate({ ...create, projectPeriodId: event.target.value })} /></label>
          <label>Mã đề tài<input required placeholder="Ví dụ: AI-2026-01" value={create.code} onChange={event => setCreate({ ...create, code: event.target.value })} /></label>
          <label>Bộ môn phụ trách ID<input required inputMode="numeric" placeholder="Ví dụ: 3" value={create.leadDepartmentId} onChange={event => setCreate({ ...create, leadDepartmentId: event.target.value })} /></label>
          <label className="topic__wide">Tên đề tài<input required placeholder="Nhập tên đề tài" value={create.title} onChange={event => setCreate({ ...create, title: event.target.value })} /></label>
          <label>Hình thức<select aria-label="Hình thức đồ án" value={create.projectMode} onChange={event => setCreate({ ...create, projectMode: event.target.value as ProjectMode })}><option value="SINGLE_MAJOR">Một ngành</option><option value="INTERDISCIPLINARY">Liên ngành</option></select></label>
          <label>Ngành chính ID<input inputMode="numeric" placeholder="Không bắt buộc" value={create.primaryMajorId} onChange={event => setCreate({ ...create, primaryMajorId: event.target.value })} /></label>
          <label>Ngành yêu cầu ID<input required inputMode="numeric" placeholder="Ví dụ: 5" value={create.requirementMajorId} onChange={event => setCreate({ ...create, requirementMajorId: event.target.value })} /></label>
        </div>
        <div className="topic__create-action"><Button type="submit" disabled={topics.saving}>{topics.saving ? 'Đang tạo…' : 'Tạo bản nháp'}</Button></div>
      </form>
      </details>
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
