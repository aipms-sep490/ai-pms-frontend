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

Every ratio below is computed by `src/test/design-tokens.test.ts`, which reads
these values straight out of `src/index.css` and fails the build if any text
pair drops under 4.5:1. Do not edit a ratio here by hand — change the token and
let the test tell you the number.

| Role | Token | Value | Contrast & Use |
| --- | --- | --- | --- |
| Institutional primary | `primary` | `#0868B8` | 5.70:1 on white (WCAG AA). Bright academic blue for primary actions and active focus |
| Primary hover | `primary-hover` | `#075595` | 7.66:1 on white. Hover and pressed primary controls |
| Primary subtle | `primary-subtle` | `#EAF5FF` | Light blue background tint |
| Brand navy | `brand-navy` | `#0F2747` | 14.98:1 on white. Section headers, app icon, authority surfaces |
| Brand navy raised | `brand-navy-raised` | `#172D4C` | Raised surface *on* navy (1.08:1 against it, so it always carries a border) |
| Brand teal | `brand-teal` | `#12B3A8` | 5.74:1 on navy. Accent lines, brand geometry, label text on the navy panel |
| On navy | `on-navy` | `#FFFFFF` | 14.98:1 on navy. Headings and strong text on the navy panel |
| On navy muted | `on-navy-muted` | `#ACBDCF` | 7.80:1 on navy. Body and metadata on the navy panel |
| Accent amber | `accent-amber` | `#F6B94C` | Visual accent only (1.76:1 on white). Never standalone text. Paired with warning text |
| Status warning text | `status-warning-text` | `#B45309` | 4.84:1 on `#FFFBEB`. Warning labels, overdue notices, pending badges |
| Warning strong | `warning-strong` | `#B45309` | Filled warning surface. White on it is 5.02:1 |
| Warning strong hover | `warning-strong-hover` | `#92400E` | Hover for a filled warning surface. White on it is 7.09:1 |
| Danger | `danger` | `#E35D6A` | Destructive borders, error icons, focus rings (non-text, 3.48:1 on white) |
| Danger text | `danger-text` | `#B42318` | 6.57:1 on white, 6.01:1 on `#FEF2F2`. Error messages, danger button text |
| Danger strong | `danger-strong` | `#B42318` | Filled destructive surface. White on it is 6.57:1 |
| Danger strong hover | `danger-strong-hover` | `#8F1C13` | Hover for a filled destructive surface. White on it is 8.96:1 |
| Ink | `ink` | `#162033` | 16.30:1 on white. Primary body text and headings |
| Ink soft | `ink-soft` | `#334155` | 10.35:1 on white. Secondary text, form labels, body paragraphs |
| Ink muted | `ink-muted` | `#64748B` | 4.76:1 on white. Supporting metadata, timestamps, captions, placeholders |
| Line / Hairline | `hairline` | `#D9E1EC` | Hairline card boundaries and table borders |
| Line strong | `line-strong` | `#CBD5E1` | Enhanced dividers, input borders, column separators |
| Canvas | `canvas` | `#F6FAFE` | Light academic workspace background |
| Card | `card` | `#FFFFFF` | Elevated, readable content cards |
| Status success text | `status-success-text` | `#0A766F` | 4.87:1 on `#DDF7F4`. Verified states, passed gates, completed tasks |
| Tag SE | `tag-se` | `#1D4ED8` | Software Engineering major tag. 6.16:1 on `#EFF6FF` |
| Tag UI/UX | `tag-uiux` | `#7E22CE` | UI/UX major tag. 6.51:1 on `#FAF5FF` |
| Tag AI | `tag-ai` | `#B45309` | Artificial Intelligence major tag. 4.84:1 on `#FFFBEB` |
| Tag QA | `tag-qa` | `#0A766F` | Quality Assurance major tag. 4.87:1 on `#DDF7F4` |
| Tag IS | `tag-is` | `#475569` | Information Systems major tag. 6.92:1 on `#F1F5F9` |

### Palette Usage Rules

