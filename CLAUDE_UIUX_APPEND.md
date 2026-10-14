### AI-PMS anti-generic design extension (3 skills)

- Additional universal UI rule: `.claude/rules/ai-pms-human-crafted-ui.md` and design guide `docs/uiux/06-ANTI-AI-DESIGN-PLAYBOOK.md`.
- Orchestration guide: `docs/uiux/07-3-SKILLS-QUALITY-GATES.md`.
- **Frontend Design** establishes production-grade aesthetic direction and FE implementation; **UI UX Pro Max** researches and filters cohesive product patterns; **Impeccable** audits/criticizes/distills/hardens/polishes actual screens. External suggestions never supersede business policy, the real API or accessibility.
- Prioritize purpose-built, content-driven UI. Avoid generic AI SaaS composition (purple gradients, card wallpaper, generic hero, nested cards, irrelevant icons, fake KPIs) while retaining important information and data density.
- For a full project upgrade, use `PROMPT_CLAUDE_3_SKILLS_IMPECCABLE_MASTER.md`; verify skills are actually installed before claiming they were run.


## AI-PMS UI/UX persistent project instructions

- Apply `.claude/rules/ai-pms-ui-ux.md` to all frontend work. For UI refactor and review, use `.claude/skills/ai-pms-uiux/SKILL.md` (invoke `/ai-pms-uiux`).
- UI source documents: `docs/uiux/01-DESIGN-SYSTEM.md` through `05-FE-BE-CONTRACT.md`.
- Treat academic authorization, effective policy, states, immutable snapshots, evidence and human grading as protected contracts. Never infer the live state of code/DB from old design documents.
- Default UX is contemporary enterprise academic operations: consistent tokens, truthful status, clear navigation and actions, accessible controls, fast and calm interfaces.
- Before modifying production UI, read existing component library/theme, inspect real routes/API clients, list intended files/risks, and validate a real end-to-end screen. Preserve a rollback path.
- Never announce refactor completion solely because JSX or CSS compiled: verify rendered states and user interactions.
