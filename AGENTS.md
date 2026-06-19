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
