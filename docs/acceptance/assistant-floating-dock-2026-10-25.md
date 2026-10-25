# Floating assistant acceptance

Branch: `feat/assistant-floating-dock`.
Started from `origin/develop` at b49b3ac, then explicitly fast-forwarded the
existing local chatbot dependency through d97f55b to retain file/image input and
answer downloads. No changes to remote develop or backend in this task.

## Behavior

- Floating AI launcher in the authenticated application shell, above Messages.
  Available for STUDENT, LECTURER, DEPARTMENT_STAFF and ADMIN when the academic
  assistant flag is enabled and API mode is active. Hidden on login/industry shell.
- Desktop non-modal chat box; mobile modal fits the visual viewport. Escape,
  close and minimize preserve the draft and answers, restore launcher focus.
- AI and Messages minimize each other to avoid overlapping dialogs.
- Input stays at the bottom; bounded 20-turn display history, file/image selection,
  image paste/preview, downloads and official-source labels remain available.
- Sending clears attachments after success. Enter sends; Shift+Enter adds a line;
  IME composition does not send. Error restores the submitted text for retry.
- History is memory-only. Model requests remain independent; this UI change does
  not implement backend conversation memory. New conversation clears local state.
- Actor changes unmount the dock. Semester/project changes remount conversation,
  abort pending requests and remove old answers/files. Student project context
  comes from the current journey on project routes; staff/lecturer project routes
  supply the route project ID, with backend authorization remaining authoritative.
- Removed standalone academic chat entry from navigation. Old /academic/assistant
  link redirects to overview and opens the dock. Project AI analytics remain;
  its academic chat area now opens this same dock.

## Validation

- 78 tests passed across AI, ChatDock, AppLayout and router suites.
- Typecheck/production build passed. Existing bundle-size and effect lint warnings
  remain; no lint errors in the changed runtime modules.
- Real browser login against staging at localhost:5175: run 10003 completed;
  attachment run 10004 correctly read DOCK-251 from an uploaded text file.
- Verified no launcher before login, vertical separation from Messages, no route
  change when opening, draft preservation after minimizing, exclusive panels,
  same-scope navigation retaining conversation, TXT download, mobile dimensions,
  and legacy URL opening the dock. No browser page errors.
- Screenshots and sanitized evidence: parent workspace
  `outputs/assistant-dock-20261025/`. Reproduce via
  `scripts/assistant-dock-smoke.mjs` using test credentials in environment.
- Role variants/account-switch/project-change coverage is from component tests;
  real browser lifecycle used the dedicated student test account.

Local FE runs this branch against the existing staging backend. This task does
not deploy a hosted frontend, push branches or merge develop.
