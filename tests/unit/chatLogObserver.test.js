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
