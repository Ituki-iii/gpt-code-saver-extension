const test = require("node:test");
const assert = require("node:assert/strict");

function loadModule() {
  delete require.cache[require.resolve("../../extension/content/panelViewSection.js")];
  return require("../../extension/content/panelViewSection.js");
}

function resetGlobals() {
  delete global.cgptRefreshChatWindowAlignment;
  delete global.resetChatLogEntries;
  delete global.captureChatLogsFromNode;
  delete global.cgptReapplyCodeSaverDecorations;
  delete global.decorateCodeBlocks;
  delete global.applyHeadingFold;
  delete global.cgptShouldApplyHeadingFold;
  delete global.showToast;
  delete global.document;
}

test("requestCodeSaverReapply resyncs chat layout, logs, code blocks, and headings", () => {
  const calls = [];
  const bodyA = { id: "body-a" };
  const bodyB = { id: "body-b" };
  global.document = {
    body: {},
    querySelectorAll(selector) {
      return selector === ".cgpt-helper-message-body" ? [bodyA, bodyB] : [];
    },
  };
  global.cgptRefreshChatWindowAlignment = (root) => {
    calls.push({ type: "alignment", root });
  };
  global.resetChatLogEntries = () => {
    calls.push({ type: "resetChatLogs" });
  };
  global.captureChatLogsFromNode = (root) => {
    calls.push({ type: "captureChatLogs", root });
  };
  global.cgptReapplyCodeSaverDecorations = (root) => {
    calls.push({ type: "reapply", root });
  };
  global.cgptShouldApplyHeadingFold = (body) => body === bodyA;
  global.applyHeadingFold = (body, level) => {
    calls.push({ type: "headingFold", body, level });
  };
  global.showToast = (message, tone) => {
    calls.push({ type: "toast", message, tone });
  };

  const { requestCodeSaverReapply } = loadModule();
  requestCodeSaverReapply();

  assert.deepStrictEqual(calls, [
    { type: "alignment", root: global.document },
    { type: "resetChatLogs" },
    { type: "captureChatLogs", root: global.document },
    { type: "reapply", root: global.document },
    { type: "headingFold", body: bodyA, level: 1 },
    { type: "toast", message: "Reapplied helper view.", tone: "success" },
  ]);
  resetGlobals();
});

test("requestCodeSaverReapply falls back to decorating code blocks when reapply is unavailable", () => {
  const calls = [];
  global.document = {
    body: {},
    querySelectorAll() {
      return [];
    },
  };
  global.decorateCodeBlocks = (root) => {
    calls.push({ type: "decorate", root });
  };

  const { requestCodeSaverReapply } = loadModule();
  requestCodeSaverReapply();

  assert.deepStrictEqual(calls, [
    { type: "decorate", root: global.document },
  ]);
  resetGlobals();
});
