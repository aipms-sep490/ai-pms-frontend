# AI-PMS Global Interaction Contract — All screens and controls

## 1. Invariant interaction state model

Every actionable element and data-driven region uses an explicit state rather than boolean spaghetti. Standard lifecycle:

`idle -> validating -> submitting -> success | error` (form/action), with `blocked` (permission/policy/state), `stale` (409), `readonly` (frozen/archive) as distinct states. For remote regions: `initialLoading -> ready | genuineEmpty | filteredEmpty | insufficientData | denied | failed`; subsequent fetch: `refreshing` keeps context without false blank flicker.

Do not render success before server confirms. Avoid uncontrolled async request races and duplicate mutations. Preserve relevant changes across validation or transient error where safe; never leak to unrelated accounts.

## 2. Universal behavior matrix

| Interaction | Required behavior | Failure/edge case |
|---|---|---|
| Click primary CTA | one clear action, immediate state feedback | no-op forbidden; block duplicate submission |
| Hover | subtle affordance for pointer | not exclusive method for revealing critical information |
| Keyboard | Tab/Shift+Tab and Enter/Space; Esc closes dismissible overlay | visible focus, no keyboard traps outside dialogs |
| Disabled/blocked | reason + prerequisites + permitted next action | do not expose disallowed resource data |
| Navigation | route, breadcrumb, preserved return context | authorization/refetch on context change |
| Filter/search | debounced text where appropriate, resettable, URL-synced for major views | empty filter result distinct from truly empty |
| Form | dirty state, inline validation, form error summary, submit progress | preserve field values on 409/422, safe leave confirmation |
| Server mutation | pending -> confirmed -> invalidate/refetch affected queries | no stale badge/result; audit sensitive actions |
| Destructive action | object-name confirm with explicit consequence | disable on ineligible state; don't rely on toast alone |
| Batch action | clear selected count, eligibility, per-item failures | atomic/partial outcome explained based on actual API |
| Dialog/drawer | purposeful title, focus trap, restore, explicit close | non-dismissible only when truly required |
| Notification | relevant severity, origin, deep link to allowed context | sensitive detail protected, archived resource handled |
| File upload | policy constraints, upload progress, retry, version | type/size/security rejection explained |
| Table | sort/filter/page/selection and fixed header where helpful | mobile access to all important actions |
| Chart/AI | provenance, period, confidence/insufficient data | fallback to authoritative facts if AI unavailable |

## 3. HTTP / API feedback states

- **400:** input malformed; show safe summary and relevant field errors.
- **401:** session expired; offer sign-in preserving intended destination, avoid corrupting draft.
- **403:** lack of role/scope/assignment authority; show Access Denied; do not suggest bypass or display unauthorized private metadata.
- **404:** missing or inaccessible; state unknown rather than revealing existence.
- **409:** stale version, invalid transition, conflicting assignment; preserve draft, show what changed/refresh path; require resubmission only after reviewing latest context.
- **422:** business constraints (verified major, quotas, registration window, missing department decision, supervisor capacity, rubric rule) via stable server reason codes and actionable prerequisites.
- **429/5xx/network:** non-misleading retry/fallback, no fake success or duplicated writes.

Use application message IDs if the API exposes them (SRS examples MSG-TEAM-03, MSG-TEAM-04, MSG-PROJ-02, MSG-PROJ-03, MSG-COMMON-409, MSG-EVAL-01/02/03); keep a centralized mapping/localization layer. Never infer academic eligibility from frontend-only request fields.

## 4. Permission and action presentation

1. Fetch authoritative resource state/capabilities if actual BE supports them; inspect real OpenAPI for endpoint/path/contract. `GET /api/projects/{id}/my-capabilities` in AI-PMS v5 is a *suggested* endpoint, not evidence of implementation.
2. Distinguish `allowed`, `disallowed_with_explanation`, and `out_of_scope`. An ordinary state-blocked CTA may remain visible with explanation; a grade action for an unassigned member is hidden or replaced by safe access-denied view, depending on screen.
3. Permission/state must be revalidated on submit. Never use `isAdmin`, `isLeader` alone as final truth.
4. Re-fetch current resource after meaningful transition; invalidate all affected list, detail and dashboard caches.
5. For read-only/frozen items, show who/when/version and why immutable if authorized; do not show editable-looking controls.

## 5. Business-critical scenarios

**Student Leader — registration:** visible readiness checklist: period window; verified major(s); size/quota; current eligibility snapshot; required proposal fields and working agreement only where approved policy applies. Submit has explicit summary and confirmation. Revisions preserve review comments and create new snapshot through backend.

**Supervisor request:** candidates only after deterministic eligibility, workload and assignment checks; AI recommendation clearly advisory; accept/reject rechecks backend capacity. One effective Primary Supervisor (mentor scope separate).

**Academic approval:** show required Lead/Participating Department decisions according to effective policy. Review decision is not the same as team eligibility; do not transition to ACTIVE before effective Primary Supervisor acceptance.

**Execution:** task board preserves assignee, due date, dependency, evidence and discipline context. `BLOCKED` requires reason and shows next action; overdue is informational, not auto-FAIL. Evidence file uploaded != learning outcome verified.

**Review gates:** Checkpoint schedule/event and formal Review Gate decision are distinct objects; missing checkpoint is risk signal, not a failed project. Label proposed gates as proposed when not enabled by policy.

**Final submission:** frozen manifest of exact versions, checklist blockers, time window, explicit confirmation. Once finalized, upload replacements are not quietly accepted.

**Evaluation:** evaluator sees only assigned project/major/student/criteria. ON_GOING/COLD/DEFENSE stages distinct from COMMON/MAJOR_SPECIFIC/INDIVIDUAL scopes. Missing scores are PENDING, not 0. Draft/save/finalize/publish are distinct authority steps. ProjectResult excludes INDIVIDUAL; official course grading must follow approved policy, not demo defaults.

**AI:** show source and freshness, report insufficiency/validation errors, prohibit autonomous approval, scoring, state mutation or supervisor assignment.

## 6. Internationalization and copywriting

Use user-facing Vietnamese terminology consistently if Vietnamese is the app locale. Do not mix 'Đề tài', 'Project', 'Capstone' arbitrarily within a workflow. Buttons use verbs (Tạo nhóm, Gửi đăng ký, Nộp báo cáo). Badges use explicit nouns/status (Chờ duyệt, Yêu cầu chỉnh sửa, Đã khóa). Do not display raw enum without mapping. Dates display local timezone and range, with ISO storage preserved. Field helper copy says exactly what to provide and why.
