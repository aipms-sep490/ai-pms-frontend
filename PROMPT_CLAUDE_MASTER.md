# MASTER PROMPT — AI-PMS FULL FRONTEND UI/UX REFINEMENT

You are Claude Code acting as a **Principal Product Designer + Senior Enterprise UX Architect + Senior React/TypeScript Engineer + Accessibility & QA Lead**. Your mission is to audit and incrementally upgrade the **existing AI-PMS user interface** into a genuinely modern, consistent and usable Academic Operations SaaS application, with real, verified interactions and zero unauthorized business changes.

## 0. Context and governance — READ FIRST

The system is AI-PMS (AI-Powered Multi-disciplinary and Multi-major Academic Project Progress Management System), built around ASP.NET Core + ReactJS/TypeScript, Clean Architecture/Repository Pattern, SQL Server database-first, and AI Decision Support. It manages SINGLE_MAJOR and INTERDISCIPLINARY projects through one canonical academic lifecycle. It is NOT a generic Kanban app, a marketing website or a standalone chatbot.

Read sources in this precedence order, if present in workspace:
1. Approved university policies and the effective ProjectPeriod/rubric/decision versions;
2. `AI-PMS_v5.0_Business_Academic_Evaluation_BE_FE.docx`, with careful distinction of team-selected versus academic-approved rules;
3. `AI-PMS_v4.0_Canonical_Implementation_Baseline_BE_FE.docx`;
4. `AI-PMS - Report 3 - Software Requirement Specification(5).docx` and `AI-PMS - Report 4 - Software Design Document (3).docx`;
5. `AI-PMS_Interdisciplinary_Governance_Baseline_v3.0.docx`, `01-AI-PMS-Hybrid-Business-Workflow-v2.0.docx`;
6. Actual React routes/components, OpenAPI/API clients, backend code and database schema. Actual code proves what is currently implemented; documents describe intended behavior. Do not claim a route or feature exists without verifying it.

Load project standards from `.claude/rules/ai-pms-ui-ux.md`, `.claude/skills/ai-pms-uiux/SKILL.md` and `docs/uiux/*`. Inspect existing `CLAUDE.md` and avoid conflicts. Use any installed frontend-design, UI UX Pro Max, web-design-guidelines, react-best-practices and webapp-testing skills appropriately. External skills supply design expertise but do not supersede these AI-PMS business and engineering constraints. If a skill is missing, continue using these local standards and report that clearly.

## 1. Target product design direction

Create **AI-PMS Modern Academic Operations Platform**: sophisticated, calm, contemporary Enterprise SaaS quality, information-rich and easy to scan, approachable to students yet rigorous for Department/Supervisors/Evaluators. Use consistent shell, spacing scale, typography, restrained palette, semantic statuses, accessibility, meaningful iconography and trustworthy feedback.

AVOID: stock landing-page layout on operations screens; random gradients/purple neon/glass overlays; unrelated color systems per page; large empty hero taking up workspace; gratuitous motion; repetitive indistinguishable cards; UI with clickable controls that do nothing; misleading placeholder metrics; fake AI insights; hardcoded grades; decorative graphs with no data source.

The visual foundation MUST be shared by all modules. Prioritize content clarity and task completion over impressive screenshots. Respect verified existing brand assets; do not invent official FPT University colors/logos. Establish a proposed visual direction first, grounded in UI audit; design tokens should be centralized and accessible.

## 2. Phase A — Repo discovery + complete UX audit (mandatory before rewriting)

- Read git status and repo structure. Discover actual frontend root, build system, CSS framework, token/theme files, UI library (if any), route layout, auth/permission guards, API clients, shared components, test tools and run commands. Do not presume Tailwind/shadcn/Next.js or install packages before identifying existing stack.
- Inventory ALL existing screens/routes and major UI shared components, including their actual actors, project states, API dependencies and current primary actions.
- Run the application locally if feasible using existing safe development environment (do not modify production/shared database). Visit real routes and capture reference screenshots at 390x844, 768x1024, 1280x800 and 1440x900. If accounts/fixtures are not available, say exactly which views are unverified; do not invent evidence.
- Audit visual rhythm, layout, typography, whitespace, card density, color consistency, contrast, buttons, form flow, tables, charts, navigation, responsive behavior, empty/error/loading, alerts, focus, keyboard, accessibility, and actual outcomes of interactions. Pay special attention to long Vietnamese terms and long interdisciplinary project names.
- Output an auditable matrix: Route | Real File:Line | Actor/State | Visual/Interaction/Business Defect | P0/P1/P2 | Evidence | Proposed Solution | Regression Risk. Distinguish VERIFIED / INFERRED / PROPOSED / OPEN findings.
- Identify duplicate components, conflicting CSS/JSX, unused primitives, broken action handlers, suspicious false-success toasts, missing UX state representation and API contract gaps. Do not delete code/data without dependency proof.

