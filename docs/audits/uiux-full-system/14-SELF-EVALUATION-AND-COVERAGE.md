# Self-evaluation with explicit uncertainty

Scores are 0–5 only where a representative action sample exists. A route render is insufficient to score end-user quality. `N/A` means **not yet defensibly scored**, not good or bad.

| Category | Score | Evidence basis and limitation |
| --- | --- | --- |
| 1. Visual consistency | N/A | Current blue token/rule conflict documented; only public pages captured across sizes, protected visual comparison incomplete. |
| 2. Navigation and information architecture | N/A | 116 distinct patterns opened but control links, Back/Forward and state transitions not fully exercised. |
| 3. Functional correctness | N/A | Three read failures proven; no representative write/readback sample. |
| 4. Forms and validation | N/A | Source inventory exists; invalid/boundary inputs across roles not run. |
| 5. Feedback and error handling | N/A | API 500/403 captured; user-facing error treatment needs screenshot/keyboard review. |
| 6. Responsive usability | N/A | Public pages at 360/390/1440; authenticated sweep only at 1440. |
| 7. Accessibility | N/A | No full keyboard, screen reader, zoom or contrast audit. |
| 8. Role-based usability | N/A | Representative logins and route probes, no full task completion per role. |
| 9. Single-major academic workflow | N/A | Route probes and source trace, no end-to-end registration-to-result evidence. |
| 10. Interdisciplinary academic workflow | N/A | Route probes and source trace, no cross-department decision/readback run. |
| 11. Milestone/Task/Sprint management | N/A | Source analyzed; creation/edit/recovery/assignment actions not run. |
| 12. Review Gate and evidence revision | N/A | Source-level two fixed reviewer rule and tests; no real reviewer decision/resubmit run. |
| 13. Supervisor/Department coordination | N/A | Scoped 403s need fixture adjudication; no completed handoff. |
| 14. Evaluation/Defense usability | N/A | Assignment detail blocked by missing rubric levels; no scoring/defense write test. |
| 15. FE–BE integration reliability | **1/5 in sampled affected reads only** | Three confirmed schema drift areas caused 500s on six route patterns. This is a narrow sample score, **not** a full-system score. |

## Measured coverage

| Measure | Result |
| --- | --- |
| Route discovery | 144/144 declarations |
| Authenticated read-only route-pattern attempts | 116/144 (80.6%); 148 role/route attempts |
| Not attempted by this authenticated sweep | 28/144 (19.4%); see `16-ROUTE-RUNTIME-MATRIX.csv` |
| Distinct patterns with recorded 500 | 6/116 attempted; three root schema areas |
| Distinct patterns with 4xx requiring review | 13/116; one admin FE–BE mismatch confirmed, others still need fixture adjudication |
| Core academic journey E2E | 0; no full registration → Gate → defense → result run |
| Verified academic write/readback actions | 0; intentionally not run against shared UAT |
| Authenticated responsive widths | 1/7 planned (1440×900); no mobile acceptance |
| Public screenshot evidence | 5 captures across 3 routes; authenticated screenshots not published due UAT identity content |
| Confirmed integration failure reproduction | 3/3 identified root schema areas correlated with BE logs and read-only metadata |

The audit **does not meet the master prompt's Definition of Done**. The next completion gate is schema reconciliation on a controlled target, followed by role/action and viewport evidence, not a declaration of acceptance.
