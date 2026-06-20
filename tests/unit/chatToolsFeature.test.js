const test = require("node:test");
const assert = require("node:assert/strict");

function loadModule() {
  delete require.cache[require.resolve("../../extension/content/chatToolsFeature.js")];
  return require("../../extension/content/chatToolsFeature.js");
}

function resetGlobals() {
  delete global.document;
  delete global.initChatLogTracker;
  delete global.cgptCreateChatLogToggleButton;
}

test("cgptInitChatToolsFeature initializes the tracker and appends the Chat Log toggle", () => {
  const calls = [];
  const button = {
    isConnected: false,
  };
  global.document = {
    body: {
      appendChild(node) {
        calls.push({ type: "append", node });
      },
    },
  };
  global.initChatLogTracker = (root) => {
    calls.push({ type: "tracker", root });
  };
  global.cgptCreateChatLogToggleButton = () => {
    calls.push({ type: "createButton" });
    return button;
  };

  const { cgptInitChatToolsFeature } = loadModule();
  cgptInitChatToolsFeature(global.document);

  assert.deepStrictEqual(calls, [
    { type: "tracker", root: global.document },
    { type: "createButton" },
    { type: "append", node: button },
  ]);
  resetGlobals();
});
