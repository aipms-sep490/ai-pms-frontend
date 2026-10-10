# AI-PMS Design System Master

## Scope and precedence

This is the source of truth for AI-PMS workspace UI. Before changing a page, read this file and then check `design-system/ai-pms/pages/<page-name>.md`; a page override takes precedence when present.

This system is for the authenticated academic-management product, not a marketing site. Preserve backend authority: colors communicate state and urgency, never grant permissions or imply a state transition.

## Product model

AI-PMS coordinates the student project lifecycle, supervisor workload, academic review, milestones, reporting, deliverables, meetings, and human evaluation. Use a dense, calm, evidence-first dashboard hierarchy:

1. Academic context and current project state.
2. Work that needs a human decision or attention.
3. Authoritative data and next valid navigation.

## Semantic palette

| Role | Token | Value | Use |
| --- | --- | --- | --- |
| Institutional primary | `primary` | `#0F5B4E` | Navigation, primary actions, active focus, trusted context |
| Primary hover | `primary-hover` | `#0A493F` | Hover and pressed primary controls |
| Primary subtle | `primary-subtle` | `#EDF3F0` | Headers, selected context, low-emphasis primary surfaces |
| Ink | `ink` | `#14201D` | Primary text and headings |
| Ink soft | `ink-soft` | `#3D4A46` | Secondary emphasis text |
| Ink muted | `ink-muted` | `#596863` | Supporting text, metadata, captions |
| Line | `line` | `#E5ECE8` | Soft dividers inside cards |
| Line strong | `line-strong` | `#D7E0DC` | Card and section borders |
| Canvas | `canvas` | `#F8FAFC` | Application background |
| Card | `card` | `#FFFFFF` | Readable data surfaces |
| Hairline | `hairline` | `#E2E8F0` | Input boundaries and table rules |
| Success | `status-success-*` | emerald family | Verified, completed, no attention required |
| Warning | `status-warning-*` | amber family | Due, blocked, pending human attention |
| Error | `status-error-*` | red family | Failed loading, validation, forbidden/error feedback |

Rules:

- Primary green is structural (navigation, primary action), not a success signal; success uses the `status-success-*` tokens.
- Status (emerald) green means a confirmed positive state only.
- Amber means attention or a pending decision, never a destructive outcome.
- Red means error/destructive feedback only.
- Status must include a visible label and, where helpful, a consistent icon; never rely on color alone.

## Existing type and component contract

- Keep `Geist` for body, `Plus Jakarta Sans` for headings, and `JetBrains Mono` for compact metadata. Do not introduce a serif or external font solely for the academic tone.
- Reuse `Button`, `Badge`, `Card`, `AppLayout`, `Sidebar`, and `TopHeader`; update these primitives before adding page-local copies.
- Use registered Tailwind semantic utilities such as `bg-primary`, `text-ink`, `text-ink-muted`, `border-line`, `border-hairline`, `bg-card`, and `bg-status-warning-bg`. In CSS use `var(--color-*)`. Do not repeat raw palette hex values in workspace components or page CSS.
- Minimum text size is 12px (`text-xs`). Do not use `text-[10px]`/`text-[11px]` or `font-size` below 12px.

## Interaction and accessibility

- Use visible `focus-visible` rings based on `primary`; do not remove focus outlines without a replacement.
- Primary and icon-only controls require at least 44px targets. Preserve `motion-reduce` fallbacks.
- Use `role=status`/`aria-live` for loading and `role=alert` for errors. Keep retry adjacent to the failed state when a safe retry exists.
- Keep dense dashboards scannable with 8px spacing increments, plain language labels, tabular values where appropriate, and responsive grid collapse at 375, 768, 1024, and 1440 px.

## Workspace layout pattern

Each workspace should follow: context header -> authoritative state/metrics -> scoped work queue or form -> related navigation. Use white cards on the canvas, restrained `shadow-xs`, and border separation instead of decorative gradients or colour-only grouping.

## Forbidden patterns

- Do not add a page-local palette that conflicts with the semantic roles above.
- Do not use a color change to represent a backend mutation that has not occurred.
- Do not use layout-shifting hover effects, uncontrolled animation, or invented AI-approved states.
- Do not add persistent data, routes, or permissions while applying visual consistency.

## Delivery checklist

- Verify keyboard focus, contrast, loading/empty/error states, and reduced motion.
- Verify no horizontal page overflow at 375, 768, 1024, and 1440 px.
- Run lint, typecheck, relevant tests, build, and `git diff --check`.
