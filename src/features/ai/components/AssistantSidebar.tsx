import { useMemo, useState } from 'react'
import type { AssistantConversation, AssistantProjectOption } from '../academic-ai-api'

function groupConversations(items: AssistantConversation[]) {
  const pinned: AssistantConversation[] = []
  const today: AssistantConversation[] = []
  const week: AssistantConversation[] = []
  const earlier: AssistantConversation[] = []

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const sevenDaysAgo = startOfToday - 7 * 86_400_000

  for (const item of items) {
    if (item.isPinned) {
      pinned.push(item)
      continue
    }
    const normalized = item.updatedAt.endsWith('Z') || /[+-]\d\d:\d\d$/.test(item.updatedAt) ? item.updatedAt : `${item.updatedAt}Z`
    const ts = Date.parse(normalized)
    if (!Number.isNaN(ts) && ts >= startOfToday) today.push(item)
    else if (!Number.isNaN(ts) && ts >= sevenDaysAgo) week.push(item)
    else earlier.push(item)
  }

  return [
    { key: 'pinned', label: 'Đã ghim', icon: 'push_pin', items: pinned },
    { key: 'today', label: 'Hôm nay', icon: 'today', items: today },
    { key: 'week', label: '7 ngày qua', icon: 'date_range', items: week },
    { key: 'earlier', label: 'Trước đó', icon: 'history', items: earlier },
  ].filter(group => group.items.length > 0)
}

