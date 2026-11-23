import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { env } from '../../app/config/env'
import { displayLabel } from '../../components/ui/display-label'
import type { CreateMeeting, MeetingCandidate, MeetingDetail, MeetingRecurrence } from './meeting-types'
import { recurrenceLabels } from './meeting-types'
import type { MeetingDeliveryMode, MeetingVideoChannel } from './video/meeting-video.types'
import { formatMeetingTime, safeMeetingUrl, toMeetingInput, toMeetingUtc } from './meeting-utils'
import { MeetingError } from './meeting-ui'
import type { AssistantDraft } from '../ai/academic-ai-api'

const TITLE_SUGGESTIONS = [
  'Họp rà soát tiến độ tuần',
  'Trao đổi chuyên môn với GVHD',
  'Chuẩn bị hồ sơ mốc kiểm duyệt',
]

const DURATION_PRESETS = [30, 45, 60, 90] as const

const DELIVERY_MODE_OPTIONS: ReadonlyArray<{
  mode: MeetingDeliveryMode
  label: string
  hint: string
  icon: string
}> = [
  { mode: 'ONSITE', label: 'Tại chỗ', hint: 'Gặp trực tiếp tại phòng học hoặc cơ sở', icon: 'location_on' },
  { mode: 'REMOTE', label: 'Từ xa', hint: 'Họp trực tuyến qua video hoặc liên kết', icon: 'videocam' },
  { mode: 'HYBRID', label: 'Kết hợp', hint: 'Vừa gặp trực tiếp vừa mở kênh trực tuyến', icon: 'hub' },
]

const VIDEO_CHANNEL_OPTIONS: ReadonlyArray<{
  channel: Exclude<MeetingVideoChannel, 'NONE'>
  label: string
  hint: string
  icon: string
}> = [
  { channel: 'IN_APP_VIDEO', label: 'Video trong PMS', hint: 'Phòng họp tích hợp, hỗ trợ phụ đề & ghi chú AI', icon: 'video_camera_front' },
  { channel: 'EXTERNAL_LINK', label: 'Liên kết ngoài', hint: 'Google Meet, Zoom, Microsoft Teams…', icon: 'link' },
]

function parseVietnamLocalEpoch(value: string): number | null {
  if (!value) return null
  const ms = Date.parse(`${value}:00+07:00`)
  return Number.isNaN(ms) ? null : ms
}

function addMinutesVietnamInput(startAt: string, minutes: number): string {
  const startMs = parseVietnamLocalEpoch(startAt)
  if (startMs === null) return ''
  return toMeetingInput(new Date(startMs + minutes * 60_000).toISOString())
}

function computeDurationMinutes(startAt: string, endAt: string): number | null {
  const startMs = parseVietnamLocalEpoch(startAt)
  const endMs = parseVietnamLocalEpoch(endAt)
  if (startMs === null || endMs === null || endMs <= startMs) return null
  return Math.round((endMs - startMs) / 60_000)
}

function nextSlotInput(kind: 'plus1h' | 'tomorrowMorning' | 'tomorrowAfternoon'): { startAt: string; endAt: string } {
  const nowMs = Date.now()
  if (kind === 'plus1h') {
    const rounded = Math.ceil((nowMs + 60 * 60_000) / (15 * 60_000)) * (15 * 60_000)
    const startAt = toMeetingInput(new Date(rounded).toISOString())
    return { startAt, endAt: addMinutesVietnamInput(startAt, 60) }
  }
  const tomorrowDate = toMeetingInput(new Date(nowMs + 24 * 60 * 60_000).toISOString()).slice(0, 10)
  const hour = kind === 'tomorrowMorning' ? '09:00' : '14:00'
  const startAt = `${tomorrowDate}T${hour}`
  return { startAt, endAt: addMinutesVietnamInput(startAt, 60) }
}

function formatDurationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} phút`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h} giờ` : `${h} giờ ${m} phút`
}

