# AI-PMS Design System Master — Academic Command Center Canonical Specification

## Scope and precedence

This is the source of truth for the AI-PMS Academic Command Center workspace UI. Before changing a page, consult this document and relevant sub-page specifications.

This design system governs the authenticated academic-management command center. Backend authority is preserved: visual indicators communicate authoritative state and urgency without granting unverified permissions or inventing client-side state transitions.

## Product model

AI-PMS coordinates the student project lifecycle, supervisor workload, academic review, milestones, reporting, deliverables, meetings, and defense evaluations. The UI employs a dense, calm, evidence-first dashboard hierarchy:

1. Academic context and current project state.
2. High-priority items requiring human decisions or attention.
3. Authoritative data and valid next actions.

## Semantic Palette (FAMS-inspired Academic Command Center)

Every ratio below is computed by `src/test/design-tokens.test.ts`, which reads
these values straight out of `src/index.css` and fails the build if any text
pair drops under 4.5:1. Do not edit a ratio here by hand — change the token and
let the test tell you the number.

| Role | Token | Value | Contrast & Use |
| --- | --- | --- | --- |
| Institutional primary | `primary` | `#C2410C` | 5.18:1 on white. Readable orange for primary actions and focus |
| Primary hover | `primary-hover` | `#9A3412` | 7.31:1 on white. Hover and pressed controls |
| Primary subtle | `primary-subtle` | `#FFF3EB` | Light orange background tint |
| Brand charcoal | `brand-navy` | `#222836` | 14.74:1 on white. Headings and dark authority surfaces |
| Brand charcoal raised | `brand-navy-raised` | `#303747` | Raised surface on charcoal; retain a boundary |
| Brand green | `brand-teal` | `#39C58F` | 6.71:1 on charcoal. Accent geometry on dark panels |
| On charcoal | `on-navy` | `#FFFFFF` | 14.74:1 on charcoal. Strong text on dark panels |
| On charcoal muted | `on-navy-muted` | `#C4CBD6` | 9.03:1 on charcoal. Supporting text on dark panels |
| Orange accent | `attention-border` | `#F37021` | FAMS reference hue; non-text accents only (2.94:1 on white) |
| Accent amber | `accent-amber` | `#F7AE70` | Visual accent only (1.87:1 on white). Never standalone text |
| Status warning text | `status-warning-text` | `#A94808` | 5.51:1 on `#FFF8F1`. Warning and overdue text |
| Warning strong | `warning-strong` | `#A94808` | Filled warning surface with AA white text |
| Warning strong hover | `warning-strong-hover` | `#873909` | Hover for filled warning surfaces |
| Danger | `danger` | `#F65C65` | Error borders and non-text icons |
| Danger text | `danger-text` | `#BE2638` | 5.96:1 on white. Error messages and danger text |
| Danger strong | `danger-strong` | `#BE2638` | Filled destructive surface with AA white text |
| Danger strong hover | `danger-strong-hover` | `#9F1D2E` | Hover for filled destructive surfaces |
| Ink | `ink` | `#222836` | 14.74:1 on white. Body text and headings |
| Ink soft | `ink-soft` | `#3C4757` | 9.41:1 on white. Secondary text and form labels |
| Ink muted | `ink-muted` | `#647083` | 5.02:1 on white. Metadata and placeholders |
| Line / Hairline | `hairline` | `#E4E7EC` | Card boundaries and table borders |
| Line strong | `line-strong` | `#CED3DC` | Input borders and column separators |
| Canvas | `canvas` | `#F8F9FB` | Light workspace background |
| Card | `card` | `#FFFFFF` | Elevated, readable content cards |
| Status success text | `status-success-text` | `#0B7B52` | 4.85:1 on `#E8F9F1`. Verified states, passed gates, completed tasks |
| Tag SE | `tag-se` | `#1D4ED8` | Software Engineering major tag. 6.16:1 on `#EFF6FF` |
| Tag UI/UX | `tag-uiux` | `#6D28D9` | UI/UX major tag. 6.62:1 on `#FAF5FF` |
| Tag AI | `tag-ai` | `#A94808` | Artificial Intelligence major tag. Readable on `#FFF8F1` |
| Tag QA | `tag-qa` | `#0B7B52` | Quality Assurance major tag. Readable on `#E8F9F1` |
| Tag IS | `tag-is` | `#475569` | Information Systems major tag. 6.92:1 on `#F1F5F9` |

