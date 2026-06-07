const assert = require("node:assert/strict");
const test = require("node:test");
const {
  buildDomSummary,
  clampText,
  createInspectionRunName,
  getFeatureSelectors,
  looksLikeChallengeState,
  normalizeText,
  sanitizeInspectionTarget,
} = require("../helpers/liveChatgptInspection");

test("normalizes text and clamps long samples", () => {
  assert.equal(normalizeText("  A\n\tB   C  "), "A B C");
  assert.equal(clampText("abc def", 4), "abc ");
});

test("sanitizes unknown inspection targets to general", () => {
  assert.equal(sanitizeInspectionTarget("sidebar"), "sidebar");
  assert.equal(sanitizeInspectionTarget("PROJECT-MOVE"), "project-move");
  assert.equal(sanitizeInspectionTarget("not-a-target"), "general");
});

test("returns feature selectors for known targets without sharing mutable arrays", () => {
  const selectors = getFeatureSelectors("chatlog");
  assert.ok(selectors.includes("[data-message-author-role]"));
  selectors.push("mutated");
  assert.equal(getFeatureSelectors("chatlog").includes("mutated"), false);
});

test("detects common live challenge states", () => {
  assert.equal(
    looksLikeChallengeState({ bodySample: "Enable JavaScript and cookies to continue" }),
    true
  );
  assert.equal(looksLikeChallengeState({ title: "Just a moment..." }), true);
  assert.equal(looksLikeChallengeState({ bodySample: "ChatGPT ready" }), false);
});

test("builds a stable DOM summary from inspection artifacts", () => {
  const summary = buildDomSummary({
    target: "sidebar",
    pageState: {
      url: "https://chatgpt.com/",
      title: "ChatGPT",
      readyState: "complete",
      hasTextbox: true,
      helperPanel: false,
      anchorCount: 5,
      conversationAnchorCount: 2,
    },
    candidateElements: [
      { tag: "A", role: "link" },
      { tag: "BUTTON", role: "button" },
      { tag: "BUTTON", role: "button" },
    ],
    openContainers: [{ tag: "DIV", role: "menu" }],
  });

  assert.equal(summary.target, "sidebar");
  assert.equal(summary.counts.candidates, 3);
  assert.equal(summary.counts.openContainers, 1);
  assert.equal(summary.countsByTag.button, 2);
  assert.equal(summary.countsByRole.button, 2);
  assert.ok(summary.selectors.includes("a[href*='/c/']"));
});

test("creates run names with target, mode, and filesystem-safe timestamp", () => {
  const runName = createInspectionRunName({
    target: "share",
    mode: "profile",
    date: new Date("2026-05-07T01:02:03.004Z"),
  });
  assert.equal(runName, "share-profile-2026-05-07T01-02-03-004Z");
});