export function AssistantSidebar({
  conversations,
  activeConversationId,
  loading,
  hasMore,
  search,
  onSearchChange,
  onNewChat,
  onSelectConversation,
  onLoadMore,
  onTogglePin,
  onRenameConversation,
  onExportConversation,
  onRequestDelete,
  projects,
  selectedProjectId,
  onSelectProject,
  projectsLoading = false,
  compact = false,
}: {
  conversations: AssistantConversation[]
  activeConversationId?: number | null
  loading: boolean
  hasMore: boolean
  search: string
  onSearchChange: (value: string) => void
  onNewChat: () => void
  onSelectConversation: (id: number) => void
  onLoadMore: () => void
  onTogglePin: (item: AssistantConversation) => Promise<void>
  onRenameConversation: (item: AssistantConversation, title: string) => Promise<void>
  onExportConversation: (item: AssistantConversation, format: 'md' | 'docx' | 'pdf') => Promise<void>
  onRequestDelete: (item: AssistantConversation) => void
  projects?: AssistantProjectOption[]
  selectedProjectId?: number
  onSelectProject?: (projectId?: number) => void
  projectsLoading?: boolean
  compact?: boolean
}) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null)
  const [actionBusyId, setActionBusyId] = useState<number | null>(null)

  const groups = useMemo(() => groupConversations(conversations), [conversations])

  const startEdit = (item: AssistantConversation) => {
    setMenuOpenId(null)
    setEditingId(item.id)
    setEditTitle(item.title)
  }

  const commitEdit = async (item: AssistantConversation) => {
    const trimmed = editTitle.trim()
    setEditingId(null)
    if (!trimmed || trimmed === item.title) return
    setActionBusyId(item.id)
    try {
      await onRenameConversation(item, trimmed)
    } finally {
      setActionBusyId(null)
    }
  }

  const handlePin = async (item: AssistantConversation) => {
    setMenuOpenId(null)
    setActionBusyId(item.id)
    try {
      await onTogglePin(item)
    } finally {
      setActionBusyId(null)
    }
  }

  const handleExport = async (item: AssistantConversation, format: 'md' | 'docx' | 'pdf') => {
    setMenuOpenId(null)
    setActionBusyId(item.id)
    try {
      await onExportConversation(item, format)
    } finally {
      setActionBusyId(null)
    }
  }

  return (
    <aside className={`assistant-sidebar${compact ? ' is-compact' : ''}`} aria-label="Quản lý hội thoại trợ lý AI">
      <div className="assistant-sidebar-top">
        <button type="button" className="assistant-new-chat-btn" onClick={onNewChat} disabled={loading}>
          <span className="material-symbols-outlined" aria-hidden="true">edit_square</span>
          <span>Cuộc trò chuyện mới</span>
        </button>

        {onSelectProject && (
          <label className="assistant-scope-picker">
            <span className="assistant-scope-label">
              <span className="material-symbols-outlined" aria-hidden="true">folder_open</span>
              Ngữ cảnh trao đổi
            </span>
            <select
              aria-label="Chọn ngữ cảnh đồ án"
              value={selectedProjectId ?? ''}
              disabled={projectsLoading}
              onChange={e => onSelectProject(e.target.value ? Number(e.target.value) : undefined)}
            >
              <option value="">Hỏi đáp học vụ chung</option>
              {(projects ?? []).map(p => (
                <option key={p.id} value={p.id}>
                  {p.code} · {p.title} ({p.roleLabel})
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="assistant-search-box">
          <span className="material-symbols-outlined" aria-hidden="true">search</span>
          <input
            type="search"
            aria-label="Tìm kiếm lịch sử hội thoại"
            placeholder="Tìm hội thoại…"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
          />
          {search && (
            <button type="button" aria-label="Xóa từ khóa tìm kiếm" onClick={() => onSearchChange('')}>×</button>
          )}
        </div>
      </div>

      <div className="assistant-sidebar-list" aria-label="Lịch sử đã lưu">
        {loading && conversations.length === 0 && (
          <p role="status" className="assistant-sidebar-status">Đang tải hội thoại…</p>
        )}

        {!loading && conversations.length === 0 && (
          <div className="assistant-history-empty">
            <span className="material-symbols-outlined" aria-hidden="true">forum</span>
            <strong>{search.trim() ? 'Không tìm thấy hội thoại' : 'Câu chuyện bắt đầu từ đây'}</strong>
            <p>{search.trim() ? 'Thử từ khóa khác hoặc tạo hội thoại mới.' : 'Chưa có hội thoại trong phạm vi này.'}</p>
          </div>
        )}

        {groups.map(group => (
          <section key={group.key} className="assistant-sidebar-group">
            <h3 className="assistant-sidebar-group-title">
              <span className="material-symbols-outlined" aria-hidden="true">{group.icon}</span>
              {group.label}
            </h3>
            <ul>
              {group.items.map(item => {
                const active = activeConversationId === item.id
                const editing = editingId === item.id
                const menuOpen = menuOpenId === item.id
                const itemBusy = actionBusyId === item.id
                return (
                  <li key={item.id} className={`assistant-conv-item${active ? ' is-active' : ''}`}>
                    {editing ? (
                      <form
                        className="assistant-conv-rename"
                        onSubmit={e => { e.preventDefault(); void commitEdit(item) }}
                      >
                        <input
                          aria-label="Tên hội thoại mới"
                          value={editTitle}
                          maxLength={120}
                          autoFocus
                          onChange={e => setEditTitle(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Escape') setEditingId(null) }}
                          onBlur={() => void commitEdit(item)}
                        />
                      </form>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="assistant-conv-select"
                          disabled={loading || itemBusy}
                          onClick={() => onSelectConversation(item.id)}
                        >
                          <strong title={item.title}>{item.title}</strong>
                          <small>
                            {item.turnCount ? `${item.turnCount} lượt · ` : ''}
                            {new Date(item.updatedAt).toLocaleDateString('vi-VN')}
                          </small>
                        </button>
                        <div className="assistant-conv-actions">
                          <button
                            type="button"
                            className={`assistant-conv-icon-btn${item.isPinned ? ' is-pinned' : ''}`}
                            disabled={loading || itemBusy}
                            aria-label={item.isPinned ? `Bỏ ghim ${item.title}` : `Ghim ${item.title}`}
                            title={item.isPinned ? 'Bỏ ghim' : 'Ghim hội thoại'}
                            onClick={() => void handlePin(item)}
                          >
                            <span className="material-symbols-outlined" aria-hidden="true">push_pin</span>
                          </button>
                          <button
                            type="button"
                            className="assistant-conv-icon-btn"
                            disabled={loading || itemBusy}
                            aria-label={`Tùy chọn cho ${item.title}`}
                            aria-expanded={menuOpen}
                            title="Thêm tùy chọn"
                            onClick={() => setMenuOpenId(curr => curr === item.id ? null : item.id)}
                          >
                            <span className="material-symbols-outlined" aria-hidden="true">more_horiz</span>
                          </button>
                        </div>
                      </>
                    )}

                    {menuOpen && (
                      <div className="assistant-conv-menu" role="menu">
                        <button type="button" role="menuitem" onClick={() => startEdit(item)}>
                          <span className="material-symbols-outlined" aria-hidden="true">edit</span>
                          Đổi tên
                        </button>
                        <button type="button" role="menuitem" onClick={() => void handlePin(item)}>
                          <span className="material-symbols-outlined" aria-hidden="true">push_pin</span>
                          {item.isPinned ? 'Bỏ ghim' : 'Ghim lên đầu'}
                        </button>
                        <button type="button" role="menuitem" onClick={() => void handleExport(item, 'docx')}>
                          <span className="material-symbols-outlined" aria-hidden="true">description</span>
                          Tải cả hội thoại (Word)
                        </button>
                        <button type="button" role="menuitem" onClick={() => void handleExport(item, 'pdf')}>
                          <span className="material-symbols-outlined" aria-hidden="true">picture_as_pdf</span>
                          Tải cả hội thoại (PDF)
                        </button>
                        <button type="button" role="menuitem" onClick={() => void handleExport(item, 'md')}>
                          <span className="material-symbols-outlined" aria-hidden="true">markdown</span>
                          Tải Markdown (.md)
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          className="is-danger"
                          aria-label={`Xóa hội thoại ${item.title}`}
                          onClick={() => { setMenuOpenId(null); onRequestDelete(item) }}
                        >
                          <span className="material-symbols-outlined" aria-hidden="true">delete</span>
                          Xóa hội thoại
                        </button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        ))}

        {hasMore && (
          <button type="button" className="assistant-load-more-btn" disabled={loading} onClick={onLoadMore}>
            Xem thêm hội thoại
          </button>
        )}
      </div>
    </aside>
  )
}