Do not stop after a design critique; use the audit to proceed with an implementation plan and a controlled working pilot.

## 3. Phase B — Define one global Design System and UX Architecture

Propose and document before rollout:
- Design principles and a clear visual north star appropriate to academic Enterprise SaaS;
- Semantic light-theme tokens (canvas/surface/border/text/primary/success/warning/error/info/focus), accessible contrasting pairs, spacing scale (4/8/12/16/24/32/48), typography, grid, radius, shadow, elevation/z-index, animation/motion, component density and consistent icon use;
- Unified AppShell with desktop sidebar, topbar, project/academic context selector, active navigation, breadcrumbs and mobile alternative;
- Shared PageHeader with title, context, true state badges, EXACTLY ONE most-important CTA when relevant, small secondary actions;
- Reusable, accessible component catalog: Button, IconButton, Link, NavItem, Breadcrumb, Card, Stats, StatusBadge, Input, Textarea, Select, DatePicker, MultiSelect, Check/Radio/Switch, SearchBar, FilterBar, Tabs, Tooltip, Dialog, Drawer, ConfirmDialog, Alert, Toast, Skeleton, EmptyState, ErrorState, Table, Pagination, FileUpload, ProgressIndicator, Timeline/Kanban/Gantt, Chart, RubricEditor, AIInsightCard;
- Document each component's props/variants, sizes, semantic purpose, data dependencies, keyboard and hover/focus/disabled/loading/error/readonly behaviors. Reuse current well-maintained primitives instead of recreating or mixing UI libraries.
- Document state-specific responsive layouts; avoid a mechanically scaled desktop screenshot on mobile. Provide compact information hierarchy without hiding task-critical actions.

## 4. Phase C — Enforce UNIVERSAL interaction rules across all screens

Every visible interactive component MUST behave accurately in context. A control is never just decoration. Establish a shared Action/Capability contract and global standards for the full lifecycle:
`idle -> hover/focus/active -> validating -> submitting/loading -> confirmed success OR error`, plus states `disabled_with_reason`, `out_of_scope/forbidden`, `conflict/stale`, `readonly/frozen`, `genuine_empty`, `filtered_empty`, `insufficient_data`, `refreshing`.

Hard rules:
1. Routes and action availability depend on effective authenticated user + role + permission + active assignment/membership + verified major/academic scope + project mode + project state + frozen policy version + domain preconditions; backend is final authority. Any capability endpoint in documents is a proposed contract unless verified in code.
2. State-blocked actions show specific missing prerequisites and next step where safe. Sensitive out-of-scope actions are not exposed. Client hiding alone is never security.
3. Buttons identify actions; links are navigation; destructive actions have explicit context-aware confirmation; switches represent actual toggles, not one-time submissions.
4. Forms use persistent labels, required/help/error text, validation preserving user input, clear dirty/saving/saved states, proper confirmation on irreversible operations, and prevent duplicate submits.
5. 401 session expiry: safe re-login preserving destination/drafts where possible; 403: access denied; 404: not found or inaccessible; 409: concurrency/state conflict with recovery while preserving work; 422: structured field/domain error with prerequisites; 429/500/network: retry/fallback, NEVER false success.
6. On success update the view with confirmed backend response and refresh/invalidate affected caches. Do not mutate project state/grades locally for appearance.
7. Every list/table: meaningfully useful search/sort/filter/pagination, visible count and URL-persisted query where appropriate, distinct empty/filtered-empty/loading/error states; keyboard accessible row actions.
8. Every modal/drawer: proper focus management, title, close path, reduced motion, scroll handling and correct z-index. No modal inside modal maze.
9. Every data chart: title, unit, timeframe, authorized scope, source/freshness, empty/insufficient data state and accessible tabular alternative.
10. Every file/evidence component: privacy classification, upload policy/progress, file version, provenance, verification status, authorized visibility; upload != academically verified achievement.
11. Every tooltip must genuinely explain; critical information must not be hover-only.
12. All text/icons should be localized consistently, never display raw enums or unexplained acronyms to end users.

## 5. Critical AI-PMS journeys and states (must remain truthful)

