import { endpoints } from '../../../services/api/endpoints';
import { httpGet, httpPost } from '../../../services/http/http-client';

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface ProjectSummary {
  id: number;
  teamId: number;
  teamName: string;
  code: string;
  title: string;
  status: string;
  createdAt: string;
  submittedAt: string | null;
  majors: { majorCode: string; majorName: string }[];
}

export interface ProjectFullDetail {
  id: number;
  teamId: number;
  teamName: string;
  code: string;
  title: string;
  description: string;
  problemStatement?: string;
  objectives?: string;
  expectedOutput?: string;
  status: string;
  registeredAt?: string | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
  completedAt?: string | null;
  createdBy?: number;
  createdByName?: string;
  concurrencyToken: string;
  majors: { id: number; majorId: number; majorCode: string; majorName: string }[];
  tags: { id: number; name: string; tagType: string }[];
}

export interface ReviewDetail {
  concurrencyToken: string;
  academicScope: {
    mode?: string;
    primaryMajorId?: number;
    majorRequirements?: unknown[];
  } | null;
  latestSubmission: {
    id: number;
    submittedAt: string;
    evidence: unknown;
    decisions: {
      departmentId: number;
      decision: string;
      reason: string | null;
      decidedAt: string | null;
    }[];
  } | null;
}

export interface History {
  oldStatus: string | null;
  newStatus: string;
  changedByName: string;
  reason: string | null;
  changedAt: string;
}

export const queue = (token: string, search = '') =>
  httpGet<Page<ProjectSummary>>(
    `${endpoints.projectReviewQueue}?page=1&pageSize=50${search ? `&search=${encodeURIComponent(search)}` : ''}`,
    { accessToken: token }
  );

export const detail = (id: number, token: string) =>
  httpGet<ReviewDetail>(`/v1/projects/${id}/academic-review`, { accessToken: token });

export const getProjectInfo = (id: number, token: string) =>
  httpGet<ProjectFullDetail>(`/v1/projects/${id}`, { accessToken: token });

export const history = (id: number, token: string) =>
  httpGet<History[]>(`/v1/projects/${id}/history`, { accessToken: token });

export const startReview = (id: number, concurrencyToken: string, token: string) =>
  httpPost<ProjectFullDetail>(`/v1/projects/${id}/start-review`, { concurrencyToken }, { accessToken: token });

export const decide = (
  id: number,
  kind: 'revision' | 'approve' | 'reject',
  concurrencyToken: string,
  reason: string | undefined,
  token: string
) =>
  httpPost<ProjectFullDetail>(
    `/v1/projects/${id}/${kind}`,
    kind === 'approve' ? { concurrencyToken } : { concurrencyToken, reason },
    { accessToken: token }
  );

