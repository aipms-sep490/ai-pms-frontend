import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useExecutionAccess } from '../../execution/context/ExecutionAccessContext'
import { env } from '../../../app/config/env'
import * as meetingsApi from '../../../services/api/meetings.api'
import type { MeetingDetail } from '../meeting-types'
import { MeetingError, MeetingLoading, MeetingShell } from '../meeting-ui'
import { canManageMeeting, meetingError } from '../meeting-utils'
import { MeetingNotesForm } from '../MeetingNotesForm'
import { MeetingGovernancePanel } from '../MeetingGovernancePanel'
import { meetingVideoError, meetingVideoErrorCode } from './meeting-video-errors'
import { endMeetingVideo, joinMeetingVideo } from './meeting-video-api'
import { MeetingVideoPreflight, type MeetingVideoPreflightSelection } from './MeetingVideoPreflight'
import type { MeetingVideoJoinResponse } from './meeting-video.types'
import { useMeetingVideoAccess } from './useMeetingVideoAccess'

const LiveKitRoomAdapter = lazy(() => import('./providers/livekit/LiveKitRoomAdapter').then((module) => ({ default: module.LiveKitRoomAdapter })))

export function MeetingVideoRoomPage() {
  const { meetingId } = useParams()
  const access = useExecutionAccess()
  return <MeetingVideoRoomView key={`${access.project.id}:${meetingId}`} id={Number(meetingId)} />
}

