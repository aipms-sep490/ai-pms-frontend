# AIPMS — FAMS palette and branch flow check (16/11/2026)

## Scope and evidence

- FE: `feat/fe-fresearch-reference-20261113`; BE: `feat/be-access-audit-20261113`. No PR, merge, deploy or database migration is part of this pass.
- The 144-route census and `SCREEN_SOURCE_CUES.generated.csv` are **source inventory**, not a claim that all 144 screens were exercised with authenticated users. The source scanner counts direct cues in page files and can miss child components.
- BE build: 0 warnings/errors; BE unit: 1,332 passed. FE production build passed; final full Vitest: 331 files, 2,202 tests passed. Workflow Playwright: 6 passed at 375, 768 and 1,440 px after fixing horizontal page overflow. FE lint exits 0 with 241 existing advisory React warnings; the production build warns about two existing chunks over 500 kB.
- FE vendored contract lock matches **48 examples from BE branch HEAD** when `AI_PMS_BACKEND_DIR` points to this BE worktree and `AI_PMS_BACKEND_REF=HEAD`. The default `pnpm run check-contracts` compares against another checkout's `origin/develop` and fails because it answers a different question. Do not sync from develop into this feature branch.

## Visual rules applied

| Use | Token | Hex | Rule |
| --- | --- | --- | --- |
| App canvas | `--color-canvas` | `#F8F9FB` | Light, neutral workspace |
| Card | `--color-card` | `#FFFFFF` | Readable content surface |
| Headings | `--color-ink` | `#222836` | Charcoal text |
| Primary action | `--color-primary` | `#C2410C` | Orange with white-text contrast |
| Brand accent | `--color-attention-border` | `#F37021` | Decorative orange, not white-text button |
| Action tint | `--color-primary-subtle` | `#FFF3EB` | Selected navigation and callouts |
| Success | `--color-status-success-text` | `#0B7B52` | Status only, with text label |
| Warning | `--color-status-warning-text` | `#A94808` | Status only, with text label |
| Error | `--color-status-error-text` | `#BE2638` | Error feedback |

The shared shell and many role pages consume `src/index.css` tokens. Additional literal greens/greys in shared loading, segmented controls, calendar, Cold reports, assistant, notifications and interaction effects now consume those tokens. Motion timing and reduced-motion behavior remain. Blue/purple/green categorical tags retain their meaning; the AIPMS logo is unchanged.

Visual evidence: [login desktop](previews/fams-login-desktop.png), [login mobile](previews/fams-login-mobile.png), [Cold workflow fixture](previews/fams-workflow-desktop.png), [task board desktop](previews/fams-task-board-desktop.png), [task board mobile](previews/fams-task-board-mobile.png). Login screenshots show the expected Google fallback because the isolated local preview has no authentication API. Workflow/task-board screenshots use explicit fixtures and do not represent authenticated BE data.

## Validation and interaction corrections

| Area | Previous problem | Correction | Boundary |
| --- | --- | --- | --- |
| Academic organization/department/major form | FE hint allowed a dot in code; BE allows only alphanumeric, `_`, `-`. Required/server errors were only generic. | FE matches BE code/length rules, marks the right input, provides inline explanations, preserves the draft and safely maps BE 400/422 fields. | BE remains the authority for uniqueness, scope and concurrent edits. |
| Login | Invalid email highlighted both credential fields. | Email/password requirements attach to the correct field and clear on edit; 401/403/429/network retain distinct safe messages. | No live identity provider verification in this pass. |
| Meeting history filter | `Date.parse` could normalize an impossible date from a URL. | Canonical calendar-date check rejects impossible dates while retaining historical dates for filters. | New meeting creation still requires a future start; history filters are not subject to that rule. |
| Final Package feedback | A 400/422 response displayed raw BE `problem.detail`, which could contain implementation text. | FE now shows safe guidance to review checklist, selected version and deadline; unknown blocker codes receive a neutral explanation. | The BE checklist and version rules remain authoritative; BE-16 policy is preserved. |
| Kanban board | An absolutely positioned screen-reader label in a horizontally scrollable card expanded the whole document. | The label now anchors to its card; the board alone scrolls horizontally. | Playwright confirms no document overflow at 375/768/1,440 px. |

## Business flow cross-check

| Actor | Current branch flow and authority | Source check | Remaining runtime proof |
| --- | --- | --- | --- |
| Student/leader | Use the Project Period context, create group work and submit Gate evidence. Final Package uses the existing BE-16 leader/current-period window and configured deliverable rules; Cold package/readiness and Defense are separate stages. | FE student routes in `src/app/router/index.tsx`; BE `FinalSubmissionRules.cs`, `ReviewGateService.cs`, `ColdSubmissionService.Progress.cs`. | Complete an authorized single- and interdisciplinary project journey against a designated environment. |
| Lecturer | Supervisor/mentor rights are project assignments. A lecturer may evaluate another project but is blocked from evaluating a project they actively supervise. Gate 1–3 reuse the same two reviewer identities. | BE `ReviewGateService.cs` fixed panel and supervisor checks; FE assignment and Gate routes. | Test a real multi-role account across two projects and every 403/409 transition. |
| Department staff | Configure Gate/rubric via workbook preview/commit; manage versioned major documents; build and confirm a Defense committee; only confirmed members can receive Cold evaluation assignments; Cold completion gates scheduling. | BE `ReviewGateService.Workbooks.cs`, `DepartmentDocumentService.cs`, `AcademicTrackingService.Defense.cs`, `EvaluationSchemeService.cs`, `ColdSubmissionService.Progress.cs`; FE department routes. | Readback with scoped staff accounts, file permissions, committee supersession and scheduled room conflicts. |
| Admin | Account/role assignments and cross-organization oversight are distinct from a department's academic decisions; UI actions remain subject to BE permission/scope. | BE `UsersController.cs`/user-role collection and admin routes; FE admin route guard and management screens. | Verify real accounts with multiple roles and cross-organization denial. |

The BE code requires a confirmed Defense committee and Cold readiness before manual Defense scheduling. The fixed Gate reviewer and supervisor constraints are checked in BE; FE visual guards are guidance only. Document preview currently reads PDF/images and bounded DOCX text/XLSX grid; it does not reproduce full Word/Excel layout.

## Open acceptance work

1. Authenticated browser acceptance across the 144 routes and actual role/scope fixtures remains open. Existing source inventory and mock Playwright do not satisfy it.
2. **Policy decision confirmed by the user in this pass:** preserve BE-16. Final Package does not gain an inferred Gate 3 PASS prerequisite, and eligible selected versions remain `SUBMITTED` or `ACCEPTED` per BE-16. The reference guide's stronger proposal is not applied as a silent business-rule change. UI copy and acceptance cases must follow BE-16.
3. Full Office-layout fidelity and Google identity-provider behavior were not verified in the isolated preview.
4. Production/shared DB migration, deployment, PR and merge are paused by the user's latest direction. This pass changes no DB schema or data.
