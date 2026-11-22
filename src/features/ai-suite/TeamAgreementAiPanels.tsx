import { useState } from 'react'
import { analyzeTeamSkillGap, draftWorkingAgreement, formatAiSuiteError, scoreFillClass } from './ai-suite-api'
import type { TeamSkillGapDto, WorkingAgreementDraftDto, WorkingAgreementSectionDraftDto } from './ai-suite.types'
import { AiSuiteCardShell } from './AiSuiteCardShell'

const COV_META: Record<string, { label: string; cls: string }> = {
  COVERED: { label: 'Đã phủ tốt', cls: 'ais-pill ais-pill--success' },
  WEAK: { label: 'Còn yếu', cls: 'ais-pill ais-pill--warning' },
  MISSING: { label: 'Đang thiếu', cls: 'ais-pill ais-pill--danger' },
}

export function TeamSkillGapPanel({ teamId }: { teamId: number }) {
  const [topicDesc, setTopicDesc] = useState('')
  const [data, setData] = useState<TeamSkillGapDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await analyzeTeamSkillGap(teamId, { customTopicDescription: topicDesc.trim() || null }))
    } catch (err) {
      setError(formatAiSuiteError(err, 'Không thể phân tích ma trận năng lực nhóm lúc này.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AiSuiteCardShell
      icon="diversity_3"
      title="AI Phân tích Lỗ hổng Kỹ năng & Cơ cấu Liên ngành"
      badge="Mục #7a · Skill-Gap"
      subtitle="Đối chiếu chuyên ngành, chứng chỉ của các thành viên với hướng đề tài để phát hiện mảng còn thiếu và đề xuất phân vai hợp lý."
      meta={data?.meta}
      error={error}
      actions={
        <button type="button" className="ais-btn ais-btn--primary" disabled={loading} onClick={() => void handleAnalyze()}>
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">auto_awesome</span>
          {loading ? 'Đang đánh giá năng lực…' : data ? 'Phân tích lại' : 'AI Phân tích năng lực nhóm'}
        </button>
      }
    >
      <input
        className="ais-input"
        value={topicDesc}
        disabled={loading}
        placeholder="Mô tả ngắn hướng đề tài dự kiến (tùy chọn — bỏ trống AI sẽ đọc từ đề tài hiện tại)…"
        onChange={(e) => setTopicDesc(e.target.value)}
      />

      {data && (
        <div className="space-y-3 text-xs">
          <div className="ais-subcard space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="ais-pill ais-pill--ai">
                Mô hình: {data.projectMode === 'INTERDISCIPLINARY' ? 'Liên ngành' : 'Đơn ngành'}
              </span>
              <strong className="text-sm text-primary">Độ phủ năng lực: {data.readinessScore}/100</strong>
            </div>
            <div className="ais-score-bar" role="progressbar" aria-valuenow={data.readinessScore} aria-valuemin={0} aria-valuemax={100}>
              <div className={scoreFillClass(data.readinessScore)} style={{ width: `${data.readinessScore}%` }} />
            </div>
            <p className="leading-relaxed text-ink-soft">{data.summary}</p>
          </div>

          {data.coverageMatrix.length > 0 && (
            <div className="space-y-1.5">
              <p className="font-bold text-ink">Ma trận độ phủ kỹ năng / vai trò:</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {data.coverageMatrix.map((item, i) => {
                  const meta = COV_META[item.status] ?? COV_META.WEAK
                  return (
                    <div key={i} className="rounded-lg border border-hairline bg-card p-2.5 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-ink">{item.skillOrRole}</strong>
                        <span className={meta.cls}>{meta.label}</span>
                      </div>
                      {item.coveredByMembers.length > 0 && (
                        <p className="text-[11px] text-primary">Phụ trách: {item.coveredByMembers.join(', ')}</p>
                      )}
                      <p className="text-ink-soft">{item.note}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {data.roleSuggestions.length > 0 && (
            <div className="ais-subcard space-y-1.5">
              <p className="font-bold text-ink">Gợi ý phân vai theo từng thành viên:</p>
              <ul className="space-y-1">
                {data.roleSuggestions.map((rs) => (
                  <li key={rs.userId} className="text-ink-soft">
                    <strong className="text-ink">{rs.fullName}</strong>
                    {rs.majorName ? ` (${rs.majorName})` : ''} → <strong className="text-primary">{rs.suggestedRole}</strong>
                    {rs.strengths.length > 0 ? ` · Thế mạnh: ${rs.strengths.join(', ')}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.onboardingRecommendations.length > 0 && (
            <div className="ais-subcard">
              <p className="font-bold text-ink">Đề xuất bù đắp lỗ hổng đầu kỳ:</p>
              <ul className="mt-1 list-disc pl-5 text-ink-soft space-y-0.5">
                {data.onboardingRecommendations.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </AiSuiteCardShell>
  )
}

export function WorkingAgreementAiDraftBar({
  projectId,
  disabled = false,
  onApplySections,
}: {
  projectId: number
  disabled?: boolean
  onApplySections: (sections: WorkingAgreementSectionDraftDto[]) => void
}) {
  const [prefs, setPrefs] = useState('')
  const [draft, setDraft] = useState<WorkingAgreementDraftDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [applied, setApplied] = useState(false)

  const handleDraft = async () => {
    setLoading(true)
    setError(null)
    setApplied(false)
    try {
      setDraft(await draftWorkingAgreement(projectId, { teamPreferences: prefs.trim() || null }))
    } catch (err) {
      setError(formatAiSuiteError(err, 'Chưa thể soạn dự thảo cam kết làm việc lúc này.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AiSuiteCardShell
      compact
      icon="handshake"
      title="AI Soạn Dự thảo Cam kết Làm việc Nhóm"
      badge="Mục #7b · Working Agreement"
      subtitle="Tạo nhanh bộ điều khoản lịch họp, tiêu chuẩn bàn giao, Git/review và cơ chế xử lý xung đột phù hợp cấu trúc nhóm."
      meta={draft?.meta}
      error={error}
      actions={
        <button type="button" className="ais-btn ais-btn--primary" disabled={disabled || loading} onClick={() => void handleDraft()}>
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">auto_awesome</span>
          {loading ? 'Đang soạn cam kết…' : draft ? 'Soạn lại' : 'AI Soạn mẫu cam kết'}
        </button>
      }
    >
      <input
        className="ais-input"
        value={prefs}
        disabled={disabled || loading}
        placeholder="Yêu cầu riêng của nhóm (tùy chọn, vd: họp tối thứ 4 & Chủ nhật, dùng Discord + GitHub PR)…"
        onChange={(e) => setPrefs(e.target.value)}
      />

      {draft && (
        <div className="space-y-2.5 text-xs">
          <p className="text-ink-soft">{draft.summary}</p>
          <ul className="space-y-1.5">
            {draft.sections.map((s, idx) => (
              <li key={idx} className="rounded-lg border border-hairline bg-canvas p-2.5">
                <p className="font-bold text-ink">{idx + 1}. {s.title}</p>
                <p className="mt-0.5 whitespace-pre-wrap text-ink-soft">{s.body}</p>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="ais-btn ais-btn--success"
            disabled={disabled}
            onClick={() => {
              onApplySections(draft.sections)
              setApplied(true)
            }}
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">done_all</span>
            {applied ? 'Đã điền vào biểu mẫu cam kết ✓' : `Áp dụng ${draft.sections.length} mục vào biểu mẫu`}
          </button>
        </div>
      )}
    </AiSuiteCardShell>
  )
}
