# AI-PMS Claude Code UI/UX Enterprise Upgrade Kit

**Prepared 14/10/2026.** An implementation-guidance package, **not** proof the current UI code has been inspected or modified. The attached project documents were analyzed; source repository/actual running app were NOT accessible for an up-to-date live UI audit in the preparation step. Claude Code should do that on your machine.

## Objective

Turn AI-PMS into a cohesive, trustworthy enterprise academic operations product. This kit defines a persistent repo-specific rule, an invokable AI-PMS skill, a design system, a universal interaction contract, screen/role map, frontend/backend guard references, audit/acceptance checks and a master Claude prompt.

## Files

- `.claude/rules/ai-pms-ui-ux.md` — automatic rules for every UI/UX implementation/refactor.
- `.claude/skills/ai-pms-uiux/SKILL.md` — invokable `/ai-pms-uiux` procedure.
- `CLAUDE_UIUX_APPEND.md` — **append**, do NOT replace, the existing root `CLAUDE.md`.
- `docs/uiux/01-DESIGN-SYSTEM.md` — global visual tokens, shell and component design.
- `docs/uiux/02-INTERACTION-RULES.md` — every interaction state and HTTP/business response behavior.
- `docs/uiux/03-ROLE-SCREEN-MATRIX.md` — role/state-specific route expectations.
- `docs/uiux/04-AUDIT-ACCEPTANCE.md` — audit rubric, P0/P1/P2, QA and E2E checks.
- `docs/uiux/05-FE-BE-CONTRACT.md` — capability / API design alignment; suggested paths clearly not assumed implemented.
- `PROMPT_CLAUDE_MASTER.md` — comprehensive implementation prompt.
- `PROMPT_CLAUDE_AUDIT_ONLY.md` — read-only audit alternative.

## Install (in root of the React/AI-PMS Git repository)

1. Back up/commit your current work. Unzip preserving hidden `.claude/` directory.
2. Copy `.claude/rules/`, `.claude/skills/` and `docs/uiux/` into the target git repository (MERGE existing folders, do not overwrite unrelated files).
3. If root `CLAUDE.md` exists: **append** `CLAUDE_UIUX_APPEND.md` after checking for existing conflicting rules. If it does not exist: make `CLAUDE.md` from this append template and extend with actual build commands discovered from the repo. Avoid duplicate root instructions.
4. Install optional external skills only after reviewing permissions and upstream source. Use the most current official installation docs; do NOT execute unknown commands from the Internet blindly.
5. Open Claude Code in the repo root. Verify skill with `/ai-pms-uiux audit` and inspect `/context` for the `CLAUDE.md`/rules.
6. Paste `PROMPT_CLAUDE_AUDIT_ONLY.md` first for a no-change benchmark; then `PROMPT_CLAUDE_MASTER.md` for controlled implementation. If repo has important pending work, ask Claude to use isolated branch/worktree.
7. Do not request 'redesign every page at once' without a component inventory and screenshot baseline. Apply first vertical slice, test, then scale.

## Recommended external sources / skills

- Anthropic Frontend Design plugin: https://claude.com/plugins/frontend-design
- UI UX Pro Max (community): https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- Vercel Web Design Guidelines: https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines
- Vercel React Best Practices: https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices
- Anthropic Webapp Testing: https://github.com/anthropics/skills/tree/main/skills/webapp-testing
- Claude Code official skills docs: https://code.claude.com/docs/en/skills
- Claude Code project rules & memory: https://code.claude.com/docs/en/memory
- W3C WCAG 2.2: https://www.w3.org/TR/WCAG22/

**Trust warning:** Third-party skill instructions/code may update; pin/review dependencies and keep an approval boundary for destructive actions, external code execution and access to secrets. Claude instruction files guide behavior but do NOT technically enforce server-side RBAC.

## Install examples — verify syntax against latest repository first

Inside Claude Code for the community UI UX Pro Max skill:

```text
/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill
/plugin install ui-ux-pro-max@ui-ux-pro-max-skill
```

Alternative from the same repository (from repo root):

```bash
npx ui-ux-pro-max-cli init --ai claude
```

Vercel skill package CLI (review downloaded content before installation):

```bash
npx skills add vercel-labs/agent-skills --skill web-design-guidelines
npx skills add vercel-labs/agent-skills --skill react-best-practices
```

Anthropic official Frontend Design plugin: choose **Frontend Design** in the Claude Code plugin directory (installation UX can differ by CLI version). Webapp Testing from Anthropic can be vendored or installed following its source instructions.

## Important limitations

- No live UI repository access in this preparation step. All route names/components in docs are a **target inventory** until Claude verifies code.
- Read the project team's AI-PMS v5 design decisions carefully. Team-selected 50/30/20 is not official university grade policy. Screens must not hardcode it as universally authoritative.
- Suggested `/api/projects/{id}/my-capabilities` and evaluation endpoints from v5 are illustrative until confirmed in actual OpenAPI/API code.
- Avoid overwriting existing `.claude` rules or adopting a second component framework without a migration plan.

## NEW — V2 Impeccable / human-crafted UI extension

This V2 package preserves the original AI-PMS UI/UX kit and adds:

- `PROMPT_CLAUDE_3_SKILLS_IMPECCABLE_MASTER.md` — preferred updated comprehensive Claude Code prompt combining official Frontend Design + UI UX Pro Max + Impeccable, with enforced anti-AI aesthetic checks, RBAC, workflow, accessibility and browser QA.
- `.claude/rules/ai-pms-human-crafted-ui.md` — universal design anti-pattern and behavior rule applying to all frontend components.
- `docs/uiux/06-ANTI-AI-DESIGN-PLAYBOOK.md` — negative examples, purpose-built screen compositions and review rubric.
- `docs/uiux/07-3-SKILLS-QUALITY-GATES.md` — skill roles, installation verification, phase-by-phase execution and honest evidence policy.

`CLAUDE_UIUX_APPEND.md`, existing primary rule and local skill have also been extended.

**Preferred flow:** Review repo and current skill installations; merge kit into repo; append the CLAUDE fragment to existing root CLAUDE.md; enable external skills individually following upstream docs; use the V2 master prompt; audit and improve one verified workflow; only then roll out shared components.

**Impeccable official source:** https://github.com/pbakaus/impeccable . Claude Code plugin marketplace: `/plugin marketplace add pbakaus/impeccable`, then open `/plugin` and install Impeccable, or shell: `npx impeccable install --providers=claude --scope=project` (pick one installation approach). Review its runtime hooks and network/telemetry settings before installing. Installations have NOT been executed by this ZIP creation step.

**Do not run this prompt against a production database**. The actual AI-PMS repo and runtime have not been audited in this kit. No pages have been visually verified as a result of preparing these files.