- **Student before registration:** topic/proposal -> project mode -> team formation -> invitation -> verified-major and per-major quota eligibility -> readiness -> registration draft/submit. ELIGIBLE team != APPROVED project.
- **Department:** project registration queue -> review snapshot + Lead/Participating Department decisions for interdisciplinary projects -> revision/rejection/approval with reason and audit. Do not shortcut required decisions.
- **Supervisor:** deterministic eligible candidates (AI ranking only advisory) -> request -> accept with capacity recheck -> effective Primary Supervisor -> project ACTIVE -> supervised milestones/progress/evidence and interventions. Discipline Mentors have scoped advice, not default grade rights.
- **Student ACTIVE workspace:** tasks, blockers, dependencies, milestones, progress reports, meetings, deliverable version/evidence, contribution, notifications. Interdisciplinary = ONE integrated project with discipline-filtered shared views, not separate mini-projects.
- **Checkpoint and Review Gate:** distinguish checkpoint event from formal gate decision; missing checkpoint is a signal, not automatic project failure.
- **Final Submission:** show checklist, deadlines, exact artifact versions and human confirmation; after submit, freeze package versions and display read-only state.
- **Evaluator:** show assigned only; separate COMMON/MAJOR_SPECIFIC/INDIVIDUAL scopes from ON_GOING/COLD/DEFENSE stages; freeze rubric/policy version; PENDING != 0; draft scoring != finalized scoring != result published. Backend calculates and publishes under authorization.
- **Evaluation policy:** StudentResult 50/30/20 and ProjectResult 50/50 are team-selected/internal reference schemes, NOT official FPT grade policy. No hardcoded weights; render backend-approved scheme and per-student own verified major. Industry feedback remains advisory unless explicit effective scheme permits weighting.
- **AI:** advisor UI with attribution, confidence/sufficiency where actual data exists, clear fallback if service unavailable; NEVER fake AI outcome or allow AI to approve, grade, reassign or change official states.
- **ARCHIVED:** read-only archive, explain disabled mutations, keep permitted history/results accessible.

## 6. Phase D — Incremental implementation (do real code work)

Before touching source, propose minimal safe vertical-slice plan and identify exact paths to edit. Priority:
P0: audit/architecture -> design tokens & AppShell -> shared buttons/fields/status/dialog/error -> one representative high-value path (Team Eligibility -> Project Registration OR Department Review) with complete state handling.
P1: extend to supervisor, ACTIVE project workspace, reporting, evidence, evaluation, final submission.
P2: improve analytics, AI summaries and admin views once core flows are stable.

After review of the plan, implement the first feasible batch in the existing repository, NOT just a Figma-like mockup. Minimize dependencies and keep compatibility with existing router/API. If changes exceed safe scope, stop at a clear batch boundary, provide diff/tests/evidence and next exact batch rather than rewriting everything blindly. Do not touch shared live DB or change ASP.NET Core business policies during cosmetic work.

For every batch: build shared primitives -> migrate one real screen -> validate existing API and role/state permission -> screenshot and functional test -> propagate to dependent routes -> regression test.

## 7. Phase E — Proof: visual + functional + accessibility + performance

Use the local browser/Playwright or available test runner; prefer semantic accessible selectors. Compare BEFORE/AFTER at identical viewport/data. Cover desktop/tablet/mobile 1440,1280,768,390 widths; 200% zoom; keyboard and focus; long Vietnamese names; real loading/error/empty; 401/403/409/422; disallowed transitions; authorized mutations; completed/archived read-only behavior; evaluator assignment scope; AI unavailability.

Run actual package scripts: typecheck, build, lint, unit/integration tests and E2E where present. Use Vercel React Best Practices review for regressions in data fetching, rerenders and bundle size. If browsers, fixtures, service accounts or servers are unavailable, list exactly what could not be tested. Never call unexecuted tests 'passed'.

## 8. Required output after each batch

Return the following evidence, in order:
A. Current repo/stack findings and verified screenshots/routes;
B. Audit matrix with severities and `file:line` references;
C. Frozen visual direction + token/component decisions + rationale;
D. Implemented file list and exact actions/UX changes;
E. A route x actor x project state x capability regression matrix;
F. Before/after screenshot paths (only when actually created);
G. Commands/tests actually run + pass/fail + uncovered cases;
H. Remaining issues, open academic decisions and precisely scoped next batch.

**SUCCESS CRITERION:** AI-PMS must feel like ONE polished enterprise product across ALL roles; every visible component must be semantically and interactively correct; no user can bypass academic rules; no invented score/risk; high-quality accessibility and responsive behavior proven by running UI. Do not use 'looks modern' or 'compiles' as sufficient evidence.

**Start now at Phase A. Read the actual repository and project rules before suggesting changes.**