### Palette Usage Rules

- Primary orange (`#C2410C`) is structural (navigation and primary actions), not a status signal. The brighter FAMS hue (`#F37021`) stays decorative so white text remains readable on filled controls.
- The user-supplied AIPMS wordmark is the product logo. Preserve its letters and the existing motion. FAMS informs color and information hierarchy; AI-PMS retains its own workflow and layout.
- Accent amber (`#F7AE70`) is a non-text visual accent and is paired with readable `--color-status-warning-text: #A94808`.
- Danger text (`#BE2638`) guarantees WCAG 2.1 AA contrast on white cards and the light error surface.
- No color alone conveys state: all status chips and alerts include a text label and consistent icon.
- **`-bg` tints and `-strong` fills are not interchangeable.** Light status surfaces carry dark text; solid danger and warning surfaces carry white text. Border tokens are for borders only.
- **Never repeat a token value as a literal** in a component or fallback. Every token is declared in `src/index.css`. Use `color-mix(in oklab, var(--token) N%, transparent)` when alpha is needed.
- **The dark authority panel has its own foreground scale.** Anything on `brand-navy` uses `on-navy` / `on-navy-muted`, never the ink scale tuned for light surfaces.
- **Categorical metadata is not status.** File-type chips, for example, are neutral with the type written in the label; a PDF is not an error and a spreadsheet is not a success. Reserve the status palette for actual workflow state.

## Architecture & Token Consolidation Decisions

1. **Eliminated `aipms-ui` namespace:** Redundant `--aipms-ui-*` duplicate tokens were fully removed. All styling consumes the canonical `--color-*` tokens.
   The `--radius-*`, `--space-*`, `--shadow-card/overlay` and `--motion-*` set that briefly replaced them was also deleted: all sixteen had zero consumers, and `--radius-sm: 8px` sitting unlayered in `:root` silently overrode Tailwind's own `--radius-sm` (`0.25rem`), changing every `rounded-sm` in the app. A token is added when a consumer exists, not in advance.
2. **FAMS-inspired Light Canvas Standard:** AI-PMS uses the neutral light canvas (`#F8F9FB`) with orange actions and restrained blue, green, purple and red category accents. Existing motion and accessibility settings remain in force.
3. **Touch Targets (WCAG 2.2 Target Size):** Primary buttons and interactive controls maintain a minimum touch target of 44px (`min-h-[44px]`). An explicit 36px minimum exception is reserved for secondary inline controls and table row action items.
4. **Font Family Standardization:** Body typography loads `Inter` via Google Fonts (`Inter:wght@400;500;600;700`), paired with `Plus Jakarta Sans` for headings and `JetBrains Mono` for code/metadata.
5. **Brand Asset Integration:** The user-supplied `public/aipms-logo.png` is the visible AIPMS wordmark and favicon. The earlier PMS SVG assets are legacy assets and must not appear in the login or main sidebar. Preserve the supplied image without recreating its letterforms.
6. **`shadow-primary` / `shadow-primary-hover`:** primary-action elevation is authored in `src/index.css` with `color-mix()` and `var(--color-primary)` so each surface follows the active primary token instead of retaining an old RGB value.
7. **Verification gate includes `pnpm run build`:** type checking, linting and unit tests cannot prove CSS compiles. The production build remains a required gate after palette changes.
8. **The token guard reads CSS from disk:** `src/test/design-tokens.test.ts` scans actual stylesheets and checks readable foreground/background pairings.

## Interaction and Accessibility (WCAG 2.1 AA Standards)

