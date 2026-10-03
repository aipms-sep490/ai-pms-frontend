# AI Advisory Workspace Matrix — Phase 8

**Scope:** frontend integration only. Backend was inspected read-only at
`c23eeef69fef242acfcbf3d76aea98efd4eb6298`; no database, schema, seed, API,
or Backend source is changed by this phase.

## Non-negotiable boundary

`authoritative data -> Backend scope check -> bounded AI context -> advisory output -> human review -> existing canonical command`

An AI response never grants a workflow action, changes a project state, assigns a
supervisor/evaluator, posts feedback, or invokes a privileged command. Phase 7
Calendar/Attention remains a separate deterministic presentation of non-AI facts.

| Feature | API / contract | Actor scope verified by Backend | Read / mutation | Existing FE | Phase 8 posture | Backend gap | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Project progress analysis | `GET /api/v1/projects/{projectId}/progress-analysis` | `ProjectAccessService.CanAccessAsync`: active team member; active assigned supervisor; persisted department scope; Backend also permits Admin | Read | Student AI route, Supervisor compact panel, Department risk route | `VERIFIED_FE` | None for advisory text | Rule-based result exposes data status, risk, factors, recommendations, limits and versions. UI does not calculate risk or infer a healthy result. Admin is not given an FE project-AI route merely because the endpoint permits a server-authorized read. |
| Project risk / delay explanation | Same progress-analysis DTO | Same as above | Read | Existing factor list | `VERIFIED_FE` | `BE-AW-012` optional structured evidence/action mapping | Factors are rendered only as Backend text. No source/deep-link is invented because factor DTO has no resource reference. |
| Suggested intervention / next action | `recommendations: string[]` in progress analysis | Same as above | Advisory read | Existing list | `VERIFIED_FE` text-only | `BE-AW-012` optional | Suggestions do not display a command CTA or grant any capability. |
| Report summary | `GET /api/v1/projects/{projectId}/reports/{reportId}/summary` | Server checks project existence, `CanAccessAsync`, then report-project match; only `WEEKLY`/`MONTHLY` are accepted | Explicit user-requested read | Report detail side panel | `VERIFIED_FE` | None for current summary | Summary is requested by a button, leaving original report visible. Server may use a deterministic fallback with a limitation note. |
| Report summary evidence | `ReportSummaryDto.evidence` | Same report contract | Read | New shared evidence list | `VERIFIED_FE` | None | Shows exact Backend title, type/id, date, excerpt and API reference. API references are not falsely translated into a role-specific frontend deep-link. |
| Project academic assistant | `POST /api/v1/projects/{projectId}/ai/assistant/ask` | Same server project access rule; bounded context contains only retrieved scoped facts | Explicit advisory query | Student and Supervisor project-AI route | `VERIFIED_FE` | None for current bounded query | Context is the route's current project only; no client RAG, no cross-project selector, no history, no direct action. 429 is surfaced. |
| Assistant evidence / insufficient data | `ProjectAssistantResponseDto.evidence`, `insufficientEvidence`, `limitationNote` | Same as assistant | Read | Existing answer panel | `VERIFIED_FE` | None | Returned evidence is displayed; insufficient evidence is a warning, never a low-risk conclusion. |
| Supervisor project insight | Existing supervisor workspace embeds analysis; project-AI route is under `SupervisorExecutionRoute` | Existing FE route requires the exact supervisor execution context; Backend rechecks active assignment | Read | Existing panel and route | `VERIFIED_FE` | None | No structural task/milestone mutation is added. |
| Supervisor recommendation / ranking | No audited AI candidate-ranking endpoint | Deterministic candidate endpoint has its own server eligibility/access logic; it is not AI ranking | Not exposed | No Phase 8 ranking UI | `BLOCKED_BY_BE` | `BE-AW-013` | Existing candidate/selection behavior remains canonical; no client score or explainability is fabricated. |
| Mentor AI insight | No explicit Mentor-major AI scope contract is consumed | `CanAccessAsync` recognizes STUDENT, LECTURER/supervisor assignment, department and Admin; it does not express Mentor-major advisory scope | Not exposed | Mentor report detail omits AI summary | `FAIL_CLOSED` | No active consumer; future contract required before surface | Mentor is not treated as `LECTURER` by the frontend. |
| Evaluator AI insight | No evaluator-assignment AI context contract | No assignment-scoped AI endpoint audited | Not exposed | No evaluator AI UI | `FAIL_CLOSED` | No active consumer; `BE-AW-006/007` remain prerequisites | Evaluation/grading stays outside Phase 8. |
| Department AI insight | Existing Department risk route + progress analysis | Persisted Department Staff academic scope is resolved server-side | Read | Existing route | `VERIFIED_FE` | None for existing scoped per-project read | Does not construct a cross-project AI health queue. |
| Admin AI insight | Progress endpoint may authorize Admin server-side | Admin access is a Backend predicate, not a frontend role grant | Not exposed | No Admin project-insight UI | `FAIL_CLOSED` | No active consumer | Admin does not substitute for Department, Supervisor or project scope in the UI. |
| AI run/audit history | No actor-scoped run-history contract | Not available | Not exposed | None | `BLOCKED_BY_BE` if product requires history | No new handoff because Phase 8 has no history consumer | Generated time, rule/model metadata where returned, evidence, limitation and fallback signals are shown per response. |

## Failure posture

| Condition | FE behavior |
| --- | --- |
| `401` | State that the session expired; no fallback authority is created. |
| `403` | State that Backend denied the scoped AI read/query; preserve the surrounding non-AI page. |
| `404` | State that the project/report is missing or not available in current scope. |
| `429` | Explain the bounded AI rate limit and allow a later retry. |
| Other network/provider failure | Keep the original report/project UI usable; render local retry/error only. |
| `INSUFFICIENT_DATA` or `insufficientEvidence` | Warn that there is not enough evidence; never render low risk/all clear. |
| Unknown `dataStatus` / `riskLevel` | Render an unsupported-status warning, never the green/healthy state. |

## Proven limits

- No user-supplied client state is sent as a RAG corpus; the assistant only receives a query and Backend retrieves bounded, authorized context.
- Backend `referenceUrl` values are API references. Without a delivered canonical UI-deep-link hint, the frontend displays them as references rather than guessing a route.
- Report summaries are not precomputed artifacts in the delivered contract; the user must explicitly request each summary.
- A deterministic Backend fallback may be returned when the model provider is unavailable; the returned limitation note is visible.
