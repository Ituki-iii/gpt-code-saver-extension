const test = require("node:test");
const assert = require("node:assert/strict");

function loadModule() {
  delete require.cache[require.resolve("../../extension/content/chatLogObserver.js")];
  return require("../../extension/content/chatLogObserver.js");
}

test("cgptHasUntrackedChatMessages detects messages that still need capture", () => {
  const { cgptHasUntrackedChatMessages } = loadModule();
  const root = {
    querySelector(selector) {
      assert.equal(
        selector,
        "[data-message-author-role]:not([data-cgpt-helper-chat-tracked='1'])"
      );
      return { id: "message" };
    },
  };

  assert.equal(cgptHasUntrackedChatMessages(root), true);
});

test("cgptHasUntrackedChatMessages ignores fully tracked pages", () => {
  const { cgptHasUntrackedChatMessages } = loadModule();
  const root = {
    querySelector() {
      return null;
    },
  };

  assert.equal(cgptHasUntrackedChatMessages(root), false);
});

test("cgptResolveChatLogMutationRoot prefers the enclosing conversation turn", () => {
  global.Node = { ELEMENT_NODE: 1, TEXT_NODE: 3 };
  global.cgptIsHelperManagedNode = () => false;
  const host = { id: "turn-1" };
  global.cgptGetChatEntryHost = () => host;
  const { cgptResolveChatLogMutationRoot } = loadModule();

  const root = cgptResolveChatLogMutationRoot({
    nodeType: 3,
    parentElement: { id: "content" },
  });

  assert.equal(root, host);
  delete global.Node;
  delete global.cgptIsHelperManagedNode;
  delete global.cgptGetChatEntryHost;
});

test("cgptHandleConversationRouteChange only refreshes after an actual route change", () => {
  let resetCount = 0;
  let captureCount = 0;

  global.document = { body: {} };
  global.window = { location: { pathname: "/c/next", search: "" } };
  global.getConversationKey = () => "/c/next";
  global.resetChatLogEntries = () => {
    resetCount += 1;
  };
  global.captureChatLogsFromNode = () => {
    captureCount += 1;
  };

  const observerModulePath = require.resolve("../../extension/content/chatLogObserver.js");
  delete require.cache[observerModulePath];
  const observerModule = require(observerModulePath);

  observerModule.cgptHandleConversationRouteChange();
  observerModule.cgptHandleConversationRouteChange();

  assert.equal(resetCount, 1);
  assert.equal(captureCount, 1);

  delete global.document;
  delete global.window;
  delete global.getConversationKey;
  delete global.resetChatLogEntries;
  delete global.captureChatLogsFromNode;
});
