import { lazy, Suspense, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { PageLoading } from '../../components/ui/PageLoading'
import { env } from '../../app/config/env'
import './collaboration.css'

const Agreement = lazy(() => import('../working-agreement/WorkingAgreementWorkspace').then(module => ({ default: module.WorkingAgreementWorkspace })))
const Peer = lazy(() => import('../peer-eval/PeerRoundManagementPage').then(module => ({ default: module.PeerRoundWorkspace })))
const Weekly = lazy(() => import('../weekly-assessments/WeeklyAssessmentHistory').then(module => ({ default: module.WeeklyAssessmentHistory })))

/** Inline entry points keep FE1 usable while FE2 owns the new standalone routes. */
export function TeamReflectionPanel({ projectId, studentId, audience, canManagePeer = false }: {
  projectId: number; studentId?: number; audience: 'student' | 'primary' | 'preactivation'; canManagePeer?: boolean
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const [visited, setVisited] = useState<string[]>([])
  function toggle(id: string) {
    setVisited(values => values.includes(id) ? values : [...values, id])
    setSelected(value => value === id ? null : id)
  }
  const options = [
    ...(env.workingAgreementEnabled ? [{ id: 'agreement', label: 'Cam kết nhóm', icon: 'handshake' }] : []),
    ...(env.peerEvaluationEnabled && audience === 'primary' ? [{ id: 'peer', label: 'Đánh giá đồng đội', icon: 'forum' }] : []),
    ...(env.weeklyAssessmentEnabled && audience === 'student' && studentId ? [{ id: 'weekly', label: 'Phản hồi hằng tuần', icon: 'insights' }] : []),
  ]
  if (!options.length) return null
  return <section className="collab collab-card" aria-label="Cam kết và phản hồi"><div className="collab-row"><div><h2>Cam kết & phản hồi</h2><p className="collab-muted">Theo dõi cách nhóm phối hợp, ghi nhận đóng góp và giữ lại từng phiên bản.</p></div><div className="collab-actions">{options.map(option => <Button key={option.id} variant={selected === option.id ? 'secondary' : 'outline'} icon={option.icon} aria-expanded={selected === option.id} onClick={() => toggle(option.id)}>{option.label}</Button>)}</div></div>
    <Suspense fallback={<PageLoading />}>
      {visited.includes('agreement') && <div hidden={selected !== 'agreement'}><Agreement key={projectId} projectId={projectId} readOnly={audience === 'primary'} /></div>}
      {visited.includes('peer') && <div hidden={selected !== 'peer'}><Peer key={projectId} projectId={projectId} canCreate={canManagePeer} /></div>}
      {visited.includes('weekly') && studentId && <div hidden={selected !== 'weekly'}><Weekly key={`${projectId}:${studentId}`} projectId={projectId} studentId={studentId} studentOnly /></div>}
    </Suspense>
  </section>
}
