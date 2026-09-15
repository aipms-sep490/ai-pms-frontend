import { useCallback, useEffect, useState } from 'react';
import { HttpError, httpGet, httpPost } from '../../../services/http/http-client';
import { useAuthSession } from '../../auth/context/useAuthSession';
import {
  decide,
  detail,
  history,
  queue,
  type History,
  type ProjectFullDetail,
  type ProjectSummary,
  type ReviewDetail,
} from '../api/project-review-api';

export function useProjectReview(id?: number) {
  const { session } = useAuthSession();
  const [q, setQ] = useState<ProjectSummary[]>([]);
  const [d, setD] = useState<ReviewDetail | null>(null);
  const [info, setInfo] = useState<ProjectFullDetail | null>(null);
  const [h, setH] = useState<History[]>([]);
  const [e, setE] = useState<Error | null>(null);
  const [loading, setLoading] = useState(!!session);

  const refresh = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setE(null);
    try {
      const a = await queue(session.accessToken);
      setQ(a.items);
      if (id) {
        const [b, c, pInfo] = await Promise.all([
          detail(id, session.accessToken),
          history(id, session.accessToken).catch(() => []),
          httpGet<ProjectFullDetail>(`/v1/projects/${id}`, {
            accessToken: session.accessToken,
          }).catch(() => null),
        ]);
        setD(b);
        setH(c);
        setInfo(pInfo);
      }
    } catch (x) {
      setE(x as Error);
    } finally {
      setLoading(false);
    }
  }, [session, id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const action = async (
    kind: 'start-review' | 'revision' | 'approve' | 'reject',
    reason?: string
  ) => {
    if (!session || !id) throw new Error('Review resource unavailable');

    let currentToken = d?.concurrencyToken ?? info?.concurrencyToken;
    const latestHistory = h.length > 0 ? h[h.length - 1] : null;
    const currentStatus = latestHistory?.newStatus ?? info?.status ?? q.find((p) => p.id === id)?.status ?? '';

    if (kind === 'start-review') {
      if (!currentToken) throw new Error('Concurrency token missing');
      await httpPost<unknown>(
        `/v1/projects/${id}/start-review`,
        { concurrencyToken: currentToken },
        { accessToken: session.accessToken }
      );
      await refresh();
      return;
    }

    // Auto-advance SUBMITTED to UNDER_REVIEW before approving/revision/reject
    if (currentStatus === 'SUBMITTED') {
      if (currentToken) {
        try {
          const started = await httpPost<{ concurrencyToken?: string }>(
            `/v1/projects/${id}/start-review`,
            { concurrencyToken: currentToken },
            { accessToken: session.accessToken }
          );
          if (started?.concurrencyToken) {
            currentToken = started.concurrencyToken;
          }
        } catch {
          // ignore to allow decide to execute
        }
      }
    }

    if (!currentToken) throw new Error('Concurrency token missing');
    await decide(id, kind, currentToken, reason, session.accessToken);
    await refresh();
  };

  return {
    queue: q,
    detail: d,
    projectInfo: info,
    history: h,
    error: e,
    loading,
    refresh,
    action,
    isUnauthorized: !session || (e instanceof HttpError && e.status === 401),
    isForbidden: e instanceof HttpError && e.status === 403,
  };
}


