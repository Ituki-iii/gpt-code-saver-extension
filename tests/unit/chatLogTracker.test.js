const test = require("node:test");
const assert = require("node:assert/strict");

function loadModule() {
  delete require.cache[require.resolve("../../extension/content/chatLogTracker.js")];
  return require("../../extension/content/chatLogTracker.js");
}

function resetGlobals() {
  delete global.getConversationKey;
  delete global.Node;
}

test("cgptBuildResponseFilePath stores chat text under chat-logs with a sanitized conversation key", () => {
  global.getConversationKey = () => "Project: Alpha/Review";
  const { cgptBuildResponseFilePath } = loadModule();

  const filePath = cgptBuildResponseFilePath({
    role: "assistant",
    timestamp: "2026-03-03T10:20:30.456Z",
  });

  assert.equal(
    filePath,
    "chat-logs/Project-Alpha-Review/assistant-2026-03-03T10-20-30-456Z.txt"
  );
  resetGlobals();
});

test("cgptSanitizeChatLogPathSegment falls back for empty values", () => {
  const { cgptSanitizeChatLogPathSegment } = loadModule();
  assert.equal(cgptSanitizeChatLogPathSegment("..."), "current-chat");
  resetGlobals();
});

test("cgptShouldDelayChatMessageFolding waits for the quiet period to elapse", () => {
  const { cgptShouldDelayChatMessageFolding } = loadModule();

  assert.equal(cgptShouldDelayChatMessageFolding(1_000, 1_500, 1_200), true);
  assert.equal(cgptShouldDelayChatMessageFolding(1_000, 2_200, 1_200), false);
  resetGlobals();
});

test("cgptIsHelperManagedNode detects helper UI nodes", () => {
  global.Node = { ELEMENT_NODE: 1 };
  const { cgptIsHelperManagedNode } = loadModule();
  const helperNode = {
    nodeType: 1,
    id: "cgpt-code-helper-panel",
    classList: [],
    closest: () => null,
  };
  assert.equal(cgptIsHelperManagedNode(helperNode), true);
  resetGlobals();
});

test("cgptCanContainChatMessages ignores helper subtrees and accepts message hosts", () => {
  global.Node = { ELEMENT_NODE: 1 };
  const { cgptCanContainChatMessages } = loadModule();

  const helperNode = {
    nodeType: 1,
    id: "",
    classList: ["cgpt-helper-fold"],
    closest: () => null,
    matches: () => false,
    querySelector: () => null,
  };
  assert.equal(cgptCanContainChatMessages(helperNode), false);

  const messageNode = {
    nodeType: 1,
    id: "",
    classList: [],
    closest: () => null,
    matches: (selector) => selector === "[data-message-author-role]",
    querySelector: () => null,
  };
  assert.equal(cgptCanContainChatMessages(messageNode), true);
  resetGlobals();
});
