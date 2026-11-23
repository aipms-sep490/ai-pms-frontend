import type { KnowledgeCitation } from '../academic-ai-api'
import type { EvidenceReference } from '../ai-api'

export type InspectedSource =
  | { kind: 'DOC'; data: KnowledgeCitation; label?: string }
  | { kind: 'PROJECT'; data: EvidenceReference; label?: string }

export function AssistantSourceInspector({
  inspected,
  mode = 'overlay',
  onClose,
  onOpenEvidence,
}: {
  inspected: InspectedSource
  mode?: 'overlay' | 'sidepanel'
  onClose: () => void
  onOpenEvidence?: (evidence: EvidenceReference) => void
}) {
  const isDoc = inspected.kind === 'DOC'

  return (
    <aside
      className={`assistant-source ${mode === 'sidepanel' ? 'is-sidepanel' : 'is-overlay'}`}
      aria-label="Nguồn trích dẫn"
      role={mode === 'overlay' ? 'dialog' : 'complementary'}
      aria-modal={mode === 'overlay' ? true : undefined}
    >
      <div className="assistant-source-header">
        <div className="min-w-0">
          <span className="assistant-source-kicker">
            <span className="material-symbols-outlined" aria-hidden="true">
              {isDoc ? 'verified' : 'folder_data'}
            </span>
            {isDoc ? `Nguồn học vụ${inspected.label ? ` · ${inspected.label}` : ''}` : `Chứng cứ đồ án${inspected.label ? ` · ${inspected.label}` : ''}`}
          </span>
          <h3>{inspected.data.title}</h3>
        </div>
        <button type="button" aria-label="Đóng nguồn" onClick={onClose}>
          <span className="material-symbols-outlined" aria-hidden="true">close</span>
          Đóng
        </button>
      </div>

      {isDoc ? (
        <>
          <div className="assistant-source-meta">
            <span>{inspected.data.documentType || 'Tài liệu học vụ'}</span>
            <span>Phiên bản {inspected.data.version}</span>
            {inspected.data.section && <span>{inspected.data.section}</span>}
            {inspected.data.page ? <span>Trang {inspected.data.page}</span> : null}
            {inspected.data.effectiveFrom && (
              <span>Hiệu lực từ {new Date(inspected.data.effectiveFrom).toLocaleDateString('vi-VN')}</span>
            )}
          </div>
          <div className="assistant-source-body">
            <p className="whitespace-pre-wrap">{inspected.data.excerpt}</p>
          </div>
          <p className="assistant-source-note">
            <span className="material-symbols-outlined" aria-hidden="true">info</span>
            Trích đoạn được lưu tại thời điểm trả lời; đây không phải toàn bộ tệp gốc.
          </p>
        </>
      ) : (
        <>
          <div className="assistant-source-meta">
            <span>{inspected.data.sourceType}</span>
            <span>{inspected.data.sourceId}</span>
            {inspected.data.periodOrDate && <span>{inspected.data.periodOrDate}</span>}
          </div>
          <div className="assistant-source-body">
            <p className="whitespace-pre-wrap">{inspected.data.excerpt || 'Không có trích đoạn chi tiết.'}</p>
          </div>
          {onOpenEvidence && inspected.data.referenceUrl && (
            <div className="assistant-source-actions">
              <button
                type="button"
                className="assistant-source-jump"
                onClick={() => onOpenEvidence(inspected.data)}
              >
                <span className="material-symbols-outlined" aria-hidden="true">open_in_new</span>
                Mở mục này trong đồ án
              </button>
            </div>
          )}
          <p className="assistant-source-note">
            <span className="material-symbols-outlined" aria-hidden="true">info</span>
            Dữ liệu đồ án được truy hồi theo quyền truy cập thực tế tại thời điểm hỏi.
          </p>
        </>
      )}
    </aside>
  )
}
