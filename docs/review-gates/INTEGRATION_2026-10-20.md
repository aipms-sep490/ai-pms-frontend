# Review Gates FE integration — 20/10/2026

> Historical snapshot. See [21/10 verification](INTEGRATION_2026-10-21.md) for current staging deployment, authenticated demo checks and the confirmed cross-major download blocker.

Status: **FE_DONE_BE_PENDING** for shared/staging cutover. The scoped single-major and two-major browser/API lifecycles passed against a dedicated local API and an owned SQL catalog. This is not production or shared-database acceptance.

## Source and contract

- FE branch: `feat/uiux-master-redesign`; integration started from `c3e1e376369579b5e040f2c801710b189cb8ae0a`.
- BE: `develop` fast-forwarded to `a1f510bc6f8de84984c41e0a9825ddfceeddbe9a`, including `c2563b4` and `1ad35da`.
- Multipart now uses `POST /projects/{projectId}/review-gates/{gateCode}/evidence/file` with actual file bytes, requirementId, notes, expectedVersion and gate concurrencyToken. The existing authenticated HTTP client supplies Bearer/refresh and the browser supplies the multipart boundary.
- Submit package uses `/submit-for-review` with the gate token. Reviewer queues consume the server's PagedResult and expose pagination.
- Exact download uses the protected project/gate/requirement/version route through the existing authenticated Blob client. It never navigates to a raw storage URL.
- Template writes use a separate DTO with requirement code/target IDs, ordered sequence, nullable dates and server tokens. Save replaces temporary IDs; publish saves current edits before publishing the returned ID/token.

## FE behavior

Contextual student submission comes from BE capabilities rather than a global STUDENT_LEADER role. Future locked gates cannot reuse the current gate's capability. A revision decision permits a new version even if an individual requirement was previously accepted. Missing tokens, metadata-only file submissions and unsupported external links fail before real transport.

Reviewer notes are keyed by assignment and remain mounted through refresh; structured HTTP 409 offers reload without losing the draft. The student upload modal also preserves its selected file/notes while reloading a stale gate. The collaboration banner forwards the actual File, current requirement version and gate token.

Timeline readiness details come from the separate BE readiness endpoint. Missing data stays unknown; the old fixed package/sign-off checklist is removed. Real governance no longer requests IT-02 or selects a fixture template, and readiness failure does not block loading templates/matrix. Supervisor-feedback and external-link submission remain unavailable on real transport because their contract is absent/unsupported. Existing mock flows stay separate.

No `.env` files, shared HTTP client, product routes, shared database, backend source, or default mock flag were changed. Tests override Vite configuration only in their child process.

## Verification

| Check | Result | Scope |
| --- | --- | --- |
| FE full Vitest | 1,309 PASS | Includes new real-transport and capability regressions |
| FE focused review-gates/projects + design-token | 172 PASS | Includes the readable mock label fix |
| FE TypeScript/build/lint | PASS | Existing lint and bundle-size warnings remain; no suppression/threshold reduction |
| Playwright controlled HTTP | 7 PASS | Multipart bytes/token, queue pagination/draft, upload 409 recovery, revoke error, empty governance, template save/publish, 320/375/768/1024/1440 widths |
| Playwright real API + SQL | 2 PASS | SINGLE_MAJOR and INTERDISCIPLINARY, real password/JWT, actual file storage, revision/resubmit, scoped verification/decisions, PASS/next gate, exact byte/hash download, active revoke/401/403 |
| BE unit | 1,079 PASS | Re-run on a1f510b |
| BE OpenAPI regression | 4 PASS | Re-run DepartOpenApiTests; measured four tests, independently of the five reported in the screenshot |
| BE isolated schema parity | 2 PASS | Local SQL Server override; fresh/upgrade/rerun verification did not require Docker |

Run commands and isolation boundaries are documented in [the acceptance README](../../e2e/review-gates/README.md). The live runner records source SHA, sanitized API assertions, gate/evidence/assignment DB readback and cleanup; its temporary API/catalog are removed in `finally`. It returns failure when acceptance fails. Browser traces are disabled to avoid retaining passwords/JWTs.

## Remaining deployment and BE work

1. **Deploy and verify staging.** The latest inspected staging OpenAPI still has 355 paths and no Review Gates. Source pull and local tests do not identify the deployed SHA. Confirm candidate build SHA, target migration readiness, actual FE origin/CORS and authenticated staging smoke before shared cutover.
2. **Investigate the observed queue deadlock.** An earlier isolated run returned SQL 1205 / HTTP 500 from `ReviewGateService.AssignedReviews` during overlapping traffic. Subsequent sequential lifecycles passed after the test awaited each mutation response. No BE change was made; this does not close the concurrency finding. Fix/read-retry/locking strategy and stress acceptance belong to BE; do not auto-retry FE writes.
3. **Verify the claimed shared migration independently.** The configured local development catalog is an older VIDEO_E2E catalog without these tables, and the current Windows login could not open an explicit AI_PMS catalog. The screenshot's 10 tables/27 trusted FKs on shared AI_PMS were not confirmed. No shared DB changes were attempted.
4. **Keep policy/read-model gaps visible.** Template choice is now period+mode, but major/effective-policy selection and GET lazy initialization still need a documented decision. EffectivePolicyVersion currently carries template version. Progress/scope display names and a full staff assignment-management read model remain incomplete. FE shows absence rather than fixture values.
5. **Complete broader authority acceptance.** INDIVIDUAL scope, negative COI/out-of-major cases, supervisor access across majors, concurrent writes/rollback, and official package/policy readiness are outside the two passing lifecycle scenarios. Revoke is verified for an ACTIVE assignment; the current BE explicitly rejects revoke of a DECIDED assignment. Decide separately whether historical access must be revocable.

Do not mark INTEGRATED_READY or switch the shared mock flag solely from this report. Keep canonical v4/v5 proposal/sign-off boundaries; no scoring thresholds, weights or new academic rules were introduced.
