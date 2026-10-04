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
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Trình duyệt chưa cho phép dùng camera hoặc microphone. Hãy cấp quyền rồi thử lại.'
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'Không tìm thấy thiết bị đã chọn. Bạn có thể thử chế độ chỉ âm thanh.'
  return 'Không thể khởi tạo thiết bị media trên trình duyệt này. Hãy thử lại hoặc chọn chế độ chỉ âm thanh.'
}

export function MeetingVideoPreflight({ onBack, onConnectRequested }: {
  onBack: () => void
  onConnectRequested: (selection: MeetingVideoPreflightSelection) => void
}) {
  const [devices, setDevices] = useState<DeviceLists>(emptyDevices)
  const [selection, setSelection] = useState<MeetingVideoPreflightSelection>({ audioInputId: '', videoInputId: '', audioEnabled: true, videoEnabled: true })
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
      setError('Trình duyệt này không hỗ trợ kiểm tra camera và microphone.')
      return
    }
    if (!next.audioEnabled && !next.videoEnabled) {
      setError('Hãy bật ít nhất microphone hoặc camera trước khi xem trước.')
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
      if (request !== requestRef.current) { stopTracks(nextStream); return }
      const nextDevices = { audio: listed.filter((device) => device.kind === 'audioinput'), video: listed.filter((device) => device.kind === 'videoinput') }
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
    // This handler is itself an explicit user interaction; replace the local preview safely.
    void startPreview(next)
  }

  function back() {
    clearPreview()
    onBack()
  }

  return <section className="mtg-panel mtg-padded mtg-video-preflight" aria-labelledby="video-preflight-title">
    <p className="mtg-eyebrow">KIỂM TRA THIẾT BỊ</p>
    <h2 id="video-preflight-title">Sẵn sàng trước khi tham gia</h2>
    <p className="mtg-help">Camera và microphone chỉ được yêu cầu sau khi bạn chọn xem trước. AI-PMS chưa kết nối vào phòng họp ở bước này.</p>
    {error && <div className="mtg-notice mtg-notice--error" role="alert"><p>{error}</p></div>}
    <div className="mtg-video-toggle-row" aria-label="Tùy chọn thiết bị">
      <button type="button" className="mtg-button mtg-button--secondary" aria-pressed={selection.audioEnabled} onClick={() => updateSelection({ audioEnabled: !selection.audioEnabled })}>Microphone: {selection.audioEnabled ? 'Bật' : 'Tắt'}</button>
      <button type="button" className="mtg-button mtg-button--secondary" aria-pressed={selection.videoEnabled} onClick={() => updateSelection({ videoEnabled: !selection.videoEnabled })}>Camera: {selection.videoEnabled ? 'Bật' : 'Tắt'}</button>
    </div>
    {(devices.audio.length > 0 || devices.video.length > 0) && <div className="mtg-form-grid mtg-video-device-grid">
      <label>Microphone<select value={selection.audioInputId} disabled={loading || !selection.audioEnabled} onChange={(event) => updateSelection({ audioInputId: event.target.value })}><option value="">Mặc định</option>{devices.audio.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Microphone ${index + 1}`}</option>)}</select></label>
      <label>Camera<select value={selection.videoInputId} disabled={loading || !selection.videoEnabled} onChange={(event) => updateSelection({ videoInputId: event.target.value })}><option value="">Mặc định</option>{devices.video.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${index + 1}`}</option>)}</select></label>
    </div>}
    {stream ? <div className="mtg-video-preview"><video ref={videoRef} muted playsInline autoPlay /><p role="status">Thiết bị đã sẵn sàng. Bạn có thể tham gia cuộc họp khi đã sẵn sàng.</p></div> : <p className="mtg-help">Chưa có xem trước. Bạn có thể dùng chế độ chỉ âm thanh nếu không có camera.</p>}
    <div className="mtg-actions mtg-video-actions">
      <button type="button" className="mtg-button mtg-button--secondary" disabled={loading} onClick={() => void startPreview()}>{loading ? 'Đang kiểm tra…' : stream ? 'Kiểm tra lại thiết bị' : 'Bật xem trước'}</button>
      <button type="button" className="mtg-button mtg-button--secondary" onClick={back}>Quay lại chi tiết cuộc họp</button>
      <button type="button" className="mtg-button" disabled={!stream || loading} onClick={() => onConnectRequested(selection)}>Tham gia cuộc họp</button>
    </div>
  </section>
}