- Minimum contrast ratio of $\ge 4.5:1$ is strictly enforced for all body text, status text, and major tags.
- Visible `focus-visible` rings utilize `var(--color-primary)` with `outline-offset: 2px` or `3px`.
- Minimum text size across all components is 12px (`text-xs`).
- Reduced motion preferences (`prefers-reduced-motion: reduce`) disable non-essential animations.

## Rule v2: FAMS × F-Research Integration Patterns

AI-PMS harmonizes the authoritative density of FAMS with the discovery clarity and responsive warmth of F-Research:

1. **P01 — Discovery Cards & Item CTAs (F-Research):** Used in `/project/periods` and `/topics` for entity discovery. Highlights code badges, deadlines, criteria, and provides single-click contextual navigation (`/team`, `/project/source`).
2. **P02 — Entity Identity Strip (FAMS):** Persistent identity ribbon (`EntityIdentityStrip`) rendered on workspace pages (`/team`, `/projects/lifecycle`, `/project/workspace`, `/review-gates`). Summarizes project/team code, period, mode (Single/Interdisciplinary), supervisor, and authoritative status so users never lose context.
3. **P03 — Actionable Metrics & StatTiles (FAMS):** Metric tiles in `StatTileRow` support interactive filtering (`onClick`, `active`, `aria-pressed`). Clicking a metric immediately filters tables/lists (e.g., overdue tasks, blocked items, pending progress reviews).
4. **P04 — Filter & Bulk Action Bars (FAMS):** Search inputs with debounce, faceted dropdowns, active chip tags, and bulk selection toolbars that preserve backend permission boundaries.
5. **P05 & P06 — Safe Configuration & Before/After Comparison (FAMS):** View/Edit toggles with impact scope warnings for rubrics, schemes, and policies; version-to-version diffs for topic revisions and grade appeals.
6. **P07 & P08 — Contextual Feedback & Document Preview (F-Research):** Comments linked directly to specific document versions. `DocumentPreviewModal` delivers in-browser PDF, image, and code viewing with zoom and download without relying on external popups.
7. **P09 — Participation Prerequisites Guidance (F-Research):** Dedicated 3-step guidance cards explaining academic eligibility, team formation, and topic registration requirements prior to deadline expiration.
8. **P10 — Time-Grouped Notifications (FAMS × F-Research):** Notifications grouped by urgency (Today, This Week, Earlier) featuring deep-link action buttons leading straight to the pending task.

## AIPMS Energetic Mascot Loading Specification (P11)

The loading experience reflects the institutional identity of AIPMS with energetic, friendly motion:

- **Asset (`public/aipms-mascot.png`):** Transparent PNG of the AIPMS Academic Fox Mascot with mortarboard, eyeglasses, graduation cape with AI badge, and laptop featuring an illuminated AI chip.
- **Orbital Energy Dynamics:**
  - Outer dashed ring rotating clockwise (`12s` linear infinite) in `var(--color-primary)`.
  - Inner multi-color gradient ring rotating counter-clockwise (`7s` linear infinite) featuring Blue, Orange (`var(--color-attention-border)`), and Green (`var(--color-status-success-text)`) energy dots.
  - Soft ambient radiant aura (`aipms-halo-pulse`) emitting a subtle backlight behind the mascot.
  - Gentle levitation floating motion (`aipms-float`, 3s ease-in-out) on the mascot.
- **Progress Signal:** Three animated dots (Blue, Orange, Green) pulsing sequentially (`aipms-dot-pulse`) along a horizontal energy line.
- **Contextual Copy:**
  - Bootstrap / App initialization: *"Đang khởi tạo hệ thống AIPMS"* / *"Chuẩn bị môi trường quản lý đồ án học thuật…"*.
  - Route / Suspense transition: *"Đợi AIPMS một xíu nhé!"* / *"Trang mới đang được chuẩn bị cho bạn…"*.
- **Accessibility:** Built with `role="status"`, `aria-live="polite"`, screen reader announcements (`.sr-only`), and `@media (prefers-reduced-motion: reduce)` which automatically silences continuous rotations and oscillations for vestibular safety.

