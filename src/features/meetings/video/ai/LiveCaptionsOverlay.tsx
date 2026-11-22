import type { LiveCaptionLine } from './meeting-video-ai.types'
import { speakerInitials } from './meeting-video-ai-utils'

export function LiveCaptionsOverlay({
  captions,
  visible,
  listening,
  onHide,
}: {
  captions: LiveCaptionLine[]
  visible: boolean
  listening: boolean
  onHide: () => void
}) {
  if (!visible || (captions.length === 0 && !listening)) return null

  return (
    <div
      className="mtg-ai-captions-overlay"
      role="region"
      aria-label="Phụ đề trực tiếp AI"
      aria-live="polite"
    >
      <div className="mtg-ai-captions-bar">
        <div className="mtg-ai-captions-head">
          <span className="mtg-ai-captions-badge">
            <span className={`mtg-ai-live-dot ${listening ? 'is-active' : ''}`} aria-hidden="true" />
            <span>Phụ đề AI trực tiếp</span>
          </span>
          <button
            type="button"
            className="mtg-ai-captions-close"
            onClick={onHide}
            title="Ẩn thanh phụ đề nổi (vẫn giữ ghi lời nói)"
            aria-label="Ẩn phụ đề nổi"
          >
            ✕
          </button>
        </div>

        {captions.length === 0 ? (
          <p className="mtg-ai-caption-placeholder">
            AI đang lắng nghe micrô của bạn… Hãy bắt đầu nói để hiển thị phụ đề trực tiếp cho cả phòng.
          </p>
        ) : (
          <ul className="mtg-ai-caption-list">
            {captions.slice(-2).map((line) => (
              <li
                key={line.key}
                className={`mtg-ai-caption-line ${line.isFinal ? 'is-final' : 'is-interim'}`}
              >
                <span className="mtg-ai-caption-avatar" aria-hidden="true">
                  {speakerInitials(line.speakerName)}
                </span>
                <strong className="mtg-ai-caption-speaker">{line.speakerName}:</strong>
                <span className="mtg-ai-caption-text">{line.text}</span>
                {!line.isFinal && <span className="mtg-ai-caption-typing" aria-hidden="true">…</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