function MeetingVideoRoomView({ id }: { id: number }) {
  const access = useExecutionAccess()
  const { project, routeBase } = access
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const backTo = `${routeBase}/meetings/${id}`

  useEffect(() => {
    if (!Number.isSafeInteger(id) || id < 1) { setError('Đường dẫn cuộc họp không hợp lệ.'); setLoading(false); return }
    const controller = new AbortController()
    setLoading(true); setError('')
    meetingsApi.getMeeting(id, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        if (result.projectId !== project.id) { setError('Cuộc họp không thuộc đồ án đang mở.'); return }
        if (!env.videoMeetingEnabled) { setError('Phòng họp trực tuyến trong AI-PMS hiện chưa được bật.'); return }
        if (result.videoChannel !== 'IN_APP_VIDEO') { setError('Cuộc họp này không sử dụng phòng họp trực tuyến trong AI-PMS.'); return }
        setMeeting(result)
      })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(meetingError(reason)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [id, project.id, revision])

  return <MeetingShell title="Phòng họp trực tuyến" description="Kiểm tra thiết bị trước khi tham gia và trao đổi trực tiếp cùng nhóm." projectTitle={project.title} backTo={backTo} action={<Link className="mtg-button mtg-button--secondary" to={backTo}>Chi tiết cuộc họp</Link>}>
    {loading ? <MeetingLoading /> : error ? <MeetingError message={error} retry={() => setRevision((value) => value + 1)} /> : meeting && <MeetingVideoRoomAccess meeting={meeting} backTo={backTo} />}
  </MeetingShell>
}

function MeetingVideoRoomAccess({ meeting, backTo }: { meeting: MeetingDetail; backTo: string }) {
  const navigate = useNavigate()
  const access = useExecutionAccess()
  const { state, refresh } = useMeetingVideoAccess(meeting)
  const [credential, setCredential] = useState<MeetingVideoJoinResponse | null>(null)
  const [preferences, setPreferences] = useState<MeetingVideoPreflightSelection | null>(null)
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')
  const [ending, setEnding] = useState(false)
  const [endError, setEndError] = useState('')
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [governanceOpen, setGovernanceOpen] = useState(false)
  const joinLock = useRef(false)
  const endLock = useRef(false)
  const endDialogRef = useRef<HTMLDivElement>(null)
  const denialMessages = state.status === 'ready' ? state.resource.denialReasons.map(meetingVideoErrorCode) : []
  useEffect(() => { if (confirmEnd) endDialogRef.current?.focus() }, [confirmEnd])
  async function requestConnect(selection: MeetingVideoPreflightSelection) {
    if (joinLock.current || state.status !== 'ready' || !state.resource.capabilities.canJoin) return
    joinLock.current = true; setJoining(true); setJoinError('')
    try {
      const response = await joinMeetingVideo(meeting.id)
      if (response.provider !== 'LIVEKIT') { setJoinError('Nhà cung cấp Video không được hỗ trợ trên ứng dụng này.'); return }
      // Response-scoped credential is passed directly into the lazy provider adapter and never persisted.
      setPreferences(selection)
      setCredential(response)
    } catch (reason) { setJoinError(meetingVideoError(reason)); refresh() }
    finally { joinLock.current = false; setJoining(false) }
  }
  async function endRoom() {
    if (endLock.current || state.status !== 'ready' || !state.resource.capabilities.canEnd) return
    endLock.current = true; setEnding(true); setEndError('')
    try { await endMeetingVideo(meeting.id); setCredential(null); setPreferences(null); refresh(); navigate(backTo) }
    catch (reason) { setEndError(meetingVideoError(reason)); refresh() }
    finally { endLock.current = false; setEnding(false); setConfirmEnd(false) }
  }
  function leaveRoom() { setCredential(null); setPreferences(null); navigate(backTo) }
  function terminal(message: string) { setCredential(null); setPreferences(null); setJoinError(message); refresh() }

  if (state.status === 'loading' || state.status === 'idle') return <MeetingLoading />
  if (state.status === 'error') return <MeetingError message={state.message} retry={refresh} />
  if (!state.resource.capabilities.canJoin) return <section className="mtg-panel mtg-padded"><h2>Chưa thể tham gia phòng họp</h2>{denialMessages.length > 0 ? <ul className="mtg-video-denials" role="alert">{denialMessages.map((message, index) => <li key={`${message}-${index}`}>{message}</li>)}</ul> : <p className="mtg-help">Bạn chưa được cấp quyền tham gia phòng họp ở thời điểm này.</p>}<Link className="mtg-button mtg-button--secondary" to={backTo}>Quay lại chi tiết cuộc họp</Link></section>
  if (credential && preferences) return <><Suspense fallback={<MeetingLoading />}><LiveKitRoomAdapter credential={credential} preferences={preferences} title={meeting.title} canEnd={state.resource.capabilities.canEnd} onLeave={leaveRoom} onEndRequested={() => setConfirmEnd(true)} onTerminal={terminal} governance={<RoomGovernanceDrawer meeting={meeting} backTo={backTo} canManage={canManageMeeting(access, meeting)} open={governanceOpen} onClose={() => setGovernanceOpen(false)} />} governanceOpen={governanceOpen} onGovernance={() => setGovernanceOpen((value) => !value)} /></Suspense>{confirmEnd && <div ref={endDialogRef} tabIndex={-1} className="mtg-confirm" role="alertdialog" aria-label="Xác nhận kết thúc phòng"><p>Kết thúc phòng họp với tất cả người tham gia? Cuộc họp vẫn được giữ nguyên trên lịch.</p>{endError && <p role="alert">{endError}</p>}<div className="mtg-actions"><button className="mtg-button mtg-button--secondary" disabled={ending} onClick={() => setConfirmEnd(false)}>Quay lại</button><button className="mtg-button mtg-button--danger" disabled={ending} onClick={() => void endRoom()}>{ending ? 'Đang kết thúc…' : 'Kết thúc phòng'}</button></div></div>}</>
  return <>{joinError && <p className="mtg-notice mtg-notice--error" role="alert">{joinError}</p>}<MeetingVideoPreflight onBack={() => navigate(backTo)} onConnectRequested={(selection) => void requestConnect(selection)} />{joining && <p className="mtg-loading" role="status">Đang chuẩn bị phòng họp…</p>}</>
}

function RoomGovernanceDrawer({ meeting, backTo, canManage, open, onClose }: { meeting: MeetingDetail; backTo: string; canManage: boolean; open: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => { if (open) closeRef.current?.focus() }, [open])
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey) }, [onClose])
  if (!open) return null
  const writableNotes = canManage && (meeting.status === 'SCHEDULED' || meeting.status === 'COMPLETED')
  return <aside className="mtg-video-governance" aria-label="Quản trị cuộc họp"><div className="mtg-section-heading"><h2>Quản trị cuộc họp</h2><button ref={closeRef} className="mtg-button mtg-button--secondary" onClick={onClose}>Đóng</button></div><h3>Nội dung dự kiến</h3><p className="mtg-prose">{meeting.agenda || 'Chưa có nội dung dự kiến.'}</p>{writableNotes && meeting.concurrencyToken && <MeetingNotesForm meeting={meeting} busy={false} onDirty={() => undefined} onCancel={() => undefined} onSave={(body) => meetingsApi.updateMeetingNotes(meeting.id, { ...body, concurrencyToken: meeting.concurrencyToken }).then(() => undefined)} />}{meeting.concurrencyToken && <MeetingGovernancePanel meeting={meeting} concurrencyToken={meeting.concurrencyToken} candidates={[]} canManage={canManage} disabled={false} onChanged={() => undefined} />}<Link className="mtg-button mtg-button--secondary" to={backTo}>Mở quản trị cuộc họp</Link></aside>
}
