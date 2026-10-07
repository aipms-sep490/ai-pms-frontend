# Chat page

Apply MASTER.md and the current shared CSS theme tokens (the product theme has evolved since the master palette snapshot).

- Desktop: inbox and new-conversation controls beside the selected thread; mobile: one pane at a time with a visible back link and connection state.
- Show business scope beneath the title. Do not imply access from an identity role.
- Use accessible labels, explicit loading/empty/error states, keyboard focus, at least 44px control targets, and plain text message bodies.
- Read-only state disables send/edit/recall and explains the state near the composer.
- Connection/presence indicates transport availability only, never attendance or academic evidence.
- Keep semantic primary/card/canvas/hairline tokens, restrained borders and existing fonts.
- Validate narrow viewport overflow and inspect browser screenshots before delivery.

## Global dock

- Reuse ChatProvider, ChatConversations and ChatThread; one session connection and unread source.
- Bubble: 56px, bottom/right 24px plus safe area; hide zero badge, show 1–99 or 99+.
- Desktop: non-modal panel up to 400×640px, 16px radius, bounded to viewport. Minimize before keyboard focus moves behind it.
- Mobile <=700px: native modal dialog, full visualViewport with safe areas, scroll lock and visible composer when viewport shrinks.
- Explicit closed/list/conversation/minimized states; minimize keeps draft; Escape restores launcher focus.
- Dock controls at least 44×44px; message actions separated by 8px. Use existing fonts and semantic colors.
- Keep /messages as expanded view. Hide/deactivate dock there to avoid parallel conversation windows.
- Only read when active, visible, focused and newest displayed marker is within history viewport.
- Prepend preserves visible message anchor; incoming activity respects historical scroll and exposes a jump indicator. Bound memory to 500 messages.
- No unsupported attachment/reaction/mute controls. Transport/presence never represents academic workflow authority.
