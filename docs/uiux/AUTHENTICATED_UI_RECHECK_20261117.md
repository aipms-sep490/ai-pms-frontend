# AIPMS authenticated UI recheck — 17/11/2026

## Scope and evidence

- FE branch: `feat/fe-fresearch-reference-20261113`; BE branch: `feat/be-access-audit-20261113`. FE was served locally in API mode through the configured staging proxy. The remote staging BE is **not** proof of this BE branch's undeployed endpoints.
- Used the user's local test-account file without copying passwords or tokens into source, logs or this report. Ten isolated Chrome sessions represented three student groups, three lecturer scopes, three department scopes and admin. Admin has a separate password in the supplied file; the first 401 came from using the common password and was corrected before admin verification.
- Browser sweep: 176 navigations over 84 distinct visible URLs. No unnamed visible button/link or document-level horizontal overflow was found in those loaded screens. This does **not** mean every action on every route was clicked; the source inventory contains 144 route declarations, including dynamic routes that require academic fixtures.
- A separate credential availability sweep hit staging HTTP 429 after 18 successful logins. Later 429 responses cannot be interpreted as invalid credentials. Further sign-ins were stopped.
- The local screenshot and route inventory files live under `F:/AI-PMS/artifacts/ui-auth-audit-20261117/` and are excluded from source commits because they show authenticated test data.

## Findings and changes

| Finding | Source or runtime evidence | Change | Verification |
| --- | --- | --- | --- |
| Links acquired or retained an underline when touched; some workspace, account and notification links still used old green as an action color. | Shared and feature CSS; Chrome computed style on `/login`. | Action links/buttons now use color, weight and focus outline without underlining. Return, recovery, security, notification and workspace back links use the orange action token. Semantic success green remains for status. | DevTools computed `--color-primary: #C2410C`, link `textDecorationLine: none`; authenticated student/dashboard screenshot. |
| Full-page chat had no return link on its conversation-list screen; the thread return link was hidden on desktop. | `/messages` authenticated screenshot and `ChatPage`/`ChatThread` CSS. | Added a role-safe return link to the full-page list; the thread has a visible return link on desktop and mobile. The floating dock keeps its own return control. | Clicked launcher → expand → full-page chat → return to `/project/overview`; 375 px chat had no document overflow. |
| Registration form used bare history back, and archived-project links nested a button in a link. | `ProjectRegistrationFormPage`, `ArchivedProjectsPage`. | Registration uses `BackLink` with a direct-entry fallback; archive uses one semantic link per action and a scope-aware return target. | Authenticated department archive return landed at `/department/portfolio`; no nested `a button` remained in the static TSX scan. |
| Staging `/api/v1/academic/department-documents` returned 404; the UI previously advised retry and offered upload. | Authenticated department and student document pages, network status 404. | Explain that the selected major's document store could not be accessed, and hide the upload form while that request returns 404. A later successful list read enables it again. | 404 regression test and authenticated browser readback. BE branch endpoint exists, but is not deployed to this staging API. |
| Admin chat API returned 403 while the floating chat launcher still appeared. | Authenticated admin browser sweep: `/api/v1/chat/conversations` 403 on the account's first load. | Expose the BE denial in chat context, hide the floating launcher, and show a clear blocked state with return/recheck actions for direct `/messages` visits. | Chat provider/dock regression tests and admin browser readback; launcher count 0 after denial. |

## Runtime boundaries

- `/api/v1/users/me/academic-profile` returned 404 for some lecturer/department fixtures; `AcademicProfileSummary` correctly shows “Tài khoản chưa có hồ sơ học vụ.” This is an absent profile, not a UI failure.
- Google challenge returned 403 for the localhost origin; password login worked for the nine representative sessions. This does not verify Google login.
- The sampled student inbox had no existing conversation. Launcher, expansion, list return and mobile layout were verified; sending, read receipts, message actions and realtime delivery were not exercised against shared staging. Admin `/messages` showed the explicit 403 state after the fix, without a floating launcher.
- A source scan of 315 TSX files found no nested link/button pairs, `href="#"` placeholders used as actions, or empty click handlers. It also flagged 26 buttons without direct `onClick`; these are form-submit or disabled preview controls, not proof that all buttons work. Browser route navigation likewise cannot prove every permitted mutation.
- Actions that change academic data, all dynamic project routes, and full academic lifecycle acceptance remain open. No academic DB mutation, migration, deployment, PR or merge was performed for this recheck. Test logins may update normal authentication audit fields.

## Verification

- Targeted Vitest: 45 tests passed across document, chat, return-link and registration suites; the two new chat-denial tests passed after the fix.
- FE typecheck, production build and lint passed; the build retains the previously known large-chunk warnings, and lint retains advisory React warnings. Contract check matched 48 BE examples.
- Full FE suite after the final chat-denial and document-copy changes: 331 files / 2,204 tests passed. `git diff --check` passed.
