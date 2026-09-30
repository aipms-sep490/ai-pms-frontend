# Core PMS phase completion plan (AI out of scope)

**Scope decision — 2026-09-30.** The current release is an academic Project Management System. AI summaries, chat and inferred risk analysis are **not** a release dependency, must not decide workflow/score/permission, and are disabled in the frontend unless `VITE_ENABLE_AI_ADVISORY=true` is explicitly set. Existing AI code and backend contracts are retained for a future opt-in release; they are not deleted or counted as a core-PMS phase.

This document supersedes AI-related completion expectations in the frontend roadmap. The canonical source for backend/DB remediation remains the backend audit; this is the FE business and acceptance plan.

## Non-AI business outcome

The release is complete only when a real actor can progress a project through:

`team and proposal -> academic review -> ACTIVE execution -> reports/meetings/evidence -> locked final package -> scoped evaluation -> published individual result -> archive`

Every transition is made by the backend. The frontend shows server capabilities, sends server-issued concurrency tokens, and reloads on `409`; it never estimates eligibility, risk, grades, windows or permissions locally.

## What is implemented versus what still needs proof

| Wave | Core business operation | Current implementation | Required improvement before `DONE` |
| --- | --- | --- | --- |
| P0 | Reproducible two-mode acceptance environment | Runtime and contracts start; no authorized two-mode fixture was available during the 2026-09-30 check. | Disposable DB with `SINGLE_MAJOR` and `INTERDISCIPLINARY` journeys, real file storage, scoped actors, deterministic clock and SQL readback. |
| P1a | Department review history and major quota | FE reads immutable snapshots and edits requirements with token/409 refresh. | Browser/API/SQL evidence for scope isolation, revision/resubmission and competing requirement writers. |
| P1b | Versioned period policy/window | FE now reads effective/history and implements successor draft, draft update and immediate publish with version/token; legacy period form keeps policy fields read-only for existing records. | Validate policy publish/update conflict behaviour in an API-mode browser/SQL journey before marking done. |
| P1c | Execution and meeting concurrency | Existing task/milestone/report/meeting forms send tokens. | Enable strict-token E2E, use two writers and prove rejected writes create no business/audit/notification side effect. |
| P2a | Evaluation scheme authoring/publishing | Department/Admin lifecycle surface now creates, edits and deletes drafts; validates common/major/individual weights; publishes with a freeze warning; and creates a successor version. Scoped assignment form and StudentResult read are connected. | Run API-mode browser/SQL acceptance for the locked package, period, rubric, frozen roster, 403 and 409 cases before marking done. |
| P2b | Scoped assignment, scoring and individual publication | Assignment targets `COMMON`, `MAJOR_SPECIFIC`, `INDIVIDUAL`; student reads own result only. | Validate frozen roster, component capacity, revoke-after-finalize, privacy and published-result browser/SQL evidence. |
| P3 | Discipline evidence, reporting cycles and project action items | Department governance now creates reporting cycles, creates source-safe action items, sends token-safe status updates and records progress-report evidence. Legacy meeting action items remain usable. | Add dedicated task-discipline and structured-responsibility editors; run role/state/409 and SQL evidence for all P3 writes before marking done. |

## P3 business rules enforced by Backend and requiring acceptance evidence

1. **Checkpoint policy:** define whether a reporting cycle is advisory or blocks a final package; define late behaviour (`BLOCK`, accepted-late, or escalation) and the accountable actor.
2. **Evidence rule:** define which source types (`TASK`, `REPORT`, `MEETING`, `DELIVERABLE`, file) satisfy each discipline/checkpoint. A generic evidence row must not silently become proof of completion.
3. **Action-item ownership:** decide which source may create an item, who can change owner/due date, which terminal statuses are legal, and whether reopening is ever allowed.
4. **Evaluation ownership:** Department/Admin owns scheme draft/publish/version; evaluator owns scores only for an assigned frozen target; students read only their own published outcome.
5. **Policy ownership:** name the owner of a period policy and freeze boundary. Existing policy versions must be referenced by submissions/finalization, not retroactively reinterpreted.

The merged Backend contracts now enforce these rules. FE surfaces only the supported source types and transitions; P3 remains `PARTIAL` until the explicit actor/state/SQL evidence below is captured.

## Completion evidence per core workflow

For each row, capture an API-mode browser recording or reproducible steps, redacted request/response, SQL readback, audit/notification readback and commit SHA:

| Workflow | Positive path | Negative path |
| --- | --- | --- |
| Review and resubmission | Lead/participating Department make decisions on snapshot N; N+1 is immutable and separately visible. | Wrong-scope actor gets `403/404`; decision against obsolete snapshot gets `409`; no extra decision/audit row. |
| Requirements/policy | Authorized actor updates an editable project requirement/policy version and receives a new token/version. | Locked state or stale token returns `409`; invalid quota/window returns `422`; no partial write. |
| Execution/report/meeting | Participant creates work/report/meeting action within ACTIVE scope and reopens fresh authoritative data. | Two concurrent writers yield one success/one `409`; foreign actor has no read/write access. |
| Evaluation/result | Published scheme -> scoped eligible evaluator -> assignment -> evaluation -> finalization -> StudentResult publication. | Wrong target, revoked evaluator, unpublished scheme, duplicate slot and cross-student result read fail without leaking data. |
| Archive | Scoped staff archives a completed project with locked final package and published result. | Student, foreign Department, stale token or missing prerequisite cannot archive. |

## Release sequence

1. Prepare P0 fixture and actor aliases; do not mutate the shared demo database.
2. Run P1 evidence and finish the policy lifecycle surface.
3. Finish P2 scheme authoring/publishing, then rerun assignment/result evidence from a fresh session.
4. Complete task-discipline and structured-responsibility editors, then run the P3 role/state/concurrency evidence.
5. Run the complete non-AI release journey on both project modes. Only rows with the evidence above move to `DONE` in `FE_BUSINESS_IMPLEMENTATION_MATRIX.md`.

## Explicit exclusions

- AI chat, generated report summaries, AI-derived risk labels and AI-based recommendations.
- AI-derived score, eligibility, archive permission, state transition or mandatory evidence decision.
- Deleting historic AI modules or backend tables; that needs a separate data-retention and migration decision.