- Primary blue (`#0868B8`) is structural (navigation, primary actions), not a status signal; positive status uses `status-success-*`.
- The user-supplied AIPMS wordmark is the product logo. Preserve the supplied artwork and frame it without redrawing its letters. The workspace and login use light surfaces with clear blue actions; orange and green remain accents within the wordmark and semantic states.
- Accent Amber (`#F6B94C`) is strictly a non-text visual accent (e.g. attention left-border, lane highlight, dot indicators) and MUST be accompanied by readable text using `--color-status-warning-text: #B45309`.
- Danger text (`#B42318`) guarantees WCAG 2.1 AA text contrast across both white cards and `#FEF2F2` error banners.
- No color alone conveys state: all status chips and alerts include a text label and consistent icon.
- **`-bg` tints and `-strong` fills are not interchangeable.** `status-error-bg` / `status-warning-bg` are near-white surfaces for dark text to sit on; `danger-strong` / `warning-strong` are filled surfaces for white text. A `-border` token is for borders only: `status-warning-text` on `status-warning-border` is 4.03:1 and fails AA, so that pairing is never allowed.
- **Never repeat a token value as a literal** — not as `#087D77`, not as `rgba(8, 125, 119, .3)`, and not as a `var(--color-primary, #087D77)` fallback. Every token is declared on `:root`, so a fallback is dead weight and a second place the palette can drift. Use `color-mix(in oklab, var(--token) N%, transparent)` when you need alpha.
- **The navy panel has its own foreground scale.** Anything on `brand-navy` uses `on-navy` / `on-navy-muted`, never the ink scale, which is tuned for light surfaces.
- **Categorical metadata is not status.** File-type chips, for example, are neutral with the type written in the label; a PDF is not an error and a spreadsheet is not a success. Reserve the status palette for actual workflow state.

## Architecture & Token Consolidation Decisions

1. **Eliminated `aipms-ui` namespace:** Redundant `--aipms-ui-*` duplicate tokens were fully removed. All styling consumes the canonical `--color-*` tokens.
   The `--radius-*`, `--space-*`, `--shadow-card/overlay` and `--motion-*` set that briefly replaced them was also deleted: all sixteen had zero consumers, and `--radius-sm: 8px` sitting unlayered in `:root` silently overrode Tailwind's own `--radius-sm` (`0.25rem`), changing every `rounded-sm` in the app. A token is added when a consumer exists, not in advance.
6. **`shadow-primary` / `shadow-primary-hover`:** the primary-action elevation that was duplicated as `shadow-[0_2px_8px_-2px_rgba(8,125,119,0.3)]` at nine call sites. Note that Tailwind resolves a shadow colour at build time, so the emitted rule carries a baked `#087d7740` rather than a live `var()` — the token is still the single place it is authored, and every build re-derives it from `--color-primary`.
7. **Verification gate includes `npm run build`:** `typecheck`, `lint` and the full vitest suite all pass on CSS that cannot compile — no unit test parses a stylesheet. A `var(var(--token))` typo in `login-design.css` broke the production build and blanked the login hero while 1898 tests stayed green. The guard now also fails on nested `var()`, but the build must be run regardless.
8. **The token guard must actually read CSS:** Vite's CSS plugin claims every `.css` file, so `?raw` through `import.meta.glob` resolves to `''` for all of them. `src/test/design-tokens.test.ts` therefore reads sources off disk; without that it silently scanned `.ts`/`.tsx` only and reported zero violations across ~53 stylesheets.
2. **Academic Light Canvas Standard (Direction A):** AI-PMS uses the bright Academic Light canvas (`#F6FAFE`). Incomplete experimental dark mode tokens were removed to maintain strict design system integrity.
3. **Touch Targets (WCAG 2.2 Target Size):** Primary buttons and interactive controls maintain a minimum touch target of 44px (`min-h-[44px]`). An explicit 36px minimum exception is reserved for secondary inline controls and table row action items.
4. **Font Family Standardization:** Body typography loads `Inter` via Google Fonts (`Inter:wght@400;500;600;700`), paired with `Plus Jakarta Sans` for headings and `JetBrains Mono` for code/metadata.
5. **Brand Asset Integration:** The user-supplied `public/aipms-logo.png` is the visible AIPMS wordmark and favicon. The earlier PMS SVG assets are legacy assets and must not appear in the login or main sidebar. Preserve the supplied image without recreating its letterforms.

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

