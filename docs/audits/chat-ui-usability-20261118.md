# Messaging usability — 18 November 2026

Status: **IMPLEMENTED / TESTED** on `fix/chat-ui-usability`.

## Source and issue

The user's screenshot showed the AI launcher covering the floating chat composer,
notification/member controls occupying the conversation header, and reply/reaction
controls on separate rows. Long titles and narrow screens made the dock harder to use.

## Changes

- Keep reaction, reply and message menu controls together; retain reaction counts,
  genuine read receipts, reply/edit/recall capabilities and message timestamps.
- Collapse notifications and member information into one optional disclosure. Show
  the full title there and allow two title lines in the dock header.
- Hide the AI launcher while the message dock is expanded or the messages page is
  active. Restore it when leaving messaging; direct assistant opening remains usable.
- Position reaction/message popups within the history bounds, choosing above or
  below their trigger. Escape closes the popup first; outside clicks dismiss it.
- Preserve 44px actions, drafts and retry identifiers. Remove competing mobile
  positioning overrides so the dock follows the visual viewport. Use 16px input
  text on mobile to avoid Safari input zoom.

## Verification

- `pnpm exec vitest run src/features/chat src/features/ai/AssistantDock.test.tsx`:
  **74 tests passed across 9 files**.
- `pnpm test:chat:e2e`: **1 browser contract-fixture test passed**, covering two
  clients, realtime/unread, lost-response retry, access revocation, retained drafts,
  Shift+Enter, popup bounds at both history edges, nested Escape, AI visibility,
  send-button hit testing, full-page messaging, and 44px actions.
- Browser sizes: desktop 1440×1000, narrow desktop 760×650, mobile 375×812 and
  reduced-height mobile 375×480. Desktop/mobile/full-page screenshots inspected.
- `pnpm build`: passed, including TypeScript checking. Vite reports large chunks.
- `pnpm lint`: exit 0, with 241 repository warnings. `git diff --check`: passed.

## Limits

Browser checks use intercepted API/SignalR contract fixtures, not production UAT.
The reduced viewport is a keyboard-layout regression check; physical iOS/Android
keyboard behavior has not been verified. No backend, database, provider or deployment
configuration was changed. This work has not been merged or deployed.

Local evidence is under `test-results/`: `chat-browser.json`,
`chat-desktop-panel.png`, `chat-mobile-panel.png`, `chat-full-page.png`,
`chat-narrow-desktop.png`, `chat-ui-build.log`, and `chat-ui-lint.log`.
