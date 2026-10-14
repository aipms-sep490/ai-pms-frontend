# Orchestration of Frontend Design + UI UX Pro Max + Impeccable

**Verified sources as of 2026-10-14:**
- Anthropic official frontend-design: https://claude.com/plugins/frontend-design
- NextLevelBuilder: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- Paul Bakaus Impeccable: https://github.com/pbakaus/impeccable

These are external software/tools; read and review code, hooks, installer permissions and potential external calls before installing. They are NOT bundled in this package. No skill can override protected domain/academic contracts.

| Stage | Lead | Required artifact | Approval gate |
|---|---|---|---|
| Product truth | Impeccable init + AI-PMS docs | Reviewed `PRODUCT.md` or equivalent | Business invariants intact |
| Existing visual analysis | Impeccable document/critique + app screenshots | Visual baseline + anti-pattern/UX audit | Evidence; no made-up browser tests |
| Design exploration | Frontend Design + UI UX Pro Max | 2–3 candidates and reasons; ONE selected | Maintainable + on-brand + accessible |
| Design specification | Existing design kit + Impeccable shape | Tokens/components/density per screen | Screens suit each role and workflow |
| FE implementation | Frontend Design + React Best Practices (if present) | FE-only pilot with actual API | No business/routing regression |
| Anti-template pass | Impeccable distill/typeset/layout | Reduced noise and improved hierarchy | No useful data removed |
| Hardening | Impeccable audit/harden/polish + Playwright | Functional/accessibility/visual evidence | States/roles/devices tested |
| Rollout | Shared component adoption | Reviewable migration batches | Screenshot and E2E regressions pass |

## Install / invocation references

**Anthropic:** Select Frontend Design plugin in Claude Code plugin directory: https://claude.com/plugins/frontend-design . Verify it appears in `/plugin` and active skill list.

**UI UX Pro Max** — inside Claude Code:
```text
/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill
/plugin install ui-ux-pro-max@ui-ux-pro-max-skill
```
Alternative from repository root (shell):
```bash
npx ui-ux-pro-max-cli init --ai claude
```

**Impeccable** — OPTION A inside Claude Code (use plugin manager after adding marketplace):
```text
/plugin marketplace add pbakaus/impeccable
```
Then open `/plugin`, select and install **Impeccable**, reload Claude Code, run:
```text
/impeccable init
/impeccable critique <actual route or component>
/impeccable audit <actual route or component>
/impeccable distill <actual route or component>
/impeccable polish <actual route or component>
```

OPTION B, shell in repo root, instead of A (avoid duplicate installations):
```bash
npx impeccable install --providers=claude --scope=project
```
Reload Claude Code, verify `/impeccable` exists, and run `/impeccable init`.

**Caution:** Impeccable project installation may create `.claude/skills/impeccable/`, hook config under `.claude/settings.local.json`, `.impeccable/`, and other files. Review vendor docs for hooks, runtime engine downloads, privacy/telemetry settings, lockfile and exclusions before authorizing unattended runs; avoid blindly overwriting existing `.claude` configuration.

Optional detector, only when installed and appropriate:
```bash
npx impeccable detect src/
```
This is supplemental; it does not replace visual and manual evaluation.

## Rule of truthful reporting
- Mark skill as VERIFIED-ACTIVATED only if you actually saw its output.
- `PRODUCT.md` is durable product truth, not a license to overrule v5/approved policy; `DESIGN.md` is design-specific, not academic policy.
- Do not claim design was "human-made" because an AI detector score improved. Review it by concrete outcomes and accessibility/functionality tests.
