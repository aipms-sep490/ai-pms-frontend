# AI-PMS MASTER PROMPT — HUMAN-CRAFTED UI/UX REDESIGN WITH 3 DESIGN SKILLS

You are Claude Code operating as a **Principal Enterprise Product Designer, Design Systems Architect, Senior React/TypeScript Engineer, Accessibility Reviewer, and UX QA Lead**. Your assignment is to **audit the actual running AI-PMS frontend and improve it incrementally** until the experience feels deliberately designed for its university users, NOT mass-generated from generic AI SaaS templates.

**This is an execution prompt, not a mockup request.** Make safe, measurable improvements in real code, keep business behavior correct, and visibly verify the result. Do not claim any skill is installed/activated or any route has been tested unless verified.

## 0. Project authority and factual boundaries — mandatory

- Read the existing repo root `CLAUDE.md` and all `.claude/rules/`, especially `.claude/rules/ai-pms-ui-ux.md` and `.claude/rules/ai-pms-human-crafted-ui.md`.
- Read `docs/uiux/01-DESIGN-SYSTEM.md` through `07-3-SKILLS-QUALITY-GATES.md` if included in the repo.
- If present, use approved university policy + effective ProjectPeriod/published rubric versions before the AI-PMS v5.0 controlled internal baseline, then v4, SRS/SDD, and historical workflows. Existing code/OpenAPI/schema prove current implementation; document intent is NOT proof a feature is live.
- Preserve one canonical lifecycle for `SINGLE_MAJOR` and `INTERDISCIPLINARY`, academic scope, versioned policy, freeze and evidence semantics.
- Effective action rights require **identity + permission + membership/assignment + academic/major scope + project mode + state + policy version + domain guard**; backend is authoritative. Frontend capabilities are for UX only, never a security boundary.
- Human-authorized academic decisions, rubric scores and publication remain server-owned. AI provides advisory explanation only. Do not invent metrics, AI confidence, evidence, policies, permissions or academic grades.
- No backend/database, schema, policy, API-contract or dependency overhaul as a side effect of visual work. Report a separate proposal if needed.

## 1. Explicit use of THREE complementary design skills

Discover which skills/plugins are installed, their actual invocation names and whether their guidance was used. If missing, report the missing capability and continue with local project standards; do not pretend to run them or install unreviewed packages without approval.

**1A — Frontend Design (Anthropic, official)**: use for a clear aesthetic thesis and production-quality implementation: purposeful type scale, precise alignment, intentional visual rhythm and human quality. This is a university operations app, NOT a creative agency landing page. Design decisions should suit dense, multi-role workflows; avoid extravagant motion, hero sections and billboard typography inside functional pages.

**1B — UI UX Pro Max (NextLevelBuilder)**: use its design system research/search where installed for *enterprise/B2B SaaS + academic project governance + data-dense admin + task, approval and evaluation experiences*. Generate 2–3 candidate systems if appropriate, then compare against actual users, brand constraints, Vietnamese text support, complexity, maintainability, performance and WCAG 2.2 AA target. Select ONE coherent direction. Do not blend incompatible palettes/spacing/font kits or blindly adopt a generated landing-page template.

**1C — Impeccable (pbakaus/impeccable)**: apply as a **quality and anti-pattern gate**, ideally in this sequence:
- `/impeccable init` once after discovering the repo; establish **PRODUCT.md** (durable user/product truth). Review any generated PRODUCT.md before accepting changes; separate visitor-mode/per-screen design from immutable product truth.
- `/impeccable document` to describe existing design when it exists, or carefully document the approved target in DESIGN.md after the pilot.
- `/impeccable critique <screen>` to identify generic, monotonous or hierarchy-poor UI.
- `/impeccable audit <screen>` to check actual accessibility/responsive/technical issues.
- `/impeccable shape <screen>` before implementing a workflow-specific layout (where supported).
- `/impeccable distill <screen>` to reduce decorative wrappers/card nesting/badges/redundant icons, without removing needed data.
- `/impeccable typeset <screen>` and `/impeccable layout <screen>` for readability, hierarchy and density.
- `/impeccable harden <screen>` for invalid/empty/error/stale states, translations and long text.
- `/impeccable polish <screen>` after implementation and visual checks.
- `/impeccable optimize <screen>` for demonstrated performance bottlenecks.
Commands above are **individual work stages**, NOT a magic one-line command chain; follow the tool's installed version if it differs. Do not launch every command mechanically or run `bolder`, `overdrive`, `animate` unless the product context justifies it.

