import { useEffect, useRef, useState } from 'react'

export interface MeetingVideoPreflightSelection {
  audioInputId: string
  videoInputId: string
  audioEnabled: boolean
  videoEnabled: boolean
}

type DeviceLists = { audio: MediaDeviceInfo[]; video: MediaDeviceInfo[] }
const emptyDevices: DeviceLists = { audio: [], video: [] }

function stopTracks(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop())
}

function mediaErrorMessage(reason: unknown) {
  const name = reason instanceof DOMException ? reason.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return 'Trình duyệt chưa cho phép dùng camera hoặc micrô. Hãy cấp quyền rồi thử lại.'
  if (name === 'NotFoundError' || name === 'OverconstrainedError')
    return 'Không tìm thấy thiết bị đã chọn. Bạn có thể thử chế độ chỉ âm thanh.'
  return 'Không thể mở thiết bị âm thanh hoặc hình ảnh trên trình duyệt này. Hãy thử lại hoặc chọn chế độ chỉ nghe.'
}

export function MeetingVideoPreflight({
  meetingTitle,
  joining = false,
  onBack,
  onConnectRequested,
}: {
  meetingTitle?: string
  joining?: boolean
  onBack: () => void
  onConnectRequested: (selection: MeetingVideoPreflightSelection) => void
}) {
  const [devices, setDevices] = useState<DeviceLists>(emptyDevices)
  const [selection, setSelection] = useState<MeetingVideoPreflightSelection>({
    audioInputId: '',
    videoInputId: '',
    audioEnabled: true,
    videoEnabled: true,
  })
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const requestRef = useRef(0)

  function clearPreview() {
    requestRef.current += 1
    stopTracks(streamRef.current)
    streamRef.current = null
    setStream(null)
  }

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream
  }, [stream])
  useEffect(() => () => clearPreview(), [])

  async function startPreview(next = selection) {
    const mediaDevices = typeof navigator === 'undefined' ? undefined : navigator.mediaDevices
    if (!mediaDevices?.getUserMedia || !mediaDevices.enumerateDevices) {
      setError('Trình duyệt này không hỗ trợ kiểm tra camera và micrô.')
      return
    }
    if (!next.audioEnabled && !next.videoEnabled) {
      setError('Hãy bật ít nhất micrô hoặc camera trước khi xem trước.')
      return
    }
    const request = requestRef.current + 1
    clearPreview()
    requestRef.current = request
    setLoading(true)
    setError('')
    try {
      const constraints: MediaStreamConstraints = {
        audio: next.audioEnabled ? (next.audioInputId ? { deviceId: { exact: next.audioInputId } } : true) : false,
        video: next.videoEnabled ? (next.videoInputId ? { deviceId: { exact: next.videoInputId } } : true) : false,
      }
      let nextStream: MediaStream
      try {
        nextStream = await mediaDevices.getUserMedia(constraints)
      } catch (reason) {
        // A camera-less device can still complete an audio-only preflight without pretending it has video.
        if (next.videoEnabled && reason instanceof DOMException && reason.name === 'NotFoundError' && next.audioEnabled) {
          nextStream = await mediaDevices.getUserMedia({ audio: constraints.audio, video: false })
          next = { ...next, videoEnabled: false }
        } else throw reason
      }
      const listed = await mediaDevices.enumerateDevices()
      if (request !== requestRef.current) {
        stopTracks(nextStream)
        return
      }
      const nextDevices = {
        audio: listed.filter((device) => device.kind === 'audioinput'),
        video: listed.filter((device) => device.kind === 'videoinput'),
      }
      const resolved = {
        ...next,
        audioInputId: next.audioInputId || nextDevices.audio[0]?.deviceId || '',
        videoInputId: next.videoInputId || nextDevices.video[0]?.deviceId || '',
      }
      setDevices(nextDevices)
      setSelection(resolved)
      streamRef.current = nextStream
      setStream(nextStream)
    } catch (reason) {
      if (request === requestRef.current) setError(mediaErrorMessage(reason))
    } finally {
      if (request === requestRef.current) setLoading(false)
    }
  }

  function updateSelection(change: Partial<MeetingVideoPreflightSelection>) {
    const next = { ...selection, ...change }
    setSelection(next)
    setError('')
    // Changing a setting alone must not request browser device permissions.
    if (streamRef.current) {
      if (!next.audioEnabled && !next.videoEnabled) clearPreview()
      else void startPreview(next)
    }
  }

  function back() {
    clearPreview()
    onBack()
  }

  const audioLabel = `Micrô: ${selection.audioEnabled ? 'Bật' : 'Tắt'}`
  const videoLabel = `Camera: ${selection.videoEnabled ? 'Bật' : 'Tắt'}`

  return (
    <section className="mtg-meet-lobby" aria-labelledby="video-preflight-title">
      {/* Left: Large 16:9 Google Meet camera preview stage */}
      <div className="mtg-meet-lobby__stage-col">
        <div className="mtg-meet-preview-stage">
          {stream && selection.videoEnabled ? (
            <video ref={videoRef} className="mtg-meet-preview-stage__video" muted playsInline autoPlay />
          ) : (
            <div className="mtg-meet-preview-stage__placeholder">
              {stream && <video ref={videoRef} className="sr-only" muted playsInline autoPlay />}
              <span className="mtg-meet-preview-stage__halo" aria-hidden="true">
                <span className="material-symbols-outlined">
                  {stream && !selection.videoEnabled ? 'mic' : selection.videoEnabled ? 'videocam' : 'videocam_off'}
                </span>
              </span>
              <strong>
                {stream && !selection.videoEnabled
                  ? 'Đang dùng chế độ chỉ âm thanh'
                  : selection.videoEnabled
                    ? 'Xem trước camera'
                    : 'Camera đang tắt'}
              </strong>
              <span>
                {loading
                  ? 'Đang mở thiết bị…'
                  : stream && !selection.videoEnabled
                    ? 'Micrô đã sẵn sàng. Bật lại camera bất cứ lúc nào.'
                    : 'Hình ảnh chỉ hiển thị sau khi bạn bật xem trước.'}
              </span>
            </div>
          )}

          {/* Floating Google Meet bottom-center circular media toggles */}
          <div className="mtg-meet-preview-stage__controls" aria-label="Tùy chọn thiết bị">
            <button
              type="button"
              className={`mtg-meet-circle-btn ${selection.audioEnabled ? 'is-on' : 'is-off'}`}
              aria-label={audioLabel}
              aria-pressed={selection.audioEnabled}
              title={audioLabel}
              onClick={() => updateSelection({ audioEnabled: !selection.audioEnabled })}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                {selection.audioEnabled ? 'mic' : 'mic_off'}
              </span>
            </button>
            <button
              type="button"
              className={`mtg-meet-circle-btn ${selection.videoEnabled ? 'is-on' : 'is-off'}`}
              aria-label={videoLabel}
              aria-pressed={selection.videoEnabled}
              title={videoLabel}
              onClick={() => updateSelection({ videoEnabled: !selection.videoEnabled })}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                {selection.videoEnabled ? 'videocam' : 'videocam_off'}
              </span>
            </button>
          </div>
        </div>

        {/* Compact device switcher & preview trigger bar */}
        <div className="mtg-meet-device-bar">
          {(devices.audio.length > 0 || devices.video.length > 0) && (
            <div className="mtg-meet-device-selects">
              <label className="mtg-meet-device-pill">
                <span className="material-symbols-outlined" aria-hidden="true">mic</span>
                <span className="sr-only">Micrô</span>
                <select
                  aria-label="Micrô"
                  value={selection.audioInputId}
                  disabled={loading || !selection.audioEnabled}
                  onChange={(event) => updateSelection({ audioInputId: event.target.value })}
                >
                  <option value="">Mặc định</option>
                  {devices.audio.map((device, index) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Micrô ${index + 1}`}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mtg-meet-device-pill">
                <span className="material-symbols-outlined" aria-hidden="true">videocam</span>
                <span className="sr-only">Camera</span>
                <select
                  aria-label="Camera"
                  value={selection.videoInputId}
                  disabled={loading || !selection.videoEnabled}
                  onChange={(event) => updateSelection({ videoInputId: event.target.value })}
                >
                  <option value="">Mặc định</option>
                  {devices.video.map((device, index) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${index + 1}`}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <button
            type="button"
            className="mtg-button mtg-button--secondary mtg-meet-preview-btn"
            disabled={loading || (!selection.audioEnabled && !selection.videoEnabled)}
            onClick={() => void startPreview()}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              {stream ? 'refresh' : 'sensors'}
            </span>
            {loading ? 'Đang kiểm tra…' : stream ? 'Kiểm tra lại thiết bị' : 'Bật xem trước'}
          </button>
        </div>
      </div>

      {/* Right: Centered Google Meet Join Card */}
      <div className="mtg-meet-lobby__join-col">
        <span className="mtg-meet-lobby__eyebrow">KIỂM TRA THIẾT BỊ</span>
        <h2 id="video-preflight-title">Sẵn sàng trước khi tham gia</h2>
        {meetingTitle && <p className="mtg-meet-lobby__meeting-name">{meetingTitle}</p>}

        {error && (
          <div className="mtg-notice mtg-notice--error mtg-notice--compact" role="alert">
            <p>{error}</p>
          </div>
        )}

        {stream ? (
          <p role="status" className="mtg-meet-lobby__status mtg-meet-lobby__status--ready">
            <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
            <span>Thiết bị đã sẵn sàng. Chọn tham gia để vào phòng họp.</span>
          </p>
        ) : (
          <p className="mtg-meet-lobby__status">
            Chưa có xem trước. Bạn có thể dùng chế độ chỉ âm thanh, hoặc tắt cả hai thiết bị để chỉ nghe.
          </p>
        )}

        <div className="mtg-meet-lobby__cta-stack">
          <button
            type="button"
            className="mtg-button mtg-meet-join-btn"
            disabled={joining || loading || (!stream && (selection.audioEnabled || selection.videoEnabled))}
            onClick={() => onConnectRequested(selection)}
          >
            <span className="material-symbols-outlined" aria-hidden="true">video_call</span>
            {joining ? 'Đang vào phòng…' : 'Tham gia cuộc họp'}
          </button>
          <button
            type="button"
            className="mtg-button mtg-button--secondary mtg-meet-back-btn"
            disabled={joining}
            onClick={back}
          >
            Quay lại chi tiết cuộc họp
          </button>
        </div>

        <p className="mtg-meet-lobby__privacy">
          Quyền dùng camera và micrô chỉ được yêu cầu khi bạn chọn xem trước. PMS chưa kết nối vào phòng họp ở bước này.
        </p>
      </div>
    </section>
  )
}
