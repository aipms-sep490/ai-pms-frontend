# AI-PMS Design System Master — Academic Command Center Canonical Specification

## Scope and precedence

This is the source of truth for the AI-PMS Academic Command Center workspace UI. Before changing a page, consult this document and relevant sub-page specifications.

This design system governs the authenticated academic-management command center. Backend authority is preserved: visual indicators communicate authoritative state and urgency without granting unverified permissions or inventing client-side state transitions.

## Product model

AI-PMS coordinates the student project lifecycle, supervisor workload, academic review, milestones, reporting, deliverables, meetings, and defense evaluations. The UI employs a dense, calm, evidence-first dashboard hierarchy:

1. Academic context and current project state.
2. High-priority items requiring human decisions or attention.
3. Authoritative data and valid next actions.

## Semantic Palette (Academic Command Center)

| Role | Token | Value | Contrast & Use |
| --- | --- | --- | --- |
| Institutional primary | `primary` | `#087D77` | 5.12:1 on white. Primary actions, active focus, trusted context |
| Primary hover | `primary-hover` | `#06665F` | 6.74:1 on white. Hover and pressed primary controls |
| Primary subtle | `primary-subtle` | `#DDF7F4` | Selected context backgrounds, low-emphasis primary surfaces |
| Brand navy | `brand-navy` | `#0F2747` | 13.5:1 on white. Section headers, app icon, authority surfaces |
| Brand teal | `brand-teal` | `#12B3A8` | Active accent lines, decorative brand geometry |
| Accent amber | `accent-amber` | `#F6B94C` | Visual accent only (1.76:1 on white). Never used as standalone text. Paired with warning text |
| Status warning text | `status-warning-text` | `#B45309` | 4.84:1 on `#FFFBEB`. Warning labels, overdue notices, pending badges |
| Danger | `danger` | `#E35D6A` | Destructive borders, error icons, critical highlight |
| Danger text | `danger-text` | `#B42318` | 6.57:1 on white, 6.01:1 on `#FEF2F2`. Error messages, danger button text |
| Ink | `ink` | `#162033` | 13.9:1 on white. Primary body text and headings |
| Ink soft | `ink-soft` | `#334155` | 8.8:1 on white. Secondary text, form labels |
| Ink muted | `ink-muted` | `#64748B` | 4.6:1 on white. Supporting metadata, timestamps, captions |
| Line / Hairline | `hairline` | `#D9E1EC` | Hairline card boundaries and table borders |
| Line strong | `line-strong` | `#CBD5E1` | Enhanced dividers, input borders, column separators |
| Canvas | `canvas` | `#F6F8FB` | Academic command center application background |
| Card | `card` | `#FFFFFF` | Elevated, readable content cards |
| Status success text | `status-success-text` | `#0A766F` | 4.87:1 on `#DDF7F4`. Verified states, passed gates, completed tasks |
| Tag SE | `tag-se` | `#1D4ED8` | Software Engineering major tag (on `#EFF6FF`) |
| Tag UI/UX | `tag-uiux` | `#7E22CE` | UI/UX major tag (on `#FAF5FF`) |
| Tag AI | `tag-ai` | `#B45309` | Artificial Intelligence major tag (on `#FFFBEB`) |
| Tag QA | `tag-qa` | `#0A766F` | Quality Assurance major tag (4.87:1 on `#DDF7F4`, WCAG AA compliant) |
| Tag IS | `tag-is` | `#475569` | Information Systems major tag (on `#F1F5F9`) |

### Palette Usage Rules

- Primary teal (`#087D77`) is structural (navigation, primary actions), not a success signal; positive status uses `status-success-*`.
- Accent Amber (`#F6B94C`) is strictly a non-text visual accent (e.g. attention left-border, lane highlight, dot indicators) and MUST be accompanied by readable text using `--color-status-warning-text: #B45309`.
- Danger text (`#B42318`) guarantees WCAG 2.1 AA text contrast across both white cards and `#FEF2F2` error banners.
- No color alone conveys state: all status chips and alerts include a text label and consistent icon.

## Architecture & Token Consolidation Decisions

1. **Eliminated `aipms-ui` namespace:** Redundant `--aipms-ui-*` duplicate tokens were fully removed. All styling consumes the canonical `--color-*`, `--radius-*`, `--shadow-*`, and `--motion-*` tokens.
2. **Academic Light Canvas Standard (Direction A):** AI-PMS v1.0 standardizes on the clean Academic Light canvas (`#F6F8FB`). Incomplete experimental dark mode tokens were removed to maintain strict design system integrity.
3. **Touch Targets (WCAG 2.2 Target Size):** Primary buttons and interactive controls maintain a minimum touch target of 44px (`min-h-[44px]`). An explicit 36px minimum exception is reserved for secondary inline controls and table row action items.
4. **Font Family Standardization:** Body typography loads `Inter` via Google Fonts (`Inter:wght@400;500;600;700`), paired with `Plus Jakarta Sans` for headings and `JetBrains Mono` for code/metadata.
5. **Brand Asset Integration:** SVG assets (`favicon.svg`, `ai-pms-app-icon.svg`, `ai-pms-logo.svg`) strictly utilize the Navy (`#0F2747`), Teal (`#12B3A8`, `#DDF7F4`), and Amber (`#F6B94C`) palette. Redundant background wrapper divs were removed to prevent double-bordered icons.

## Interaction and Accessibility (WCAG 2.1 AA Standards)

- Minimum contrast ratio of $\ge 4.5:1$ is strictly enforced for all body text, status text, and major tags.
- Visible `focus-visible` rings utilize `var(--color-primary)` with `outline-offset: 2px` or `3px`.
- Minimum text size across all components is 12px (`text-xs`).
- Reduced motion preferences (`prefers-reduced-motion: reduce`) disable non-essential animations.