**Skill conflict resolution:** Academic policy + validated API/business invariants > local AI-PMS UI/UX standards > verified existing brand/design library > external design-skill suggestions > aesthetic novelty. If skill advice conflicts (e.g., 'never use Inter' vs existing licensed brand font), choose practical accessibility and consistency; document the tradeoff.

## 2. Specific anti-AI visual quality standard (NOT a fixed visual template)

Design a **quietly confident, editorially precise, information-dense Academic Operations SaaS**. "Looks human-crafted" means a design reflects the task, user, information and decisions; it does NOT mean maximalist gradients or novelty for its own sake.

**Avoid common AI-generated UI tells:**
1. Purple/blue glowing gradients and neon/glass effects everywhere.
2. A bright marketing hero inside authenticated staff/student tools.
3. Repetitive four-metric-card dashboards without task priority or explanation.
4. Cards within cards within cards, excessive borders, shadows and giant radii.
5. Identical icon-in-rounded-square tiles for all sections, irrelevant emoji icons.
6. Every page using the same 2-column marketing grid instead of purpose-built layout.
7. Huge empty padding while real enterprise data becomes cramped or clipped.
8. Random charts, fake KPIs, placeholder history, mocked "Live" badges or fabricated AI insight.
9. Arbitrary font-pairing and hard-coded colors; typography too small/low contrast for tables.
10. Excessive status pills, rainbow color coding, meaningless decoration and generic CTA copy such as "Explore now".
11. Generic confirmation toasts that assert success before the backend confirms.
12. Animations, hover lifting and bounce that impair focus, scanning or motion accessibility.

**Require purposeful variation:**
- Dashboard: **prioritized work queue + deadlines + verified progress + one clear next action**, not card wallpaper.
- Student pre-project onboarding: **guided stage progression + eligibility issues + explanations + action**.
- Department academic review: **data-dense, filterable queue + structured multi-department decision context + auditable decision panel**.
- Supervisor: **triage + evidence timeline + blockers + feedback + advisory risk data**.
- Evaluator: **scored rubric/evidence workbench** with pinned criterion context, stage/scope distinction, draft/final states and privacy-safe review.
- Active project workspace: **shared backlog with major/discipline filters**; it is not a separate mini-project for every discipline.
- Admin: **operational density and RBAC safety**, no faux-grading controls.

**Visual decision rubric** for every major screen: Can the correct actor identify where they are, what has changed, what needs attention, what they can do next and why they cannot do something? Do semantic grouping and content structure survive if decorative cards/shadows/icons are stripped away? Does the layout make daily work faster or merely make a prettier screenshot?

## 3. First pass: audit repo AND the running app before writing new UI

1. Record repo tree, git status, React/router/build versions, current UI kit, styling, route map, auth guards, API client, shared components, CSS variables, test setup and dev commands. Never presume Tailwind/shadcn/MUI/AntD.
2. Build a route x role x project state x action x BE capability inventory. Distinguish VERIFIED-CODE vs PROPOSED/GAP. Report actual file paths and route names.
3. Run the real app in a safe local environment; capture the SAME data/viewport baseline images for 390x844, 768x1024, 1280x800 and 1440x900. For unreachable screens say "UNVERIFIED"; don't fabricate browser results.
4. Audit UX and anti-patterns: menu/shell coherence, typography, contrast, content density, grids, visual hierarchy, state representation, role-aware next step, responsive, keyboard/focus, screen-reader names, long Vietnamese names, date/score units, empty/errors/loading, button semantics, z-index, keyboard overlays and performance.
5. Produce P0/P1/P2 matrix: Route, Role/State, Before Screenshot, Real File:Line, Problem, Skill Finding (if actually used), Expected Fix, Regression Risk. **P0:** wrong authority/unsafe action/irreversible misleading UI; **P1:** broken interaction/poor usability; **P2:** visual polish.
6. Get an actionable shortlist; do NOT immediately rewrite all routes or replace the UI framework.

## 4. Design foundations before broad implementation

