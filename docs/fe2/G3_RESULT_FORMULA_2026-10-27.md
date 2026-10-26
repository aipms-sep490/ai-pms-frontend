# G3 / FUNC-07 — render formula metadata, never invent weights

27/10/2026, Asia/Saigon. Branch `fix/fe-result-formula-from-scheme`, baseline develop `4d2b90c`. This is the formula half of G3, separate from UX-06 student labels. **Live multi-component acceptance remains dependent on BE-15; this PR stays Draft.**

## Contract and behavior

The previous `ProjectResultBreakdown.tsx:14,35` asserted50%COMMON +50%MajorAggregate for every result. The real self-test scheme for project50003 contains onlyCOMMON100; its preview total8.5 and missing major aggregate did not justify that sentence.

Q5 agrees on optional `formula.components` with known COMMON/MAJOR/INDIVIDUAL types, integer weightPercent summing to100. Current merged BE source at `origin/develop` bfe0b21 lacks that structured field; unmerged `origin/feat/complete-system-review`1148bbc defines EvaluationFormulaDto on ResultBreakdownDto and builds its components in EvaluationSchemeService.Results.cs. Current staging preview also lacks formula. No deployment is inferred from a local source SHA.

The frontend now renders percentages **only** from a valid structured formula. Missing, malformed, unknown, duplicate-type, non-integer, negative or non100-total metadata falls back to “Cách tính điểm theo phương án đánh giá đã công bố.” No weights are reconstructed from score components, scheme labels, calculationRule or English description prose. An optional description on the unmerged BE DTO is deliberately unused per Q5.

The numeric total remains the server's total in the caller. Summing percentages here only validates the display contract; it never computes or verifies a grade. Scheme name/version stays visible. Zero-weight formula clauses are omitted. Component rows show null scores as pending, zero-weight rows as not applicable to this total, and genuine graded zero as0; no missing result is substituted with0.

The shared breakdown is also used by result history, including student history. History now passes the existing project/student target so a student's formula and heading say “điểm cá nhân”, rather than incorrectly labeling it a project formula. Historical formula data comes from the selected frozen result version, not a request for the current scheme. Existing context/version guards remain in place. No FE1 student page, score calculator, API endpoint, permission or publish handler changed.

## Checks

| Check | Result |
|---|---|
| Targeted breakdown/history/publication | 3 files /31 tests PASS |
| Full suite | 267 files /1494 tests PASS |
| Typecheck / lint / build / diff | PASS; lint210 existing warnings, no new normalized diagnostic |

Coverage includes COMMON100,40/40/20, no formula, malformed/unknown/duplicate/invalid weights, private description sentinels, null and zero-weight versus genuine grade0, student-history target labels, and the existing publication/selected-version identity guards. The large-chunk warning and jsdom navigation informational line remain.

## Live evidence and what is not yet proven

Normal Staff login against staging, combined local preview `439dffe7f786556c862b71d7dd0d6fcb1cf2e277`: project50003 result preview GET200 has **no formula**, so the UI shows the neutral fallback, never50/50. The component table displays the server'sCOMMON score8.5; the server total remains8.5 and the existing demo publication blocker remains. Four screenshots/width measurements at390/768/1280/1440px show this actual fallback alongside the G3 identity fix. No response was intercepted or fabricated.

The combined preview also verifies the G5/G2 policy error-shape merge through normal Admin UI: clearing the draft end and activating “Công bố ngay” shows the local validation error, keeps the start input and sends no write or confirmation. It does not publish or mutate the retained DRAFT fixture.

**100COMMON and40/40/20 structured rendering, pending/zero-weight rows and student published-history rendering are controlled tests.** They are not live acceptance of BE-15 or an officially published multi-component result. Do not mark the full G3 formula/UC criterion PASS until BE-15 is merged/deployed and an authorized live fixture is available. No official result or rubric was published to manufacture that evidence.

Local evidence outside Git: `E:/DOANTOTNGHIEP/output/fe2-feedback-2026-10-26/g3-formula/`, especially `live-fallback.json`, `screenshots/` and technical logs. The companion Phase C integration snapshot records all source heads and tests. The preview is local and unpushed; no GitHub PR was merged and Checkpoint C is not automatically approved.
