# AI-PMS Enterprise UI Design System — FAMS-inspired UX Standard v1.1

**Status:** UI guidance, not an academic policy or proof that every screen has been accepted. The canonical color values are implemented in `src/index.css` and documented in `design-system/ai-pms/MASTER.md`. FAMS is a visual reference only; AIPMS keeps its own logo, workflow and role permissions.

## 1. Product identity and visual direction

**Direction:** Modern Academic Operations SaaS — precise like an operations console, approachable to students, trustworthy for evaluators and faculty. Prioritize work clarity and information density over flashy marketing presentation. The product is multi-role and multi-major but uses one brand, shell, component library and interaction language.

Visual attributes: quiet surfaces, clear typography, measured color, generous but purposeful spacing, consistent shape, semantic status, deliberate empty space, informative charts, minimal motion. If university branding is officially required, adapt the semantic token mapping without modifying business states.

**Do not use:** giant marketing hero in authenticated workspace; random full-page gradients; 8 different button shapes; emoji navigation; noisy shadows; blurry glassmorphism over data; charts with no source/legend; duplicated icons and labels; low contrast; walls of similarly weighted cards; fake live status or fictitious AI prediction; a new visual framework for each route.

## 2. Semantic design tokens

Use the existing Tailwind `@theme` map in `src/index.css`; do not create parallel color systems. The brighter FAMS orange is decorative, while action orange meets text contrast:

| Group | Token | Value |
|---|---|---|
| Surface | `--color-canvas` | `#F8F9FB` |
| Surface | `--color-card` | `#FFFFFF` |
| Surface | `--color-primary-subtle` | `#FFF3EB` |
| Text | `--color-ink` | `#222836` |
| Text | `--color-ink-muted` | `#647083` |
| Text on action | white | `#FFFFFF` |
| Border | `--color-line-strong` | `#CED3DC` |
| Action/focus | `--color-primary` | `#C2410C` |
| Decorative orange | `--color-attention-border` | `#F37021` |
| Semantic success text | `--color-status-success-text` | `#0B7B52` |
| Semantic warning text | `--color-status-warning-text` | `#A94808` |
| Semantic danger text | `--color-status-error-text` | `#BE2638` |
| Categorical blue | `--color-tag-se` | `#1D4ED8` |

Status surface tints shall be distinct from status text colors; contrast must be tested for each combination. Do NOT equate danger(red) with REJECTED always, nor green with VERIFIED without text labels. Dark theme optional only after coherent light theme and exhaustive state coverage.

| Token family | Scale |
|---|---|
| Space (4px base) | 4 / 8 / 12 / 16 / 24 / 32 / 40 / 48 / 64 |
| Radius | control 8px; card 12px; dialog 16px; pill 9999px |
| Type | H1 28–32px; H2 22–24px; H3 18–20px; body 14–16px; helper 12–14px |
| Line-height | body 1.45–1.6; display 1.15–1.3 |
| Control height | compact 36px; default 40–44px; touch 44px or more |
| Layout | sidebar ~240–256px; topbar ~64px; content max 1440px; contextual sidepanel 360–440px |
| Responsive starting points | <640 small; 640–1023 medium; >=1024 wide (adapt to existing product) |
| Animation | 120–200ms microinteraction; reduced-motion disable/reduce |
| Z-index | document semantic layers in one map (sticky/nav, dropdown, drawer, modal, toast) |

Use semantic tokens in code (e.g. `var(--surface-default)`) rather than copying hex to components. Typography should support Vietnamese diacritics; prefer a single clear sans family if no approved brand font. Numeric columns use tabular numerals and units; prevent percent/score misinterpretation.

## 3. Layout and navigation foundations

- **AppShell:** one consistent sidebar/topbar, current organization/semester/project context, notifications, profile, mobile nav. Active navigation indicates route, not just hover. Project selectors cannot accidentally mix scopes.
- **PageHeader:** breadcrumb, clear title, one-line descriptive context, small state badge, ONE primary CTA, optional secondary menu. On small screens CTA remains reachable without hiding contextual information.
- **Progressive disclosure:** display next action and top priority first, reveal detail in tabs/drawers; do not replace simple detail pages with unnecessary modal mazes.
- **Dashboard:** focus on what the role can/should do next, upcoming deadlines, blockers, actual data freshness, scoped metrics; avoid 12 repetitive metric cards.
- **Workspace:** shared project scope, discipline filters as views. Not separate pseudo-projects. Show responsible major, supporting discipline, assignee, evidence and dependencies when available.
- **Data tables:** search, stable sort, URL-persisted filters, clear column semantics, pagination/virtualization for large sets, sensible truncation and detail view. Mobile: deliberate card/stacked alternative or accessible horizontal scrolling scoped to table, not body.
- **Empty states:** separate truly empty data vs filtered zero vs unauthorized vs insufficient evidence. Each provides truthful explanation and permitted next step.
- **Page structure:** use semantic landmarks `header`, `nav`, `main`, `aside`; consistent width and heading hierarchy. Sticky headers must not obscure keyboard focus.

