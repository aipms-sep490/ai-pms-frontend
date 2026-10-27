# G5 — academic errors retain input and give an appropriate next action

27/10/2026, Asia/Saigon. Branch `fix/fe-academic-error-reasons`, baseline14d9981. **Frontend handling is ready; the exact overlap-specific acceptance criterion remains blocked by the BE error contract.** No router, academic authority, time conversion, FE1 execution utility or shared UI primitive changed.

## Observed staging response before implementation

Normal Admin UI, semester30002, REGISTRATION; attempted a new labeled period inside an existing active window. POST `/api/v1/academic/project-periods` returned409:

```json
{
  "status": 409,
  "detail": "Project Period window overlaps with an existing 'REGISTRATION' period in this semester."
}
```

The actual response has **no `code` and no field `errors`**, and contains an internal trace ID. The raw response is retained in local evidence; trace/details are not rendered. No period was created. The old UI kept input but said only to try again. Repeating after the fix still returns409, keeps all input, shows a neutral conflict with advice to check code/time/status, and has no retry CTA.

## Final behavior

- Academic governance and policy share an academic-only error mapper. Stable known `STALE_CONCURRENCY_TOKEN` requests reconciliation. Uncoded governance409 is a domain conflict, not automatically classified as overlap or stale version. Policy409 keeps the existing locked-draft reconciliation path with neutral wording.
- 400/422 use allowlisted field keys for Vietnamese corrections adjacent to controls, with associated labels, `aria-invalid` and `aria-describedby`. Unknown keys and server prose are not displayed. Permission403 and expired401 are distinct; network/5xx offer retry. Errors use alerts and success notices remain statuses.
- Period/semester form values survive validation and conflict failures. Policy edits remain locked after409 until a fresh draft is explicitly selected. If the reconciliation read is denied, the permission error stays visible, stale history is removed, and the preserved input remains locked.
- Dates/policy calculations are unchanged; the UTC correction belongs to G2. Backend detail text is never matched to infer a business code, and neither details, trace IDs nor raw validation messages are shown.

## Required BE follow-up — proposed contract, not deployed behavior

The overlap response cannot be reliably distinguished from duplicate-code and other state conflicts by status alone. BE should return a stable identifier for create/update/activate period overlap, with optional allowlisted `startAt`/`endAt` field errors. Suggested name **`PROJECT_PERIOD_OVERLAP` is a proposal only**; production FE does not treat it as an agreed/deployed code. Once agreed and deployed, map it to the specific explanation and actions to choose another time or archive the old period, then rerun the live case. Current exact-overlap criterion is not marked PASS.

Source evidence: `AIPMS.Application/Features/Semesters/Commands/ProjectPeriodCommands.cs` throws bare conflicts for overlap; the existing shared stale identifier is in `Common/Exceptions/WorkflowErrorCodes.cs`. BE ownership is retained; no backend code was edited.

## Verification

| Check | Result |
|---|---|
| Targeted mapper/governance/policy | 3 files /22 tests PASS |
| Full suite | 267 files /1486 tests PASS |
| Typecheck / lint / build / diff | PASS; lint0errors/209 existing warnings; existing bundle-size warning |
| Live overlap replay | POST409 before/after; input retained, no retry, no new period |
| Browser | Overlap form and read-only policy view at390/768/1280/1440px; viewport measurements retained |

The tests cover uncoded overlap versus another conflict without parsing prose; known stale code; unknown/private field payloads; permission versus transient failure; retained form input; and policy reconciliation/denial. The full suite still contains the existing jsdom navigation informational line. Checks use process-only `VITE_API_BASE_URL=/api/v1`; user local configuration was not edited.

Local evidence outside Git: `E:/DOANTOTNGHIEP/output/fe2-feedback-2026-10-26/g5/`, containing before/after response JSON, screenshot sets, viewport measurements and technical logs. Folder retains26October to preserve links; follow-up measurements are27October local time. Policy validation/concurrency branches are tested with controlled transport, not claimed as live policy mutations. No policy was published or changed during browser checks.