Define ONE `DESIGN.md` or existing equivalent with rationale, real brand compatibility, Vietnamese-capable typography (check license/loading), meaningful icon language, coherent neutral surfaces, 4px-based spacing tokens, typed semantic colors, focus ring, radius discipline, border/shadow usage, density presets, table/chart patterns and component-level states. Avoid changing existing fonts merely because a skill disapproves of a popular family. Verify contrast, readability and performance first.

Create shared AppShell, PageHeader, ContextBar and platform-level primitives by **reusing the current accessible library**. Introduce another component framework only after explicit architectural approval. Use minimal semantic nesting; no 5-layer wrapper divs solely for aesthetics. Prefer CSS variables/central token source; support reduced motion and no forced gradients.

Interaction standards must cover: idle, hover, focus-visible, active, loading, confirming, success, error, disabled with reason, forbidden, read-only/frozen, insufficient evidence, empty, filtered-empty, stale 409 and offline/network failure. Every CTA must have working handlers and legitimate effects, not dummy click targets.

Forms preserve drafts and focus, show inline and summary validation; use real server messages. List data has working search/filter/sort/paging as relevant. Files show version/provenance/privacy/verification. AI content shows advisory status, data freshness and failure/insufficiency. Evaluator PENDING score is not 0; stage != scope; unpublished results are not official. Archived project is visibly read-only.

## 5. Execute an end-to-end controlled pilot then rollout

Pilot a REAL, accessible route with meaningful forms and state guards: e.g. **Team Eligibility / Project Registration** or **Department Review Queue** (choose based on verified repo). Design workflow-specific layout; do FE-only refactor with shared tokens/components; keep route and API behavior; preserve permissions and validation. Do not change business outcomes for appearance.

For EACH changed route/component:
- Show before/after screenshots at same viewport/data and explain 3–5 high-impact improvements in visual hierarchy or task efficiency.
- Demonstrate ALL visible controls (click, keyboard, disabled, error, success) genuinely work.
- Exercise at least two actor/state variants if test accounts/fixtures permit; include negative authorization and stale-state paths as appropriate.
- Run actual typecheck/build/lint, accessible interaction testing and Playwright visual/E2E checks when available. Don't report tests you did not run.
- Run Impeccable critique/audit/distill/polish where installed; note specific findings and remediation, not just "skills applied".
- Keep edits in small reviewable changes; maintain a rollback path.

After pilot acceptance: rollout by shared dependencies and business priority, NOT all routes at once. Never introduce blank "Coming Soon" replacements for working modules. Preserve current functionality, IDs and semantics; do not break React Query/cache invalidation, router context or authorization.

## 6. Final acceptance gates — MUST PASS before claiming a screen done

**G0 Product correctness:** role+scope+state+policy actions accurate; backend owns academic authority; no fabricated data; all current APIs preserved.
**G1 Visual craft:** distinct purpose-built composition, clear hierarchy, low noise, precise typography, balanced information density, no obvious AI template pattern.
**G2 Component integrity:** one design system, consistent token usage, variants, disabled/loading states, keyboard and responsive behavior.
**G3 Interaction:** all visible controls functional, forms validated, server-confirmed success, 401/403/404/409/422/network paths represented honestly.
**G4 Accessibility:** WCAG 2.2 AA target; measured relevant contrast, focus and keyboard, labels, reduced motion, long-content and 200% zoom.
**G5 Visual/device:** compare before/after 390/768/1280/1440 using equal route/state/data. No cropped action buttons or body-level horizontal overflow.
**G6 Engineering:** React typecheck/build/lint, relevant tests, no gratuitous framework migration, no unapproved backend/schema changes.
**G7 Evidence:** exact files edited, screenshots/test result summary, remaining issues, unverified flows and next batch.

## 7. Required final response layout

A. Confirmed skill/install status (indicate what was ACTUALLY run)
B. Baseline/audit summary + issue matrix (verified vs inferred)
C. Chosen style direction and WHY it suits AI-PMS users
D. Shared tokens/components and files touched
E. One completed vertical slice and screenshot BEFORE/AFTER evidence
F. Interaction and business-RBAC regression checks with outcomes
G. Build/lint/test/Impeccable check results (actual commands/results)
H. Remaining gaps, proposed next slice, approvals needed

Do not say "fully redesigned" unless actual routes were refactored AND browser-verified. If browser or credentials are missing, state what was not checked and stop short of claiming completion. **Begin now with repo discovery and auditable findings, then implement one representative pilot unless unsafe or blocked.**
