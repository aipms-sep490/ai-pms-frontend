# Authenticated local runtime sweep — read-only

## Setup and denominator

Same FE/BE HEADs as `12-TEST-EXECUTION-AND-COVERAGE.md`. Local Vite `127.0.0.1:5173` proxied local BE `127.0.0.1:5080`; BE used the configured UAT SQL target. Background workers and outbound email/realtime paths were disabled. Browser navigation was GET-only after password login. `route-sweep.cjs` stores no credential; supplied account file and secrets stay local. Each navigation waited 550 ms before capture, so late responses can be attributed to an adjacent route. The 500 causes were independently correlated with BE exception paths and read-only schema metadata.

| Account/route set | Attempts | Observed API failure requiring follow-up |
| --- | ---: | --- |
| Single-major student | 32 | None in this sample; rendering alone is not acceptance |
| Interdisciplinary student | 32 | Department document list 500; one report redirect needs state/fixture review |
| Lecturer static | 7 | None in this sample |
| Lecturer supervisor fixture | 22 | 403 on checkpoint/defense reads; 404 final submission on ACTIVE fixture; scope not adjudicated |
| Assigned lecturer evaluator fixture | 2 | Evaluation assignment detail 500 (`rubric_criterion_levels` absent) |
| Department static | 10 | Gate templates 500; department documents 500 |
| Department project fixture | 14 | Evaluation/scheme/defense 403, rubric 500, absent final/result 404; scope/state not adjudicated |
| Department/admin shared | 6 | Rubric 500; AI route disabled by flag |
| Admin static | 5 | Industry route disabled by flag |
| Admin project deep links | 5 | Evaluator assignment GET 403 on admin routes; RUNTIME-004 permission mismatch |
| Shared auth/conditional/fallback | 13 | Several expected redirects/flag-disabled NotFound; admin academic-profile 404 needs UX check |
| **Total** | **148** | **116 distinct route patterns; 28 of 144 not attempted** |

No sampled route caused an uncaught browser page exception or document-level horizontal overflow at 1440×900. This is a narrow layout signal, not evidence that all screens are usable or all actions work.

## Confirmed integration failures

| Finding | Affected read | BE exception + read-only DB metadata | Existing migration |
| --- | --- | --- | --- |
| RUNTIME-001 | Department documents for student/staff | `Invalid object name 'department_document_templates'`; `OBJECT_ID=0` | `20261115_department_document_templates.sql` |
| RUNTIME-002 | Rubric list and Gate templates | `Invalid column name 'project_mode'`, plus rubric scope fields; `COL_LENGTH(rubrics.project_mode)=0`, `COL_LENGTH(rubrics.approval_reference)=0` | `20261030_add_rubric_scope_fields.sql` |
| RUNTIME-003 | Evaluator assignment detail | `Invalid object name 'rubric_criterion_levels'`; `OBJECT_ID=0` | `20261030_add_rubric_criterion_levels.sql` |

The browser did not run upload, publish, evaluation, grading, Gate decision or COLD mutations. These remain `NOT_TESTED`/`BLOCKED` pending schema and safe fixtures. Admin evaluator management is a confirmed FE–BE permission mismatch (RUNTIME-004); the other route-level 403s remain scope/fixture reviews.
