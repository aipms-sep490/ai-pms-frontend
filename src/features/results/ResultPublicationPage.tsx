import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as evaluations from '../../services/api/evaluations.api'
import * as results from '../../services/api/project-results.api'
import { evaluationError, isConflict } from '../evaluations/evaluation-errors'
import type { EvaluationAssignment } from '../evaluations/evaluation-types'
import type { ProjectResult, ResultPolicy, ResultPreview } from './result-types'
import { Button } from '../../components/ui/Button'
import { HttpError } from '../../services/http/http-client'
import { StudentResultPublicationPanel } from './StudentResultPublicationPanel'

export function ResultPublicationPage() {
  const projectId = Number(useParams().projectId)
  const [assignments, setAssignments] = useState<EvaluationAssignment[]>([])
  const [policy, setPolicy] = useState<ResultPolicy | null>(null)
  const [preview, setPreview] = useState<ResultPreview | null>(null)
  const [previewNotice, setPreviewNotice] = useState<string | null>(null)
  const [published, setPublished] = useState<ProjectResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  const load = useCallback(async () => {
    if (!Number.isInteger(projectId) || projectId < 1) {
      setError('Mã đồ án không hợp lệ.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    setPreviewNotice(null)
    try {
      const [assignmentPage, currentPolicy, currentResult] = await Promise.all([
        evaluations.getProjectEvaluationAssignments(projectId, 'ACTIVE').catch(() => ({ items: [], totalCount: 0 })),
        results.getResultPolicy(projectId).catch(() => null),
        results.getProjectResult(projectId),
      ])
      setAssignments(assignmentPage.items)
      setPolicy(currentPolicy)
      setPublished(currentResult)

      // Only attempt preview if there is no published result yet
      if (!currentResult) {
        try {
          const currentPreview = await results.getResultPreview(projectId)
          setPreview(currentPreview)
        } catch (previewErr) {
          setPreview(null)
          if (previewErr instanceof HttpError && previewErr.status === 409) {
            setPreviewNotice(previewErr.problem?.detail?.includes('published scoped evaluation scheme') ? 'Cần công bố phương án đánh giá theo phạm vi trước khi xem trước kết quả. Kết quả cũ chỉ có thể xem.' : previewErr.problem?.detail || 'Chưa thể xem trước kết quả vì phương án đánh giá chưa được công bố hoặc dữ liệu chưa đầy đủ.')
          }
        }
      }
    } catch (reason) {
      setError(evaluationError(reason))
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void load()
  }, [load])

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      await load()
    } catch (reason) {
      if (isConflict(reason)) await load()
      setError(evaluationError(reason))
    } finally {
      setBusy(false)
    }
  }

  function configure(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const selected = assignments.flatMap((assignment) =>
      form.get(`include-${assignment.id}`) === 'on'
        ? [{ assignmentId: assignment.id, weightPercent: Number(form.get(`weight-${assignment.id}`)) }]
        : []
    )
    if (
      !selected.length ||
      selected.some((item) => !Number.isFinite(item.weightPercent)) ||
      selected.reduce((sum, item) => sum + item.weightPercent, 0) !== 100
    ) {
      setError('Chọn ít nhất một phân công đánh giá và bảo đảm tổng trọng số bằng 100%.')
      return
    }
    void run(() =>
      results.configureResultPolicy(projectId, {
        passThreshold: Number(form.get('passThreshold')),
        assignments: selected,
        concurrencyToken: policy?.concurrencyToken ?? null,
      })
    )
  }

  return (
    <WorkspacePage title="Công bố kết quả đồ án" eyebrow={`Đồ án #${projectId}`} description="Kiểm tra cách tính điểm, xem trước kết quả và công bố khi đã đủ điều kiện.">


      {error ? (
        <section role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </section>
      ) : null}

      {loading ? (
        <p role="status" className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Đang tải cách tính điểm và kết quả…
        </p>
      ) : null}

      {!loading && published ? <PublishedResult result={published} /> : null}

      {!loading && !published ? (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="font-bold text-slate-900">Cách tính điểm</h2>
            {policy?.isLocked ? (
              <p className="mt-2 text-sm text-amber-800">
                Cách tính điểm đã được khóa sau lần chốt đánh giá đầu tiên. Không thể thay đổi phân công, trọng số hoặc ngưỡng đạt.
              </p>
            ) : (
              <form onSubmit={configure} className="mt-4 space-y-4">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <span>Ngưỡng đạt:</span>
                  <input
                    aria-label="Ngưỡng đạt"
                    name="passThreshold"
                    type="number"
                    min="0"
                    max="10"
                    step="0.01"
                    defaultValue={policy?.passThreshold ?? 5}
                    className="w-24 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                  />
                </label>
                {assignments.length === 0 ? (
                  <p className="text-sm text-slate-500">Chưa có phân công đánh giá nào có hiệu lực cho đồ án này.</p>
                ) : (
                  <div className="space-y-2">
                    {assignments.map((assignment) => {
                      const configured = policy?.assignments.find((item) => item.assignmentId === assignment.id)
                      return (
                        <label
                          key={assignment.id}
                          className="grid items-center gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-[auto_1fr_8rem] hover:bg-slate-50/50"
                        >
                          <input
                            name={`include-${assignment.id}`}
                            type="checkbox"
                            defaultChecked={Boolean(configured)}
                            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                          />
                          <span className="text-sm text-slate-800">
                            Phân công #{assignment.id} · Giảng viên #{assignment.evaluatorId} · {assignment.evaluationType === 'SUPERVISOR' ? 'Giảng viên hướng dẫn' : 'Giảng viên đánh giá'}
                          </span>
                          <input
                            aria-label={`Trọng số ${assignment.id}`}
                            name={`weight-${assignment.id}`}
                            type="number"
                            min="0.01"
                            max="100"
                            step="0.01"
                            defaultValue={configured?.weightPercent ?? ''}
                            placeholder="Trọng số %"
                            className="rounded-lg border border-slate-300 px-3 py-1 text-sm"
                          />
                        </label>
                      )
                    })}
                  </div>
                )}
                <Button
                  type="submit"
                  disabled={busy || Boolean(policy?.isLocked) || assignments.length === 0}
                >
                  {busy ? 'Đang lưu…' : 'Lưu cách tính điểm'}
                </Button>
              </form>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="font-bold text-slate-900">Xem trước kết quả</h2>
            {previewNotice ? (
              <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                {previewNotice}
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-600">
                Tổng: <strong className="text-slate-900">{preview?.totalScore ?? '—'}</strong> · Ngưỡng:{' '}
                <strong className="text-slate-900">{preview?.passThreshold ?? '—'}</strong> · Kết luận:{' '}
                <strong className="text-slate-900">{preview?.outcome ?? '—'}</strong>
              </p>
            )}
            {preview?.blockers && preview.blockers.length > 0 ? (
              <ul className="mt-3 list-disc pl-5 text-sm text-amber-900">
                {preview.blockers.map((blocker) => (
                  <li key={blocker}>{blocker}</li>
                ))}
              </ul>
            ) : null}
            <label className="mt-4 flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                disabled={!preview?.canPublish || busy}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <span>Tôi đã kiểm tra và xác nhận công bố kết quả trong bản xem trước này.</span>
            </label>
            <div className="mt-4">
              <Button
                type="button"
                disabled={!preview?.canPublish || !confirmed || busy}
                onClick={() => void run(() => results.publishProjectResult(projectId, preview!.confirmationToken))}
              >
                {busy ? 'Đang công bố…' : 'Công bố kết quả'}
              </Button>
            </div>
          </section>
        </>
      ) : null}

      {!loading && <StudentResultPublicationPanel projectId={projectId} />}
      <div>
        <Link
          to={`/department/projects/review/${projectId}`}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.99] transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Về thẩm định đề cương</span>
        </Link>
      </div>
    </WorkspacePage>
  )
}

function PublishedResult({ result }: { result: ProjectResult }) {
  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-xs">
      <h2 className="font-bold text-emerald-950">Kết quả đã công bố: {result.outcome}</h2>
      <p className="mt-2 text-sm text-emerald-900">
        Tổng điểm {result.totalScore} / ngưỡng {result.passThreshold} · {new Date(result.publishedAt).toLocaleString('vi-VN')}
      </p>
      <p className="mt-1 text-xs text-emerald-800">{result.calculationRule}</p>
    </section>
  )
}
