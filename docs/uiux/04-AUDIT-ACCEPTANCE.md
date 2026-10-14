# UI/UX audit method, evidence and Definition of Done

## Scope and review order

**Baseline:** Collect route list, component inventory, actual style tokens, desktop/mobile screenshots, trace of state/permissions per page, and bundle/test baseline. Separate `VERIFIED` (code/browser evidence), `INFERRED` (reasonable concern), `PROPOSED` (design choice), `OPEN` (needs product/academic decision).

### Audit dimensions (score each 0–4 based on evidence)

| Dimension | Weight | Examples |
|---|---:|---|
| Visual coherence & hierarchy | 15 | repeated tokens, titles, actions, density |
| Navigation and user journey | 15 | role/state-specific path, no dead-ends |
| Interaction correctness | 20 | actions, dialogs, failure paths, real state updates |
| Authorization & business state truthfulness | 20 | scoped actions, frozen states, reason codes |
| Accessibility and responsive design | 15 | keyboard, zoom, focus, contrast, mobile |
| React performance and maintainability | 10 | no waterfalls, shared primitives, safe cache |
| Content semantics and data integrity | 5 | time units, missing data, AI advisory labels |

Total score = sum(score/4 * weight). Treat it as a team diagnostic only, not proof of WCAG certification or production readiness. P0 defects override total score.

**P0:** unauthorized action/grade, false submitted state, lost form data in critical action, blocked mobile CTA, unusable workflow, privacy leak, project frozen incorrectly mutable.
**P1:** inconsistent shared component, keyboard/focus defect, poor responsive table, misleading empty/AI risk, unclear validation.
**P2:** decorative spacing, minor visual polish, low-priority motion, optional density settings.

### Evidence format

| Priority | Route | Role + State | Issue | Actual file:line | Screenshot | Proposed fix | Acceptance check |
|---|---|---|---|---|---|---|---|
| P0/P1/P2 | /... | ... | ... | src/...:123 | evidence/... | ... | ... |

If no browser access, screenshot field must read `NOT VERIFIED — browser unavailable`; do not invent screenshots. In report list which actual permissions/data combinations were tested.

## Required state coverage for every changed screen

`initial loading`, `successful loaded`, `empty`, `filtered empty`, `refreshing`, `API failure`, `invalid field`, `blocked by business rule`, `not authorized`, `state conflict (409)`, `success after mutation`, `readonly/frozen` as applicable. For permission-only routes, test direct deep link unauthorized, not just hidden nav.

## Mandatory viewport & accessibility passes

- 390 x 844 (mobile), 768 x 1024 (tablet), 1280 x 800 and 1440 x 900 (desktop).
- 200% browser zoom, long Vietnamese label, long multi-major title, narrow data tables, empty and many-row data.
- Tab through full route; all interactive controls visible focus; Esc and focus restore for dialogs; screen reader names/labels; contrast and icon-only accessibility; prefers-reduced-motion.
- Charts expose textual equivalent and data provenance. Drag-dependent tasks have keyboard and non-drag method.

## Critical E2E scenario map (use seeded authorized test accounts)

1. Student Leader creates SINGLE_MAJOR team, checks verified-major eligibility, submits registration only when allowed.
2. INTERDISCIPLINARY team displays per-major quotas; invalid composition explains exact missing prerequisites.
3. Participating Department required decision blocks premature Lead approval; a revised proposal displays correct audit history.
4. Supervisor accepts after eligibility/capacity recheck; project ACTIVE only when business engine confirms.
5. Member changes task / uploads evidence; blocker reason and permission enforced; monitor history.
6. AI service unavailable: task/progress data stays usable, insight displays insufficient/unavailable rather than fabricated answer.
7. Leader attempts final submission with unmet checklist: blocked; successful submission visibly freezes exact artifact versions.
8. Unassigned evaluator opens rubric URL: 403/denied; assigned evaluator scores only allowed scope; `PENDING` not 0; stage and scope distinct.
9. Publish result only after authorized completeness; archived project rejects normal writes.
10. Session expiry, concurrency conflict and domain validation preserve in-progress information when safe.

## Definition of Done for each component/screen

- [ ] No fabricated permission, score or data; business language and states accurately reflect backend.
- [ ] Visual tokens and shared components reused; no ad-hoc CSS without documented reason.
- [ ] Responsive/keyboard/zoom verified; semantic labels, focus and contrast confirmed.
- [ ] Real API and effect confirmed; no decorative action or false success toast.
- [ ] Loading/empty/filtered-empty/error/forbidden/blocked/readonly handled appropriately.
- [ ] 401/403/409/422 error semantics verified for actions at risk.
- [ ] Relevant unit/component/E2E and visual screenshot before/after checks passed, or clearly marked blocked.
- [ ] Build/typecheck/lint test results documented; no regression in role-scoped use cases.
- [ ] Diff is reviewable, no unrelated backend/DB/refactor changes.
- [ ] A concise handoff log records modified files, design decisions, screenshots and remaining risks.