function initialsOf(name: string): string {
  const cleaned = name.replace(/\s*\([^)]*\)\s*/g, ' ').trim()
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function MeetingScheduleForm({
  meeting,
  initialDraft,
  busy,
  locked = false,
  candidates = [],
  candidatesLoading = false,
  candidatesError = '',
  candidatesNotice = '',
  onRetryCandidates,
  cancelTo,
  currentUserId,
  onSave,
  onDirty,
  onCancel,
}: {
  initialDraft?: Pick<AssistantDraft, 'title' | 'description' | 'meeting'>
  meeting?: MeetingDetail
  busy: boolean
  locked?: boolean
  candidates?: MeetingCandidate[]
  candidatesLoading?: boolean
  candidatesError?: string
  candidatesNotice?: string
  onRetryCandidates?: () => void
  cancelTo?: string
  currentUserId?: number
  onSave: (body: CreateMeeting) => Promise<void>
  onDirty: () => void
  onCancel?: () => void
}) {
  // Do not infer a legacy meeting's delivery state from location or onlineUrl. It remains a
  // legacy edit until Backend returns the frozen fields, even when the rollout is enabled.
  const legacyMeeting = Boolean(meeting && (!meeting.meetingDeliveryMode || !meeting.videoChannel))
  const showVideoControls = env.videoMeetingEnabled && !legacyMeeting
  const isCreateLayout = !meeting

  const [values, setValues] = useState(() => ({
    title: meeting?.title ?? initialDraft?.title ?? '',
    agenda: meeting?.agenda ?? initialDraft?.description ?? '',
    startAt: toMeetingInput(meeting?.startAt ?? initialDraft?.meeting?.startAt ?? null),
    endAt: toMeetingInput(meeting?.endAt ?? initialDraft?.meeting?.endAt ?? null),
    location: meeting?.location ?? initialDraft?.meeting?.location ?? '',
    onlineUrl: meeting?.onlineUrl ?? initialDraft?.meeting?.onlineUrl ?? '',
    meetingDeliveryMode: meeting?.meetingDeliveryMode ?? initialDraft?.meeting?.meetingDeliveryMode ?? ('ONSITE' as MeetingDeliveryMode),
    videoChannel:
      meeting?.videoChannel ??
      initialDraft?.meeting?.videoChannel ??
      ((initialDraft?.meeting?.meetingDeliveryMode === 'REMOTE' || initialDraft?.meeting?.meetingDeliveryMode === 'HYBRID'
        ? 'EXTERNAL_LINK'
        : 'NONE') as MeetingVideoChannel),
  }))

  // Derive the initial selection from authorized candidates, even when they load after the form.
  const [participantChoices, setParticipantChoices] = useState<Record<number, boolean>>({})
  const participants = candidates
    .filter((candidate) => participantChoices[candidate.userId] ?? initialDraft?.meeting?.inviteAll === true)
    .map((candidate) => candidate.userId)
  const [recurrence, setRecurrence] = useState<MeetingRecurrence>('NONE')
  const [occurrenceCount, setOccurrenceCount] = useState('1')
  const seriesEnabled = env.meetingCollaborationEnabled && !meeting
  const [error, setError] = useState('')
  const [earliestStart] = useState(() => toMeetingInput(new Date().toISOString()))

  function update(key: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [key]: value }))
    setError('')
    onDirty()
  }

  function updateDeliveryMode(meetingDeliveryMode: MeetingDeliveryMode) {
    setValues((current) => ({
      ...current,
      meetingDeliveryMode,
      videoChannel:
        meetingDeliveryMode === 'ONSITE'
          ? 'NONE'
          : current.videoChannel === 'NONE'
            ? 'EXTERNAL_LINK'
            : current.videoChannel,
    }))
    setError('')
    onDirty()
  }

  function updateVideoChannel(videoChannel: MeetingVideoChannel) {
    setValues((current) => ({ ...current, videoChannel }))
    setError('')
    onDirty()
  }

  function applyQuickSlot(kind: 'plus1h' | 'tomorrowMorning' | 'tomorrowAfternoon') {
    const { startAt, endAt } = nextSlotInput(kind)
    setValues((current) => ({ ...current, startAt, endAt }))
    setError('')
    onDirty()
  }

  function applyDuration(minutes: number) {
    const nextEnd = addMinutesVietnamInput(values.startAt, minutes)
    if (!nextEnd) return
    setValues((current) => ({ ...current, endAt: nextEnd }))
    setError('')
    onDirty()
  }

  const selectableCandidates = candidates.filter((candidate) => candidate.userId !== currentUserId)
  const selectedInviteeIds = participants.filter((id) => id !== currentUserId)
  const allSelectableChosen =
    selectableCandidates.length > 0 && selectableCandidates.every((candidate) => selectedInviteeIds.includes(candidate.userId))
  const totalSelectedCount = selectedInviteeIds.length + (candidates.some((c) => c.userId === currentUserId) ? 1 : 0)

  function toggleSelectAllParticipants() {
    const nextState = !allSelectableChosen
    setParticipantChoices((current) => {
      const updated = { ...current }
      for (const candidate of selectableCandidates) {
        updated[candidate.userId] = nextState
      }
      return updated
    })
    onDirty()
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (busy || locked) return
    if (!values.title.trim() || values.title.trim().length > 255) {
      setError('Nhập tiêu đề từ 1 đến 255 ký tự.')
      return
    }
    if (!values.startAt || Number.isNaN(Date.parse(`${values.startAt}+07:00`))) {
      setError('Chọn thời gian bắt đầu hợp lệ.')
      return
    }
    if (!meeting && Date.parse(`${values.startAt}+07:00`) <= Date.now()) {
      setError('Cuộc họp mới phải bắt đầu trong tương lai.')
      return
    }
    if (values.endAt && (Number.isNaN(Date.parse(`${values.endAt}+07:00`)) || values.endAt <= values.startAt)) {
      setError('Giờ kết thúc phải sau giờ bắt đầu.')
      return
    }
    let location = values.location.trim() || null
    let onlineUrl = values.onlineUrl.trim() || null
    if (showVideoControls) {
      const needsLocation = values.meetingDeliveryMode === 'ONSITE' || values.meetingDeliveryMode === 'HYBRID'
      const usesExternalLink = values.videoChannel === 'EXTERNAL_LINK'
      if (needsLocation && !location) {
        setError('Nhập địa điểm cho hình thức tham gia đã chọn.')
        return
      }
      if (usesExternalLink && !onlineUrl) {
        setError('Nhập liên kết họp trực tuyến cho kênh đã chọn.')
        return
      }
      // The selected delivery fields are the contract. Hidden legacy values must not leak into
      // an in-app room or an onsite schedule, and no room/token is created during scheduling.
      if (!needsLocation) location = null
      if (!usesExternalLink) onlineUrl = null
    }
    if (onlineUrl && !safeMeetingUrl(onlineUrl)) {
      setError('Liên kết họp phải là địa chỉ http:// hoặc https:// hợp lệ, không chứa tài khoản hoặc mật khẩu.')
      return
    }
    let series: { recurrence: MeetingRecurrence; occurrenceCount: number } | undefined
    if (seriesEnabled) {
      const count = Number(occurrenceCount)
      if (!Number.isInteger(count) || count < 1 || count > 12) {
        setError('Số lần lặp phải từ 1 đến 12.')
        return
      }
      if (recurrence === 'NONE' && count !== 1) {
        setError('Không lặp lại chỉ áp dụng cho 1 lần họp.')
        return
      }
      series = { recurrence, occurrenceCount: count }
    }
    const delivery = showVideoControls ? { meetingDeliveryMode: values.meetingDeliveryMode, videoChannel: values.videoChannel } : {}
    await onSave({
      title: values.title.trim(),
      agenda: values.agenda.trim() || null,
      startAt: toMeetingUtc(values.startAt),
      endAt: values.endAt ? toMeetingUtc(values.endAt) : null,
      location,
      onlineUrl,
      participantUserIds: selectedInviteeIds,
      ...delivery,
      ...series,
    })
  }

  const needsLocationField = showVideoControls
    ? values.meetingDeliveryMode === 'ONSITE' || values.meetingDeliveryMode === 'HYBRID'
    : true
  const needsUrlField = showVideoControls ? values.videoChannel === 'EXTERNAL_LINK' : true
  const showDualVenueFields = needsLocationField && needsUrlField
  const durationMinutes = computeDurationMinutes(values.startAt, values.endAt)
  const hasValidStart = parseVietnamLocalEpoch(values.startAt) !== null
  const formattedStartSummary = hasValidStart ? formatMeetingTime(toMeetingUtc(values.startAt)) : 'Chưa chọn thời gian'
  const deliverySummary = showVideoControls
    ? values.meetingDeliveryMode === 'ONSITE'
      ? 'Tại chỗ'
      : `${DELIVERY_MODE_OPTIONS.find((item) => item.mode === values.meetingDeliveryMode)?.label ?? ''} · ${
          values.videoChannel === 'IN_APP_VIDEO' ? 'Video trong PMS' : 'Liên kết ngoài'
        }`
    : values.location.trim() && values.onlineUrl.trim()
      ? 'Tại chỗ & Trực tuyến'
      : values.onlineUrl.trim()
        ? 'Trực tuyến'
        : 'Tại chỗ'

  const submitLabel = locked
    ? 'Cần kiểm tra lại trạng thái'
    : busy
      ? 'Đang lưu…'
      : meeting
        ? 'Lưu lịch họp'
        : 'Tạo cuộc họp'

  return (
    <form className={`mtg-form ${isCreateLayout ? 'mtg-form--create' : 'mtg-form--edit'}`} onSubmit={(event) => void save(event)}>
      <fieldset className="mtg-schedule-fieldset" disabled={busy || locked}>
        <div className={isCreateLayout ? 'mtg-schedule-layout' : 'mtg-schedule-layout mtg-schedule-layout--compact'}>
          {/* Left column: Main scheduling steps */}
          <div className="mtg-schedule-main">
            {/* Step 1: Information & Time */}
            <section className="mtg-schedule-card">
              <div className="mtg-schedule-card__head">
                <div className="mtg-schedule-card__title-group">
                  <span className="mtg-schedule-card__icon" aria-hidden="true">
                    <span className="material-symbols-outlined">calendar_month</span>
                  </span>
                  <div>
                    <h2 id="mtg-step-info">Thông tin & thời gian</h2>
                    <p className="mtg-schedule-card__sub">Đặt tên rõ ràng và chọn khung giờ thuận tiện cho cả nhóm.</p>
                  </div>
                </div>
                <span className="mtg-tz-pill">UTC+7</span>
              </div>

              <div className="mtg-schedule-card__body">
                <div className="mtg-field-block">
                  <label>
                    Tiêu đề cuộc họp
                    <input
                      required
                      maxLength={255}
                      value={values.title}
                      onChange={(event) => update('title', event.target.value)}
                      placeholder="Ví dụ: Rà soát tiến độ và kế hoạch tuần"
                    />
                  </label>
                  {isCreateLayout && !values.title.trim() && (
                    <div className="mtg-quick-row" role="group" aria-label="Mẫu gợi ý nhanh">
                      <span className="mtg-quick-row__label">Gợi ý nhanh:</span>
                      {TITLE_SUGGESTIONS.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          className="mtg-quick-chip"
                          onClick={() => update('title', suggestion)}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {isCreateLayout && (
                  <div className="mtg-quick-row" role="group" aria-label="Khung giờ gợi ý">
                    <span className="mtg-quick-row__label">Chọn nhanh:</span>
                    <button type="button" className="mtg-quick-chip" onClick={() => applyQuickSlot('plus1h')}>
                      Sau 1 giờ
                    </button>
                    <button type="button" className="mtg-quick-chip" onClick={() => applyQuickSlot('tomorrowMorning')}>
                      Sáng mai · 09:00
                    </button>
                    <button type="button" className="mtg-quick-chip" onClick={() => applyQuickSlot('tomorrowAfternoon')}>
                      Chiều mai · 14:00
                    </button>
                  </div>
                )}

                <div className="mtg-field-grid">
                  <label>
                    Bắt đầu (giờ Việt Nam)
                    <input
                      type="datetime-local"
                      required
                      min={meeting ? undefined : earliestStart}
                      value={values.startAt}
                      onChange={(event) => update('startAt', event.target.value)}
                    />
                  </label>
                  <label>
                    Kết thúc (không bắt buộc)
                    <input
                      type="datetime-local"
                      min={values.startAt || undefined}
                      value={values.endAt}
                      onChange={(event) => update('endAt', event.target.value)}
                    />
                  </label>
                </div>

                <div className="mtg-quick-row" role="group" aria-label="Mốc thời lượng nhanh">
                  <span className="mtg-quick-row__label">Thời lượng:</span>
                  {DURATION_PRESETS.map((minutes) => (
                    <button
                      key={minutes}
                      type="button"
                      disabled={!hasValidStart}
                      className={`mtg-quick-chip ${durationMinutes === minutes ? 'is-active' : ''}`}
                      onClick={() => applyDuration(minutes)}
                    >
                      {minutes} phút
                    </button>
                  ))}
                  {values.endAt && (
                    <button
                      type="button"
                      className="mtg-quick-chip mtg-quick-chip--clear"
                      onClick={() => update('endAt', '')}
                    >
                      Bỏ giờ kết thúc
                    </button>
                  )}
                </div>

                {seriesEnabled && (
                  <div className="mtg-recurrence-box">
                    <div className="mtg-field-grid">
                      <label>
                        Tần suất
                        <select
                          value={recurrence}
                          onChange={(event) => {
                            const next = event.target.value as MeetingRecurrence
                            setRecurrence(next)
                            if (next === 'NONE') setOccurrenceCount('1')
                            else if (occurrenceCount === '1') setOccurrenceCount('4')
                            setError('')
                            onDirty()
                          }}
                        >
                          {(Object.entries(recurrenceLabels) as Array<[MeetingRecurrence, string]>).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                      {recurrence !== 'NONE' && (
                        <label>
                          Số lần họp
                          <input
                            type="number"
                            min={1}
                            max={12}
                            value={occurrenceCount}
                            onChange={(event) => {
                              setOccurrenceCount(event.target.value)
                              setError('')
                              onDirty()
                            }}
                          />
                        </label>
                      )}
                    </div>
                    {recurrence !== 'NONE' && (
                      <p className="mtg-info-inline">
                        <span className="material-symbols-outlined" aria-hidden="true">repeat</span>
                        <span>
                          Hệ thống sẽ tạo {occurrenceCount || '…'} cuộc họp cách nhau {recurrence === 'WEEKLY' ? '7 ngày' : '14 ngày'}, bắt đầu từ thời gian đã chọn.
                        </span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Step 2: Delivery Mode & Venue */}
            <section className="mtg-schedule-card">
              <div className="mtg-schedule-card__head">
                <div className="mtg-schedule-card__title-group">
                  <span className="mtg-schedule-card__icon" aria-hidden="true">
                    <span className="material-symbols-outlined">
                      {values.meetingDeliveryMode === 'ONSITE' ? 'location_on' : 'videocam'}
                    </span>
                  </span>
                  <div>
                    <h2 id="mtg-step-venue">Hình thức & địa điểm</h2>
                    <p className="mtg-schedule-card__sub">Chọn cách tham gia phù hợp để hiển thị đúng thông tin cần nhập.</p>
                  </div>
                </div>
              </div>

              <div className="mtg-schedule-card__body">
                {showVideoControls ? (
                  <>
                    <fieldset className="mtg-segment-group">
                      <legend>Hình thức tham gia</legend>
                      <div className="mtg-choice-cards mtg-choice-cards--3">
                        {DELIVERY_MODE_OPTIONS.map(({ mode, label, hint, icon }) => {
                          const active = values.meetingDeliveryMode === mode
                          return (
                            <label key={mode} className={`mtg-choice-card ${active ? 'is-selected' : ''}`}>
                              <input
                                type="radio"
                                name="meetingDeliveryMode"
                                aria-label={label}
                                checked={active}
                                onChange={() => updateDeliveryMode(mode)}
                              />
                              <span className="mtg-choice-card__icon" aria-hidden="true">
                                <span className="material-symbols-outlined">{icon}</span>
                              </span>
                              <span className="mtg-choice-card__copy">
                                <span className="mtg-choice-card__title">{label}</span>
                                <span className="mtg-choice-card__hint">{hint}</span>
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    </fieldset>

                    {values.meetingDeliveryMode !== 'ONSITE' && (
                      <fieldset className="mtg-segment-group">
                        <legend>Kênh trực tuyến</legend>
                        <div className="mtg-choice-cards mtg-choice-cards--2">
                          {VIDEO_CHANNEL_OPTIONS.map(({ channel, label, hint, icon }) => {
                            const active = values.videoChannel === channel
                            return (
                              <label key={channel} className={`mtg-choice-card ${active ? 'is-selected' : ''}`}>
                                <input
                                  type="radio"
                                  name="videoChannel"
                                  aria-label={label}
                                  checked={active}
                                  onChange={() => updateVideoChannel(channel)}
                                />
                                <span className="mtg-choice-card__icon" aria-hidden="true">
                                  <span className="material-symbols-outlined">{icon}</span>
                                </span>
                                <span className="mtg-choice-card__copy">
                                  <span className="mtg-choice-card__title">{label}</span>
                                  <span className="mtg-choice-card__hint">{hint}</span>
                                </span>
                              </label>
                            )
                          })}
                        </div>
                        {values.videoChannel === 'IN_APP_VIDEO' && (
                          <p className="mtg-info-inline">
                            <span className="material-symbols-outlined" aria-hidden="true">info</span>
                            <span>
                              Phòng họp sẽ được tạo khi người tổ chức bắt đầu phiên video. Lưu lịch ở bước này chưa mở kết nối hoặc cấp quyền truy cập.
                            </span>
                          </p>
                        )}
                      </fieldset>
                    )}

                    {(needsLocationField || needsUrlField) && (
                      <div className={showDualVenueFields ? 'mtg-field-grid' : 'mtg-field-single'}>
                        {needsLocationField && (
                          <label>
                            Địa điểm
                            <input
                              required
                              value={values.location}
                              onChange={(event) => update('location', event.target.value)}
                              placeholder="Ví dụ: Phòng AL-204, Thư viện hoặc quán cà phê gần trường"
                            />
                          </label>
                        )}
                        {needsUrlField && (
                          <label>
                            Liên kết họp trực tuyến
                            <input
                              required
                              type="url"
                              value={values.onlineUrl}
                              onChange={(event) => update('onlineUrl', event.target.value)}
                              placeholder="https://meet.google.com/..."
                            />
                          </label>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {legacyMeeting && env.videoMeetingEnabled && (
                      <p className="mtg-notice">
                        Lịch họp này được tạo trước khi tính năng phòng họp trực tuyến được bật. Bạn vẫn có thể chỉnh sửa địa điểm và liên kết hiện có.
                      </p>
                    )}
                    <div className="mtg-field-grid">
                      <label>
                        Địa điểm
                        <input
                          value={values.location}
                          onChange={(event) => update('location', event.target.value)}
                          placeholder="Phòng họp hoặc địa điểm gặp mặt"
                        />
                      </label>
                      <label>
                        Liên kết họp trực tuyến
                        <input
                          type="url"
                          value={values.onlineUrl}
                          onChange={(event) => update('onlineUrl', event.target.value)}
                          placeholder="https://…"
                        />
                      </label>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* Step 3: Agenda */}
            <section className="mtg-schedule-card">
              <div className="mtg-schedule-card__head">
                <div className="mtg-schedule-card__title-group">
                  <span className="mtg-schedule-card__icon" aria-hidden="true">
                    <span className="material-symbols-outlined">notes</span>
                  </span>
                  <div>
                    <h2 id="mtg-step-agenda">Nội dung dự kiến</h2>
                    <p className="mtg-schedule-card__sub">Liệt kê các đầu mục cần trao đổi để mọi người chuẩn bị trước.</p>
                  </div>
                </div>
                <span className="mtg-optional-pill">Không bắt buộc</span>
              </div>

              <div className="mtg-schedule-card__body">
                <label>
                  <span className="sr-only">Nội dung dự kiến</span>
                  <textarea
                    rows={4}
                    value={values.agenda}
                    onChange={(event) => update('agenda', event.target.value)}
                    placeholder="- Cập nhật tiến độ công việc tuần qua&#10;- Các vướng mắc cần thống nhất hướng xử lý&#10;- Phân công đầu việc cho tuần tiếp theo"
                  />
                </label>
              </div>
            </section>
          </div>

          {/* Right column: Participants + Live Summary & Submit (in create mode) */}
          {isCreateLayout ? (
            <aside className="mtg-schedule-aside">
              {/* Participants Card */}
              <section className="mtg-schedule-card">
                <div className="mtg-schedule-card__head">
                  <div className="mtg-schedule-card__title-group">
                    <span className="mtg-schedule-card__icon" aria-hidden="true">
                      <span className="material-symbols-outlined">group_add</span>
                    </span>
                    <div>
                      <h2 id="mtg-step-participants">Mời người tham gia</h2>
                      <p className="mtg-schedule-card__sub">
                        {candidates.length > 0 ? `Đã chọn ${totalSelectedCount}/${candidates.length} người` : 'Người tạo tự động tham gia'}
                      </p>
                    </div>
                  </div>
                  {selectableCandidates.length > 0 && (
                    <button
                      type="button"
                      className="mtg-text-button mtg-select-all-btn"
                      onClick={toggleSelectAllParticipants}
                    >
                      {allSelectableChosen ? 'Bỏ chọn' : 'Chọn tất cả'}
                    </button>
                  )}
                </div>

                <div className="mtg-schedule-card__body">
                  {candidatesLoading && (
                    <p role="status" className="mtg-help">
                      Đang tải thành viên và GVHD…
                    </p>
                  )}
                  {candidatesError && (
                    <MeetingError message={`Chưa tải được danh sách mời. ${candidatesError}`} retry={onRetryCandidates} />
                  )}
                  {candidatesNotice && <p className="mtg-notice mtg-notice--compact">{candidatesNotice}</p>}
                  {!candidatesLoading && !candidatesError && candidates.length === 0 && (
                    <p className="mtg-help">Người tạo được tự động thêm vào cuộc họp. Bạn có thể mời thêm sau khi lưu lịch.</p>
                  )}
                  {candidates.length > 0 && (
                    <fieldset className="mtg-participant-picker">
                      <legend className="sr-only">Mời người tham gia</legend>
                      <div className="mtg-participant-cards">
                        {candidates.map((candidate) => {
                          const isSelf = candidate.userId === currentUserId
                          const checked = isSelf || participants.includes(candidate.userId)
                          return (
                            <label
                              className={`mtg-participant-card ${checked ? 'is-selected' : ''} ${isSelf ? 'is-self' : ''}`}
                              key={candidate.userId}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={isSelf}
                                onChange={(event) => {
                                  setParticipantChoices((current) => ({ ...current, [candidate.userId]: event.target.checked }))
                                  onDirty()
                                }}
                              />
                              <span className="mtg-participant-card__avatar" aria-hidden="true">
                                {initialsOf(candidate.fullName)}
                              </span>
                              <span className="mtg-participant-card__info">
                                <strong>{candidate.fullName}</strong>
                                <small>
                                  {displayLabel(candidate.role)}
                                  {isSelf ? ' · Bạn' : ''}
                                </small>
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    </fieldset>
                  )}
                </div>
              </section>

              {/* Live Summary + Primary CTA Card */}
              <section className="mtg-schedule-card mtg-summary-card" aria-label="Tóm tắt lịch họp">
                <div className="mtg-summary-card__head">
                  <h3>Tóm tắt lịch họp</h3>
                  <span className="mtg-summary-badge">{deliverySummary}</span>
                </div>
                <dl className="mtg-summary-list">
                  <div>
                    <dt>Tiêu đề</dt>
                    <dd>{values.title.trim() || 'Chưa nhập tiêu đề'}</dd>
                  </div>
                  <div>
                    <dt>Bắt đầu</dt>
                    <dd>{formattedStartSummary}</dd>
                  </div>
                  {durationMinutes !== null && (
                    <div>
                      <dt>Thời lượng</dt>
                      <dd>{formatDurationLabel(durationMinutes)}</dd>
                    </div>
                  )}
                  {needsLocationField && values.location.trim() && (
                    <div>
                      <dt>Địa điểm</dt>
                      <dd>{values.location.trim()}</dd>
                    </div>
                  )}
                  {seriesEnabled && recurrence !== 'NONE' && (
                    <div>
                      <dt>Lặp lại</dt>
                      <dd>
                        {recurrenceLabels[recurrence]} · {occurrenceCount || '1'} lần
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt>Người tham gia</dt>
                    <dd>{totalSelectedCount > 0 ? `${totalSelectedCount} thành viên` : 'Chỉ người tạo'}</dd>
                  </div>
                </dl>

                {error && (
                  <p role="alert" className="mtg-validation mtg-validation--box">
                    {error}
                  </p>
                )}

                <div className="mtg-summary-actions">
                  <button className="mtg-button mtg-button--full" type="submit">
                    <span className="material-symbols-outlined" aria-hidden="true">
                      event_available
                    </span>
                    {submitLabel}
                  </button>
                  {cancelTo && (
                    <Link className="mtg-button mtg-button--secondary mtg-button--full" to={cancelTo}>
                      Hủy bỏ
                    </Link>
                  )}
                </div>
              </section>
            </aside>
          ) : (
            <div className="mtg-edit-footer">
              {error && (
                <p role="alert" className="mtg-validation mtg-validation--box">
                  {error}
                </p>
              )}
              <div className="mtg-form-actions">
                {onCancel && (
                  <button type="button" className="mtg-button mtg-button--secondary" onClick={onCancel}>
                    Đóng chỉnh sửa
                  </button>
                )}
                <button className="mtg-button" type="submit">
                  {submitLabel}
                </button>
              </div>
            </div>
          )}
        </div>
      </fieldset>
    </form>
  )
}
