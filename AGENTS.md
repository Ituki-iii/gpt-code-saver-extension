# AGENTS

This file contains repository-specific instructions for Codex agents working on this project.

## Chat Log Regression Guard

When fixing Chat Log missing entries, wrong labels, or role mismatches, do not start from visual density, spacing, card layout, or preview line changes.

First verify the actual extraction problem:

- Confirm the reported message body exists on the ChatGPT page.
- Confirm whether that body belongs to a `user` or `assistant` turn on the page.
- Confirm the same body appears in Chat Log with the same role.
- Do not judge correctness only by badge counts, visible region counts, or UI area counts.
- Inspect the relationship between the turn host, such as `section[data-testid^="conversation-turn-"]`, and the inner `[data-message-author-role]` element before changing selectors.

Keep existing Chat Log behavior intact:

- Do not replace the save flow.
- Do not replace fold behavior.
- Do not replace timestamp behavior.
- Do not replace code block extraction.
- Limit the fix to turn host resolution, role detection, and message text extraction unless the user explicitly asks for UI changes.

Preview line count, card spacing, and display density are separate UI changes. Only change them after message extraction and role detection have been proven correct.

## UI Inventory Guard

When proposing a UI cleanup, tree view, or button map, do not mix implemented controls with imagined controls.

First verify the actual interactive elements in the repo:

- Confirm each listed button, input, select, checkbox, or launcher exists in the current implementation.
- If a control is part of a proposal and does not exist yet, mark it explicitly as a proposed addition.
- Do not present proposed controls as if they already exist.
- When asked for a tree view of the current UI, list only actionable elements that are actually implemented.
- When asked for a reorganization plan, distinguish clearly between current state and target state.

If the user points out an unknown button or missing implementation proof, treat that as a correctness issue and re-check the repo before continuing.
