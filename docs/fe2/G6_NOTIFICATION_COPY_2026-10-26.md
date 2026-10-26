# G6 — Vietnamese notification copy without raw backend prose

Branch: `fix/fe-notification-copy-coverage`. FE baseline: `14d9981` (`develop`, includes PR #103). Work performed 26/10/2026 (Asia/Saigon). Scope: notification title/content/label/icon presentation and regression tests. Navigation, read state, timestamps and backend authority are unchanged; deep-link behavior belongs to G4.

## Problem and behavior

The previous dictionary recognized 17 names, but translated only three exact English message patterns. Most known notifications and every unknown type still displayed backend `title`/`content`. Adding invitation keys alone would therefore leave the original failure path intact.

The copy function now always selects Vietnamese text for a known type. It covers all **43 types emitted by merged BE producers** and retains **13 older FE names** for persisted/mock notifications. Unknown types show a neutral Vietnamese update. A diagnostic records only the unsupported type, never the notification object, title, content, recipient, entity ID or credentials. A malformed type logs the fixed `INVALID_NOTIFICATION_TYPE` marker; inherited object keys cannot become dictionary entries.

The current DTO has no structured person/team name parameters. Copy is intentionally generic: it does not extract names from English prose, invent names, or interpolate `undefined`. Backend prose is never used as a Vietnamese fallback, even if a particular payload happens to already contain Vietnamese.

## Producer inventory

Inventory source: merged BE `origin/develop` at **`a4cb6b5d7dbcc65db093db09d272953409e7a0d6`**, inspected through Git without changing the BE checkout. FE notification source is unchanged between b49b3ac and the FE baseline. Source coverage is not runtime acceptance of every producer or proof that a staging scheduler/module is enabled.

| Group | Names | BE producer |
|---|---|---|
| Team invitations | `TEAM_INVITATION_SENT`, `TEAM_INVITATION_ACCEPTED`, `TEAM_INVITATION_REJECTED`, `TEAM_INVITATION_CANCELLED` | `src/AIPMS.Infrastructure/Persistence/Repositories/WorkflowNotificationWriter.cs`, `Describe()` |
| Supervision requests | `SUPERVISOR_REQUEST_SENT`, `SUPERVISOR_REQUEST_ACCEPTED`, `SUPERVISOR_REQUEST_REJECTED`, `SUPERVISOR_REQUEST_CANCELLED` | Same workflow writer |
| Leader changes | `TEAM_LEADER_CHANGE_REQUESTED`, `TEAM_LEADER_CHANGE_APPROVED`, `TEAM_LEADER_CHANGE_REJECTED` | Same workflow writer |
| Submission and results | `FINAL_SUBMISSION_LOCKED`, `EVALUATION_FINALIZED`, `PROJECT_RESULT_PUBLISHED`, `STUDENT_RESULT_PUBLISHED` | Same workflow writer |
| Proposal and assignments | `PROJECT_APPROVED`, `PROJECT_REJECTED`, `PROJECT_REVISION_REQUESTED`, `SUPERVISOR_FEEDBACK_ADDED`, `EVALUATOR_ASSIGNED`, `SUPERVISOR_REPLACED`, `MEETING_SCHEDULED`, `PROGRESS_REPORT_SUBMITTED` | Same workflow writer (23 workflow names in total) |
| Deadlines and risk | `TASK_DEADLINE_REMINDER`, `TASK_OVERDUE`, `DELIVERABLE_DEADLINE_REMINDER`, `DELIVERABLE_OVERDUE`, `FINAL_SUBMISSION_DEADLINE_REMINDER`, `FINAL_SUBMISSION_OVERDUE`, `PROJECT_RISK_MEDIUM`, `PROJECT_RISK_HIGH`, `PROJECT_RISK_CRITICAL` | `Persistence/Repositories/ScheduledNotificationService.cs`, dynamic deadline suffixes and risk-level allowlist (9 names) |
| Deliverable submission | `DELIVERABLE_SUBMITTED` | `Persistence/Repositories/DeliverableRepository.cs`, `SubmitAsync()` |
| Meeting reminder | `MEETING_START_REMINDER` | `Persistence/Repositories/MeetingReminderService.cs` and `IMeetingReminderService` constant |
| Defense | `DEFENSE_SCHEDULED`, `DEFENSE_CANCELLED` | `Services/Projects/AcademicTrackingService.Defense.cs` |
| Meeting action | `MEETING_ACTION_ASSIGNED` | `Services/Projects/MeetingGovernanceService.cs` |
| Industry | `INDUSTRY_INVITATION` | `Services/Projects/IndustryService.cs` / `.Enrollment.cs` |
| Appeals | `APPEAL_REQUESTED`, `APPEAL_REVIEWER_ASSIGNED`, `APPEAL_REVIEWED`, `APPEAL_DECIDED` | `Services/Projects/ResultAppealService.cs` / `.Notifications.cs` / `.Decisions.cs` / `.Windows.cs` |
| Review Gates | `REVIEW_GATE_UPDATED` | `Services/Projects/ReviewGateService.cs`, `NotifyGateChanged()` (11 other names in total) |

Paths abbreviated after the first row share the `src/AIPMS.Infrastructure/` prefix. Workflow event definitions are in `src/AIPMS.Application/Features/Notifications/Events/WorkflowNotificationEvent.cs`. The inbox repository remaps some parent identifiers; copy does not interpret IDs or turn notification receipt into permission.

The 13 retained FE legacy names are `PROJECT_UPDATED`, `DELIVERABLE_FEEDBACK_ADDED`, `REVIEW_POLICY_PUBLISHED`, `REVIEW_DEADLINE_APPROACHING`, `GATE_REVIEW_ASSIGNED`, `GATE_REVIEW_SUBMITTED`, `GATE_REVISION_SUBMITTED`, `GATE_REVISION_REQUIRED`, `EVIDENCE_VERIFIED`, `GATE_DECISION_RECORDED`, `DISCIPLINE_REVIEW_PENDING`, `DISCIPLINE_DECISION_RECORDED`, `DEFENSE_READINESS_CHANGED`. No current producer for these was found in merged BE source. Their Vietnamese meanings remain supported; unnecessary English prose in their copy was removed.

## BE-21 boundary

Merged `NotificationDto` and the public staging Swagger inspected during inventory contain exactly nine fields: `id`, `notificationType`, `title`, `content`, `relatedEntityType`, `relatedEntityId`, `createdAt`, `isRead`, `readAt`. No `titleKey` or `params` is available in that contract. BE-21 work exists on an unmerged branch and has different aliases; this change neither assumes its deployment nor waits for it. Its `rawContent` parameter would still be backend prose, not safe translated name data.

## Verification and evidence

The new regression suite uses the independent producer inventory, not keys read back from the dictionary. It checks all 43 merged and 13 legacy names, neutral unknown output, safe diagnostics, inherited/malformed types, and actual rendered inbox rows with conspicuous private/English title/content sentinels. Existing page tests now assert Vietnamese copy while retaining their filtering, mark-read failure, and empty/error-state assertions.

| Check | Result |
|---|---|
| `pnpm test src/features/notifications --maxWorkers 4` | 4 files /75 tests PASS |
| `pnpm test --maxWorkers 4` | 267 files /1539 tests PASS, exit0; no failed tests or reported unhandled errors |
| `pnpm typecheck` | PASS, exit0 |
| `pnpm lint` | PASS, exit0; 209 existing warnings, none in the changed copy/test files |
| `pnpm build` | PASS, exit0; existing >500kB chunk warning |
| `git diff --check` | PASS |

Checks use `VITE_API_BASE_URL=/api/v1`; no private environment file was copied. The passing full suite includes one jsdom informational `Not implemented: navigation to another Document` line.

## Live browser evidence, 26–27/10 follow-up

Normal UI login as demo Student `p1.se4` returned a real inbox GET200 containing `PROJECT_APPROVED` and `TEAM_INVITATION_SENT`. The backend's English invitation title is absent from the rendered page; the invitation and proposal approval show Vietnamese title/content/labels. Four screenshots record actual 390/768/1280/1440px. Raw inbox JSON is retained separately as `g6/inbox-before-new-invite.json`; screenshots are `g6/screenshots/G6-inbox-member-*.png` in the accompanying local bundle.

A new-event replay was attempted through the normal team form using the unused demo `p2.mkt3` account and a labeled self-test team. BE returned403, `An active student account is required.` No team/invitation was created. The source requires `AcademicProfileStatus=VERIFIED` for this operation; the existing demo leaders' current team rosters are locked. This change does not alter academic verification or team authority to force the test through. Evidence: `g6/fresh-invite-attempt.json`.

Therefore the **new invitation generation criterion remains a runtime fixture gap**. Translation is covered by the complete producer regression inventory and two existing live event types, not by a claim that all56 notification types were generated on staging. Deep-link and read-state behavior remains G4 scope.

Local evidence directory (outside Git): `E:/DOANTOTNGHIEP/output/fe2-feedback-2026-10-26/g6/`. The detailed inventory is `../g6-notification-inventory.md` relative to that directory. Screenshots and logs require the accompanying output bundle; GitHub does not host those local files.
