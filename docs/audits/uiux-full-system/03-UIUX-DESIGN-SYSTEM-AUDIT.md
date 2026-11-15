# Current design system and source conflict

## Observed FE tokens (`src/index.css`)

| Semantic use | Current token/value | Audit result |
| --- | --- | --- |
| Canvas / card | `--color-canvas: #F6FAFE`, `--color-card: #FFFFFF` | Bright workspace foundation |
| Primary / hover | `--color-primary: #0868B8`, `--color-primary-hover: #075595` | Current blue authority for actions/navigation |
| Navy / teal accent | `--color-brand-navy: #0F2747`, `--color-brand-teal: #12B3A8` | Teal is accent, not primary |
| Ink / muted | `--color-ink: #162033`, `--color-ink-muted: #626F82` | Validate per rendered surface and viewport |
| Success / warning / error text | `#0A766F` / `#B45309` / `#B42318` | Semantic states, paired with text and icons |
| Attention border | `--color-attention-border: #F97316` | Orange is a bounded attention accent; not the primary button colour |

The older FAMS-based `c/docs/uiux/08-PRESENTATION-PATTERN-RULES.md` declares `#087D77` as AI-PMS primary and bans changing it. That is **stale relative to current FE source and `design-system/ai-pms/MASTER.md`**, which use blue `#0868B8`. Decision for this audit: treat current branch tokens as observed implementation; update the reference rule in a separately authorized documentation alignment change after ownership review. Do not recolour production code from the stale rule.

## Browser subset

The login screen at 1440×900 and 360×800 uses the supplied AIPMS wordmark, a bright two-column desktop layout and a single card on mobile. In the inspected viewports, the document has no horizontal overflow and no page JavaScript error. The Google login area shows a retry/error state because the API is unavailable; this is not enough to judge normal authenticated presentation. Screenshots are indexed in `09-RESPONSIVE-ACCESSIBILITY-AUDIT.md`.

`WorkspacePage`, `InlineAlert`, `Modal`, `DocumentPreviewModal`, table, loading and badge components exist in source. `SCREEN_SOURCE_CUES.generated.csv` is a lexical source indicator and cannot prove consistent rendering on all routes. Real-role visual comparison remains pending.
