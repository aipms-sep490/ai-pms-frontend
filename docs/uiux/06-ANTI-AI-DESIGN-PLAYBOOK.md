# AI-PMS Anti-AI Design Playbook (proposal; UX only)

## Design north star
"**Calm Academic Operations with Editorial Precision**": a professional academic system that makes people, evidence, decisions and deadlines legible. Maintain a credible, intentional design personality without flashy templates. No university official branding is assumed; preserve verified assets first.

## Telltales to remove vs replacements

| AI-template tell | Deliberate replacement | Verification |
|---|---|---|
| Six equally weighted dashboard stat cards | Prioritized worklist + upcoming deadline + 1–3 contextual metrics | User can tell next action within 5 seconds in usability test |
| Card nesting everywhere | Surface hierarchy through typographic levels, whitespace, simple dividers, table sections | Same info with fewer borders/wrappers |
| Purple-to-blue gradients, glowing accents | Subtle brand token + high-contrast semantic statuses | Contrast and palette audits |
| Giant app hero / sterile vacant whitespace | Appropriately dense page title and actionable summary | Primary task visible near top |
| Decorative square icons next to every label | Small meaningful icons only where they improve recognition | Remove icon; meaning stays clear |
| Generic page template cloned across roles | Task-specific information architecture and controls | Student vs Department vs Evaluator intentionally differ |
| Colorful risk pie with uncertain source | Verified risk summary with data freshness, factors and insufficiency explanation | No misleading risk precision |
| All gray helper text / font-size 12 | Accessible type hierarchy and purposeful metadata | Readable at 200% zoom, WCAG contrast checked |
| Toast says success on click | Pending until successful server mutation, then invalidate/refresh state | UI matches server and audit |
| Gratuitous movement/micro-animations | Short purposeful motion and reduced-motion support | No layout shift or confusing animations |

## Role-specific compositions

- **Student Leader:** status-led stage overview and actionable readiness checklist with missing prerequisites; real team/major eligibility, scope-aware register/resubmit CTA; no generic hero.
- **Student Member:** personal assigned work, evidence, meetings, feedback, deadlines; cannot see leader-only mutation controls.
- **Department academic staff:** dense queue with filters; decision summary + participating-department coverage + evidence/immutable snapshot + auditable decision interaction.
- **Supervisor/Mentor:** supervisory portfolio, overdue/blocked work, assigned scope, evidence/review requests and advisory AI status; human intervention CTA, not automatic AI decision.
- **Evaluator:** rubric-by-criterion review, stage/scope separation, strong evidence association, save draft vs finalize vs published result clarity; unassigned scope hidden/denied.
- **Admin:** accounts, organization, permissions, audit, operational status; does not inherit academic approval or grade control.

## Design review questions

1. What is the top task for the real actor here? Is it obvious without reading 12 cards?
2. Does status mean the same thing across app? Does disabled say why and what next?
3. Can every visual accent be justified by hierarchy, state or branding?
4. If shadows/icons/gradients vanish, does information hierarchy still work?
5. Is the UI usable with real Vietnamese content and long interdisciplinary names?
6. Do 390/768/1280/1440 screenshots look deliberately adapted, not desktop squashed into mobile?
7. Can keyboard users work with dialogs, tables and rubric forms?
8. Are all actions routed through truthful BE permission/state policies and error responses?

## Visual acceptance rubric (reviewer score, not an automatic test)

| Dimension | Weight | What 5/5 looks like |
|---|---:|---|
| Workflow clarity | 25 | Primary work and next step obvious; context and scopes grounded |
| Visual hierarchy & density | 20 | Precise typography, rhythm, restrained surfaces; no card wallpaper |
| Interaction quality | 20 | Clear complete states, server-truthful mutations, recovery actions |
| System consistency | 15 | Shared tokens/primitives; role-specific compositions without visual drift |
| Accessibility & responsiveness | 15 | Keyboard, contrast, reduced motion, responsive and long content verified |
| Distinctive design craft | 5 | Human specificity rather than generic AI dashboard clichés |

**Recommended internal acceptance:** >=85/100 with no critical failures in authorization, business state or inaccessible core flow. This scoring threshold is an internal design QA proposal, not school policy.