## 4. Component system — one standard for every shared component

Every component must document `purpose`, `variants`, `size`, `content rules`, `states`, `keyboard behavior`, `accessible name`, `responsive behavior`, `data/permission dependency`, `error handling`, `automated tests`.

| Component | Non-negotiable design/behavior |
|---|---|
| Button/IconButton | primary/secondary/tertiary/destructive; visible label or screen-reader label; clear disabled reason; loading blocks duplicate submit |
| Link/Breadcrumb/NavItem | links navigate, Enter works, active state, focus visible; no clickable `div` as substitute |
| Input/Textarea/Select | persistent label, hint, validation, required status, ARIA association; do not rely solely on placeholder |
| Date/Time/Deadline | locale, timezone, visible academic window and allowed range, disabled explanations |
| Radio/Checkbox/Switch | radio single-choice, checkbox multi-choice, switch immediate persisted toggle with feedback; no misleading toggles for one-time submit |
| Search/Filter/Sort | URL query deep-links, clear/reset, count of active filters, visible loading and zero-results |
| Table/Pagination | stable key, understandable header, sort direction, row actions, selected count, non-lossy long names |
| Card/Stat/KPI | clear label, numeric source/time period, unit, trend not mere color, not display `0` for no data |
| Badge/Status | state name, semantic tone, optional explanation; state doesn't imply user authority |
| Tabs/Accordion | keyboard arrows where applicable, active indicator, deep-link if route-relevant |
| Modal/Dialog/Drawer | autofocus appropriately, focus trap/restore, Esc except mandatory blocking dialogs, labeled title, destructive confirm scope |
| Toast/Alert/Banner | announce status, distinguish transient vs persistent warnings; don't hide critical validation solely in toast |
| File upload | accepted MIME/size policy, progress, failure retry, privacy, version and evidence provenance after upload |
| Timeline/Gantt/Kanban | task dependencies, overdue, status, keyboard alternatives to drag, filter, empty/error state |
| Chart | title, time scope, legend, source and freshness, chart/table equivalent, insufficient-data state |
| Rubric score editor | stage vs scope separation, criterion guidance, assignment gate, autosave/finalize distinction, pending vs zero |
| AI insight | advisory label, source/freshness/data confidence if available, actionable human next step, unavailable fallback |

## 5. Page-level hierarchy patterns

**Student entry/registration:** stage progress indicator -> next permissible action -> eligibility and missing prerequisites -> team/project detail -> history. For INTERDISCIPLINARY show per-major quotas/verified majors and participating reviews, not just one generic 'eligible' badge.

**Department review:** actionable queue -> filter by department/period/decision state -> detailed project/major requirements/snapshot -> required cross-department decisions -> approve/revision/reject with auditable reason and confirmation.

**Supervisor:** triage assigned projects by verified risk/deadlines -> work needing review -> progress/evidence -> feedback and follow-up actions -> contextual AI advisory summary.

**Evaluator:** assigned evaluations only -> project + frozen rubric version -> clear COMMON/MAJOR_SPECIFIC/INDIVIDUAL scope and stage -> criterion evidence -> draft score -> submit evaluation -> published result (not preview confused as official).

**Admin:** infrastructure health, account/RBAC/org operations and audit; should NOT inherit academic grade publish privileges just due to being platform admin.

## 6. Accessibility and implementation guard

WCAG 2.2 AA is a release target, not a blanket claim of compliance. Validate 4.5:1 standard text, 3:1 large text, relevant non-text contrast and WCAG target exceptions. Keyboard + screen reader names, focus management, skip navigation, logical reading order, zoom to 200%, high contrast, reduced motion, long Vietnamese translation, date/time semantics and icon-only labels are mandatory QA checks.

Do not install shadcn, Radix, MUI, AntD or Tailwind automatically. Audit existing primitives first, then reuse or migrate via an approved RFC with rollout costs and risks. All shared class names/tokens must be discoverable and documented.
